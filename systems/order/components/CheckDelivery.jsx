"use client";

import React, { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { API_URL, getToken } from "@/lib/auth";
import { useAuth } from "@/systems/order/context/AuthContext";
import { canViewFirm } from "@/systems/order/utils/firmFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Loader2, Search, CheckCircle2, ChevronDown, ChevronRight, Download,
  Building2, User, RefreshCw, PackageSearch,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Ported from _reference/New-Order-collection components/pages/CheckDeliveryPage.jsx.
// That reference talks to Supabase directly (single "ORDER RECEIPT" table);
// here every read/write goes through merge-system-backend's
// /api/order/check-delivery/{pending,history,:receiptId} REST endpoints
// instead (see systems/order/supabase.js — Supabase is storage-only here).
// ---------------------------------------------------------------------------

const STOCK_OPTIONS = ["In Stock", "For Production Planning", "From Purchase"];

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return String(value);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const num = (v) => parseFloat(v) || 0;

const emptyForm = (row) => ({
  receiptId: row.id,
  productName: row.productName,
  quantity: row.quantity,
  inStockOrNot: "",
  productionOrderNo: "",
  qtyTransferred: "",
  batchNumberRemarks: "",
  indentSelfBatchNumber: "",
  gpPercent: "",
});

// Groups a flat list of order-receipt rows by Party PO No. — mirrors the
// grouping used on the Orders tab (systems/order/components/Order.jsx).
function groupRowsByPo(rows) {
  const groups = {};
  const order = [];
  rows.forEach((row) => {
    const key = row.partyPoNo || `no-po-${row.id}`;
    if (!groups[key]) {
      groups[key] = {
        key,
        poNumber: row.partyPoNo || "No PO",
        partyName: row.partyName,
        rows: [],
      };
      order.push(key);
    }
    groups[key].rows.push(row);
  });
  return order.map((key) => groups[key]);
}

export default function CheckDelivery() {
  const { user, isSuperAdmin, isReadOnly } = useAuth();

  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterFirm, setFilterFirm] = useState("all");
  const [filterParty, setFilterParty] = useState("all");
  const [expandedPO, setExpandedPO] = useState(null);

  const [selectedGroup, setSelectedGroup] = useState(null);
  const [orderForms, setOrderForms] = useState([]);

  // Reset filters when tab changes, same as the reference page.
  useEffect(() => {
    setFilterFirm("all");
    setFilterParty("all");
    setExpandedPO(null);
  }, [activeTab]);

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [pRes, hRes] = await Promise.all([
        fetch(`${API_URL}/order/check-delivery/pending`).then((r) => r.json()),
        fetch(`${API_URL}/order/check-delivery/history`).then((r) => r.json()),
      ]);
      setPending(pRes.data || []);
      setHistory(hRes.data || []);
    } catch (error) {
      toast.error("Failed to load Check for Delivery data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const scopedPending = useMemo(
    () => pending.filter((r) => isSuperAdmin || canViewFirm(user?.firmName, r.firmName)),
    [pending, isSuperAdmin, user]
  );
  const scopedHistory = useMemo(
    () => history.filter((r) => isSuperAdmin || canViewFirm(user?.firmName, r.firmName)),
    [history, isSuperAdmin, user]
  );

  const activeRows = activeTab === "pending" ? scopedPending : scopedHistory;

  const firmOptions = useMemo(() => {
    const firms = [...new Set(activeRows.map((r) => r.firmName).filter(Boolean))];
    return ["all", ...firms];
  }, [activeRows]);

  const partyOptions = useMemo(() => {
    const parties = [...new Set(activeRows.map((r) => r.partyName).filter(Boolean))];
    return ["all", ...parties];
  }, [activeRows]);

  const displayRows = useMemo(() => {
    let source = activeRows;
    if (filterFirm !== "all") source = source.filter((r) => r.firmName === filterFirm);
    if (filterParty !== "all") source = source.filter((r) => r.partyName === filterParty);
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      source = source.filter((r) =>
        Object.values(r).some((v) => v !== null && typeof v !== "object" && v?.toString().toLowerCase().includes(term))
      );
    }
    return source;
  }, [activeRows, filterFirm, filterParty, searchTerm]);

  const groupedDisplayRows = useMemo(() => groupRowsByPo(displayRows), [displayRows]);

  const handleOpen = (group) => {
    setSelectedGroup(group);
    setOrderForms(group.rows.map((row) => emptyForm(row)));
  };

  const handleClose = () => {
    setSelectedGroup(null);
    setOrderForms([]);
  };

  const updateForm = (index, field, value) => {
    setOrderForms((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSubmit = async () => {
    for (const form of orderForms) {
      if (!form.inStockOrNot) {
        toast.error(`Please select "In Stock Or Not" for ${form.productName}.`);
        return;
      }
      if (form.inStockOrNot === "From Purchase" && !form.indentSelfBatchNumber) {
        toast.error(`Enter Indent/Self Batch Number for ${form.productName}.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const results = await Promise.all(
        orderForms.map((form) =>
          fetch(`${API_URL}/order/check-delivery/${form.receiptId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify({
              inStockOrNot: form.inStockOrNot,
              productionOrderNo: form.productionOrderNo || null,
              qtyTransferred: form.qtyTransferred || null,
              batchNumberRemarks: form.batchNumberRemarks || null,
              indentSelfBatchNumber: form.indentSelfBatchNumber || null,
              gpPercent: form.gpPercent || null,
            }),
          }).then((r) => r.json())
        )
      );

      const failed = results.find((r) => !r.success);
      if (failed) throw new Error(failed.message || "Failed to submit check");

      toast.success("All products marked as checked.");
      handleClose();
      await fetchData();
    } catch (error) {
      toast.error(error.message || "Failed to submit check");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    const rows = displayRows;
    const header = [
      "PO Number", "Party", "Firm", "Product", "Quantity", "DO Number",
      activeTab === "history" ? "In Stock Or Not" : "Status",
    ];
    const csvRows = rows.map((r) => [
      r.partyPoNo || "No PO",
      r.partyName || "",
      r.firmName || "",
      r.productName || "",
      r.quantity ?? "",
      r.doNumber || "",
      activeTab === "history" ? (r.checkDelivery?.inStockOrNot || "") : "Pending",
    ]);
    const csv = [header, ...csvRows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CheckDelivery_${activeTab}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
        <span className="text-zinc-500">Loading delivery checks...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Check for Delivery</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">Verify stock availability for POs before arranging logistics</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-blue-100 shadow-sm dark:bg-blue-950/20 dark:border-blue-900">
          <CardContent className="p-6 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Products</p>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-200">{scopedPending.length + scopedHistory.length}</div>
            </div>
            <div className="h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center text-white">
              <PackageSearch className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-100 shadow-sm dark:bg-amber-950/20 dark:border-amber-900">
          <CardContent className="p-6 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-amber-600">Pending Check</p>
              <div className="text-2xl font-bold text-amber-900 dark:text-amber-200">{scopedPending.length}</div>
            </div>
            <div className="h-10 w-10 bg-amber-500 rounded-full flex items-center justify-center text-white">
              <Loader2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-100 shadow-sm dark:bg-green-950/20 dark:border-green-900">
          <CardContent className="p-6 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-green-600">Checked</p>
              <div className="text-2xl font-bold text-green-900 dark:text-green-200">{scopedHistory.length}</div>
            </div>
            <div className="h-10 w-10 bg-green-500 rounded-full flex items-center justify-center text-white">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + filters + tabs */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
            <Select value={filterFirm} onValueChange={setFilterFirm}>
              <SelectTrigger className="h-9 w-full sm:w-[170px]">
                <Building2 className="w-4 h-4 mr-1" />
                <SelectValue placeholder="Firm" />
              </SelectTrigger>
              <SelectContent>
                {firmOptions.map((firm) => (
                  <SelectItem key={firm} value={firm}>{firm === "all" ? "All Firms" : firm}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterParty} onValueChange={setFilterParty}>
              <SelectTrigger className="h-9 w-full sm:w-[170px]">
                <User className="w-4 h-4 mr-1" />
                <SelectValue placeholder="Party" />
              </SelectTrigger>
              <SelectContent>
                {partyOptions.map((party) => (
                  <SelectItem key={party} value={party}>{party === "all" ? "All Parties" : party}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={fetchData} variant="outline" className="h-9 px-3" disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
            <Button onClick={handleExport} variant="outline" className="h-9 px-3 gap-2">
              <Download className="w-4 h-4" /> Export
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="pending">Pending ({scopedPending.length})</TabsTrigger>
              <TabsTrigger value="history">History ({scopedHistory.length})</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-auto max-h-[calc(100vh-280px)]">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50 dark:bg-zinc-900/60">
                {activeTab === "pending" && <TableHead>Action</TableHead>}
                <TableHead>PO Number</TableHead>
                <TableHead>Party</TableHead>
                <TableHead>Firm</TableHead>
                <TableHead>Products</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedDisplayRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={activeTab === "pending" ? 5 : 4} className="text-center py-8 text-zinc-400">
                    No rows found
                  </TableCell>
                </TableRow>
              ) : (
                groupedDisplayRows.map((group) => {
                  const isExpanded = expandedPO === group.key;
                  return (
                    <Fragment key={group.key}>
                      <TableRow
                        className="bg-zinc-50/60 dark:bg-zinc-900/40 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        onClick={() => setExpandedPO(isExpanded ? null : group.key)}
                      >
                        {activeTab === "pending" && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            {!isReadOnly && (
                              <Button size="sm" onClick={() => handleOpen(group)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                Check
                              </Button>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="font-semibold text-zinc-900 dark:text-zinc-100">
                          <div className="flex items-center gap-2">
                            {isExpanded
                              ? <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
                              : <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />}
                            {group.poNumber}
                          </div>
                        </TableCell>
                        <TableCell className="text-zinc-700 dark:text-zinc-300">{group.partyName}</TableCell>
                        <TableCell className="text-zinc-500">{group.rows[0]?.firmName}</TableCell>
                        <TableCell>
                          <span className="text-xs text-zinc-500">
                            {group.rows.length} product{group.rows.length > 1 ? "s" : ""}
                          </span>
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={activeTab === "pending" ? 5 : 4} className="p-0 border-b border-zinc-200 dark:border-zinc-800">
                            <div className="bg-zinc-50/80 dark:bg-zinc-900/40 px-6 py-4 space-y-3">
                              {group.rows.map((row) => (
                                <div key={row.id} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{row.productName}</span>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="bg-amber-50 text-amber-800 border-0 text-xs">
                                        Qty: {row.quantity}
                                      </Badge>
                                      {row.checkDelivery?.inStockOrNot && (
                                        <Badge className="bg-green-100 text-green-800 border-0 text-xs">
                                          {row.checkDelivery.inStockOrNot}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2 text-xs">
                                    <div>
                                      <span className="text-zinc-500">DO Number</span>
                                      <p className="font-mono font-medium text-zinc-800 dark:text-zinc-200">{row.doNumber || "—"}</p>
                                    </div>
                                    <div>
                                      <span className="text-zinc-500">Party PO Date</span>
                                      <p className="font-medium text-zinc-800 dark:text-zinc-200">{formatDate(row.partyPoDate) || "—"}</p>
                                    </div>
                                    <div>
                                      <span className="text-zinc-500">Rate</span>
                                      <p className="font-medium text-zinc-800 dark:text-zinc-200">{row.rateOfMaterial ? `₹${row.rateOfMaterial}` : "—"}</p>
                                    </div>
                                    <div>
                                      <span className="text-zinc-500">Total PO Value</span>
                                      <p className="font-medium text-green-700 dark:text-green-400">{row.totalPoBasicValue ? `₹${Number(row.totalPoBasicValue).toLocaleString()}` : "—"}</p>
                                    </div>
                                    {row.freight?.toString().trim().toLowerCase() === "yes" && num(row.freightAmount) > 0 && (
                                      <div>
                                        <span className="text-zinc-500">Freight Amount</span>
                                        <p className="font-medium text-green-700 dark:text-green-400">₹{Number(row.freightAmount).toLocaleString()}</p>
                                      </div>
                                    )}
                                    <div>
                                      <span className="text-zinc-500">Transporter Type</span>
                                      <p className="font-medium text-zinc-800 dark:text-zinc-200">{row.typeOfTransporting || "—"}</p>
                                    </div>
                                    <div>
                                      <span className="text-zinc-500">Payment</span>
                                      <p className="font-medium text-zinc-800 dark:text-zinc-200">{row.paymentToBeTaken || "—"}</p>
                                    </div>
                                    <div>
                                      <span className="text-zinc-500">GST Number</span>
                                      <p className="font-medium text-zinc-800 dark:text-zinc-200">{row.gstNumber || "—"}</p>
                                    </div>
                                    <div>
                                      <span className="text-zinc-500">Contact Person</span>
                                      <p className="font-medium text-zinc-800 dark:text-zinc-200">{row.contactPersonName || "—"}</p>
                                    </div>
                                    {row.address && (
                                      <div className="col-span-2">
                                        <span className="text-zinc-500">Address</span>
                                        <p className="font-medium text-zinc-800 dark:text-zinc-200">{row.address}</p>
                                      </div>
                                    )}
                                    {row.specificConcern && (
                                      <div className="col-span-2">
                                        <span className="text-zinc-500">Specific Concern</span>
                                        <p className="font-medium text-orange-700 dark:text-orange-400">{row.specificConcern}</p>
                                      </div>
                                    )}
                                  </div>

                                  {/* Check delivery submitted data */}
                                  {row.checkDelivery && (
                                    <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Check Details</p>
                                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2 text-xs">
                                        {row.checkDelivery.productionOrderNo && (
                                          <div>
                                            <span className="text-zinc-500">Order Number Of Production</span>
                                            <p className="font-medium text-zinc-800 dark:text-zinc-200">{row.checkDelivery.productionOrderNo}</p>
                                          </div>
                                        )}
                                        {row.checkDelivery.qtyTransferred !== null && row.checkDelivery.qtyTransferred !== undefined && (
                                          <div>
                                            <span className="text-zinc-500">Qty Transferred</span>
                                            <p className="font-medium text-zinc-800 dark:text-zinc-200">{row.checkDelivery.qtyTransferred}</p>
                                          </div>
                                        )}
                                        {row.checkDelivery.batchNumberRemarks && (
                                          <div>
                                            <span className="text-zinc-500">Batch Number Remarks</span>
                                            <p className="font-medium text-zinc-800 dark:text-zinc-200">{row.checkDelivery.batchNumberRemarks}</p>
                                          </div>
                                        )}
                                        {row.checkDelivery.indentSelfBatchNumber && (
                                          <div>
                                            <span className="text-zinc-500">Indent / Self Batch Number</span>
                                            <p className="font-medium text-zinc-800 dark:text-zinc-200">{row.checkDelivery.indentSelfBatchNumber}</p>
                                          </div>
                                        )}
                                        {row.checkDelivery.gpPercent !== null && row.checkDelivery.gpPercent !== undefined && row.checkDelivery.gpPercent !== "" && (
                                          <div>
                                            <span className="text-zinc-500">GP %</span>
                                            <p className="font-medium text-zinc-800 dark:text-zinc-200">{row.checkDelivery.gpPercent}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
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

      {/* Check for Delivery modal */}
      <Sheet open={!!selectedGroup} onOpenChange={(open) => !open && handleClose()}>
        <SheetContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Check for Delivery</SheetTitle>
            <SheetDescription>
              PO: {selectedGroup?.poNumber} &middot; {selectedGroup?.rows[0]?.partyName}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 py-2">
            {orderForms.map((form, index) => (
              <div key={form.receiptId} className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <div className="bg-zinc-50 dark:bg-zinc-900 px-4 py-3">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{form.productName}</p>
                  <p className="text-xs text-zinc-500">Qty: {form.quantity}</p>
                </div>

                <div className="p-4 space-y-4">
                  <div className="space-y-1">
                    <Label className="text-xs">In Stock Or Not *</Label>
                    <Select
                      value={form.inStockOrNot}
                      onValueChange={(v) => updateForm(index, "inStockOrNot", v)}
                      disabled={submitting}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select Option" />
                      </SelectTrigger>
                      <SelectContent>
                        {STOCK_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {form.inStockOrNot === "In Stock" && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Order Number Of Production</Label>
                        <Input
                          value={form.productionOrderNo}
                          onChange={(e) => updateForm(index, "productionOrderNo", e.target.value)}
                          className="h-9 text-sm"
                          disabled={submitting}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Qty Transferred</Label>
                        <Input
                          type="number"
                          value={form.qtyTransferred}
                          onChange={(e) => updateForm(index, "qtyTransferred", e.target.value)}
                          className="h-9 text-sm"
                          disabled={submitting}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Batch Number Remarks</Label>
                        <Input
                          value={form.batchNumberRemarks}
                          onChange={(e) => updateForm(index, "batchNumberRemarks", e.target.value)}
                          className="h-9 text-sm"
                          disabled={submitting}
                        />
                      </div>
                    </div>
                  )}

                  {form.inStockOrNot === "From Purchase" && (
                    <div className="space-y-1">
                      <Label className="text-xs">Indent / Self Batch Number *</Label>
                      <Input
                        value={form.indentSelfBatchNumber}
                        onChange={(e) => updateForm(index, "indentSelfBatchNumber", e.target.value)}
                        className="h-9 text-sm"
                        disabled={submitting}
                      />
                    </div>
                  )}

                  {form.inStockOrNot === "For Production Planning" && (
                    <div className="space-y-1">
                      <Label className="text-xs">GP %</Label>
                      <Input
                        type="number"
                        value={form.gpPercent}
                        onChange={(e) => updateForm(index, "gpPercent", e.target.value)}
                        className="h-9 text-sm"
                        disabled={submitting}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={
                submitting ||
                orderForms.some(
                  (f) => !f.inStockOrNot || (f.inStockOrNot === "From Purchase" && !f.indentSelfBatchNumber)
                )
              }
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
              ) : (
                "Submit Check"
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
