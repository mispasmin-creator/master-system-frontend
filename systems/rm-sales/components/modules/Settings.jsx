import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  UserPlus,
  Users,
  ChevronDown,
  ChevronRight,
  Check
} from 'lucide-react';
import { useApp, ROLES } from '../../context/AppContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { cn, parseMultiValue, hasPageAccess } from '../../lib/utils';
import { API_URL, getToken } from '@/lib/auth';
import {
  SYSTEM_REGISTRY,
  ALL_FIRMS,
  getVisiblePages,
  buildAllSystemPermissions,
} from '@/systems/core/config/systemRegistry';

const PAGE_ACCESS_OPTIONS = [
  { value: ROLES.ADMIN, label: 'Admin (All actions)' },
  { value: ROLES.SALES, label: 'RM Sales - Sales' },
  { value: ROLES.LOGISTICS, label: 'RM Sales - Logistics' },
  { value: ROLES.ACCOUNTS, label: 'RM Sales - Invoices' }
];

export const SettingsModule = () => {
  const { 
    currentUser,
    addNotification 
  } = useApp();

  const [usersList, setUsersList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formUser, setFormUser] = useState({ username: '', password: '', role: 'user', page_access: 'RM Sales - Sales', firm_name: '' });
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsersList();
  }, []);

  const fetchUsersList = async () => {
    try {
      const res = await fetch(`${API_URL}/users/manage`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setUsersList(data.data);
      }
    } catch (e) {
      console.error("Failed to load user management list", e);
    }
  };

  const togglePasswordVisibility = (username) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [username]: !prev[username]
    }));
  };

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormUser({ username: '', password: '', role: 'user', page_access: 'RM Sales - Sales', firm_name: '' });
    setModalError('');
    setShowModal(true);
  };

  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    setFormUser({
      username: user.username,
      password: '',
      role: user.role || 'user',
      page_access: user.page_access || '',
      firm_name: user.firm_name || ''
    });
    setModalError('');
  const [expandedSystems, setExpandedSystems] = useState({});

  const toggleSystemExpand = (sysKey) => {
    setExpandedSystems((prev) => ({ ...prev, [sysKey]: !prev[sysKey] }));
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setModalError('');
    
    const uName = formUser.username.trim();
    
    if (!uName) {
      setModalError('Username is required.');
      return;
    }
    if (!editingUser && !formUser.password) {
      setModalError('Password is required.');
      return;
    }

    setSubmitting(true);
    try {
      const method = editingUser ? 'PUT' : 'POST';
      const url = editingUser ? `${API_URL}/users/manage/${editingUser.id}` : `${API_URL}/users/manage`;

      let pageAccessValue = formUser.page_access;
      const isAdminRole = (Array.isArray(formUser.role) ? formUser.role : [formUser.role]).includes(ROLES.ADMIN);
      if (isAdminRole) {
        const { generatedPageFirms } = buildAllSystemPermissions(false);
        pageAccessValue = JSON.stringify(generatedPageFirms);
      }

      const payload = {
        ...formUser,
        username: uName,
        page_access: pageAccessValue,
        firm_name: isAdminRole ? 'all' : (Array.isArray(formUser.firm_name) ? formUser.firm_name.join(', ') : formUser.firm_name),
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to save user.');
      }

      addNotification(
        editingUser ? 'User Updated' : 'User Created', 
        `Successfully saved profile for ${uName}.`, 
        'success'
      );
      
      await fetchUsersList();
      setShowModal(false);
    } catch (err) {
      setModalError(err.message || 'Failed to save user profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userToDelete) => {
    if (currentUser?.user_name?.toLowerCase() === userToDelete.username?.toLowerCase()) {
      alert("You cannot delete your own logged-in user profile.");
      return;
    }

    if (!confirm(`Are you sure you want to delete user "${userToDelete.username}"?`)) return;

    try {
      const res = await fetch(`${API_URL}/users/manage/${userToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete user.');
      }
      addNotification('User Deleted', `Removed account of ${userToDelete.username}.`, 'info');
      await fetchUsersList();
    } catch (err) {
      alert(err.message || 'Error deleting user.');
    }
  };

  // Configuration handlers removed

  // Helper to color codes role badges
  const getRoleBadgeClasses = (role) => {
    switch (role) {
      case ROLES.ADMIN:
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-800';
      case ROLES.SALES:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800';
      case ROLES.LOGISTICS:
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800';
      case ROLES.ACCOUNTS:
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold font-heading text-slate-navy-900 dark:text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-brand-600" />
            User Management
          </h2>
          <p className="text-xs text-slate-navy-500 font-medium">
            Manage system users, login credentials, and configure active database synchronization channels.
          </p>
        </div>
        <Button onClick={handleOpenAddModal} className="font-semibold gap-1.5 self-start">
          <UserPlus className="h-4 w-4" />
          Add New User
        </Button>
      </div>

      {/* Main panel - Users list table */}
      <div className="glass-card rounded-xl border p-5 space-y-4">
        <h3 className="text-sm font-bold font-heading text-slate-navy-800 lite:text-slate-200 flex items-center gap-1.5 pb-2 border-b lite:border-slate-navy-800">
          Registered Accounts ({usersList.length})
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-navy-800 text-slate-navy-500 font-bold text-xs uppercase tracking-wider">
                <th className="pb-3 pl-2 w-10">Avatar</th>
                <th className="pb-3">User Name</th>
                <th className="pb-3">Page Access</th>
                <th className="pb-3">Associated Firm</th>
                <th className="pb-3">Password Credentials</th>
                <th className="pb-3 pr-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 lite:divide-slate-navy-850 text-sm text-slate-navy-650 dark:text-slate-navy-300">
              {usersList.map((user) => {
                const isCurrentUser = currentUser.user_name.toLowerCase() === user.user_name.toLowerCase();
                return (
                  <tr key={user.user_name} className="hover:bg-slate-50/50 dark:hover:bg-slate-navy-900/30 transition-colors">
                    <td className="py-4 pl-2">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs border uppercase",
                        isCurrentUser ? "ring-2 ring-brand-500" : "",
                        getRoleBadgeClasses(user.role)
                      )}>
                        {user.user_name[0]}
                      </div>
                    </td>
                    <td className="py-4 font-semibold text-slate-navy-900 dark:text-white">
                      <div className="flex items-center gap-1.5">
                        {user.user_name}
                        {isCurrentUser && (
                          <span className="text-[9px] font-bold bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-300 px-1.5 py-0.5 rounded-full uppercase">
                            You
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4">
                      <span className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold",
                        getRoleBadgeClasses(user.role)
                      )}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 font-semibold text-slate-navy-700 dark:text-slate-navy-300">
                      {user.firm_name || '-'}
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs select-all">
                          {visiblePasswords[user.user_name] ? user.password : '••••••••'}
                        </span>
                        <button 
                          onClick={() => togglePasswordVisibility(user.user_name)} 
                          className="text-slate-navy-400 hover:text-slate-navy-600 dark:hover:text-slate-navy-200 transition-colors"
                        >
                          {visiblePasswords[user.user_name] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="py-4 pr-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          onClick={() => handleOpenEditModal(user)} 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-navy-800 text-slate-navy-500 hover:text-brand-600"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          onClick={() => handleDeleteUser(user.user_name)} 
                          size="icon" 
                          variant="ghost" 
                          disabled={isCurrentUser}
                          className={cn(
                            "h-8 w-8 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-navy-500 hover:text-red-500",
                            isCurrentUser && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {usersList.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-navy-400 font-medium">
                    No users loaded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Register/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/25 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-xl max-w-md w-full animate-scale-in dark:bg-slate-navy-900 dark:border-slate-navy-800 space-y-4">
            
            <div className="flex items-center gap-2 border-b pb-3 dark:border-slate-navy-800">
              <UserPlus className="h-5 w-5 text-brand-600" />
              <h3 className="text-lg font-bold font-heading text-slate-navy-900 dark:text-white">
                {editingUser ? 'Edit User Account' : 'Register New User'}
              </h3>
            </div>

            {modalError && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-150 text-xs flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-4">
              <Input
                label="User Name"
                value={formUser.user_name}
                disabled={!!editingUser}
                onChange={(e) => setFormUser({ ...formUser, user_name: e.target.value })}
                placeholder="e.g. sales_officer"
                required
              />

              <Input
                label="Password Credentials"
                value={formUser.password}
                onChange={(e) => setFormUser({ ...formUser, password: e.target.value })}
                placeholder="Minimum 3 characters"
                type="text"
                required
              />

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-navy-600 dark:text-slate-navy-400">
                  Page Access
                </label>
                <div className="grid grid-cols-1 gap-2 rounded-lg border border-slate-navy-200 bg-white p-3 sm:grid-cols-2 dark:border-slate-navy-800 dark:bg-slate-navy-900">
                  {PAGE_ACCESS_OPTIONS.map(option => (
                    <label
                      key={option.value}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold text-slate-navy-700 dark:text-slate-navy-300",
                        formUser.role.includes(ROLES.ADMIN) && option.value !== ROLES.ADMIN
                          ? "cursor-not-allowed opacity-50"
                          : "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-navy-800"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={formUser.role.includes(option.value)}
                        disabled={formUser.role.includes(ROLES.ADMIN) && option.value !== ROLES.ADMIN}
                        onChange={() => setFormUser({
                          ...formUser,
                          role: option.value === ROLES.ADMIN
                            ? (formUser.role.includes(ROLES.ADMIN) ? [] : [ROLES.ADMIN])
                            : (formUser.role.includes(option.value)
                              ? formUser.role.filter(value => value !== option.value)
                              : [...formUser.role, option.value])
                        })}
                        className="h-4 w-4 rounded border-slate-navy-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>

                {formUser.role.includes(ROLES.ADMIN) && (
                  <div className="mt-2 border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-900 space-y-2">
                    <div className="flex items-center justify-between px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300">
                      <span className="font-semibold">Admin Mode: Full access across all 11 systems and 9 firms</span>
                      <span className="text-[10px] font-mono text-slate-500">All 9 Firms Included</span>
                    </div>

                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar">
                      {Object.entries(SYSTEM_REGISTRY).map(([sysKey, sysConfig]) => {
                        const isExpanded = !!expandedSystems[sysKey];
                        const visiblePages = getVisiblePages(sysKey);

                        return (
                          <div key={sysKey} className="border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => toggleSystemExpand(sysKey)}
                              className="w-full flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                            >
                              <div className="flex items-center gap-2">
                                {isExpanded ? <ChevronDown className="h-3 w-3 text-slate-400" /> : <ChevronRight className="h-3 w-3 text-slate-400" />}
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{sysConfig.label}</span>
                                <span className="text-[10px] text-slate-400">({visiblePages.length} pages)</span>
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Full Access
                              </span>
                            </button>

                            {isExpanded && (
                              <div className="px-2.5 pb-2.5 pt-1 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                                <div className="grid grid-cols-2 gap-1">
                                  {visiblePages.map((page) => (
                                    <div
                                      key={page.key}
                                      className="flex items-center gap-1.5 p-1 rounded bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400"
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
                )}
              </div>

              {!formUser.role.includes(ROLES.ADMIN) && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-navy-600 dark:text-slate-navy-400">
                    Firm Name
                  </label>
                  <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-navy-200 bg-white p-3 dark:border-slate-navy-800 dark:bg-slate-navy-900">
                    <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold text-slate-navy-700 hover:bg-slate-50 dark:text-slate-navy-300 dark:hover:bg-slate-navy-800">
                      <input
                        type="checkbox"
                        checked={formUser.firm_name.length === 0}
                        onChange={() => setFormUser({ ...formUser, firm_name: [] })}
                        className="h-4 w-4 rounded border-slate-navy-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span>No Firm Assignment</span>
                    </label>
                    {ALL_FIRMS.map(f => (
                      <label
                        key={f}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold text-slate-navy-700 hover:bg-slate-50 dark:text-slate-navy-300 dark:hover:bg-slate-navy-800"
                      >
                        <input
                          type="checkbox"
                          checked={formUser.firm_name.includes(f)}
                          onChange={() => setFormUser({
                            ...formUser,
                            firm_name: formUser.firm_name.includes(f)
                              ? formUser.firm_name.filter(value => value !== f)
                              : [...formUser.firm_name, f]
                          })}
                          className="h-4 w-4 rounded border-slate-navy-300 text-brand-600 focus:ring-brand-500"
                        />
                        <span>{f}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-3 border-t dark:border-slate-navy-800">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setShowModal(false)}
                  className="font-semibold"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  loading={submitting}
                  className="font-semibold"
                >
                  Save Profile
                </Button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
export default SettingsModule;
