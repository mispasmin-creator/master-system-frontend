"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
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

// Backend comment on GET /order/retention: "frontend computes
// billAmount/retentionAmount/dueDate/balance/status per PO group" from the
// three raw lists it returns (receipts, retentionRecords, materialReceipts).
function buildRetentionGroups(receipts, retentionRecords, materialReceipts) {
  const recordByPo = new Map((retentionRecords || []).map((r) => [r.poNumber, r]));
  const billByOrderNo = new Map((materialReceipts || []).map((m) => [m.orderNo, m]));

  const groups = new Map();
  (receipts || []).forEach((r) => {
    const po = r.partyPoNo || "PO Not Available";
    if (!groups.has(po)) groups.set(po, { poNumber: po, receipts: [], billAmount: 0 });
    const g = groups.get(po);
    g.receipts.push(r);
    const bill = billByOrderNo.get(r.doNumber);
    if (bill) g.billAmount += bill.totalBillAmount || 0;
  });

  return Array.from(groups.values()).map((g) => {
    const first = g.receipts[0] || {};
    const pct = first.retentionPercentage || 0;
    const retentionAmount = Math.round((g.billAmount * pct) / 100);
    const record = recordByPo.get(g.poNumber);
    const amountReceived = record?.amountReceived || 0;
    const balance = Math.max(0, retentionAmount - amountReceived);
    return {
      poNumber: g.poNumber,
      partyName: first.partyName,
      productName: first.productName,
      leadTimeForRetention: first.leadTimeForRetention,
      billAmount: g.billAmount,
      retentionPercentage: pct,
      retentionAmount,
      amountReceived,
      balance,
      status: record?.status || "Pending",
    };
  });
}

export default function Retention() {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState([]);
  const [retentionRecords, setRetentionRecords] = useState([]);
  const [materialReceipts, setMaterialReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState("partial");
  const [form, setForm] = useState({ amountReceived: "", remarks: "" });
  const [submitting, setSubmitting] = useState(false);
  const isAdmin = user?.role === "admin" || user?.page_access === "all" || user?.page_access === "super admin";

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/order/retention`);
      const json = await res.json();
      setReceipts(json.data?.receipts || []);
      setRetentionRecords(json.data?.retentionRecords || []);
      setMaterialReceipts(json.data?.materialReceipts || []);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const groups = useMemo(() => buildRetentionGroups(receipts, retentionRecords, materialReceipts), [receipts, retentionRecords, materialReceipts]);

  const openForm = (group) => {
    setSelected(group);
    setAction("partial");
    setForm({ amountReceived: "", remarks: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selected) return;
    if (action === "partial" && !form.amountReceived) { toast.error("Amount Received is required"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/order/retention`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          poNumber: selected.poNumber,
          retentionAmount: selected.retentionAmount,
          markAsPaid: action === "full",
          amountReceived: action === "partial" ? form.amountReceived : undefined,
          remarks: form.remarks,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed");
      toast.success("Retention recorded"); setSelected(null); loadData();
    } catch (err) { toast.error(err.message); } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin w-6 h-6 text-emerald-500" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Retention</h2>
      {selected && isAdmin && (
        <Card>
          <CardHeader><CardTitle className="text-base">Retention — PO {selected.poNumber}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div><Label className="text-xs text-zinc-500 mb-1 block">Action</Label>
                  <Select value={action} onValueChange={setAction}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="partial">Record Partial Payment</SelectItem>
                      <SelectItem value="full">Mark Fully Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {action === "partial" && (
                  <div><Label className="text-xs text-zinc-500 mb-1 block">Amount Received *</Label><Input type="number" step="0.01" value={form.amountReceived} onChange={e => setForm(f => ({ ...f, amountReceived: e.target.value }))} className="h-9" /></div>
                )}
                <div className="sm:col-span-2"><Label className="text-xs text-zinc-500 mb-1 block">Remarks</Label><Input value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} className="h-9" /></div>
              </div>
              <p className="text-xs text-zinc-500">Retention Amount: ₹{selected.retentionAmount.toLocaleString("en-IN")} · Balance: ₹{selected.balance.toLocaleString("en-IN")}</p>
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
              {["PO Number", "Party", "Product", "Bill Amount", "Retention %", "Retention Amt", "Balance", "Status"].map(h => <TableHead key={h} className="text-xs font-semibold whitespace-nowrap">{h}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-zinc-400">No retention orders</TableCell></TableRow>
            ) : groups.map(g => (
              <TableRow key={g.poNumber} className={`text-sm cursor-pointer ${selected?.poNumber === g.poNumber ? "bg-emerald-50 dark:bg-emerald-900/20" : ""}`}
                onClick={() => isAdmin && g.status !== "Paid" && openForm(g)}>
                <TableCell className="font-mono text-xs">{g.poNumber}</TableCell>
                <TableCell>{g.partyName}</TableCell>
                <TableCell>{g.productName}</TableCell>
                <TableCell>₹{g.billAmount.toLocaleString("en-IN")}</TableCell>
                <TableCell>{g.retentionPercentage}%</TableCell>
                <TableCell>₹{g.retentionAmount.toLocaleString("en-IN")}</TableCell>
                <TableCell>₹{g.balance.toLocaleString("en-IN")}</TableCell>
                <TableCell><Badge className={`text-xs border-0 ${g.status === "Paid" ? "bg-emerald-100 text-emerald-700" : g.status === "Partial" ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-700"}`}>{g.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
