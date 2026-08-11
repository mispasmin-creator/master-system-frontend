import React, { useEffect, useState } from 'react';
import { repairApi } from '../../lib/api';

export default function Accounts() {
  const [accountsData, setAccountsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStepTab, setActiveStepTab] = useState('audit'); // 'audit' | 'rectify' | 'reaudit' | 'tally'

  const [selectedTask, setSelectedTask] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [auditForm, setAuditForm] = useState({
    status: 'Complete',
    remarks: '',
    actualDate: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await repairApi.get('/accounts');
      if (res.success) {
        setAccountsData(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load Accounts audit data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAuditModal = (task) => {
    setSelectedTask(task);
    const stepObj = task.steps?.[activeStepTab] || {};
    setAuditForm({
      status: stepObj.status || 'Complete',
      remarks: stepObj.remarks || '',
      actualDate: new Date().toISOString().split('T')[0]
    });
  };

  const handleSaveAudit = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;

    setSubmitting(true);
    try {
      const payload = {
        step: activeStepTab,
        ...auditForm
      };

      const res = await repairApi.post(`/accounts/${selectedTask.taskNo}`, payload);
      if (res.success) {
        setSelectedTask(null);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to save Accounts audit step:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Step Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Repair Accounts Audit</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">4-step Accounts verification pipeline for repair vouchers and ledger entries</p>
        </div>

        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl">
          <button
            onClick={() => setActiveStepTab('audit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeStepTab === 'audit'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            1. Audit Data
          </button>
          <button
            onClick={() => setActiveStepTab('rectify')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeStepTab === 'rectify'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            2. Rectify Mistake
          </button>
          <button
            onClick={() => setActiveStepTab('reaudit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeStepTab === 'reaudit'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            3. Reaudit Data
          </button>
          <button
            onClick={() => setActiveStepTab('tally')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeStepTab === 'tally'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            4. Tally Entry
          </button>
        </div>
      </div>

      {/* Task List Table */}
      {loading ? (
        <div className="py-12 text-center">
          <div className="inline-block w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-2 text-xs text-zinc-500">Loading accounts audit steps…</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3">Task No</th>
                <th className="p-3">Firm / Department</th>
                <th className="p-3">Machine Details</th>
                <th className="p-3">Planned Date</th>
                <th className="p-3">Actual Date</th>
                <th className="p-3">Delay</th>
                <th className="p-3">Audit Status</th>
                <th className="p-3">Remarks</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
              {accountsData.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-6 text-center text-zinc-400">No repair tasks in accounts pipeline.</td>
                </tr>
              ) : (
                accountsData.map((task) => {
                  const currentStep = task.steps?.[activeStepTab] || {};
                  return (
                    <tr key={task.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="p-3 font-bold text-zinc-900 dark:text-white">{task.taskNo}</td>
                      <td className="p-3">
                        <div className="font-semibold text-zinc-900 dark:text-white">{task.firmName}</div>
                        <div className="text-[11px] text-zinc-400">{task.department || '-'} | {task.location || '-'}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-zinc-900 dark:text-white">{task.machineName || 'N/A'}</div>
                        <div className="text-[11px] text-zinc-400">SN: {task.serialNo || '-'}</div>
                      </td>
                      <td className="p-3 text-zinc-600 dark:text-zinc-300">
                        {currentStep.planned ? new Date(currentStep.planned).toLocaleDateString() : '-'}
                      </td>
                      <td className="p-3 text-zinc-600 dark:text-zinc-300">
                        {currentStep.actual ? new Date(currentStep.actual).toLocaleDateString() : '-'}
                      </td>
                      <td className="p-3 font-semibold text-zinc-900 dark:text-white">
                        {currentStep.delay || 0} days
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          (currentStep.status || '').toLowerCase() === 'complete' || (currentStep.status || '').toLowerCase() === 'audited'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                        }`}>
                          {currentStep.status || 'Pending'}
                        </span>
                      </td>
                      <td className="p-3 text-zinc-600 dark:text-zinc-300 max-w-xs truncate">{currentStep.remarks || '-'}</td>
                      <td className="p-3">
                        <button
                          onClick={() => openAuditModal(task)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-colors"
                        >
                          Update Audit Step
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Audit Action Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Update Accounts Audit ({activeStepTab.toUpperCase()}) — Task {selectedTask.taskNo}</h3>
              <button onClick={() => setSelectedTask(null)} className="text-zinc-400 hover:text-zinc-600 text-sm font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveAudit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Audit Status</label>
                <select
                  value={auditForm.status}
                  onChange={(e) => setAuditForm({ ...auditForm, status: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                >
                  <option value="Complete">Complete / Audited</option>
                  <option value="Pending">Pending</option>
                  <option value="Rectification Needed">Rectification Needed</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Actual Audit Date</label>
                <input
                  type="date"
                  value={auditForm.actualDate}
                  onChange={(e) => setAuditForm({ ...auditForm, actualDate: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Audit Remarks</label>
                <textarea
                  rows="3"
                  placeholder="Enter audit remarks or voucher notes..."
                  value={auditForm.remarks}
                  onChange={(e) => setAuditForm({ ...auditForm, remarks: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                ></textarea>
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
                  className="h-9 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving…' : 'Save Audit Step'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
