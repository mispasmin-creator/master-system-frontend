import React, { useState, useEffect } from 'react';
import { inventoryApi } from '../../lib/api';
import { Search, Edit3, Trash2, X } from 'lucide-react';

export default function TradingMaterial() {
  const [activeFirm, setActiveFirm] = useState('Purab');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [formData, setFormData] = useState({
    firmName: 'Purab',
    productName: '',
    opStock: '',
    opStockDate: '',
  });

  useEffect(() => {
    fetchItems();
  }, [activeFirm, search]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const params = { firm: activeFirm };
      if (search) params.search = search;
      const res = await inventoryApi.get('trading-material', params);
      setItems(res.data || []);
    } catch (err) {
      console.error('Failed to fetch trading material:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      firmName: item.firm_name,
      productName: item.product_name,
      opStock: item.op_stock || '',
      opStockDate: item.op_stock_date ? String(item.op_stock_date).split('T')[0] : '',
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this trading material record?')) return;
    try {
      await inventoryApi.delete(`trading-material/${id}`);
      fetchItems();
    } catch (err) {
      alert(err.message || 'Failed to delete item');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await inventoryApi.put(`trading-material/${editingItem.id}`, formData);
      } else {
        await inventoryApi.post('trading-material', { ...formData, firmName: activeFirm });
      }
      setModalOpen(false);
      fetchItems();
    } catch (err) {
      alert(err.message || 'Failed to save trading material');
    }
  };

  const firms = ['Purab', 'Pmmpl', 'Rkl'];

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Trading Material Inventory</h1>
          <p className="text-sm text-zinc-500">Track trading material purchases, sales, returns, and live current level</p>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          {firms.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFirm(f)}
              className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
                activeFirm === f
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
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

      {/* Data Table */}
      <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 font-semibold text-zinc-500 uppercase tracking-wider">
            <tr>
              <th className="p-3">S.No</th>
              <th className="p-3">Product Name</th>
              <th className="p-3 text-right">Op Stock</th>
              <th className="p-3 text-right">Stock Adjustment</th>
              <th className="p-3 text-right">Purchase Received</th>
              <th className="p-3 text-right">Purchase Return</th>
              <th className="p-3 text-right">Sales</th>
              <th className="p-3 text-right">Sales Return</th>
              <th className="p-3 text-right font-bold text-zinc-900 dark:text-white">Current Level</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {loading ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-zinc-400">
                  Loading trading materials...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-zinc-400">
                  No trading material records found.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                  <td className="p-3 text-zinc-400">{idx + 1}</td>
                  <td className="p-3 font-semibold text-zinc-900 dark:text-white">{item.product_name}</td>
                  <td className="p-3 text-right text-zinc-600 dark:text-zinc-300">{Number(item.op_stock || 0).toFixed(2)}</td>
                  <td className="p-3 text-right text-zinc-500">{Number(item.stock_adjustment || 0).toFixed(2)}</td>
                  <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">{Number(item.purchase_material_received || 0).toFixed(2)}</td>
                  <td className="p-3 text-right text-rose-600 dark:text-rose-400">{Number(item.purchase_return || 0).toFixed(2)}</td>
                  <td className="p-3 text-right text-rose-600 dark:text-rose-400 font-semibold">{Number(item.sales || 0).toFixed(2)}</td>
                  <td className="p-3 text-right text-emerald-600 dark:text-emerald-400">{Number(item.sales_return || 0).toFixed(2)}</td>
                  <td className="p-3 text-right font-extrabold text-zinc-900 dark:text-white">{Number(item.current_level || 0).toFixed(2)}</td>
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
              ))
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
                {editingItem ? 'Edit Trading Material' : 'Add Trading Material'} ({activeFirm})
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Opening Stock Date</label>
                  <input
                    type="date"
                    value={formData.opStockDate}
                    onChange={(e) => setFormData({ ...formData, opStockDate: e.target.value })}
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
