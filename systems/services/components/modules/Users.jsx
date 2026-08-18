import React, { useEffect, useState } from 'react';
import { servicesApi } from '../../lib/api';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';
import {
  SYSTEM_REGISTRY,
  ALL_FIRMS,
  getVisiblePages,
  buildAllSystemPermissions,
} from '@/systems/core/config/systemRegistry';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expandedSystems, setExpandedSystems] = useState({});

  const toggleSystemExpand = (sysKey) => {
    setExpandedSystems((prev) => ({ ...prev, [sysKey]: !prev[sysKey] }));
  };

  const availablePages = getVisiblePages("services");

  const [form, setForm] = useState({
    username: '',
    password: '',
    name: '',
    role: 'user',
    firms: 'PMMPL',
    selectedPages: availablePages.map((p) => p.key)
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await servicesApi.get('/settings');
      if (res.success) {
        setUsers(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setForm({
      username: '',
      password: '',
      name: '',
      role: 'user',
      firms: 'PMMPL',
      selectedPages: ['Services_Dashboard', 'Services_Offers', 'Services_Services', 'Services_Bills', 'Services_Tally', 'Services_Utility', 'Services_Reports']
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    const pageAccessList = (user.pages || '')
      .split(',')
      .map((p) => p.trim())
      .map((p) => (p.startsWith('Services_') ? p : `Services_${p}`));

    setForm({
      username: user.username,
      password: '',
      name: user.name || user.username,
      role: user.role || 'user',
      firms: user.firms || 'PMMPL',
      selectedPages: pageAccessList
    });
    setIsModalOpen(true);
  };

  const handlePageToggle = (key) => {
    setForm((prev) => {
      const exists = prev.selectedPages.includes(key);
      const next = exists ? prev.selectedPages.filter((p) => p !== key) : [...prev.selectedPages, key];
      return { ...prev, selectedPages: next };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username) {
      alert('Username is required.');
      return;
    }
    setSaving(true);
    try {
      let pagesValue = form.selectedPages.join(', ');
      if (form.role === 'admin' || form.role === 'viewer') {
        const { generatedPageFirms } = buildAllSystemPermissions(form.role === 'viewer');
        pagesValue = JSON.stringify(generatedPageFirms);
      }

      const payload = {
        username: form.username,
        password: form.password,
        name: form.name,
        role: form.role,
        firms: (form.role === 'admin' || form.role === 'viewer') ? 'all' : form.firms,
        pages: pagesValue,
      };

      let res;
      if (editingUser) {
        res = await servicesApi.put(`/settings/${editingUser.username}`, payload);
      } else {
        res = await servicesApi.post('/settings', payload);
      }

      if (res.success) {
        setIsModalOpen(false);
        fetchUsers();
      }
    } catch (err) {
      alert(`Error saving user: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (username) => {
    if (!confirm(`Are you sure you want to delete user @${username}?`)) return;
    try {
      const res = await servicesApi.delete(`/settings/${username}`);
      if (res.success) {
        fetchUsers();
      }
    } catch (err) {
      alert(`Error deleting user: ${err.message}`);
    }
  };

  const filteredUsers = users.filter((u) =>
    (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Services User Management</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Manage system access roles, firm scoping, and page permissions for Services module</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-1.5"
        >
          <span>+ Add User</span>
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          placeholder="Search username or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 px-3 w-64 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none"
        />
        <span className="text-xs text-zinc-500">{filteredUsers.length} Users</span>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 font-semibold border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="p-3">Username</th>
              <th className="p-3">Full Name</th>
              <th className="p-3">Role</th>
              <th className="p-3">Firm Scope</th>
              <th className="p-3">Page Access Permissions</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-zinc-500">Loading users...</td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-zinc-500">No users found.</td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="p-3 font-semibold text-zinc-900 dark:text-white">@{u.username}</td>
                  <td className="p-3 font-medium">{u.name || '-'}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 capitalize">
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3">{u.firms || 'All'}</td>
                  <td className="p-3 max-w-xs truncate text-zinc-500" title={u.pages}>
                    {u.pages || 'All'}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(u.username)}
                        className="px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
              {editingUser ? `Edit User @${editingUser.username}` : 'Add New User'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingUser}
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    {editingUser ? 'Password (Leave blank to keep)' : 'Password *'}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
              </div>

              {form.role !== 'admin' && form.role !== 'viewer' && (
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Firm Scope</label>
                  <input
                    type="text"
                    placeholder="PMMPL, PMM Logisol..."
                    value={form.firms}
                    onChange={(e) => setForm({ ...form, firms: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
              )}

              {/* Page Access Permissions */}
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Services Page Permissions</label>
                {form.role === 'admin' || form.role === 'viewer' ? (
                  <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 bg-zinc-50 dark:bg-zinc-800/40 space-y-2">
                    <div className="flex items-center justify-between px-2 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-700 dark:text-zinc-300">
                      <span className="font-semibold">
                        {form.role === 'viewer'
                          ? 'Viewer Mode: Read-only access across all 11 systems and 9 firms'
                          : 'Admin Mode: Full access across all 11 systems and 9 firms'}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">All 9 Firms Included</span>
                    </div>

                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar">
                      {Object.entries(SYSTEM_REGISTRY).map(([sysKey, sysConfig]) => {
                        const isExpanded = !!expandedSystems[sysKey];
                        const visiblePages = getVisiblePages(sysKey);

                        return (
                          <div key={sysKey} className="border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => toggleSystemExpand(sysKey)}
                              className="w-full flex items-center justify-between p-2 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors text-left"
                            >
                              <div className="flex items-center gap-2">
                                {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-zinc-400" /> : <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />}
                                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{sysConfig.label}</span>
                                <span className="text-[10px] text-zinc-400">({visiblePages.length} pages)</span>
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {form.role === 'viewer' ? 'View Granted' : 'Full Access'}
                              </span>
                            </button>

                            {isExpanded && (
                              <div className="px-2.5 pb-2.5 pt-1 border-t border-zinc-100 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50">
                                <div className="grid grid-cols-2 gap-1">
                                  {visiblePages.map((page) => (
                                    <div
                                      key={page.key}
                                      className="flex items-center gap-1.5 p-1 rounded bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 text-[11px] text-zinc-600 dark:text-zinc-400"
                                    >
                                      <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                                      <span className="truncate">{page.label || page.key}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                    {availablePages.map((p) => {
                      const isChecked = form.selectedPages.includes(p.key);
                      return (
                        <label key={p.key} className="flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handlePageToggle(p.key)}
                            className="rounded border-zinc-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>{p.label}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-9 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {saving ? 'Saving...' : 'Save User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
