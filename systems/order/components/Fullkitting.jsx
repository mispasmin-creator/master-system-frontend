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
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const EMPTY_FORM = {
  status: "Yes", productName: "", actualTruckQty: "", transporterName: "", truckNo: "",
  rateType: "Ex Factory Transporter", transporterRate: "", totalTransporterAmount: "",
  biltyNo: "", remarks: "", transporterBillImage: "",
};

export default function Fullkitting() {
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
        fetch(`${API_URL}/order/fullkitting/pending`).then(r => r.json()),
        fetch(`${API_URL}/order/fullkitting/history`).then(r => r.json()),
      ]);
      setPending(p.data || []); setHistory(h.data || []);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openForm = (row) => {
    setSelected(row);
    setForm({ ...EMPTY_FORM, productName: row.productName || "" });
  };

  const handleBillImage = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try { const { url } = await uploadFileToStorage(file, "order-stage", "fullkitting"); setForm(f => ({ ...f, transporterBillImage: url })); toast.success("Uploaded"); }
    catch { toast.error("Upload failed"); } finally { setUploading(false); }
  };

  const isExFactory = form.rateType === "Ex Factory Transporter";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selected) return;
    if (form.status === "Yes" && (!form.productName || !form.actualTruckQty || !form.transporterName || !form.truckNo)) {
      toast.error("Product Name, Actual Truck Qty, Transporter Name and Truck No. are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/order/fullkitting`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ...form, dispatchId: selected.id }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed");
      toast.success("Fullkitting saved"); setSelected(null); loadData();
    } catch (err) { toast.error(err.message); } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin w-6 h-6 text-emerald-500" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Fullkitting</h2>
      <div className="flex gap-2">
        {["pending", "history"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${tab === t ? "bg-emerald-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"}`}
          >{t} ({t === "pending" ? pending.length : history.length})</button>
        ))}
      </div>
      {tab === "pending" && selected && isAdmin && (
        <Card>
          <CardHeader><CardTitle className="text-base">Fullkitting — {selected.dSrNumber}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div><Label className="text-xs text-zinc-500 mb-1 block">Status</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{["Yes", "No"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {form.status === "Yes" && (
                  <>
                    <div><Label className="text-xs text-zinc-500 mb-1 block">Product Name *</Label><Input value={form.productName} onChange={e => setForm(f => ({ ...f, productName: e.target.value }))} className="h-9" /></div>
                    <div><Label className="text-xs text-zinc-500 mb-1 block">Actual Truck Qty *</Label><Input type="number" step="0.01" value={form.actualTruckQty} onChange={e => setForm(f => ({ ...f, actualTruckQty: e.target.value }))} className="h-9" /></div>
                    <div><Label className="text-xs text-zinc-500 mb-1 block">Transporter Name *</Label><Input value={form.transporterName} onChange={e => setForm(f => ({ ...f, transporterName: e.target.value }))} className="h-9" /></div>
                    <div><Label className="text-xs text-zinc-500 mb-1 block">Truck No. *</Label><Input value={form.truckNo} onChange={e => setForm(f => ({ ...f, truckNo: e.target.value }))} className="h-9" /></div>
                    <div><Label className="text-xs text-zinc-500 mb-1 block">Rate Type</Label>
                      <Select value={form.rateType} onValueChange={v => setForm(f => ({ ...f, rateType: v }))}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>{["Ex Factory Transporter", "Per MT", "Fixed"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    {!isExFactory && (
                      <>
                        <div><Label className="text-xs text-zinc-500 mb-1 block">Transporter Rate</Label><Input type="number" step="0.01" value={form.transporterRate} onChange={e => setForm(f => ({ ...f, transporterRate: e.target.value }))} className="h-9" /></div>
                        <div><Label className="text-xs text-zinc-500 mb-1 block">Total Transporter Amount</Label><Input type="number" step="0.01" value={form.totalTransporterAmount} onChange={e => setForm(f => ({ ...f, totalTransporterAmount: e.target.value }))} className="h-9" /></div>
                      </>
                    )}
                    <div><Label className="text-xs text-zinc-500 mb-1 block">Bilty No.</Label><Input value={form.biltyNo} onChange={e => setForm(f => ({ ...f, biltyNo: e.target.value }))} className="h-9" /></div>
                    <div><Label className="text-xs text-zinc-500 mb-1 block">Transporter Bill Image</Label>
                      <div className="flex items-center gap-2"><Input type="file" accept="image/*" onChange={handleBillImage} className="h-9" />{uploading && <Loader2 className="animate-spin w-4 h-4 text-emerald-500 shrink-0" />}</div>
                    </div>
                  </>
                )}
                <div className="sm:col-span-2 lg:col-span-3"><Label className="text-xs text-zinc-500 mb-1 block">Remarks</Label><Input value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} className="h-9" /></div>
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={submitting || uploading} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
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
              {["D-Sr No.", "DO No.", "Party", "Product", "Qty"].map(h => <TableHead key={h} className="text-xs font-semibold">{h}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(tab === "pending" ? pending : history).length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-zinc-400">No records</TableCell></TableRow>
            ) : (tab === "pending" ? pending : history).map(r => (
              <TableRow key={r.id} className={`text-sm cursor-pointer ${selected?.id === r.id ? "bg-emerald-50 dark:bg-emerald-900/20" : ""}`}
                onClick={() => tab === "pending" && isAdmin && openForm(r)}>
                <TableCell className="font-mono text-xs">{r.dSrNumber}</TableCell>
                <TableCell className="font-mono text-xs">{r.doNumber}</TableCell>
                <TableCell>{r.partyName}</TableCell>
                <TableCell>{r.productName}</TableCell>
                <TableCell>{r.qtyToBeDispatched}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
