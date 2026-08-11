import React, { useState, useEffect } from 'react';
import { inventoryApi } from '../../lib/api';
import { Package, TrendingUp, AlertTriangle, Layers, Building2 } from 'lucide-react';

export default function Dashboard() {
  const [selectedFirm, setSelectedFirm] = useState('All');
  const [loading, setLoading] = useState(true);
  const [rmItems, setRmItems] = useState([]);
  const [fgItems, setFgItems] = useState([]);

  useEffect(() => {
    fetchSummaryData();
  }, [selectedFirm]);

  const fetchSummaryData = async () => {
    try {
      setLoading(true);
      const query = selectedFirm !== 'All' ? { firm: selectedFirm } : {};
      const [rmRes, fgRes] = await Promise.all([
        inventoryApi.get('raw-material', query),
        inventoryApi.get('finished-goods', query),
      ]);
      setRmItems(rmRes.data || []);
      setFgItems(fgRes.data || []);
    } catch (err) {
      console.error('Error fetching dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalRawStock = rmItems.reduce((acc, item) => acc + (Number(item.actual_level) || 0), 0);
  const totalRawStockValue = rmItems.reduce((acc, item) => acc + (Number(item.stock_total) || 0), 0);
  const lowStockCount = rmItems.filter(
    (item) => Number(item.actual_level || 0) < Number(item.optimum_stock || 0)
  ).length;
  const totalFinishedStock = fgItems.reduce((acc, item) => acc + (Number(item.current_level) || 0), 0);

  const firms = [
    { name: 'All', label: 'All Operations' },
    { name: 'Purab', label: 'Purab Enterprise' },
    { name: 'Pmmpl', label: 'PMMPL Factory' },
    { name: 'Rkl', label: 'RKL Refractories' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Firm Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Inventory Overview</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Live operational stock levels across all active firms</p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/80 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-700/60">
          {firms.map((f) => (
            <button
              key={f.name}
              onClick={() => setSelectedFirm(f.name)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                selectedFirm === f.name
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Raw Stock</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              {loading ? '...' : totalRawStock.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-medium text-zinc-400 ml-1.5">MT</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Raw Stock Value</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              ₹{loading ? '...' : totalRawStockValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Low Stock Alerts</span>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
              {loading ? '...' : lowStockCount}
            </span>
            <span className="text-xs font-medium text-zinc-400 ml-1.5">Items below optimum</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Finished Goods Stock</span>
            <div className="p-2 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              {loading ? '...' : totalFinishedStock.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-medium text-zinc-400 ml-1.5">MT</span>
          </div>
        </div>
      </div>

      {/* Firm Specific Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {['Purab', 'Pmmpl', 'Rkl'].map((firmName) => {
          const firmRm = rmItems.filter((i) => i.firm_name === firmName);
          const firmFg = fgItems.filter((i) => i.firm_name === firmName);
          const rmVal = firmRm.reduce((a, b) => a + (Number(b.stock_total) || 0), 0);
          const rmQty = firmRm.reduce((a, b) => a + (Number(b.actual_level) || 0), 0);

          return (
            <div
              key={firmName}
              onClick={() => setSelectedFirm(firmName)}
              className={`cursor-pointer bg-white dark:bg-zinc-900 border rounded-2xl p-5 transition-all hover:shadow-md ${
                selectedFirm === firmName
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'border-zinc-200/80 dark:border-zinc-800'
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-700 dark:text-zinc-300">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-white">{firmName}</h3>
                  <span className="text-xs text-zinc-500">Firm Operations</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Raw Material Items:</span>
                  <span className="font-medium text-zinc-900 dark:text-white">{firmRm.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Raw Material Stock:</span>
                  <span className="font-medium text-zinc-900 dark:text-white">{rmQty.toFixed(2)} MT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Total Stock Value:</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">₹{rmVal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Finished Goods Items:</span>
                  <span className="font-medium text-zinc-900 dark:text-white">{firmFg.length}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
