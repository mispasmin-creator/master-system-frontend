"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { API_URL, getToken } from "@/lib/auth";
import { useAuth } from "@/systems/order/context/AuthContext";
import { canViewFirm } from "@/systems/order/utils/firmFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Loader2, Search, RefreshCw, CheckCircle2, AlertCircle, BadgeCheck, Building,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Ported from _reference/New-Order-collection components/pages/AccountsApprovalPage.jsx.
// That reference merges Supabase's `po_logistics_splits` with `ORDER RECEIPT`
// client-side and groups everything by PO number. Here the backend already
// hands back OrderLogisticsSplit rows (status === 'Dispatched' for the
// pending list) with `dispatchRecord` (OrderDispatch) and `receipt`
// (OrderReceipt) pre-joined, so no client-side merge/grouping is needed —
// see merge-system-backend/src/order/accounts-approval/accountsApproval.controller.js.
// Every read/write goes through /api/order/accounts-approval/* — never Supabase.
// ---------------------------------------------------------------------------

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (isNaN(date.getTime())) return String(value);
  return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`;
};

const formatQty = (val) => {
  if (val === undefined || val === null || isNaN(val)) return "—";
  const num = Number(val);
  return num % 1 === 0 ? num.toString() : parseFloat(num.toFixed(4)).toString();
};

const formatRate = (value) => {
  const rate = Number(value) || 0;
  return rate > 0 ? `₹${rate.toLocaleString("en-IN")}` : "—";
};

export default function AccountsApproval() {
  const { user, isSuperAdmin, isReadOnly } = useAuth();

  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [firmFilter, setFirmFilter] = useState("all");

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [approveOpen, setApproveOpen] = useState(false);
  const [paymentTermStatus, setPaymentTermStatus] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [p, h] = await Promise.all([
        fetch(`${API_URL}/order/accounts-approval/pending`).then((r) => r.json()),
        fetch(`${API_URL}/order/accounts-approval/history`).then((r) => r.json()),
      ]);
      setPending(p.data || []);
      setHistory(h.data || []);
    } catch {
      toast.error("Failed to load accounts approval data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Reset selection/filters whenever the active tab changes.
  useEffect(() => {
    setSelectedIds(new Set());
    setSearchTerm("");
    setFirmFilter("all");
  }, [tab]);

  const scoped = useCallback(
    (rows) => rows.filter((r) => isSuperAdmin || canViewFirm(user?.firmName, r.receipt?.firmName)),
    [isSuperAdmin, user]
  );

  const scopedPending = useMemo(() => scoped(pending), [scoped, pending]);
  const scopedHistory = useMemo(() => scoped(history), [scoped, history]);

  const firmOptions = useMemo(() => {
    const source = tab === "pending" ? scopedPending : scopedHistory;
    const firms = [...new Set(source.map((r) => r.receipt?.firmName).filter(Boolean))];
    return ["all", ...firms];
  }, [tab, scopedPending, scopedHistory]);

  const filterRows = useCallback(
    (rows) => {
      let list = rows;
      if (firmFilter !== "all") list = list.filter((r) => r.receipt?.firmName === firmFilter);
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        list = list.filter((r) => {
          const d = r.dispatchRecord || {};
          return [d.dSrNumber, d.doNumber, d.partyName, d.productName, r.transporterName, r.receipt?.firmName]
            .some((v) => v?.toString().toLowerCase().includes(term));
        });
      }
      return list;
    },
    [firmFilter, searchTerm]
  );

  const displayPending = useMemo(() => filterRows(scopedPending), [filterRows, scopedPending]);
  const displayHistory = useMemo(() => filterRows(scopedHistory), [filterRows, scopedHistory]);

  const selectedRows = useMemo(
    () => displayPending.filter((r) => selectedIds.has(r.id)),
    [displayPending, selectedIds]
  );

  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = (checked) => {
    if (checked) setSelectedIds(new Set(displayPending.map((r) => r.id)));
    else setSelectedIds(new Set());
  };

  const openApprove = () => {
    if (selectedIds.size === 0) {
      toast.error("Select at least one dispatch to approve");
      return;
    }
    setPaymentTermStatus("");
    setRemarks("");
    setApproveOpen(true);
  };

  const closeApprove = () => {
    setApproveOpen(false);
    setPaymentTermStatus("");
    setRemarks("");
  };

  const handleApprove = async () => {
    if (!paymentTermStatus) {
      toast.error("Please select a payment term status");
      return;
    }
    if (paymentTermStatus === "Not Followed" && !remarks.trim()) {
      toast.error("Please enter remarks for 'Not Followed'");
      return;
    }
    const splitIds = Array.from(selectedIds);
    if (splitIds.length === 0) {
      toast.error("Select at least one dispatch to approve");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/order/accounts-approval/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          splitIds,
          paymentTermStatus,
          remarks: paymentTermStatus === "Not Followed" ? remarks.trim() : undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to approve");
      toast.success("Approved — moved to Logistic");
      closeApprove();
      setSelectedIds(new Set());
      loadData();
    } catch (err) {
      toast.error(err.message || "Failed to approve");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
        <span className="text-zinc-500">Loading accounts approval...</span>
      </div>
    );
  }

  const columns = ["", "D-Sr No.", "DO No.", "Party", "Product", "Qty", "Dispatch Date", "Firm", "Transporter", "Transporter Rate"];

  const renderRows = (rows, isPending) => {
    if (rows.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={columns.length + (isPending ? 0 : 1)} className="text-center py-10 text-zinc-400">
            No records found
          </TableCell>
        </TableRow>
      );
    }
    return rows.map((r) => {
      const d = r.dispatchRecord || {};
      return (
        <TableRow key={r.id} className="text-sm">
          {isPending && !isReadOnly && (
            <TableCell>
              <Checkbox checked={selectedIds.has(r.id)} onCheckedChange={() => toggleRow(r.id)} />
            </TableCell>
          )}
          {(!isPending || isReadOnly) && <TableCell />}
          <TableCell className="font-mono text-xs">{d.dSrNumber || "—"}</TableCell>
          <TableCell className="font-mono text-xs">{d.doNumber || "—"}</TableCell>
          <TableCell>{d.partyName || "—"}</TableCell>
          <TableCell>{d.productName || "—"}</TableCell>
          <TableCell>{formatQty(d.qtyToBeDispatched)}</TableCell>
          <TableCell className="text-xs">{formatDate(d.dateOfDispatch)}</TableCell>
          <TableCell className="text-xs text-zinc-500">{r.receipt?.firmName || "—"}</TableCell>
          <TableCell className="text-xs">{r.transporterName || "—"}</TableCell>
          <TableCell className="text-xs">{formatRate(r.rate)}</TableCell>
          {!isPending && (
            <TableCell>
              <Badge
                variant="outline"
                className={
                  r.paymentTermStatus === "Not Followed"
                    ? "bg-red-100 text-red-700 border-red-200"
                    : "bg-green-100 text-green-700 border-green-200"
                }
              >
                {r.paymentTermStatus || "—"}
              </Badge>
              {r.accountsRemarks && (
                <p className="text-xs text-red-600 italic mt-1 max-w-[200px] truncate" title={r.accountsRemarks}>
                  {r.accountsRemarks}
                </p>
              )}
            </TableCell>
          )}
        </TableRow>
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Accounts Approval</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">Review payment terms before releasing to Logistic</p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={refreshing} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-amber-50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/40 shadow-sm">
          <CardContent className="p-6 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-amber-600">Pending Approval</p>
              <div className="text-2xl font-bold text-amber-900 dark:text-amber-300">{scopedPending.length}</div>
            </div>
            <div className="h-10 w-10 bg-amber-500 rounded-full flex items-center justify-center text-white">
              <AlertCircle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-100 dark:bg-green-950/20 dark:border-green-900/40 shadow-sm">
          <CardContent className="p-6 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-green-600">Approved</p>
              <div className="text-2xl font-bold text-green-900 dark:text-green-300">{scopedHistory.length}</div>
            </div>
            <div className="h-10 w-10 bg-green-500 rounded-full flex items-center justify-center text-white">
              <BadgeCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
              <TabsList>
                <TabsTrigger value="pending">Pending ({scopedPending.length})</TabsTrigger>
                <TabsTrigger value="history">History ({scopedHistory.length})</TabsTrigger>
              </TabsList>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-9 w-full sm:w-56"
                  />
                </div>
                <Select value={firmFilter} onValueChange={setFirmFilter}>
                  <SelectTrigger className="h-9 w-full sm:w-[170px]">
                    <Building className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Firm" />
                  </SelectTrigger>
                  <SelectContent>
                    {firmOptions.map((firm) => (
                      <SelectItem key={firm} value={firm}>{firm === "all" ? "All Firms" : firm}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <TabsContent value="pending" className="mt-4 space-y-4">
          {!isReadOnly && (
            <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-md px-4 py-2.5">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={displayPending.length > 0 && selectedIds.size === displayPending.length}
                  onCheckedChange={toggleAll}
                  disabled={displayPending.length === 0}
                />
                <span className="text-sm text-blue-800 dark:text-blue-300">
                  {selectedIds.size} of {displayPending.length} selected
                </span>
              </div>
              <Button
                onClick={openApprove}
                disabled={selectedIds.size === 0}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Approve Selected ({selectedIds.size})
              </Button>
            </div>
          )}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="overflow-auto max-h-[calc(100vh-420px)]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-50 dark:bg-zinc-900/60">
                    <TableHead className="w-8" />
                    {columns.slice(1).map((h) => (
                      <TableHead key={h} className="text-xs font-semibold whitespace-nowrap">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>{renderRows(displayPending, true)}</TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-4">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="overflow-auto max-h-[calc(100vh-380px)]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-50 dark:bg-zinc-900/60">
                    <TableHead className="w-8" />
                    {columns.slice(1).map((h) => (
                      <TableHead key={h} className="text-xs font-semibold whitespace-nowrap">{h}</TableHead>
                    ))}
                    <TableHead className="text-xs font-semibold whitespace-nowrap">Payment Term</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{renderRows(displayHistory, false)}</TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Bulk approve dialog */}
      <Sheet open={approveOpen} onOpenChange={(open) => !open && closeApprove()}>
        <SheetContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Accounts Approval</SheetTitle>
            <SheetDescription>
              {selectedRows.length} dispatch{selectedRows.length > 1 ? "es" : ""} selected — this decision applies to all of them.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 py-2">
            {/* Selected splits */}
            <div className="bg-slate-50 dark:bg-zinc-900 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Selected Dispatches ({selectedRows.length})
              </p>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {selectedRows.map((row) => {
                  const d = row.dispatchRecord || {};
                  return (
                    <div key={row.id} className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-slate-800 dark:text-zinc-100 text-sm">{d.productName || "—"}</span>
                        <span className="text-xs text-slate-500">{row.transporterName || "—"}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-zinc-400">
                        <span>DO: <span className="font-mono">{d.doNumber || "—"}</span></span>
                        <span>Party: {d.partyName || "—"}</span>
                        <span>Qty: <span className="font-bold text-blue-600">{formatQty(d.qtyToBeDispatched)}</span></span>
                        <span>Rate: {formatRate(row.rate)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment term selection */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Payment Term Status *</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setPaymentTermStatus("Followed"); setRemarks(""); }}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    paymentTermStatus === "Followed"
                      ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                      : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Followed</p>
                  <p className="text-xs text-zinc-500 mt-1">Payment terms were adhered to</p>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentTermStatus("Not Followed")}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    paymentTermStatus === "Not Followed"
                      ? "border-red-500 bg-red-50 dark:bg-red-950/30"
                      : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Not Followed</p>
                  <p className="text-xs text-zinc-500 mt-1">Payment terms were not adhered to</p>
                </button>
              </div>
            </div>

            {/* Remarks — required when Not Followed */}
            {paymentTermStatus === "Not Followed" && (
              <div className="space-y-1">
                <Label className="text-sm">Remarks *</Label>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Describe why payment terms were not followed..."
                  className="h-24 resize-none"
                  disabled={submitting}
                />
              </div>
            )}
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={closeApprove} disabled={submitting}>Cancel</Button>
            <Button
              onClick={handleApprove}
              disabled={submitting || !paymentTermStatus || (paymentTermStatus === "Not Followed" && !remarks.trim())}
              className="bg-green-600 hover:bg-green-700 gap-2"
            >
              {submitting ? (<><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>) : "Approve & Send to Logistic"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
