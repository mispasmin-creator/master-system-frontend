import React, { useEffect, useState } from 'react';
import { repairApi } from '../../lib/api';

export default function StoreIn() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  const [selectedTask, setSelectedTask] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [productFile, setProductFile] = useState(null);

  const [formData, setFormData] = useState({
    planned2: new Date().toISOString().split('T')[0],
    actual2: new Date().toISOString().split('T')[0],
    receivedQuantity: 1,
    billMatch: 'Yes'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await repairApi.get('/tasks');
      if (res.success) {
        setTasks(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load Store In tasks:', err);
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
      planned2: task.planned2 ? new Date(task.planned2).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      actual2: new Date().toISOString().split('T')[0],
      receivedQuantity: task.receivedQuantity || 1,
      billMatch: task.billMatch || 'Yes'
    });
  };

  const handleAdvanceStage = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;

    setSubmitting(true);
    try {
      let productImage = selectedTask.productImage;
      if (productFile) {
        productImage = await repairApi.upload(productFile);
      }

      const payload = {
        ...formData,
        productImage
      };

      const res = await repairApi.post(`/tasks/${selectedTask.taskNo}/store-in`, payload);
      if (res.success) {
        setSelectedTask(null);
        setProductFile(null);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to update Store In stage:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Pending: inspected (has actual1) but not received in store (no actual2)
  const pendingTasks = tasks.filter((t) => t.actual1 && !t.actual2);
  const completedTasks = tasks.filter((t) => !!t.actual2);
  const displayedTasks = activeTab === 'pending' ? pendingTasks : completedTasks;

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Store In Stage</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Receive repaired machine back into store inventory &amp; confirm physical bill match</p>
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
            Pending Store Receipt ({pendingTasks.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'completed'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Store Received History ({completedTasks.length})
          </button>
        </div>
      </div>

      {/* Task List Table */}
      {loading ? (
        <div className="py-12 text-center">
          <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-2 text-xs text-zinc-500">Loading store receipt tasks…</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3">Task No</th>
                <th className="p-3">Machine Details</th>
                <th className="p-3">Bill Details</th>
                <th className="p-3">Received Qty</th>
                <th className="p-3">Bill Match</th>
                <th className="p-3">Product Photo</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
              {displayedTasks.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-6 text-center text-zinc-400">No tasks in this store receipt view.</td>
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
                      <div>Bill: {task.billNo || '-'}</div>
                      <div className="text-[11px] text-zinc-400">Amount: ₹{task.totalBillAmount || 0}</div>
                    </td>
                    <td className="p-3 font-semibold text-zinc-900 dark:text-zinc-100">{task.receivedQuantity || 0} unit(s)</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        task.billMatch === 'Yes' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                      }`}>
                        {task.billMatch || 'Pending'}
                      </span>
                    </td>
                    <td className="p-3">
                      {task.productImage ? (
                        <a href={task.productImage} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-semibold">View Product Photo</a>
                      ) : (
                        <span className="text-zinc-400">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => openActionModal(task)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-colors"
                      >
                        {task.actual2 ? 'Edit Store Receipt' : 'Receive in Store'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Store In Action Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Store Receipt Entry — Task {selectedTask.taskNo}</h3>
              <button onClick={() => setSelectedTask(null)} className="text-zinc-400 hover:text-zinc-600 text-sm font-bold">✕</button>
            </div>

            <form onSubmit={handleAdvanceStage} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Planned Date</label>
                  <input
                    type="date"
                    value={formData.planned2}
                    onChange={(e) => setFormData({ ...formData, planned2: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Actual Receipt Date</label>
                  <input
                    type="date"
                    value={formData.actual2}
                    onChange={(e) => setFormData({ ...formData, actual2: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Received Quantity</label>
                  <input
                    type="number"
                    value={formData.receivedQuantity}
                    onChange={(e) => setFormData({ ...formData, receivedQuantity: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Physical Bill Match</label>
                  <select
                    value={formData.billMatch}
                    onChange={(e) => setFormData({ ...formData, billMatch: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  >
                    <option value="Yes">Yes (Matched)</option>
                    <option value="No">No (Mismatch)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Repaired Product Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files && setProductFile(e.target.files[0])}
                  className="w-full text-xs text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
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
                  className="h-9 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving…' : 'Save Store Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
