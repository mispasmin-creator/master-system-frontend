"use client";
import React, { useState, useEffect, useCallback } from "react";
import { API_URL, getToken } from "@/lib/auth";
import { useAuth } from "@/systems/order/context/AuthContext";
import { uploadFileToStorage } from "@/systems/order/utils/storageUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, PackageX, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const VALID_REASONS = ["Damage Done", "Quality Issue", "Material Shortage", "Wrong Product", "Material Return", "Other"];

export default function MaterialReturn() {
  const { user } = useAuth();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [lookupBillNumber, setLookupBillNumber] = useState("");
  const [lookupResults, setLookupResults] = useState([]);
  const [looking, setLooking] = useState(false);
  const [selectedDispatch, setSelectedDispatch] = useState(null);
  const [form, setForm] = useState({ returnQty: "", reason: "", debitNoteCopy: "" });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isAdmin = user?.role === "admin" || user?.page_access === "all" || user?.page_access === "super admin";

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/order/material-return`);
      const json = await res.json();
      setReturns(json.data || []);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const resetForm = () => {
    setForm({ returnQty: "", reason: "", debitNoteCopy: "" });
    setSelectedDispatch(null);
    setLookupResults([]);
    setLookupBillNumber("");
  };

  const handleLookup = async () => {
    if (!lookupBillNumber) return;
    setLooking(true);
    try {
      const res = await fetch(`${API_URL}/order/material-return/lookup?billNumber=${encodeURIComponent(lookupBillNumber)}`);
      const json = await res.json();
      if (!json.success || !json.data?.length) { toast.error("No returnable dispatches found for this bill number"); setLookupResults([]); return; }
      setLookupResults(json.data);
    } catch { toast.error("Lookup failed"); } finally { setLooking(false); }
  };

  const pickDispatch = (d) => {
    setSelectedDispatch(d);
    setForm(f => ({ ...f, returnQty: "" }));
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try { const { url } = await uploadFileToStorage(file, "order-stage", "return-dc"); setForm(f => ({ ...f, debitNoteCopy: url })); toast.success("Uploaded"); }
    catch { toast.error("Upload failed"); } finally { setUploading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDispatch) { toast.error("Look up an invoice and select a dispatch line first"); return; }
    if (!form.returnQty || !form.reason || !form.debitNoteCopy) { toast.error("Return Qty, Reason and Debit Note Copy are required"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/order/material-return`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          lines: [{
            dispatchId: selectedDispatch.id,
            doNumber: selectedDispatch.doNumber,
            partyName: selectedDispatch.partyName,
            productName: selectedDispatch.productName,
            returnQty: form.returnQty,
            reason: form.reason,
            debitNoteCopy: form.debitNoteCopy,
          }],
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed");
      toast.success(`Material return created — Return No: ${json.data?.[0]?.returnNo}`);
      setShowForm(false); resetForm();
      loadData();
    } catch (err) { toast.error(err.message); } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin w-6 h-6 text-emerald-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Material Return</h2>
        {isAdmin && <Button onClick={() => setShowForm(v => !v)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"><PackageX className="w-4 h-4" /> New Return</Button>}
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">New Material Return</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label className="text-xs text-zinc-500 mb-1 block">Lookup by Bill Number</Label>
                <Input value={lookupBillNumber} onChange={e => setLookupBillNumber(e.target.value)} className="h-9" placeholder="Enter invoice bill number..." />
              </div>
              <Button type="button" onClick={handleLookup} disabled={looking} variant="outline" className="h-9 gap-2">
                {looking ? <Loader2 className="animate-spin w-4 h-4" /> : "Lookup"}
              </Button>
            </div>

            {lookupResults.length > 0 && !selectedDispatch && (
              <div className="border rounded-md overflow-hidden">
                <div className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Select a dispatch line</div>
                {lookupResults.map(d => (
                  <button type="button" key={d.id} onClick={() => pickDispatch(d)} className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 border-t flex items-center justify-between gap-3">
                    <span>{d.doNumber} · {d.partyName} · {d.productName}</span>
                    <span className="text-xs text-zinc-500 whitespace-nowrap">Available: {d.availableQty}</span>
                  </button>
                ))}
              </div>
            )}

            {selectedDispatch && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-lg border text-sm flex items-center justify-between">
                  <span>{selectedDispatch.doNumber} · {selectedDispatch.partyName} · {selectedDispatch.productName} (Available: {selectedDispatch.availableQty})</span>
                  <button type="button" onClick={() => setSelectedDispatch(null)} className="text-xs text-zinc-500 underline">Change</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div><Label className="text-xs text-zinc-500 mb-1 block">Return Qty *</Label><Input type="number" step="0.01" max={selectedDispatch.availableQty} value={form.returnQty} onChange={e => setForm(f => ({ ...f, returnQty: e.target.value }))} className="h-9" /></div>
                  <div>
                    <Label className="text-xs text-zinc-500 mb-1 block">Reason *</Label>
                    <Select value={form.reason} onValueChange={v => setForm(f => ({ ...f, reason: v }))}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select reason" /></SelectTrigger>
                      <SelectContent>{VALID_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-500 mb-1 block">Debit Note Copy *</Label>
                    <div className="flex items-center gap-2"><Input type="file" accept="image/*,.pdf" onChange={handleFile} className="h-9" />{uploading && <Loader2 className="animate-spin w-4 h-4 text-emerald-500 shrink-0" />}</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button type="submit" disabled={submitting || uploading} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                    {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />} Submit Return
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 dark:bg-zinc-900/60">
              {["Return No.", "DO No.", "Party", "Product", "Return Qty", "Date", "Status"].map(h => <TableHead key={h} className="text-xs font-semibold whitespace-nowrap">{h}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {returns.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-zinc-400">No material returns</TableCell></TableRow>
            ) : returns.map(r => {
              const status = r.returnDispatch ? "Dispatched" : r.debitNote ? "Debit Note Issued" : r.managementApproval ? "Approved" : "Pending";
              return (
                <TableRow key={r.id} className="text-sm">
                  <TableCell className="font-mono text-xs">{r.returnNo}</TableCell>
                  <TableCell className="font-mono text-xs">{r.doNumber}</TableCell>
                  <TableCell>{r.partyName}</TableCell>
                  <TableCell>{r.productName}</TableCell>
                  <TableCell>{r.qty}</TableCell>
                  <TableCell className="text-xs">{r.timeStamp ? new Date(r.timeStamp).toLocaleDateString() : "—"}</TableCell>
                  <TableCell><Badge className="text-xs border-0 bg-amber-100 text-amber-700">{status}</Badge></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
