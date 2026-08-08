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

export default function ManagementApproval() {
  const { user } = useAuth();
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [decisions, setDecisions] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const isAdmin = user?.role === "admin" || user?.page_access === "all" || user?.page_access === "super admin";

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, h] = await Promise.all([
        fetch(`${API_URL}/order/material-return/management-approval/pending`).then(r => r.json()),
        fetch(`${API_URL}/order/material-return/management-approval/history`).then(r => r.json()),
      ]);
      setPending(p.data || []); setHistory(h.data || []);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const setDecision = (id, field, value) =>
    setDecisions(d => ({ ...d, [id]: { ...(d[id] || {}), [field]: value } }));

  const handleSubmitAll = async () => {
    const entries = Object.entries(decisions).filter(([, v]) => v.approvalStatus);
    if (entries.length === 0) { toast.error("Set a decision for at least one return"); return; }
    setSubmitting(true);
    try {
      for (const [id, vals] of entries) {
        const res = await fetch(`${API_URL}/order/material-return/management-approval/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({ ...vals, approvedBy: user?.username }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message || `Failed for return ${id}`);
      }
      toast.success("Decisions saved"); setDecisions({}); loadData();
    } catch (err) { toast.error(err.message); } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin w-6 h-6 text-emerald-500" /></div>;
  const rows = tab === "pending" ? pending : history;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Management Approval (Material Return)</h2>
      <div className="flex gap-2">
        {["pending", "history"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${tab === t ? "bg-emerald-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"}`}
          >{t} ({t === "pending" ? pending.length : history.length})</button>
        ))}
      </div>
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 dark:bg-zinc-900/60">
              {["Return No.", "DO No.", "Party", "Product", "Return Qty", "Reason", tab === "pending" ? "Decision" : "Status"].map(h => <TableHead key={h} className="text-xs font-semibold whitespace-nowrap">{h}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-zinc-400">No records</TableCell></TableRow>
            ) : rows.map(r => {
              const returnId = r.returnId || r.id;
              const mr = r.materialReturn || r;
              return (
                <TableRow key={returnId} className="text-sm">
                  <TableCell className="font-mono text-xs">{mr.returnNo}</TableCell>
                  <TableCell className="font-mono text-xs">{mr.doNumber}</TableCell>
                  <TableCell>{mr.partyName}</TableCell>
                  <TableCell>{mr.productName}</TableCell>
                  <TableCell>{mr.returnQty}</TableCell>
                  <TableCell>{mr.reason}</TableCell>
                  <TableCell>
                    {tab === "pending" && isAdmin ? (
                      <Select value={decisions[returnId]?.approvalStatus || ""} onValueChange={v => setDecision(returnId, "approvalStatus", v)}>
                        <SelectTrigger className="h-8 text-xs min-w-[120px]"><SelectValue placeholder="Decide..." /></SelectTrigger>
                        <SelectContent>{["Approved", "Rejected"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : <Badge className={`text-xs border-0 ${r.approvalStatus === "Approved" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{r.approvalStatus}</Badge>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {tab === "pending" && isAdmin && Object.values(decisions).some(v => v.approvalStatus) && (
        <div className="flex justify-end">
          <Button onClick={handleSubmitAll} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />} Save Decisions
          </Button>
        </div>
      )}
    </div>
  );
}
