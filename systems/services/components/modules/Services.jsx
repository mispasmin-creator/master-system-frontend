import React, { useEffect, useState } from 'react';
import { servicesApi } from '../../lib/api';

export default function Services() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // pending | completed
  const [search, setSearch] = useState('');
  const [firmFilter, setFirmFilter] = useState('All');
  const [stageFilter, setStageFilter] = useState('All');

  // Checkbox & Submit state per row
  const [checkedRows, setCheckedRows] = useState({});
  const [submittingRowId, setSubmittingRowId] = useState(null);

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
    remark: ''
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

  const handleCheckboxToggle = (jobId, checked) => {
    setCheckedRows((prev) => ({
      ...prev,
      [jobId]: checked
    }));
  };

  const handleSubmitDone = async (job) => {
    setSubmittingRowId(job.id);
    try {
      const res = await servicesApi.put(`/jobs/${job.id}`, {
        paymentFormDone: true,
        actual1: job.actual1 ? job.actual1 : new Date().toISOString()
      });

      if (res?.success) {
        // Clear checked row state and refresh list
        setCheckedRows((prev) => {
          const next = { ...prev };
          delete next[job.id];
          return next;
        });
        await fetchJobs();
      } else {
        throw new Error(res?.error || 'Failed to submit service completion');
      }
    } catch (err) {
      console.error('Failed to submit done status:', err);
      alert(`Failed to submit: ${err.message}`);
    } finally {
      setSubmittingRowId(null);
    }
  };

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

  const isJobCompleted = (j) => Boolean(j.paymentFormDone || j.status === 'Completed');

  const pendingJobs = jobs.filter((j) => !isJobCompleted(j));
  const completedJobs = jobs.filter((j) => isJobCompleted(j));

  const filteredJobs = activeTab === 'pending' ? pendingJobs : completedJobs;

  const formatCurrency = (amt) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amt || 0);

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
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'pending'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Payment Pending ({pendingJobs.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'completed'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Completed ({completedJobs.length})
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
              <th className="p-3 w-28 text-center">DONE</th>
              <th className="p-3">Offer No.</th>
              <th className="p-3">Service No.</th>
              <th className="p-3">Firm Name</th>
              <th className="p-3">Checker</th>
              <th className="p-3">Total Amount</th>
              <th className="p-3">TDS</th>
              <th className="p-3">Actual Amount</th>
              <th className="p-3">Vendor</th>
              <th className="p-3 text-center">Action</th>
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
              filteredJobs.map((j) => {
                const isCompleted = isJobCompleted(j);
                const isChecked = Boolean(checkedRows[j.id]);
                const isSubmittingThis = submittingRowId === j.id;
                const totalAmount = j.amount || 0;
                const tdsAmount = j.tdsAmount || 0;
                const actualAmount = totalAmount - tdsAmount;
                const offerNumber = j.offer?.offerNo || j.offerNo || '-';

                return (
                  <tr key={j.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 min-w-[90px]">
                        <input
                          type="checkbox"
                          checked={isCompleted || isChecked}
                          disabled={isCompleted || isSubmittingThis}
                          onChange={(e) => handleCheckboxToggle(j.id, e.target.checked)}
                          className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:cursor-default"
                        />
                        {!isCompleted && isChecked && (
                          <button
                            type="button"
                            disabled={isSubmittingThis}
                            onClick={() => handleSubmitDone(j)}
                            className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            {isSubmittingThis ? '...' : 'Submit'}
                          </button>
                        )}
                        {isCompleted && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Done</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 font-semibold text-zinc-700 dark:text-zinc-300">{offerNumber}</td>
                    <td className="p-3 font-semibold text-zinc-900 dark:text-white">{j.serviceNo}</td>
                    <td className="p-3">{j.firmName}</td>
                    <td className="p-3">{j.checker || '-'}</td>
                    <td className="p-3 font-semibold">{formatCurrency(totalAmount)}</td>
                    <td className="p-3 text-zinc-500">{formatCurrency(tdsAmount)}</td>
                    <td className="p-3 font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(actualAmount)}</td>
                    <td className="p-3 font-medium">{j.vendor}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <a
                          href="https://docs.google.com/forms/d/e/1FAIpQLScn8tHEUldlOM_8DKpHUfHHiRImDVjkpkhhfduaZUIxpxlJrA/viewform"
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-semibold transition-colors inline-block"
                        >
                          Payment Form
                        </a>
                        <button
                          type="button"
                          onClick={() => handleEditOpen(j)}
                          className="px-2 py-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-[11px] font-medium"
                          title="Edit Service Details"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
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
