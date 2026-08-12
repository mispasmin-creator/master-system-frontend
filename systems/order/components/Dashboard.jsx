"use client";
import React, { useState, useEffect, useCallback } from "react";
import { API_URL } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, Truck, FileText, RotateCcw } from "lucide-react";

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

const PROCESS_STAGES = [
  ["pendingCheckPo", "Check PO"],
  ["pendingReceivedAccounts", "Received Accounts"],
  ["pendingCheckDelivery", "Check Delivery"],
  ["pendingArrangeLogistics", "Arrange Logistics"],
  ["pendingLogisticsApproval", "Logistics Approval"],
  ["pendingAccountsApproval", "Accounts Approval"],
  ["pendingLogistic", "Logistic"],
  ["pendingLoadMaterial", "Load Material"],
  ["pendingWetmanEntry", "Wetman Entry"],
  ["pendingInvoice", "Invoice"],
  ["pendingFullkitting", "Fullkitting"],
  ["pendingTc", "TC"],
  ["pendingBiltyUpdate", "Bilty Update"],
  ["pendingCrm", "CRM"],
  ["pendingMaterialReturnApproval", "Return: Mgmt Approval"],
  ["pendingMaterialReturnDebitNote", "Return: Debit Note"],
  ["pendingMaterialReturnDispatch", "Return: Dispatch Back"],
];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [process, setProcess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [d, p] = await Promise.all([
        fetch(`${API_URL}/order/dashboard`).then(r => r.json()),
        fetch(`${API_URL}/order/dashboard/process`).then(r => r.json()),
      ]);
      setData(d.data || null);
      setProcess(p.data || null);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin w-6 h-6 text-emerald-500" /></div>;

  const d = data || {};
  const statusBreakdown = Object.entries(d.statusBreakdown || {});

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
        <StatCard title="Total Orders" value={d.ordersCount} sub={`Qty ${d.totalOrderQty ?? 0}`} icon={Package} color="emerald" />
        <StatCard title="Dispatches" value={d.dispatchesCount} sub="All time" icon={Truck} color="blue" />
        <StatCard title="Deliveries" value={d.deliveriesCount} sub="All time" icon={FileText} color="purple" />
        <StatCard title="Total Bill Amount" value={`₹${(d.totalBillAmount ?? 0).toLocaleString("en-IN")}`} sub="Material receipts" icon={RotateCcw} color="amber" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {["overview", "status-breakdown", "finance"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${tab === t ? "bg-emerald-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"}`}
          >{t.replace("-", " ")}</button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {PROCESS_STAGES.map(([key, label]) => (
            <Card key={key} className="border border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Pending: {label}</p>
                <p className="text-xl font-bold mt-1 text-amber-600">{process?.[key] ?? 0}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === "status-breakdown" && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50 dark:bg-zinc-900/60">
                {["Order Status", "Count"].map(h => <TableHead key={h} className="text-xs font-semibold">{h}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {statusBreakdown.length === 0 ? (
                <TableRow><TableCell colSpan={2} className="text-center py-10 text-zinc-400">No status data</TableCell></TableRow>
              ) : statusBreakdown.map(([status, count]) => (
                <TableRow key={status} className="text-sm">
                  <TableCell>{status}</TableCell>
                  <TableCell><Badge className="text-xs bg-emerald-100 text-emerald-700 border-0">{count}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {tab === "finance" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="border border-zinc-200 dark:border-zinc-800">
            <CardContent className="p-4">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">PI Pending Amount</p>
              <p className="text-xl font-bold mt-1 text-amber-600">₹{(d.pi?.pendingAmount ?? 0).toLocaleString("en-IN")}</p>
              <p className="text-xs text-zinc-400 mt-1">{d.pi?.pendingCount ?? 0} of {d.pi?.totalRecords ?? 0} PIs pending</p>
            </CardContent>
          </Card>
          <Card className="border border-zinc-200 dark:border-zinc-800">
            <CardContent className="p-4">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">PI Received Amount</p>
              <p className="text-xl font-bold mt-1 text-emerald-600">₹{(d.pi?.receivedAmount ?? 0).toLocaleString("en-IN")}</p>
            </CardContent>
          </Card>
          <Card className="border border-zinc-200 dark:border-zinc-800">
            <CardContent className="p-4">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Retention Pending Amount</p>
              <p className="text-xl font-bold mt-1 text-amber-600">₹{(d.retention?.pendingAmount ?? 0).toLocaleString("en-IN")}</p>
              <p className="text-xs text-zinc-400 mt-1">{d.retention?.totalRecords ?? 0} retention records</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
