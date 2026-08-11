import React, { useState, useEffect, useMemo } from 'react';
import { paymentApi } from '../../lib/api';
import { 
  CreditCard, Search, ExternalLink, Eye, Check, X, Send, AlertCircle 
} from 'lucide-react';

const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return "₹0.00";
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export default function MakePayment() {
  const [payments, setPayments] = useState([]);
  const [paymentModes, setPaymentModes] = useState(["NEFT", "RTGS", "IMPS", "UPI", "Cash", "Cheque"]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'history'
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState('NEFT');
  const [remarks, setRemarks] = useState('');
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
      if (masterRes.success && masterRes.data?.paymentModes) {
        setPaymentModes(masterRes.data.paymentModes);
        if (masterRes.data.paymentModes[0]) setPaymentMode(masterRes.data.paymentModes[0]);
      }
    } catch (err) {
      console.error('Error loading make payment data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const postedPayments = useMemo(() => {
    return payments.filter(p => {
      const matchesTab = activeTab === 'active'
        ? p.status === 'Posted'
        : (['Payment Completed', 'Rejected'].includes(p.status));

      return matchesTab &&
        (!search.trim() || 
          p.paymentNumber?.toLowerCase().includes(search.toLowerCase()) ||
          p.payTo?.toLowerCase().includes(search.toLowerCase()) ||
          p.fmsName?.toLowerCase().includes(search.toLowerCase())
        );
    });
  }, [payments, search, activeTab]);

  const openPaymentModal = (p) => {
    setSelectedPayment(p);
    setPaymentMode(p.paymentMode || paymentModes[0] || 'NEFT');
    setRemarks(p.financeRemarks || p.remarks || '');
    setError('');
    setIsOpen(true);
  };

  const handleAction = async (nextStatus, isRejection = false) => {
    if (isRejection && !remarks.trim()) {
      setError("Rejection remarks are required.");
      return;
    }

    try {
      setActionLoading(true);
      setError('');

      const res = await paymentApi.post(`requests/${selectedPayment.id}/pay`, {
        status: nextStatus,
        paymentMode: paymentMode,
        financeRemarks: remarks,
        remarks: remarks,
        isRejection
      });

      if (res.success) {
        setIsOpen(false);
        loadData();
      } else {
        setError(res.error || "Failed to process disbursement.");
      }
    } catch (err) {
      setError(err.message || "Operation failed.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-xs">
      
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          Make Final Payment &amp; Disbursement
        </h1>
        <p className="text-xs text-zinc-500 mt-1">Execute capital transfers, record bank UTR/Ref transactions, and archive completed indents.</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1 rounded-xl border shadow-sm">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 sm:flex-initial text-center px-6 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 ${
            activeTab === 'active'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
          }`}
        >
          <span>Active Posted Payments</span>
          <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500 text-white">
            {payments.filter(p => p.status === 'Posted').length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 sm:flex-initial text-center px-6 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 ${
            activeTab === 'history'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
          }`}
        >
          <span>Disbursement History</span>
          <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-semibold rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300">
            {payments.filter(p => ['Payment Completed', 'Rejected'].includes(p.status)).length}
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
              <th className="px-5 py-3.5">Payment Mode</th>
              <th className="px-5 py-3.5 text-center">Attachments</th>
              {activeTab !== 'history' && <th className="px-5 py-3.5 text-center">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
            {postedPayments.length === 0 ? (
              <tr>
                <td colSpan={activeTab === 'history' ? 8 : 9} className="text-center py-12 text-zinc-400 italic">
                  No disbursement records found matching parameters.
                </td>
              </tr>
            ) : (
              postedPayments.map(p => (
                <tr key={p.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10">
                  <td className="px-5 py-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">{p.paymentNumber}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wide bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200">
                      {p.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-zinc-800 dark:text-zinc-200">{p.firmName}</td>
                  <td className="px-5 py-3.5 text-zinc-700 dark:text-zinc-300">{p.fmsName}</td>
                  <td className="px-5 py-3.5 font-semibold text-zinc-900 dark:text-zinc-100">{p.payTo}</td>
                  <td className="px-5 py-3.5 text-right font-bold text-zinc-900 dark:text-zinc-50">{formatCurrency(p.amount)}</td>
                  <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-400 font-semibold">{p.paymentMode || '-'}</td>
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
                        onClick={() => openPaymentModal(p)}
                        className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 rounded-lg font-bold transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Disburse</span>
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Disbursement Modal */}
      {isOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100">Disburse Payment: {selectedPayment.paymentNumber}</h3>
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

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                >
                  {paymentModes.map((m, idx) => (
                    <option key={idx} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">Finance Remarks / UTR Transaction Reference</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={3}
                  placeholder="Enter bank UTR number, transfer timestamp, or finance notes..."
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
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
                  onClick={() => handleAction('Payment Completed', false)}
                  disabled={actionLoading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Send className="h-4 w-4" />
                  <span>Complete Payment</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
