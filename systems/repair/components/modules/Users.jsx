import React, { useEffect, useState } from 'react';
import { repairApi } from '../../lib/api';

const REPAIR_PAGE_OPTIONS = [
  { id: 'Repair_Dashboard', label: 'Dashboard' },
  { id: 'Repair_Indent', label: 'Indent' },
  { id: 'Repair_SentToVendor', label: 'Sent to Vendor' },
  { id: 'Repair_CheckMachine', label: 'Check Machine' },
  { id: 'Repair_StoreIn', label: 'Store In' },
  { id: 'Repair_MakePayment', label: 'Make Payment' },
  { id: 'Repair_Accounts', label: 'Accounts' },
  { id: 'Repair_Users', label: 'User Management' }
];

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [firmFilter, setFirmFilter] = useState('All');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'user',
    firmName: 'Pmmpl',
    accessList: []
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await repairApi.get('/settings', { firm: firmFilter, search });
      if (res.success) {
        setUsers(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load Repair users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [firmFilter, search]);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      role: 'user',
      firmName: 'Pmmpl',
      accessList: REPAIR_PAGE_OPTIONS.map((p) => p.id)
    });
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    const existingAccess = (user.access || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setFormData({
      username: user.username,
      password: user.password || '',
      role: user.role || 'user',
      firmName: user.firmName || 'Pmmpl',
      accessList: existingAccess
    });
    setShowModal(true);
  };

  const togglePageAccess = (pageId) => {
    setFormData((prev) => {
      const exists = prev.accessList.includes(pageId);
      const updated = exists
        ? prev.accessList.filter((id) => id !== pageId)
        : [...prev.accessList, pageId];
      return { ...prev, accessList: updated };
    });
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        username: formData.username,
        password: formData.password,
        role: formData.role,
        firmName: formData.firmName,
        access: formData.accessList.join(', ')
      };

      let res;
      if (editingUser) {
        res = await repairApi.put(`/settings/${editingUser.id}`, payload);
      } else {
        res = await repairApi.post('/settings', payload);
      }

      if (res.success) {
        setShowModal(false);
        fetchUsers();
      }
    } catch (err) {
      console.error('Failed to save user:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await repairApi.delete(`/settings/${userId}`);
      if (res.success) {
        fetchUsers();
      }
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Repair User Management</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Manage credentials, role assignments, firm scoping, and page access keys</p>
        </div>
        <button
          onClick={openCreateModal}
          className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
        >
          + Add New User
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search username, role..."
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
        </div>
        <span className="text-xs text-zinc-500 font-medium">Found {users.length} user(s)</span>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="py-12 text-center">
          <div className="inline-block w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-2 text-xs text-zinc-500">Loading user accounts…</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3">Username</th>
                <th className="p-3">Role</th>
                <th className="p-3">Firm Name</th>
                <th className="p-3">Page Access Permissions</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
              {users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-zinc-400">No user accounts found.</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="p-3 font-bold text-zinc-900 dark:text-white">{user.username}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-3 text-zinc-700 dark:text-zinc-300 font-semibold">{user.firmName}</td>
                    <td className="p-3 text-zinc-600 dark:text-zinc-400 max-w-md truncate">{user.access || 'All Pages'}</td>
                    <td className="p-3 space-x-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="px-2.5 py-1 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="px-2.5 py-1 rounded-md bg-red-50 hover:bg-red-100 text-red-600 font-semibold"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* User Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                {editingUser ? `Edit User — ${editingUser.username}` : 'Create New User Account'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-600 text-sm font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingUser}
                    placeholder="Enter username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Firm Scoping</label>
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
                    <option value="all">All Firms</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Repair Page Access Permissions</label>
                <div className="grid grid-cols-2 gap-2 bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  {REPAIR_PAGE_OPTIONS.map((page) => {
                    const checked = formData.accessList.includes(page.id);
                    return (
                      <label key={page.id} className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePageAccess(page.id)}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>{page.label}</span>
                      </label>
                    );
                  })}
                </div>
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
                  {submitting ? 'Saving…' : 'Save User Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
