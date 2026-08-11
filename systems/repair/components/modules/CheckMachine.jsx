import React, { useEffect, useState } from 'react';
import { repairApi } from '../../lib/api';

export default function CheckMachine() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [masterData, setMasterData] = useState({ transporters: [] });

  const [selectedTask, setSelectedTask] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [billFile, setBillFile] = useState(null);

  const [formData, setFormData] = useState({
    planned1: new Date().toISOString().split('T')[0],
    actual1: new Date().toISOString().split('T')[0],
    transporterName: '',
    transportationAmount: 0,
    billNo: '',
    typeOfBill: 'Service Bill',
    totalBillAmount: 0,
    toBePaidAmount: 0
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [taskRes, masterRes] = await Promise.all([
        repairApi.get('/tasks'),
        repairApi.get('/master')
      ]);

      if (taskRes.success) {
        setTasks(taskRes.data || []);
      }
      if (masterRes.success && masterRes.data) {
        setMasterData(masterRes.data);
      }
    } catch (err) {
      console.error('Failed to load Check Machine tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openActionModal = (task) => {
    setSelectedTask(task);
    setFormData({
      planned1: task.planned1 ? new Date(task.planned1).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      actual1: new Date().toISOString().split('T')[0],
      transporterName: task.returnTransporterName || task.transporterName || '',
      transportationAmount: task.transportationAmount || 0,
      billNo: task.billNo || '',
      typeOfBill: task.typeOfBill || 'Service Bill',
      totalBillAmount: task.totalBillAmount || 0,
      toBePaidAmount: task.toBePaidAmount || (task.totalBillAmount || 0)
    });
  };

  const handleAdvanceStage = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;

    setSubmitting(true);
    try {
      let billImage = selectedTask.billImage;
      if (billFile) {
        billImage = await repairApi.upload(billFile);
      }

      const payload = {
        ...formData,
        billImage
      };

      const res = await repairApi.post(`/tasks/${selectedTask.taskNo}/check-machine`, payload);
      if (res.success) {
        setSelectedTask(null);
        setBillFile(null);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to update Check Machine stage:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Pending: dispatched to vendor (has actual) but not checked (no actual1)
  const pendingTasks = tasks.filter((t) => t.actual && !t.actual1);
  const completedTasks = tasks.filter((t) => !!t.actual1);
  const displayedTasks = activeTab === 'pending' ? pendingTasks : completedTasks;

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Check Machine Stage</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Inspect returned machines from vendor, record bill details &amp; transport charges</p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'pending'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Pending Inspection ({pendingTasks.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'completed'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Inspected History ({completedTasks.length})
          </button>
        </div>
      </div>

      {/* Task List Table */}
      {loading ? (
        <div className="py-12 text-center">
          <div className="inline-block w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-2 text-xs text-zinc-500">Loading inspection tasks…</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3">Task No</th>
                <th className="p-3">Machine Details</th>
                <th className="p-3">Vendor / Transporter</th>
                <th className="p-3">Bill Details</th>
                <th className="p-3">Total Bill / To Be Paid</th>
                <th className="p-3">Bill Attachment</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
              {displayedTasks.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-6 text-center text-zinc-400">No tasks in this inspection view.</td>
                </tr>
              ) : (
                displayedTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="p-3 font-bold text-zinc-900 dark:text-white">{task.taskNo}</td>
                    <td className="p-3">
                      <div className="font-semibold text-zinc-900 dark:text-white">{task.machineName || 'N/A'}</div>
                      <div className="text-[11px] text-zinc-400">SN: {task.serialNo || '-'}</div>
                    </td>
                    <td className="p-3 text-zinc-700 dark:text-zinc-300">
                      <div>V: {task.vendorName || '-'}</div>
                      <div className="text-[11px] text-zinc-400">T: {task.returnTransporterName || task.transporterName || '-'}</div>
                    </td>
                    <td className="p-3 text-zinc-600 dark:text-zinc-300">
                      <div>Bill No: {task.billNo || '-'}</div>
                      <div className="text-[11px] text-zinc-400">Type: {task.typeOfBill || '-'}</div>
                    </td>
                    <td className="p-3 text-zinc-900 dark:text-zinc-100 font-semibold">
                      <div>₹{task.totalBillAmount || 0}</div>
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400">Payable: ₹{task.toBePaidAmount || 0}</div>
                    </td>
                    <td className="p-3">
                      {task.billImage ? (
                        <a href={task.billImage} target="_blank" rel="noreferrer" className="text-purple-600 hover:underline font-semibold">View Bill</a>
                      ) : (
                        <span className="text-zinc-400">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => openActionModal(task)}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-sm transition-colors"
                      >
                        {task.actual1 ? 'Edit Inspection' : 'Inspect Machine'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Check Machine Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Check Machine &amp; Bill Entry — Task {selectedTask.taskNo}</h3>
              <button onClick={() => setSelectedTask(null)} className="text-zinc-400 hover:text-zinc-600 text-sm font-bold">✕</button>
            </div>

            <form onSubmit={handleAdvanceStage} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Return Transporter Name</label>
                  <input
                    type="text"
                    placeholder="Return Transporter"
                    list="check-transporters"
                    value={formData.transporterName}
                    onChange={(e) => setFormData({ ...formData, transporterName: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                  <datalist id="check-transporters">
                    {masterData.transporters?.map((t, i) => <option key={i} value={t} />)}
                  </datalist>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Transportation Amount (₹)</label>
                  <input
                    type="number"
                    value={formData.transportationAmount}
                    onChange={(e) => setFormData({ ...formData, transportationAmount: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Bill No.</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INV-2026-001"
                    value={formData.billNo}
                    onChange={(e) => setFormData({ ...formData, billNo: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Type of Bill</label>
                  <input
                    type="text"
                    placeholder="e.g. Repair Bill / Service Invoice"
                    value={formData.typeOfBill}
                    onChange={(e) => setFormData({ ...formData, typeOfBill: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Total Bill Amount (₹)</label>
                  <input
                    type="number"
                    value={formData.totalBillAmount}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setFormData({ ...formData, totalBillAmount: val, toBePaidAmount: val });
                    }}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">To Be Paid Amount (₹)</label>
                  <input
                    type="number"
                    value={formData.toBePaidAmount}
                    onChange={(e) => setFormData({ ...formData, toBePaidAmount: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Bill Image / Attachment</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => e.target.files && setBillFile(e.target.files[0])}
                  className="w-full text-xs text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
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
                  disabled={submitting}
                  className="h-9 px-5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving…' : 'Save Inspection Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
