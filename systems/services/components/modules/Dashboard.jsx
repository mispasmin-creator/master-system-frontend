import React, { useEffect, useState } from 'react';
import { servicesApi } from '../../lib/api';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [firmFilter, setFirmFilter] = useState('All');

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await servicesApi.get('/reports/dashboard', { firm: firmFilter });
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [firmFilter]);

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="inline-block w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-2 text-xs text-zinc-500">Loading Dashboard stats…</p>
      </div>
    );
  }

  const formatCurrency = (amt) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt || 0);

  const statusCounts = data?.statusCounts || {};

  return (
    <div className="space-y-6">
      {/* Top Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Services Overview</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">KPIs and workflow stage distribution for Service Jobs & Utilities</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-zinc-500">Firm Scope:</label>
          <select
            value={firmFilter}
            onChange={(e) => setFirmFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none"
          >
            <option value="All">All Firms</option>
            <option value="PMMPL">PMMPL</option>
            <option value="PMM Logisol">PMM Logisol</option>
            <option value="PMM Retail">PMM Retail</option>
            <option value="PMM Infra">PMM Infra</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Total Service Jobs</p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-zinc-900 dark:text-white">{data?.totalJobs || 0}</span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{data?.completedJobsCount || 0} Completed</span>
          </div>
          <p className="text-xs text-zinc-500">Total Volume: <span className="font-semibold text-zinc-900 dark:text-zinc-200">{formatCurrency(data?.totalJobAmount)}</span></p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Active Offers</p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-zinc-900 dark:text-white">{data?.totalOffers || 0}</span>
          </div>
          <p className="text-xs text-zinc-500">Offer Volume: <span className="font-semibold text-zinc-900 dark:text-zinc-200">{formatCurrency(data?.totalOfferAmount)}</span></p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Utility Payments</p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-zinc-900 dark:text-white">{data?.totalUtilities || 0}</span>
          </div>
          <p className="text-xs text-zinc-500">Utility Volume: <span className="font-semibold text-zinc-900 dark:text-zinc-200">{formatCurrency(data?.totalUtilityAmount)}</span></p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Pending Service Work</p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{data?.pendingJobsCount || 0}</span>
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">In Progress</span>
          </div>
          <p className="text-xs text-zinc-500">Requires Stage Advancement</p>
        </div>
      </div>

      {/* Workflow Stage Breakdown */}
      <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 space-y-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Service Pipeline Distribution</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: 'Service Created', key: 'Service Created', color: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200' },
            { label: 'Work Started', key: 'Work Started', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
            { label: 'Work Completed', key: 'Work Completed', color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
            { label: 'Bill Received', key: 'Bill Received', color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
            { label: 'Payment Pending', key: 'Payment Pending', color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
            { label: 'Tally Pending', key: 'Tally Pending', color: 'bg-orange-50 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
            { label: 'Completed', key: 'Completed', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' }
          ].map((st) => (
            <div key={st.key} className={`p-3 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50 flex flex-col justify-between ${st.color}`}>
              <span className="text-[11px] font-semibold truncate">{st.label}</span>
              <span className="text-xl font-bold mt-1">{statusCounts[st.key] || 0}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
