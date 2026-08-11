import React, { useState, useEffect, useMemo } from 'react';
import { paymentApi } from '../../lib/api';
import { 
  Landmark, Search, ExternalLink, Eye, Check, X, Send, AlertCircle 
} from 'lucide-react';

const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return "₹0.00";
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export default function ChannelFunding() {
  const [payments, setPayments] = useState([]);
  const [fundingTypes, setFundingTypes] = useState(["GDFSFY", "BHFDDF", "AFAFAEF", "AEAFAEFA", "EAF"]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'history'
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [typeOfFunding, setTypeOfFunding] = useState('GDFSFY');
  const [fundingRemarks, setFundingRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [reqRes, masterRes] = await Promise.all([
        paymentApi.get('requests'),
        paymentApi.get('master')
      ]);

      if (reqRes.success && reqRes.data) {
        setPayments(reqRes.data);
      }
      if (masterRes.success && masterRes.data?.typeOfFunding) {
        setFundingTypes(masterRes.data.typeOfFunding);
        if (masterRes.data.typeOfFunding[0]) setTypeOfFunding(masterRes.data.typeOfFunding[0]);
      }
    } catch (err) {
      console.error('Error loading channel funding data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const fundingPayments = useMemo(() => {
    return payments.filter(p => {
      const matchesTab = activeTab === 'active'
        ? p.status === 'Approved for Funding'
        : (['Channel Funded', 'Rejected'].includes(p.status));

      return matchesTab &&
        (!search.trim() || 
          p.paymentNumber?.toLowerCase().includes(search.toLowerCase()) ||
          p.payTo?.toLowerCase().includes(search.toLowerCase()) ||
          p.fmsName?.toLowerCase().includes(search.toLowerCase())
        );
    });
  }, [payments, search, activeTab]);

  const openFundingModal = (p) => {
    setSelectedPayment(p);
    setTypeOfFunding(p.typeOfFunding || fundingTypes[0] || 'GDFSFY');
    setFundingRemarks(p.fundingRemarks || p.remarks || '');
    setError('');
    setIsOpen(true);
  };

  const handleAction = async (nextStatus, isRejection = false) => {
    if (isRejection && !fundingRemarks.trim()) {
      setError("Rejection remarks are required.");
      return;
    }

    try {
      setActionLoading(true);
      setError('');

      const res = await paymentApi.post(`requests/${selectedPayment.id}/channel-funding`, {
        status: nextStatus,
        typeOfFunding: typeOfFunding,
        fundingRemarks: fundingRemarks,
        remarks: fundingRemarks,
        isRejection
      });

      if (res.success) {
        setIsOpen(false);
        loadData();
      } else {
        setError(res.error || "Failed to process workflow update.");
      }
    } catch (err) {
      setError(err.message || "Failed to complete operation.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-xs">
      
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <Landmark className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          Channel Funding Allocation
        </h1>
        <p className="text-xs text-zinc-500 mt-1">Assign capital channels, specify funding types, and pass verified indents to final approval.</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1 rounded-xl border shadow-sm">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 sm:flex-initial text-center px-6 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 ${
            activeTab === 'active'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
          }`}
        >
          <span>Active Requests</span>
          <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-500 text-white">
            {payments.filter(p => p.status === 'Approved for Funding').length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 sm:flex-initial text-center px-6 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 ${
            activeTab === 'history'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
          }`}
        >
          <span>Funding History</span>
          <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-semibold rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300">
            {payments.filter(p => ['Channel Funded', 'Rejected'].includes(p.status)).length}
          </span>
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="h-4 w-4 absolute left-3 top-2.5 text-zinc-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by Payment ID, Vendor, or Category..."
          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs outline-none"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[950px]">
          <thead className="bg-zinc-50 dark:bg-zinc-950 uppercase text-[10px] text-zinc-400 font-bold border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="px-5 py-3.5">AP Payment Number</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5">Firm Name</th>
              <th className="px-5 py-3.5">FMS Category</th>
              <th className="px-5 py-3.5">Pay To</th>
              <th className="px-5 py-3.5 text-right">Amount</th>
              <th className="px-5 py-3.5">Funding Type</th>
              <th className="px-5 py-3.5 text-center">Attachments</th>
              {activeTab !== 'history' && <th className="px-5 py-3.5 text-center">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
            {fundingPayments.length === 0 ? (
              <tr>
                <td colSpan={activeTab === 'history' ? 8 : 9} className="text-center py-12 text-zinc-400 italic">
                  No funding requests found matching parameters.
                </td>
              </tr>
            ) : (
              fundingPayments.map(p => (
                <tr key={p.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10">
                  <td className="px-5 py-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">{p.paymentNumber}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wide bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-200">
                      {p.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-zinc-800 dark:text-zinc-200">{p.firmName}</td>
                  <td className="px-5 py-3.5 text-zinc-700 dark:text-zinc-300">{p.fmsName}</td>
                  <td className="px-5 py-3.5 font-semibold text-zinc-900 dark:text-zinc-100">{p.payTo}</td>
                  <td className="px-5 py-3.5 text-right font-bold text-zinc-900 dark:text-zinc-50">{formatCurrency(p.amount)}</td>
                  <td className="px-5 py-3.5 font-semibold text-zinc-600 dark:text-zinc-400">{p.typeOfFunding || '-'}</td>
                  <td className="px-5 py-3.5 text-center">
                    {p.attachmentUrl ? (
                      <a href={p.attachmentUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1 font-semibold">
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-zinc-400">-</span>
                    )}
                  </td>
                  {activeTab !== 'history' && (
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => openFundingModal(p)}
                        className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded-lg font-bold transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Fund Action</span>
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Funding Modal */}
      {isOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100">Confirm Channel Funding: {selectedPayment.paymentNumber}</h3>
                <p className="text-xs text-zinc-400">Payee: {selectedPayment.payTo} ({formatCurrency(selectedPayment.amount)})</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-rose-600 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">Type of Funding Channel</label>
                <select
                  value={typeOfFunding}
                  onChange={(e) => setTypeOfFunding(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                >
                  {fundingTypes.map((t, idx) => (
                    <option key={idx} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">Funding Remarks / Notes</label>
                <textarea
                  value={fundingRemarks}
                  onChange={(e) => setFundingRemarks(e.target.value)}
                  rows={3}
                  placeholder="Notes regarding channel limit, bank account, or funding approval..."
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => handleAction('Rejected', true)}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 font-bold rounded-xl text-xs transition-colors flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                <span>Reject</span>
              </button>

              <div className="flex gap-2">
                <button onClick={() => setIsOpen(false)} className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 font-semibold text-zinc-600 rounded-xl text-xs">Cancel</button>
                <button
                  onClick={() => handleAction('Channel Funded', false)}
                  disabled={actionLoading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Send className="h-4 w-4" />
                  <span>Confirm Funding</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
