import React, { useEffect, useState } from 'react';
import { repairApi } from '../../lib/api';

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [masterData, setMasterData] = useState({ vendors: [], transporters: [], departments: [], machines: [] });
  const [loading, setLoading] = useState(true);
  const [firmFilter, setFirmFilter] = useState('All');

  // Master add form
  const [masterType, setMasterType] = useState('vendorName');
  const [masterInput, setMasterInput] = useState('');
  const [submittingMaster, setSubmittingMaster] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [taskRes, masterRes] = await Promise.all([
        repairApi.get('/tasks', { firm: firmFilter }),
        repairApi.get('/master')
      ]);

      if (taskRes.success) {
        setTasks(taskRes.data || []);
      }
      if (masterRes.success && masterRes.data) {
        setMasterData(masterRes.data);
      }
    } catch (err) {
      console.error('Failed to load Repair Dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [firmFilter]);

  const handleAddMaster = async (e) => {
    e.preventDefault();
    if (!masterInput.trim()) return;

    setSubmittingMaster(true);
    try {
      const payload = { [masterType]: masterInput.trim(), firmName: firmFilter !== 'All' ? firmFilter : 'Pmmpl' };
      const res = await repairApi.post('/master', payload);
      if (res.success) {
        setMasterInput('');
        const updated = await repairApi.get('/master');
        if (updated.success && updated.data) {
          setMasterData(updated.data);
        }
      }
    } catch (err) {
      console.error('Failed to add master item:', err);
    } finally {
      setSubmittingMaster(false);
    }
  };

  // Metrics calculations
  const totalTasks = tasks.length;
  const pendingTasks = tasks.filter((t) => (t.status || '').toLowerCase() === 'pending');
  const completedTasks = tasks.filter((t) => (t.status || '').toLowerCase() === 'complete');
  const sentToVendorCount = tasks.filter((t) => t.actual && !t.actual1).length;
  const checkMachineCount = tasks.filter((t) => t.actual1 && !t.actual2).length;
  const storeInCount = tasks.filter((t) => t.actual2 && !t.actual4).length;

  const totalBillAmount = tasks.reduce((sum, t) => sum + (parseFloat(t.totalBillAmount) || 0), 0);

  const formatCurrency = (amt) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt || 0);

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="inline-block w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-2 text-xs text-zinc-500">Loading Repair System Dashboard…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Scope Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Repair System Overview</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Machine Repair Pipeline Metrics & Master Dropdown Administration</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Firm Scope:</label>
          <select
            value={firmFilter}
            onChange={(e) => setFirmFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none"
          >
            <option value="All">All Firms</option>
            <option value="Pmmpl">PMMPL</option>
            <option value="Purab">Purab</option>
            <option value="Rkl">RKL</option>
            <option value="Refrasynth">Refrasynth</option>
            <option value="Refratech">Refratech</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Total Repair Tasks</p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-zinc-900 dark:text-white">{totalTasks}</span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{completedTasks.length} Completed</span>
          </div>
          <p className="text-xs text-zinc-500">Active Indents: <span className="font-semibold text-zinc-900 dark:text-zinc-200">{pendingTasks.length}</span></p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Vendor Repair Stage</p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{sentToVendorCount}</span>
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Sent to Vendor</span>
          </div>
          <p className="text-xs text-zinc-500">Awaiting return & inspection</p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Inspection & Store In</p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{checkMachineCount + storeInCount}</span>
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">In Quality & Store</span>
          </div>
          <p className="text-xs text-zinc-500">Check: {checkMachineCount} | Store In: {storeInCount}</p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Total Repair Bill Volume</p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalBillAmount)}</span>
          </div>
          <p className="text-xs text-zinc-500">Billed repair & transportation costs</p>
        </div>
      </div>

      {/* Master Lists Administration */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Add to Master Dropdown Lists</h3>
            <p className="text-xs text-zinc-500">Manage dropdown options for Vendors, Transporters, Departments, and Machines</p>
          </div>
        </div>

        <form onSubmit={handleAddMaster} className="flex flex-col sm:flex-row items-center gap-3">
          <select
            value={masterType}
            onChange={(e) => setMasterType(e.target.value)}
            className="h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium text-zinc-900 dark:text-white"
          >
            <option value="vendorName">Vendor Name</option>
            <option value="transporterName">Transporter Name</option>
            <option value="department">Department</option>
            <option value="machineName">Machine Name</option>
          </select>
          <input
            type="text"
            placeholder="Enter new master option value…"
            value={masterInput}
            onChange={(e) => setMasterInput(e.target.value)}
            className="flex-1 h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={submittingMaster}
            className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {submittingMaster ? 'Adding…' : 'Add Master Option'}
          </button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2">Vendors ({masterData.vendors?.length || 0})</h4>
            <div className="space-y-1 max-h-36 overflow-y-auto scrollbar-none text-xs text-zinc-600 dark:text-zinc-400">
              {masterData.vendors?.map((v, idx) => (
                <div key={idx} className="py-0.5 border-b border-zinc-100 dark:border-zinc-800/50 truncate">{v}</div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2">Transporters ({masterData.transporters?.length || 0})</h4>
            <div className="space-y-1 max-h-36 overflow-y-auto scrollbar-none text-xs text-zinc-600 dark:text-zinc-400">
              {masterData.transporters?.map((t, idx) => (
                <div key={idx} className="py-0.5 border-b border-zinc-100 dark:border-zinc-800/50 truncate">{t}</div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2">Departments ({masterData.departments?.length || 0})</h4>
            <div className="space-y-1 max-h-36 overflow-y-auto scrollbar-none text-xs text-zinc-600 dark:text-zinc-400">
              {masterData.departments?.map((d, idx) => (
                <div key={idx} className="py-0.5 border-b border-zinc-100 dark:border-zinc-800/50 truncate">{d}</div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2">Machines ({masterData.machines?.length || 0})</h4>
            <div className="space-y-1 max-h-36 overflow-y-auto scrollbar-none text-xs text-zinc-600 dark:text-zinc-400">
              {masterData.machines?.map((m, idx) => (
                <div key={idx} className="py-0.5 border-b border-zinc-100 dark:border-zinc-800/50 truncate">{m}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
