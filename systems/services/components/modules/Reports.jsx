import React, { useEffect, useState } from 'react';
import { servicesApi } from '../../lib/api';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | pending
  const [dashboardData, setDashboardData] = useState(null);
  const [pendingData, setPendingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [firmFilter, setFirmFilter] = useState('All');

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const res = await servicesApi.get('/reports/dashboard', { firm: firmFilter });
        if (res.success) setDashboardData(res.data);
      } else {
        const res = await servicesApi.get('/reports/pending', { firm: firmFilter });
        if (res.success) setPendingData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, firmFilter]);

  const formatCurrency = (amt) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amt || 0);

  const formatDate = (dt) => (dt ? new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Services Reports & Analytics</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Analyze service execution bottlenecks, pending work, and financial totals</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              Dashboard Summary
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'pending'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              Pending Work Summary
            </button>
          </div>

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

      {loading ? (
        <div className="py-12 text-center">
          <div className="inline-block w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-2 text-xs text-zinc-500">Loading report data...</p>
        </div>
      ) : activeTab === 'dashboard' ? (
        /* Dashboard Summary View */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Service Jobs Volume</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{formatCurrency(dashboardData?.totalJobAmount)}</p>
              <p className="text-xs text-zinc-500 mt-1">{dashboardData?.totalJobs || 0} Total Jobs ({dashboardData?.pendingJobsCount || 0} Pending)</p>
            </div>
            <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Offer Quotations Volume</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{formatCurrency(dashboardData?.totalOfferAmount)}</p>
              <p className="text-xs text-zinc-500 mt-1">{dashboardData?.totalOffers || 0} Active Offers</p>
            </div>
            <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Utility Payments Volume</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{formatCurrency(dashboardData?.totalUtilityAmount)}</p>
              <p className="text-xs text-zinc-500 mt-1">{dashboardData?.totalUtilities || 0} Total Utility Records</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Workflow Status Breakdown</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(dashboardData?.statusCounts || {}).map(([st, cnt]) => (
                <div key={st} className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                  <p className="text-xs text-zinc-500 font-medium">{st}</p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-white mt-1">{cnt}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Pending Work View */
        <div className="space-y-6">
          {/* Pending Jobs Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Pending Service Jobs ({pendingData?.pendingJobs?.length || 0})</h3>
            <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="p-3">Service No</th>
                    <th className="p-3">Firm</th>
                    <th className="p-3">Vendor</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Bill No</th>
                    <th className="p-3">Stage / Status</th>
                    <th className="p-3">Work Start Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-200">
                  {pendingData?.pendingJobs?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-zinc-500">No pending jobs found.</td>
                    </tr>
                  ) : (
                    pendingData?.pendingJobs?.map((j) => (
                      <tr key={j.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                        <td className="p-3 font-semibold text-zinc-900 dark:text-white">{j.serviceNo}</td>
                        <td className="p-3">{j.firmName}</td>
                        <td className="p-3 font-medium">{j.vendor}</td>
                        <td className="p-3 font-semibold">{formatCurrency(j.amount)}</td>
                        <td className="p-3">{j.billNo || '-'}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            {j.status}
                          </span>
                        </td>
                        <td className="p-3">{formatDate(j.actual1 || j.planned1)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending Utilities Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Pending Utility Payments ({pendingData?.pendingUtilities?.length || 0})</h3>
            <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="p-3">Utility No</th>
                    <th className="p-3">Firm</th>
                    <th className="p-3">Pay To</th>
                    <th className="p-3">Bill Amount</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-200">
                  {pendingData?.pendingUtilities?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-zinc-500">No pending utilities found.</td>
                    </tr>
                  ) : (
                    pendingData?.pendingUtilities?.map((u) => (
                      <tr key={u.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                        <td className="p-3 font-semibold text-zinc-900 dark:text-white">{u.utilityNo}</td>
                        <td className="p-3">{u.firmName}</td>
                        <td className="p-3 font-medium">{u.payTo}</td>
                        <td className="p-3 font-semibold">{formatCurrency(u.amount)}</td>
                        <td className="p-3">{formatDate(u.dueDate)}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {u.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
