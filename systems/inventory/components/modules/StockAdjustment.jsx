import React, { useState, useEffect } from 'react';
import { inventoryApi } from '../../lib/api';
import { Plus, Check, X } from 'lucide-react';

export default function StockAdjustment() {
  const [activeTab, setActiveTab] = useState('adjustments'); // 'adjustments' | 'opStock' | 'products'
  const [activeFirm, setActiveFirm] = useState('Purab');
  const [adjustments, setAdjustments] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    firmName: 'Purab',
    category: 'RawMaterial',
    itemName: '',
    qty: '',
    direction: 'Factory +',
    remark: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchData();
  }, [activeFirm, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'adjustments') {
        const res = await inventoryApi.get('stock-adjustment', { firm: activeFirm });
        setAdjustments(res.data || []);
      } else if (activeTab === 'opStock' || activeTab === 'products') {
        const [rmRes, fgRes] = await Promise.all([
          inventoryApi.get('raw-material', { firm: activeFirm }),
          inventoryApi.get('finished-goods', { firm: activeFirm }),
        ]);
        setRawMaterials(rmRes.data || []);
        setFinishedGoods(fgRes.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch stock adjustment data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await inventoryApi.post('stock-adjustment', {
        ...formData,
        firmName: activeFirm,
      });
      setModalOpen(false);
      setFormData({
        firmName: activeFirm,
        category: 'RawMaterial',
        itemName: '',
        qty: '',
        direction: 'Factory +',
        remark: '',
        date: new Date().toISOString().split('T')[0],
      });
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to record stock adjustment');
    }
  };

  const handleOpStockUpdate = async (type, item, newOpStock) => {
    try {
      const endpoint = type === 'RawMaterial' ? `raw-material/${item.id}` : `finished-goods/${item.id}`;
      await inventoryApi.put(endpoint, { opStock: parseFloat(newOpStock) || 0 });
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to update opening stock');
    }
  };

  const firms = ['Purab', 'Pmmpl', 'Rkl'];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Stock Adjustment & Op Stock</h1>
          <p className="text-sm text-zinc-500">Record manual physical inventory corrections and manage opening stock balances</p>
        </div>
        {activeTab === 'adjustments' && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Adjustment
          </button>
        )}
      </div>

      {/* Sub tabs & Firm Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('adjustments')}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
              activeTab === 'adjustments'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Adjustments Log
          </button>
          <button
            onClick={() => setActiveTab('opStock')}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
              activeTab === 'opStock'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Opening Stock Setup
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
              activeTab === 'products'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Product Directory
          </button>
        </div>

        <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl">
          {firms.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFirm(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeFirm === f
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Adjustments Log */}
      {activeTab === 'adjustments' && (
        <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 font-semibold text-zinc-500 uppercase tracking-wider">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Firm</th>
                <th className="p-3">Category</th>
                <th className="p-3">Item / Product Name</th>
                <th className="p-3 text-right">Adjustment Qty</th>
                <th className="p-3 text-center">Direction</th>
                <th className="p-3">Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-400">
                    Loading stock adjustments...
                  </td>
                </tr>
              ) : adjustments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-400">
                    No stock adjustments recorded for {activeFirm}.
                  </td>
                </tr>
              ) : (
                adjustments.map((adj) => (
                  <tr key={adj.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                    <td className="p-3 font-medium text-zinc-600 dark:text-zinc-400">
                      {new Date(adj.date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="p-3 font-semibold text-zinc-900 dark:text-white">{adj.firm_name}</td>
                    <td className="p-3 text-zinc-500">{adj.category}</td>
                    <td className="p-3 font-medium text-zinc-900 dark:text-white">{adj.item_name}</td>
                    <td className="p-3 text-right font-bold text-zinc-900 dark:text-white">
                      {Number(adj.qty).toFixed(2)}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                          adj.direction?.includes('+')
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
                        }`}
                      >
                        {adj.direction}
                      </span>
                    </td>
                    <td className="p-3 text-zinc-500 italic">{adj.remark || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Opening Stock Setup */}
      {activeTab === 'opStock' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white mb-3">Raw Material Opening Stock</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b text-zinc-500 uppercase">
                  <tr>
                    <th className="p-2">Item Name</th>
                    <th className="p-2">Current Op Stock</th>
                    <th className="p-2">New Op Stock</th>
                    <th className="p-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {rawMaterials.map((rm) => (
                    <tr key={rm.id}>
                      <td className="p-2 font-medium text-zinc-900 dark:text-white">{rm.item_name}</td>
                      <td className="p-2 text-zinc-500">{Number(rm.op_stock || 0).toFixed(2)}</td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="any"
                          defaultValue={rm.op_stock}
                          id={`op-rm-${rm.id}`}
                          className="w-32 px-2 py-1 bg-zinc-50 dark:bg-zinc-800 border rounded-lg text-xs"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => {
                            const val = document.getElementById(`op-rm-${rm.id}`).value;
                            handleOpStockUpdate('RawMaterial', rm, val);
                          }}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs"
                        >
                          Update
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Products Directory */}
      {activeTab === 'products' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white mb-3">Raw Material Directory</h3>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
              {rawMaterials.map((rm) => (
                <li key={rm.id} className="py-2 flex justify-between">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">{rm.item_name}</span>
                  <span className="text-zinc-400">{rm.unit || 'MT'}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white mb-3">Finished Goods Directory</h3>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
              {finishedGoods.map((fg) => (
                <li key={fg.id} className="py-2 flex justify-between">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">{fg.product_name}</span>
                  <span className="text-emerald-600 font-semibold">{Number(fg.current_level || 0).toFixed(2)} MT</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* New Adjustment Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-lg text-zinc-900 dark:text-white">Record Stock Adjustment ({activeFirm})</h3>
              <button onClick={() => setModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Adjustment Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                >
                  <option value="RawMaterial">Raw Material</option>
                  <option value="FinishedGoods">Finished Goods</option>
                  <option value="TradingMaterial">Trading Material</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Item / Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="Exact item name"
                  value={formData.itemName}
                  onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Quantity</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.qty}
                    onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Direction</label>
                  <select
                    value={formData.direction}
                    onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                  >
                    <option value="Factory +">Factory + (Addition)</option>
                    <option value="Factory -">Factory - (Reduction)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Remark / Reason</label>
                <textarea
                  rows={2}
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                />
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
                  Submit Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
