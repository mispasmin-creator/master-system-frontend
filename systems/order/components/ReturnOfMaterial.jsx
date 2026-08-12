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
import { Loader2, CheckCircle2, Truck } from "lucide-react";
import { toast } from "sonner";

const EMPTY_FORM = {
  hasTransporterInfo: "No", transporterName: "", transporterMobile: "", vehicleNo: "",
  receivedDate: "", freightPaidBy: "Paid by Party", transporterType: "", rate: "", biltyNo: "", biltyImageUrl: "",
};

export default function ReturnOfMaterial() {
  const { user } = useAuth();
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isAdmin = user?.role === "admin" || user?.page_access === "all" || user?.page_access === "super admin";

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, h] = await Promise.all([
        fetch(`${API_URL}/order/material-return/return-dispatch/pending`).then(r => r.json()),
        fetch(`${API_URL}/order/material-return/return-dispatch/history`).then(r => r.json()),
      ]);
      setPending(p.data || []); setHistory(h.data || []);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleBiltyImage = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try { const { url } = await uploadFileToStorage(file, "order-stage", "return-dispatch"); setForm(f => ({ ...f, biltyImageUrl: url })); toast.success("Uploaded"); }
    catch { toast.error("Upload failed"); } finally { setUploading(false); }
  };

  const paidByUs = form.hasTransporterInfo === "Yes" && form.freightPaidBy === "Paid by Us";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/order/material-return/return-dispatch/${selected.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed");
      toast.success("Return dispatch recorded"); setSelected(null); setForm(EMPTY_FORM); loadData();
    } catch (err) { toast.error(err.message); } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin w-6 h-6 text-emerald-500" /></div>;
  const rows = tab === "pending" ? pending : history;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Return of Material (Dispatch Back)</h2>
      <div className="flex gap-2">
        {["pending", "history"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${tab === t ? "bg-emerald-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"}`}
          >{t} ({t === "pending" ? pending.length : history.length})</button>
        ))}
      </div>
      {tab === "pending" && selected && isAdmin && (
        <Card>
          <CardHeader><CardTitle className="text-base">Record Dispatch Back — {selected.returnNo}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div><Label className="text-xs text-zinc-500 mb-1 block">Received Date</Label><Input type="date" value={form.receivedDate} onChange={e => setForm(f => ({ ...f, receivedDate: e.target.value }))} className="h-9" /></div>
              <div><Label className="text-xs text-zinc-500 mb-1 block">Has Transporter Info</Label>
                <Select value={form.hasTransporterInfo} onValueChange={v => setForm(f => ({ ...f, hasTransporterInfo: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{["No", "Yes"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {form.hasTransporterInfo === "Yes" && (
                <>
                  <div><Label className="text-xs text-zinc-500 mb-1 block">Transporter Name</Label><Input value={form.transporterName} onChange={e => setForm(f => ({ ...f, transporterName: e.target.value }))} className="h-9" /></div>
                  <div><Label className="text-xs text-zinc-500 mb-1 block">Transporter Mobile</Label><Input value={form.transporterMobile} onChange={e => setForm(f => ({ ...f, transporterMobile: e.target.value }))} className="h-9" /></div>
                  <div><Label className="text-xs text-zinc-500 mb-1 block">Vehicle No.</Label><Input value={form.vehicleNo} onChange={e => setForm(f => ({ ...f, vehicleNo: e.target.value }))} className="h-9" /></div>
                  <div><Label className="text-xs text-zinc-500 mb-1 block">Freight Paid By</Label>
                    <Select value={form.freightPaidBy} onValueChange={v => setForm(f => ({ ...f, freightPaidBy: v }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{["Paid by Party", "Paid by Us"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {paidByUs && (
                    <>
                      <div><Label className="text-xs text-zinc-500 mb-1 block">Transporter Type</Label><Input value={form.transporterType} onChange={e => setForm(f => ({ ...f, transporterType: e.target.value }))} className="h-9" /></div>
                      <div><Label className="text-xs text-zinc-500 mb-1 block">Rate</Label><Input type="number" step="0.01" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} className="h-9" /></div>
                      <div><Label className="text-xs text-zinc-500 mb-1 block">Bilty No.</Label><Input value={form.biltyNo} onChange={e => setForm(f => ({ ...f, biltyNo: e.target.value }))} className="h-9" /></div>
                      <div>
                        <Label className="text-xs text-zinc-500 mb-1 block">Bilty Copy</Label>
                        <div className="flex items-center gap-2"><Input type="file" accept="image/*,.pdf" onChange={handleBiltyImage} className="h-9" />{uploading && <Loader2 className="animate-spin w-4 h-4 text-emerald-500 shrink-0" />}</div>
                      </div>
                    </>
                  )}
                </>
              )}
              <div className="sm:col-span-2 lg:col-span-4 flex gap-3">
                <Button type="submit" disabled={submitting || uploading} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                  {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : <Truck className="w-4 h-4" />} Save
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
              {["Return No.", "DO No.", "Party", "Product", "Return Qty", tab === "history" ? "Received Date" : "Status"].map(h => <TableHead key={h} className="text-xs font-semibold whitespace-nowrap">{h}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-zinc-400">No records</TableCell></TableRow>
            ) : rows.map(r => (
              <TableRow key={r.id} className={`text-sm cursor-pointer ${selected?.id === r.id ? "bg-emerald-50 dark:bg-emerald-900/20" : ""}`}
                onClick={() => tab === "pending" && isAdmin && setSelected(r)}>
                <TableCell className="font-mono text-xs">{r.returnNo}</TableCell>
                <TableCell className="font-mono text-xs">{r.doNumber}</TableCell>
                <TableCell>{r.partyName}</TableCell>
                <TableCell>{r.productName}</TableCell>
                <TableCell>{r.qty}</TableCell>
                <TableCell>{tab === "history" ? (r.returnDispatch?.returnReceivedAt ? new Date(r.returnDispatch.returnReceivedAt).toLocaleDateString() : "—") : <Badge variant="outline" className="text-xs">Pending</Badge>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
