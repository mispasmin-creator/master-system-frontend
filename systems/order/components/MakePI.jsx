"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { API_URL, getToken } from "@/lib/auth";
import { useAuth } from "@/systems/order/context/AuthContext";
import { uploadFileToStorage } from "@/systems/order/utils/storageUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

// Groups pending receipts by PO and subtracts already-raised PI quantity per
// poNumber — mirrors the comment on GET /order/pi/pending: "frontend groups
// receipts by PO and subtracts already-raised pi_quantity per matching
// poNumber to compute remaining qty".
function buildPiGroups(receipts, piRecords) {
  const raisedByPo = new Map();
  (piRecords || []).forEach((r) => {
    if (!r.poNumber) return;
    raisedByPo.set(r.poNumber, (raisedByPo.get(r.poNumber) || 0) + (r.piQuantity || 0));
  });

  const groups = new Map();
  (receipts || []).forEach((r) => {
    const po = r.partyPoNo || "PO Not Available";
    if (!groups.has(po)) groups.set(po, { poNumber: po, receipts: [], totalQty: 0, totalPoValue: 0 });
    const g = groups.get(po);
    g.receipts.push(r);
    g.totalQty += r.quantity || 0;
    g.totalPoValue += r.totalPoBasicValue || (r.quantity || 0) * (r.rateOfMaterial || 0);
  });

  return Array.from(groups.values())
    .map((g) => {
      const raised = raisedByPo.get(g.poNumber) || 0;
      const remainingQty = Math.max(0, g.totalQty - raised);
      const first = g.receipts[0] || {};
      return {
        ...g,
        raisedQty: raised,
        remainingQty,
        partyName: first.partyName,
        firmName: first.firmName,
        piType: first.typeOfPi,
        productNames: [...new Set(g.receipts.map((r) => r.productName).filter(Boolean))],
      };
    })
    .filter((g) => g.remainingQty > 0);
}

export default function MakePI() {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState([]);
  const [piRecords, setPiRecords] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [form, setForm] = useState({ piQuantity: "", dueDate: "", expectedAmount: "", notes: "", piCopy: "" });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isAdmin = user?.role === "admin" || user?.page_access === "all" || user?.page_access === "super admin";

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, h] = await Promise.all([
        fetch(`${API_URL}/order/pi/pending`).then(r => r.json()),
        fetch(`${API_URL}/order/pi`).then(r => r.json()),
      ]);
      setReceipts(p.data?.receipts || []);
      setPiRecords(p.data?.piRecords || []);
      setHistory(h.data || []);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const groups = useMemo(() => buildPiGroups(receipts, piRecords), [receipts, piRecords]);

  const openForm = (group) => {
    setSelectedGroup(group);
    setForm({ piQuantity: String(group.remainingQty), dueDate: "", expectedAmount: "", notes: "", piCopy: "" });
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try { const { url } = await uploadFileToStorage(file, "order-stage", "pi"); setForm(f => ({ ...f, piCopy: url })); toast.success("Uploaded"); }
    catch { toast.error("Upload failed"); } finally { setUploading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedGroup) return;
    if (!form.dueDate || !form.piQuantity) { toast.error("PI Quantity and Due Date are required"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/order/pi`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          poNumber: selectedGroup.poNumber,
          poIds: selectedGroup.receipts.map((r) => r.id),
          partyName: selectedGroup.partyName,
          firmName: selectedGroup.firmName,
          piType: selectedGroup.piType,
          productNames: selectedGroup.productNames,
          totalPoValue: selectedGroup.totalPoValue,
          expectedAmount: form.expectedAmount,
          piQuantity: form.piQuantity,
          dueDate: form.dueDate,
          notes: form.notes,
          piCopy: form.piCopy || null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed");
      toast.success(`PI created: ${json.data?.piNumber}`); setSelectedGroup(null); loadData();
    } catch (err) { toast.error(err.message); } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin w-6 h-6 text-emerald-500" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Make PI</h2>
      <div className="flex gap-2">
        {["pending", "history"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${tab === t ? "bg-emerald-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"}`}
          >{t} ({t === "pending" ? groups.length : history.length})</button>
        ))}
      </div>

      {tab === "pending" && selectedGroup && isAdmin && (
        <Card>
          <CardHeader><CardTitle className="text-base">Create PI — PO {selectedGroup.poNumber}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div><Label className="text-xs text-zinc-500 mb-1 block">PI Quantity *</Label><Input type="number" step="0.01" value={form.piQuantity} onChange={e => setForm(f => ({ ...f, piQuantity: e.target.value }))} className="h-9" /></div>
                <div><Label className="text-xs text-zinc-500 mb-1 block">Due Date *</Label><Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="h-9" /></div>
                <div><Label className="text-xs text-zinc-500 mb-1 block">Expected Amount</Label><Input type="number" step="0.01" value={form.expectedAmount} onChange={e => setForm(f => ({ ...f, expectedAmount: e.target.value }))} className="h-9" /></div>
                <div>
                  <Label className="text-xs text-zinc-500 mb-1 block">PI Copy</Label>
                  <div className="flex items-center gap-2"><Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFile} className="h-9" />{uploading && <Loader2 className="animate-spin w-4 h-4 text-emerald-500 shrink-0" />}</div>
                </div>
                <div className="sm:col-span-2 lg:col-span-4"><Label className="text-xs text-zinc-500 mb-1 block">Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="h-9" /></div>
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={submitting || uploading} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                  {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />} Generate PI
                </Button>
                <Button type="button" variant="outline" onClick={() => setSelectedGroup(null)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 dark:bg-zinc-900/60">
              {tab === "pending" && <TableHead className="text-xs font-semibold whitespace-nowrap w-20">Action</TableHead>}
              {tab === "pending"
                ? ["PO Number", "Party", "Firm", "PI Type", "Remaining Qty"].map(h => <TableHead key={h} className="text-xs font-semibold whitespace-nowrap">{h}</TableHead>)
                : ["PI Number", "PO Number", "Party", "Firm", "PI Qty", "Due Date", "Status"].map(h => <TableHead key={h} className="text-xs font-semibold whitespace-nowrap">{h}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tab === "pending" ? (
              groups.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-zinc-400">No records</TableCell></TableRow>
              ) : groups.map((g) => (
                <TableRow key={g.poNumber} className={`text-sm ${selectedGroup?.poNumber === g.poNumber ? "bg-emerald-50 dark:bg-emerald-900/20" : ""}`}>
                  <TableCell>{isAdmin && <Button size="sm" onClick={() => openForm(g)} className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs">Make PI</Button>}</TableCell>
                  <TableCell className="font-mono text-xs">{g.poNumber}</TableCell>
                  <TableCell>{g.partyName}</TableCell>
                  <TableCell>{g.firmName}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs font-normal">{g.piType || "—"}</Badge></TableCell>
                  <TableCell>{g.remainingQty}</TableCell>
                </TableRow>
              ))
            ) : (
              history.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-zinc-400">No records</TableCell></TableRow>
              ) : history.map(r => (
                <TableRow key={r.id} className="text-sm">
                  <TableCell className="font-mono text-xs">{r.piNumber}</TableCell>
                  <TableCell className="font-mono text-xs">{r.poNumber}</TableCell>
                  <TableCell>{r.partyName}</TableCell>
                  <TableCell>{r.firmName}</TableCell>
                  <TableCell>{r.piQuantity}</TableCell>
                  <TableCell className="text-xs">{r.dueDate ? new Date(r.dueDate).toLocaleDateString() : "—"}</TableCell>
                  <TableCell><Badge className={`text-xs border-0 ${r.status === "Received" ? "bg-emerald-100 text-emerald-700" : r.status === "Partial" ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-700"}`}>{r.status || "Pending"}</Badge></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
