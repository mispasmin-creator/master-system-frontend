"use client";
import React, { useState, useEffect, useCallback } from "react";
import { API_URL, getToken } from "@/lib/auth";
import { useAuth } from "@/systems/order/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function MakePI() {
  const { user } = useAuth();
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [selected, setSelected] = useState([]);
  const [piDate, setPiDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isAdmin = user?.role === "admin" || user?.page_access === "all" || user?.page_access === "super admin";

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, h] = await Promise.all([
        fetch(`${API_URL}/order/pi/pending`).then(r => r.json()),
        fetch(`${API_URL}/order/pi/history`).then(r => r.json()),
      ]);
      setPending(p.data || []); setHistory(h.data || []);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(i => i !== id) : [...s, id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selected.length === 0) { toast.error("Select at least one order"); return; }
    if (!piDate) { toast.error("PI date is required"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/order/pi`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ receiptIds: selected, piDate }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed");
      toast.success(`PI created: ${json.data?.piNumber}`); setSelected([]); setPiDate(""); loadData();
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
          >{t} ({t === "pending" ? pending.length : history.length})</button>
        ))}
      </div>

      {tab === "pending" && selected.length > 0 && isAdmin && (
        <Card>
          <CardHeader><CardTitle className="text-base">Create PI — {selected.length} order(s)</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex items-end gap-4">
              <div><Label className="text-xs text-zinc-500 mb-1 block">PI Date *</Label><Input type="date" value={piDate} onChange={e => setPiDate(e.target.value)} className="h-9" /></div>
              <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />} Generate PI
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 dark:bg-zinc-900/60">
              {tab === "pending" && <TableHead className="w-8"></TableHead>}
              {["DO No.", "Party", "Product", "Qty", "Rate", tab === "history" ? "PI Number" : "PI Due Date"].map(h => <TableHead key={h} className="text-xs font-semibold whitespace-nowrap">{h}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(tab === "pending" ? pending : history).length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-zinc-400">No records</TableCell></TableRow>
            ) : (tab === "pending" ? pending : history).map(r => {
              const rid = r.receiptId || r.id;
              return (
                <TableRow key={rid} className={`text-sm cursor-pointer ${selected.includes(rid) ? "bg-emerald-50 dark:bg-emerald-900/20" : ""}`}
                  onClick={() => tab === "pending" && isAdmin && toggle(rid)}>
                  {tab === "pending" && <TableCell><input type="checkbox" readOnly checked={selected.includes(rid)} className="accent-emerald-600" /></TableCell>}
                  <TableCell className="font-mono text-xs">{r.doNumber || r.receipt?.doNumber}</TableCell>
                  <TableCell>{r.partyName || r.receipt?.partyName}</TableCell>
                  <TableCell>{r.productName || r.receipt?.productName}</TableCell>
                  <TableCell>{r.quantity || r.receipt?.quantity}</TableCell>
                  <TableCell>₹{r.rateOfMaterial || r.receipt?.rateOfMaterial}</TableCell>
                  <TableCell>{tab === "history" ? (r.piNumber || "—") : (r.piDueDate ? new Date(r.piDueDate).toLocaleDateString() : "—")}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
