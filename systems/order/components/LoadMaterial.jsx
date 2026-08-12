"use client";
import React, { useState, useEffect, useCallback } from "react";
import { API_URL, getToken } from "@/lib/auth";
import { uploadFileToStorage } from "@/systems/order/utils/storageUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody, SheetFooter } from "@/components/ui/sheet";
import { Loader2, CheckCircle2, Upload, Eye, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

// PO-grouped Load Material: matches _reference/New-Order-collection's Load Material
// page (TestReportPage) — dispatches are grouped by PO, a checkbox lets you pick
// which rows in the group to submit, and the loading images (shared across the
// selected rows) are POSTed in one bulk call to POST /order/load-material/submit
// (the backend's actual contract — accepts { dispatchIds: [], loadingImage1..3 }).
function groupDispatchByPo(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    const poNumber = row.receipt?.partyPoNo || "PO Not Available";
    const partyName = row.partyName || row.receipt?.partyName || "Party Not Available";
    const groupKey = `${poNumber}::${partyName}`;
    if (!groups.has(groupKey)) groups.set(groupKey, { key: groupKey, poNumber, partyName, rows: [] });
    groups.get(groupKey).rows.push(row);
  });
  return Array.from(groups.values());
}

function getTransporterRateDisplay(logistic) {
  const perMt = Number(logistic?.transportRatePerMt) || 0;
  const fixed = Number(logistic?.fixedAmount) || 0;
  if (perMt > 0) return `₹${perMt.toLocaleString("en-IN")} / MT`;
  if (fixed > 0) return `₹${fixed.toLocaleString("en-IN")} fixed`;
  return "—";
}

function LoadMaterialStage() {
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [openGroup, setOpenGroup] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [images, setImages] = useState({ loadingImage1: "", loadingImage2: "", loadingImage3: "" });
  const [uploadingSlot, setUploadingSlot] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, h] = await Promise.all([
        fetch(`${API_URL}/order/load-material/pending`).then((r) => r.json()),
        fetch(`${API_URL}/order/load-material/history`).then((r) => r.json()),
      ]);
      setPending(p.data || []);
      setHistory(h.data || []);
    } catch {
      toast.error("Failed to load Load Material data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const rows = tab === "pending" ? pending : history;
  const filteredRows = search
    ? rows.filter((r) =>
        [r.dSrNumber, r.doNumber, r.partyName, r.productName, r.receipt?.partyPoNo, r.logistic?.lgstSrNumber, r.logistic?.truckNo]
          .some((v) => v?.toString().toLowerCase().includes(search.toLowerCase()))
      )
    : rows;
  const groups = groupDispatchByPo(filteredRows);

  const openLoadForm = (group) => {
    setOpenGroup(group);
    setSelectedIds(new Set(group.rows.map((r) => r.id)));
    setImages({ loadingImage1: "", loadingImage2: "", loadingImage3: "" });
  };

  const closeLoadForm = () => {
    setOpenGroup(null);
    setSelectedIds(new Set());
    setImages({ loadingImage1: "", loadingImage2: "", loadingImage3: "" });
  };

  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = (checked) => {
    setSelectedIds(checked ? new Set(openGroup.rows.map((r) => r.id)) : new Set());
  };

  const handleImageSelect = async (e, slot) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File size should be less than 5MB"); return; }
    setUploadingSlot(slot);
    try {
      const { url } = await uploadFileToStorage(file, "order-stage", "load-material");
      setImages((f) => ({ ...f, [slot]: url }));
      toast.success("Image uploaded");
    } catch {
      toast.error("Image upload failed");
    } finally {
      setUploadingSlot(null);
    }
  };

  const removeImage = (slot) => setImages((f) => ({ ...f, [slot]: "" }));

  const handleSubmit = async () => {
    if (!openGroup) return;
    if (!images.loadingImage1) { toast.error("Loading Image 1 is mandatory"); return; }
    if (selectedIds.size === 0) { toast.error("Select at least one row to submit"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/order/load-material/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ dispatchIds: Array.from(selectedIds), ...images }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to submit");
      toast.success(`Load Material submitted for PO ${openGroup.poNumber}`);
      closeLoadForm();
      loadData();
    } catch (err) {
      toast.error(err.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin w-6 h-6 text-emerald-500" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Load Material</h2>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {["pending", "history"].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${tab === t ? "bg-emerald-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"}`}
            >{t} ({t === "pending" ? pending.length : history.length})</button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 dark:bg-zinc-900/60">
              {tab === "pending" && <TableHead className="text-xs font-semibold whitespace-nowrap w-24">Action</TableHead>}
              {["LGST-Sr No.", "DO No.", "D-Sr No.", "Product", "Truck Qty", "Transporter", "Truck No.", "Rate"].map((h) => (
                <TableHead key={h} className="text-xs font-semibold whitespace-nowrap">{h}</TableHead>
              ))}
              {tab === "history" && <TableHead className="text-xs font-semibold whitespace-nowrap">Loading Images</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-10 text-zinc-400">No records</TableCell></TableRow>
            ) : groups.map((group) => (
              <React.Fragment key={group.key}>
                <TableRow className="bg-zinc-50/60 dark:bg-zinc-900/40">
                  <TableCell colSpan={9} className="py-2.5 px-4">
                    <div className="flex items-center gap-3">
                      {tab === "pending" && (
                        <Button size="sm" onClick={() => openLoadForm(group)} className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs gap-1">
                          <Upload className="w-3 h-3" /> Load
                        </Button>
                      )}
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-white">PO: {group.poNumber}</span>
                        <span className="text-xs text-zinc-500">Party: {group.partyName}</span>
                      </div>
                      <span className="text-xs text-zinc-400 ml-auto">{group.rows.length} item{group.rows.length > 1 ? "s" : ""}</span>
                    </div>
                  </TableCell>
                </TableRow>
                {group.rows.map((r) => (
                  <TableRow key={r.id} className="text-sm">
                    {tab === "pending" && <TableCell />}
                    <TableCell className="font-mono text-xs">{r.logistic?.lgstSrNumber || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{r.doNumber || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{r.dSrNumber || "—"}</TableCell>
                    <TableCell>{r.productName || "—"}</TableCell>
                    <TableCell>{r.logistic?.actualTruckQty ?? r.qtyToBeDispatched ?? "—"}</TableCell>
                    <TableCell>{r.logistic?.transporterName || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs font-normal">{r.logistic?.truckNo || "—"}</Badge></TableCell>
                    <TableCell className="text-xs">{getTransporterRateDisplay(r.logistic)}</TableCell>
                    {tab === "history" && (
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {[r.loadMaterial?.loadingImage1, r.loadMaterial?.loadingImage2, r.loadMaterial?.loadingImage3].map((url, i) => url && (
                            <Badge key={i} variant="outline" className="cursor-pointer text-xs font-normal" onClick={() => window.open(url, "_blank")}>
                              <Eye className="w-3 h-3 mr-1" /> Img {i + 1}
                            </Badge>
                          ))}
                          {!r.loadMaterial?.loadingImage1 && !r.loadMaterial?.loadingImage2 && !r.loadMaterial?.loadingImage3 && (
                            <span className="text-zinc-400 text-xs">No images</span>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!openGroup} onOpenChange={(v) => !v && closeLoadForm()}>
        <SheetContent className="sm:max-w-2xl flex flex-col p-0">
          <SheetHeader className="px-6 py-4 border-b shrink-0">
            <SheetTitle>Complete Load Material — PO {openGroup?.poNumber}</SheetTitle>
          </SheetHeader>
          <SheetBody className="space-y-6">
            {openGroup && (
              <>
                <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">Party: {openGroup.partyName}</p>
                    <span className="text-xs text-emerald-600 font-medium">{selectedIds.size} / {openGroup.rows.length} selected</span>
                  </div>
                  <div className="border rounded-md overflow-hidden mt-1">
                    <div className="flex items-center justify-between px-2 py-1.5 bg-zinc-100 dark:bg-zinc-800 border-b">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Select Rows</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-zinc-400">Select All</span>
                        <Checkbox checked={selectedIds.size === openGroup.rows.length} onCheckedChange={toggleAll} />
                      </div>
                    </div>
                    <table className="w-full text-[11px]">
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {openGroup.rows.map((row) => (
                          <tr key={row.id} className={selectedIds.has(row.id) ? "bg-emerald-50/40 dark:bg-emerald-900/10" : "opacity-60"}>
                            <td className="px-2 py-1.5 w-8 text-center">
                              <Checkbox checked={selectedIds.has(row.id)} onCheckedChange={() => toggleRow(row.id)} />
                            </td>
                            <td className="px-2 py-1.5">
                              <div className="font-semibold">{row.logistic?.lgstSrNumber || "—"} · {row.logistic?.truckNo || "—"}</div>
                              <div className="text-zinc-500">{row.productName} · Qty {row.logistic?.actualTruckQty ?? row.qtyToBeDispatched ?? "—"}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold">Upload Loading Images</h3>
                    <p className="text-xs text-zinc-500">Shared across all selected rows. Image 1 is mandatory. Max 5MB each.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[1, 2, 3].map((num) => {
                      const slot = `loadingImage${num}`;
                      return (
                        <div key={num} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Image {num} {num === 1 && <span className="text-red-500">*</span>}</Label>
                            {images[slot] && (
                              <div className="flex gap-1">
                                <button type="button" onClick={() => window.open(images[slot], "_blank")} className="text-zinc-500 hover:text-zinc-800"><Eye className="w-3.5 h-3.5" /></button>
                                <button type="button" onClick={() => removeImage(slot)} className="text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            )}
                          </div>
                          <label className="flex flex-col items-center justify-center h-20 rounded-lg border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelect(e, slot)} disabled={uploadingSlot === slot} />
                            {uploadingSlot === slot ? (
                              <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                            ) : (
                              <>
                                <Upload className="w-5 h-5 text-zinc-400 mb-1" />
                                <span className="text-xs text-zinc-500">{images[slot] ? "✓ Uploaded" : "Click to upload"}</span>
                              </>
                            )}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={closeLoadForm} disabled={submitting}>Cancel</Button>
            <Button type="button" onClick={handleSubmit} disabled={submitting || !images.loadingImage1} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {submitting ? "Submitting..." : "Complete Load Material"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function LoadMaterial() {
  return <LoadMaterialStage />;
}

// PO-grouped Wetman Entry: same shape as Load Material above, but posts to the
// backend's actual contract — POST /order/wetman-entry/submit expects
// { dispatchIds: [], actualTruckQty, actualQtyAsPerWeighmentSlip, imageOfSlip
// (required), imageOfSlip2, imageOfSlip3, remarks } (wetmanEntry.controller.js).
function WetmanEntryStage() {
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [openGroup, setOpenGroup] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [form, setForm] = useState({ actualTruckQty: "", actualQtyAsPerWeighmentSlip: "", remarks: "", imageOfSlip: "", imageOfSlip2: "", imageOfSlip3: "" });
  const [uploadingSlot, setUploadingSlot] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, h] = await Promise.all([
        fetch(`${API_URL}/order/wetman-entry/pending`).then((r) => r.json()),
        fetch(`${API_URL}/order/wetman-entry/history`).then((r) => r.json()),
      ]);
      setPending(p.data || []);
      setHistory(h.data || []);
    } catch {
      toast.error("Failed to load Wetman Entry data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const rows = tab === "pending" ? pending : history;
  const filteredRows = search
    ? rows.filter((r) =>
        [r.dSrNumber, r.doNumber, r.partyName, r.productName, r.receipt?.partyPoNo, r.logistic?.lgstSrNumber, r.logistic?.truckNo]
          .some((v) => v?.toString().toLowerCase().includes(search.toLowerCase()))
      )
    : rows;
  const groups = groupDispatchByPo(filteredRows);

  const resetForm = () => setForm({ actualTruckQty: "", actualQtyAsPerWeighmentSlip: "", remarks: "", imageOfSlip: "", imageOfSlip2: "", imageOfSlip3: "" });

  const openWeighmentForm = (group) => {
    setOpenGroup(group);
    setSelectedIds(new Set(group.rows.map((r) => r.id)));
    resetForm();
  };

  const closeWeighmentForm = () => {
    setOpenGroup(null);
    setSelectedIds(new Set());
    resetForm();
  };

  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = (checked) => {
    setSelectedIds(checked ? new Set(openGroup.rows.map((r) => r.id)) : new Set());
  };

  const handleSlipSelect = async (e, slot) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File size should be less than 5MB"); return; }
    setUploadingSlot(slot);
    try {
      const { url } = await uploadFileToStorage(file, "order-stage", "wetman-entry");
      setForm((f) => ({ ...f, [slot]: url }));
      toast.success("Slip uploaded");
    } catch {
      toast.error("Slip upload failed");
    } finally {
      setUploadingSlot(null);
    }
  };

  const removeSlip = (slot) => setForm((f) => ({ ...f, [slot]: "" }));

  const handleSubmit = async () => {
    if (!openGroup) return;
    if (!form.actualTruckQty) { toast.error("Actual Truck Qty is mandatory"); return; }
    if (!form.actualQtyAsPerWeighmentSlip) { toast.error("Actual Qty As Per Weighment Slip is mandatory"); return; }
    if (!form.imageOfSlip) { toast.error("Image Of Slip is mandatory"); return; }
    if (selectedIds.size === 0) { toast.error("Select at least one row to submit"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/order/wetman-entry/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          dispatchIds: Array.from(selectedIds),
          actualTruckQty: form.actualTruckQty,
          actualQtyAsPerWeighmentSlip: form.actualQtyAsPerWeighmentSlip,
          remarks: form.remarks,
          imageOfSlip: form.imageOfSlip,
          imageOfSlip2: form.imageOfSlip2,
          imageOfSlip3: form.imageOfSlip3,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to submit");
      toast.success(`Wetman Entry submitted for PO ${openGroup.poNumber}`);
      closeWeighmentForm();
      loadData();
    } catch (err) {
      toast.error(err.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin w-6 h-6 text-emerald-500" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Wetman Entry</h2>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {["pending", "history"].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${tab === t ? "bg-emerald-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"}`}
            >{t} ({t === "pending" ? pending.length : history.length})</button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 dark:bg-zinc-900/60">
              {tab === "pending" && <TableHead className="text-xs font-semibold whitespace-nowrap w-24">Action</TableHead>}
              {["LGST-Sr No.", "DO No.", "D-Sr No.", "Product", "Dispatch Qty", "Transporter", "Truck No.", "Rate"].map((h) => (
                <TableHead key={h} className="text-xs font-semibold whitespace-nowrap">{h}</TableHead>
              ))}
              {tab === "history" && <TableHead className="text-xs font-semibold whitespace-nowrap">Weighment</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-10 text-zinc-400">No records</TableCell></TableRow>
            ) : groups.map((group) => (
              <React.Fragment key={group.key}>
                <TableRow className="bg-zinc-50/60 dark:bg-zinc-900/40">
                  <TableCell colSpan={9} className="py-2.5 px-4">
                    <div className="flex items-center gap-3">
                      {tab === "pending" && (
                        <Button size="sm" onClick={() => openWeighmentForm(group)} className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs gap-1">
                          <Upload className="w-3 h-3" /> Entry
                        </Button>
                      )}
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-white">PO: {group.poNumber}</span>
                        <span className="text-xs text-zinc-500">Party: {group.partyName}</span>
                      </div>
                      <span className="text-xs text-zinc-400 ml-auto">{group.rows.length} item{group.rows.length > 1 ? "s" : ""}</span>
                    </div>
                  </TableCell>
                </TableRow>
                {group.rows.map((r) => (
                  <TableRow key={r.id} className="text-sm">
                    {tab === "pending" && <TableCell />}
                    <TableCell className="font-mono text-xs">{r.logistic?.lgstSrNumber || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{r.doNumber || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{r.dSrNumber || "—"}</TableCell>
                    <TableCell>{r.productName || "—"}</TableCell>
                    <TableCell>{r.qtyToBeDispatched ?? "—"}</TableCell>
                    <TableCell>{r.logistic?.transporterName || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs font-normal">{r.logistic?.truckNo || "—"}</Badge></TableCell>
                    <TableCell className="text-xs">{getTransporterRateDisplay(r.logistic)}</TableCell>
                    {tab === "history" && (
                      <TableCell>
                        <div className="text-xs text-zinc-600 dark:text-zinc-300 space-y-1">
                          <div>Truck: {r.wetmanEntry?.actualTruckQty ?? "—"} · Slip: {r.wetmanEntry?.actualQtyAsPerWeighmentSlip ?? "—"}</div>
                          <div className="flex flex-wrap gap-1">
                            {[r.wetmanEntry?.imageOfSlip, r.wetmanEntry?.imageOfSlip2, r.wetmanEntry?.imageOfSlip3].map((url, i) => url && (
                              <Badge key={i} variant="outline" className="cursor-pointer text-xs font-normal" onClick={() => window.open(url, "_blank")}>
                                <Eye className="w-3 h-3 mr-1" /> Slip {i + 1}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!openGroup} onOpenChange={(v) => !v && closeWeighmentForm()}>
        <SheetContent className="sm:max-w-2xl flex flex-col p-0">
          <SheetHeader className="px-6 py-4 border-b shrink-0">
            <SheetTitle>Wetman Entry — PO {openGroup?.poNumber}</SheetTitle>
          </SheetHeader>
          <SheetBody className="space-y-6">
            {openGroup && (
              <>
                <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">Party: {openGroup.partyName}</p>
                    <span className="text-xs text-emerald-600 font-medium">{selectedIds.size} / {openGroup.rows.length} selected</span>
                  </div>
                  <div className="border rounded-md overflow-hidden mt-1">
                    <div className="flex items-center justify-between px-2 py-1.5 bg-zinc-100 dark:bg-zinc-800 border-b">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Select Rows</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-zinc-400">Select All</span>
                        <Checkbox checked={selectedIds.size === openGroup.rows.length} onCheckedChange={toggleAll} />
                      </div>
                    </div>
                    <table className="w-full text-[11px]">
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {openGroup.rows.map((row) => (
                          <tr key={row.id} className={selectedIds.has(row.id) ? "bg-emerald-50/40 dark:bg-emerald-900/10" : "opacity-60"}>
                            <td className="px-2 py-1.5 w-8 text-center">
                              <Checkbox checked={selectedIds.has(row.id)} onCheckedChange={() => toggleRow(row.id)} />
                            </td>
                            <td className="px-2 py-1.5">
                              <div className="font-semibold">{row.logistic?.lgstSrNumber || "—"} · {row.logistic?.truckNo || "—"}</div>
                              <div className="text-zinc-500">{row.productName} · Dispatch Qty {row.qtyToBeDispatched ?? "—"}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Actual Truck Qty <span className="text-red-500">*</span></Label>
                    <Input type="number" step="0.01" value={form.actualTruckQty} onChange={(e) => setForm((f) => ({ ...f, actualTruckQty: e.target.value }))} className="h-9" placeholder="Enter truck quantity" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Actual Qty As Per Weighment Slip <span className="text-red-500">*</span></Label>
                    <Input type="number" step="0.01" value={form.actualQtyAsPerWeighmentSlip} onChange={(e) => setForm((f) => ({ ...f, actualQtyAsPerWeighmentSlip: e.target.value }))} className="h-9" placeholder="Enter weighment quantity" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold">Upload Weighment Slips</h3>
                    <p className="text-xs text-zinc-500">Shared across all selected rows. Slip 1 is mandatory. Max 5MB each.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[1, 2, 3].map((num) => {
                      const slot = num === 1 ? "imageOfSlip" : `imageOfSlip${num}`;
                      return (
                        <div key={num} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Slip {num} {num === 1 && <span className="text-red-500">*</span>}</Label>
                            {form[slot] && (
                              <div className="flex gap-1">
                                <button type="button" onClick={() => window.open(form[slot], "_blank")} className="text-zinc-500 hover:text-zinc-800"><Eye className="w-3.5 h-3.5" /></button>
                                <button type="button" onClick={() => removeSlip(slot)} className="text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            )}
                          </div>
                          <label className="flex flex-col items-center justify-center h-20 rounded-lg border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleSlipSelect(e, slot)} disabled={uploadingSlot === slot} />
                            {uploadingSlot === slot ? (
                              <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                            ) : (
                              <>
                                <Upload className="w-5 h-5 text-zinc-400 mb-1" />
                                <span className="text-xs text-zinc-500">{form[slot] ? "✓ Uploaded" : "Click to upload"}</span>
                              </>
                            )}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Remarks</Label>
                  <Textarea value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} placeholder="Enter any remarks" className="min-h-20" />
                </div>
              </>
            )}
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={closeWeighmentForm} disabled={submitting}>Cancel</Button>
            <Button type="button" onClick={handleSubmit} disabled={submitting || !form.actualTruckQty || !form.actualQtyAsPerWeighmentSlip || !form.imageOfSlip} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {submitting ? "Submitting..." : "Submit Wetman Entry"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function WetmanEntry() {
  return <WetmanEntryStage />;
}

export default LoadMaterial;
