import React, { useEffect, useState } from 'react';
import { servicesApi } from '../../lib/api';

export default function Utility() {
  const [utilities, setUtilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('create'); // create | approval | payment | completed
  const [search, setSearch] = useState('');
  const [firmFilter, setFirmFilter] = useState('All');
  const [masterDropdowns, setMasterDropdowns] = useState({ departments: [], groupHeads: [], firmNames: [], fmsNames: [] });

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [selectedUtility, setSelectedUtility] = useState(null);
  const [saving, setSaving] = useState(false);

  // Forms
  const [newUtility, setNewUtility] = useState({
    firmName: 'PMMPL',
    personName: '',
    userName: '',
    department: 'IT',
    groupHead: 'Electricity',
    payTo: '',
    amount: '',
    tdsAmount: '0',
    billImage: '',
    billDate: '',
    dueDate: '',
    remarks: ''
  });

  const [approveForm, setApproveForm] = useState({
    fmsName: 'Utility FMS',
    details: '',
    approvalAttachment: '',
    remarks: ''
  });

  const [payForm, setPayForm] = useState({
    paymentNo: '',
    paymentMode: 'Net Banking / NEFT',
    transactionRef: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentAttachment: '',
    paymentRemarks: ''
  });

  const fetchUtilities = async () => {
    setLoading(true);
    try {
      const res = await servicesApi.get('/utility', { firm: firmFilter, search });
      if (res.success) {
        setUtilities(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch utilities:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaster = async () => {
    try {
      const res = await servicesApi.get('/master');
      if (res.success && res.data) {
        setMasterDropdowns(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch master dropdowns:', err);
    }
  };

  useEffect(() => {
    fetchUtilities();
    fetchMaster();
  }, [firmFilter, search]);

  const handleFileUpload = async (e, setter, key) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await servicesApi.upload(file);
      setter((prev) => ({ ...prev, [key]: url }));
    } catch (err) {
      alert(`File upload failed: ${err.message}`);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newUtility.payTo || !newUtility.amount) {
      alert('Please fill in Pay To and Bill Amount.');
      return;
    }
    setSaving(true);
    try {
      const res = await servicesApi.post('/utility', newUtility);
      if (res.success) {
        setIsCreateOpen(false);
        setNewUtility({ firmName: 'PMMPL', personName: '', userName: '', department: 'IT', groupHead: 'Electricity', payTo: '', amount: '', tdsAmount: '0', billImage: '', billDate: '', dueDate: '', remarks: '' });
        fetchUtilities();
      }
    } catch (err) {
      alert(`Error creating utility payment: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleApproveOpen = (utility) => {
    setSelectedUtility(utility);
    setApproveForm({
      fmsName: masterDropdowns.fmsNames[0] || 'Utility FMS',
      details: utility.remarks || '',
      approvalAttachment: '',
      remarks: ''
    });
    setIsApproveOpen(true);
  };

  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUtility) return;
    setSaving(true);
    try {
      const res = await servicesApi.post(`/utility/${selectedUtility.id}/approve`, approveForm);
      if (res.success) {
        setIsApproveOpen(false);
        setSelectedUtility(null);
        fetchUtilities();
      }
    } catch (err) {
      alert(`Error approving utility: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handlePayOpen = (utility) => {
    setSelectedUtility(utility);
    setPayForm({
      paymentNo: `PAY-${String(Math.floor(Math.random() * 900) + 100)}`,
      paymentMode: 'Net Banking / NEFT',
      transactionRef: '',
      paymentDate: new Date().toISOString().split('T')[0],
      paymentAttachment: '',
      paymentRemarks: ''
    });
    setIsPayOpen(true);
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    if (!selectedUtility) return;
    setSaving(true);
    try {
      const res = await servicesApi.post(`/utility/${selectedUtility.id}/pay`, payForm);
      if (res.success) {
        setIsPayOpen(false);
        setSelectedUtility(null);
        fetchUtilities();
      }
    } catch (err) {
      alert(`Error recording payment: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const filteredUtilities = utilities.filter((u) => {
    if (activeTab === 'create') return u.status === 'Pending Approval' || u.status === 'Utility Created';
    if (activeTab === 'approval') return u.status === 'Pending Approval' || u.status === 'Approved';
    if (activeTab === 'payment') return u.status === 'Approved' || u.status === 'Tally Entry' || u.status === 'Payment In Progress' || u.status === 'Pending Payment';
    if (activeTab === 'completed') return u.status === 'Completed' || u.status === 'Paid';
    return true;
  });

  const formatCurrency = (amt) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amt || 0);

  const formatDate = (dt) => (dt ? new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Recurring Utility Payments</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Manage recurring electricity, rent, internet, water, and vendor utility bills</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-1.5"
        >
          <span>+ Create Utility Entry</span>
        </button>
      </div>

      {/* 4 Sub-Tabs & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl w-fit">
          {[
            { id: 'create', label: 'Utility Entries' },
            { id: 'approval', label: 'Payment Approval' },
            { id: 'payment', label: 'Tally Entry' },
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
            placeholder="Search utility no, payee, department..."
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
              <th className="p-3">Utility No</th>
              <th className="p-3">Firm</th>
              <th className="p-3">Pay To</th>
              <th className="p-3">Dept / Group</th>
              <th className="p-3">Bill Amount</th>
              <th className="p-3">Bill Image</th>
              <th className="p-3">Due Date</th>
              <th className="p-3">Status</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-200">
            {loading ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-zinc-500">Loading utility entries...</td>
              </tr>
            ) : filteredUtilities.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-zinc-500">No utility entries found in this stage.</td>
              </tr>
            ) : (
              filteredUtilities.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="p-3 font-semibold text-zinc-900 dark:text-white">{u.utilityNo}</td>
                  <td className="p-3">{u.firmName}</td>
                  <td className="p-3 font-medium">{u.payTo}</td>
                  <td className="p-3 text-zinc-500">{u.department || '-'} / {u.groupHead || '-'}</td>
                  <td className="p-3 font-semibold">{formatCurrency(u.amount)}</td>
                  <td className="p-3">
                    {u.billImage ? (
                      <a href={u.billImage} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline font-medium">View Image</a>
                    ) : (
                      <span className="text-zinc-400">None</span>
                    )}
                  </td>
                  <td className="p-3">{formatDate(u.dueDate)}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      {u.status}
                    </span>
                  </td>
                  <td className="p-3">
                    {u.status === 'Pending Approval' && (
                      <button
                        onClick={() => handleApproveOpen(u)}
                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
                      >
                        Approve Payment
                      </button>
                    )}
                    {(u.status === 'Approved' || u.status === 'Tally Entry' || u.status === 'Payment In Progress' || u.status === 'Pending Payment') && (
                      <button
                        onClick={() => handlePayOpen(u)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors"
                      >
                        Disburse / Pay
                      </button>
                    )}
                    {(u.status === 'Completed' || u.status === 'Paid') && (
                      <span className="text-emerald-600 font-semibold">Done ✅</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Utility Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Create Utility Payment Entry</h3>
            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Firm Name</label>
                  <select
                    value={newUtility.firmName}
                    onChange={(e) => setNewUtility({ ...newUtility, firmName: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  >
                    <option value="PMMPL">PMMPL</option>
                    <option value="PMM Logisol">PMM Logisol</option>
                    <option value="PMM Retail">PMM Retail</option>
                    <option value="PMM Infra">PMM Infra</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Pay To *</label>
                  <input
                    type="text"
                    required
                    placeholder="Electricity board, landlord, vendor..."
                    value={newUtility.payTo}
                    onChange={(e) => setNewUtility({ ...newUtility, payTo: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Department</label>
                  <select
                    value={newUtility.department}
                    onChange={(e) => setNewUtility({ ...newUtility, department: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  >
                    {masterDropdowns.departments.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Group Head</label>
                  <select
                    value={newUtility.groupHead}
                    onChange={(e) => setNewUtility({ ...newUtility, groupHead: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  >
                    {masterDropdowns.groupHeads.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Bill Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={newUtility.amount}
                    onChange={(e) => setNewUtility({ ...newUtility, amount: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">TDS Amount (₹)</label>
                  <input
                    type="number"
                    value={newUtility.tdsAmount}
                    onChange={(e) => setNewUtility({ ...newUtility, tdsAmount: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Bill Date</label>
                  <input
                    type="date"
                    value={newUtility.billDate}
                    onChange={(e) => setNewUtility({ ...newUtility, billDate: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newUtility.dueDate}
                    onChange={(e) => setNewUtility({ ...newUtility, dueDate: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Bill Image / Attachment</label>
                <input
                  type="file"
                  onChange={(e) => handleFileUpload(e, setNewUtility, 'billImage')}
                  className="w-full text-xs text-zinc-500"
                />
                {newUtility.billImage && <p className="text-[11px] text-emerald-600 mt-1 truncate">Uploaded: {newUtility.billImage}</p>}
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Remarks</label>
                <textarea
                  rows={2}
                  value={newUtility.remarks}
                  onChange={(e) => setNewUtility({ ...newUtility, remarks: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="h-9 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {saving ? 'Saving...' : 'Save Utility Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approve Utility Modal */}
      {isApproveOpen && selectedUtility && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Approve Utility - {selectedUtility.utilityNo}</h3>
            <form onSubmit={handleApproveSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">FMS Name</label>
                <select
                  value={approveForm.fmsName}
                  onChange={(e) => setApproveForm({ ...approveForm, fmsName: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                >
                  {masterDropdowns.fmsNames.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Approval Attachment</label>
                <input
                  type="file"
                  onChange={(e) => handleFileUpload(e, setApproveForm, 'approvalAttachment')}
                  className="w-full text-xs text-zinc-500"
                />
                {approveForm.approvalAttachment && <p className="text-[11px] text-emerald-600 mt-1 truncate">Uploaded: {approveForm.approvalAttachment}</p>}
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Approval Details / Notes</label>
                <textarea
                  rows={2}
                  value={approveForm.details}
                  onChange={(e) => setApproveForm({ ...approveForm, details: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsApproveOpen(false)}
                  className="h-9 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  {saving ? 'Approving...' : 'Confirm Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Utility Modal */}
      {isPayOpen && selectedUtility && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Disburse Utility Payment - {selectedUtility.utilityNo}</h3>
            <form onSubmit={handlePaySubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Payment Number</label>
                  <input
                    type="text"
                    required
                    value={payForm.paymentNo}
                    onChange={(e) => setPayForm({ ...payForm, paymentNo: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Payment Mode</label>
                  <select
                    value={payForm.paymentMode}
                    onChange={(e) => setPayForm({ ...payForm, paymentMode: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  >
                    <option value="Net Banking / NEFT">Net Banking / NEFT</option>
                    <option value="RTGS">RTGS</option>
                    <option value="UPI">UPI</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Transaction Ref / UTR</label>
                <input
                  type="text"
                  required
                  placeholder="UTR or Cheque No."
                  value={payForm.transactionRef}
                  onChange={(e) => setPayForm({ ...payForm, transactionRef: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Payment Proof Attachment</label>
                <input
                  type="file"
                  onChange={(e) => handleFileUpload(e, setPayForm, 'paymentAttachment')}
                  className="w-full text-xs text-zinc-500"
                />
                {payForm.paymentAttachment && <p className="text-[11px] text-emerald-600 mt-1 truncate">Uploaded: {payForm.paymentAttachment}</p>}
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsPayOpen(false)}
                  className="h-9 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {saving ? 'Disbursing...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
