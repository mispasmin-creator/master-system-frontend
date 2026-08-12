"use client";
import React, { useState, useEffect, useCallback } from "react";
import { API_URL, getToken } from "@/lib/auth";
import { useAuth } from "@/systems/order/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function ReceivedPIPayment() {
  const { user } = useAuth();
  const [piList, setPiList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState("mark-paid");
  const [form, setForm] = useState({ amount: "", paymentDate: "", utr: "", rescheduleDate: "", remarks: "" });
  const [submitting, setSubmitting] = useState(false);
  const isAdmin = user?.role === "admin" || user?.page_access === "all" || user?.page_access === "super admin";

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/order/pi`);
      const json = await res.json();
      setPiList(json.data || []);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Backend has three distinct sub-routes (pi.routes.js) instead of one
  // action-in-body endpoint: mark-received/partial-payment expect
  // { amount, date, remarks }; reschedule expects { newDueDate, note }.
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selected) return;
    const path = action === "mark-paid" ? "mark-received" : action === "partial" ? "partial-payment" : "reschedule";
    const body = action === "reschedule"
      ? { newDueDate: form.rescheduleDate, note: form.remarks }
      : { amount: form.amount, date: form.paymentDate, remarks: form.remarks };
    if (action === "reschedule" && !form.rescheduleDate) { toast.error("Reschedule date is required"); return; }
    if (action !== "reschedule" && (!form.amount || !form.paymentDate)) { toast.error("Amount and Payment Date are required"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/order/pi/${selected.id}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed");
      toast.success("Payment recorded"); setSelected(null); setForm({ amount: "", paymentDate: "", utr: "", rescheduleDate: "", remarks: "" }); loadData();
    } catch (err) { toast.error(err.message); } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin w-6 h-6 text-emerald-500" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Received PI Payment</h2>
      {selected && isAdmin && (
        <Card>
          <CardHeader><CardTitle className="text-base">Record Payment — PI: {selected.piNumber}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs text-zinc-500 mb-1 block">Action</Label>
                  <Select value={action} onValueChange={setAction}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{[["mark-paid", "Mark Paid"], ["partial", "Partial Payment"], ["reschedule", "Reschedule"]].map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {action !== "reschedule" && <><div><Label className="text-xs text-zinc-500 mb-1 block">Amount</Label><Input value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="h-9" /></div>
                <div><Label className="text-xs text-zinc-500 mb-1 block">Payment Date</Label><Input type="date" value={form.paymentDate} onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))} className="h-9" /></div>
                <div><Label className="text-xs text-zinc-500 mb-1 block">UTR</Label><Input value={form.utr} onChange={e => setForm(f => ({ ...f, utr: e.target.value }))} className="h-9" /></div></>}
                {action === "reschedule" && <div className="sm:col-span-2"><Label className="text-xs text-zinc-500 mb-1 block">Reschedule Date</Label><Input type="date" value={form.rescheduleDate} onChange={e => setForm(f => ({ ...f, rescheduleDate: e.target.value }))} className="h-9" /></div>}
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
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
              {["PI Number", "PO Number", "Party", "Product", "Expected", "Received", "Due Date", "Status"].map(h => <TableHead key={h} className="text-xs font-semibold whitespace-nowrap">{h}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {piList.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-zinc-400">No PI records</TableCell></TableRow>
            ) : piList.map(r => (
              <TableRow key={r.id} className={`text-sm cursor-pointer ${selected?.id === r.id ? "bg-emerald-50 dark:bg-emerald-900/20" : ""}`}
                onClick={() => isAdmin && setSelected(r)}>
                <TableCell className="font-mono text-xs">{r.piNumber}</TableCell>
                <TableCell className="font-mono text-xs">{r.poNumber}</TableCell>
                <TableCell>{r.partyName}</TableCell>
                <TableCell>{(r.productNames || []).join(", ") || "—"}</TableCell>
                <TableCell>₹{r.expectedAmount ?? 0}</TableCell>
                <TableCell>₹{r.actualAmount ?? 0}</TableCell>
                <TableCell className="text-xs">{r.dueDate ? new Date(r.dueDate).toLocaleDateString() : "—"}</TableCell>
                <TableCell><Badge className={`text-xs border-0 ${r.status === "Received" ? "bg-emerald-100 text-emerald-700" : r.status === "Partial" ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-700"}`}>{r.status || "Pending"}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
