import React, { useEffect, useState } from 'react';
import { servicesApi } from '../../lib/api';

export default function Tally() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('audit'); // audit | rectify | tally | completed
  const [search, setSearch] = useState('');
  const [firmFilter, setFirmFilter] = useState('All');

  // Advance Modal State
  const [isAdvanceOpen, setIsAdvanceOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [saving, setSaving] = useState(false);

  const [advanceForm, setAdvanceForm] = useState({
    planned4: '',
    actual4: '',
    status4: 'Completed',
    remarks4: '',
    planned5: '',
    actual5: '',
    status5: '',
    remarks5: '',
    paymentForm: ''
  });

  const fetchTallyJobs = async () => {
    setLoading(true);
    try {
      const res = await servicesApi.get('/tally', { tab: activeTab, firm: firmFilter, search });
      if (res.success) {
        setJobs(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch tally jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTallyJobs();
  }, [activeTab, firmFilter, search]);

  const handleAdvanceOpen = (job) => {
    setSelectedJob(job);
    setAdvanceForm({
      planned4: job.planned4 ? new Date(job.planned4).toISOString().split('T')[0] : '',
      actual4: job.actual4 ? new Date(job.actual4).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status4: job.status4 || 'Completed',
      remarks4: job.remarks4 || '',
      planned5: job.planned5 ? new Date(job.planned5).toISOString().split('T')[0] : '',
      actual5: job.actual5 ? new Date(job.actual5).toISOString().split('T')[0] : '',
      status5: job.status5 || '',
      remarks5: job.remarks5 || '',
      paymentForm: job.paymentForm || ''
    });
    setIsAdvanceOpen(true);
  };

  const handleAdvanceSubmit = async (e) => {
    e.preventDefault();
    if (!selectedJob) return;
    setSaving(true);
    try {
      const res = await servicesApi.post(`/tally/${selectedJob.id}/advance`, advanceForm);
      if (res.success) {
        setIsAdvanceOpen(false);
        setSelectedJob(null);
        fetchTallyJobs();
      }
    } catch (err) {
      alert(`Error advancing stage: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amt) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amt || 0);

  const formatDate = (dt) => (dt ? new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Tally Entry & Audit</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Audit service bills, handle rectifications, and execute Tally posting entries</p>
        </div>
      </div>

      {/* 4 Sub-Tabs & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl w-fit">
          {[
            { id: 'audit', label: 'Audit Stage' },
            { id: 'rectify', label: 'Rectify Stage' },
            { id: 'tally', label: 'Tally Entry' },
            { id: 'completed', label: 'Completed' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search service no, bill no, vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 px-3 w-48 sm:w-64 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none"
          />
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

      {/* Table */}
      <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 font-semibold border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="p-3">Service No</th>
              <th className="p-3">Bill No</th>
              <th className="p-3">Firm</th>
              <th className="p-3">Vendor</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Audit (Stage 4)</th>
              <th className="p-3">Tally (Stage 5)</th>
              <th className="p-3">Derived Status</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-200">
            {loading ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-zinc-500">Loading stage data...</td>
              </tr>
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-zinc-500">No jobs in this stage.</td>
              </tr>
            ) : (
              jobs.map((j) => (
                <tr key={j.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="p-3 font-semibold text-zinc-900 dark:text-white">{j.serviceNo}</td>
                  <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">{j.billNo || '-'}</td>
                  <td className="p-3">{j.firmName}</td>
                  <td className="p-3 font-medium">{j.vendor}</td>
                  <td className="p-3 font-semibold">{formatCurrency(j.amount)}</td>
                  <td className="p-3">
                    <span className="text-[11px] text-zinc-500">
                      St: <span className="font-bold text-zinc-800 dark:text-zinc-200">{j.status4 || 'Pending'}</span> | A: {formatDate(j.actual4)}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="text-[11px] text-zinc-500">
                      St: <span className="font-bold text-zinc-800 dark:text-zinc-200">{j.status5 || 'Pending'}</span> | A: {formatDate(j.actual5)}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      {j.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => handleAdvanceOpen(j)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors"
                    >
                      Advance Stage
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Advance Stage Modal */}
      {isAdvanceOpen && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Advance Audit / Tally - {selectedJob.serviceNo}</h3>
            <form onSubmit={handleAdvanceSubmit} className="space-y-4 text-xs">
              {/* Stage 4 Block */}
              <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-2">
                <p className="font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider text-[11px]">Stage 4 — Audit & Rectification</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Audit Status</label>
                    <select
                      value={advanceForm.status4}
                      onChange={(e) => setAdvanceForm({ ...advanceForm, status4: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    >
                      <option value="Completed">Completed (Approved)</option>
                      <option value="Rectify">Rectify Needed</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Actual Audit Date</label>
                    <input
                      type="date"
                      value={advanceForm.actual4}
                      onChange={(e) => setAdvanceForm({ ...advanceForm, actual4: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Audit Remarks</label>
                  <input
                    type="text"
                    value={advanceForm.remarks4}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, remarks4: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Stage 5 Block */}
              <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-2">
                <p className="font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider text-[11px]">Stage 5 — Tally Posting Entry</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Tally Entry Status</label>
                    <select
                      value={advanceForm.status5}
                      onChange={(e) => setAdvanceForm({ ...advanceForm, status5: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    >
                      <option value="">Pending Tally</option>
                      <option value="Completed">Completed (Tally Posted)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Tally Entry Date</label>
                    <input
                      type="date"
                      value={advanceForm.actual5}
                      onChange={(e) => setAdvanceForm({ ...advanceForm, actual5: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Tally Remarks / Voucher Reference</label>
                  <input
                    type="text"
                    value={advanceForm.remarks5}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, remarks5: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdvanceOpen(false)}
                  className="h-9 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {saving ? 'Updating...' : 'Save Stage Progress'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
