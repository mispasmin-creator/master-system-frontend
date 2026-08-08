"use client";

import React, { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import { API_URL, getToken } from "@/lib/auth";
import { useAuth } from "@/systems/order/context/AuthContext";
import { canViewFirm } from "@/systems/order/utils/firmFilter";
import { fetchMasterData } from "@/systems/order/utils/masterDataUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Loader2, Truck, CheckCircle, Clock, Plus, Trash2, ChevronDown,
  ChevronRight, Search, Building, User, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Ported from _reference/New-Order-collection components/pages/ArrangeLogistics.jsx.
// That reference talks to Supabase directly (po_logistics_plans /
// po_logistics_splits tables); here every read/write goes through
// merge-system-backend's /api/order/arrange-logistics/* REST endpoints
// instead (see systems/order/supabase.js — Supabase is storage-only in this
// system). Field names below follow the Prisma OrderReceipt /
// OrderLogisticsSplit models (camelCase), not the reference's Supabase
// column names.
// ---------------------------------------------------------------------------

const RATE_TYPES = ["Fixed", "Per MT"];
const EX_FACTORY = "Ex Factory Transporter";
const MAX_OPTIONS = 10;

const emptyOption = () => ({ transporterName: "", contactNumber: "", rate: "", rateType: "Fixed" });

const num = (v) => parseFloat(v) || 0;
const remainingQty = (row) => Math.max(0, num(row.quantity) - num(row.logisticsApprovedQty));

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
};

// Group a flat list of receipts by Party PO No — same grouping shape used by
// Order.jsx's groupedOrders (poNumber/partyName/firmName + child rows),
// sorted newest-PO-first via max row id.
function groupByPoNumber(list) {
  const groups = {};
  const order = [];
  list.forEach((o) => {
    const po = o.partyPoNo || "No PO";
    if (!groups[po]) {
      groups[po] = { key: po, poNumber: po, partyName: o.partyName, firmName: o.firmName, rows: [], maxId: o.id };
      order.push(po);
    }
    groups[po].rows.push(o);
    if (o.id > groups[po].maxId) groups[po].maxId = o.id;
  });
  return order.map((po) => groups[po]).sort((a, b) => b.maxId - a.maxId);
}

function applyFilters(list, filterFirm, filterParty, searchTerm) {
  let filtered = list;
  if (filterFirm !== "all") filtered = filtered.filter((o) => o.firmName === filterFirm);
  if (filterParty !== "all") filtered = filtered.filter((o) => o.partyName === filterParty);
  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter((o) =>
      Object.values(o).some((v) => v?.toString().toLowerCase().includes(term))
    );
  }
  return filtered;
}

export default function ArrangeLogistics() {
  const { user, isSuperAdmin, isReadOnly } = useAuth();

  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("pending");
  const [transporterNameOptions, setTransporterNameOptions] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterFirm, setFilterFirm] = useState("all");
  const [filterParty, setFilterParty] = useState("all");
  const [expandedPO, setExpandedPO] = useState(null);

  const [selectedGroup, setSelectedGroup] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState(new Set());
  const [transporterOptions, setTransporterOptions] = useState([emptyOption()]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [pRes, hRes] = await Promise.all([
        fetch(`${API_URL}/order/arrange-logistics/pending`).then((r) => r.json()),
        fetch(`${API_URL}/order/arrange-logistics/history`).then((r) => r.json()),
      ]);
      setPending(pRes.data || []);
      setHistory(hRes.data || []);
    } catch (err) {
      toast.error("Failed to load logistics data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    fetchMasterData().then((md) => setTransporterNameOptions(md.transporterNameOptions || []));
  }, [loadData]);

  const scopedPending = useMemo(
    () => pending.filter((o) => isSuperAdmin || canViewFirm(user?.firmName, o.firmName)),
    [pending, isSuperAdmin, user]
  );
  const scopedHistory = useMemo(
    () => history.filter((o) => isSuperAdmin || canViewFirm(user?.firmName, o.firmName)),
    [history, isSuperAdmin, user]
  );

  const firmOptions = useMemo(() => {
    const all = [...scopedPending, ...scopedHistory];
    return ["all", ...new Set(all.map((o) => o.firmName).filter(Boolean))];
  }, [scopedPending, scopedHistory]);
  const partyOptions = useMemo(() => {
    const all = [...scopedPending, ...scopedHistory];
    return ["all", ...new Set(all.map((o) => o.partyName).filter(Boolean))];
  }, [scopedPending, scopedHistory]);

  const groupedPending = useMemo(
    () => groupByPoNumber(applyFilters(scopedPending, filterFirm, filterParty, searchTerm)),
    [scopedPending, filterFirm, filterParty, searchTerm]
  );
  const groupedHistory = useMemo(
    () => groupByPoNumber(applyFilters(scopedHistory, filterFirm, filterParty, searchTerm)),
    [scopedHistory, filterFirm, filterParty, searchTerm]
  );

  // ---- Sheet: build/select products + transporter options -----------------

  const openArrangeDialog = (group) => {
    setSelectedGroup(group);
    setSelectedProductIds(new Set(group.rows.map((r) => r.id))); // default: all selected
    setTransporterOptions([emptyOption()]);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    if (isSubmitting) return;
    setIsDialogOpen(false);
    setSelectedGroup(null);
    setSelectedProductIds(new Set());
    setTransporterOptions([emptyOption()]);
  };

  const toggleProduct = (id) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllProducts = () => {
    if (selectedProductIds.size === selectedGroup?.rows.length) setSelectedProductIds(new Set());
    else setSelectedProductIds(new Set(selectedGroup?.rows.map((r) => r.id)));
  };

  const handleOptionChange = (idx, field, value) => {
    setTransporterOptions((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const addOption = () => {
    if (transporterOptions.length >= MAX_OPTIONS) {
      toast.error(`Max ${MAX_OPTIONS} transporter options allowed`);
      return;
    }
    setTransporterOptions((prev) => [...prev, emptyOption()]);
  };

  const removeOption = (idx) => {
    if (transporterOptions.length <= 1) {
      toast.error("At least one transporter option is required");
      return;
    }
    setTransporterOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  const totalSelectedRemainingQty = useMemo(() => {
    if (!selectedGroup) return 0;
    return selectedGroup.rows
      .filter((r) => selectedProductIds.has(r.id))
      .reduce((sum, r) => sum + remainingQty(r), 0);
  }, [selectedGroup, selectedProductIds]);

  const handleSubmit = async () => {
    if (selectedProductIds.size === 0) {
      toast.error("Select at least one product row to arrange");
      return;
    }
    const validOptions = transporterOptions.filter((o) => o.transporterName.trim());
    if (validOptions.length === 0) {
      toast.error("Please fill in at least one transporter option");
      return;
    }
    const missingRate = validOptions.some(
      (o) => o.transporterName.trim() !== EX_FACTORY && !String(o.rate).trim()
    );
    if (missingRate) {
      toast.error("Rate is required for every transporter option (unless \"Ex Factory Transporter\")");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/order/arrange-logistics/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          receiptIds: Array.from(selectedProductIds),
          transporterOptions: validOptions.map((o) => ({
            transporterName: o.transporterName.trim(),
            contactNumber: o.contactNumber?.trim() || undefined,
            rate: String(o.rate).trim() === "" ? undefined : o.rate,
            rateType: o.rateType || undefined,
          })),
          createdBy: user?.username || "Unknown",
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to submit logistics plan");
      toast.success("Logistics plan submitted for approval");
      closeDialog();
      loadData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetFilters = () => {
    setSearchTerm(""); setFilterFirm("all"); setFilterParty("all");
  };

  // ---- Table rendering (shared between Pending / History tabs) -------------

  const renderGroupTable = (groups, isHistory) => (
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
            {groups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-zinc-400">
                  {searchTerm || filterFirm !== "all" || filterParty !== "all"
                    ? "No matching orders found"
                    : isHistory
                      ? "No arrangement history found"
                      : "No orders pending arrangement"}
                </TableCell>
              </TableRow>
            ) : (
              groups.map((group) => {
                const isExpanded = expandedPO === `${isHistory ? "h" : "p"}-${group.key}`;
                return (
                  <Fragment key={group.key}>
                    <TableRow
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer"
                      onClick={() => setExpandedPO(isExpanded ? null : `${isHistory ? "h" : "p"}-${group.key}`)}
                    >
                      <TableCell className="text-zinc-400">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </TableCell>
                      <TableCell className="font-semibold">
                        <div className="flex items-center gap-2">
                          {group.poNumber}
                          <Badge variant="secondary" className="text-xs">
                            {group.rows.length} {group.rows.length === 1 ? "item" : "items"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{group.partyName}</TableCell>
                      <TableCell className="text-zinc-500">{group.firmName}</TableCell>
                      <TableCell className="text-right px-6">
                        {!isHistory ? (
                          !isReadOnly && (
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={(e) => { e.stopPropagation(); openArrangeDialog(group); }}
                            >
                              <Truck className="w-4 h-4 mr-2" /> Arrange
                            </Button>
                          )
                        ) : (
                          <Badge className="bg-green-100 text-green-800 border border-green-200">
                            <CheckCircle className="w-3 h-3 mr-1" /> Arranged
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={5} className="p-0 border-b">
                          <div className="bg-zinc-50 dark:bg-zinc-900/40 px-6 py-4 space-y-3">
                            {group.rows.map((row) => (
                              <div key={row.id} className="bg-white dark:bg-zinc-950 border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-sm font-semibold">{row.productName}</span>
                                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                    <Clock className="w-3 h-3 mr-1" /> Remaining Qty: {remainingQty(row).toFixed(2)} {row.typeOfMeasurement || ""}
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2 text-xs">
                                  <div>
                                    <span className="text-zinc-500">DO Number</span>
                                    <p className="font-mono font-medium">{row.doNumber || "—"}</p>
                                  </div>
                                  <div>
                                    <span className="text-zinc-500">Party PO Date</span>
                                    <p className="font-medium">{formatDate(row.partyPoDate) || "—"}</p>
                                  </div>
                                  <div>
                                    <span className="text-zinc-500">Rate</span>
                                    <p className="font-medium">{row.rateOfMaterial ? `₹${row.rateOfMaterial}` : "—"}</p>
                                  </div>
                                  <div>
                                    <span className="text-zinc-500">Basic Value</span>
                                    <p className="font-medium text-green-700">
                                      {row.totalPoBasicValue ? `₹${Number(row.totalPoBasicValue).toLocaleString()}` : "—"}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-zinc-500">Transporter Type</span>
                                    <p className="font-medium">{row.typeOfTransporting || "—"}</p>
                                  </div>
                                  <div>
                                    <span className="text-zinc-500">Payment</span>
                                    <p className="font-medium">{row.paymentToBeTaken || "—"}</p>
                                  </div>
                                  <div>
                                    <span className="text-zinc-500">Contact Person</span>
                                    <p className="font-medium">{row.contactPersonName || "—"}</p>
                                  </div>
                                  {row.freight?.toString().trim().toLowerCase() === "yes" && num(row.freightAmount) > 0 && (
                                    <div>
                                      <span className="text-zinc-500">Freight Amount</span>
                                      <p className="font-medium text-green-700">₹{Number(row.freightAmount).toLocaleString()}</p>
                                    </div>
                                  )}
                                  {row.specificConcern && (
                                    <div className="col-span-2">
                                      <span className="text-zinc-500">Specific Concern</span>
                                      <p className="font-medium text-orange-700">{row.specificConcern}</p>
                                    </div>
                                  )}
                                </div>

                                {isHistory && row.splits && row.splits.length > 0 && (
                                  <div className="mt-4 pt-4 border-t space-y-3">
                                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                      Submitted Transporter Options
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                      {row.splits.map((split) => (
                                        <div key={split.id} className="bg-zinc-50 dark:bg-zinc-900 border rounded-lg p-3 space-y-1.5 text-xs">
                                          <div className="flex justify-between items-center border-b pb-1 mb-1">
                                            <span className="font-semibold text-blue-700">{split.transporterName}</span>
                                            <Badge variant="outline" className="text-[10px]">{split.status || "Pending Approval"}</Badge>
                                          </div>
                                          <div className="grid grid-cols-2 gap-2">
                                            <div>
                                              <span className="text-zinc-400 font-medium text-[9px] uppercase tracking-wider block">Rate Type</span>
                                              <span className="font-medium">{split.vehicleDetails || "—"}</span>
                                            </div>
                                            <div>
                                              <span className="text-zinc-400 font-medium text-[9px] uppercase tracking-wider block">Rate</span>
                                              <span className="font-bold text-green-700">
                                                {split.rate ? `₹${Number(split.rate).toLocaleString("en-IN")}` : "—"}
                                              </span>
                                            </div>
                                            <div>
                                              <span className="text-zinc-400 font-medium text-[9px] uppercase tracking-wider block">Contact</span>
                                              <span className="font-medium">{split.contactNumber || "—"}</span>
                                            </div>
                                            <div>
                                              <span className="text-zinc-400 font-medium text-[9px] uppercase tracking-wider block">Allocated Qty</span>
                                              <span className="font-medium">{split.allocatedQty ?? 0}</span>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
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
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <span className="text-zinc-500">Loading logistics data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Arrange Logistics</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">Assign a transporter for each product in a PO</p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={refreshing} className="h-9 px-3">
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
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
            <SelectTrigger className="h-9 w-full md:w-[180px]">
              <Building className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Firm" />
            </SelectTrigger>
            <SelectContent>
              {firmOptions.map((firm) => (
                <SelectItem key={firm} value={firm}>{firm === "all" ? "All Firms" : firm}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterParty} onValueChange={setFilterParty}>
            <SelectTrigger className="h-9 w-full md:w-[180px]">
              <User className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Party" />
            </SelectTrigger>
            <SelectContent>
              {partyOptions.map((party) => (
                <SelectItem key={party} value={party}>{party === "all" ? "All Parties" : party}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(searchTerm || filterFirm !== "all" || filterParty !== "all") && (
            <Button variant="ghost" onClick={resetFilters} className="h-9">Reset</Button>
          )}
        </div>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({scopedPending.length})</TabsTrigger>
          <TabsTrigger value="history">History ({scopedHistory.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">
          {renderGroupTable(groupedPending, false)}
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          {renderGroupTable(groupedHistory, true)}
        </TabsContent>
      </Tabs>

      <Sheet open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <SheetContent className="sm:max-w-5xl max-h-[92vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-600" />
              Arrange Logistics — PO {selectedGroup?.poNumber}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Select Products for this Plan
                </span>
                <button
                  type="button"
                  onClick={toggleAllProducts}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase"
                >
                  {selectedProductIds.size === selectedGroup?.rows.length ? "Unselect All" : "Select All"}
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {selectedGroup?.rows.map((row) => (
                  <div
                    key={row.id}
                    className={`p-3 rounded-lg border flex items-center cursor-pointer transition-all ${
                      selectedProductIds.has(row.id)
                        ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200"
                        : "bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 opacity-60"
                    }`}
                    onClick={() => toggleProduct(row.id)}
                  >
                    <div onClick={(e) => e.stopPropagation()} className="flex items-center">
                      <Checkbox
                        checked={selectedProductIds.has(row.id)}
                        onCheckedChange={() => toggleProduct(row.id)}
                        className="mr-3"
                      />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate text-xs" title={row.productName}>{row.productName}</span>
                      <span className="text-[10px] font-bold text-zinc-500">
                        {remainingQty(row)} {row.typeOfMeasurement || "Tons"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-zinc-400 mt-2">
                Total remaining qty selected: <span className="font-semibold">{totalSelectedRemainingQty.toFixed(2)}</span>
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium">Transporter Options</p>
                  <p className="text-xs text-zinc-500">
                    Propose up to {MAX_OPTIONS} possible transporters — final quantity split happens at Logistics Approval.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addOption}>
                  <Plus className="w-4 h-4 mr-1" /> Add Transporter
                </Button>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {transporterOptions.map((opt, idx) => {
                  const isExFactory = opt.transporterName.trim() === EX_FACTORY;
                  return (
                    <div
                      key={idx}
                      className={`border rounded-xl p-4 space-y-3 ${
                        isExFactory ? "border-amber-300 bg-amber-50/30 dark:bg-amber-950/10" : "border-zinc-200 dark:border-zinc-800"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                          Transporter {idx + 1}
                        </span>
                        {transporterOptions.length > 1 && (
                          <Button
                            type="button" size="sm" variant="ghost"
                            onClick={() => removeOption(idx)}
                            className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                          Name / Agency
                        </Label>
                        <Input
                          list={`transporter-suggestions-${idx}`}
                          value={opt.transporterName}
                          onChange={(e) => handleOptionChange(idx, "transporterName", e.target.value)}
                          placeholder='Type name or "Ex Factory Transporter"'
                          className="h-9"
                        />
                        <datalist id={`transporter-suggestions-${idx}`}>
                          {transporterNameOptions.map((name) => <option key={name} value={name} />)}
                          <option value={EX_FACTORY} />
                        </datalist>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                          Contact Number
                        </Label>
                        <Input
                          value={opt.contactNumber}
                          onChange={(e) => handleOptionChange(idx, "contactNumber", e.target.value)}
                          className="h-9"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="block mb-1 text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                            Rate Type
                          </Label>
                          <Select value={opt.rateType} onValueChange={(v) => handleOptionChange(idx, "rateType", v)}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="Type" /></SelectTrigger>
                            <SelectContent>
                              {RATE_TYPES.map((rt) => <SelectItem key={rt} value={rt}>{rt}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="block mb-1 text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                            Rate
                            {!isExFactory && <span className="text-red-500 ml-0.5">*</span>}
                            {isExFactory && <span className="text-amber-500 ml-1 normal-case text-[9px]">(Optional)</span>}
                          </Label>
                          <Input
                            value={opt.rate}
                            onChange={(e) => handleOptionChange(idx, "rate", e.target.value.replace(/[^0-9.]/g, ""))}
                            placeholder={isExFactory ? "Optional" : "0.00"}
                            className="h-9"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isSubmitting}>Cancel</Button>
            {!isReadOnly && (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || selectedProductIds.size === 0 || transporterOptions.every((o) => !o.transporterName.trim())}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
                ) : (
                  <><CheckCircle className="w-4 h-4 mr-2" /> Submit for Approval</>
                )}
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
