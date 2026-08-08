"use client";

import React, { Fragment, useState, useEffect, useMemo, useCallback } from "react";
import { API_URL, getToken } from "@/lib/auth";
import { useAuth } from "@/systems/order/context/AuthContext";
import { canViewFirm } from "@/systems/order/utils/firmFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, CheckSquare, XCircle, LayoutList, Truck, ChevronDown, ChevronRight,
  Clock, Search, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Ported from _reference/New-Order-collection components/pages/LogisticsApproval.jsx.
// That reference talks to Supabase directly; here every read/write goes
// through merge-system-backend's /api/order/logistics-approval REST endpoints
// instead (see systems/order/supabase.js — Supabase is storage-only here).
// ---------------------------------------------------------------------------

const num = (v) => parseFloat(v) || 0;

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
};

export default function LogisticsApproval() {
  const { user, isSuperAdmin, isReadOnly } = useAuth();

  const [pendingRows, setPendingRows] = useState([]);
  const [historyRows, setHistoryRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedKey, setExpandedKey] = useState(null);

  // Review dialog state
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [plan, setPlan] = useState(null);
  const [splits, setSplits] = useState([]);
  const [allocations, setAllocations] = useState({});
  const [remarks, setRemarks] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [fetchingPlan, setFetchingPlan] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [p, h] = await Promise.all([
        fetch(`${API_URL}/order/logistics-approval/pending`).then((r) => r.json()),
        fetch(`${API_URL}/order/logistics-approval/history`).then((r) => r.json()),
      ]);
      setPendingRows(p.data || []);
      setHistoryRows(h.data || []);
    } catch {
      toast.error("Failed to load logistics approvals");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const scopedRows = useMemo(() => {
    const rows = tab === "pending" ? pendingRows : historyRows;
    return rows.filter((r) => isSuperAdmin || canViewFirm(user?.firmName, r.firmName));
  }, [tab, pendingRows, historyRows, isSuperAdmin, user]);

  const displayRows = useMemo(() => {
    if (!searchTerm.trim()) return scopedRows;
    const term = searchTerm.toLowerCase();
    return scopedRows.filter((r) =>
      ["doNumber", "partyPoNo", "partyName", "productName", "firmName"].some((f) =>
        String(r[f] || "").toLowerCase().includes(term)
      )
    );
  }, [scopedRows, searchTerm]);

  // Group rows into per-PO cards — scoped by firm too, since a PO number is
  // not guaranteed unique across firms (mirrors Order.jsx's groupedOrders).
  const groupedOrders = useMemo(() => {
    const groups = {};
    const order = [];
    displayRows.forEach((r) => {
      const po = r.partyPoNo || "No PO";
      const key = `${po}::${r.firmName || ""}`;
      if (!groups[key]) {
        groups[key] = { key, poNumber: po, partyName: r.partyName, firmName: r.firmName, rows: [], maxId: r.id };
        order.push(key);
      }
      groups[key].rows.push(r);
      if (r.id > groups[key].maxId) groups[key].maxId = r.id;
    });
    return order.map((k) => groups[k]).sort((a, b) => b.maxId - a.maxId);
  }, [displayRows]);

  const closeDialog = () => {
    setIsDialogOpen(false);
    setSelectedGroup(null);
    setPlan(null);
    setSplits([]);
    setAllocations({});
    setRemarks("");
  };

  const openReviewDialog = async (group) => {
    setSelectedGroup(group);
    setIsDialogOpen(true);
    setFetchingPlan(true);
    setPlan(null);
    setSplits([]);
    setAllocations({});
    setRemarks("");

    try {
      const receiptIds = group.rows.map((r) => r.id).join(",");
      const res = await fetch(`${API_URL}/order/logistics-approval/splits?receiptIds=${receiptIds}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to load plan");

      const currentPlan = json.data?.plan || null;
      const currentSplits = json.data?.splits || [];

      if (!currentPlan) {
        toast.error("No pending logistics plan found for this PO.");
        setIsDialogOpen(false);
        return;
      }

      setPlan(currentPlan);
      setSplits(currentSplits);

      const initAlloc = {};
      currentSplits.forEach((s) => {
        initAlloc[s.id] = s.allocatedQty ? String(s.allocatedQty) : "";
      });
      setAllocations(initAlloc);
    } catch (err) {
      toast.error(err.message || "Failed to load plan");
      setIsDialogOpen(false);
    } finally {
      setFetchingPlan(false);
    }
  };

  const updateAllocation = (splitId, value) => {
    setAllocations((prev) => ({ ...prev, [splitId]: value }));
  };

  // Totals for the review dialog
  const poTotalQty = useMemo(() => {
    if (!selectedGroup) return 0;
    return selectedGroup.rows.reduce((sum, r) => sum + Math.max(0, num(r.quantity) - num(r.logisticsApprovedQty)), 0);
  }, [selectedGroup]);

  const totalNewAllocated = useMemo(
    () => Object.values(allocations).reduce((sum, q) => sum + num(q), 0),
    [allocations]
  );
  const totalOrderQty = useMemo(
    () => (selectedGroup ? selectedGroup.rows.reduce((sum, r) => sum + num(r.quantity), 0) : 0),
    [selectedGroup]
  );
  const totalAlreadyApproved = useMemo(
    () => (selectedGroup ? selectedGroup.rows.reduce((sum, r) => sum + num(r.logisticsApprovedQty), 0) : 0),
    [selectedGroup]
  );
  const totalCumulative = totalAlreadyApproved + totalNewAllocated;
  const isBalanced = Math.abs(totalCumulative - totalOrderQty) < 0.01;
  const remainingOverall = totalOrderQty - totalAlreadyApproved - totalNewAllocated;

  const handleApprove = async () => {
    if (!selectedGroup) return;
    if (totalNewAllocated <= 0) {
      toast.error("Allocate at least some qty to a transporter.");
      return;
    }
    if (totalNewAllocated > totalOrderQty + 0.01) {
      toast.error(`Total allocations (${totalNewAllocated.toFixed(2)}) cannot exceed total PO quantity (${totalOrderQty.toFixed(2)}).`);
      return;
    }

    const allocationsPayload = splits
      .filter((s) => num(allocations[s.id]) > 0)
      .map((s) => ({ splitId: s.id, allocatedQty: num(allocations[s.id]) }));

    if (allocationsPayload.length === 0) {
      toast.error("Allocate at least some qty to a transporter.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/order/logistics-approval/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          receiptIds: selectedGroup.rows.map((r) => r.id),
          allocations: allocationsPayload,
          approvedBy: user?.username,
          remarks,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Approval failed");
      toast.success("Logistics plan approved successfully.");
      closeDialog();
      loadData();
    } catch (err) {
      toast.error(err.message || "Approval failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (mode) => {
    if (!selectedGroup) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/order/logistics-approval/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          receiptIds: selectedGroup.rows.map((r) => r.id),
          mode,
          approvedBy: user?.username,
          remarks,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to reject");
      toast.success(mode === "full" ? "Logistics cancelled for this PO." : "PO sent back for a new arrangement.");
      closeDialog();
      loadData();
    } catch (err) {
      toast.error(err.message || "Failed to reject");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
        <span className="text-zinc-500">Loading pending approvals...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Logistics Approval</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Select a transporter option and approve</p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={refreshing} className="gap-2 w-fit">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <Card className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
          <Input
            placeholder="Search by PO Number, Party, Product, Firm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9"
          />
        </div>

        <Tabs value={tab} onValueChange={(v) => { setTab(v); setExpandedKey(null); setSearchTerm(""); }}>
          <TabsList>
            <TabsTrigger value="pending">Pending ({pendingRows.filter((r) => isSuperAdmin || canViewFirm(user?.firmName, r.firmName)).length})</TabsTrigger>
            <TabsTrigger value="history">History ({historyRows.filter((r) => isSuperAdmin || canViewFirm(user?.firmName, r.firmName)).length})</TabsTrigger>
          </TabsList>
        </Tabs>
      </Card>

      <Card className="shadow-sm">
        <div className="overflow-auto max-h-[calc(100vh-320px)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>PO Number</TableHead>
                <TableHead>Party Name</TableHead>
                <TableHead>Firm</TableHead>
                <TableHead className="text-right px-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-zinc-400">
                    {searchTerm ? "No matching orders found" : tab === "pending" ? "No orders pending approval" : "No approval history found"}
                  </TableCell>
                </TableRow>
              ) : (
                groupedOrders.map((group) => {
                  const isExpanded = expandedKey === group.key;
                  return (
                    <Fragment key={group.key}>
                      <TableRow className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer" onClick={() => setExpandedKey(isExpanded ? null : group.key)}>
                        <TableCell className="text-zinc-400">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </TableCell>
                        <TableCell className="font-semibold">{group.poNumber}</TableCell>
                        <TableCell>{group.partyName}</TableCell>
                        <TableCell className="text-zinc-500">{group.firmName}</TableCell>
                        <TableCell className="text-right px-6">
                          {tab === "pending" ? (
                            !isReadOnly && (
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={(e) => { e.stopPropagation(); openReviewDialog(group); }}
                              >
                                <LayoutList className="w-4 h-4 mr-2" /> Review
                              </Button>
                            )
                          ) : (
                            <Badge className="bg-green-100 text-green-800 border border-green-200 gap-1">
                              <CheckSquare className="w-3 h-3" /> Approved
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={5} className="p-0 border-b">
                            <div className="bg-zinc-50 dark:bg-zinc-900/40 px-6 py-4 space-y-3">
                              {group.rows.map((order) => (
                                <div key={order.id} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-semibold">{order.productName}</span>
                                    <Badge className="bg-amber-100 text-amber-800 border-0 gap-1">
                                      <Clock className="w-3 h-3" />
                                      Remaining Qty: {(num(order.quantity) - num(order.logisticsApprovedQty)).toFixed(2)}
                                    </Badge>
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2 text-xs">
                                    <div>
                                      <span className="text-zinc-500">DO Number</span>
                                      <p className="font-mono font-medium">{order.doNumber || "—"}</p>
                                    </div>
                                    <div>
                                      <span className="text-zinc-500">Party PO Date</span>
                                      <p className="font-medium">{formatDate(order.partyPoDate) || "—"}</p>
                                    </div>
                                    <div>
                                      <span className="text-zinc-500">Rate</span>
                                      <p className="font-medium">{order.rateOfMaterial ? `₹${order.rateOfMaterial}` : "—"}</p>
                                    </div>
                                    <div>
                                      <span className="text-zinc-500">Total PO Value</span>
                                      <p className="font-medium text-green-700">{order.totalPoBasicValue ? `₹${Number(order.totalPoBasicValue).toLocaleString()}` : "—"}</p>
                                    </div>
                                    <div>
                                      <span className="text-zinc-500">PO Amount + GST</span>
                                      <p className="font-medium text-green-700">{order.adjustedAmount != null && order.adjustedAmount !== "" ? Number(order.adjustedAmount).toLocaleString() : "—"}</p>
                                    </div>
                                    {String(order.freight || "").trim().toLowerCase() === "yes" && Number(order.freightAmount) > 0 && (
                                      <div>
                                        <span className="text-zinc-500">Freight Amount</span>
                                        <p className="font-medium text-green-700">₹{Number(order.freightAmount).toLocaleString()}</p>
                                      </div>
                                    )}
                                    <div>
                                      <span className="text-zinc-500">Transporter Type</span>
                                      <p className="font-medium">{order.typeOfTransporting || "—"}</p>
                                    </div>
                                    <div>
                                      <span className="text-zinc-500">Payment</span>
                                      <p className="font-medium">{order.paymentToBeTaken || "—"}</p>
                                    </div>
                                    <div>
                                      <span className="text-zinc-500">GST Number</span>
                                      <p className="font-medium">{order.gstNumber || "—"}</p>
                                    </div>
                                    <div>
                                      <span className="text-zinc-500">Contact Person</span>
                                      <p className="font-medium">{order.contactPersonName || "—"}</p>
                                    </div>
                                    {order.address && (
                                      <div className="col-span-2">
                                        <span className="text-zinc-500">Address</span>
                                        <p className="font-medium">{order.address}</p>
                                      </div>
                                    )}
                                    {order.specificConcern && (
                                      <div className="col-span-2">
                                        <span className="text-zinc-500">Specific Concern</span>
                                        <p className="font-medium text-orange-700">{order.specificConcern}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Review / Allocation dialog */}
      <Sheet open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <SheetContent className="sm:max-w-4xl max-h-[94vh] overflow-y-auto p-0">
          <SheetHeader className="p-6 pb-4 border-b">
            <SheetTitle className="text-xl font-semibold flex items-center gap-2">
              <Truck className="h-5 w-5 text-purple-600" /> Review Logistics Plan
            </SheetTitle>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900">
                <span className="block text-xs text-zinc-500">PO Number</span>
                <span className="font-medium">{selectedGroup?.poNumber}</span>
              </div>
              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900">
                <span className="block text-xs text-zinc-500">Party</span>
                <span className="font-medium">{selectedGroup?.partyName}</span>
              </div>
              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900">
                <span className="block text-xs text-zinc-500">Firm</span>
                <span className="font-medium">{selectedGroup?.firmName}</span>
              </div>
              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900">
                <span className="block text-xs text-zinc-500">Products</span>
                <span className="font-medium">{selectedGroup?.rows.length}</span>
              </div>
            </div>
          </SheetHeader>

          <div className="p-6 space-y-8">
            {fetchingPlan ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            ) : splits.length === 0 ? (
              <div className="text-center p-8 text-zinc-500">No plan data found.</div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border">
                  <div>
                    <p className="text-sm font-semibold">Remaining to Approve: <span className="text-purple-700 text-base">{poTotalQty.toFixed(2)}</span></p>
                    <p className="text-xs text-zinc-500 mt-0.5">Enter the quantity to approve for each transporter below.</p>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold w-fit ${
                      isBalanced ? "bg-green-100 text-green-700" : remainingOverall > 0 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {isBalanced ? "Balanced" : remainingOverall > 0 ? `${remainingOverall.toFixed(2)} remaining` : `${Math.abs(remainingOverall).toFixed(2)} over`}
                  </div>
                </div>

                <div className="space-y-8">
                  {selectedGroup.rows.map((product) => {
                    const productSplits = splits.filter((s) => s.receiptId === product.id);
                    const productQty = num(product.quantity);
                    const totalAllocatedForProduct = productSplits.reduce((sum, s) => sum + num(allocations[s.id]), 0);
                    const remainingForProduct = productQty - totalAllocatedForProduct;
                    const ratesForProduct = productSplits.map((s) => num(s.rate)).filter((r) => r > 0);
                    const minRateForProduct = ratesForProduct.length > 0 ? Math.min(...ratesForProduct) : null;

                    return (
                      <div key={product.id} className="space-y-4 border-l-2 border-purple-100 pl-4 py-2">
                        <div>
                          <h3 className="text-sm font-bold">{product.productName}</h3>
                          <p className="text-xs text-zinc-500">
                            Order Qty: {productQty} | Approved: {product.logisticsApprovedQty || 0}
                          </p>
                        </div>

                        {productSplits.length === 0 ? (
                          <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl text-center text-orange-800 text-sm font-medium">
                            No transporters arranged. Please use &apos;Reject &amp; Plan Again&apos; below to arrange transporters.
                          </div>
                        ) : (
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {productSplits.map((split) => {
                              const isLowestCost = minRateForProduct !== null && num(split.rate) === minRateForProduct;
                              const allocVal = allocations[split.id] ?? "";
                              const isActive = num(allocVal) > 0;
                              const estTotal = split.rate && num(allocVal) ? num(split.rate) * num(allocVal) : null;
                              const locked = split.status === "Dispatched" || split.status === "Logistic Completed";

                              return (
                                <div
                                  key={split.id}
                                  className={`p-4 border rounded-xl space-y-3 transition-all ${
                                    isLowestCost
                                      ? "border-green-500 bg-green-50/40 dark:bg-green-950/20 ring-1 ring-green-500/20"
                                      : isActive
                                      ? "border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 ring-1 ring-purple-500/20"
                                      : "border-zinc-200 dark:border-zinc-800 opacity-80 hover:opacity-100"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-semibold leading-tight">{split.transporterName || "—"}</p>
                                    {isLowestCost && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-600 text-white whitespace-nowrap">
                                        Lowest Cost
                                      </span>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600 dark:text-zinc-300 bg-white/60 dark:bg-black/20 p-2 rounded-lg border">
                                    <div>
                                      <span className="text-zinc-400 block text-[10px] uppercase">Rate Type</span>
                                      <span className="font-medium">{split.vehicleDetails || "—"}</span>
                                    </div>
                                    <div>
                                      <span className="text-zinc-400 block text-[10px] uppercase">Rate</span>
                                      <span className="font-medium">{split.rate ? `₹${split.rate}` : "—"}</span>
                                    </div>
                                    <div>
                                      <span className="text-zinc-400 block text-[10px] uppercase">Contact</span>
                                      <span className="font-medium">{split.contactNumber || "—"}</span>
                                    </div>
                                    <div>
                                      <span className="text-zinc-400 block text-[10px] uppercase">Status</span>
                                      <span className="font-medium">{split.status || "—"}</span>
                                    </div>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">New Allocation</label>
                                    <Input
                                      type="number"
                                      min="0"
                                      max={Math.max(0, remainingForProduct + num(allocVal))}
                                      value={allocVal}
                                      onChange={(e) => updateAllocation(split.id, e.target.value)}
                                      className="h-8 text-sm font-medium"
                                      placeholder="Enter qty"
                                      disabled={locked || isReadOnly}
                                    />
                                  </div>

                                  {estTotal !== null && (
                                    <div className={`flex justify-between items-center px-2 py-1.5 rounded ${isLowestCost ? "bg-green-100/70 dark:bg-green-900/20" : "bg-purple-100/50 dark:bg-purple-900/20"}`}>
                                      <span className={`text-[10px] font-semibold uppercase tracking-wide ${isLowestCost ? "text-green-700" : "text-purple-700"}`}>Est. Cost</span>
                                      <span className={`text-xs font-bold ${isLowestCost ? "text-green-700" : "text-purple-700"}`}>
                                        ₹{estTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-sm">
                  <span className="text-zinc-500">Total Allocated</span>
                  <span className={`font-semibold ${isBalanced ? "text-green-700" : "text-red-600"}`}>
                    {totalCumulative.toFixed(2)} / {totalOrderQty.toFixed(2)} {isBalanced ? "✓" : ""}
                  </span>
                </div>

                {!isReadOnly && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Remarks (optional)</Label>
                    <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Add a note for this decision..." className="h-9" />
                  </div>
                )}
              </div>
            )}
          </div>

          <SheetFooter className="sticky bottom-0 bg-background border-t p-4 px-6">
            <Button variant="outline" onClick={closeDialog} disabled={isSubmitting}>
              Close
            </Button>
            {!isReadOnly && (
              <>
                <Button
                  variant="outline"
                  className="border-orange-200 text-orange-700 hover:bg-orange-50"
                  onClick={() => handleReject("replan")}
                  disabled={isSubmitting || fetchingPlan}
                >
                  <Truck className="w-4 h-4 mr-2" /> Reject &amp; Plan Again
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleReject("full")}
                  disabled={isSubmitting || fetchingPlan}
                >
                  <XCircle className="w-4 h-4 mr-2" /> Fully Reject
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white px-6"
                  onClick={handleApprove}
                  disabled={isSubmitting || fetchingPlan || splits.length === 0}
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Approving...</>
                  ) : (
                    <><CheckSquare className="w-4 h-4 mr-2" /> Approve Plan</>
                  )}
                </Button>
              </>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
