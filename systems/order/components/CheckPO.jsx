"use client";

import React, { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import { API_URL, getToken } from "@/lib/auth";
import { useAuth } from "@/systems/order/context/AuthContext";
import { canViewFirm } from "@/systems/order/utils/firmFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Loader2, CheckCircle2, RotateCcw, RefreshCw, ChevronRight, ChevronDown,
  FileText, Truck, Building, User, Package,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Ported from _reference/New-Order-collection components/pages/CheckPOPage.jsx.
// That reference talks to Supabase directly (ORDER RECEIPT sheet, "Planned 1" /
// "Actual 1" / "Expected Delivery Date" columns); here every read/write goes
// through merge-system-backend's /api/order/check-po/* REST endpoints instead
// (see systems/order/supabase.js — Supabase is storage-only in this system).
// The backend already separates pending vs. completed rows (GET /pending vs
// GET /history) instead of the reference's client-side Planned/Actual date
// checks, and adds a Revert action (POST /:receiptId/revert) gated by the
// `canRevert` flag the backend computes per row.
// ---------------------------------------------------------------------------

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
};

const fmtMoney = (v) => `₹${(v || 0).toLocaleString("en-IN")}`;
const todayInput = () => new Date().toISOString().slice(0, 10);

function groupByPo(rows) {
  const groups = {};
  const order = [];
  rows.forEach((r) => {
    const key = r.partyPoNo || `no-po-${r.id}`;
    if (!groups[key]) {
      groups[key] = { key, poNumber: r.partyPoNo || "No PO", partyName: r.partyName, rows: [] };
      order.push(key);
    }
    groups[key].rows.push(r);
  });
  return order.map((k) => groups[k]);
}

function OrderDetails({ order }) {
  return (
    <div className="space-y-4 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
            <Package className="w-4 h-4" /> Product Details
          </h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between border-b border-zinc-200 dark:border-zinc-800 pb-1">
              <span className="text-zinc-500">Product:</span>
              <span className="font-medium text-right">{order.productName}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-200 dark:border-zinc-800 pb-1">
              <span className="text-zinc-500">Quantity:</span>
              <span className="font-medium text-right">{order.quantity}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-200 dark:border-zinc-800 pb-1">
              <span className="text-zinc-500">Rate:</span>
              <span className="font-medium text-right">{fmtMoney(order.rateOfMaterial)}</span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-zinc-500">Transport Type:</span>
              <span className="font-medium text-right">{order.typeOfTransporting}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-zinc-700 dark:text-zinc-200">Technical Specs</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between border-b border-zinc-200 dark:border-zinc-800 pb-1">
              <span className="text-zinc-500">Alumina %:</span>
              <span className="font-medium text-right">{order.aluminaPercent}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-200 dark:border-zinc-800 pb-1">
              <span className="text-zinc-500">Iron %:</span>
              <span className="font-medium text-right">{order.ironPercent}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-200 dark:border-zinc-800 pb-1">
              <span className="text-zinc-500">Measurement:</span>
              <span className="font-medium text-right">{order.typeOfMeasurement}</span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-zinc-500">Application:</span>
              <span className="font-medium text-right">{order.typeOfApplication}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-zinc-700 dark:text-zinc-200">Payment Details</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between border-b border-zinc-200 dark:border-zinc-800 pb-1">
              <span className="text-zinc-500">Total Value:</span>
              <span className="font-bold text-emerald-600 text-right">{fmtMoney(order.totalPoBasicValue)}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-200 dark:border-zinc-800 pb-1">
              <span className="text-zinc-500">Advance:</span>
              <span className="font-medium text-right">{order.advance}%</span>
            </div>
            <div className="flex justify-between border-b border-zinc-200 dark:border-zinc-800 pb-1">
              <span className="text-zinc-500">Retention:</span>
              <span className="font-medium text-right">{order.retentionPercentage}%</span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-zinc-500">GST:</span>
              <span className="font-medium text-right">{order.gstNumber}</span>
            </div>
            {order.uploadSo && (
              <div className="flex justify-between pt-2">
                <span className="text-zinc-500 font-semibold">PO Copy:</span>
                <button
                  type="button"
                  onClick={() => window.open(order.uploadSo, "_blank")}
                  className="text-emerald-600 hover:text-emerald-800 font-medium underline underline-offset-2"
                >
                  View PO
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckPO() {
  const { user, isSuperAdmin, isReadOnly } = useAuth();

  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState("pending");

  const [searchTerm, setSearchTerm] = useState("");
  const [filterFirm, setFilterFirm] = useState("all");
  const [filterParty, setFilterParty] = useState("all");

  const [selectedIds, setSelectedIds] = useState([]);
  const [deliveryDates, setDeliveryDates] = useState({});
  const [expandedRow, setExpandedRow] = useState(null);

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [p, h] = await Promise.all([
        fetch(`${API_URL}/order/check-po/pending`).then((r) => r.json()),
        fetch(`${API_URL}/order/check-po/history`).then((r) => r.json()),
      ]);
      setPending(p.data || []);
      setHistory(h.data || []);
    } catch {
      toast.error("Failed to load Check PO data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Orders scoped to the user's accessible firms — every downstream list,
  // dropdown, and stat must derive from this, not the raw fetched arrays.
  const scopedPending = useMemo(
    () => pending.filter((o) => isSuperAdmin || canViewFirm(user?.firmName, o.firmName)),
    [pending, isSuperAdmin, user]
  );
  const scopedHistory = useMemo(
    () => history.filter((o) => isSuperAdmin || canViewFirm(user?.firmName, o.firmName)),
    [history, isSuperAdmin, user]
  );
  const scopedAll = useMemo(() => [...scopedPending, ...scopedHistory], [scopedPending, scopedHistory]);

  const firmOptions = useMemo(() => ["all", ...new Set(scopedAll.map((o) => o.firmName).filter(Boolean))], [scopedAll]);
  const partyOptions = useMemo(() => ["all", ...new Set(scopedAll.map((o) => o.partyName).filter(Boolean))], [scopedAll]);

  const applyFilters = useCallback((rows) => {
    let filtered = rows;
    if (filterFirm !== "all") filtered = filtered.filter((o) => o.firmName === filterFirm);
    if (filterParty !== "all") filtered = filtered.filter((o) => o.partyName === filterParty);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((o) =>
        ["doNumber", "partyPoNo", "partyName", "productName", "firmName"].some((f) =>
          String(o[f] || "").toLowerCase().includes(term)
        )
      );
    }
    return filtered;
  }, [filterFirm, filterParty, searchTerm]);

  const filteredPending = useMemo(() => applyFilters(scopedPending), [applyFilters, scopedPending]);
  const filteredHistory = useMemo(() => applyFilters(scopedHistory), [applyFilters, scopedHistory]);

  const activeRows = tab === "pending" ? filteredPending : filteredHistory;
  const groupedRows = useMemo(() => groupByPo(activeRows), [activeRows]);

  const handleSelectGroup = useCallback((rows, checked) => {
    const ids = rows.map((r) => r.id);
    if (checked) {
      setSelectedIds((prev) => [...new Set([...prev, ...ids])]);
      setDeliveryDates((prev) => {
        const next = { ...prev };
        ids.forEach((id) => { if (!next[id]) next[id] = todayInput(); });
        return next;
      });
    } else {
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
      setDeliveryDates((prev) => {
        const next = { ...prev };
        ids.forEach((id) => delete next[id]);
        return next;
      });
    }
  }, []);

  const handleDateChange = useCallback((id, value) => {
    setDeliveryDates((prev) => ({ ...prev, [id]: value }));
  }, []);

  const toggleRow = useCallback((id) => {
    setExpandedRow((prev) => (prev === id ? null : id));
  }, []);

  const handleSubmit = async () => {
    if (selectedIds.length === 0) return;
    const missingDate = selectedIds.some((id) => !deliveryDates[id]);
    if (missingDate) {
      toast.error("Please pick an Expected Delivery date for all the orders you've selected.");
      return;
    }
    setSubmitting(true);
    try {
      const results = await Promise.all(
        selectedIds.map((id) =>
          fetch(`${API_URL}/order/check-po/${id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify({ expectedDeliveryDate: deliveryDates[id] }),
          }).then((r) => r.json())
        )
      );
      const failed = results.find((r) => !r.success);
      if (failed) throw new Error(failed.message || "Failed to update some orders");
      toast.success(`Successfully updated ${selectedIds.length} order(s)!`);
      setSelectedIds([]);
      setDeliveryDates({});
      fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to update data. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevert = async (id) => {
    if (!confirm("Revert Check PO for this order?")) return;
    try {
      const res = await fetch(`${API_URL}/order/check-po/${id}/revert`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to revert");
      toast.success("Reverted");
      fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to revert");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
        <span className="text-zinc-500">Loading orders...</span>
      </div>
    );
  }

  const colSpan = tab === "pending" ? 10 : 11;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Check PO</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">Review and set expected delivery dates</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900">
          <CardContent className="p-6 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Orders</p>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-200">{scopedAll.length}</div>
            </div>
            <div className="h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center text-white">
              <FileText className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900">
          <CardContent className="p-6 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Pending Delivery</p>
              <div className="text-2xl font-bold text-amber-900 dark:text-amber-200">{scopedPending.length}</div>
            </div>
            <div className="h-10 w-10 bg-amber-500 rounded-full flex items-center justify-center text-white">
              <Truck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900">
          <CardContent className="p-6 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Completed</p>
              <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-200">{scopedHistory.length}</div>
            </div>
            <div className="h-10 w-10 bg-emerald-500 rounded-full flex items-center justify-center text-white">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters + tabs */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
            <Select value={filterFirm} onValueChange={setFilterFirm}>
              <SelectTrigger className="h-9 w-full lg:w-[180px]">
                <Building className="w-4 h-4 mr-2 shrink-0" />
                <SelectValue placeholder="Filter by Firm" />
              </SelectTrigger>
              <SelectContent>
                {firmOptions.map((f) => (
                  <SelectItem key={f} value={f}>{f === "all" ? "All Firms" : f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterParty} onValueChange={setFilterParty}>
              <SelectTrigger className="h-9 w-full lg:w-[180px]">
                <User className="w-4 h-4 mr-2 shrink-0" />
                <SelectValue placeholder="Filter by Party" />
              </SelectTrigger>
              <SelectContent>
                {partyOptions.map((p) => (
                  <SelectItem key={p} value={p}>{p === "all" ? "All Parties" : p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchData} disabled={refreshing} className="h-9 px-3">
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>

          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-md">
              <button
                onClick={() => setTab("pending")}
                className={`py-1.5 px-4 text-sm font-medium rounded-sm transition-all ${tab === "pending" ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"}`}
              >
                Pending ({filteredPending.length})
              </button>
              <button
                onClick={() => setTab("history")}
                className={`py-1.5 px-4 text-sm font-medium rounded-sm transition-all ${tab === "history" ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"}`}
              >
                History ({filteredHistory.length})
              </button>
            </div>

            {tab === "pending" && !isReadOnly && selectedIds.length > 0 && (
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Submit ({selectedIds.length})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-auto max-h-[calc(100vh-280px)]">
          <div className="min-w-[1200px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50 dark:bg-zinc-900/60">
                  <TableHead className="w-10">Details</TableHead>
                  {tab === "pending" && <TableHead className="min-w-[160px]">Expected Delivery *</TableHead>}
                  <TableHead className="min-w-[120px]">DO Number</TableHead>
                  <TableHead className="min-w-[100px]">Firm</TableHead>
                  <TableHead className="min-w-[120px]">PO Number</TableHead>
                  <TableHead className="min-w-[120px]">Party Name</TableHead>
                  <TableHead className="min-w-[120px]">Product Name</TableHead>
                  <TableHead className="min-w-[80px]">Qty</TableHead>
                  <TableHead className="min-w-[100px]">Total Value</TableHead>
                  {tab === "pending" && <TableHead className="min-w-[100px]">Order Date</TableHead>}
                  {tab === "history" && (
                    <>
                      <TableHead className="min-w-[120px]">Expected Delivery</TableHead>
                      <TableHead className="min-w-[120px]">Completed On</TableHead>
                      <TableHead className="min-w-[80px]">Revert</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={colSpan} className="text-center py-12 text-zinc-400">
                      No orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  groupedRows.map((group) => (
                    <Fragment key={group.key}>
                      <TableRow className="bg-zinc-50 dark:bg-zinc-900/40">
                        <TableCell colSpan={colSpan} className="py-3">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex items-center gap-3">
                              {tab === "pending" && !isReadOnly && (
                                <Checkbox
                                  checked={group.rows.every((o) => selectedIds.includes(o.id))}
                                  onCheckedChange={(checked) => handleSelectGroup(group.rows, checked)}
                                />
                              )}
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">PO Number: {group.poNumber}</span>
                                <span className="text-xs text-zinc-500">Party: {group.partyName}</span>
                              </div>
                            </div>
                            <Badge variant="outline" className="w-fit bg-white dark:bg-zinc-900">
                              {group.rows.length} item{group.rows.length > 1 ? "s" : ""}
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                      {group.rows.map((order) => (
                        <Fragment key={order.id}>
                          <TableRow className={`border-b border-zinc-100 dark:border-zinc-800 ${selectedIds.includes(order.id) ? "bg-emerald-50 dark:bg-emerald-950/20" : ""}`}>
                            <TableCell>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => toggleRow(order.id)}>
                                {expandedRow === order.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </Button>
                            </TableCell>
                            {tab === "pending" && (
                              <TableCell>
                                <Input
                                  type="date"
                                  disabled={isReadOnly || !selectedIds.includes(order.id)}
                                  value={deliveryDates[order.id] || ""}
                                  onChange={(e) => handleDateChange(order.id, e.target.value)}
                                  className="h-8 text-sm w-full"
                                />
                              </TableCell>
                            )}
                            <TableCell className="font-mono text-xs">{order.doNumber}</TableCell>
                            <TableCell className="text-sm">{order.firmName}</TableCell>
                            <TableCell className="font-medium text-sm">{order.partyPoNo}</TableCell>
                            <TableCell className="text-sm"><div className="truncate max-w-[150px]">{order.partyName}</div></TableCell>
                            <TableCell className="text-sm"><div className="truncate max-w-[150px]">{order.productName}</div></TableCell>
                            <TableCell className="font-semibold text-sm">{order.quantity}</TableCell>
                            <TableCell className="font-semibold text-emerald-600 text-sm">{fmtMoney(order.totalPoBasicValue)}</TableCell>
                            {tab === "pending" && (
                              <TableCell className="text-sm">{formatDate(order.timestamp || order.createdAt)}</TableCell>
                            )}
                            {tab === "history" && (
                              <>
                                <TableCell className="text-sm">{formatDate(order.checkPo?.expectedDeliveryDate || order.expectedDeliveryDate)}</TableCell>
                                <TableCell className="text-sm">{formatDate(order.checkPo?.createdAt)}</TableCell>
                                <TableCell>
                                  {order.canRevert && !isReadOnly && (
                                    <Button
                                      variant="ghost" size="icon"
                                      className="h-7 w-7 text-amber-500 hover:text-amber-700"
                                      onClick={() => handleRevert(order.id)}
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </Button>
                                  )}
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                          {expandedRow === order.id && (
                            <TableRow>
                              <TableCell colSpan={colSpan} className="p-0 border-b border-zinc-100 dark:border-zinc-800">
                                <div className="p-4">
                                  <OrderDetails order={order} />
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      ))}
                    </Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>
    </div>
  );
}
