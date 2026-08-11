import React, { useState, useEffect } from 'react';
import { inventoryApi } from '../../lib/api';
import { Calendar, Filter, RefreshCw } from 'lucide-react';

export default function History() {
  const [activeFirm, setActiveFirm] = useState('Purab');
  const [category, setCategory] = useState('RawMaterial');
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, [activeFirm, category]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await inventoryApi.get('history', { firm: activeFirm, category });
      const data = category === 'RawMaterial' ? res.data?.rawMaterial : res.data?.finishedGoods;
      setHistoryData(data || []);
    } catch (err) {
      console.error('Failed to fetch inventory history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSnapshot = async () => {
    try {
      setTriggering(true);
      await inventoryApi.post('history/snapshot', { date: new Date().toISOString().split('T')[0] });
      alert('Daily stock snapshot executed successfully!');
      fetchHistory();
    } catch (err) {
      alert(err.message || 'Failed to trigger snapshot');
    } finally {
      setTriggering(false);
    }
  };

  const firms = ['Purab', 'Pmmpl', 'Rkl'];

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Daily Inventory History & Snapshots</h1>
          <p className="text-sm text-zinc-500">View automated daily closing stock snapshots and historical trends</p>
        </div>
        <button
          onClick={handleManualSnapshot}
          disabled={triggering}
          className="flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${triggering ? 'animate-spin' : ''}`} /> Trigger Daily Snapshot
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          {firms.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFirm(f)}
              className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
                activeFirm === f
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCategory('RawMaterial')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
              category === 'RawMaterial'
                ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white'
                : 'text-zinc-400'
            }`}
          >
            Raw Material
          </button>
          <button
            onClick={() => setCategory('FinishedGoods')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
              category === 'FinishedGoods'
                ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white'
                : 'text-zinc-400'
            }`}
          >
            Finished Goods
          </button>
        </div>
      </div>

      {/* History Data Table */}
      <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 font-semibold text-zinc-500 uppercase tracking-wider">
            <tr>
              <th className="p-3">Snapshot Date</th>
              <th className="p-3">Firm</th>
              <th className="p-3">{category === 'RawMaterial' ? 'Item Name' : 'Product Name'}</th>
              {category === 'RawMaterial' && <th className="p-3">Unit</th>}
              <th className="p-3 text-right font-bold text-zinc-900 dark:text-white">Recorded Closing Level</th>
              <th className="p-3 text-right">Captured Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-zinc-400">
                  Loading snapshot history...
                </td>
              </tr>
            ) : historyData.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-zinc-400">
                  No snapshot records found for {activeFirm} ({category}).
                </td>
              </tr>
            ) : (
              historyData.map((row) => (
                <tr key={row.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                  <td className="p-3 font-semibold text-zinc-900 dark:text-white">
                    {new Date(row.snapshot_date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-300">{row.firm_name}</td>
                  <td className="p-3 font-medium text-zinc-900 dark:text-white">
                    {category === 'RawMaterial' ? row.item_name : row.product_name}
                  </td>
                  {category === 'RawMaterial' && <td className="p-3 text-zinc-400">{row.unit || 'MT'}</td>}
                  <td className="p-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                    {Number(category === 'RawMaterial' ? row.actual_level : row.current_level || 0).toFixed(2)}
                  </td>
                  <td className="p-3 text-right text-zinc-400">
                    {new Date(row.captured_at).toLocaleTimeString('en-IN')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
