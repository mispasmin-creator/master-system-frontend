import React, { useState, useEffect, useMemo } from 'react';
import { paymentApi } from '../../lib/api';
import { 
  TrendingUp, Coins, FileText, CheckCircle2, Clock, XCircle, 
  ArrowUpRight, Activity, Calendar, Sparkles, ChevronRight,
  Landmark, ShieldAlert, CreditCard
} from 'lucide-react';

const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return "₹0";
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

const STATUS_CONFIGS = {
  'Draft': { label: 'Draft Requests', color: 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800', progressColor: 'bg-zinc-400' },
  'Submitted': { label: 'Submitted / Maker Review', color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40', progressColor: 'bg-blue-500' },
  'Approved for Funding': { label: 'Approved for Funding', color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40', progressColor: 'bg-indigo-500' },
  'Channel Funded': { label: 'Channel Funded', color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40', progressColor: 'bg-amber-500' },
  'Approved': { label: 'Approved & Ready to Post', color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40', progressColor: 'bg-purple-500' },
  'Posted': { label: 'Posted & Ready to Disburse', color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40', progressColor: 'bg-sky-500' },
  'Payment Completed': { label: 'Payment Completed', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40', progressColor: 'bg-emerald-500' },
  'Rejected': { label: 'Requests Rejected', color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40', progressColor: 'bg-rose-500' }
};

export default function Dashboard() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await paymentApi.get('requests');
      if (res.success && res.data) {
        setPayments(res.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const metrics = useMemo(() => {
    let totalCount = 0;
    let totalAmt = 0;
    let pendingCount = 0;
    let pendingAmt = 0;
    let completedCount = 0;
    let completedAmt = 0;
    let rejectedCount = 0;
    let rejectedAmt = 0;

    payments.forEach(p => {
      const amt = Number(p.amount) || 0;
      totalCount++;
      totalAmt += amt;

      if (p.status === 'Payment Completed') {
        completedCount++;
        completedAmt += amt;
      } else if (p.status === 'Rejected') {
        rejectedCount++;
        rejectedAmt += amt;
      } else {
        pendingCount++;
        pendingAmt += amt;
      }
    });

    return {
      totalCount,
      totalAmt,
      pendingCount,
      pendingAmt,
      completedCount,
      completedAmt,
      rejectedCount,
      rejectedAmt
    };
  }, [payments]);

  const statusStats = useMemo(() => {
    const stats = {};
    Object.keys(STATUS_CONFIGS).forEach(key => {
      stats[key] = { count: 0, amount: 0 };
    });

    let maxAmount = 1;
    payments.forEach(p => {
      const st = p.status || 'Submitted';
      const amt = Number(p.amount) || 0;
      if (!stats[st]) stats[st] = { count: 0, amount: 0 };
      stats[st].count++;
      stats[st].amount += amt;
    });

    Object.values(stats).forEach(val => {
      if (val.amount > maxAmount) maxAmount = val.amount;
    });

    return { stats, maxAmount };
  }, [payments]);

  const fmsSummary = useMemo(() => {
    const map = {};
    payments.forEach(p => {
      const name = p.fmsName || 'General';
      const amt = Number(p.amount) || 0;
      map[name] = (map[name] || 0) + amt;
    });
    return Object.entries(map)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [payments]);

  const todayDate = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 rounded-full border-4 border-zinc-200 border-t-emerald-600 animate-spin"></div>
        <span className="text-xs font-semibold text-zinc-400">Loading ledger metrics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs">
      
      {/* Banner */}
      <div className="bg-zinc-900 text-white rounded-2xl p-6 shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-6 border border-zinc-800">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/20 via-indigo-900/10 to-zinc-900 pointer-events-none" />
        
        <div className="relative z-10 space-y-1 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/10 border border-emerald-500/30 rounded-md p-1">
              <Sparkles className="h-4 w-4 text-emerald-400" />
            </span>
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">PMMPL Make Payment System</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
            Payment Analytics & Workflow Overview
          </h1>
          <p className="text-xs text-zinc-400 leading-relaxed">
            There are currently <strong className="text-white font-bold">{metrics.pendingCount}</strong> payment requests awaiting verification in the workflow pipeline.
          </p>
        </div>

        <div className="relative z-10 flex flex-col items-start md:items-end gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 rounded-full border border-emerald-500/25 text-emerald-300 font-bold uppercase tracking-wider text-[10px]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync Active
          </div>
          <div className="flex items-center gap-2 text-zinc-400 text-xs">
            <Calendar className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-medium text-[11px]">{todayDate}</span>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Volume */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
          <div className="flex justify-between items-start pl-2">
            <span className="font-bold text-[10px] uppercase text-zinc-400 tracking-wider">Total Ledger Volume</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-xl">
              <Coins className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-4 pl-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-zinc-50">{formatCurrency(metrics.totalAmt)}</h2>
            <p className="text-[10px] text-zinc-400 mt-1 font-semibold flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3 text-blue-500" />
              <span>{metrics.totalCount} total requests</span>
            </p>
          </div>
        </div>

        {/* Card 2: Pending processing */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
          <div className="flex justify-between items-start pl-2">
            <span className="font-bold text-[10px] uppercase text-zinc-400 tracking-wider">Awaiting Processing</span>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-xl">
              <Clock className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-4 pl-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-zinc-50">{formatCurrency(metrics.pendingAmt)}</h2>
            <p className="text-[10px] text-zinc-400 mt-1 font-semibold flex items-center gap-1">
              <Activity className="h-3 w-3 text-amber-500" />
              <span>{metrics.pendingCount} indents in progress</span>
            </p>
          </div>
        </div>

        {/* Card 3: Disbursed Volume */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
          <div className="flex justify-between items-start pl-2">
            <span className="font-bold text-[10px] uppercase text-zinc-400 tracking-wider">Disbursed Volume</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-4 pl-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-zinc-50">{formatCurrency(metrics.completedAmt)}</h2>
            <p className="text-[10px] text-zinc-400 mt-1 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <span>{metrics.completedCount} payments completed</span>
            </p>
          </div>
        </div>

        {/* Card 4: Rejected */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500" />
          <div className="flex justify-between items-start pl-2">
            <span className="font-bold text-[10px] uppercase text-zinc-400 tracking-wider">Declined Volume</span>
            <div className="p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-xl">
              <XCircle className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-4 pl-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-zinc-50">{formatCurrency(metrics.rejectedAmt)}</h2>
            <p className="text-[10px] text-zinc-400 mt-1 font-semibold flex items-center gap-1">
              <ShieldAlert className="h-3 w-3 text-rose-500" />
              <span>{metrics.rejectedCount} items declined</span>
            </p>
          </div>
        </div>
      </div>

      {/* Workflow Stage Breakdown & Category Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Stage breakdown */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-500" />
            Workflow Pipeline Stage Distribution
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(STATUS_CONFIGS).map(([stKey, cfg]) => {
              const stat = statusStats.stats[stKey] || { count: 0, amount: 0 };
              const percent = Math.min(100, Math.round((stat.amount / (statusStats.maxAmount || 1)) * 100));

              return (
                <div key={stKey} className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800/80 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${cfg.color}`}>{cfg.label}</span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{stat.count} items</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(stat.amount)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full ${cfg.progressColor}`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FMS Category Summary */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Landmark className="h-4 w-4 text-blue-500" />
            Top FMS Payment Categories
          </h3>

          <div className="space-y-3">
            {fmsSummary.length === 0 ? (
              <p className="text-zinc-400 italic text-center py-6">No payment categories logged.</p>
            ) : (
              fmsSummary.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-2.5 border-b border-zinc-100 dark:border-zinc-800/60 last:border-0">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300 text-xs truncate max-w-[160px]">{item.name}</span>
                  <span className="font-bold font-mono text-zinc-900 dark:text-zinc-100 text-xs">{formatCurrency(item.amount)}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
