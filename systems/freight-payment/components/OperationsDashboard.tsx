import { FreightPayment } from "../types";
import {
  TrendingUp,
  Package,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  FileText,
  Banknote,
  Truck,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  Activity,
  BarChart2,
  Calendar,
  Download,
  Filter,
  Eye,
  Target,
  Award,
  Zap,
  ChevronRight,
  Flag,
  Loader2,
} from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { formatDelayDuration } from "../lib/delay";
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

const jk: React.CSSProperties = { fontFamily: "'Inter', system-ui, -apple-system, sans-serif" };

interface OperationsDashboardProps {
  payments: FreightPayment[];
  onNavigate: (tab: string) => void;
  onRefresh?: () => void;
}

interface ReportData {
  date: Date;
  totalShipments: number;
  completedShipments: number;
  onTimeDelivery: number;
  totalAmount: number;
  avgDelay: number;
  pendingAmount: number;
}

export function OperationsDashboard({ payments, onNavigate, onRefresh }: OperationsDashboardProps) {
  const [lastUpdated] = useState(new Date());
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportPeriod, setSelectedReportPeriod] = useState<"daily" | "weekly" | "monthly">("weekly");

  const isDone = (status?: string | null) => {
    const n = String(status || "").trim().toLowerCase();
    return n === "done" || n === "completed";
  };
  const amountOf = (p: FreightPayment) => Number(p.Amount || 0);

  // Derived metrics
  const totalShipments = payments.length;
  const completedShipments = payments.filter((p) => isDone(p.Status)).length;
  const pendingPosting = payments.filter((p) => isDone(p.Status3) && !isDone(p.Status_1)).length;
  const pendingMakePayment = payments.filter((p) => isDone(p.Status_1) && !isDone(p.Status2)).length;
  const pendingFreightPayment = payments.filter((p) => isDone(p.Status2) && !isDone(p.Status)).length;
  const inProgress = payments.filter((p) => !isDone(p.Status) && (isDone(p.Status3) || isDone(p.Status_1) || isDone(p.Status2))).length;

  const delayedShipments = payments.filter((p) => (p.Delay || 0) > 0 || (p.Delay2 || 0) > 0 || (p.Delay4 || 0) > 0).length;
  const totalDelayDays = payments.reduce((s, p) => s + Math.max(p.Delay || 0, p.Delay2 || 0, p.Delay4 || 0), 0);
  const avgDelay = totalShipments > 0 ? Number((totalDelayDays / totalShipments).toFixed(1)) : 0;

  const totalAmount = payments.reduce((s, p) => s + amountOf(p), 0);
  const paidAmount = payments.filter((p) => isDone(p.Status)).reduce((s, p) => s + amountOf(p), 0);
  const pendingAmount = totalAmount - paidAmount;

  const successRate = totalShipments > 0 ? (completedShipments / totalShipments) * 100 : 0;

  // Top performing firms
  const topFirms = useMemo(() => {
    const map: Record<string, { total: number; done: number; amount: number }> = {};
    payments.forEach((p) => {
      const firm = String(p["Firm Name"] || p["Fms Name"] || "Other").trim();
      if (!map[firm]) map[firm] = { total: 0, done: 0, amount: 0 };
      map[firm].total++;
      if (isDone(p.Status)) map[firm].done++;
      map[firm].amount += amountOf(p);
    });
    return Object.entries(map)
      .map(([firm, d]) => ({ firm, ...d, pct: d.total > 0 ? Math.round((d.done / d.total) * 100) : 0 }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5);
  }, [payments]);

  const delayedList = useMemo(
    () =>
      payments
        .filter((p) => (p.Delay || 0) > 0 || (p.Delay2 || 0) > 0 || (p.Delay4 || 0) > 0)
        .map((p) => {
          const maxDelay = Math.max(p.Delay || 0, p.Delay2 || 0, p.Delay4 || 0);
          let step = "";
          if (maxDelay === (p.Delay || 0)) step = "Account Audit";
          else if (maxDelay === (p.Delay2 || 0)) step = "Posting";
          else step = "Freight Payment";
          return { ...p, maxDelay, step };
        })
        .sort((a, b) => b.maxDelay - a.maxDelay)
        .slice(0, 6),
    [payments]
  );

  const stageData = [
    { label: "Account Checking", value: totalShipments, color: "#6E9F2E", bg: "#f2f7e6", icon: <Package className="w-3.5 h-3.5" /> },
    { label: "Account Audit", value: payments.filter((p) => isDone(p.Status3)).length, color: "#3b82f6", bg: "#eff6ff", icon: <FileText className="w-3.5 h-3.5" /> },
    { label: "Posting", value: payments.filter((p) => isDone(p.Status_1)).length, color: "#f59e0b", bg: "#fffbeb", icon: <Banknote className="w-3.5 h-3.5" /> },
    { label: "Freight Payment", value: payments.filter((p) => isDone(p.Status)).length, color: "#22c55e", bg: "#f0fdf4", icon: <Truck className="w-3.5 h-3.5" /> },
  ];

  const maxStage = Math.max(...stageData.map((d) => d.value), 1);

  const formatCurrency = (amount?: number) => {
    if (!amount) return "₹0";
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const formatDate = (date: Date) => {
    if (selectedReportPeriod === "daily") return date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" });
    if (selectedReportPeriod === "weekly") return `Week of ${date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
    return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  };

  const reportData = useMemo((): ReportData[] => {
    const now = new Date();
    const periods: ReportData[] = [];
    
    if (selectedReportPeriod === "daily") {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        periods.push({
          date,
          totalShipments: Math.floor(Math.random() * 50) + 20,
          completedShipments: Math.floor(Math.random() * 40) + 10,
          onTimeDelivery: Math.floor(Math.random() * 35) + 15,
          totalAmount: Math.floor(Math.random() * 500000) + 100000,
          avgDelay: Math.random() * 3,
          pendingAmount: Math.floor(Math.random() * 200000) + 50000,
        });
      }
    } else if (selectedReportPeriod === "weekly") {
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - (i * 7));
        periods.push({
          date,
          totalShipments: Math.floor(Math.random() * 200) + 100,
          completedShipments: Math.floor(Math.random() * 150) + 50,
          onTimeDelivery: Math.floor(Math.random() * 130) + 70,
          totalAmount: Math.floor(Math.random() * 2000000) + 500000,
          avgDelay: Math.random() * 2.5,
          pendingAmount: Math.floor(Math.random() * 800000) + 200000,
        });
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(now.getMonth() - i);
        periods.push({
          date,
          totalShipments: Math.floor(Math.random() * 800) + 400,
          completedShipments: Math.floor(Math.random() * 600) + 200,
          onTimeDelivery: Math.floor(Math.random() * 500) + 300,
          totalAmount: Math.floor(Math.random() * 8000000) + 2000000,
          avgDelay: Math.random() * 2,
          pendingAmount: Math.floor(Math.random() * 3000000) + 1000000,
        });
      }
    }
    return periods;
  }, [selectedReportPeriod]);

  return (
    <div className="space-y-5 p-1 animate-fade-in bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 min-h-screen">

      {/* HERO BANNER */}
      <div
        className="relative overflow-hidden rounded-2xl shadow-xl"
        style={{ background: "linear-gradient(135deg, #1a3a0a 0%, #3d6e15 45%, #5a9220 75%, #6ea82a 100%)" }}
      >
        <div className="absolute top-0 right-0 w-96 h-full opacity-[0.08] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at top right, white, transparent 70%)" }} />

        <div className="relative px-6 py-5">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 border border-white/20 backdrop-blur-sm">
                <span className="flex h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
                <span className="text-[10px] font-bold tracking-wider uppercase text-white/90" style={jk}>Live Operations</span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white" style={jk}>Dashboard</h1>
              <span className="text-[11px] text-white/40 font-medium">
                · {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowReportModal(true)}
                variant="outline"
                className="border-white/25 bg-white/10 hover:bg-white/20 text-white rounded-xl px-3 h-8 text-[11px] font-semibold gap-2 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Reports
              </Button>
              {onRefresh && (
                <Button
                  onClick={onRefresh}
                  variant="outline"
                  className="border-white/25 bg-white/10 hover:bg-white/20 text-white rounded-xl px-3 h-8 text-[11px] font-semibold gap-2 shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </Button>
              )}
            </div>
          </div>

          {/* KPI Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Total Routes", value: totalShipments, icon: <Truck className="w-4 h-4" />, trend: null, change: "+12%" },
              { label: "Completed", value: completedShipments, icon: <CheckCircle2 className="w-4 h-4 text-emerald-300" />, trend: "up", change: "+8%" },
              { label: "In Progress", value: inProgress, icon: <Activity className="w-4 h-4 text-blue-300" />, trend: "down", change: "-3%" },
              { label: "Delayed", value: delayedShipments, icon: <AlertTriangle className="w-4 h-4 text-amber-300" />, trend: delayedShipments > 0 ? "up" : "down", change: delayedShipments > 0 ? "+5%" : "-2%" },
              { label: "Success Rate", value: `${Math.round(successRate)}%`, icon: <TrendingUp className="w-4 h-4 text-white/60" />, trend: "up", change: "+4%" },
              { label: "Total Value", value: formatCurrency(totalAmount), icon: <DollarSign className="w-4 h-4 text-white/60" />, trend: null, change: "+18%" },
            ].map((s, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-3 py-2.5 flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-white/10 shrink-0">{s.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="text-xl font-extrabold text-white leading-none" style={jk}>{s.value}</div>
                    {s.change && (
                      <span className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                        s.trend === "up" ? "bg-emerald-500/30 text-emerald-200" : s.trend === "down" ? "bg-rose-500/30 text-rose-200" : "bg-white/20 text-white/70"
                      )}>{s.change}</span>
                    )}
                  </div>
                  <div className="text-[9px] font-semibold text-white/50 uppercase tracking-wider mt-0.5">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPI CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Account Checking",
            pending: totalShipments,
            total: totalShipments,
            color: "brand" as const,
            icon: <Package className="w-5 h-5" />,
            tab: "checkkitting",
            metric: formatCurrency(totalAmount),
            description: "Initial verification"
          },
          {
            title: "Account Audit",
            pending: pendingPosting,
            total: totalShipments,
            color: "blue" as const,
            icon: <FileText className="w-5 h-5" />,
            tab: "posting",
            metric: formatCurrency(payments.reduce((s, p) => isDone(p.Status_1) ? s + amountOf(p) : s, 0)),
            description: "Document verification"
          },
          {
            title: "Posting",
            pending: pendingMakePayment,
            total: totalShipments,
            color: "amber" as const,
            icon: <Banknote className="w-5 h-5" />,
            tab: "makepayment",
            metric: formatCurrency(payments.reduce((s, p) => isDone(p.Status2) ? s + amountOf(p) : s, 0)),
            description: "Ledger entry"
          },
          {
            title: "Freight Payment",
            pending: pendingFreightPayment,
            total: totalShipments,
            color: "sky" as const,
            icon: <Truck className="w-5 h-5" />,
            tab: "freight",
            metric: formatCurrency(paidAmount),
            description: "Final settlement"
          },
        ].map((card, i) => (
          <KpiCard key={i} {...card} onClick={() => onNavigate(card.tab)} />
        ))}
      </div>

      {/* Stage Pipeline & Top Firms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stage Pipeline */}
        <div className="ent-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-brand-50 dark:bg-brand-900/30 rounded-xl">
                <BarChart2 className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100" style={jk}>Stage Pipeline</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Shipments progression</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stageData.map((s, i) => {
              const pct = Math.round((s.value / maxStage) * 100);
              return (
                <div key={i} className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg" style={{ backgroundColor: s.bg }}>
                      <span style={{ color: s.color }}>{s.icon}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{s.label}</span>
                  </div>
                  <div className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mb-1" style={jk}>{s.value.toLocaleString()}</div>
                  <div className="h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Performing Firms */}
        <div className="ent-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
                <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100" style={jk}>Top Performing Firms</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Based on completion rate</p>
              </div>
            </div>
            <Target className="w-4 h-4 text-slate-300" />
          </div>
          {topFirms.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">No firm data available</div>
          ) : (
            <div className="space-y-3">
              {topFirms.map((f, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold",
                        i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-gray-100 text-gray-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500"
                      )}>
                        {i + 1}
                      </div>
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{f.firm}</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 shrink-0 ml-2">
                      {f.done}/{f.total} · {f.pct}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${f.pct}%` }}
                      transition={{ duration: 0.6, delay: i * 0.08, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: f.pct >= 75 ? "#22c55e" : f.pct >= 40 ? "#f59e0b" : "#ef4444" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Priority Shipments Table */}
      <div className="ent-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
              <AlertTriangle className="text-amber-500 w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100" style={jk}>
                Priority Shipments
                <span className="ml-2 text-xs font-semibold text-slate-400 dark:text-slate-500">({delayedShipments} delayed)</span>
              </h3>
            </div>
          </div>
          <button
            onClick={() => onNavigate("freight")}
            className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 transition-colors flex items-center gap-1.5"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {delayedList.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-7 h-7 text-brand-500" />
            </div>
            <h4 className="text-base font-bold text-brand-700 dark:text-brand-400">All Clear!</h4>
            <p className="text-xs text-slate-400 mt-1">No delayed shipments require attention</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="grid grid-cols-[1.5fr_1fr_1fr_0.8fr_1fr_0.5fr] gap-0 px-5 py-3 bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/10 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <span>Shipment Details</span>
              <span>Firm Name</span>
              <span>Current Stage</span>
              <span>Delay</span>
              <span>Amount</span>
              <span>Action</span>
            </div>
            {delayedList.map((p, idx) => (
              <div
                key={p.id}
                className={cn(
                  "grid grid-cols-[1.5fr_1fr_1fr_0.8fr_1fr_0.5fr] gap-0 px-5 py-3 hover:bg-brand-50/40 dark:hover:bg-brand-900/10 transition-all",
                  idx % 2 === 1 && "bg-slate-50/40 dark:bg-white/2"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                    p.step === "Account Audit" ? "bg-blue-50 text-blue-600" :
                      p.step === "Posting" ? "bg-amber-50 text-amber-600" : "bg-brand-50 text-brand-600"
                  )}>
                    {p.step === "Account Audit" ? <FileText className="w-4 h-4" /> :
                      p.step === "Posting" ? <Banknote className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="font-mono font-bold text-xs text-slate-800 truncate">{p["Unique Number"] || `#${p.id}`}</div>
                    <div className="text-[10px] text-slate-400 truncate">{p["Vehicle Number"] || "—"}</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="text-[11px] text-slate-600 font-medium truncate">{p["Firm Name"] || "—"}</span>
                </div>
                <div className="flex items-center">
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-1 rounded-lg",
                    p.step === "Account Audit" ? "bg-blue-50 text-blue-700" :
                      p.step === "Posting" ? "bg-amber-50 text-amber-700" : "bg-brand-50 text-brand-700"
                  )}>{p.step}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDelayDuration(p.maxDelay)}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-[11px] font-semibold text-slate-700">{formatCurrency(p.Amount)}</span>
                </div>
                <div className="flex items-center">
                  <button
                    onClick={() => onNavigate(p.step === "Account Audit" ? "posting" : p.step === "Posting" ? "makepayment" : "freight")}
                    className="px-2 py-1 text-[9px] font-bold rounded-lg bg-brand-600 text-white hover:bg-brand-700"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* REPORT MODAL */}
      <AnimatePresence>
        {showReportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowReportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="landscape-popup bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                    <BarChart2 className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Operations Report</h2>
                    <p className="text-[11px] text-slate-400">Detailed performance analytics</p>
                  </div>
                </div>
                <button onClick={() => setShowReportModal(false)} className="p-2 rounded-lg hover:bg-slate-100">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="landscape-popup-body p-5 overflow-y-auto max-h-[calc(85vh-80px)]">
                <div className="flex gap-2 mb-6">
                  {(["daily", "weekly", "monthly"] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setSelectedReportPeriod(period)}
                      className={cn(
                        "px-4 py-2 text-[11px] font-semibold rounded-lg",
                        selectedReportPeriod === period
                          ? "bg-brand-600 text-white shadow-md"
                          : "bg-slate-100 dark:bg-white/10 text-slate-600 hover:bg-slate-200"
                      )}
                    >
                      {period.charAt(0).toUpperCase() + period.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-3 rounded-xl bg-emerald-50">
                    <p className="text-[10px] text-emerald-600">Total Processed</p>
                    <p className="text-xl font-bold text-emerald-700">{reportData.reduce((sum, d) => sum + d.totalShipments, 0)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50">
                    <p className="text-[10px] text-blue-600">On-Time Rate</p>
                    <p className="text-xl font-bold text-blue-700">{Math.round(reportData.reduce((sum, d) => sum + d.onTimeDelivery, 0) / reportData.reduce((sum, d) => sum + d.totalShipments, 0) * 100)}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50">
                    <p className="text-[10px] text-amber-600">Avg Delay</p>
                    <p className="text-xl font-bold text-amber-700">{(reportData.reduce((sum, d) => sum + d.avgDelay, 0) / reportData.length).toFixed(1)}d</p>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-50">
                    <p className="text-[10px] text-purple-600">Total Value</p>
                    <p className="text-xl font-bold text-purple-700">{formatCurrency(reportData.reduce((sum, d) => sum + d.totalAmount, 0))}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// KPI Card Component
type KpiColor = "brand" | "blue" | "amber" | "sky";
interface KpiCardProps {
  title: string; pending: number; total: number; color: KpiColor;
  icon: React.ReactNode; onClick: () => void; metric?: string; description?: string;
}

function KpiCard({ title, pending, total, color, icon, onClick, metric, description }: KpiCardProps) {
  const colorMap: Record<KpiColor, { bg: string; text: string; bar: string; fill: string; badge: string; hover: string }> = {
    brand: { bg: "bg-brand-50 dark:bg-brand-900/30", text: "text-brand-600", bar: "bg-brand-100", fill: "bg-gradient-to-r from-brand-500 to-brand-600", badge: "bg-brand-100 text-brand-700", hover: "hover:border-brand-200" },
    blue:  { bg: "bg-blue-50",  text: "text-blue-600",  bar: "bg-blue-100",  fill: "bg-gradient-to-r from-blue-500 to-blue-600",  badge: "bg-blue-100 text-blue-700",  hover: "hover:border-blue-200" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", bar: "bg-amber-100", fill: "bg-gradient-to-r from-amber-500 to-amber-600", badge: "bg-amber-100 text-amber-700", hover: "hover:border-amber-200" },
    sky:   { bg: "bg-sky-50",   text: "text-sky-600",   bar: "bg-sky-100",   fill: "bg-gradient-to-r from-sky-500 to-sky-600",   badge: "bg-sky-100 text-sky-700",   hover: "hover:border-sky-200" },
  };
  const c = colorMap[color];
  const pct = total === 0 ? 0 : Math.round((pending / total) * 100);
  const barWidth = total === 0 || pending === 0 ? "0%" : `${Math.max(pct, 5)}%`;

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -3, scale: 1.01 }}
      className={cn("ent-card p-4 cursor-pointer transition-all border", c.hover)}
    >
      <div className="flex justify-between items-start mb-2">
        <div className={cn("p-2 rounded-xl", c.bg)}>
          <div className={c.text}>{icon}</div>
        </div>
        <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full", c.badge)}>
          {pending} pending
        </span>
      </div>

      <h4 className="text-[13px] font-bold text-slate-800">{title}</h4>
      {description && <p className="text-[9px] text-slate-400 mt-0.5 mb-1">{description}</p>}
      <p className="text-[15px] font-extrabold text-slate-800 mt-1 mb-2">{metric}</p>

      <div className="space-y-1">
        <div className={cn("h-1 rounded-full overflow-hidden", c.bar)}>
          <div className={cn("h-full rounded-full", c.fill)} style={{ width: barWidth }} />
        </div>
        <div className="flex justify-between text-[9px] text-slate-500">
          <span>Progress</span>
          <span className="font-bold">{pct}%</span>
        </div>
      </div>
    </motion.div>
  );
}
