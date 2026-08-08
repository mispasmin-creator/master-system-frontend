"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import {
  Loader2, Truck, XCircle, ChevronDown, ChevronRight, PackageCheck,
  RefreshCw, Search, RotateCcw, Trash2, FileText, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Ported from _reference/New-Order-collection components/pages/DispatchPlanningPage.jsx.
// That reference talks to Supabase directly and drives its own workflow-stage
// dashboard from raw split/order/dispatch tables. Here every read/write goes
// through merge-system-backend's /api/order/dispatch-planning/* REST endpoints
// instead — the backend has already pre-computed the dispatchable-line list
// (including the Ex-Factory auto-bypass and "synthetic" lines for approved
// receipts with no real split row yet), so this component only needs to
// render it, collect a dispatch qty per line + a shared batch form, and POST
// the batch — no client-side Supabase table logic is ported.
// ---------------------------------------------------------------------------

const TRANSPORT_TYPES = ["FOR", "Ex Factory", "Ex Factory But paid by Us", "Owned Truck", "Direct Supply"];

const toNumber = (v, fallback = 0) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};

const fmtQty = (v) => toNumber(v).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN");
};

export default function DispatchPlanning() {
  const { user, isSuperAdmin, isReadOnly } = useAuth();

  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [tab, setTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  // ── Dispatch modal state ────────────────────────────────────────────────
  const [dispatchGroup, setDispatchGroup] = useState(null); // { key, poNumber, partyName, lines }
  const [dispatchLines, setDispatchLines] = useState([]); // per-line editable rows
  const [commonForm, setCommonForm] = useState({ typeOfTransporting: "", dateOfDispatch: "", tcRequired: "Yes" });

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [pRes, hRes] = await Promise.all([
        fetch(`${API_URL}/order/dispatch-planning/pending`).then((r) => r.json()),
        fetch(`${API_URL}/order/dispatch-planning/history`).then((r) => r.json()),
      ]);
      setPending(pRes.data || []);
      setHistory(hRes.data || []);
    } catch {
      toast.error("Failed to load dispatch planning data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Firm scoping (identical pattern to Order.jsx) ───────────────────────
  const scopedPending = useMemo(
    () => pending.filter((l) => isSuperAdmin || canViewFirm(user?.firmName, l.receipt?.firmName)),
    [pending, isSuperAdmin, user]
  );
  const scopedHistory = useMemo(
    () => history.filter((r) => isSuperAdmin || canViewFirm(user?.firmName, r.receipt?.firmName)),
    [history, isSuperAdmin, user]
  );

  const filteredPending = useMemo(() => {
    if (!searchTerm.trim()) return scopedPending;
    const term = searchTerm.toLowerCase();
    return scopedPending.filter((l) =>
      [l.receipt?.doNumber, l.receipt?.partyPoNo, l.receipt?.partyName, l.receipt?.productName, l.receipt?.firmName, l.transporterName]
        .some((v) => String(v || "").toLowerCase().includes(term))
    );
  }, [scopedPending, searchTerm]);

  const filteredHistory = useMemo(() => {
    if (!searchTerm.trim()) return scopedHistory;
    const term = searchTerm.toLowerCase();
    return scopedHistory.filter((r) =>
      [r.dSrNumber, r.doNumber, r.partyName, r.productName, r.receipt?.partyPoNo, r.receipt?.firmName]
        .some((v) => String(v || "").toLowerCase().includes(term))
    );
  }, [scopedHistory, searchTerm]);

  // ── Group by PO number (mirrors reference's groupRowsByPo) ──────────────
  const pendingGroups = useMemo(() => {
    const map = new Map();
    for (const line of filteredPending) {
      const key = line.receipt?.partyPoNo || `__no_po_${line.receiptId}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          poNumber: line.receipt?.partyPoNo || "No PO",
          partyName: line.receipt?.partyName || "",
          firmName: line.receipt?.firmName || "",
          lines: [],
        });
      }
      map.get(key).lines.push(line);
    }
    return Array.from(map.values()).sort((a, b) => (b.lines[0]?.receiptId || 0) - (a.lines[0]?.receiptId || 0));
  }, [filteredPending]);

  const historyGroups = useMemo(() => {
    const map = new Map();
    for (const row of filteredHistory) {
      const key = row.receipt?.partyPoNo || `__no_po_${row.receiptId || row.id}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          poNumber: row.receipt?.partyPoNo || "No PO",
          partyName: row.partyName || row.receipt?.partyName || "",
          firmName: row.receipt?.firmName || "",
          rows: [],
        });
      }
      map.get(key).rows.push(row);
    }
    return Array.from(map.values()).sort((a, b) => (b.rows[0]?.id || 0) - (a.rows[0]?.id || 0));
  }, [filteredHistory]);

  const toggleExpand = (key) =>
    setExpandedGroups((prev) => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });

  // ── Dispatch modal: open / close ────────────────────────────────────────
  const openDispatch = (group) => {
    setDispatchGroup(group);
    setDispatchLines(
      group.lines.map((l) => ({
        splitId: l.splitId, // keep exactly as received — may be "synthetic_<id>" string
        receiptId: l.receiptId,
        doNumber: l.receipt?.doNumber,
        productName: l.receipt?.productName,
        transporterName: l.transporterName,
        quantity: l.receipt?.quantity,
        delivered: l.receipt?.delivered,
        allocatedQty: l.allocatedQty,
        pendingQty: l.receipt?.pendingQty,
        dispatchableQty: l.dispatchableQty,
        synthetic: l.synthetic,
        dispatchQty: "",
        included: true,
      }))
    );
    setCommonForm({
      typeOfTransporting: group.lines[0]?.receipt?.typeOfTransporting || "",
      dateOfDispatch: "",
      tcRequired: group.lines[0]?.receipt?.tcRequired || "Yes",
    });
  };

  const closeDispatch = () => {
    if (submitting) return;
    setDispatchGroup(null);
    setDispatchLines([]);
    setCommonForm({ typeOfTransporting: "", dateOfDispatch: "", tcRequired: "Yes" });
  };

  const updateLineQty = (idx, value) =>
    setDispatchLines((prev) => {
      const n = [...prev];
      let qty = value;
      if (qty !== "") {
        if (qty.startsWith("-")) {
          qty = "";
        } else {
          const parsed = parseFloat(qty);
          const max = toNumber(n[idx].dispatchableQty);
          if (!isNaN(parsed)) {
            if (parsed > max) qty = String(max);
            else if (parsed < 0) qty = "0";
          }
        }
      }
      n[idx] = { ...n[idx], dispatchQty: qty };
      return n;
    });

  const toggleLine = (idx) =>
    setDispatchLines((prev) => {
      const n = [...prev];
      n[idx] = { ...n[idx], included: !n[idx].included };
      return n;
    });

  // ── Submit dispatch batch ───────────────────────────────────────────────
  const handleSubmitDispatch = async () => {
    const activeLines = dispatchLines.filter((l) => l.included);

    if (activeLines.length === 0) {
      toast.error("At least one product must be included in the dispatch.");
      return;
    }
    if (!commonForm.typeOfTransporting) {
      toast.error("Transporter Type is required.");
      return;
    }
    if (!commonForm.dateOfDispatch) {
      toast.error("Dispatch Date is required.");
      return;
    }
    for (const line of activeLines) {
      const qty = toNumber(line.dispatchQty);
      if (qty <= 0) {
        toast.error(`Dispatch qty must be > 0 for "${line.productName}".`);
        return;
      }
      const max = toNumber(line.dispatchableQty);
      if (qty > max + 0.0001) {
        toast.error(`Dispatch qty for "${line.productName}" cannot exceed pending qty (${max}).`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/order/dispatch-planning/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          lines: activeLines.map((l) => ({
            receiptId: l.receiptId,
            splitId: l.splitId, // passed back exactly as received from /pending
            dispatchQty: toNumber(l.dispatchQty),
          })),
          typeOfTransporting: commonForm.typeOfTransporting,
          dateOfDispatch: commonForm.dateOfDispatch,
          tcRequired: commonForm.tcRequired,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Dispatch failed");
      toast.success(`${activeLines.length} record${activeLines.length > 1 ? "s" : ""} dispatched.`);
      closeDispatch();
      await loadData();
    } catch (err) {
      toast.error(err.message || "Dispatch failed");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Cancel order (whole PO group) — terminal, non-reversible ────────────
  const handleCancelOrder = async (group) => {
    if (!window.confirm(`Are you sure you want to cancel PO: ${group.poNumber}? This will mark all items as cancelled and cannot be undone.`)) return;

    const receiptIds = [...new Set(group.lines.map((l) => l.receiptId))].filter(Boolean);
    if (receiptIds.length === 0) {
      toast.error("No valid order IDs found.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/order/dispatch-planning/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ receiptIds, cancelledBy: user?.username || "Unknown" }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Cancel failed");
      toast.success(`PO ${group.poNumber} has been cancelled.`);
      await loadData();
    } catch (err) {
      toast.error(err.message || "Cancel failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <span className="text-zinc-500">Loading dispatch planning...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Dispatch Planning</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">Plan and dispatch approved logistics splits per PO</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900">
          <CardContent className="p-6 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-amber-600">Pending Dispatch</p>
              <div className="text-2xl font-bold text-amber-900 dark:text-amber-200">{scopedPending.length}</div>
            </div>
            <div className="h-10 w-10 bg-amber-500 rounded-full flex items-center justify-center text-white">
              <Truck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-100 dark:border-green-900">
          <CardContent className="p-6 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-green-600">Dispatch History</p>
              <div className="text-2xl font-bold text-green-900 dark:text-green-200">{scopedHistory.length}</div>
            </div>
            <div className="h-10 w-10 bg-green-500 rounded-full flex items-center justify-center text-white">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + refresh */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
            <Input placeholder="Search PO, DO, party, product..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-9" />
          </div>
          <Button variant="outline" onClick={loadData} disabled={refreshing} className="h-9 px-3">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-1.5">
            <Truck className="w-3.5 h-3.5" /> Pending Dispatch ({pendingGroups.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <FileText className="w-3.5 h-3.5" /> History ({historyGroups.length})
          </TabsTrigger>
        </TabsList>

        {/* ── PENDING TAB ─────────────────────────────────────────────── */}
        <TabsContent value="pending">
          <Card>
            <div className="overflow-auto max-h-[calc(100vh-380px)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>PO Number</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>Firm</TableHead>
                    <TableHead className="text-right">Lines</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingGroups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-zinc-400">No pending dispatch lines.</TableCell>
                    </TableRow>
                  ) : (
                    pendingGroups.map((group) => {
                      const isExpanded = expandedGroups.has(group.key);
                      return (
                        <React.Fragment key={group.key}>
                          <TableRow className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900" onClick={() => toggleExpand(group.key)}>
                            <TableCell className="text-zinc-400">{isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</TableCell>
                            <TableCell className="font-semibold">{group.poNumber}</TableCell>
                            <TableCell className="text-sm">{group.partyName}</TableCell>
                            <TableCell className="text-sm text-zinc-500">{group.firmName}</TableCell>
                            <TableCell className="text-right text-sm">{group.lines.length}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                {!isReadOnly && (
                                  <>
                                    <Button size="sm" onClick={() => openDispatch(group)} className="bg-blue-600 hover:bg-blue-700 h-8 px-3 text-xs" disabled={submitting}>
                                      <Truck className="w-3.5 h-3.5 mr-1.5" /> Dispatch
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleCancelOrder(group)} className="h-8 px-3 text-xs" disabled={submitting}>
                                      <XCircle className="w-3.5 h-3.5 mr-1.5" /> Cancel
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={6} className="bg-zinc-50/60 dark:bg-zinc-900/40 p-4 border-b">
                                <div className="space-y-2">
                                  {group.lines.map((line) => (
                                    <div key={line.splitId} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
                                      <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-100 min-w-[140px]">{line.receipt?.productName}</span>
                                      <span className="text-zinc-500">DO: <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300">{line.receipt?.doNumber || "—"}</span></span>
                                      <span className="text-zinc-500">Transporter: <span className="font-medium text-zinc-700 dark:text-zinc-300">{line.transporterName || "—"}</span></span>
                                      <span className="text-zinc-500">Allocated: <span className="font-medium text-blue-600">{fmtQty(line.allocatedQty)}</span></span>
                                      <span className="text-zinc-500">Pending: <span className="font-medium text-amber-600">{fmtQty(line.receipt?.pendingQty)}</span></span>
                                      <span className="text-zinc-500">Dispatchable: <span className="font-medium text-green-600">{fmtQty(line.dispatchableQty)}</span></span>
                                      {line.synthetic && <Badge variant="outline" className="text-[10px]">Not yet split</Badge>}
                                    </div>
                                  ))}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ── HISTORY TAB ─────────────────────────────────────────────── */}
        <TabsContent value="history">
          <Card>
            <div className="overflow-auto max-h-[calc(100vh-380px)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>PO Number</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>Firm</TableHead>
                    <TableHead className="text-right">Records</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyGroups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-zinc-400">No dispatch history.</TableCell>
                    </TableRow>
                  ) : (
                    historyGroups.map((group) => {
                      const isExpanded = expandedGroups.has(group.key);
                      return (
                        <React.Fragment key={group.key}>
                          <TableRow className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900" onClick={() => toggleExpand(group.key)}>
                            <TableCell className="text-zinc-400">{isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</TableCell>
                            <TableCell className="font-semibold">{group.poNumber}</TableCell>
                            <TableCell className="text-sm">{group.partyName}</TableCell>
                            <TableCell className="text-sm text-zinc-500">{group.firmName}</TableCell>
                            <TableCell className="text-right text-sm">{group.rows.length}</TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={5} className="bg-zinc-50/60 dark:bg-zinc-900/40 p-4 border-b">
                                <div className="overflow-auto rounded-md border border-zinc-200 dark:border-zinc-800">
                                  <table className="w-full text-xs">
                                    <thead className="bg-zinc-50 dark:bg-zinc-900">
                                      <tr>
                                        <th className="text-left px-3 py-2 font-medium">D-Sr No.</th>
                                        <th className="text-left px-3 py-2 font-medium">DO No.</th>
                                        <th className="text-left px-3 py-2 font-medium">Product</th>
                                        <th className="text-right px-3 py-2 font-medium">Qty Dispatched</th>
                                        <th className="text-left px-3 py-2 font-medium">Transport Type</th>
                                        <th className="text-left px-3 py-2 font-medium">Date Of Dispatch</th>
                                        <th className="text-left px-3 py-2 font-medium">TC Required</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {group.rows.map((row) => (
                                        <tr key={row.id} className="border-t border-zinc-100 dark:border-zinc-800">
                                          <td className="px-3 py-2 font-mono">{row.dSrNumber || "—"}</td>
                                          <td className="px-3 py-2 font-mono">{row.doNumber || "—"}</td>
                                          <td className="px-3 py-2">{row.productName || "—"}</td>
                                          <td className="px-3 py-2 text-right font-medium">{fmtQty(row.qtyToBeDispatched)}</td>
                                          <td className="px-3 py-2">{row.typeOfTransporting || "—"}</td>
                                          <td className="px-3 py-2">{fmtDate(row.dateOfDispatch)}</td>
                                          <td className="px-3 py-2">{row.tcRequired || "—"}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── DISPATCH MODAL ────────────────────────────────────────────── */}
      <Sheet open={!!dispatchGroup} onOpenChange={(v) => !v && closeDispatch()}>
        <SheetContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          {dispatchGroup && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <PackageCheck className="h-5 w-5 text-blue-600" /> Dispatch PO: {dispatchGroup.poNumber}
                </SheetTitle>
                <p className="text-sm text-zinc-500">{dispatchGroup.partyName} &middot; {dispatchLines.length} product{dispatchLines.length > 1 ? "s" : ""}</p>
              </SheetHeader>

              <div className="space-y-6">
                {/* Lines table */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 mb-2">Products to Dispatch</h3>
                  {dispatchLines.some((l) => !l.included) && (
                    <div className="flex items-center justify-between px-1 mb-2">
                      <span className="text-xs text-zinc-500">
                        <span className="font-medium text-red-600">{dispatchLines.filter((l) => !l.included).length}</span> product(s) excluded from this batch.
                      </span>
                      <button onClick={() => setDispatchLines((p) => p.map((l) => ({ ...l, included: true })))} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                        <RotateCcw className="w-3 h-3" /> Restore All
                      </button>
                    </div>
                  )}
                  <div className="border rounded-lg overflow-hidden overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-600 dark:text-zinc-300">
                        <tr>
                          <th className="text-left px-3 py-2 font-semibold">DO Number</th>
                          <th className="text-left px-3 py-2 font-semibold">Product</th>
                          <th className="text-right px-3 py-2 font-semibold">Allocated</th>
                          <th className="text-right px-3 py-2 font-semibold">Pending</th>
                          <th className="text-right px-3 py-2 font-semibold min-w-[120px]">Dispatch Qty *</th>
                          <th className="px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {dispatchLines.map((line, idx) => (
                          <tr key={line.splitId} className={line.included ? "" : "opacity-50"}>
                            <td className="px-3 py-2 font-mono text-xs text-zinc-500">{line.doNumber || "—"}</td>
                            <td className="px-3 py-2 font-medium">{line.productName}</td>
                            <td className="px-3 py-2 text-right">{fmtQty(line.allocatedQty)}</td>
                            <td className="px-3 py-2 text-right text-amber-600">{fmtQty(line.pendingQty)}</td>
                            <td className="px-3 py-2 text-right">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max={toNumber(line.dispatchableQty)}
                                value={line.dispatchQty}
                                onChange={(e) => updateLineQty(idx, e.target.value)}
                                className="h-8 w-28 text-right ml-auto"
                                disabled={submitting || !line.included}
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              {line.included ? (
                                <button type="button" onClick={() => toggleLine(idx)} disabled={submitting} title="Exclude from this batch" className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              ) : (
                                <button type="button" onClick={() => toggleLine(idx)} disabled={submitting} title="Restore to this batch" className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30">
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Shared batch fields */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 mb-2">
                    Dispatch Details <span className="text-xs font-normal text-zinc-500">(applies to all rows above)</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Transporter Type *</Label>
                      <Select value={commonForm.typeOfTransporting} onValueChange={(v) => setCommonForm((p) => ({ ...p, typeOfTransporting: v }))} disabled={submitting}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>{TRANSPORT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Date Of Dispatch *</Label>
                      <Input type="date" value={commonForm.dateOfDispatch} onChange={(e) => setCommonForm((p) => ({ ...p, dateOfDispatch: e.target.value }))} className="h-9" disabled={submitting} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">TC Required</Label>
                      <Select value={commonForm.tcRequired} onValueChange={(v) => setCommonForm((p) => ({ ...p, tcRequired: v }))} disabled={submitting}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-lg text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
                  <PackageCheck className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    Submitting will create <strong>{dispatchLines.filter((l) => l.included).length} dispatch record{dispatchLines.filter((l) => l.included).length > 1 ? "s" : ""}</strong>.
                    {dispatchLines.some((l) => !l.included) && (
                      <span className="text-amber-700 dark:text-amber-400"> {dispatchLines.filter((l) => !l.included).length} excluded product(s) will remain pending for a future dispatch.</span>
                    )}
                  </span>
                </div>
              </div>

              <SheetFooter>
                <Button variant="outline" onClick={closeDispatch} disabled={submitting}>Cancel</Button>
                <Button
                  onClick={handleSubmitDispatch}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={
                    submitting ||
                    dispatchLines.every((l) => !l.included) ||
                    dispatchLines.some((l) => l.included && (!l.dispatchQty || toNumber(l.dispatchQty) <= 0)) ||
                    !commonForm.typeOfTransporting ||
                    !commonForm.dateOfDispatch
                  }
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
                  ) : (
                    <><PackageCheck className="w-4 h-4 mr-2" /> Dispatch {dispatchLines.filter((l) => l.included).length} Row{dispatchLines.filter((l) => l.included).length > 1 ? "s" : ""}</>
                  )}
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
