import React, { useState, useEffect, useMemo } from 'react';
import { inventoryApi } from '../../lib/api';
import { RefreshCw } from 'lucide-react';

function bandColour(actual, maxQty, optimumQty) {
  const a = Number(actual) || 0;
  const max = Number(maxQty);
  if (Number.isFinite(max) && max !== 0) {
    if (a === 0) return 'No Stock';
    if (a > max) return 'Excess Stock';
    const ratio = a / max;
    if (ratio >= 0.66) return 'Normal Stock';
    if (ratio >= 0.33) return 'Medium Stock';
    return 'Low Stock';
  }
  const opt = Number(optimumQty);
  if (Number.isFinite(opt) && opt !== 0) {
    const pct = (a / opt) * 100;
    if (pct < 33) return 'Low Stock';
    if (pct < 66) return 'Medium Stock';
    if (pct <= 100) return 'Normal Stock';
    return 'Excess Stock';
  }
  return '';
}

const CELL_STYLES = {
  'No Stock': 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  'Low Stock': 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  'Medium Stock': 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  'Normal Stock': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  'Excess Stock': 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
};

function formatDateKey(value) {
  if (!value) return '';
  return String(value).split('T')[0];
}

function formatDateLabel(dateKey) {
  if (!dateKey) return '';
  const [y, m, d] = dateKey.split('-');
  return `${d}/${m}/${y}`;
}

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
  const nameKey = category === 'RawMaterial' ? 'item_name' : 'product_name';

  // Pivot: one row per Firm+Item/Product, one column-pair per distinct snapshot date
  const { rows, dates } = useMemo(() => {
    const dateSet = new Set();
    const rowMap = new Map();

    for (const rec of historyData) {
      const dateKey = formatDateKey(rec.snapshot_date);
      if (dateKey) dateSet.add(dateKey);

      const groupKey = `${rec.firm_name}::${rec[nameKey]}`;
      if (!rowMap.has(groupKey)) {
        rowMap.set(groupKey, {
          firm_name: rec.firm_name,
          [nameKey]: rec[nameKey],
          unit: rec.unit,
          byDate: {},
        });
      }
      rowMap.get(groupKey).byDate[dateKey] = rec;
    }

    const sortedDates = Array.from(dateSet).sort((a, b) => (a < b ? 1 : -1)); // newest first
    const sortedRows = Array.from(rowMap.values()).sort((a, b) => {
      if (a.firm_name !== b.firm_name) return a.firm_name.localeCompare(b.firm_name);
      return String(a[nameKey]).localeCompare(String(b[nameKey]));
    });

    return { rows: sortedRows, dates: sortedDates };
  }, [historyData, nameKey]);

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Daily Inventory History & Snapshots</h1>
          <p className="text-sm text-zinc-500">
            Actual level as captured automatically at 12 AM IST — one column pair per snapshot day
          </p>
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

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-[10px] font-semibold">
        {category === 'RawMaterial' ? (
          <>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>No / Low Stock</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>Medium Stock</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>Normal Stock</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>Excess Stock</span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>Shortage (below pending orders)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>Stock Available</span>
          </>
        )}
      </div>

      {/* Pivot History Table */}
      <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900">
        <table className="text-left text-xs whitespace-nowrap">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 font-semibold text-zinc-500 uppercase tracking-wider">
            <tr>
              <th className="p-3 sticky left-0 bg-zinc-50 dark:bg-zinc-800/50">S.No</th>
              <th className="p-3 sticky left-0 bg-zinc-50 dark:bg-zinc-800/50">Firm Name</th>
              <th className="p-3">{category === 'RawMaterial' ? 'Item Name' : 'Product Name'}</th>
              {category === 'RawMaterial' && <th className="p-3">Unit</th>}
              {dates.map((d) => (
                <React.Fragment key={d}>
                  <th className="p-3 text-right">{formatDateLabel(d)}</th>
                  {category === 'RawMaterial' && <th className="p-3 text-right">{formatDateLabel(d)} Rate</th>}
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {loading ? (
              <tr>
                <td colSpan={4 + dates.length * 2} className="p-8 text-center text-zinc-400">
                  Loading snapshot history...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4 + dates.length * 2} className="p-8 text-center text-zinc-400">
                  No snapshot records found for {activeFirm} ({category}).
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={`${row.firm_name}-${row[nameKey]}`} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                  <td className="p-3 text-zinc-400">{idx + 1}</td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-300">{row.firm_name}</td>
                  <td className="p-3 font-medium text-zinc-900 dark:text-white">{row[nameKey]}</td>
                  {category === 'RawMaterial' && <td className="p-3 text-zinc-400">{row.unit || 'MT'}</td>}
                  {dates.map((d) => {
                    const rec = row.byDate[d];
                    if (!rec) {
                      return (
                        <React.Fragment key={d}>
                          <td className="p-3 text-right text-zinc-300">-</td>
                          {category === 'RawMaterial' && <td className="p-3 text-right text-zinc-300">-</td>}
                        </React.Fragment>
                      );
                    }
                    if (category === 'RawMaterial') {
                      const band = bandColour(rec.actual_level, rec.max_qty, rec.optimum_qty);
                      return (
                        <React.Fragment key={d}>
                          <td className={`p-3 text-right font-semibold ${CELL_STYLES[band] || ''}`}>
                            {Number(rec.actual_level || 0).toFixed(2)}
                          </td>
                          <td className="p-3 text-right text-zinc-500">₹{Number(rec.product_rate || 0).toFixed(2)}</td>
                        </React.Fragment>
                      );
                    }
                    const isShort = Number(rec.current_level || 0) < Number(rec.sales_order_pending || 0);
                    return (
                      <td
                        key={d}
                        className={`p-3 text-right font-semibold ${
                          isShort
                            ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                        }`}
                      >
                        {Number(rec.current_level || 0).toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
