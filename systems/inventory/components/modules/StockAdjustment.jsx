import React, { useState, useEffect, useMemo } from 'react';
import { inventoryApi } from '../../lib/api';
import { Plus, X, Edit3, Trash2 } from 'lucide-react';

const MATERIAL_TYPE_LABEL = {
  raw_material: 'Raw Material',
  finish_good: 'Finished Goods',
  trading_material: 'Trading Material',
};

const CATEGORY_META = {
  RawMaterial: { label: 'Raw Material', endpoint: 'raw-material' },
  FinishedGoods: { label: 'Finished Goods', endpoint: 'finished-goods' },
  TradingMaterial: { label: 'Trading Material', endpoint: 'trading-material' },
};

const UNIT_OPTIONS = ['MT', 'KGS', 'LITER', 'PCS', 'NOS', 'SET'];
const FIRM_OPTIONS = ['Purab', 'Pmmpl', 'Rkl'];

function displayName(category, row) {
  return category === 'RawMaterial' ? row.item_name : row.product_name;
}

const emptyAdjustmentForm = () => ({
  category: 'RawMaterial',
  itemName: '',
  qty: '',
  direction: 'Factory +',
  remark: '',
  date: new Date().toISOString().split('T')[0],
});

const emptyOpStockForm = () => ({
  category: 'RawMaterial',
  itemName: '',
  opStock: '',
  opStockDate: new Date().toISOString().split('T')[0],
});

const emptyProductForm = () => ({
  productType: 'RawMaterial',
  firmName: '',
  itemName: '',
  unit: '',
  annualConsumption: '',
  safetyFactor: '',
  leadTimeDays: '',
  optimumQty: '',
  maxQty: '',
});

export default function StockAdjustment() {
  const [activeTab, setActiveTab] = useState('adjustments'); // 'adjustments' | 'opStock' | 'products'
  const [activeFirm, setActiveFirm] = useState('Purab');

  const [adjustments, setAdjustments] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [tradingMaterials, setTradingMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tab 1 — Stock Adjustments
  const [adjModalOpen, setAdjModalOpen] = useState(false);
  const [editingAdjustment, setEditingAdjustment] = useState(null);
  const [adjForm, setAdjForm] = useState(emptyAdjustmentForm());

  // Tab 2 — OP. Stock
  const [opStockModalOpen, setOpStockModalOpen] = useState(false);
  const [editingOpStock, setEditingOpStock] = useState(null); // { category, row }
  const [opStockForm, setOpStockForm] = useState(emptyOpStockForm());

  // Tab 3 — Add Product
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null); // { category, row }
  const [productForm, setProductForm] = useState(emptyProductForm());
  const [productTypeFilter, setProductTypeFilter] = useState('All');
  const [savingProduct, setSavingProduct] = useState(false);

  useEffect(() => {
    fetchAll();
  }, [activeFirm]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [adjRes, rmRes, fgRes, tmRes] = await Promise.all([
        inventoryApi.get('stock-adjustment', { firm: activeFirm }),
        inventoryApi.get('raw-material', { firm: activeFirm }),
        inventoryApi.get('finished-goods', { firm: activeFirm }),
        inventoryApi.get('trading-material', { firm: activeFirm }),
      ]);
      setAdjustments(adjRes.data || []);
      setRawMaterials(rmRes.data || []);
      setFinishedGoods(fgRes.data || []);
      setTradingMaterials(tmRes.data || []);
    } catch (err) {
      console.error('Failed to fetch stock adjustment data:', err);
    } finally {
      setLoading(false);
    }
  };

  const itemsForCategory = (category) =>
    category === 'RawMaterial' ? rawMaterials : category === 'FinishedGoods' ? finishedGoods : tradingMaterials;

  const firms = ['Purab', 'Pmmpl', 'Rkl'];

  // ---------- Tab 1: Stock Adjustments ----------

  const handleOpenAddAdjustment = () => {
    setEditingAdjustment(null);
    setAdjForm(emptyAdjustmentForm());
    setAdjModalOpen(true);
  };

  const handleOpenEditAdjustment = (adj) => {
    setEditingAdjustment(adj);
    const category =
      adj.material_type === 'raw_material' ? 'RawMaterial' : adj.material_type === 'finish_good' ? 'FinishedGoods' : 'TradingMaterial';
    setAdjForm({
      category,
      itemName: adj.item_name,
      qty: adj.qty,
      direction: adj.status,
      remark: adj.remark || '',
      date: adj.entry_date ? String(adj.entry_date).split('T')[0] : new Date().toISOString().split('T')[0],
    });
    setAdjModalOpen(true);
  };

  const handleDeleteAdjustment = async (id) => {
    if (!confirm('Delete this stock adjustment entry?')) return;
    try {
      await inventoryApi.delete(`stock-adjustment/${id}`);
      fetchAll();
    } catch (err) {
      alert(err.message || 'Failed to delete adjustment');
    }
  };

  const handleSubmitAdjustment = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        date: adjForm.date,
        firmName: activeFirm,
        category: adjForm.category,
        itemName: adjForm.itemName,
        qty: adjForm.qty,
        direction: adjForm.direction,
        remark: adjForm.remark,
      };
      if (editingAdjustment) {
        await inventoryApi.put(`stock-adjustment/${editingAdjustment.id}`, payload);
      } else {
        await inventoryApi.post('stock-adjustment', payload);
      }
      setAdjModalOpen(false);
      fetchAll();
    } catch (err) {
      alert(err.message || 'Failed to save stock adjustment');
    }
  };

  // ---------- Tab 2: OP. Stock ----------

  const opStockRows = useMemo(() => {
    const rows = [];
    for (const rm of rawMaterials) {
      if (rm.op_stock_date) rows.push({ category: 'RawMaterial', row: rm, name: rm.item_name });
    }
    for (const fg of finishedGoods) {
      if (fg.op_stock_date) rows.push({ category: 'FinishedGoods', row: fg, name: fg.product_name });
    }
    for (const tm of tradingMaterials) {
      if (tm.op_stock_date) rows.push({ category: 'TradingMaterial', row: tm, name: tm.product_name });
    }
    return rows;
  }, [rawMaterials, finishedGoods, tradingMaterials]);

  const handleOpenAddOpStock = () => {
    setEditingOpStock(null);
    setOpStockForm(emptyOpStockForm());
    setOpStockModalOpen(true);
  };

  const handleOpenEditOpStock = (category, row) => {
    setEditingOpStock({ category, row });
    setOpStockForm({
      category,
      itemName: displayName(category, row),
      opStock: row.op_stock || '',
      opStockDate: row.op_stock_date ? String(row.op_stock_date).split('T')[0] : new Date().toISOString().split('T')[0],
    });
    setOpStockModalOpen(true);
  };

  const resolveEndpointAndId = (category, itemName) => {
    const list = itemsForCategory(category);
    const nameKey = category === 'RawMaterial' ? 'item_name' : 'product_name';
    const found = list.find((r) => r[nameKey] === itemName);
    const endpoint = CATEGORY_META[category].endpoint;
    return { endpoint, id: found?.id };
  };

  const handleSubmitOpStock = async (e) => {
    e.preventDefault();
    try {
      const { endpoint, id } = editingOpStock
        ? { endpoint: CATEGORY_META[opStockForm.category].endpoint, id: editingOpStock.row.id }
        : resolveEndpointAndId(opStockForm.category, opStockForm.itemName);

      if (!id) {
        alert('Please select a valid item.');
        return;
      }

      await inventoryApi.put(`${endpoint}/${id}`, {
        opStock: parseFloat(opStockForm.opStock) || 0,
        opStockDate: opStockForm.opStockDate || null,
      });
      setOpStockModalOpen(false);
      fetchAll();
    } catch (err) {
      alert(err.message || 'Failed to save opening stock');
    }
  };

  const handleClearOpStock = async (category, row) => {
    if (!confirm('Clear the opening stock for this item?')) return;
    try {
      const endpoint = CATEGORY_META[category].endpoint;
      await inventoryApi.put(`${endpoint}/${row.id}`, { opStock: 0, opStockDate: null });
      fetchAll();
    } catch (err) {
      alert(err.message || 'Failed to clear opening stock');
    }
  };

  // ---------- Tab 3: Add Product ----------

  const allProductRows = useMemo(() => {
    const rows = [
      ...rawMaterials.map((r) => ({ category: 'RawMaterial', row: r })),
      ...finishedGoods.map((r) => ({ category: 'FinishedGoods', row: r })),
      ...tradingMaterials.map((r) => ({ category: 'TradingMaterial', row: r })),
    ];
    if (productTypeFilter === 'All') return rows;
    return rows.filter((r) => r.category === productTypeFilter);
  }, [rawMaterials, finishedGoods, tradingMaterials, productTypeFilter]);

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProductForm(emptyProductForm());
    setProductModalOpen(true);
  };

  const handleOpenEditProduct = (category, row) => {
    setEditingProduct({ category, row });
    setProductForm({
      productType: category,
      firmName: row.firm_name || '',
      itemName: displayName(category, row),
      unit: row.unit || '',
      annualConsumption: row.annual_consumption ?? '',
      safetyFactor: row.safety_factor ?? '',
      leadTimeDays: row.lead_time_days ?? '',
      optimumQty: row.optimum_qty ?? '',
      maxQty: row.max_qty ?? '',
    });
    setProductModalOpen(true);
  };

  const handleDeleteProduct = async (category, row) => {
    if (!confirm(`Delete "${displayName(category, row)}" permanently? This removes the master item.`)) return;
    try {
      const endpoint = CATEGORY_META[category].endpoint;
      await inventoryApi.delete(`${endpoint}/${row.id}`);
      fetchAll();
    } catch (err) {
      alert(err.message || 'Failed to delete product');
    }
  };

  const handleSubmitProduct = async (e) => {
    e.preventDefault();

    if (!productForm.firmName) {
      alert('Please select a firm.');
      return;
    }
    if (productForm.productType === 'RawMaterial' && !productForm.unit) {
      alert('Please select a unit.');
      return;
    }

    setSavingProduct(true);
    try {
      const { productType, firmName, itemName, unit, annualConsumption, safetyFactor, leadTimeDays, optimumQty, maxQty } = productForm;
      const endpoint = CATEGORY_META[productType].endpoint;

      const basePayload =
        productType === 'RawMaterial'
          ? { firmName, itemName, unit, annualConsumption, safetyFactor, leadTimeDays, optimumQty, maxQty }
          : { firmName, productName: itemName };

      if (editingProduct) {
        await inventoryApi.put(`${endpoint}/${editingProduct.row.id}`, basePayload);
      } else {
        await inventoryApi.post(endpoint, basePayload);
      }
      setProductModalOpen(false);
      fetchAll();
    } catch (err) {
      alert(err.message || 'Failed to save product');
    } finally {
      setSavingProduct(false);
    }
  };

  const tabs = [
    { key: 'adjustments', label: 'Stock Adjustments' },
    { key: 'opStock', label: 'OP. Stock' },
    { key: 'products', label: 'Add Product' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Stock Adjustment & Opening Stock</h1>
          <p className="text-sm text-zinc-500">Record manual physical inventory corrections, opening stock, and manage master items</p>
        </div>
        {activeTab === 'adjustments' && (
          <button
            onClick={handleOpenAddAdjustment}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Adjustment
          </button>
        )}
        {activeTab === 'opStock' && (
          <button
            onClick={handleOpenAddOpStock}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add OP. Stock
          </button>
        )}
        {activeTab === 'products' && (
          <button
            onClick={handleOpenAddProduct}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add New Product
          </button>
        )}
      </div>

      {/* Sub tabs & Firm Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
                activeTab === t.key
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'products' && (
            <select
              value={productTypeFilter}
              onChange={(e) => setProductTypeFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
            >
              <option value="All">All Types</option>
              <option value="RawMaterial">Raw Material</option>
              <option value="FinishedGoods">Finished Goods</option>
              <option value="TradingMaterial">Trading Material</option>
            </select>
          )}
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
      </div>

      {/* Tab 1: Stock Adjustments */}
      {activeTab === 'adjustments' && (
        <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 font-semibold text-zinc-500 uppercase tracking-wider">
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Date</th>
                <th className="p-3">Firm</th>
                <th className="p-3">Type</th>
                <th className="p-3">Item / Product Name</th>
                <th className="p-3 text-right">Qty</th>
                <th className="p-3">Remark</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3">Created At</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-zinc-400">
                    Loading stock adjustments...
                  </td>
                </tr>
              ) : adjustments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-zinc-400">
                    No stock adjustments recorded for {activeFirm}.
                  </td>
                </tr>
              ) : (
                adjustments.map((adj) => (
                  <tr key={adj.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                    <td className="p-3 text-zinc-400">{adj.id}</td>
                    <td className="p-3 font-medium text-zinc-600 dark:text-zinc-400">
                      {adj.entry_date ? new Date(adj.entry_date).toLocaleDateString('en-IN') : '-'}
                    </td>
                    <td className="p-3 font-semibold text-zinc-900 dark:text-white">{adj.firm_name}</td>
                    <td className="p-3 text-zinc-500">{MATERIAL_TYPE_LABEL[adj.material_type] || adj.material_type}</td>
                    <td className="p-3 font-medium text-zinc-900 dark:text-white">{adj.item_name}</td>
                    <td className="p-3 text-right font-bold text-zinc-900 dark:text-white">
                      {Number(adj.qty || 0).toFixed(2)}
                    </td>
                    <td className="p-3 text-zinc-500 italic">{adj.remark || '-'}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                          adj.status?.includes('+')
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
                        }`}
                      >
                        {adj.status}
                      </span>
                    </td>
                    <td className="p-3 text-zinc-400">
                      {adj.created_at ? new Date(adj.created_at).toLocaleString('en-IN') : '-'}
                    </td>
                    <td className="p-3 text-center space-x-2">
                      <button
                        onClick={() => handleOpenEditAdjustment(adj)}
                        className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAdjustment(adj.id)}
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
      )}

      {/* Tab 2: OP. Stock */}
      {activeTab === 'opStock' && (
        <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 font-semibold text-zinc-500 uppercase tracking-wider">
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Type</th>
                <th className="p-3">Firm</th>
                <th className="p-3">Item / Product Name</th>
                <th className="p-3 text-right">OP. Stock</th>
                <th className="p-3">OP. Stock Date</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-400">
                    Loading opening stock...
                  </td>
                </tr>
              ) : opStockRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-400">
                    No opening stock set for {activeFirm} yet. Use &ldquo;Add OP. Stock&rdquo; to set one.
                  </td>
                </tr>
              ) : (
                opStockRows.map(({ category, row, name }) => (
                  <tr key={`${category}-${row.id}`} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                    <td className="p-3 text-zinc-400">{row.id}</td>
                    <td className="p-3 text-zinc-500">{CATEGORY_META[category].label}</td>
                    <td className="p-3 font-semibold text-zinc-900 dark:text-white">{row.firm_name}</td>
                    <td className="p-3 font-medium text-zinc-900 dark:text-white">{name}</td>
                    <td className="p-3 text-right font-bold text-zinc-900 dark:text-white">{Number(row.op_stock || 0).toFixed(2)}</td>
                    <td className="p-3 text-zinc-500">{new Date(row.op_stock_date).toLocaleDateString('en-IN')}</td>
                    <td className="p-3 text-center space-x-2">
                      <button
                        onClick={() => handleOpenEditOpStock(category, row)}
                        className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleClearOpStock(category, row)}
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
      )}

      {/* Tab 3: Add Product (master directory) */}
      {activeTab === 'products' && (
        <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 font-semibold text-zinc-500 uppercase tracking-wider">
              <tr>
                <th className="p-3">Type</th>
                <th className="p-3">Firm</th>
                <th className="p-3">Item / Product Name</th>
                <th className="p-3 text-right">Optimum Qty</th>
                <th className="p-3 text-right">Max Qty</th>
                <th className="p-3 text-right">Annual Cons.</th>
                <th className="p-3">Unit</th>
                <th className="p-3 text-right">Safety Factor</th>
                <th className="p-3 text-right">Lead Time</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-zinc-400">
                    Loading products...
                  </td>
                </tr>
              ) : allProductRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-zinc-400">
                    No products found for {activeFirm}.
                  </td>
                </tr>
              ) : (
                allProductRows.map(({ category, row }) => (
                  <tr key={`${category}-${row.id}`} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                    <td className="p-3 text-zinc-500">{CATEGORY_META[category].label}</td>
                    <td className="p-3 font-semibold text-zinc-900 dark:text-white">{row.firm_name}</td>
                    <td className="p-3 font-medium text-zinc-900 dark:text-white">{displayName(category, row)}</td>
                    <td className="p-3 text-right text-zinc-500">
                      {category === 'RawMaterial' ? Number(row.optimum_qty || 0).toFixed(2) : '-'}
                    </td>
                    <td className="p-3 text-right text-zinc-500">
                      {category === 'RawMaterial' ? Number(row.max_qty || 0).toFixed(2) : '-'}
                    </td>
                    <td className="p-3 text-right text-zinc-500">
                      {category === 'RawMaterial' ? Number(row.annual_consumption || 0).toFixed(2) : '-'}
                    </td>
                    <td className="p-3 text-zinc-500">{category === 'RawMaterial' ? row.unit || 'MT' : '-'}</td>
                    <td className="p-3 text-right text-zinc-500">
                      {category === 'RawMaterial' ? Number(row.safety_factor || 0).toFixed(2) : '-'}
                    </td>
                    <td className="p-3 text-right text-zinc-500">
                      {category === 'RawMaterial' ? `${Number(row.lead_time_days || 0)} days` : '-'}
                    </td>
                    <td className="p-3 text-center space-x-2">
                      <button
                        onClick={() => handleOpenEditProduct(category, row)}
                        className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(category, row)}
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
      )}

      {/* Modal: Add/Edit Stock Adjustment */}
      {adjModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-lg text-zinc-900 dark:text-white">
                {editingAdjustment ? 'Edit' : 'Record'} Stock Adjustment ({activeFirm})
              </h3>
              <button onClick={() => setAdjModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdjustment} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={adjForm.date}
                  onChange={(e) => setAdjForm({ ...adjForm, date: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Adjustment Type</label>
                <select
                  value={adjForm.category}
                  onChange={(e) => setAdjForm({ ...adjForm, category: e.target.value, itemName: '' })}
                  disabled={!!editingAdjustment}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl disabled:opacity-60"
                >
                  <option value="RawMaterial">Raw Material</option>
                  <option value="FinishedGoods">Finished Goods</option>
                  <option value="TradingMaterial">Trading Material</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Item / Product Name</label>
                <select
                  required
                  value={adjForm.itemName}
                  onChange={(e) => setAdjForm({ ...adjForm, itemName: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                >
                  <option value="">Select item...</option>
                  {itemsForCategory(adjForm.category).map((it) => {
                    const nm = displayName(adjForm.category, it);
                    return (
                      <option key={it.id} value={nm}>
                        {nm}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Quantity</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={adjForm.qty}
                    onChange={(e) => setAdjForm({ ...adjForm, qty: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Direction</label>
                  <select
                    value={adjForm.direction}
                    onChange={(e) => setAdjForm({ ...adjForm, direction: e.target.value })}
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
                  value={adjForm.remark}
                  onChange={(e) => setAdjForm({ ...adjForm, remark: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setAdjModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl"
                >
                  {editingAdjustment ? 'Save Changes' : 'Submit Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit OP. Stock */}
      {opStockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-lg text-zinc-900 dark:text-white">
                {editingOpStock ? 'Edit' : 'Add'} Opening Stock ({activeFirm})
              </h3>
              <button onClick={() => setOpStockModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitOpStock} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Type</label>
                <select
                  value={opStockForm.category}
                  onChange={(e) => setOpStockForm({ ...opStockForm, category: e.target.value, itemName: '' })}
                  disabled={!!editingOpStock}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl disabled:opacity-60"
                >
                  <option value="RawMaterial">Raw Material</option>
                  <option value="FinishedGoods">Finished Goods</option>
                  <option value="TradingMaterial">Trading Material</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Item / Product Name</label>
                <select
                  required
                  disabled={!!editingOpStock}
                  value={opStockForm.itemName}
                  onChange={(e) => setOpStockForm({ ...opStockForm, itemName: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl disabled:opacity-60"
                >
                  <option value="">Select item...</option>
                  {itemsForCategory(opStockForm.category).map((it) => {
                    const nm = displayName(opStockForm.category, it);
                    return (
                      <option key={it.id} value={nm}>
                        {nm}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">OP. Stock</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={opStockForm.opStock}
                    onChange={(e) => setOpStockForm({ ...opStockForm, opStock: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">OP. Stock Date</label>
                  <input
                    type="date"
                    required
                    value={opStockForm.opStockDate}
                    onChange={(e) => setOpStockForm({ ...opStockForm, opStockDate: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setOpStockModalOpen(false)}
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

      {/* Modal: Add/Edit Product */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 w-full max-w-md space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-lg text-zinc-900 dark:text-white">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button onClick={() => setProductModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitProduct} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={productForm.productType}
                    onChange={(e) => setProductForm({ ...productForm, productType: e.target.value })}
                    disabled={!!editingProduct}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl disabled:opacity-60"
                  >
                    <option value="RawMaterial">Raw Material</option>
                    <option value="FinishedGoods">Finished Good</option>
                    <option value="TradingMaterial">Trading Material</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Firm Name <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={productForm.firmName}
                    onChange={(e) => setProductForm({ ...productForm, firmName: e.target.value })}
                    disabled={!!editingProduct}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl disabled:opacity-60"
                  >
                    <option value="">Select firm...</option>
                    {FIRM_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Item / Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingProduct}
                  placeholder="Enter item or product name"
                  value={productForm.itemName}
                  onChange={(e) => setProductForm({ ...productForm, itemName: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl disabled:opacity-60"
                />
              </div>

              {productForm.productType === 'RawMaterial' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Optimum Qty</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0"
                        value={productForm.optimumQty}
                        onChange={(e) => setProductForm({ ...productForm, optimumQty: e.target.value })}
                        className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Max Qty</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0"
                        value={productForm.maxQty}
                        onChange={(e) => setProductForm({ ...productForm, maxQty: e.target.value })}
                        className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Annual Consumption</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0"
                        value={productForm.annualConsumption}
                        onChange={(e) => setProductForm({ ...productForm, annualConsumption: e.target.value })}
                        className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        Unit <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={productForm.unit}
                        onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                        className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                      >
                        <option value="">Select Unit...</option>
                        {UNIT_OPTIONS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Safety Factor</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0"
                        value={productForm.safetyFactor}
                        onChange={(e) => setProductForm({ ...productForm, safetyFactor: e.target.value })}
                        className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Lead Time (Days)</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0"
                        value={productForm.leadTimeDays}
                        onChange={(e) => setProductForm({ ...productForm, leadTimeDays: e.target.value })}
                        className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl disabled:opacity-50"
                >
                  {savingProduct ? 'Saving...' : editingProduct ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
