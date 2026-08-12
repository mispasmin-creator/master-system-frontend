"use client";
import React, { useState, useEffect, useCallback } from "react";
import { API_URL, getToken } from "@/lib/auth";
import { useAuth } from "@/systems/order/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function CRM() {
  const { user } = useAuth();
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const isAdmin = user?.role === "admin" || user?.page_access === "all" || user?.page_access === "super admin";

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, h] = await Promise.all([
        fetch(`${API_URL}/order/crm/pending`).then(r => r.json()),
        fetch(`${API_URL}/order/crm/history`).then(r => r.json()),
      ]);
      setPending(p.data || []); setHistory(h.data || []);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Backend contract (crm.controller.js markDone) only accepts { deliveryId }
  // — CRM has no extra fields to fill in, it's a one-click "done" stamp.
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/order/crm`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ deliveryId: selected.id }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed");
      toast.success("CRM marked done"); setSelected(null); loadData();
    } catch (err) { toast.error(err.message); } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin w-6 h-6 text-emerald-500" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">CRM</h2>
      <div className="flex gap-2">
        {["pending", "history"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${tab === t ? "bg-emerald-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"}`}
          >{t} ({t === "pending" ? pending.length : history.length})</button>
        ))}
      </div>
      {tab === "pending" && selected && isAdmin && (
        <Card>
          <CardHeader><CardTitle className="text-base">CRM — {selected.doNumber}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex items-center gap-3">
              <p className="text-sm text-zinc-500 flex-1">Mark this delivery's CRM step as complete for {selected.partyName || "this party"}.</p>
              <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />} Mark Done
              </Button>
              <Button type="button" variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
            </form>
          </CardContent>
        </Card>
      )}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 dark:bg-zinc-900/60">
              {["DO No.", "Party", "Product", "Qty Delivered", "Bill No.", "Status"].map(h => <TableHead key={h} className="text-xs font-semibold">{h}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(tab === "pending" ? pending : history).length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-zinc-400">No records</TableCell></TableRow>
            ) : (tab === "pending" ? pending : history).map(r => (
              <TableRow key={r.id} className={`text-sm cursor-pointer ${selected?.id === r.id ? "bg-emerald-50 dark:bg-emerald-900/20" : ""}`}
                onClick={() => tab === "pending" && isAdmin && setSelected(r)}>
                <TableCell className="font-mono text-xs">{r.doNumber}</TableCell>
                <TableCell>{r.partyName}</TableCell>
                <TableCell>{r.productName}</TableCell>
                <TableCell>{r.quantityDelivered}</TableCell>
                <TableCell>{r.billNo}</TableCell>
                <TableCell><Badge className="text-xs bg-emerald-100 text-emerald-700 border-0">{r.status || "Delivered"}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
