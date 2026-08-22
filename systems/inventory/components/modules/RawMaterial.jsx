import React, { useState, useEffect, useMemo } from 'react';
import { inventoryApi } from '../../lib/api';
import { Search, Edit3, Trash2, X } from 'lucide-react';

const STATUS_FILTERS = [
  {
    label: 'Excess Stock (>100%)',
    value: 'Excess Stock',
    color: '#a855f7',
    activeBorder: '#a855f7',
    activeBg: 'bg-purple-50/80 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100',
  },
  {
    label: 'Normal Stock (66-100%)',
    value: 'Normal Stock',
    color: '#16a34a',
    activeBorder: '#16a34a',
    activeBg: 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100',
  },
  {
    label: 'Medium Stock (33-66%)',
    value: 'Medium Stock',
    color: '#f59e0b',
    activeBorder: '#f59e0b',
    activeBg: 'bg-amber-50/80 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100',
  },
  {
    label: 'Low Stock (<33%)',
    value: 'Low Stock',
    color: '#ef4444',
    activeBorder: '#ef4444',
    activeBg: 'bg-red-50/80 dark:bg-red-950/40 text-red-950 dark:text-red-100',
  },
];

export default function RawMaterial() {
  const [activeFirm, setActiveFirm] = useState('All');
  const [items, setItems] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [formData, setFormData] = useState({
    firmName: 'Purab',
    itemName: '',
    unit: 'MT',
    opStock: '',
    opStockDate: '',
    optimumQty: '',
    maxQty: '',
    annualConsumption: '',
    leadTimeDays: '',
    safetyFactor: '1.0',
  });

  useEffect(() => {
    fetchItems();
  }, [activeFirm, search]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const params = { firm: activeFirm };
      if (search) params.search = search;
      const res = await inventoryApi.get('raw-material', params);
      setItems(res.data || []);
    } catch (err) {
      console.error('Failed to fetch raw material:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter items by status pill
  const displayedItems = useMemo(() => {
    if (!selectedStatus) return items;
    return items.filter((item) => {
      const col = (item.colour || 'Normal Stock').trim();
      if (selectedStatus === 'Low Stock') {
        return col === 'Low Stock' || col === 'No Stock';
      }
      return col === selectedStatus;
    });
  }, [items, selectedStatus]);

  // Count items by status
  const statusCounts = useMemo(() => {
    const counts = {
      'Excess Stock': 0,
      'Normal Stock': 0,
      'Medium Stock': 0,
      'Low Stock': 0,
    };
    items.forEach((item) => {
      const col = (item.colour || 'Normal Stock').trim();
      if (col === 'Excess Stock') counts['Excess Stock']++;
      else if (col === 'Normal Stock') counts['Normal Stock']++;
      else if (col === 'Medium Stock') counts['Medium Stock']++;
      else if (col === 'Low Stock' || col === 'No Stock') counts['Low Stock']++;
    });
    return counts;
  }, [items]);

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      firmName: item.firm_name,
      itemName: item.item_name,
      unit: item.unit || 'MT',
      opStock: item.op_stock || '',
      opStockDate: item.op_stock_date ? String(item.op_stock_date).split('T')[0] : '',
      optimumQty: item.optimum_qty || '',
      maxQty: item.max_qty || '',
      annualConsumption: item.annual_consumption || '',
      leadTimeDays: item.lead_time_days || '',
      safetyFactor: item.safety_factor || '1.0',
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this raw material item?')) return;
    try {
      await inventoryApi.delete(`raw-material/${id}`);
      fetchItems();
    } catch (err) {
      alert(err.message || 'Failed to delete item');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await inventoryApi.put(`raw-material/${editingItem.id}`, formData);
      } else {
        const createFirm = activeFirm === 'All' ? formData.firmName : activeFirm;
        await inventoryApi.post('raw-material', { ...formData, firmName: createFirm });
      }
      setModalOpen(false);
      fetchItems();
    } catch (err) {
      alert(err.message || 'Failed to save item');
    }
  };

  const firms = ['Purab', 'Pmmpl', 'Rkl'];
  const showFirmColumn = activeFirm === 'All';

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Raw Material Inventory</h1>
          <p className="text-sm text-zinc-500">Track raw material stock levels, optimum stock, and replenishment flags</p>
        </div>
      </div>

      {/* Firm filter & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-zinc-500">Firm:</label>
          <select
            value={activeFirm}
            onChange={(e) => setActiveFirm(e.target.value)}
            className="px-3 py-2 text-sm font-semibold bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="All">All Firms</option>
            {firms.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search material..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Stock Status Filter Pills (Matching Reference Design) */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 py-1">
        {STATUS_FILTERS.map((item) => {
          const isActive = selectedStatus === item.value;
          const count = statusCounts[item.value] || 0;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setSelectedStatus((prev) => (prev === item.value ? null : item.value))}
              className={`group relative inline-flex items-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-full border text-xs sm:text-[13px] font-bold transition-all duration-200 cursor-pointer select-none shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] ${
                isActive
                  ? `${item.activeBg} font-extrabold shadow-md`
                  : 'bg-white dark:bg-zinc-900 border-zinc-200/90 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
              style={
                isActive
                  ? {
                      borderColor: item.activeBorder,
                      boxShadow: `0 2px 10px ${item.color}30`,
                    }
                  : undefined
              }
            >
              <span
                className="w-3.5 h-3.5 rounded-[4px] shrink-0 transition-transform duration-200 group-hover:scale-110"
                style={{ backgroundColor: item.color }}
              />
              <span>{item.label}</span>
              {count > 0 && (
                <span
                  className={`ml-0.5 px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
                    isActive
                      ? 'bg-white dark:bg-zinc-900 shadow-xs'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
        {selectedStatus && (
          <button
            type="button"
            onClick={() => setSelectedStatus(null)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Clear filter"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear Filter</span>
          </button>
        )}
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 font-semibold text-zinc-500 uppercase tracking-wider">
            <tr>
              <th className="p-3">S.No</th>
              {showFirmColumn && <th className="p-3">Firm</th>}
              <th className="p-3">Item Name</th>
              <th className="p-3">Unit</th>
              <th className="p-3 text-right">Annual Con</th>
              <th className="p-3 text-right">Daily Con</th>
              <th className="p-3 text-right">S.F</th>
              <th className="p-3 text-right">Lead Time</th>
              <th className="p-3 text-right">Max Stock</th>
              <th className="p-3 text-right">Optimum Stock</th>
              <th className="p-3 text-right">Op Stock</th>
              <th className="p-3 text-right">Stock Adjustment</th>
              <th className="p-3 text-right">Purchase System</th>
              <th className="p-3 text-right">Production Consumption</th>
              <th className="p-3 text-right">Raw Material Sales</th>
              <th className="p-3 text-right font-bold text-zinc-900 dark:text-white">Actual Level</th>
              <th className="p-3 text-right">Rate (₹)</th>
              <th className="p-3 text-right">Optimum Stock Total (₹)</th>
              <th className="p-3 text-right">Stock Total (₹)</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {loading ? (
              <tr>
                <td colSpan={showFirmColumn ? 21 : 20} className="p-8 text-center text-zinc-400">
                  Loading items...
                </td>
              </tr>
            ) : displayedItems.length === 0 ? (
              <tr>
                <td colSpan={showFirmColumn ? 21 : 20} className="p-8 text-center text-zinc-400">
                  {selectedStatus ? (
                    <div className="flex flex-col items-center gap-2">
                      <p>
                        No raw material records found matching{' '}
                        <span className="font-semibold text-zinc-700 dark:text-zinc-200">
                          {selectedStatus}
                        </span>{' '}
                        status.
                      </p>
                      <button
                        onClick={() => setSelectedStatus(null)}
                        className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                      >
                        Show all items
                      </button>
                    </div>
                  ) : (
                    'No raw material records found.'
                  )}
                </td>
              </tr>
            ) : (
              displayedItems.map((item, idx) => {
                const netPurchase = Number(item.purchase_system || 0) - Number(item.purchase_return || 0);
                const colourStyles = {
                  'No Stock': 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400',
                  'Low Stock': 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400',
                  'Medium Stock': 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
                  'Normal Stock': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
                  'Excess Stock': 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400',
                };
                return (
                  <tr key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                    <td className="p-3 text-zinc-400">{idx + 1}</td>
                    {showFirmColumn && (
                      <td className="p-3 text-zinc-500 font-medium">{item.firm_name}</td>
                    )}
                    <td className="p-3 font-semibold text-zinc-900 dark:text-white">{item.item_name}</td>
                    <td className="p-3 text-zinc-500">{item.unit || 'MT'}</td>
                    <td className="p-3 text-right text-zinc-500">{Number(item.annual_consumption || 0).toFixed(2)}</td>
                    <td className="p-3 text-right text-zinc-500">{Number(item.daily_consumption || 0).toFixed(3)}</td>
                    <td className="p-3 text-right text-zinc-500">{Number(item.safety_factor || 0).toFixed(2)}</td>
                    <td className="p-3 text-right text-zinc-500">{Number(item.lead_time_days || 0)} days</td>
                    <td className="p-3 text-right text-zinc-500">{Number(item.max_stock || 0).toFixed(2)}</td>
                    <td className="p-3 text-right text-zinc-500">{Number(item.optimum_stock || 0).toFixed(2)}</td>
                    <td className="p-3 text-right text-zinc-600 dark:text-zinc-300">{Number(item.op_stock || 0).toFixed(2)}</td>
                    <td className="p-3 text-right text-zinc-500">{Number(item.stock_adjustment || 0).toFixed(2)}</td>
                    <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">{netPurchase.toFixed(2)}</td>
                    <td className="p-3 text-right text-rose-600 dark:text-rose-400">{Number(item.production_consumption || 0).toFixed(2)}</td>
                    <td className="p-3 text-right text-rose-600 dark:text-rose-400">{Number(item.raw_material_sales || 0).toFixed(2)}</td>
                    <td className="p-3 text-right font-bold text-zinc-900 dark:text-white">{Number(item.actual_level || 0).toFixed(2)}</td>
                    <td className="p-3 text-right text-zinc-600 dark:text-zinc-300">₹{Number(item.product_rate || 0).toFixed(2)}</td>
                    <td className="p-3 text-right text-zinc-500">
                      ₹{Number(item.optimum_stock_total || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      ₹{Number(item.stock_total || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                          colourStyles[item.colour] || 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}
                      >
                        {item.colour || 'Normal Stock'}
                      </span>
                    </td>
                    <td className="p-3 text-center space-x-2">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1 text-zinc-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-lg text-zinc-900 dark:text-white">
                {editingItem ? 'Edit Raw Material' : 'Add Raw Material'} ({editingItem ? formData.firmName : (activeFirm === 'All' ? formData.firmName : activeFirm)})
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  value={formData.itemName}
                  onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Unit</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Opening Stock</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.opStock}
                    onChange={(e) => setFormData({ ...formData, opStock: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Opening Stock Date</label>
                  <input
                    type="date"
                    value={formData.opStockDate}
                    onChange={(e) => setFormData({ ...formData, opStockDate: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Annual Consumption</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.annualConsumption}
                    onChange={(e) => setFormData({ ...formData, annualConsumption: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Optimum Stock</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.optimumQty}
                    onChange={(e) => setFormData({ ...formData, optimumQty: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Max Stock</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.maxQty}
                    onChange={(e) => setFormData({ ...formData, maxQty: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Lead Time (Days)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.leadTimeDays}
                    onChange={(e) => setFormData({ ...formData, leadTimeDays: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Safety Factor</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.safetyFactor}
                    onChange={(e) => setFormData({ ...formData, safetyFactor: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
