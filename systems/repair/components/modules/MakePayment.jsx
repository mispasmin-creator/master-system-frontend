import React, { useEffect, useState } from 'react';
import { repairApi } from '../../lib/api';

export default function MakePayment() {
  const [tasks, setTasks] = useState([]);
  const [advancePayments, setAdvancePayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'advances'

  // Final Payment Modal
  const [selectedTask, setSelectedTask] = useState(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentDates, setPaymentDates] = useState({
    planned4: new Date().toISOString().split('T')[0],
    actual4: new Date().toISOString().split('T')[0]
  });

  // Create Advance Payment Modal
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [submittingAdvance, setSubmittingAdvance] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({
    taskNo: '',
    firmName: 'Pmmpl',
    machineName: '',
    serialNo: '',
    vendorName: '',
    billNo: '',
    totalBillAmount: 0,
    toBePaidAmount: 0,
    paymentType: 'Advance',
    amount: 0,
    remarks: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [taskRes, advanceRes] = await Promise.all([
        repairApi.get('/tasks'),
        repairApi.get('/advance-payments')
      ]);

      if (taskRes.success) {
        setTasks(taskRes.data || []);
      }
      if (advanceRes.success) {
        setAdvancePayments(advanceRes.data || []);
      }
    } catch (err) {
      console.error('Failed to load Make Payment data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openFinalPaymentModal = (task) => {
    setSelectedTask(task);
    setPaymentDates({
      planned4: task.planned4 ? new Date(task.planned4).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      actual4: new Date().toISOString().split('T')[0]
    });
  };

  const handleCompletePayment = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;

    setSubmittingPayment(true);
    try {
      const res = await repairApi.post(`/tasks/${selectedTask.taskNo}/make-payment`, paymentDates);
      if (res.success) {
        setSelectedTask(null);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to complete final payment:', err);
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleCreateAdvance = async (e) => {
    e.preventDefault();
    setSubmittingAdvance(true);
    try {
      const res = await repairApi.post('/advance-payments', advanceForm);
      if (res.success) {
        setShowAdvanceModal(false);
        setAdvanceForm({
          taskNo: '',
          firmName: 'Pmmpl',
          machineName: '',
          serialNo: '',
          vendorName: '',
          billNo: '',
          totalBillAmount: 0,
          toBePaidAmount: 0,
          paymentType: 'Advance',
          amount: 0,
          remarks: ''
        });
        fetchData();
      }
    } catch (err) {
      console.error('Failed to create advance payment:', err);
    } finally {
      setSubmittingAdvance(false);
    }
  };

  // Filter tasks ready for final payment (received in store / actual2 exists)
  const pendingPaymentTasks = tasks.filter((t) => t.actual2 && !t.actual4);
  const completedPaymentTasks = tasks.filter((t) => !!t.actual4);

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Make Payment &amp; Advance Logs</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Settle repair vendor bills, log advance vouchers &amp; complete repair task lifecycle</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAdvanceModal(true)}
            className="h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            + Log Advance Payment
          </button>

          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-3.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'tasks'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Task Payments ({pendingPaymentTasks.length})
            </button>
            <button
              onClick={() => setActiveTab('advances')}
              className={`px-3.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'advances'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Advance Logs ({advancePayments.length})
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <div className="inline-block w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-2 text-xs text-zinc-500">Loading payment data…</p>
        </div>
      ) : activeTab === 'tasks' ? (
        /* Task Payment Table */
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3">Task No</th>
                <th className="p-3">Machine Details</th>
                <th className="p-3">Vendor / Bill No</th>
                <th className="p-3">Total Bill Amount</th>
                <th className="p-3">To Be Paid</th>
                <th className="p-3">Status</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-6 text-center text-zinc-400">No tasks in payment view.</td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="p-3 font-bold text-zinc-900 dark:text-white">{task.taskNo}</td>
                    <td className="p-3">
                      <div className="font-semibold text-zinc-900 dark:text-white">{task.machineName || 'N/A'}</div>
                      <div className="text-[11px] text-zinc-400">SN: {task.serialNo || '-'}</div>
                    </td>
                    <td className="p-3 text-zinc-700 dark:text-zinc-300">
                      <div>V: {task.vendorName || '-'}</div>
                      <div className="text-[11px] text-zinc-400">Bill: {task.billNo || '-'}</div>
                    </td>
                    <td className="p-3 font-semibold text-zinc-900 dark:text-zinc-100">₹{task.totalBillAmount || 0}</td>
                    <td className="p-3 font-semibold text-emerald-600 dark:text-emerald-400">₹{task.toBePaidAmount || 0}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        task.actual4
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                      }`}>
                        {task.actual4 ? 'Complete' : 'Pending Payment'}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => openFinalPaymentModal(task)}
                        className={`px-3 py-1.5 rounded-lg text-white font-semibold text-xs shadow-sm transition-colors ${
                          task.actual4 ? 'bg-zinc-600 hover:bg-zinc-700' : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                      >
                        {task.actual4 ? 'View / Edit' : 'Settle Payment'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Advance Payments Log Table */
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3">Payment No</th>
                <th className="p-3">Task No</th>
                <th className="p-3">Machine Details</th>
                <th className="p-3">Vendor / Paid To</th>
                <th className="p-3">Bill No</th>
                <th className="p-3">Paid Amount</th>
                <th className="p-3">Payment Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
              {advancePayments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-6 text-center text-zinc-400">No advance payment logs recorded.</td>
                </tr>
              ) : (
                advancePayments.map((adv) => (
                  <tr key={adv.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">{adv.paymentNo}</td>
                    <td className="p-3 font-semibold text-zinc-900 dark:text-white">{adv.taskNo || '-'}</td>
                    <td className="p-3">
                      <div className="font-semibold text-zinc-900 dark:text-white">{adv.machineName || 'N/A'}</div>
                      <div className="text-[11px] text-zinc-400">SN: {adv.serialNo || '-'}</div>
                    </td>
                    <td className="p-3 text-zinc-700 dark:text-zinc-300">
                      <div>V: {adv.vendorName || '-'}</div>
                      <div className="text-[11px] text-zinc-400">Paid To: {adv.paidTo || '-'}</div>
                    </td>
                    <td className="p-3 text-zinc-600 dark:text-zinc-300">{adv.billNo || '-'}</td>
                    <td className="p-3 font-bold text-zinc-900 dark:text-white">₹{adv.amount || 0}</td>
                    <td className="p-3 text-zinc-500">{adv.paidDate ? new Date(adv.paidDate).toLocaleDateString() : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Settle Final Payment Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Settle Final Payment — Task {selectedTask.taskNo}</h3>
              <button onClick={() => setSelectedTask(null)} className="text-zinc-400 hover:text-zinc-600 text-sm font-bold">✕</button>
            </div>

            <div className="text-xs space-y-2 bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <div><span className="font-semibold text-zinc-500">Machine:</span> {selectedTask.machineName}</div>
              <div><span className="font-semibold text-zinc-500">Vendor:</span> {selectedTask.vendorName || '-'}</div>
              <div><span className="font-semibold text-zinc-500">Bill No:</span> {selectedTask.billNo || '-'}</div>
              <div><span className="font-semibold text-zinc-500">Total Bill Amount:</span> ₹{selectedTask.totalBillAmount || 0}</div>
              <div><span className="font-semibold text-zinc-500">To Be Paid Amount:</span> <span className="font-bold text-emerald-600">₹{selectedTask.toBePaidAmount || 0}</span></div>
            </div>

            <form onSubmit={handleCompletePayment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Planned Payment Date</label>
                <input
                  type="date"
                  value={paymentDates.planned4}
                  onChange={(e) => setPaymentDates({ ...paymentDates, planned4: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Actual Settlement Date</label>
                <input
                  type="date"
                  value={paymentDates.actual4}
                  onChange={(e) => setPaymentDates({ ...paymentDates, actual4: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="h-9 px-4 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold hover:bg-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="h-9 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {submittingPayment ? 'Saving…' : 'Mark Payment Complete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Advance Payment Modal */}
      {showAdvanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Log Advance / Repair Payment</h3>
              <button onClick={() => setShowAdvanceModal(false)} className="text-zinc-400 hover:text-zinc-600 text-sm font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateAdvance} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Repair Task No.</label>
                  <input
                    type="text"
                    placeholder="e.g. TS-001"
                    value={advanceForm.taskNo}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, taskNo: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Firm Name</label>
                  <select
                    value={advanceForm.firmName}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, firmName: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  >
                    <option value="Pmmpl">PMMPL</option>
                    <option value="Purab">Purab</option>
                    <option value="Rkl">RKL</option>
                    <option value="Refrasynth">Refrasynth</option>
                    <option value="Refratech">Refratech</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Machine Name</label>
                  <input
                    type="text"
                    placeholder="Machine Name"
                    value={advanceForm.machineName}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, machineName: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Vendor Name</label>
                  <input
                    type="text"
                    placeholder="Vendor Name"
                    value={advanceForm.vendorName}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, vendorName: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Bill No.</label>
                  <input
                    type="text"
                    placeholder="Bill No."
                    value={advanceForm.billNo}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, billNo: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Payment Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={advanceForm.amount}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Remarks</label>
                <textarea
                  rows="2"
                  placeholder="Advance / Payment remarks..."
                  value={advanceForm.remarks}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, remarks: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAdvanceModal(false)}
                  className="h-9 px-4 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold hover:bg-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdvance}
                  className="h-9 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {submittingAdvance ? 'Saving…' : 'Log Payment Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
