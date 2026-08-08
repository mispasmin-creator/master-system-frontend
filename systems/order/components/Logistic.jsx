"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { API_URL, getToken } from "@/lib/auth";
import { useAuth } from "@/systems/order/context/AuthContext";
import { uploadFileToStorage } from "@/systems/order/utils/storageUtils";
import { fetchMasterData } from "@/systems/order/utils/masterDataUtils";
import { canViewFirm } from "@/systems/order/utils/firmFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import {
  Loader2, CheckCircle2, Truck, Search, RefreshCw, Package, Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Ported from _reference/New-Order-collection components/pages/LogisticPage.jsx.
// That reference talks to Supabase directly; here every read/write goes
// through merge-system-backend's /api/order/logistic REST endpoints instead
// (see systems/order/supabase.js — Supabase is storage-only in this system).
// The reference groups dispatch rows by PO with a per-split submit flow tied
// to `po_logistics_splits`; the backend here exposes a simpler contract —
// flat OrderDispatch rows with no `logistic` row yet, and a single batch
// `/submit` endpoint over one or more selected dispatch ids — so the UI below
// keeps the reference's core flow (transporter-type-driven conditional
// fields, vehicle-plate upload, multi-row selection into one shared form)
// without the PO-grouping/expand chrome.
// ---------------------------------------------------------------------------

const TRANSPORTER_TYPES = ["FOR", "Ex Factory", "Ex Factory But paid by Us", "Owned Truck", "Direct Supply"];
const DETAIL_TYPES = ["FOR", "Ex Factory But paid by Us"];
const RATE_TYPES = ["Per Matric Ton rate", "Fixed Amount", "Ex Factory Transporter"];

const EMPTY_FORM = {
  transporterType: "",
  transporterName: "",
  truckNo: "",
  driverMobileNo: "",
  biltyNo: "",
  typeOfRate: "",
  rate: "",
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (isNaN(date.getTime())) return String(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
};

const rateDisplay = (logistic) => {
  if (!logistic) return "—";
  const perMt = Number(logistic.transportRatePerMt) || 0;
  const fixed = Number(logistic.fixedAmount) || 0;
  if (logistic.typeOfRate === "Per Matric Ton rate" && perMt > 0) return `₹${perMt.toLocaleString("en-IN")} / MT`;
  if (logistic.typeOfRate === "Fixed Amount" && fixed > 0) return `₹${fixed.toLocaleString("en-IN")} fixed`;
  if (logistic.typeOfRate === "Ex Factory Transporter") return "Ex Factory Transporter";
  return "—";
};

export default function Logistic() {
  const { user, isSuperAdmin, isReadOnly } = useAuth();

  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [transporterNameOptions, setTransporterNameOptions] = useState([]);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [vehicleImageUrl, setVehicleImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [p, h] = await Promise.all([
        fetch(`${API_URL}/order/logistic/pending`).then((r) => r.json()),
        fetch(`${API_URL}/order/logistic/history`).then((r) => r.json()),
      ]);
      setPending(p.data || []);
      setHistory(h.data || []);
    } catch {
      toast.error("Failed to load logistic data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchMasterData().then((md) => setTransporterNameOptions(md.transporterNameOptions || []));
  }, [fetchData]);

  const scopedPending = useMemo(
    () => pending.filter((d) => isSuperAdmin || canViewFirm(user?.firmName, d.receipt?.firmName)),
    [pending, isSuperAdmin, user]
  );
  const scopedHistory = useMemo(
    () => history.filter((d) => isSuperAdmin || canViewFirm(user?.firmName, d.receipt?.firmName)),
    [history, isSuperAdmin, user]
  );

  const filteredPending = useMemo(() => {
    if (!searchTerm.trim()) return scopedPending;
    const term = searchTerm.toLowerCase();
    return scopedPending.filter((d) =>
      [d.dSrNumber, d.doNumber, d.partyName, d.productName, d.receipt?.partyPoNo, d.receipt?.firmName]
        .some((v) => String(v || "").toLowerCase().includes(term))
    );
  }, [scopedPending, searchTerm]);

  const filteredHistory = useMemo(() => {
    if (!searchTerm.trim()) return scopedHistory;
    const term = searchTerm.toLowerCase();
    return scopedHistory.filter((d) =>
      [d.dSrNumber, d.doNumber, d.partyName, d.productName, d.receipt?.partyPoNo, d.receipt?.firmName, d.logistic?.lgstSrNumber]
        .some((v) => String(v || "").toLowerCase().includes(term))
    );
  }, [scopedHistory, searchTerm]);

  useEffect(() => {
    setSearchTerm("");
  }, [tab]);

  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = (checked) => {
    if (checked) setSelectedIds(new Set(filteredPending.map((d) => d.id)));
    else setSelectedIds(new Set());
  };

  const selectedRows = useMemo(
    () => filteredPending.filter((d) => selectedIds.has(d.id)),
    [filteredPending, selectedIds]
  );

  const openDialog = () => {
    if (selectedIds.size === 0) {
      toast.error("Select at least one dispatch row first");
      return;
    }
    setForm({ ...EMPTY_FORM });
    setVehicleImageUrl("");
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (submitting) return;
    setDialogOpen(false);
    setForm({ ...EMPTY_FORM });
    setVehicleImageUrl("");
  };

  const showDetails = DETAIL_TYPES.includes(form.transporterType);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const { url } = await uploadFileToStorage(file, "images", "logistic");
      setVehicleImageUrl(url);
      toast.success("Vehicle plate image uploaded");
    } catch (err) {
      toast.error("Image upload failed: " + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const canSubmit =
    !isReadOnly &&
    form.transporterType &&
    (!showDetails || (form.transporterName && form.truckNo && form.driverMobileNo)) &&
    !submitting &&
    !uploadingImage;

  const handleSubmit = async () => {
    if (isReadOnly) return;
    if (selectedIds.size === 0) {
      toast.error("Select at least one dispatch row");
      return;
    }
    if (!form.transporterType) {
      toast.error("Transporter Type is required");
      return;
    }
    if (showDetails && (!form.transporterName || !form.truckNo || !form.driverMobileNo)) {
      toast.error("Transporter Name, Truck No. and Driver Mobile No. are required for this transporter type");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/order/logistic/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          dispatchIds: Array.from(selectedIds),
          transporterType: form.transporterType,
          transporterName: showDetails ? form.transporterName : "",
          truckNo: showDetails ? form.truckNo : "",
          driverMobileNo: showDetails ? form.driverMobileNo : "",
          vehicleNoPlateImage: vehicleImageUrl,
          biltyNo: showDetails ? form.biltyNo : "",
          typeOfRate: showDetails ? form.typeOfRate : "",
          rate: showDetails ? form.rate : "",
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to submit logistic details");
      toast.success(`Logistic submitted for ${selectedIds.size} dispatch row${selectedIds.size > 1 ? "s" : ""}`);
      setSelectedIds(new Set());
      closeDialog();
      await fetchData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin w-6 h-6 text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Logistic</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            Confirm transporter, vehicle and rate details for dispatches
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900">
          <CardContent className="p-6 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Pending</p>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-200">{scopedPending.length}</div>
            </div>
            <Loader2 className="h-8 w-8 text-blue-500" />
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-100 dark:border-green-900">
          <CardContent className="p-6 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-green-600">Completed Logistic</p>
              <div className="text-2xl font-bold text-green-900 dark:text-green-200">{scopedHistory.length}</div>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </CardContent>
        </Card>
        <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900">
          <CardContent className="p-6 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-purple-600">Selected Rows</p>
              <div className="text-2xl font-bold text-purple-900 dark:text-purple-200">{selectedIds.size}</div>
            </div>
            <Truck className="h-8 w-8 text-purple-500" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
              <Input
                placeholder="Search D-Sr, DO, PO, party or product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {tab === "pending" && !isReadOnly && (
                <Button
                  onClick={openDialog}
                  disabled={selectedIds.size === 0}
                  className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                >
                  <Truck className="h-4 w-4" /> Submit Logistic ({selectedIds.size})
                </Button>
              )}
              <Button variant="outline" onClick={fetchData} disabled={refreshing} className="h-9 px-3">
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="pending">Pending ({scopedPending.length})</TabsTrigger>
              <TabsTrigger value="history">History ({scopedHistory.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4">
              <div className="overflow-auto max-h-[calc(100vh-380px)] rounded-md border border-zinc-200 dark:border-zinc-800">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-zinc-50 dark:bg-zinc-900/60">
                      <TableHead className="w-10">
                        <Checkbox
                          checked={filteredPending.length > 0 && selectedIds.size === filteredPending.length}
                          onCheckedChange={toggleAll}
                          disabled={isReadOnly || filteredPending.length === 0}
                        />
                      </TableHead>
                      <TableHead>D-Sr No.</TableHead>
                      <TableHead>DO No.</TableHead>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Party</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Transporter Type</TableHead>
                      <TableHead>Dispatch Date</TableHead>
                      <TableHead>Firm</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPending.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-zinc-400">No pending dispatches</TableCell>
                      </TableRow>
                    ) : (
                      filteredPending.map((d) => (
                        <TableRow
                          key={d.id}
                          className={`text-sm cursor-pointer ${selectedIds.has(d.id) ? "bg-emerald-50 dark:bg-emerald-900/20" : ""}`}
                          onClick={() => !isReadOnly && toggleRow(d.id)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.has(d.id)}
                              onCheckedChange={() => toggleRow(d.id)}
                              disabled={isReadOnly}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs">{d.dSrNumber || "—"}</TableCell>
                          <TableCell className="font-mono text-xs">{d.doNumber || "—"}</TableCell>
                          <TableCell className="text-xs">{d.receipt?.partyPoNo || "—"}</TableCell>
                          <TableCell>{d.partyName || d.receipt?.partyName || "—"}</TableCell>
                          <TableCell>{d.productName || "—"}</TableCell>
                          <TableCell className="text-right">{d.qtyToBeDispatched ?? "—"}</TableCell>
                          <TableCell className="text-xs">{d.typeOfTransporting || "—"}</TableCell>
                          <TableCell className="text-xs">{formatDate(d.dateOfDispatch)}</TableCell>
                          <TableCell className="text-xs text-zinc-400">{d.receipt?.firmName || "—"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <div className="overflow-auto max-h-[calc(100vh-380px)] rounded-md border border-zinc-200 dark:border-zinc-800">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-zinc-50 dark:bg-zinc-900/60">
                      <TableHead>LGST-Sr</TableHead>
                      <TableHead>D-Sr No.</TableHead>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Party</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Transporter Type</TableHead>
                      <TableHead>Transporter</TableHead>
                      <TableHead>Truck No.</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Vehicle Photo</TableHead>
                      <TableHead>Firm</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-zinc-400">No logistic history</TableCell>
                      </TableRow>
                    ) : (
                      filteredHistory.map((d) => (
                        <TableRow key={d.id} className="text-sm">
                          <TableCell className="font-mono text-xs">{d.logistic?.lgstSrNumber || "—"}</TableCell>
                          <TableCell className="font-mono text-xs">{d.dSrNumber || "—"}</TableCell>
                          <TableCell className="text-xs">{d.receipt?.partyPoNo || "—"}</TableCell>
                          <TableCell>{d.partyName || d.receipt?.partyName || "—"}</TableCell>
                          <TableCell>{d.productName || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">{d.logistic?.confirmedTypeOfTransporting || "—"}</Badge>
                          </TableCell>
                          <TableCell className="text-xs">{d.logistic?.transporterName || "—"}</TableCell>
                          <TableCell className="text-xs">{d.logistic?.truckNo || "—"}</TableCell>
                          <TableCell className="text-xs">{rateDisplay(d.logistic)}</TableCell>
                          <TableCell>
                            {d.logistic?.vehicleNoPlateImage ? (
                              <a
                                href={d.logistic.vehicleNoPlateImage}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-emerald-600 hover:underline text-xs"
                              >
                                <ImageIcon className="h-3.5 w-3.5" /> View
                              </a>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-zinc-400">{d.receipt?.firmName || "—"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Sheet open={dialogOpen} onOpenChange={(v) => !v && closeDialog()}>
        <SheetContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Logistic Details</SheetTitle>
          </SheetHeader>

          <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 text-sm space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold flex items-center gap-1.5"><Package className="h-4 w-4" /> {selectedRows.length} row{selectedRows.length > 1 ? "s" : ""} selected</p>
            </div>
            <div className="max-h-32 overflow-y-auto rounded border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-[11px]">
                <thead className="bg-zinc-100 dark:bg-zinc-800 sticky top-0">
                  <tr>
                    <th className="text-left px-2 py-1 font-medium">D-Sr</th>
                    <th className="text-left px-2 py-1 font-medium">Product</th>
                    <th className="text-right px-2 py-1 font-medium">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {selectedRows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-2 py-1 font-mono">{row.dSrNumber}</td>
                      <td className="px-2 py-1">{row.productName}</td>
                      <td className="px-2 py-1 text-right">{row.qtyToBeDispatched}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Transporter Type *</Label>
              <Select
                value={form.transporterType}
                onValueChange={(v) => setForm((f) => ({ ...f, transporterType: v }))}
                disabled={submitting}
              >
                <SelectTrigger className="h-9"><SelectValue placeholder="Select Transporter Type" /></SelectTrigger>
                <SelectContent>
                  {TRANSPORTER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {showDetails && (
              <div className="space-y-1.5">
                <Label className="text-xs">Transporter Name *</Label>
                {transporterNameOptions.length > 0 ? (
                  <Select
                    value={form.transporterName}
                    onValueChange={(v) => setForm((f) => ({ ...f, transporterName: v }))}
                    disabled={submitting}
                  >
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select Transporter" /></SelectTrigger>
                    <SelectContent>
                      {transporterNameOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={form.transporterName}
                    onChange={(e) => setForm((f) => ({ ...f, transporterName: e.target.value }))}
                    className="h-9"
                    disabled={submitting}
                  />
                )}
              </div>
            )}

            {showDetails && (
              <div className="space-y-1.5">
                <Label className="text-xs">Truck No. *</Label>
                <Input
                  value={form.truckNo}
                  onChange={(e) => setForm((f) => ({ ...f, truckNo: e.target.value }))}
                  className="h-9"
                  disabled={submitting}
                />
              </div>
            )}

            {showDetails && (
              <div className="space-y-1.5">
                <Label className="text-xs">Driver Mobile No. *</Label>
                <Input
                  value={form.driverMobileNo}
                  onChange={(e) => setForm((f) => ({ ...f, driverMobileNo: e.target.value }))}
                  className="h-9"
                  disabled={submitting}
                />
              </div>
            )}

            {showDetails && (
              <div className="space-y-1.5">
                <Label className="text-xs">Bilty No.</Label>
                <Input
                  value={form.biltyNo}
                  onChange={(e) => setForm((f) => ({ ...f, biltyNo: e.target.value }))}
                  className="h-9"
                  disabled={submitting}
                />
              </div>
            )}

            {showDetails && (
              <div className="space-y-1.5">
                <Label className="text-xs">Type Of Rate</Label>
                <Select
                  value={form.typeOfRate}
                  onValueChange={(v) => setForm((f) => ({ ...f, typeOfRate: v, rate: v === "Ex Factory Transporter" ? "0" : f.rate }))}
                  disabled={submitting}
                >
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select Rate Type" /></SelectTrigger>
                  <SelectContent>
                    {RATE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {showDetails && (form.typeOfRate === "Per Matric Ton rate" || form.typeOfRate === "Fixed Amount") && (
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {form.typeOfRate === "Per Matric Ton rate" ? "Rate @ Per Matric Ton" : "Fixed Amount"}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.rate}
                  onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
                  className="h-9"
                  disabled={submitting}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Vehicle No. Plate Image</Label>
              <div className="flex items-center gap-2">
                <Input type="file" accept="image/*" onChange={handleFileChange} className="h-9 cursor-pointer" disabled={submitting || uploadingImage} />
                {uploadingImage && <Loader2 className="animate-spin w-4 h-4 text-emerald-500 shrink-0" />}
                {vehicleImageUrl && <Badge variant="outline" className="text-xs bg-green-50 text-green-700">✓ Uploaded</Badge>}
              </div>
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={closeDialog} disabled={submitting}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {submitting ? "Submitting..." : "Submit Logistic"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
