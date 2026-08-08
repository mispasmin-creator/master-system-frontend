"use client";
import React, { useState, useEffect, useCallback } from "react";
import { API_URL } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, Truck, FileText, RotateCcw, TrendingUp, BarChart3 } from "lucide-react";

function StatCard({ title, value, sub, icon: Icon, color = "emerald" }) {
  const colors = {
    emerald: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400",
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400",
    amber: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
    purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400",
  };
  return (
    <Card className="border border-zinc-200 dark:border-zinc-800">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`rounded-xl p-3 ${colors[color]}`}><Icon className="w-6 h-6" /></div>
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{title}</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">{value ?? "—"}</p>
          {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/order/dashboard`);
      const json = await res.json();
      setData(json.data || null);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin w-6 h-6 text-emerald-500" /></div>;

  const summary = data?.summary || {};
  const recentOrders = data?.recentOrders || [];
  const stageBreakdown = data?.stageBreakdown || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Order Dashboard</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Real-time overview of order system</p>
        </div>
        <button onClick={loadData} className="text-xs text-zinc-500 hover:text-emerald-600 transition-colors">↺ Refresh</button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Orders" value={summary.totalOrders} sub="All time" icon={Package} color="emerald" />
        <StatCard title="Active Orders" value={summary.activeOrders} sub="In pipeline" icon={TrendingUp} color="blue" />
        <StatCard title="Dispatched" value={summary.totalDispatched} sub="Dispatches created" icon={Truck} color="purple" />
        <StatCard title="Material Returns" value={summary.totalReturns} sub="Return records" icon={RotateCcw} color="amber" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {["overview", "stage-breakdown", "recent"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${tab === t ? "bg-emerald-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"}`}
          >{t.replace("-", " ")}</button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            ["Pending Check PO", summary.pendingCheckPo, "blue"],
            ["Pending Check Delivery", summary.pendingCheckDelivery, "blue"],
            ["Pending Logistics", summary.pendingLogistics, "amber"],
            ["Pending Dispatch", summary.pendingDispatch, "amber"],
            ["Pending Invoice", summary.pendingInvoice, "purple"],
            ["Pending PI", summary.pendingPi, "purple"],
          ].map(([label, val, color]) => (
            <Card key={label} className="border border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
                <p className={`text-xl font-bold mt-1 ${color === "blue" ? "text-blue-600" : color === "amber" ? "text-amber-600" : "text-purple-600"}`}>{val ?? 0}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === "stage-breakdown" && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50 dark:bg-zinc-900/60">
                {["Stage", "Pending", "Completed"].map(h => <TableHead key={h} className="text-xs font-semibold">{h}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {stageBreakdown.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center py-10 text-zinc-400">No stage data</TableCell></TableRow>
              ) : stageBreakdown.map((s, i) => (
                <TableRow key={i} className="text-sm">
                  <TableCell>{s.stage}</TableCell>
                  <TableCell><Badge className="text-xs bg-amber-100 text-amber-700 border-0">{s.pending}</Badge></TableCell>
                  <TableCell><Badge className="text-xs bg-emerald-100 text-emerald-700 border-0">{s.completed}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {tab === "recent" && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50 dark:bg-zinc-900/60">
                {["DO No.", "Party", "Product", "Qty", "Status", "Created"].map(h => <TableHead key={h} className="text-xs font-semibold whitespace-nowrap">{h}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentOrders.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-zinc-400">No recent orders</TableCell></TableRow>
              ) : recentOrders.map(r => (
                <TableRow key={r.id} className="text-sm">
                  <TableCell className="font-mono text-xs">{r.doNumber}</TableCell>
                  <TableCell>{r.partyName}</TableCell>
                  <TableCell>{r.productName}</TableCell>
                  <TableCell>{r.quantity}</TableCell>
                  <TableCell><Badge className="text-xs bg-emerald-100 text-emerald-700 border-0">{r.status}</Badge></TableCell>
                  <TableCell className="text-xs text-zinc-400">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
