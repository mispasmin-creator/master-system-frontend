"use client";

import React, { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import { API_URL, getToken } from "@/lib/auth";
import { useAuth } from "@/systems/order/context/AuthContext";
import { canViewFirm } from "@/systems/order/utils/firmFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Search, Loader2, CheckCircle2, RotateCcw, Eye, Clock, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Ported from _reference/New-Order-collection components/pages/ReceivedAccounts.jsx.
// That reference talks to Supabase directly and groups pending/history rows by
// PO with a single "Mark All Received" bulk action per group; here every
// read/write goes through merge-system-backend's /api/order/received-accounts
// REST endpoints instead (see systems/order/supabase.js — Supabase is
// storage-only in this system).
//
// GET /pending  -> OrderReceipt rows with checkPo done, no receivedAccounts yet
// GET /history  -> OrderReceipt rows with receivedAccounts done (+ canRevert)
// POST /        -> body { receiptIds: [...] } marks one or more rows received
// POST /:id/revert -> undo (refused server-side if Check Delivery already done)
// ---------------------------------------------------------------------------

export default function ReceivedAccounts() {
  const { user, isSuperAdmin, isReadOnly } = useAuth();

  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [groupForAction, setGroupForAction] = useState(null);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revertingId, setRevertingId] = useState(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [p, h] = await Promise.all([
        fetch(`${API_URL}/order/received-accounts/pending`).then((r) => r.json()),
        fetch(`${API_URL}/order/received-accounts/history`).then((r) => r.json()),
      ]);
      setPending(p.data || []);
      setHistory(h.data || []);
    } catch {
      toast.error("Failed to load received accounts data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Reset selection whenever the tab changes
  useEffect(() => { setSelectedIds(new Set()); }, [tab]);

  const scopedPending = useMemo(
    () => pending.filter((o) => isSuperAdmin || canViewFirm(user?.firmName, o.firmName)),
    [pending, isSuperAdmin, user]
  );
  const scopedHistory = useMemo(
    () => history.filter((o) => isSuperAdmin || canViewFirm(user?.firmName, o.firmName)),
    [history, isSuperAdmin, user]
  );

  const searchFilter = (list) => {
    if (!searchTerm) return list;
    const term = searchTerm.toLowerCase();
    return list.filter((o) =>
      ["doNumber", "partyPoNo", "partyName", "productName", "firmName", "contactPersonName"].some((f) =>
        String(o[f] || "").toLowerCase().includes(term)
      )
    );
  };

  const displayPending = useMemo(() => searchFilter(scopedPending), [scopedPending, searchTerm]);
  const displayHistory = useMemo(() => searchFilter(scopedHistory), [scopedHistory, searchTerm]);
  const displayOrders = tab === "pending" ? displayPending : displayHistory;

  // Group by PO — same pattern as Order.jsx's groupedOrders
  const groupedOrders = useMemo(() => {
    const groups = {};
    const order = [];
    displayOrders.forEach((o) => {
      const po = o.partyPoNo || `no-po-${o.id}`;
      if (!groups[po]) {
        groups[po] = { key: po, poNumber: o.partyPoNo || "N/A", partyName: o.partyName, rows: [], maxId: o.id };
        order.push(po);
      }
      groups[po].rows.push(o);
      if (o.id > groups[po].maxId) groups[po].maxId = o.id;
    });
    return order.map((po) => groups[po]).sort((a, b) => b.maxId - a.maxId);
  }, [displayOrders]);

  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleGroup = (group, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      group.rows.forEach((r) => (checked ? next.add(r.id) : next.delete(r.id)));
      return next;
    });
  };

  const isGroupFullySelected = (group) => group.rows.every((r) => selectedIds.has(r.id));
  const isGroupPartiallySelected = (group) => group.rows.some((r) => selectedIds.has(r.id)) && !isGroupFullySelected(group);

  const openGroupAction = (group) => {
    setGroupForAction(group);
    setIsActionDialogOpen(true);
  };

  const openBulkAction = () => {
    if (selectedIds.size === 0) return;
    const rows = displayPending.filter((o) => selectedIds.has(o.id));
    setGroupForAction({ key: "bulk", poNumber: "Multiple", partyName: "Multiple parties", rows });
    setIsActionDialogOpen(true);
  };

  const handleMarkReceived = async () => {
    if (!groupForAction) return;
    setIsSubmitting(true);
    try {
      const receiptIds = groupForAction.rows.map((r) => r.id);
      const res = await fetch(`${API_URL}/order/received-accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ receiptIds }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to mark as received");

      toast.success(
        groupForAction.key === "bulk"
          ? `${receiptIds.length} order(s) marked as received`
          : `${receiptIds.length} order(s) under PO ${groupForAction.poNumber} marked as received`
      );
      setIsActionDialogOpen(false);
      setGroupForAction(null);
      setSelectedIds(new Set());
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevert = async (receiptId) => {
    if (!confirm("Revert Received Accounts for this order?")) return;
    setRevertingId(receiptId);
    try {
      const res = await fetch(`${API_URL}/order/received-accounts/${receiptId}/revert`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to revert");
      toast.success("Reverted");
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRevertingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <span className="text-zinc-500 text-sm">Loading received accounts data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Received in Accounts</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">Manage received orders and history</p>
        </div>
        <Button variant="outline" onClick={load} disabled={refreshing} className="h-9 px-3 gap-2 w-fit">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card><CardContent className="p-6 flex justify-between items-center">
          <div><p className="text-sm font-medium text-zinc-500">Pending Receipt</p><div className="text-2xl font-bold">{scopedPending.length}</div></div>
          <Clock className="h-8 w-8 text-amber-500" />
        </CardContent></Card>
        <Card><CardContent className="p-6 flex justify-between items-center">
          <div><p className="text-sm font-medium text-zinc-500">Received History</p><div className="text-2xl font-bold">{scopedHistory.length}</div></div>
          <CheckCircle2 className="h-8 w-8 text-green-500" />
        </CardContent></Card>
      </div>

      {/* Tabs + search */}
      <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-md shrink-0 w-fit">
          <button
            onClick={() => setTab("pending")}
            className={`py-1.5 px-4 text-sm font-medium rounded-sm transition-all ${
              tab === "pending" ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-600 dark:text-zinc-300"
            }`}
          >
            Pending ({scopedPending.length})
          </button>
          <button
            onClick={() => setTab("history")}
            className={`py-1.5 px-4 text-sm font-medium rounded-sm transition-all ${
              tab === "history" ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-600 dark:text-zinc-300"
            }`}
          >
            History ({scopedHistory.length})
          </button>
        </div>
        <div className="flex gap-2 items-center">
          {tab === "pending" && !isReadOnly && selectedIds.size > 0 && (
            <Button size="sm" onClick={openBulkAction} className="h-9 gap-2 bg-purple-600 hover:bg-purple-700 text-white">
              <CheckCircle2 className="w-4 h-4" /> Mark Received ({selectedIds.size})
            </Button>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
            <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-9 w-[220px]" />
          </div>
        </div>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-auto max-h-[calc(100vh-320px)]">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50 dark:bg-zinc-900/60">
                {tab === "pending" && !isReadOnly && <TableHead className="w-10"></TableHead>}
                <TableHead className="w-[120px]">Action</TableHead>
                <TableHead>DO No.</TableHead>
                <TableHead>PO Number</TableHead>
                <TableHead>Party Name</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead>Transporter Type</TableHead>
                <TableHead>PO Copy</TableHead>
                <TableHead>Order From</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Alumina%</TableHead>
                <TableHead>Iron%</TableHead>
                <TableHead>PI Type</TableHead>
                <TableHead>Firm</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={17} className="text-center py-10 text-zinc-400">No records</TableCell>
                </TableRow>
              ) : (
                groupedOrders.map((group) => (
                  <Fragment key={group.key}>
                    <TableRow className="bg-zinc-50 dark:bg-zinc-900/40">
                      <TableCell colSpan={17} className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {tab === "pending" && !isReadOnly && (
                            <>
                              <Checkbox
                                checked={isGroupFullySelected(group)}
                                data-state={isGroupPartiallySelected(group) ? "indeterminate" : undefined}
                                onCheckedChange={(v) => toggleGroup(group, !!v)}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openGroupAction(group)}
                                className="h-7 text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 shrink-0"
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Mark All Received
                              </Button>
                            </>
                          )}
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">PO Number: {group.poNumber}</span>
                            <span className="text-xs text-zinc-500">Party Name: {group.partyName}</span>
                          </div>
                          <Badge variant="outline" className="w-fit bg-white dark:bg-zinc-900 ml-auto">
                            {group.rows.length} item{group.rows.length > 1 ? "s" : ""}
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                    {group.rows.map((order) => (
                      <TableRow key={order.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900 text-sm">
                        {tab === "pending" && !isReadOnly && (
                          <TableCell>
                            <Checkbox checked={selectedIds.has(order.id)} onCheckedChange={() => toggleRow(order.id)} />
                          </TableCell>
                        )}
                        <TableCell>
                          {tab === "history" ? (
                            <div className="flex items-center gap-2">
                              <div className="flex items-center text-green-600 gap-1 text-xs">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Received
                              </div>
                              {order.canRevert && !isReadOnly && (
                                <Button
                                  variant="ghost" size="icon" className="h-6 w-6 text-amber-500 hover:text-amber-700"
                                  disabled={revertingId === order.id}
                                  onClick={() => handleRevert(order.id)}
                                  title="Revert"
                                >
                                  {revertingId === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                                </Button>
                              )}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{order.doNumber || "—"}</TableCell>
                        <TableCell className="text-sm font-medium">{order.partyPoNo || "N/A"}</TableCell>
                        <TableCell>{order.partyName}</TableCell>
                        <TableCell>{order.productName}</TableCell>
                        <TableCell className="text-right">{order.quantity ?? 0}</TableCell>
                        <TableCell className="text-right">{order.rateOfMaterial ?? 0}</TableCell>
                        <TableCell>{order.typeOfTransporting || "N/A"}</TableCell>
                        <TableCell>
                          {order.uploadSo ? (
                            <a href={order.uploadSo} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline text-xs flex items-center gap-1">
                              <Eye className="w-3 h-3" /> View
                            </a>
                          ) : "-"}
                        </TableCell>
                        <TableCell>{order.orderReceivedFrom || "N/A"}</TableCell>
                        <TableCell>{order.contactPersonName || "N/A"}</TableCell>
                        <TableCell>{order.contactPersonWhatsapp || "N/A"}</TableCell>
                        <TableCell>{order.aluminaPercent ?? "N/A"}</TableCell>
                        <TableCell>{order.ironPercent ?? "N/A"}</TableCell>
                        <TableCell>{order.typeOfPi || "N/A"}</TableCell>
                        <TableCell>{order.firmName || "N/A"}</TableCell>
                      </TableRow>
                    ))}
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Confirm dialog */}
      <Sheet open={isActionDialogOpen} onOpenChange={(v) => { if (!isSubmitting) setIsActionDialogOpen(v); }}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Confirm Receipt</SheetTitle>
            <SheetDescription>
              Mark the selected order(s) as received in accounts
            </SheetDescription>
          </SheetHeader>

          {groupForAction && (
            <div className="space-y-2 py-2">
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                PO: <span className="font-medium">{groupForAction.poNumber}</span>
                {" · "}Party: <span className="font-medium">{groupForAction.partyName}</span>
              </p>
              <div className="max-h-64 overflow-y-auto space-y-1 border rounded-md p-2 border-zinc-200 dark:border-zinc-800">
                {groupForAction.rows.map((order) => (
                  <div key={order.id} className="flex justify-between text-sm border-b last:border-0 pb-1 border-zinc-100 dark:border-zinc-800">
                    <span>{order.productName}</span>
                    <span className="text-zinc-400 text-xs">DO: {order.doNumber} · Qty: {order.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <SheetFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsActionDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleMarkReceived} disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700 text-white">
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4 mr-2" /> Confirm Receipt</>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
