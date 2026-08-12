"use client";
import React, { useState, useEffect, useCallback } from "react";
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

const EMPTY_FORM = { biltyNo: "", biltyCopy: "", receiptDate: "", grnNumber: "", arrivalProofUrl: "", totalBillAmount: "" };

export default function BiltyUpdate() {
  const { user } = useAuth();
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const isAdmin = user?.role === "admin" || user?.page_access === "all" || user?.page_access === "super admin";

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, h] = await Promise.all([
        fetch(`${API_URL}/order/delivery/pending`).then(r => r.json()),
        fetch(`${API_URL}/order/delivery/history`).then(r => r.json()),
      ]);
      setPending(p.data || []); setHistory(h.data || []);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleFile = async (e, key) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(key);
    try { const { url } = await uploadFileToStorage(file, "order-stage", "delivery"); setForm(f => ({ ...f, [key]: url })); toast.success("Uploaded"); }
    catch { toast.error("Upload failed"); } finally { setUploading(null); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selected) return;
    if (!form.receiptDate || !form.grnNumber) { toast.error("Receipt Date and GRN Number are required."); return; }
    if (!form.biltyNo || !form.biltyCopy) { toast.error("Bilty No. and Bilty Copy are required."); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/order/delivery`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ...form, deliveryId: selected.id }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed");
      toast.success("Bilty / Material Receipt saved"); setSelected(null); setForm(EMPTY_FORM); loadData();
    } catch (err) { toast.error(err.message); } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin w-6 h-6 text-emerald-500" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Bilty Update / Material Receipt</h2>
      <div className="flex gap-2">
        {["pending", "history"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${tab === t ? "bg-emerald-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"}`}
          >{t} ({t === "pending" ? pending.length : history.length})</button>
        ))}
      </div>
      {tab === "pending" && selected && isAdmin && (
        <Card>
          <CardHeader><CardTitle className="text-base">Bilty Details — {selected.doNumber}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[["biltyNo", "Bilty No. *"], ["receiptDate", "Receipt Date *", "date"], ["grnNumber", "GRN Number *"], ["totalBillAmount", "Total Bill Amount", "number"]].map(([k, l, type = "text"]) => (
                <div key={k}><Label className="text-xs text-zinc-500 mb-1 block">{l}</Label><Input type={type} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} className="h-9" /></div>
              ))}
              <div>
                <Label className="text-xs text-zinc-500 mb-1 block">Bilty Copy *</Label>
                <div className="flex items-center gap-2"><Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => handleFile(e, "biltyCopy")} className="h-9" />{uploading === "biltyCopy" && <Loader2 className="animate-spin w-4 h-4 text-emerald-500 shrink-0" />}</div>
              </div>
              <div>
                <Label className="text-xs text-zinc-500 mb-1 block">Arrival Proof</Label>
                <div className="flex items-center gap-2"><Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => handleFile(e, "arrivalProofUrl")} className="h-9" />{uploading === "arrivalProofUrl" && <Loader2 className="animate-spin w-4 h-4 text-emerald-500 shrink-0" />}</div>
              </div>
              <div className="sm:col-span-2 lg:col-span-4 flex gap-3">
                <Button type="submit" disabled={submitting || !!uploading} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                  {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />} Save
                </Button>
                <Button type="button" variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 dark:bg-zinc-900/60">
              {["DO No.", "Party", "Product", "Qty", "Bill No.", "Bill Date", tab === "history" ? "Bilty No." : "Status"].map(h => <TableHead key={h} className="text-xs font-semibold whitespace-nowrap">{h}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(tab === "pending" ? pending : history).length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-zinc-400">No records</TableCell></TableRow>
            ) : (tab === "pending" ? pending : history).map(r => (
              <TableRow key={r.id} className={`text-sm cursor-pointer ${selected?.id === r.id ? "bg-emerald-50 dark:bg-emerald-900/20" : ""}`}
                onClick={() => tab === "pending" && isAdmin && setSelected(r)}>
                <TableCell className="font-mono text-xs">{r.doNumber}</TableCell>
                <TableCell>{r.partyName}</TableCell>
                <TableCell>{r.productName}</TableCell>
                <TableCell>{r.quantityDelivered}</TableCell>
                <TableCell>{r.billNo}</TableCell>
                <TableCell className="text-xs">{r.billDate ? new Date(r.billDate).toLocaleDateString() : "—"}</TableCell>
                <TableCell>{tab === "history" ? (r.bilty?.biltyNo || "—") : <Badge variant="outline" className="text-xs">Pending</Badge>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
