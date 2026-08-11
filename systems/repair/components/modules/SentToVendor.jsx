import React, { useEffect, useState } from 'react';
import { repairApi } from '../../lib/api';

export default function SentToVendor() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'completed'
  const [masterData, setMasterData] = useState({ vendors: [], transporters: [] });

  // Action Modal State
  const [selectedTask, setSelectedTask] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [weighmentFile, setWeighmentFile] = useState(null);
  const [transportingFile, setTransportingFile] = useState(null);

  const [formData, setFormData] = useState({
    planned: new Date().toISOString().split('T')[0],
    actual: new Date().toISOString().split('T')[0],
    vendorName: '',
    leadTimeToDeliverDays: 7,
    transporterName: '',
    transportationCharges: 0,
    paymentType: 'Advance',
    howMuch: 0
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
      console.error('Failed to load Sent to Vendor tasks:', err);
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
      planned: task.planned ? new Date(task.planned).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      actual: new Date().toISOString().split('T')[0],
      vendorName: task.vendorName || (masterData.vendors[0] || ''),
      leadTimeToDeliverDays: task.leadTimeToDeliverDays || 7,
      transporterName: task.transporterName || (masterData.transporters[0] || ''),
      transportationCharges: task.transportationCharges || 0,
      paymentType: task.paymentType || 'Advance',
      howMuch: task.howMuch || 0
    });
  };

  const handleAdvanceStage = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;

    setSubmitting(true);
    try {
      let weighmentSlip = selectedTask.weighmentSlip;
      if (weighmentFile) {
        weighmentSlip = await repairApi.upload(weighmentFile);
      }

      let transportingImageWithMachine = selectedTask.transportingImageWithMachine;
      if (transportingFile) {
        transportingImageWithMachine = await repairApi.upload(transportingFile);
      }

      const payload = {
        ...formData,
        weighmentSlip,
        transportingImageWithMachine
      };

      const res = await repairApi.post(`/tasks/${selectedTask.taskNo}/sent-to-vendor`, payload);
      if (res.success) {
        setSelectedTask(null);
        setWeighmentFile(null);
        setTransportingFile(null);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to advance Sent to Vendor stage:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter tasks
  const pendingTasks = tasks.filter((t) => !t.actual);
  const completedTasks = tasks.filter((t) => !!t.actual);
  const displayedTasks = activeTab === 'pending' ? pendingTasks : completedTasks;

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Sent to Vendor Stage</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Dispatch machine for vendor repair, assign transporter, and log advance payments</p>
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
            Pending Dispatch ({pendingTasks.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'completed'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Dispatched History ({completedTasks.length})
          </button>
        </div>
      </div>

      {/* Task List Table */}
      {loading ? (
        <div className="py-12 text-center">
          <div className="inline-block w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-2 text-xs text-zinc-500">Loading stage tasks…</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3">Task No</th>
                <th className="p-3">Firm / Machine</th>
                <th className="p-3">Vendor / Transporter</th>
                <th className="p-3">Dates (Planned / Actual)</th>
                <th className="p-3">Delay</th>
                <th className="p-3">Payment Info</th>
                <th className="p-3">Slips &amp; Images</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
              {displayedTasks.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-6 text-center text-zinc-400">No tasks in this stage view.</td>
                </tr>
              ) : (
                displayedTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="p-3 font-bold text-zinc-900 dark:text-white">{task.taskNo}</td>
                    <td className="p-3">
                      <div className="font-semibold text-zinc-900 dark:text-white">{task.machineName || 'N/A'}</div>
                      <div className="text-[11px] text-zinc-400">{task.firmName} | SN: {task.serialNo || '-'}</div>
                    </td>
                    <td className="p-3 text-zinc-700 dark:text-zinc-300">
                      <div>V: {task.vendorName || '-'}</div>
                      <div className="text-[11px] text-zinc-400">T: {task.transporterName || '-'}</div>
                    </td>
                    <td className="p-3 text-zinc-600 dark:text-zinc-300">
                      <div>P: {task.planned ? new Date(task.planned).toLocaleDateString() : '-'}</div>
                      <div>A: {task.actual ? new Date(task.actual).toLocaleDateString() : '-'}</div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        (task.delay || 0) > 0 ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                      }`}>
                        {task.delay || 0} days
                      </span>
                    </td>
                    <td className="p-3 text-zinc-600 dark:text-zinc-300">
                      <div>{task.paymentType || '-'}</div>
                      <div className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">
                        ₹{task.howMuch || task.transportationCharges || 0}
                      </div>
                    </td>
                    <td className="p-3 space-y-1">
                      {task.weighmentSlip && (
                        <div><a href={task.weighmentSlip} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline text-[11px]">Weighment Slip</a></div>
                      )}
                      {task.transportingImageWithMachine && (
                        <div><a href={task.transportingImageWithMachine} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline text-[11px]">Machine Photo</a></div>
                      )}
                      {!task.weighmentSlip && !task.transportingImageWithMachine && <span className="text-zinc-400">-</span>}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => openActionModal(task)}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-colors"
                      >
                        {task.actual ? 'Edit Dispatch' : 'Dispatch Machine'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Dispatch Action Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Dispatch to Vendor — Task {selectedTask.taskNo}</h3>
              <button onClick={() => setSelectedTask(null)} className="text-zinc-400 hover:text-zinc-600 text-sm font-bold">✕</button>
            </div>

            <form onSubmit={handleAdvanceStage} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Vendor Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter or select vendor"
                    list="vendors-list"
                    value={formData.vendorName}
                    onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                  <datalist id="vendors-list">
                    {masterData.vendors?.map((v, i) => <option key={i} value={v} />)}
                  </datalist>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Transporter Name</label>
                  <input
                    type="text"
                    placeholder="Enter or select transporter"
                    list="transporters-list"
                    value={formData.transporterName}
                    onChange={(e) => setFormData({ ...formData, transporterName: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                  <datalist id="transporters-list">
                    {masterData.transporters?.map((t, i) => <option key={i} value={t} />)}
                  </datalist>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Planned Date</label>
                  <input
                    type="date"
                    value={formData.planned}
                    onChange={(e) => setFormData({ ...formData, planned: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Actual Dispatch Date</label>
                  <input
                    type="date"
                    value={formData.actual}
                    onChange={(e) => setFormData({ ...formData, actual: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Lead Time (Days)</label>
                  <input
                    type="number"
                    value={formData.leadTimeToDeliverDays}
                    onChange={(e) => setFormData({ ...formData, leadTimeToDeliverDays: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Transportation Charges (₹)</label>
                  <input
                    type="number"
                    value={formData.transportationCharges}
                    onChange={(e) => setFormData({ ...formData, transportationCharges: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Payment Type</label>
                  <select
                    value={formData.paymentType}
                    onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  >
                    <option value="Advance">Advance</option>
                    <option value="Full">Full Payment</option>
                    <option value="Credit">Credit</option>
                  </select>
                </div>

                {formData.paymentType === 'Advance' && (
                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Advance Amount (₹)</label>
                    <input
                      type="number"
                      value={formData.howMuch}
                      onChange={(e) => setFormData({ ...formData, howMuch: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Weighment Slip Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files && setWeighmentFile(e.target.files[0])}
                  className="w-full text-xs text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Transporting Machine Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files && setTransportingFile(e.target.files[0])}
                  className="w-full text-xs text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
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
                  className="h-9 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving…' : 'Save Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
