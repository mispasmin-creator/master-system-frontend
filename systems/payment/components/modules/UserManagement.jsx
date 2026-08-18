import React, { useState, useEffect, useMemo } from 'react';
import { paymentApi } from '../../lib/api';
import { 
  Users, Plus, Search, Edit2, Trash2, ShieldAlert, AlertCircle, 
  CheckCircle2, Building2, Key, Shield, UserPlus, X, Check, ChevronDown, ChevronRight
} from 'lucide-react';
import {
  SYSTEM_REGISTRY,
  ALL_FIRMS,
  getVisiblePages,
  buildAllSystemPermissions,
} from '@/systems/core/config/systemRegistry';

const FIRM_OPTIONS = ALL_FIRMS;
const PAGE_OPTIONS = getVisiblePages("payment").map((p) => p.key);

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [firmsList, setFirmsList] = useState(FIRM_OPTIONS);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [firmFilter, setFirmFilter] = useState('All');

  // Modal Dialog states
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingUsername, setEditingUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Maker');
  const [status, setStatus] = useState('Active');
  const [selectedFirms, setSelectedFirms] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);

  // Delete Confirm Dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, masterRes] = await Promise.all([
        paymentApi.get('settings'),
        paymentApi.get('master')
      ]);

      if (usersRes.success && usersRes.data) {
        setUsers(usersRes.data);
      }
      if (masterRes.success && masterRes.data?.firms) {
        setFirmsList(masterRes.data.firms);
      }
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingUsername('');
    setUsername('');
    setPassword('');
    setName('');
    setRole('Maker');
    setStatus('Active');
    setSelectedFirms([FIRM_OPTIONS[0]]);
    setSelectedPages(["Dashboard", "Payment Creation"]);
    setError('');
    setSuccess('');
    setModalOpen(true);
  };

  const openEditModal = (u) => {
    setIsEditing(true);
    setEditingUsername(u.username);
    setUsername(u.username);
    setPassword(''); // leave empty unless changing
    setName(u.name || u.username);
    setRole(u.role || 'Maker');
    setStatus(u.status || 'Active');

    const uFirms = u.firms ? u.firms.split(',').map(f => f.trim()) : [];
    setSelectedFirms(uFirms);

    const uPages = u.pages ? u.pages.split(',').map(p => p.trim()) : [];
    setSelectedPages(uPages);

    setError('');
    setSuccess('');
    setModalOpen(true);
  };

  const toggleFirm = (f) => {
    if (selectedFirms.includes(f)) {
      setSelectedFirms(selectedFirms.filter(item => item !== f));
    } else {
      setSelectedFirms([...selectedFirms, f]);
    }
  };

  const togglePage = (p) => {
    if (selectedPages.includes(p)) {
      setSelectedPages(selectedPages.filter(item => item !== p));
    } else {
      setSelectedPages([...selectedPages, p]);
    }
  };

  const [expandedSystems, setExpandedSystems] = useState({});

  const toggleSystemExpand = (sysKey) => {
    setExpandedSystems((prev) => ({ ...prev, [sysKey]: !prev[sysKey] }));
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username.trim() || !name.trim()) {
      setError("Full name and username are required.");
      return;
    }

    if (!isEditing && !password) {
      setError("Password is required for new users.");
      return;
    }

    if (role !== 'Admin') {
      if (selectedFirms.length === 0) {
        setError("Please select at least one assigned firm.");
        return;
      }
      if (selectedPages.length === 0) {
        setError("Please select at least one permitted page.");
        return;
      }
    }

    try {
      setIsSubmitting(true);

      let pagesValue;
      if (role === 'Admin') {
        const { generatedPageFirms } = buildAllSystemPermissions(false);
        pagesValue = JSON.stringify(generatedPageFirms);
      } else {
        pagesValue = selectedPages.join(', ');
      }

      const payload = {
        username: username.trim(),
        name: name.trim(),
        role: role,
        status: status,
        firms: role === 'Admin' ? 'all' : selectedFirms.join(', '),
        pages: pagesValue,
      };

      if (password) payload.password = password;

      let res;
      if (isEditing) {
        res = await paymentApi.put(`settings/${editingUsername}`, payload);
      } else {
        res = await paymentApi.post('settings', payload);
      }

      if (res.success) {
        setSuccess(`User successfully ${isEditing ? 'updated' : 'created'}!`);
        setTimeout(() => {
          setModalOpen(false);
          loadData();
        }, 600);
      } else {
        setError(res.error || "Operation failed.");
      }
    } catch (err) {
      setError(err.message || "Failed to save user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerDeleteUser = (uUsername) => {
    setUserToDelete(uUsername);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      const res = await paymentApi.delete(`settings/${userToDelete}`);
      if (res.success) {
        setDeleteConfirmOpen(false);
        loadData();
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const uName = (u.name || u.Name || '');
      const uUsername = (u.username || u.Username || '');
      const uFirms = (u.firms || u.Firms || '');

      const matchesSearch = !search.trim() ||
        uName.toLowerCase().includes(search.toLowerCase()) ||
        uUsername.toLowerCase().includes(search.toLowerCase());

      const matchesFirm = firmFilter === 'All' || 
        uFirms.toLowerCase().includes(firmFilter.toLowerCase());

      return matchesSearch && matchesFirm;
    });
  }, [users, search, firmFilter]);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            User Management &amp; Permissions
          </h1>
          <p className="text-xs text-zinc-500 mt-1">Configure user accounts, assign firm scopes, and control system page access permissions.</p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2 shrink-0 self-start sm:self-auto"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add New User</span>
        </button>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search user name or username..."
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-zinc-500 font-semibold">Firm Scope:</span>
          <select
            value={firmFilter}
            onChange={(e) => setFirmFilter(e.target.value)}
            className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs outline-none"
          >
            <option value="All">All Firms</option>
            {firmsList.map((f, idx) => (
              <option key={idx} value={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead className="bg-zinc-50 dark:bg-zinc-950 uppercase text-[10px] text-zinc-400 font-bold border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="px-5 py-3.5">User Info</th>
              <th className="px-5 py-3.5">Role</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5">Assigned Firms</th>
              <th className="px-5 py-3.5">Permitted Pages</th>
              <th className="px-5 py-3.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-zinc-400 italic">No user accounts found matching query.</td>
              </tr>
            ) : (
              filteredUsers.map(u => (
                <tr key={u.username} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10">
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-zinc-900 dark:text-zinc-100">{u.name || u.username}</div>
                    <div className="text-[10px] font-mono text-zinc-400">@{u.username}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 font-bold text-[10px] text-emerald-600">
                      <CheckCircle2 className="h-3 w-3" />
                      Active
                    </span>
                  </td>
                  <td className="px-5 py-3.5 max-w-[220px]">
                    <p className="truncate font-medium text-zinc-700 dark:text-zinc-300" title={u.firms}>{u.firms || 'All Firms'}</p>
                  </td>
                  <td className="px-5 py-3.5 max-w-[250px]">
                    <p className="truncate text-zinc-500" title={u.pages}>{u.pages || 'Dashboard'}</p>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEditModal(u)}
                        className="p-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors"
                        title="Edit User"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => triggerDeleteUser(u.username)}
                        className="p-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 rounded-lg transition-colors"
                        title="Delete User"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* User Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100">
                {isEditing ? `Edit User: @${editingUsername}` : 'Create New System User'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl text-xs font-bold">
                {success}
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isEditing}
                    placeholder="e.g. jdoe"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-60 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1">Password {isEditing && '(leave blank to keep unchanged)'}</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1">System Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 outline-none font-semibold"
                  >
                    {["Maker", "Checker", "Approver", "Finance", "Admin"].map((r, i) => (
                      <option key={i} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Firm Selection */}
              {role !== 'Admin' && (
                <div>
                  <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1">Assigned Firms</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                    {firmsList.map((f, idx) => {
                      const isChecked = selectedFirms.includes(f);
                      return (
                        <label key={idx} className="flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300 font-medium text-xs">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleFirm(f)}
                            className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>{f}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Page Access Selection */}
              <div>
                <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1">Permitted Pages</label>
                {role === 'Admin' ? (
                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 bg-zinc-50 dark:bg-zinc-950 space-y-2">
                    <div className="flex items-center justify-between px-2 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-700 dark:text-zinc-300">
                      <span className="font-semibold">Admin Mode: Full access across all 11 systems and 9 firms</span>
                      <span className="text-[10px] font-mono text-zinc-500">All 9 Firms Included</span>
                    </div>

                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto custom-scrollbar">
                      {Object.entries(SYSTEM_REGISTRY).map(([sysKey, sysConfig]) => {
                        const isExpanded = !!expandedSystems[sysKey];
                        const visiblePages = getVisiblePages(sysKey);

                        return (
                          <div key={sysKey} className="border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => toggleSystemExpand(sysKey)}
                              className="w-full flex items-center justify-between p-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left"
                            >
                              <div className="flex items-center gap-2">
                                {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-zinc-500" /> : <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />}
                                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{sysConfig.label}</span>
                                <span className="text-[10px] text-zinc-400">({visiblePages.length} pages)</span>
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Full Access
                              </span>
                            </button>

                            {isExpanded && (
                              <div className="px-3 pb-3 pt-1 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50">
                                <div className="grid grid-cols-2 gap-1.5">
                                  {visiblePages.map((page) => (
                                    <div
                                      key={page.key}
                                      className="flex items-center gap-1.5 p-1 rounded bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400"
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                    {PAGE_OPTIONS.map((p, idx) => {
                      const isChecked = selectedPages.includes(p);
                      return (
                        <label key={idx} className="flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300 font-medium text-xs">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePage(p)}
                            className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>{p}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 font-semibold rounded-xl text-xs">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm transition-colors">
                  {isEditing ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-center">
            <ShieldAlert className="h-12 w-12 text-rose-500 mx-auto" />
            <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100">Delete User Account?</h3>
            <p className="text-xs text-zinc-500">Are you sure you want to permanently delete user <strong>@{userToDelete}</strong>? This action cannot be undone.</p>
            <div className="flex justify-center gap-3 pt-2">
              <button onClick={() => setDeleteConfirmOpen(false)} className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 font-semibold rounded-xl text-xs">Cancel</button>
              <button onClick={confirmDeleteUser} className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-sm">Confirm Delete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
