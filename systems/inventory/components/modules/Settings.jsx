import React, { useState, useEffect } from 'react';
import { inventoryApi } from '../../lib/api';
import { Shield, Check, Save } from 'lucide-react';
import {
  SYSTEM_REGISTRY,
  ALL_FIRMS,
  getVisiblePages,
  buildAllSystemPermissions,
} from '@/systems/core/config/systemRegistry';

export default function Settings() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userAccess, setUserAccess] = useState([]);
  const [saving, setSaving] = useState(false);

  const inventoryPages = getVisiblePages("inventory");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await inventoryApi.get('settings');
      const fetchedUsers = res.data?.users || [];
      setUsers(fetchedUsers);
      if (fetchedUsers.length > 0 && !selectedUser) {
        setSelectedUser(fetchedUsers[0]);
        setUserAccess(fetchedUsers[0].page_access || []);
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setUserAccess(user.page_access || []);
  };

  const handleToggleAccess = (key) => {
    if (userAccess.includes(key)) {
      setUserAccess(userAccess.filter((k) => k !== key));
    } else {
      setUserAccess([...userAccess, key]);
    }
  };

  const handleSaveAccess = async () => {
    if (!selectedUser) return;
    try {
      setSaving(true);
      await inventoryApi.put('settings', {
        userId: selectedUser.id,
        pageAccess: userAccess,
      });
      alert(`Updated page access for ${selectedUser.username} successfully!`);
      fetchSettings();
    } catch (err) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Inventory System Access Settings</h1>
        <p className="text-sm text-zinc-500">Manage user page access permissions across inventory firms and sub-modules</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Selection List */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-3">
          <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" /> Users List
          </h3>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {loading ? (
              <p className="py-4 text-xs text-zinc-400">Loading users...</p>
            ) : (
              users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleUserSelect(u)}
                  className={`w-full py-3 px-3 flex items-center justify-between text-xs rounded-xl transition-all ${
                    selectedUser?.id === u.id
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                  }`}
                >
                  <div className="text-left">
                    <p className="font-medium text-zinc-900 dark:text-white">{u.username}</p>
                    <p className="text-[10px] text-zinc-400 capitalize">{u.role} ({u.firm_name})</p>
                  </div>
                  {selectedUser?.id === u.id && <Check className="w-4 h-4 text-emerald-600" />}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Access Rights Checklist */}
        <div className="md:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
          {selectedUser ? (
            <>
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div>
                  <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                    Page Access Rights for <span className="text-emerald-600">{selectedUser.username}</span>
                  </h3>
                  <p className="text-xs text-zinc-400">Toggle specific module views permitted for this user</p>
                </div>
                <button
                  onClick={handleSaveAccess}
                  disabled={saving}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {inventoryPages.map((page) => {
                  const isGranted =
                    selectedUser.role === 'admin' ||
                    selectedUser.page_access?.includes('all') ||
                    userAccess.includes(page.key);

                  return (
                    <label
                      key={page.key}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                        isGranted
                          ? 'border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 text-zinc-900 dark:text-white'
                          : 'border-zinc-200 dark:border-zinc-800 text-zinc-500'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isGranted}
                        disabled={selectedUser.role === 'admin' || selectedUser.page_access?.includes('all')}
                        onChange={() => handleToggleAccess(page.key)}
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-medium">{page.label}</span>
                    </label>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-xs text-zinc-400">Select a user to configure permissions.</p>
          )}
        </div>
      </div>
    </div>
  );
}
