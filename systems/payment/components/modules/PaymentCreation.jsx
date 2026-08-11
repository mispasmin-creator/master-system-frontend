import React, { useState, useEffect, useMemo } from 'react';
import { paymentApi } from '../../lib/api';
import { 
  PlusCircle, FileText, Search, Eye, Check, X, ExternalLink, 
  Clock, ShieldAlert, Sparkles, Building2, Upload, AlertCircle
} from 'lucide-react';

const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return "₹0.00";
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export default function PaymentCreation() {
  const [payments, setPayments] = useState([]);
  const [masterData, setMasterData] = useState({ fms: [], firms: [], vendors: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [firmFilter, setFirmFilter] = useState('All');
  
  // Form State
  const [fmsName, setFmsName] = useState('Repair FMS');
  const [firmName, setFirmName] = useState('PMMPL');
  const [payTo, setPayTo] = useState('');
  const [amount, setAmount] = useState('');
  const [department, setDepartment] = useState('IT');
  const [priority, setPriority] = useState('Medium');
  const [plannedDate, setPlannedDate] = useState(new Date().toISOString().split('T')[0]);
  const [requiredDate, setRequiredDate] = useState(new Date().toISOString().split('T')[0]);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [supportingDocuments, setSupportingDocuments] = useState('Invoice');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Selected Payment Preview Modal
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [reqRes, masterRes] = await Promise.all([
        paymentApi.get('requests'),
        paymentApi.get('master')
      ]);

      if (reqRes.success && reqRes.data) {
        setPayments(reqRes.data);
      }
      if (masterRes.success && masterRes.data) {
        setMasterData(masterRes.data);
        if (masterRes.data.fms?.[0]?.fmsName) {
          setFmsName(masterRes.data.fms[0].fmsName);
        }
        if (masterRes.data.firms?.[0]) {
          setFirmName(masterRes.data.firms[0]);
        }
      }
    } catch (err) {
      console.error('Error loading payment creation data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleCreate = async (initialStatus) => {
    setFormError('');
    setFormSuccess('');

    if (!payTo.trim() || !amount || parseFloat(amount) <= 0) {
      setFormError('Please enter a valid vendor/payee name and payment amount.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await paymentApi.post('requests', {
        fmsName,
        firmName,
        payTo: payTo.trim(),
        amount: parseFloat(amount),
        department,
        priority,
        plannedDate,
        requiredDate,
        attachmentUrl,
        supportingDocuments,
        remarks,
        status: initialStatus
      });

      if (res.success) {
        setFormSuccess(`Payment Request '${res.data.paymentNumber}' saved cleanly!`);
        setPayTo('');
        setAmount('');
        setRemarks('');
        setAttachmentUrl('');
        loadAll();
      } else {
        setFormError(res.error || 'Failed to create payment request.');
      }
    } catch (err) {
      setFormError(err.message || 'Server error creating payment request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await paymentApi.upload(file);
      setAttachmentUrl(url);
    } catch (err) {
      setFormError('File upload failed: ' + err.message);
    }
  };

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const matchesSearch = !search.trim() ||
        p.paymentNumber?.toLowerCase().includes(search.toLowerCase()) ||
        p.payTo?.toLowerCase().includes(search.toLowerCase()) ||
        p.fmsName?.toLowerCase().includes(search.toLowerCase());

      const matchesFirm = firmFilter === 'All' || p.firmName === firmFilter;
      return matchesSearch && matchesFirm;
    });
  }, [payments, search, firmFilter]);

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs">
      
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <h1 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <PlusCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          Payment Creation &amp; Indent Generation
        </h1>
        <p className="text-xs text-zinc-500 mt-1">Initiate payment requisitions, assign FMS categories, attach invoices, and track maker submissions.</p>
      </div>

      {/* Creation Form */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <FileText className="h-4 w-4 text-emerald-500" />
          New Payment Requisition
        </h2>

        {formError && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-rose-600 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {formSuccess && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-emerald-600 rounded-xl text-xs font-semibold">
            {formSuccess}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div>
            <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">Firm Name</label>
            <select
              value={firmName}
              onChange={(e) => setFirmName(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {(masterData.firms || ["PMMPL", "PMM Logisol", "PMM Retail", "PMM Infra", "PMM Ventures"]).map((f, i) => (
                <option key={i} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">FMS Name / Category</label>
            <select
              value={fmsName}
              onChange={(e) => setFmsName(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {(masterData.fms || []).map((f, i) => (
                <option key={i} value={f.fmsName}>{f.fmsName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">Pay To / Vendor Name</label>
            <input
              type="text"
              value={payTo}
              onChange={(e) => setPayTo(e.target.value)}
              placeholder="e.g. Acme Corp / Transporter"
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">Amount (₹)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500 font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">Department</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {["IT", "Logistics", "Finance", "Production", "HR", "Purchase", "Store", "Sales", "Management"].map((d, i) => (
                <option key={i} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {["Low", "Medium", "High", "Urgent"].map((p, i) => (
                <option key={i} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">Planned Date</label>
            <input
              type="date"
              value={plannedDate}
              onChange={(e) => setPlannedDate(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">Required Date</label>
            <input
              type="date"
              value={requiredDate}
              onChange={(e) => setRequiredDate(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">Supporting Document Type</label>
            <select
              value={supportingDocuments}
              onChange={(e) => setSupportingDocuments(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs outline-none"
            >
              {["Invoice", "PO Copy", "Approval Slip", "Bilty", "GRN", "Agreement"].map((d, i) => (
                <option key={i} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">Upload Attachment / Bill</label>
            <input
              type="file"
              onChange={handleFileUpload}
              className="w-full text-xs text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 dark:file:bg-emerald-950/40 dark:file:text-emerald-400 hover:file:bg-emerald-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">Remarks / Note</label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={2}
            placeholder="Provide context, PO reference, or payment purpose..."
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={() => handleCreate('Draft')}
            disabled={isSubmitting}
            className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold rounded-xl text-xs transition-colors"
          >
            Save as Draft
          </button>
          <button
            onClick={() => handleCreate('Submitted')}
            disabled={isSubmitting}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm transition-colors flex items-center gap-1.5"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Submit Requisition</span>
          </button>
        </div>
      </div>

      {/* Submitted Payments Ledger Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Payment Requisition Ledger</h2>
          
          <div className="flex items-center gap-3">
            <select
              value={firmFilter}
              onChange={(e) => setFirmFilter(e.target.value)}
              className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs outline-none"
            >
              <option value="All">All Firms</option>
              {(masterData.firms || []).map((f, i) => (
                <option key={i} value={f}>{f}</option>
              ))}
            </select>

            <div className="relative w-48">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search payment ID, vendor..."
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs outline-none"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-zinc-50 dark:bg-zinc-950 uppercase text-[10px] text-zinc-400 font-bold border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3">AP Number</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Firm Name</th>
                <th className="px-4 py-3">FMS Category</th>
                <th className="px-4 py-3">Pay To</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3 text-center">Attachment</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-zinc-400 italic">No payment requests found matching parameters.</td>
                </tr>
              ) : (
                filteredPayments.map(p => (
                  <tr key={p.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20">
                    <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">{p.paymentNumber}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-zinc-800 dark:text-zinc-200">{p.firmName}</td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{p.fmsName}</td>
                    <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">{p.payTo}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-zinc-900 dark:text-zinc-50">{formatCurrency(p.amount)}</td>
                    <td className="px-4 py-3 text-zinc-500">{p.department}</td>
                    <td className="px-4 py-3 text-center">
                      {p.attachmentUrl ? (
                        <a href={p.attachmentUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1 font-semibold">
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-zinc-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          setSelectedPayment(p);
                          setModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg font-bold text-zinc-700 dark:text-zinc-300 transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="h-3.5 w-3.5 text-blue-500" />
                        <span>Preview</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Dialog Modal */}
      {modalOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100">{selectedPayment.paymentNumber}</h3>
                <p className="text-xs text-zinc-400">Created by {selectedPayment.maker || 'Maker'} on {new Date(selectedPayment.createdAt).toLocaleDateString()}</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-zinc-400 block font-semibold">Pay To:</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{selectedPayment.payTo}</span>
              </div>
              <div>
                <span className="text-zinc-400 block font-semibold">Amount:</span>
                <span className="font-bold font-mono text-emerald-600">{formatCurrency(selectedPayment.amount)}</span>
              </div>
              <div>
                <span className="text-zinc-400 block font-semibold">FMS Category:</span>
                <span>{selectedPayment.fmsName}</span>
              </div>
              <div>
                <span className="text-zinc-400 block font-semibold">Firm Name:</span>
                <span>{selectedPayment.firmName}</span>
              </div>
              <div>
                <span className="text-zinc-400 block font-semibold">Current Status:</span>
                <span className="font-bold text-blue-600">{selectedPayment.status}</span>
              </div>
              <div>
                <span className="text-zinc-400 block font-semibold">Remarks:</span>
                <span>{selectedPayment.remarks || 'No remarks provided.'}</span>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <h4 className="font-bold text-xs text-zinc-700 dark:text-zinc-300">Audit History Log</h4>
              <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                {(selectedPayment.history || []).map((h, idx) => (
                  <div key={idx} className="p-2 bg-zinc-50 dark:bg-zinc-950 rounded-xl text-[11px] space-y-0.5">
                    <div className="flex justify-between font-semibold">
                      <span className="text-zinc-900 dark:text-zinc-100">{h.title}</span>
                      <span className="text-zinc-400 text-[10px]">{new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-zinc-500">{h.userName} ({h.userRole}): {h.comment || 'No comment'}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setModalOpen(false)} className="px-4 py-1.5 bg-zinc-100 dark:bg-zinc-800 font-bold rounded-xl text-xs">Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
