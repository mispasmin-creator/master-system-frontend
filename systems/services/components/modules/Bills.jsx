import React, { useEffect, useState } from 'react';
import { servicesApi } from '../../lib/api';

export default function Bills() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // active | history
  const [search, setSearch] = useState('');
  const [firmFilter, setFirmFilter] = useState('All');

  // Modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [saving, setSaving] = useState(false);

  const [billForm, setBillForm] = useState({
    billNo: '',
    billCopy: '',
    planned2: '',
    actual2: ''
  });

  const fetchBills = async () => {
    setLoading(true);
    try {
      const res = await servicesApi.get('/bills', { tab: activeTab, firm: firmFilter, search });
      if (res.success) {
        setBills(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch bills:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [activeTab, firmFilter, search]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await servicesApi.upload(file);
      setBillForm((prev) => ({ ...prev, billCopy: url }));
    } catch (err) {
      alert(`Bill upload failed: ${err.message}`);
    }
  };

  const handleEditOpen = (job) => {
    setSelectedJob(job);
    setBillForm({
      billNo: job.billNo || '',
      billCopy: job.billCopy || '',
      planned2: job.planned2 ? new Date(job.planned2).toISOString().split('T')[0] : '',
      actual2: job.actual2 ? new Date(job.actual2).toISOString().split('T')[0] : ''
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedJob) return;
    setSaving(true);
    try {
      const res = await servicesApi.put(`/jobs/${selectedJob.id}`, billForm);
      if (res.success) {
        setIsEditOpen(false);
        setSelectedJob(null);
        fetchBills();
      }
    } catch (err) {
      alert(`Error updating bill details: ${err.message}`);
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
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Service Bills</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Manage received service bills, attachments, and bill receipt stage dates</p>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'active'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Active Bills
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Completed Bills History
          </button>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search bill no, vendor, service no..."
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
              <th className="p-3">Bill Attachment</th>
              <th className="p-3">Stage 2 (P / A / Delay)</th>
              <th className="p-3">Status</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-200">
            {loading ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-zinc-500">Loading bills...</td>
              </tr>
            ) : bills.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-zinc-500">No service bills found.</td>
              </tr>
            ) : (
              bills.map((b) => (
                <tr key={b.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="p-3 font-semibold text-zinc-900 dark:text-white">{b.serviceNo}</td>
                  <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">{b.billNo || '-'}</td>
                  <td className="p-3">{b.firmName}</td>
                  <td className="p-3 font-medium">{b.vendor}</td>
                  <td className="p-3 font-semibold">{formatCurrency(b.amount)}</td>
                  <td className="p-3">
                    {b.billCopy ? (
                      <a href={b.billCopy} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline font-medium">View Bill</a>
                    ) : (
                      <span className="text-zinc-400">None</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="text-[11px] text-zinc-500">
                      P: {formatDate(b.planned2)} | A: {formatDate(b.actual2)}
                      {b.delay2 > 0 && <span className="ml-1 px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-bold">{b.delay2}d delay</span>}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                      {b.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => handleEditOpen(b)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold transition-colors"
                    >
                      Update Bill
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Bill Modal */}
      {isEditOpen && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Update Bill Details - {selectedJob.serviceNo}</h3>
            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Bill Number</label>
                <input
                  type="text"
                  required
                  value={billForm.billNo}
                  onChange={(e) => setBillForm({ ...billForm, billNo: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Bill Attachment (Copy)</label>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-zinc-500"
                />
                {billForm.billCopy && <p className="text-[11px] text-emerald-600 mt-1 truncate">Uploaded: {billForm.billCopy}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Planned Date 2 (Bill Receive)</label>
                  <input
                    type="date"
                    value={billForm.planned2}
                    onChange={(e) => setBillForm({ ...billForm, planned2: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Actual Date 2 (Bill Received)</label>
                  <input
                    type="date"
                    value={billForm.actual2}
                    onChange={(e) => setBillForm({ ...billForm, actual2: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="h-9 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {saving ? 'Saving...' : 'Save Bill Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
