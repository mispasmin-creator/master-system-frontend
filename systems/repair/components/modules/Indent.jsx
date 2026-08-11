import React, { useEffect, useState } from 'react';
import { repairApi } from '../../lib/api';

export default function Indent() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [firmFilter, setFirmFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Create Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState(null);

  const [formData, setFormData] = useState({
    firmName: 'Pmmpl',
    machineName: '',
    serialNo: '',
    machinePartName: '',
    givenBy: '',
    doerName: '',
    problem: '',
    priority: 'Medium',
    department: 'Maintenance',
    location: 'Plant Floor 1',
    taskStartDate: new Date().toISOString().split('T')[0],
    taskEndDate: '',
    enableReminder: false,
    requireAttachment: false
  });

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await repairApi.get('/tasks', {
        firm: firmFilter,
        stage: statusFilter,
        search
      });
      if (res.success) {
        setTasks(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch indents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [firmFilter, statusFilter, search]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await repairApi.upload(imageFile);
      }

      const payload = {
        ...formData,
        imageUrl
      };

      const res = await repairApi.post('/tasks', payload);
      if (res.success) {
        setShowModal(false);
        setImageFile(null);
        setFormData({
          firmName: 'Pmmpl',
          machineName: '',
          serialNo: '',
          machinePartName: '',
          givenBy: '',
          doerName: '',
          problem: '',
          priority: 'Medium',
          department: 'Maintenance',
          location: 'Plant Floor 1',
          taskStartDate: new Date().toISOString().split('T')[0],
          taskEndDate: '',
          enableReminder: false,
          requireAttachment: false
        });
        fetchTasks();
      }
    } catch (err) {
      console.error('Failed to create repair task:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Repair Indent Management</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Create new machine repair indents & monitor task pipeline status</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
        >
          + Create New Indent
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search task no, machine, serial, doer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 px-3 w-64 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
          />

          <select
            value={firmFilter}
            onChange={(e) => setFirmFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-900 dark:text-white"
          >
            <option value="All">All Firms</option>
            <option value="Pmmpl">PMMPL</option>
            <option value="Purab">Purab</option>
            <option value="Rkl">RKL</option>
            <option value="Refrasynth">Refrasynth</option>
            <option value="Refratech">Refratech</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-900 dark:text-white"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending Tasks</option>
            <option value="Complete">Completed Tasks</option>
          </select>
        </div>
        <span className="text-xs text-zinc-500 font-medium">Found {tasks.length} task(s)</span>
      </div>

      {/* Task List Table */}
      {loading ? (
        <div className="py-12 text-center">
          <div className="inline-block w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-2 text-xs text-zinc-500">Loading Indent tasks…</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3">Task No</th>
                <th className="p-3">Firm</th>
                <th className="p-3">Machine Details</th>
                <th className="p-3">Given By / Doer</th>
                <th className="p-3">Problem</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Department</th>
                <th className="p-3">Status</th>
                <th className="p-3">Image</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-6 text-center text-zinc-400">No repair indents found.</td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="p-3 font-bold text-zinc-900 dark:text-white">{task.taskNo}</td>
                    <td className="p-3 text-zinc-600 dark:text-zinc-300">{task.firmName}</td>
                    <td className="p-3">
                      <div className="font-semibold text-zinc-900 dark:text-white">{task.machineName || 'N/A'}</div>
                      <div className="text-[11px] text-zinc-400">SN: {task.serialNo || '-'} | Part: {task.machinePartName || '-'}</div>
                    </td>
                    <td className="p-3 text-zinc-600 dark:text-zinc-300">
                      <div>G: {task.givenBy || '-'}</div>
                      <div className="text-[11px] text-zinc-400">D: {task.doerName || '-'}</div>
                    </td>
                    <td className="p-3 max-w-xs truncate text-zinc-700 dark:text-zinc-300">{task.problem || '-'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        task.priority === 'Critical' ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400' :
                        task.priority === 'High' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' :
                        'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}>
                        {task.priority || 'Medium'}
                      </span>
                    </td>
                    <td className="p-3 text-zinc-600 dark:text-zinc-300">{task.department || '-'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        (task.status || '').toLowerCase() === 'complete'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                      }`}>
                        {task.status || 'Pending'}
                      </span>
                    </td>
                    <td className="p-3">
                      {task.imageUrl ? (
                        <a href={task.imageUrl} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline font-semibold">View</a>
                      ) : (
                        <span className="text-zinc-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Indent Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Create New Repair Indent</h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-600 text-sm font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Firm Name</label>
                  <select
                    value={formData.firmName}
                    onChange={(e) => setFormData({ ...formData, firmName: e.target.value })}
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
                    required
                    placeholder="e.g. Lathe Machine 01"
                    value={formData.machineName}
                    onChange={(e) => setFormData({ ...formData, machineName: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Serial No.</label>
                  <input
                    type="text"
                    placeholder="e.g. SN-9901"
                    value={formData.serialNo}
                    onChange={(e) => setFormData({ ...formData, serialNo: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Machine Part Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Motor Spindle"
                    value={formData.machinePartName}
                    onChange={(e) => setFormData({ ...formData, machinePartName: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Given By</label>
                  <input
                    type="text"
                    placeholder="Supervisor Name"
                    value={formData.givenBy}
                    onChange={(e) => setFormData({ ...formData, givenBy: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Doer Name</label>
                  <input
                    type="text"
                    placeholder="Technician Name"
                    value={formData.doerName}
                    onChange={(e) => setFormData({ ...formData, doerName: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Department</label>
                  <input
                    type="text"
                    placeholder="Maintenance"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Problem Description</label>
                <textarea
                  rows="2"
                  placeholder="Describe machine issue or malfunction..."
                  value={formData.problem}
                  onChange={(e) => setFormData({ ...formData, problem: e.target.value })}
                  className="w-full p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                ></textarea>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Machine Image Attachment</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-xs text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="h-9 px-4 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold hover:bg-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-9 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Create Indent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
