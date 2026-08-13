import React, { useEffect, useState } from 'react';
import { servicesApi } from '../../lib/api';

export default function Services() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // active | completed
  const [search, setSearch] = useState('');
  const [firmFilter, setFirmFilter] = useState('All');
  const [stageFilter, setStageFilter] = useState('All');

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [jobForm, setJobForm] = useState({
    firmName: 'PMMPL',
    vendor: '',
    description: '',
    location: '',
    amount: '',
    tdsAmount: '0',
    checker: '',
    remark: '',
    planned1: '',
    actual1: ''
  });

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await servicesApi.get('/jobs', { firm: firmFilter, stage: stageFilter, search });
      if (res.success) {
        setJobs(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [firmFilter, stageFilter, search]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!jobForm.vendor || !jobForm.amount) {
      alert('Please fill in Vendor and Amount.');
      return;
    }
    setSaving(true);
    try {
      const res = await servicesApi.post('/jobs', jobForm);
      if (res.success) {
        setIsCreateOpen(false);
        setJobForm({ firmName: 'PMMPL', vendor: '', description: '', location: '', amount: '', tdsAmount: '0', checker: '', remark: '', planned1: '', actual1: '' });
        fetchJobs();
      }
    } catch (err) {
      alert(`Error creating service job: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEditOpen = (job) => {
    setSelectedJob(job);
    setJobForm({
      firmName: job.firmName || 'PMMPL',
      vendor: job.vendor || '',
      description: job.description || '',
      location: job.location || '',
      amount: job.amount || 0,
      tdsAmount: job.tdsAmount || 0,
      checker: job.checker || '',
      remark: job.remark || '',
      planned1: job.planned1 ? new Date(job.planned1).toISOString().split('T')[0] : '',
      actual1: job.actual1 ? new Date(job.actual1).toISOString().split('T')[0] : ''
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedJob) return;
    setSaving(true);
    try {
      const res = await servicesApi.put(`/jobs/${selectedJob.id}`, jobForm);
      if (res.success) {
        setIsEditOpen(false);
        setSelectedJob(null);
        fetchJobs();
      }
    } catch (err) {
      alert(`Error updating service job: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePaymentFormDone = async (jobId, checked) => {
    setJobs((prevJobs) =>
      prevJobs.map((j) => (j.id === jobId ? { ...j, paymentFormDone: checked } : j))
    );
    try {
      const res = await servicesApi.put(`/jobs/${jobId}`, { paymentFormDone: checked });
      if (!res?.success) {
        throw new Error(res?.error || 'Failed to update status');
      }
    } catch (err) {
      console.error('Failed to update paymentFormDone:', err);
      alert(`Failed to update status: ${err.message}`);
      setJobs((prevJobs) =>
        prevJobs.map((j) => (j.id === jobId ? { ...j, paymentFormDone: !checked } : j))
      );
    }
  };

  const filteredJobs = jobs.filter((j) => {
    if (activeTab === 'active') return j.status !== 'Completed';
    return j.status === 'Completed';
  });

  const formatCurrency = (amt) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amt || 0);

  const formatDate = (dt) => (dt ? new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Services Jobs</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Track work execution stages, bill generation, and verification status</p>
        </div>
        <button
          onClick={() => {
            setJobForm({ firmName: 'PMMPL', vendor: '', description: '', location: '', amount: '', tdsAmount: '0', checker: '', remark: '', planned1: '', actual1: '' });
            setIsCreateOpen(true);
          }}
          className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-1.5"
        >
          <span>+ New Service Job</span>
        </button>
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
            Active Services ({jobs.filter((j) => j.status !== 'Completed').length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'completed'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Completed ({jobs.filter((j) => j.status === 'Completed').length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search service no, vendor, bill..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 px-3 w-48 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none"
          />
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none"
          >
            <option value="All">All Stages</option>
            <option value="Service Created">Service Created</option>
            <option value="Work Started">Work Started</option>
            <option value="Work Completed">Work Completed</option>
            <option value="Bill Received">Bill Received</option>
            <option value="Payment Pending">Payment Pending</option>
            <option value="Tally Pending">Tally Pending</option>
          </select>
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
              <th className="p-3 w-12 text-center">Done</th>
              <th className="p-3">Service No</th>
              <th className="p-3">Firm</th>
              <th className="p-3">Vendor</th>
              <th className="p-3">Description</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Checker</th>
              <th className="p-3">Work Stage 1 (P / A / Delay)</th>
              <th className="p-3">Derived Status</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-200">
            {loading ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-zinc-500">Loading service jobs...</td>
              </tr>
            ) : filteredJobs.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-zinc-500">No service jobs found.</td>
              </tr>
            ) : (
              filteredJobs.map((j) => (
                <tr key={j.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={!!j.paymentFormDone}
                      onChange={(e) => handleTogglePaymentFormDone(j.id, e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </td>
                  <td className="p-3 font-semibold text-zinc-900 dark:text-white">{j.serviceNo}</td>
                  <td className="p-3">{j.firmName}</td>
                  <td className="p-3 font-medium">{j.vendor}</td>
                  <td className="p-3 max-w-xs truncate" title={j.description}>{j.description || '-'}</td>
                  <td className="p-3 font-semibold">{formatCurrency(j.amount)}</td>
                  <td className="p-3">{j.checker || '-'}</td>
                  <td className="p-3">
                    <span className="text-[11px] text-zinc-500">
                      P: {formatDate(j.planned1)} | A: {formatDate(j.actual1)}
                      {j.delay1 > 0 && <span className="ml-1 px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-bold">{j.delay1}d delay</span>}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {j.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <a
                      href="https://docs.google.com/forms/d/e/1FAIpQLScn8tHEUldlOM_8DKpHUfHHiRImDVjkpkhhfduaZUIxpxlJrA/viewform"
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-semibold transition-colors inline-block"
                    >
                      Payment Form
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {(isCreateOpen || isEditOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
              {isEditOpen ? `Edit Service Job ${selectedJob?.serviceNo}` : 'Create New Service Job'}
            </h3>
            <form onSubmit={isEditOpen ? handleEditSubmit : handleCreateSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Firm Name</label>
                  <select
                    value={jobForm.firmName}
                    onChange={(e) => setJobForm({ ...jobForm, firmName: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  >
                    <option value="PMMPL">PMMPL</option>
                    <option value="PMM Logisol">PMM Logisol</option>
                    <option value="PMM Retail">PMM Retail</option>
                    <option value="PMM Infra">PMM Infra</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Vendor Name *</label>
                  <input
                    type="text"
                    required
                    value={jobForm.vendor}
                    onChange={(e) => setJobForm({ ...jobForm, vendor: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={jobForm.description}
                  onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Location</label>
                  <input
                    type="text"
                    value={jobForm.location}
                    onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Checker</label>
                  <input
                    type="text"
                    value={jobForm.checker}
                    onChange={(e) => setJobForm({ ...jobForm, checker: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={jobForm.amount}
                    onChange={(e) => setJobForm({ ...jobForm, amount: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">TDS Amount (₹)</label>
                  <input
                    type="number"
                    value={jobForm.tdsAmount}
                    onChange={(e) => setJobForm({ ...jobForm, tdsAmount: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Planned Date 1 (Work Start)</label>
                  <input
                    type="date"
                    value={jobForm.planned1}
                    onChange={(e) => setJobForm({ ...jobForm, planned1: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Actual Date 1 (Work Started)</label>
                  <input
                    type="date"
                    value={jobForm.actual1}
                    onChange={(e) => setJobForm({ ...jobForm, actual1: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Remarks</label>
                <textarea
                  rows={2}
                  value={jobForm.remark}
                  onChange={(e) => setJobForm({ ...jobForm, remark: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); }}
                  className="h-9 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {saving ? 'Saving...' : 'Save Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
