"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { API_URL, getToken } from "@/lib/auth";
import { useAuth } from "@/systems/order/context/AuthContext";
import { uploadFileToStorage } from "@/systems/order/utils/storageUtils";
import { fetchMasterData } from "@/systems/order/utils/masterDataUtils";
import { canViewFirm } from "@/systems/order/utils/firmFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody, SheetFooter } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search, Loader2, FileText, Clock, Eye, Filter, ChevronDown, ChevronRight,
  Download, Plus, RefreshCw, X, TrendingUp, CheckCircle, Trash2, Package, ChevronsUpDown,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Ported from _reference/New-Order-collection components/pages/OrderPage.jsx
// + components/forms/OrderForm.jsx. That reference talks to Supabase
// directly; here every read/write goes through merge-system-backend's
// /api/order/receipt + /api/order/master REST endpoints instead (see
// systems/order/supabase.js — Supabase is storage-only in this system).
// ---------------------------------------------------------------------------

const COLUMN_CONFIG = [
  { id: "date", label: "PO Date" },
  { id: "poNumber", label: "PO / DO No." },
  { id: "orderNumberOfProduction", label: "Production Order ID" },
  { id: "partyName", label: "Party Name" },
  { id: "productName", label: "Product" },
  { id: "transport", label: "Transporter Type" },
  { id: "quantity", label: "Qty" },
  { id: "dispatched", label: "Dispatched" },
  { id: "pendingQty", label: "Pending Qty" },
  { id: "rate", label: "Rate" },
  { id: "paymentToBeTaken", label: "Pending PO" },
  { id: "retentionPayment", label: "Retention Payment" },
  { id: "retentionPercentage", label: "Retention %" },
  { id: "manager", label: "Manager" },
  { id: "status", label: "Status" },
  { id: "firmName", label: "Firm" },
];

const DEFAULT_VISIBLE_COLUMNS = COLUMN_CONFIG.reduce((acc, c) => ({ ...acc, [c.id]: true }), {});

const TRANSPORT_TYPES = ["FOR", "Ex Factory", "Ex Factory But paid by Us", "Owned Truck"];
const PACKAGING_TYPES = ["25 kg in ton bag", "50 kg in ton bag", "25 Kg Bag (Normal)", "50 Kg Bag (Normal)"];
const ORDER_RECEIVED_FROM_OPTIONS = ["NBD & CRR OF CRR FMS", "NBD AND NBD OF CRR OUTGOING FMS", "CRR ENQUIRY"];
const APPLICATION_TYPES = ["Full application", "Our Supervision only", "Patching only", "None of the above"];
const YES_NO = ["Yes", "No"];

const EMPTY_PRODUCT = {
  productName: "", quantity: "", rateOfMaterial: "", aluminaPercent: "", ironPercent: "",
  advance: "100", freightAmount: "",
};

const EMPTY_FORM = {
  firmName: "", partyPoNo: "", partyPoDate: "", partyName: "", gstNumber: "", address: "",
  typeOfTransporting: "", freightAmount: "", typeOfPackaging: "", typeOfMeasurement: "",
  uploadSo: "", contactPersonName: "", contactPersonWhatsapp: "", orderReceivedFrom: "",
  typeOfPi: "", customerCategory: "", marketingSalesPerson: "", adjustedAmount: "",
  paymentToBeTaken: "", retentionPayment: "No", retentionPercentage: "", leadTimeForRetention: "",
  specificConcern: "", referenceNo: "", tcRequired: "No", freeReplacementFoc: "",
  typeOfApplication: "", leadTimeForCollectionOfFinalPayment: "", leadTimeToReachFactory: "",
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
};

const toDateInput = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const num = (v) => parseFloat(v) || 0;
const fmtQty = (v) => (v || 0).toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const fmtMoney = (v) => `₹${(v || 0).toLocaleString("en-IN")}`;

// Hand-rolled searchable dropdown — the reference uses a Popover+Command
// combobox but this repo's shadcn set doesn't carry the Command primitive
// (see systems/purchase/components/HODApproval.jsx's identical helper).
function SearchableSelect({ value, onValueChange, options, placeholder, loading }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = (options || []).filter((o) => o.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative">
      <Button
        type="button" variant="outline" role="combobox" aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-full justify-between h-9 bg-white dark:bg-zinc-900 font-normal"
      >
        <span className="truncate">{value || (loading ? "Loading..." : placeholder)}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
          <div className="sticky top-0 bg-white dark:bg-zinc-900 p-2 border-b border-zinc-200 dark:border-zinc-700">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="h-7 text-xs" onClick={(e) => e.stopPropagation()} />
          </div>
          <div className="py-1">
            {filtered.length === 0 && <div className="px-3 py-2 text-xs text-zinc-400">No options found.</div>}
            {filtered.map((opt) => (
              <div
                key={opt}
                className={`px-3 py-2 text-xs cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 ${value === opt ? "bg-emerald-50 dark:bg-emerald-950" : ""}`}
                onClick={() => { onValueChange(opt === value ? "" : opt); setOpen(false); setSearch(""); }}
              >
                {opt}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const DetailField = ({ label, value }) => {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 break-words">{value}</p>
    </div>
  );
};

export default function Order() {
  const { user, isSuperAdmin, isReadOnly } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [masterData, setMasterData] = useState({});
  const [partyToFirm, setPartyToFirm] = useState({});

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [firmFilter, setFirmFilter] = useState("all");
  const [managerFilter, setManagerFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expandedPOs, setExpandedPOs] = useState(new Set());

  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_COLUMNS);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = JSON.parse(localStorage.getItem("orderPageVisibleColumns") || "null");
      if (saved) setVisibleColumns((prev) => ({ ...prev, ...saved }));
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    localStorage.setItem("orderPageVisibleColumns", JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const [showForm, setShowForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [uploadingPO, setUploadingPO] = useState(false);

  const loadMasterData = useCallback(async () => {
    const md = await fetchMasterData();
    setMasterData(md);
    try {
      const res = await fetch(`${API_URL}/order/master`);
      const json = await res.json();
      const map = {};
      (json.data || []).forEach((r) => {
        if (r.partyName && !map[r.partyName.trim()]) map[r.partyName.trim()] = r.firmName || "";
      });
      setPartyToFirm(map);
    } catch { /* ignore */ }
  }, []);

  const fetchOrders = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${API_URL}/order/receipt`);
      const json = await res.json();
      setOrders(json.data || []);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadMasterData(); fetchOrders(); }, [loadMasterData, fetchOrders]);

  const computeStatus = (r) => {
    if (r.orderCancelledAt) return "Cancelled";
    if (r.pendingQty !== null && r.pendingQty !== undefined && r.pendingQty <= 0 && num(r.delivered) > 0) return "Completed";
    if (r.checkPo || r.receivedAccounts || r.checkDelivery || (r.logisticsStatus && r.logisticsStatus !== "Pending Arrangement")) return "Pending";
    return r.status || "New Order";
  };

  const scopedOrders = useMemo(
    () => orders.filter((o) => isSuperAdmin || canViewFirm(user?.firmName, o.firmName)),
    [orders, isSuperAdmin, user]
  );

  const filteredOrders = useMemo(() => {
    let filtered = scopedOrders;
    if (firmFilter !== "all") filtered = filtered.filter((o) => o.firmName === firmFilter);
    if (statusFilter !== "all") filtered = filtered.filter((o) => computeStatus(o) === statusFilter);
    if (managerFilter !== "all") filtered = filtered.filter((o) => o.marketingManagerName === managerFilter);
    if (productFilter !== "all") filtered = filtered.filter((o) => o.productName === productFilter);
    if (startDate) filtered = filtered.filter((o) => o.partyPoDate && toDateInput(o.partyPoDate) >= startDate);
    if (endDate) filtered = filtered.filter((o) => o.partyPoDate && toDateInput(o.partyPoDate) <= endDate);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((o) =>
        ["doNumber", "partyPoNo", "orderNumberOfProduction", "partyName", "productName", "contactPersonName", "firmName"].some((f) =>
          String(o[f] || "").toLowerCase().includes(term)
        ) || (o.productionOrder?.id && String(o.productionOrder.id).toLowerCase().includes(term))
      );
    }
    return filtered;
  }, [scopedOrders, firmFilter, statusFilter, managerFilter, productFilter, startDate, endDate, searchTerm]);

  const groupedOrders = useMemo(() => {
    const groups = {};
    const order = [];
    filteredOrders.forEach((o) => {
      const po = o.partyPoNo || "No PO";
      if (!groups[po]) {
        groups[po] = {
          poNumber: po, partyName: o.partyName, firmName: o.firmName, items: [],
          totalQuantity: 0, totalDelivered: 0, totalPendingQty: 0, date: formatDate(o.partyPoDate),
          products: new Set(), maxId: o.id,
        };
        order.push(po);
      }
      const g = groups[po];
      g.items.push(o);
      g.totalQuantity += num(o.quantity);
      g.totalDelivered += num(o.delivered);
      g.totalPendingQty += num(o.pendingQty);
      if (o.productName) g.products.add(o.productName);
      if (o.id > g.maxId) g.maxId = o.id;
    });
    return order
      .map((po) => {
        const g = groups[po];
        const names = Array.from(g.products);
        return { ...g, productName: names.length === 1 ? names[0] : `${names.length} products` };
      })
      .sort((a, b) => b.maxId - a.maxId);
  }, [filteredOrders]);

  const statsOrders = useMemo(
    () => (firmFilter !== "all" ? scopedOrders.filter((o) => o.firmName === firmFilter) : scopedOrders),
    [scopedOrders, firmFilter]
  );
  const totalValue = statsOrders.reduce((s, o) => s + num(o.totalPoBasicValue), 0);
  const totalQuantity = statsOrders.reduce((s, o) => s + num(o.quantity), 0);
  const pendingOrdersCount = statsOrders.filter((o) => ["Pending", "New Order"].includes(computeStatus(o))).length;

  const uniqueFirms = [...new Set(scopedOrders.map((o) => o.firmName).filter(Boolean))];
  const uniqueStatuses = [...new Set(scopedOrders.map((o) => computeStatus(o)))];
  const uniqueManagers = [...new Set(scopedOrders.map((o) => o.marketingManagerName).filter(Boolean))];
  const uniqueProducts = [...new Set(scopedOrders.map((o) => o.productName).filter(Boolean))];

  const togglePO = (po) => {
    setExpandedPOs((prev) => {
      const next = new Set(prev);
      next.has(po) ? next.delete(po) : next.add(po);
      return next;
    });
  };

  const resetFilters = () => {
    setSearchTerm(""); setStatusFilter("all"); setFirmFilter("all");
    setManagerFilter("all"); setProductFilter("all"); setStartDate(""); setEndDate("");
  };

  const handleExport = () => {
    const cols = COLUMN_CONFIG.filter((c) => visibleColumns[c.id]);
    const header = ["DO No.", ...cols.map((c) => c.label)];
    const rows = filteredOrders.map((o) => [
      o.doNumber || "",
      ...cols.map((c) => {
        switch (c.id) {
          case "date": return formatDate(o.partyPoDate);
          case "poNumber": return o.partyPoNo || "No PO";
          case "orderNumberOfProduction": return o.orderNumberOfProduction || o.productionOrder?.id || "";
          case "partyName": return o.partyName || "";
          case "productName": return o.productName || "";
          case "transport": return o.typeOfTransporting || "";
          case "quantity": return o.quantity ?? "";
          case "dispatched": return o.delivered ?? "";
          case "pendingQty": return o.pendingQty ?? "";
          case "rate": return o.rateOfMaterial ?? "";
          case "paymentToBeTaken": return o.paymentToBeTaken || "";
          case "retentionPayment": return o.retentionPayment || "";
          case "retentionPercentage": return o.retentionPercentage ?? "";
          case "manager": return o.marketingManagerName || "";
          case "status": return computeStatus(o);
          case "firmName": return o.firmName || "";
          default: return "";
        }
      }),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `Orders_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const viewOrderDetails = (order) => { setSelectedOrder(order); setShowDetailModal(true); };

  const handlePOReplace = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedOrder) return;
    setUploadingPO(true);
    try {
      const { url } = await uploadFileToStorage(file, "images", "orders");
      const res = await fetch(`${API_URL}/order/receipt/upload-so`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          partyPoNo: selectedOrder.partyPoNo, firmName: selectedOrder.firmName,
          uploadSo: url, rowId: selectedOrder.id,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to update PO");
      setOrders((prev) => prev.map((o) =>
        (selectedOrder.partyPoNo && selectedOrder.partyPoNo !== "No PO")
          ? (o.partyPoNo === selectedOrder.partyPoNo ? { ...o, uploadSo: url } : o)
          : (o.id === selectedOrder.id ? { ...o, uploadSo: url } : o)
      ));
      setSelectedOrder((prev) => ({ ...prev, uploadSo: url }));
      toast.success("PO Copy updated successfully");
    } catch (err) {
      toast.error("Failed to update PO: " + err.message);
    } finally {
      setUploadingPO(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Orders</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">Manage your orders</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline" className="gap-2"><Download className="h-4 w-4" /> Export</Button>
          {!isReadOnly && (
            <Button onClick={() => setShowForm(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <Plus className="h-4 w-4" /> Add New Order
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-6 flex justify-between items-center">
          <div><p className="text-sm font-medium text-zinc-500">Total Orders</p><div className="text-2xl font-bold">{statsOrders.length}</div></div>
          <FileText className="h-8 w-8 text-blue-500" />
        </CardContent></Card>
        <Card><CardContent className="p-6 flex justify-between items-center">
          <div><p className="text-sm font-medium text-zinc-500">Total Value</p><div className="text-2xl font-bold">{fmtMoney(totalValue)}</div></div>
          <TrendingUp className="h-8 w-8 text-green-500" />
        </CardContent></Card>
        <Card><CardContent className="p-6 flex justify-between items-center">
          <div><p className="text-sm font-medium text-zinc-500">Total Quantity</p><div className="text-2xl font-bold">{fmtQty(totalQuantity)}</div></div>
          <CheckCircle className="h-8 w-8 text-purple-500" />
        </CardContent></Card>
        <Card><CardContent className="p-6 flex justify-between items-center">
          <div><p className="text-sm font-medium text-zinc-500">Pending Orders</p><div className="text-2xl font-bold">{pendingOrdersCount}</div></div>
          <Clock className="h-8 w-8 text-amber-500" />
        </CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
              <Input placeholder="Search by PO Number, Party Name or Firm..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-9" />
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-9 px-3 gap-2"><Filter className="h-4 w-4" /> Columns</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 max-h-[60vh] overflow-y-auto">
                  <DropdownMenuLabel>Visible Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {COLUMN_CONFIG.map((c) => (
                    <DropdownMenuCheckboxItem key={c.id} checked={visibleColumns[c.id]} onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, [c.id]: v }))}>
                      {c.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-emerald-600 cursor-pointer hover:underline" onClick={resetFilters}>
                    Reset Filters
                  </DropdownMenuLabel>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" onClick={fetchOrders} disabled={refreshing} className="h-9 px-3">
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select value={firmFilter} onValueChange={setFirmFilter}>
              <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="All Firms" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Firms</SelectItem>{uniqueFirms.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Status</SelectItem>{uniqueStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={managerFilter} onValueChange={setManagerFilter}>
              <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Manager" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Managers</SelectItem>{uniqueManagers.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Product" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Products</SelectItem>{uniqueProducts.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
            <div className="flex items-center gap-2 border rounded-md px-3 h-9 border-zinc-200 dark:border-zinc-800">
              <span className="text-xs font-semibold text-zinc-500 whitespace-nowrap">PO Date:</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent border-0 text-sm focus:outline-none w-[120px]" />
              <span className="text-zinc-400 text-xs">to</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent border-0 text-sm focus:outline-none w-[120px]" />
              {(startDate || endDate) && (
                <button onClick={() => { setStartDate(""); setEndDate(""); }} className="text-zinc-400 hover:text-zinc-600"><X className="h-3.5 w-3.5" /></button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
          <h2 className="font-semibold">Order List</h2>
          <span className="text-sm text-zinc-500">{filteredOrders.length} orders</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin w-6 h-6 text-emerald-500" /></div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-zinc-400">No orders found</div>
        ) : (
          <div className="overflow-auto max-h-[calc(100vh-320px)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  {visibleColumns.date && <TableHead>PO Date</TableHead>}
                  {visibleColumns.poNumber && <TableHead>Party PO / DO No.</TableHead>}
                  {visibleColumns.partyName && <TableHead>Party Name</TableHead>}
                  {visibleColumns.productName && <TableHead>Product</TableHead>}
                  {visibleColumns.transport && <TableHead>Transporter Type</TableHead>}
                  {visibleColumns.quantity && <TableHead className="text-right">Qty</TableHead>}
                  {visibleColumns.dispatched && <TableHead className="text-right">Dispatched</TableHead>}
                  {visibleColumns.pendingQty && <TableHead className="text-right">Pending Qty</TableHead>}
                  {visibleColumns.rate && <TableHead className="text-right">Rate</TableHead>}
                  {visibleColumns.paymentToBeTaken && <TableHead className="text-right">Pending PO</TableHead>}
                  {visibleColumns.retentionPayment && <TableHead className="text-right">Retention Payment</TableHead>}
                  {visibleColumns.retentionPercentage && <TableHead className="text-right">Retention %</TableHead>}
                  {visibleColumns.manager && <TableHead>Manager</TableHead>}
                  {visibleColumns.status && <TableHead>Status</TableHead>}
                  {visibleColumns.firmName && <TableHead>Firm</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedOrders.map((group) => {
                  const isExpanded = expandedPOs.has(group.poNumber);
                  return (
                    <React.Fragment key={group.poNumber}>
                      <TableRow className="bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-100/40 cursor-pointer font-medium border-l-4 border-l-emerald-600" onClick={() => togglePO(group.poNumber)}>
                        <TableCell>{isExpanded ? <ChevronDown className="h-4 w-4 text-emerald-600" /> : <ChevronRight className="h-4 w-4 text-zinc-400" />}</TableCell>
                        {visibleColumns.date && <TableCell className="text-xs text-zinc-500">{group.date}</TableCell>}
                        {visibleColumns.poNumber && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-emerald-700">{group.poNumber}</span>
                              <Badge variant="secondary" className="text-xs">{group.items.length} {group.items.length === 1 ? "item" : "items"}</Badge>
                            </div>
                          </TableCell>
                        )}
                        {visibleColumns.orderNumberOfProduction && <TableCell />}
                        {visibleColumns.partyName && <TableCell className="text-sm">{group.partyName}</TableCell>}
                        {visibleColumns.productName && <TableCell className="text-sm">{group.productName}</TableCell>}
                        {visibleColumns.transport && <TableCell />}
                        {visibleColumns.quantity && <TableCell className="text-right font-semibold">{fmtQty(group.totalQuantity)}</TableCell>}
                        {visibleColumns.dispatched && <TableCell className="text-right font-semibold">{fmtQty(group.totalDelivered)}</TableCell>}
                        {visibleColumns.pendingQty && <TableCell className="text-right font-semibold text-amber-600">{fmtQty(group.totalPendingQty)}</TableCell>}
                        {visibleColumns.rate && <TableCell />}
                        {visibleColumns.paymentToBeTaken && <TableCell />}
                        {visibleColumns.retentionPayment && <TableCell />}
                        {visibleColumns.retentionPercentage && <TableCell />}
                        {visibleColumns.manager && <TableCell />}
                        {visibleColumns.status && <TableCell />}
                        {visibleColumns.firmName && <TableCell className="text-xs text-zinc-400">{group.firmName}</TableCell>}
                      </TableRow>
                      {isExpanded && group.items.map((o) => (
                        <TableRow key={o.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer border-l-4 border-l-zinc-200 dark:border-l-zinc-800" onClick={(e) => { e.stopPropagation(); viewOrderDetails(o); }}>
                          <TableCell />
                          {visibleColumns.date && <TableCell className="text-[10px] text-zinc-400">{formatDate(o.partyPoDate)}</TableCell>}
                          {visibleColumns.poNumber && <TableCell className="pl-6 italic text-zinc-600 dark:text-zinc-300">{o.doNumber}</TableCell>}
                          {visibleColumns.orderNumberOfProduction && (
                            <TableCell className="font-mono text-xs text-blue-600 dark:text-blue-400">
                              {o.orderNumberOfProduction || o.productionOrder?.id || "—"}
                            </TableCell>
                          )}
                          {visibleColumns.partyName && <TableCell className="text-zinc-500">{o.partyName}</TableCell>}
                          {visibleColumns.productName && <TableCell>{o.productName}</TableCell>}
                          {visibleColumns.transport && <TableCell className="text-[10px] text-zinc-400">{o.typeOfTransporting}</TableCell>}
                          {visibleColumns.quantity && <TableCell className="text-right"><div>{o.quantity || "0"}</div>{o.typeOfMeasurement && <div className="text-xs text-zinc-400">{o.typeOfMeasurement}</div>}</TableCell>}
                          {visibleColumns.dispatched && <TableCell className="text-right text-zinc-600">{o.delivered || "0"}</TableCell>}
                          {visibleColumns.pendingQty && <TableCell className="text-right font-medium text-amber-600">{o.pendingQty ?? o.quantity ?? "0"}</TableCell>}
                          {visibleColumns.rate && <TableCell className="text-right text-zinc-600">{fmtMoney(o.rateOfMaterial)}</TableCell>}
                          {visibleColumns.paymentToBeTaken && <TableCell className="text-right font-medium">{o.paymentToBeTaken || "-"}</TableCell>}
                          {visibleColumns.retentionPayment && <TableCell className="text-right">{o.retentionPayment || "-"}</TableCell>}
                          {visibleColumns.retentionPercentage && <TableCell className="text-right">{o.retentionPercentage != null ? `${o.retentionPercentage}%` : "-"}</TableCell>}
                          {visibleColumns.manager && <TableCell className="text-[10px] text-zinc-400">{o.marketingManagerName}</TableCell>}
                          {visibleColumns.status && <TableCell><Badge variant="outline" className="text-[10px]">{computeStatus(o)}</Badge></TableCell>}
                          {visibleColumns.firmName && <TableCell className="text-xs text-zinc-400">{o.firmName}</TableCell>}
                        </TableRow>
                      ))}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {showForm && (
        <NewOrderDialog
          open={showForm}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); fetchOrders(); }}
          masterData={masterData}
          partyToFirm={partyToFirm}
          user={user}
          isSuperAdmin={isSuperAdmin}
        />
      )}

      <Sheet open={showDetailModal} onOpenChange={setShowDetailModal}>
        <SheetContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <SheetHeader>
                <SheetTitle>Order Details</SheetTitle>
                <p className="text-sm text-zinc-500">
                  DO: <span className="font-medium">{selectedOrder.doNumber}</span>
                  {selectedOrder.partyPoNo && <> &middot; PO: <span className="font-medium">{selectedOrder.partyPoNo}</span></>}
                </p>
              </SheetHeader>
              <div className="space-y-8">
                <section>
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4 pb-2 border-b">Basic Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DetailField label="DO Number" value={selectedOrder.doNumber} />
                    <DetailField label="Production Order ID" value={selectedOrder.orderNumberOfProduction || selectedOrder.productionOrder?.id || selectedOrder.productionOrder?.deliveryOrderNo} />
                    <DetailField label="Party PO Number" value={selectedOrder.partyPoNo} />
                    <DetailField label="Firm Name" value={selectedOrder.firmName} />
                    <DetailField label="Party Name" value={selectedOrder.partyName} />
                    <DetailField label="GST Number" value={selectedOrder.gstNumber} />
                    <div className="sm:col-span-2 lg:col-span-3"><DetailField label="Address" value={selectedOrder.address} /></div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4 pb-2 border-b">Contact & Order Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DetailField label="Contact Person" value={selectedOrder.contactPersonName} />
                    <DetailField label="WhatsApp No." value={selectedOrder.contactPersonWhatsapp} />
                    <DetailField label="Order Received From" value={selectedOrder.orderReceivedFrom} />
                    <DetailField label="Type of PI" value={selectedOrder.typeOfPi} />
                    <DetailField label="Customer Category" value={selectedOrder.customerCategory} />
                    <DetailField label="Marketing Manager" value={selectedOrder.marketingManagerName} />
                    <DetailField label="Type of Application" value={selectedOrder.typeOfApplication} />
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4 pb-2 border-b">Products (this PO)</h3>
                  <div className="overflow-auto rounded-md border border-zinc-200 dark:border-zinc-800">
                    <table className="w-full text-sm">
                      <thead><tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                        <th className="text-left py-2 px-3 font-medium whitespace-nowrap">DO No.</th>
                        <th className="text-left py-2 px-3 font-medium whitespace-nowrap">Product</th>
                        <th className="text-right py-2 px-3 font-medium whitespace-nowrap">Qty</th>
                        <th className="text-right py-2 px-3 font-medium whitespace-nowrap">Rate</th>
                        <th className="text-right py-2 px-3 font-medium whitespace-nowrap">Alumina %</th>
                        <th className="text-right py-2 px-3 font-medium whitespace-nowrap">Iron %</th>
                        <th className="text-right py-2 px-3 font-medium whitespace-nowrap">Advance %</th>
                      </tr></thead>
                      <tbody>
                        {orders.filter((o) => o.partyPoNo === selectedOrder.partyPoNo).map((item) => (
                          <tr key={item.id} className={`border-b last:border-0 border-zinc-100 dark:border-zinc-800 ${item.id === selectedOrder.id ? "bg-emerald-50 dark:bg-emerald-950/30" : ""}`}>
                            <td className="py-2 px-3 whitespace-nowrap">{item.doNumber || "—"}</td>
                            <td className="py-2 px-3 font-medium">{item.productName || "—"}</td>
                            <td className="py-2 px-3 text-right whitespace-nowrap">{item.quantity != null ? `${item.quantity}${item.typeOfMeasurement ? ` ${item.typeOfMeasurement}` : ""}` : "—"}</td>
                            <td className="py-2 px-3 text-right whitespace-nowrap">{item.rateOfMaterial ? fmtMoney(item.rateOfMaterial) : "—"}</td>
                            <td className="py-2 px-3 text-right whitespace-nowrap">{item.aluminaPercent != null ? `${item.aluminaPercent}%` : "—"}</td>
                            <td className="py-2 px-3 text-right whitespace-nowrap">{item.ironPercent != null ? `${item.ironPercent}%` : "—"}</td>
                            <td className="py-2 px-3 text-right whitespace-nowrap">{item.advance != null ? `${item.advance}%` : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4 pb-2 border-b">Logistics & Packaging</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DetailField label="Transporter Type" value={selectedOrder.typeOfTransporting} />
                    <DetailField label="Type of Packaging" value={selectedOrder.typeOfPackaging} />
                    <DetailField label="Lead Time (Reach Factory)" value={selectedOrder.leadTimeToReachFactory ? `${selectedOrder.leadTimeToReachFactory} days` : null} />
                    <DetailField label="TC Required" value={selectedOrder.tcRequired} />
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-zinc-500">PO Copy</p>
                      <div className="flex items-center gap-3">
                        {selectedOrder.uploadSo && (
                          <button type="button" onClick={() => window.open(selectedOrder.uploadSo, "_blank")} className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-800 font-medium underline underline-offset-2">
                            <Eye className="w-4 h-4" /> View PO
                          </button>
                        )}
                        {!isReadOnly && (
                          <div className="relative">
                            <input type="file" id="po-replace-upload" className="hidden" onChange={handlePOReplace} disabled={uploadingPO} accept="image/*,.pdf" />
                            <label htmlFor="po-replace-upload" className="flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 font-medium cursor-pointer">
                              {uploadingPO ? <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> : <RefreshCw className="w-4 h-4" />}
                              {uploadingPO ? "Updating..." : selectedOrder.uploadSo ? "Replace PO" : "Upload PO"}
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4 pb-2 border-b">Payment & Terms</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DetailField label="Payment to Be Taken" value={selectedOrder.paymentToBeTaken} />
                    <DetailField label="Retention Payment" value={selectedOrder.retentionPayment} />
                    <DetailField label="Retention %" value={selectedOrder.retentionPercentage ? `${selectedOrder.retentionPercentage}%` : null} />
                    <DetailField label="Lead Time (Retention)" value={selectedOrder.leadTimeForRetention ? `${selectedOrder.leadTimeForRetention} days` : null} />
                    <DetailField label="Lead Time (Final Payment)" value={selectedOrder.leadTimeForCollectionOfFinalPayment ? `${selectedOrder.leadTimeForCollectionOfFinalPayment}` : null} />
                    <DetailField label="Free Replacement (FOC)" value={selectedOrder.freeReplacementFoc} />
                    <DetailField label="PI Due Date" value={formatDate(selectedOrder.piDueDate)} />
                    <DetailField label="Reference No." value={selectedOrder.referenceNo} />
                    <div className="sm:col-span-2"><DetailField label="Specific Concern" value={selectedOrder.specificConcern} /></div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4 pb-2 border-b">Status</h3>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{computeStatus(selectedOrder)}</Badge>
                    <span className="text-xs text-zinc-400">Order Date: {formatDate(selectedOrder.timestamp)}</span>
                  </div>
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ---------------------------------------------------------------------------
// New Order dialog — ports OrderForm.jsx. Submits once to POST /order/receipt
// with a `products[]` array; the backend creates one OrderReceipt row per
// product line under one atomically-generated DO number (see
// merge-system-backend/src/order/receipt/receipt.controller.js).
// ---------------------------------------------------------------------------
function NewOrderDialog({ open, onClose, onSuccess, masterData, partyToFirm, user, isSuperAdmin }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    firmName: isSuperAdmin ? "" : (Array.isArray(user?.firmName) ? user.firmName[0] : user?.firmName) || "",
  }));
  const [products, setProducts] = useState([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [currentProduct, setCurrentProduct] = useState({ ...EMPTY_PRODUCT });
  const [soFile, setSoFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const set = (key, value) => setForm((f) => {
    const updated = { ...f, [key]: value };
    if (key === "typeOfTransporting" && value !== "Ex Factory But paid by Us") updated.freightAmount = "";
    return updated;
  });

  const handlePartyChange = (partyName) => {
    setForm((f) => ({
      ...f,
      partyName,
      address: masterData.partyDetailsMap?.[partyName]?.address || f.address,
      gstNumber: masterData.partyDetailsMap?.[partyName]?.gstNumber || f.gstNumber,
      firmName: isSuperAdmin ? (partyToFirm[partyName] || f.firmName) : f.firmName,
    }));
  };

  // PI Due Date is auto-computed by the backend on submit (createReceipt) —
  // shown here as a live preview only, matching OrderForm.jsx's UX.
  const piDueDatePreview = useMemo(() => {
    const t = (form.typeOfPi || "").toLowerCase();
    if (!(t.includes("100") && t.includes("after"))) return "";
    const days = (parseInt(form.leadTimeForCollectionOfFinalPayment, 10) || 0) + (parseInt(form.leadTimeToReachFactory, 10) || 0);
    if (!days) return "";
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }, [form.typeOfPi, form.leadTimeForCollectionOfFinalPayment, form.leadTimeToReachFactory]);

  const handleProductChange = (field, value) => {
    setCurrentProduct((p) => {
      const updated = { ...p, [field]: value };
      if (field === "advance") {
        const advance = Math.min(100, Math.max(0, parseFloat(value) || 0));
        updated.advance = String(advance);
      }
      return updated;
    });
  };

  const addProduct = () => {
    if (!currentProduct.productName || !currentProduct.quantity || !currentProduct.rateOfMaterial) return;
    setProducts((p) => [...p, { ...currentProduct, _id: Date.now() }]);
    setCurrentProduct({ ...EMPTY_PRODUCT });
    setShowProductForm(false);
  };

  const removeProduct = (id) => setProducts((p) => p.filter((x) => x._id !== id));

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const { url } = await uploadFileToStorage(file, "images", "orders");
      setForm((f) => ({ ...f, uploadSo: url }));
      setSoFile(file.name);
      toast.success("File uploaded");
    } catch {
      setForm((f) => ({ ...f, uploadSo: file.name || "N/A" }));
      setSoFile(file.name);
      toast.info("Selected file locally (Storage not configured)");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (products.length === 0) { toast.error("Please add at least one product"); return; }
    const required = [
      ["firmName", "Firm Name"], ["partyPoNo", "PARTY PO NO"], ["partyName", "Party Name"],
      ["contactPersonName", "Contact Person Name"], ["contactPersonWhatsapp", "Contact Person WhatsApp No."],
    ];
    for (const [key, label] of required) {
      if (!form[key]) { toast.error(`Please fill in ${label}`); return; }
    }
    if (form.typeOfTransporting === "Ex Factory But paid by Us" && !form.freightAmount) {
      toast.error("Please fill in Freight Amount"); return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/order/receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          ...form,
          uploadSo: form.uploadSo || "N/A",
          products: products.map(({ _id, ...p }) => p),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to submit order");
      toast.success(`Order created — DO: ${json.data.doNumber}`);
      onSuccess();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="sm:max-w-4xl flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b shrink-0"><SheetTitle>Order Receipt Form</SheetTitle></SheetHeader>
        <SheetBody>
          <form id="order-receipt-form" onSubmit={handleSubmit} className="space-y-8 pb-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">1. Basic Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Firm Name *</Label>
                  <SearchableSelect value={form.firmName} onValueChange={(v) => set("firmName", v)} options={masterData.firmNameOptions} placeholder="Select Firm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">PARTY PO NO (As Per PO Exact) *</Label>
                  <Input value={form.partyPoNo} onChange={(e) => set("partyPoNo", e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Party PO Date *</Label>
                  <Input type="date" value={form.partyPoDate} onChange={(e) => set("partyPoDate", e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Party Name *</Label>
                  <SearchableSelect value={form.partyName} onValueChange={handlePartyChange} options={masterData.partyNameOptions} placeholder="Select Party Name" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">GST Number</Label>
                  <Input value={form.gstNumber} onChange={(e) => set("gstNumber", e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Address</Label>
                  <Textarea value={form.address} readOnly className="h-9 bg-zinc-50 dark:bg-zinc-900" placeholder="Auto-filled from Party Name" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Type Of Transporting</Label>
                  <Select value={form.typeOfTransporting} onValueChange={(v) => set("typeOfTransporting", v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select transport type" /></SelectTrigger>
                    <SelectContent>{TRANSPORT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {form.typeOfTransporting === "Ex Factory But paid by Us" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Freight Amount *</Label>
                    <Input type="number" min="0" step="0.01" value={form.freightAmount} onChange={(e) => set("freightAmount", e.target.value)} className="h-9" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs">Type of Packaging</Label>
                  <Select value={form.typeOfPackaging} onValueChange={(v) => set("typeOfPackaging", v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select packaging type" /></SelectTrigger>
                    <SelectContent>{PACKAGING_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Type Of Measurement (UOM)</Label>
                  <Select value={form.typeOfMeasurement} onValueChange={(v) => set("typeOfMeasurement", v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select UOM" /></SelectTrigger>
                    <SelectContent>{(masterData.uomOptions || []).map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Upload PO *</Label>
                  <div className="flex items-center gap-2">
                    <Input type="file" onChange={handleFileChange} className="h-9 cursor-pointer" />
                    {uploadingFile && <Loader2 className="animate-spin w-4 h-4 text-emerald-500 shrink-0" />}
                    {soFile && <Badge variant="outline" className="text-xs bg-green-50 text-green-700 truncate max-w-[140px]">✓ {soFile}</Badge>}
                  </div>
                </div>
              </div>
            </div>

            {/* Contact & Order Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">2. Contact & Order Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Contact Person Name *</Label>
                  <Input value={form.contactPersonName} onChange={(e) => set("contactPersonName", e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Contact Person WhatsApp No. *</Label>
                  <Input type="tel" value={form.contactPersonWhatsapp} onChange={(e) => set("contactPersonWhatsapp", e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Order Received From</Label>
                  <Select value={form.orderReceivedFrom} onValueChange={(v) => set("orderReceivedFrom", v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select source" /></SelectTrigger>
                    <SelectContent>{ORDER_RECEIVED_FROM_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Type Of PI</Label>
                  <Select value={form.typeOfPi} onValueChange={(v) => set("typeOfPi", v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select PI type" /></SelectTrigger>
                    <SelectContent>{(masterData.typeOfPiOptions || []).map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Customer Category</Label>
                  <SearchableSelect value={form.customerCategory} onValueChange={(v) => set("customerCategory", v)} options={masterData.customerCategoryOptions} placeholder="Select Customer Category" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Marketing Sales Person</Label>
                  <SearchableSelect value={form.marketingSalesPerson} onValueChange={(v) => set("marketingSalesPerson", v)} options={masterData.marketingSalesPersonOptions} placeholder="Select manager" />
                </div>
              </div>
            </div>

            {/* Payment & Terms */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">3. Payment & Terms</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Total PO Value With Tax</Label>
                  <Input type="number" value={form.adjustedAmount} onChange={(e) => set("adjustedAmount", e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Payment to Be Taken</Label>
                  <Select value={form.paymentToBeTaken} onValueChange={(v) => set("paymentToBeTaken", v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select payment type" /></SelectTrigger>
                    <SelectContent>{YES_NO.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Retention Payment</Label>
                  <Select value={form.retentionPayment} onValueChange={(v) => set("retentionPayment", v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{YES_NO.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {form.retentionPayment === "Yes" && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Retention Percentage</Label>
                      <Input type="number" value={form.retentionPercentage} onChange={(e) => set("retentionPercentage", e.target.value)} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Lead Time for Retention</Label>
                      <Input value={form.leadTimeForRetention} onChange={(e) => set("leadTimeForRetention", e.target.value)} className="h-9" placeholder="e.g., 30 days" />
                    </div>
                  </>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs">Lead Time For Collection Of Final Payment</Label>
                  <Input value={form.leadTimeForCollectionOfFinalPayment} onChange={(e) => set("leadTimeForCollectionOfFinalPayment", e.target.value)} className="h-9" placeholder="e.g., 15 days" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Lead Time to Reach Factory (Days)</Label>
                  <Input type="number" min="0" value={form.leadTimeToReachFactory} onChange={(e) => set("leadTimeToReachFactory", e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Specific Concern</Label>
                  <Input value={form.specificConcern} onChange={(e) => set("specificConcern", e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Reference No.</Label>
                  <Input value={form.referenceNo} onChange={(e) => set("referenceNo", e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">TC Required</Label>
                  <Select value={form.tcRequired} onValueChange={(v) => set("tcRequired", v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{YES_NO.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Free Replacement (FOC)</Label>
                  <Select value={form.freeReplacementFoc} onValueChange={(v) => set("freeReplacementFoc", v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                      <SelectItem value="Yes But Adjusted">Yes But Adjusted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Type Of Application</Label>
                  <Select value={form.typeOfApplication} onValueChange={(v) => set("typeOfApplication", v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select application type" /></SelectTrigger>
                    <SelectContent>{APPLICATION_TYPES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {piDueDatePreview && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">PI Due Date <span className="text-emerald-600">(Auto-calculated)</span></Label>
                    <Input type="date" value={piDueDatePreview} readOnly className="h-9 bg-emerald-50 dark:bg-emerald-950/30" />
                  </div>
                )}
              </div>
            </div>

            {/* Products */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">4. Products</h3>
                <Button type="button" size="sm" onClick={() => setShowProductForm(true)} className="bg-orange-600 hover:bg-orange-700 text-white gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add Product
                </Button>
              </div>
              {products.length > 0 ? (
                <div className="space-y-2">
                  {products.map((p) => (
                    <div key={p._id} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-orange-600" />
                        <div>
                          <p className="font-semibold text-sm">{p.productName}</p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            <Badge variant="outline" className="text-xs">Qty: {p.quantity}</Badge>
                            <Badge variant="outline" className="text-xs">Rate: {fmtMoney(p.rateOfMaterial)}</Badge>
                            <Badge variant="outline" className="text-xs">Advance: {p.advance}%</Badge>
                            {p.aluminaPercent && <Badge variant="outline" className="text-xs">Al: {p.aluminaPercent}%</Badge>}
                            {p.ironPercent && <Badge variant="outline" className="text-xs">Fe: {p.ironPercent}%</Badge>}
                          </div>
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeProduct(p._id)} className="text-red-600 hover:text-red-700 h-8 w-8">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-zinc-50 dark:bg-zinc-900 rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                  <Package className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
                  <p className="text-zinc-500 text-sm font-medium">No products added yet</p>
                </div>
              )}
            </div>
          </form>
        </SheetBody>
        <SheetFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="order-receipt-form" disabled={submitting || uploadingFile || products.length === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            {submitting ? <><Loader2 className="animate-spin w-4 h-4" /> Submitting...</> : "Submit Order"}
          </Button>
        </SheetFooter>

        {/* Add Product sub-dialog */}
        <Sheet open={showProductForm} onOpenChange={setShowProductForm}>
          <SheetContent className="sm:max-w-2xl flex flex-col p-0">
            <SheetHeader className="px-6 py-4 border-b shrink-0"><SheetTitle>Add Product</SheetTitle></SheetHeader>
            <SheetBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Product Name *</Label>
                  <SearchableSelect value={currentProduct.productName} onValueChange={(v) => handleProductChange("productName", v)} options={masterData.productNameOptions} placeholder="Select Product" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Quantity *</Label>
                  <Input type="number" value={currentProduct.quantity} onChange={(e) => handleProductChange("quantity", e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Rate Of Material *</Label>
                  <Input type="number" value={currentProduct.rateOfMaterial} onChange={(e) => handleProductChange("rateOfMaterial", e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Total (Qty × Rate)</Label>
                  <Input readOnly value={(num(currentProduct.quantity) * num(currentProduct.rateOfMaterial)) || ""} className="h-9 bg-zinc-50 dark:bg-zinc-900" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Alumina%</Label>
                  <Input value={currentProduct.aluminaPercent} onChange={(e) => handleProductChange("aluminaPercent", e.target.value)} className="h-9" placeholder="e.g. 70 or 70-80" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Iron%</Label>
                  <Input value={currentProduct.ironPercent} onChange={(e) => handleProductChange("ironPercent", e.target.value)} className="h-9" placeholder="e.g. 1.2 or 1.2-1.5" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Advance%</Label>
                  <Input type="number" min="0" max="100" value={currentProduct.advance} onChange={(e) => handleProductChange("advance", e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Basic% (auto)</Label>
                  <Input readOnly value={100 - num(currentProduct.advance)} className="h-9 bg-zinc-50 dark:bg-zinc-900" />
                </div>
                {form.typeOfTransporting === "Ex Factory But paid by Us" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Freight Amount (this product)</Label>
                    <Input type="number" value={currentProduct.freightAmount} onChange={(e) => handleProductChange("freightAmount", e.target.value)} className="h-9" />
                  </div>
                )}
              </div>
            </SheetBody>
            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => setShowProductForm(false)}>Cancel</Button>
              <Button
                type="button" onClick={addProduct}
                disabled={!currentProduct.productName || !currentProduct.quantity || !currentProduct.rateOfMaterial}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Add Product
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </SheetContent>
    </Sheet>
  );
}
