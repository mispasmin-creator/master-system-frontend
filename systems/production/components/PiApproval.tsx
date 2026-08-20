"use client";

import React from "react";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth, FIRM_MAP } from "@/systems/production/context/AuthContext";
import {
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ClipboardCheck,
  History,
  Eye,
  Settings,
  ChevronDown,
  ChevronUp,
  TestTube2,
  Search,
} from "lucide-react";
import { format } from "date-fns";
import { productionApi } from "@/systems/production/lib/api";
import { API_URL, getToken } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/systems/production/components/ui/tabs";
import { Button } from "@/systems/production/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/systems/production/components/ui/card";
import { Label } from "@/systems/production/components/ui/label";
import { Textarea } from "@/systems/production/components/ui/textarea";
import { Input } from "@/systems/production/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/systems/production/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetBody,
} from "@/systems/production/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/systems/production/components/ui/popover";
import { Badge } from "@/systems/production/components/ui/badge";
import { Checkbox } from "@/systems/production/components/ui/checkbox";
import { useToast } from "@/systems/production/components/ui/use-toast";
import { Toaster } from "@/systems/production/components/ui/toaster";
import { cn } from "@/systems/production/lib/utils";

// ──────────────── Constants ────────────────
const COSTING_RESPONSE_TABLE = "costing_response";
const PI_APPROVAL_TABLE = "pi_approval";

const EXPECTED_LABELS: { key: string; label: string }[] = [
  { key: "Expected WC %", label: "W/C (%)" },
  { key: "Expected Sticky Flow", label: "Sticky / Flow" },
  { key: "Expected IST", label: "IST (min)" },
  { key: "Expected FST", label: "FST (min)" },
  { key: "Expected BD 110C", label: "BD at 110°C (g/cc)" },
  { key: "Expected BD 1100C", label: "BD at 1100°C (g/cc)" },
  { key: "Expected CCS 110C", label: "CCS at 110°C (kg/cm²)" },
  { key: "Expected CCS 1100C", label: "CCS at 1100°C (kg/cm²)" },
  { key: "Expected PLC 1100C", label: "PLC at 1100°C (%)" },
];

// ──────────────── Types ────────────────
interface LabItem {
  id: string; // ProductionCosting id
  piApprovalId: string; // ProductionPiApproval id, "" if none exists yet
  productionId?: number | string;
  compositionNo: string;
  orderNo: string;
  partyName: string;
  productName: string;
  orderQuantity: number;
  sellingPrice: number;      // ProductionCosting.sellingPrice (spec/reference)
  productRate: number;       // No separate job-card selling price column remains distinct
                              // from the costing spec's sellingPrice - both use the same value now.
  gpPercentage: number;
  gpActual: string;
  manufacturingCost: number;
  alumina: number;
  iron: number;
  bd: number;
  ap: number;
  // lab results
  aluminaActual: string;
  ironActual: string;
  // timestamps
  planned1: string | null;
  actual2: string | null;
  // approval
  piApprovalStatus: string;
  piRemarks: string;
  piApprovedAt: string | null;
  firmName: string;
  // expected values
  expectedValues: Record<string, string>;
  // composition
  rmValues: { rm: string; qty: number; cost: number; al: number; fe: number; bd: number; ap: number }[];
}

const PENDING_COLUMNS_META = [
  { header: "Action", dataKey: "actionColumn", alwaysVisible: true, toggleable: false },
  { header: "ID", dataKey: "productionId", toggleable: true },
  { header: "Composition No.", dataKey: "compositionNo", toggleable: true },
  { header: "Order No.", dataKey: "orderNo", toggleable: true },
  { header: "Party Name", dataKey: "partyName", toggleable: true },
  { header: "Product Name", dataKey: "productName", toggleable: true },
  { header: "Qty", dataKey: "orderQuantity", toggleable: true },
  { header: "Lab Status", dataKey: "labStatus", toggleable: true },
  { header: "Lab Date", dataKey: "actual2", toggleable: true },
  { header: "Alumina % (Lab)", dataKey: "aluminaActual", toggleable: true },
  { header: "Iron % (Lab)", dataKey: "ironActual", toggleable: true },
  { header: "GP% Actual", dataKey: "gpActual", toggleable: true },
];

const HISTORY_COLUMNS_META = [
  { header: "Action", dataKey: "actionColumn", alwaysVisible: true, toggleable: false },
  { header: "ID", dataKey: "productionId", toggleable: true },
  { header: "Decision", dataKey: "piApprovalStatus", toggleable: true },
  { header: "Composition No.", dataKey: "compositionNo", toggleable: true },
  { header: "Order No.", dataKey: "orderNo", toggleable: true },
  { header: "Party Name", dataKey: "partyName", toggleable: true },
  { header: "Product Name", dataKey: "productName", toggleable: true },
  { header: "Qty", dataKey: "orderQuantity", toggleable: true },
  { header: "Lab Date", dataKey: "actual2", toggleable: true },
  { header: "Approved At", dataKey: "piApprovedAt", toggleable: true },
  { header: "PI Remarks", dataKey: "piRemarks", toggleable: true },
];

// ──────────────── Page ────────────────
export default function PIApprovalPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [pendingItems, setPendingItems] = useState<LabItem[]>([]);
  const [historyItems, setHistoryItems] = useState<LabItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPending = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return pendingItems;
    return pendingItems.filter(item =>
      (item.compositionNo || "").toLowerCase().includes(q) ||
      (item.orderNo || "").toLowerCase().includes(q) ||
      (item.partyName || "").toLowerCase().includes(q) ||
      (item.productName || "").toLowerCase().includes(q)
    );
  }, [pendingItems, searchQuery]);

  const filteredHistory = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return historyItems;
    return historyItems.filter(item =>
      (item.compositionNo || "").toLowerCase().includes(q) ||
      (item.orderNo || "").toLowerCase().includes(q) ||
      (item.partyName || "").toLowerCase().includes(q) ||
      (item.productName || "").toLowerCase().includes(q) ||
      (item.piApprovalStatus || "").toLowerCase().includes(q)
    );
  }, [historyItems, searchQuery]);

  // Approval dialog (also captures lab results)
  const [selectedItem, setSelectedItem] = useState<LabItem | null>(null);
  const [actionMode, setActionMode] = useState<"review" | "view" | null>(null);
  const [remarks, setRemarks] = useState("");
  const [remarksError, setRemarksError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // New manual calculation fields
  const [manualMfgCost, setManualMfgCost] = useState<number | "">(0);
  const [totalCost, setTotalCost] = useState<number>(0);
  const [manualGP, setManualGP] = useState<number | "">(0);
  const [totalProfit, setTotalProfit] = useState<number>(0);

  // Column visibility
  const [visiblePendingColumns, setVisiblePendingColumns] = useState<Record<string, boolean>>(
    PENDING_COLUMNS_META.reduce((acc, col) => ({ ...acc, [col.dataKey]: true }), {})
  );
  const [visibleHistoryColumns, setVisibleHistoryColumns] = useState<Record<string, boolean>>(
    HISTORY_COLUMNS_META.reduce((acc, col) => ({ ...acc, [col.dataKey]: true }), {})
  );

  // ── Data Loading ──
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // ProductionKyc has no firmName field, so no firm-matching is done against it -
      // it's only used here for per-material Alumina/Iron/BD/AP composition lookups.
      const { data: kycData, error: kycErr } = await productionApi.get('kyc');
      if (kycErr) throw kycErr;
      const kycMap = new Map<string, any>();
      (kycData || []).forEach((k: any) => {
        kycMap.set(String(k.productName || "").trim().toLowerCase(), k);
      });

      // /production/costing now returns ProductionCosting rows with `order`
      // (ProductionOrder), `materials` and `piApproval` already joined in - no more
      // manual cross-table string matching against a separate "production" sheet.
      const { data, error: dbErr } = await productionApi.get(COSTING_RESPONSE_TABLE);
      if (dbErr) throw dbErr;

      const mapped: LabItem[] = (data || []).map((costing: any) => {
        const rmValues: LabItem["rmValues"] = (costing.materials || []).map((m: any) => {
          const kycInfo = kycMap.get(String(m.materialName || "").trim().toLowerCase());
          return {
            rm: String(m.materialName || ""),
            qty: Number(m.quantity || 0),
            // ProductionCostingMaterial only has {materialName, quantity, sequence} - no
            // per-material cost column exists any more (cost is only tracked in
            // aggregate on ProductionCosting.variableCost), so this is left at 0.
            cost: 0,
            al: kycInfo ? Number(kycInfo.alumina || 0) : 0,
            fe: kycInfo ? Number(kycInfo.iron || 0) : 0,
            bd: kycInfo ? Number(kycInfo.bd || 0) : 0,
            ap: kycInfo ? Number(kycInfo.ap || 0) : 0,
          };
        });

        // EXPECTED_LABELS (Expected WC%, Sticky/Flow, IST/FST, BD/CCS/PLC at various
        // temps) have no matching columns on ProductionCosting - no backend home, so
        // they stay blank. The "Expected Values Table" section hides itself when empty.
        const expectedValues: Record<string, string> = {};
        EXPECTED_LABELS.forEach(({ key }) => { expectedValues[key] = ""; });

        const order = costing.order || {};
        const piApproval = costing.piApproval || null;

        return {
          id: costing.id,
          piApprovalId: piApproval?.id || "",
          productionId: order.id || "",
          compositionNo: costing.compositionNo || "",
          orderNo: order.deliveryOrderNo || "",
          partyName: order.partyName || "",
          productName: order.productName || "",
          orderQuantity: Number(order.orderQuantity || 0),
          sellingPrice: Number(costing.sellingPrice || 0),
          productRate: Number(costing.sellingPrice || 0),
          gpPercentage: Number(costing.gpPercent || 0),
          // Kept falsy ("") rather than "-" when absent: `openAction` below does
          // `item.gpActual ? Number(item.gpActual) : (calculate from rate/cost)`, and a
          // literal "-" would parse as NaN instead of falling through to the calculation.
          gpActual: costing.gpPercent != null ? String(costing.gpPercent) : "",
          manufacturingCost: Number(costing.manufacturingCost || 0),
          alumina: Number(costing.aluminaPercent || 0),
          iron: Number(costing.ironPercent || 0),
          // ProductionCosting has no bd/ap spec columns any more.
          bd: 0,
          ap: 0,
          // No distinct "lab-actual" alumina/iron columns exist separately from the
          // spec values above any more - lab results live on ProductionQcCheckpoint
          // (per job card), which isn't joined into /costing, so left blank here.
          aluminaActual: "-",
          ironActual: "-",
          // "Planned 1"/"Actual 2" (lab planned/completed dates) no longer exist on
          // ProductionCosting - that timing now lives on ProductionQcCheckpoint.
          planned1: null,
          actual2: null,
          piApprovalStatus: piApproval?.status || "",
          piRemarks: piApproval?.remarks || "",
          piApprovedAt: piApproval?.approvedAt
            ? format(new Date(piApproval.approvedAt), "dd/MM/yy HH:mm")
            : (piApproval?.updatedAt ? format(new Date(piApproval.updatedAt), "dd/MM/yy HH:mm") : null),
          expectedValues,
          rmValues,
          firmName: order.firmName || "",
        };
      });

      const userFirms = user?.firm ? user.firm.split(',').map((f: string) => f.trim()).filter(Boolean) : [];
      const roleLower = String(user?.role || "").toLowerCase();
      const isAdmin = !user?.role || roleLower === "admin" || roleLower === "super admin" || roleLower === "superadmin";
      const filtered = mapped.filter((r) => {
        if (isAdmin) return true;
        if (userFirms.length === 0) return true;
        if (!r.firmName) return true;
        const fName = r.firmName.toLowerCase();
        return userFirms.some((uf: string) => {
          const firmSearch = uf.toLowerCase();
          const mappedFirmLower = (FIRM_MAP[uf] || uf).toLowerCase();
          return fName.includes(firmSearch) || fName.includes(mappedFirmLower) || firmSearch.includes(fName) || mappedFirmLower.includes(fName);
        });
      });

      // Pending = no PI decision yet; History = has a PI decision
      setPendingItems(filtered.filter((i) => !i.piApprovalStatus));
      setHistoryItems(filtered.filter((i) => !!i.piApprovalStatus));
    } catch (err: any) {
      setError(`Failed to load data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [user?.firm, user?.role]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Approval Actions ──
  const openAction = (item: LabItem, mode: "review" | "view") => {
    setSelectedItem(item);
    setActionMode(mode);
    setRemarks("");
    setRemarksError("");

    const totalRmCost = item.rmValues.reduce((sum, rm) => sum + rm.cost, 0);
    // Use product_rate (selling price from production/job card) for profit calculation
    const rate = item.productRate || item.sellingPrice;
    const mfgCost = item.manufacturingCost || 0;
    setManualMfgCost(mfgCost);
    const newTotalCost = totalRmCost + mfgCost;
    setTotalCost(newTotalCost);
    // profit = selling_price - (total_cost + manufacturing_cost)
    const profit = rate - newTotalCost;
    setTotalProfit(profit);
    const initialGP = item.gpActual ? Number(item.gpActual) : (rate > 0 ? (profit / rate) * 100 : 0);
    setManualGP(Number(initialGP.toFixed(2)));
  };

  // ── Calculation Logic ──
  // profit = product_rate - (total_cost + manufacturing_cost)
  const handleMfgCostChange = (inputVal: string) => {
    if (inputVal === "") {
      setManualMfgCost("");
      if (selectedItem) {
        const rate = selectedItem.productRate || selectedItem.sellingPrice;
        const totalRmCost = selectedItem.rmValues.reduce((sum, rm) => sum + rm.cost, 0);
        setTotalCost(totalRmCost);
        const profit = rate - totalRmCost;
        setTotalProfit(profit);
        const calculatedGP = rate > 0 ? (profit / rate) * 100 : 0;
        setManualGP(Number(calculatedGP.toFixed(2)));
      }
      return;
    }

    const val = Math.max(0, Number(inputVal));
    setManualMfgCost(val);
    if (selectedItem) {
      const rate = selectedItem.productRate || selectedItem.sellingPrice;
      const totalRmCost = selectedItem.rmValues.reduce((sum, rm) => sum + rm.cost, 0);
      const newTotalCost = totalRmCost + val;
      setTotalCost(newTotalCost);
      const profit = rate - newTotalCost;
      setTotalProfit(profit);
      const calculatedGP = rate > 0 ? (profit / rate) * 100 : 0;
      setManualGP(Number(calculatedGP.toFixed(2)));
    }
  };

  const handleGPChange = (inputVal: string) => {
    if (inputVal === "") {
      setManualGP("");
      // When GP is cleared, we could either reset Mfg Cost or just leave it.
      // Keeping existing logic of calculating from the value.
      return;
    }

    const val = Math.max(0, Number(inputVal));
    setManualGP(val);
    if (selectedItem) {
      const rate = selectedItem.productRate || selectedItem.sellingPrice;
      const profit = rate * (val / 100);
      setTotalProfit(profit);
      const calculatedTotalCost = rate - profit;
      setTotalCost(Number(calculatedTotalCost.toFixed(2)));
      const totalRmCost = selectedItem.rmValues.reduce((sum, rm) => sum + rm.cost, 0);
      const calculatedMfgCost = calculatedTotalCost - totalRmCost;
      setManualMfgCost(Number(calculatedMfgCost.toFixed(2)));
    }
  };

  const handleSubmitDecision = async (decision: "Rejected" | "Finalize" | "SampleTest") => {
    if (!selectedItem) return;
    const defaultRemark =
      decision === "Rejected"
        ? "Rejected by PI"
        : decision === "Finalize"
        ? "Final Approved by PI"
        : "Sent to Sample Test by PI";
    const finalRemarks = remarks.trim() || defaultRemark;
    setIsSubmitting(true);
    try {
      const costingStatus =
        decision === "Finalize"
          ? "Final Approved"
          : decision === "SampleTest"
          ? "Sample Test Pending"
          : "Rejected";

      const costingUpdate: Record<string, any> = {
        status: costingStatus,
      };
      if (decision !== "Rejected") {
        costingUpdate.gpPercent = typeof manualGP === 'number' ? Number(manualGP.toFixed(2)) : null;
        costingUpdate.manufacturingCost = typeof manualMfgCost === 'number' ? Number(manualMfgCost.toFixed(2)) : null;
      }
      const { error: costingErr } = await productionApi.patch(COSTING_RESPONSE_TABLE, selectedItem.id, costingUpdate);
      if (costingErr) throw costingErr;

      const piApprovalPayload = {
        costingId: selectedItem.id,
        status: decision === "Finalize" ? "Final Approved" : decision === "SampleTest" ? "Approved" : "Rejected",
        remarks: finalRemarks,
        approvedAt: new Date().toISOString(),
      };

      if (selectedItem.piApprovalId) {
        const { error: patchErr } = await productionApi.patch(PI_APPROVAL_TABLE, selectedItem.piApprovalId, piApprovalPayload);
        if (patchErr) throw patchErr;
      } else {
        const { error: postErr } = await productionApi.post(PI_APPROVAL_TABLE, piApprovalPayload);
        if (postErr) throw postErr;
      }

      // If sending to sample test, create or ensure a sample test record exists
      if (decision === "SampleTest") {
        try {
          await productionApi.post("sample_test", {
            costingId: String(selectedItem.id),
            status: "Pending",
          });
        } catch (sampleErr: any) {
          console.log("Sample test record creation info:", sampleErr?.message);
        }
      }

      if (decision === "Rejected") {
        toast({
          title: "🔴 Rejected",
          description: `Composition for order “${selectedItem.orderNo}” marked as rejected.`,
        });
      } else if (decision === "Finalize") {
        toast({
          title: "✅ Final Approved",
          description: "Item finalized and moved directly to Job Cards.",
        });
      } else {
        toast({
          title: "🧪 Sent to Sample Test",
          description: "Item approved and moved to Sample Test.",
        });
      }

      setActionMode(null);
      setSelectedItem(null);
      await loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Column toggling helpers ──
  const handleToggleColumn = (tab: string, dataKey: string, checked: boolean) => {
    const setter = tab === "pending" ? setVisiblePendingColumns : setVisibleHistoryColumns;
    setter((prev) => ({ ...prev, [dataKey]: checked }));
  };

  const handleSelectAllColumns = (tab: string, columnsMeta: typeof PENDING_COLUMNS_META, checked: boolean) => {
    const nv: Record<string, boolean> = {};
    columnsMeta.forEach((col) => { if (col.toggleable) nv[col.dataKey] = checked; });
    const setter = tab === "pending" ? setVisiblePendingColumns : setVisibleHistoryColumns;
    setter((prev) => ({ ...prev, ...nv }));
  };

  const visiblePendingColumnsMeta = useMemo(
    () => PENDING_COLUMNS_META.filter((col) => visiblePendingColumns[col.dataKey]),
    [visiblePendingColumns]
  );
  const visibleHistoryColumnsMeta = useMemo(
    () => HISTORY_COLUMNS_META.filter((col) => visibleHistoryColumns[col.dataKey]),
    [visibleHistoryColumns]
  );

  // ── ColumnToggler component ──
  const ColumnToggler = ({ tab, columnsMeta }: { tab: string; columnsMeta: typeof PENDING_COLUMNS_META }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs bg-transparent ml-auto">
          <Settings className="mr-1.5 h-3.5 w-3.5" /> View Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-3">
        <div className="grid gap-2">
          <p className="text-sm font-medium">Toggle Columns</p>
          <div className="flex items-center justify-between mt-1 mb-2">
            <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => handleSelectAllColumns(tab, columnsMeta, true)}>Select All</Button>
            <span className="text-gray-300 mx-1">|</span>
            <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => handleSelectAllColumns(tab, columnsMeta, false)}>Deselect All</Button>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {columnsMeta.filter((col) => col.toggleable).map((col) => (
              <div key={`toggle-${tab}-${col.dataKey}`} className="flex items-center space-x-2">
                <Checkbox
                  id={`toggle-${tab}-${col.dataKey}`}
                  checked={tab === "pending" ? !!visiblePendingColumns[col.dataKey] : !!visibleHistoryColumns[col.dataKey]}
                  onCheckedChange={(checked) => handleToggleColumn(tab, col.dataKey, Boolean(checked))}
                />
                <Label htmlFor={`toggle-${tab}-${col.dataKey}`} className="text-xs font-normal cursor-pointer">{col.header}</Label>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );

  // ── StatusBadge ──
  const StatusBadge = ({ status }: { status: string }) => {
    if (status === "Approved") return <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">✅ Approved</Badge>;
    if (status === "Rejected") return <Badge className="bg-red-100 text-red-700 border border-red-200">🔴 Rejected</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

  // ── Loading / Error ──
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-olive-600" />
        <p className="text-lg text-gray-600">Loading Approval Queue…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600 bg-red-50 rounded-md">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
        <p className="text-lg font-semibold">Error Loading Data</p>
        <p className="text-sm mb-4">{error}</p>
        <Button onClick={loadData}>Retry</Button>
      </div>
    );
  }

  // ── Render ──
  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen max-w-full overflow-x-hidden">
      <Toaster />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-olive-600" />
            PI Approval
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Review lab-tested compositions and approve or reject for next stage.</p>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-4 sm:p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <TabsList className="grid w-full sm:w-[400px] grid-cols-2 p-1 bg-slate-100 rounded-xl mb-0">
                <TabsTrigger value="pending" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-olive-700 data-[state=active]:shadow-sm transition-all">
                  <ClipboardCheck className="h-4 w-4 mr-2" /> Pending Approval
                  <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-xs">
                    {filteredPending.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="history" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-olive-700 data-[state=active]:shadow-sm transition-all">
                  <History className="h-4 w-4 mr-2" /> Decision History
                  <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-xs">
                    {filteredHistory.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
              <div className="relative w-full sm:w-[300px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search approvals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 focus-visible:ring-olive-500"
                />
              </div>
            </div>

            {/* ── PENDING TAB ──────────────────────────────── */}
            <TabsContent value="pending">
              <Card className="shadow-sm border border-border">
                <CardHeader className="py-3 px-4 bg-olive-50/70 rounded-t-lg">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-md font-semibold flex items-center gap-2">
                      <ClipboardCheck className="h-5 w-5 text-olive-600" />
                      Awaiting Approval ({filteredPending.length})
                    </CardTitle>
                    <ColumnToggler tab="pending" columnsMeta={PENDING_COLUMNS_META} />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          {visiblePendingColumnsMeta.map((col) => (
                            <TableHead key={col.dataKey} className="whitespace-nowrap">{col.header}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPending.length > 0 ? (
                          filteredPending.map((item) => (
                            <TableRow key={item.id} className="hover:bg-olive-50/40">
                              {visiblePendingColumnsMeta.map((col) => (
                                <TableCell key={col.dataKey} className="whitespace-nowrap text-sm py-2 px-3">
                                  {col.dataKey === "actionColumn" ? (
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        className="bg-olive-600 hover:bg-olive-700 text-white h-8"
                                        onClick={() => openAction(item, "review")}
                                      >
                                        <Settings className="h-3.5 w-3.5 mr-1" /> Review & Action
                                      </Button>
                                    </div>
                                  ) : col.dataKey === "labStatus" ? (
                                    item.actual2
                                      ? <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700 font-medium">✅ Lab Done</span>
                                      : <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 font-medium">⏳ Pending Lab</span>
                                  ) : (
                                    String(item[col.dataKey as keyof LabItem] ?? "-")
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={visiblePendingColumnsMeta.length} className="h-48">
                              <div className="flex flex-col items-center justify-center text-center border-2 border-dashed border-indigo-200/50 bg-indigo-50/50 rounded-lg mx-4 my-4">
                                <CheckCircle2 className="h-12 w-12 text-indigo-300 mb-3" />
                                <p className="font-medium text-foreground">No Pending Approvals</p>
                                <p className="text-sm text-muted-foreground">All lab-tested items have been reviewed.</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── HISTORY TAB ──────────────────────────────── */}
            <TabsContent value="history">
              <Card className="shadow-sm border border-border">
                <CardHeader className="py-3 px-4 bg-olive-50/70 rounded-t-lg">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-md font-semibold flex items-center gap-2">
                      <History className="h-5 w-5 text-olive-600" />
                      Decision History ({filteredHistory.length})
                    </CardTitle>
                    <ColumnToggler tab="history" columnsMeta={HISTORY_COLUMNS_META} />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          {visibleHistoryColumnsMeta.map((col) => (
                            <TableHead key={col.dataKey} className="whitespace-nowrap">{col.header}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredHistory.length > 0 ? (
                          filteredHistory.map((item) => (
                            <TableRow key={item.id} className="hover:bg-slate-50/50">
                              {visibleHistoryColumnsMeta.map((col) => (
                                <TableCell key={col.dataKey} className="whitespace-nowrap text-sm py-2 px-3">
                                  {col.dataKey === "actionColumn" ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 border-slate-300 text-slate-700 hover:bg-slate-50"
                                      onClick={() => openAction(item, "view")}
                                    >
                                      <Eye className="h-3.5 w-3.5 mr-1" /> View
                                    </Button>
                                  ) : col.dataKey === "piApprovalStatus" ? (
                                    <StatusBadge status={item.piApprovalStatus} />
                                  ) : (
                                    String(item[col.dataKey as keyof LabItem] ?? "-")
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={visibleHistoryColumnsMeta.length} className="h-48">
                              <div className="flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200/50 bg-slate-50/50 rounded-lg mx-4 my-4">
                                <History className="h-12 w-12 text-slate-300 mb-3" />
                                <p className="font-medium text-foreground">No Decision History Yet</p>
                                <p className="text-sm text-muted-foreground">Approved / rejected items will appear here.</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ── ACTION / VIEW SHEET ─────────────────────── */}
      <Sheet open={!!actionMode} onOpenChange={() => { setActionMode(null); setSelectedItem(null); }}>

        <SheetContent>
          <SheetHeader>
            <SheetTitle className={cn("flex items-center gap-2 text-lg", {
              "text-olive-700": actionMode === "review" || actionMode === "view",
            })}>
              {actionMode === "review" && <><Settings className="h-5 w-5" /> Review Composition</>}
              {actionMode === "view" && <><Eye className="h-5 w-5" /> Composition Details</>}
            </SheetTitle>
            <SheetDescription>
              {actionMode === "review" && "Review the technical details below. You can adjust the manufacturing cost and GP% before approving or rejecting."}
              {actionMode === "view" && "Full details for the selected lab-tested composition."}
            </SheetDescription>
          </SheetHeader>

          {selectedItem && (
            <div className="flex flex-col flex-1 min-h-0">
              <SheetBody className="space-y-5 pt-2">

              {/* ── Basic Info ── */}
              <Section title="Basic Information">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Composition No.", value: selectedItem.compositionNo },
                    { label: "Order No.", value: selectedItem.orderNo },
                    { label: "Party Name", value: selectedItem.partyName },
                    { label: "Product Name", value: selectedItem.productName },
                    { label: "Qty", value: selectedItem.orderQuantity ? selectedItem.orderQuantity.toLocaleString("en-IN") : "—" },
                    { label: "Planned Date", value: selectedItem.planned1 },
                  ].map(({ label, value }) => (
                    <InfoCard key={label} label={label} value={value} />
                  ))}
                </div>
              </Section>


              {/* ── Rate / Costing ── */}
              <Section title="Rate">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: "Selling Price (Job Card)", value: selectedItem.productRate ? `₹${selectedItem.productRate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—" },
                    { label: "Selling Price (Costing Spec)", value: String(selectedItem.sellingPrice || "-") },
                    { label: "GP %AGE (Expected)", value: String(selectedItem.gpPercentage || "-") },
                    { label: "Alumina (Spec)", value: String(selectedItem.alumina || "-") },
                    { label: "Iron (Spec)", value: String(selectedItem.iron || "-") },
                    { label: "BD (Spec)", value: String(selectedItem.bd || "-") },
                    { label: "AP (Spec)", value: String(selectedItem.ap || "-") },
                  ].map(({ label, value }) => (
                    <InfoCard key={label} label={label} value={value} accent="amber" />
                  ))}
                </div>
              </Section>


              {/* ── Composition & Costing (Sketch Redesign) ── */}
              <Section title="Composition & Costing">
                <div className="space-y-4">
                  <div className="border rounded-lg overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="font-bold text-slate-700">Material</TableHead>
                          <TableHead className="font-bold text-slate-700 text-right">Qty (%)</TableHead>
                          <TableHead className="font-bold text-slate-700 text-right">AL (Calc)</TableHead>
                          <TableHead className="font-bold text-slate-700 text-right">FE (Calc)</TableHead>
                          <TableHead className="font-bold text-slate-700 text-right">BD (Calc)</TableHead>
                          <TableHead className="font-bold text-slate-700 text-right">AP (Calc)</TableHead>
                          <TableHead className="font-bold text-slate-700 text-right">Cost (₹)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedItem.rmValues.length > 0 ? (
                          selectedItem.rmValues.map((pair, idx) => (
                            <TableRow key={idx} className="hover:bg-slate-50/50 h-10">
                              <TableCell className="py-2 font-medium text-slate-600 text-xs">{pair.rm}</TableCell>
                              <TableCell className="py-2 text-right text-xs">{pair.qty}%</TableCell>
                              <TableCell className="py-2 text-right text-xs">{((pair.al * pair.qty) / 100).toFixed(2)}</TableCell>
                              <TableCell className="py-2 text-right text-xs">{((pair.fe * pair.qty) / 100).toFixed(2)}</TableCell>
                              <TableCell className="py-2 text-right text-xs">{((pair.bd * pair.qty) / 100).toFixed(2)}</TableCell>
                              <TableCell className="py-2 text-right text-xs">{((pair.ap * pair.qty) / 100).toFixed(2)}</TableCell>
                              <TableCell className="py-2 text-right font-semibold text-slate-900 text-xs">
                                {pair.cost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center text-slate-400 italic py-4">No composition data</TableCell>
                          </TableRow>
                        )}
                        <TableRow className="bg-slate-50/50 font-bold border-t border-slate-200">
                          <TableCell colSpan={1} className="text-slate-700 text-xs py-1 px-3">Total Composition %</TableCell>
                          <TableCell className="text-right text-slate-700 text-xs py-1 px-3">
                            {selectedItem.rmValues.reduce((sum, rm) => sum + rm.qty, 0).toFixed(2)}%
                          </TableCell>
                          <TableCell colSpan={5} />
                        </TableRow>
                        <TableRow className="bg-indigo-50/50 font-bold border-t-2 border-indigo-100">
                          <TableCell colSpan={6} className="text-indigo-800 py-2 px-3">Total RM Cost</TableCell>
                          <TableCell className="text-right text-indigo-800 py-2 px-3">
                            ₹{selectedItem.rmValues.reduce((sum, rm) => sum + rm.cost, 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-inner">
                    <div className="md:col-span-3 space-y-5">
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-600 flex justify-between">
                          Manufacturing Cost 
                          <span className="text-[10px] text-slate-400 font-normal uppercase mt-1">
                            {actionMode === "review" ? "(Editable)" : ""}
                          </span>
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">₹</span>
                          <Input 
                            type="number"
                            step="0.01"
                            min="0"
                            value={manualMfgCost}
                            onChange={(e) => handleMfgCostChange(e.target.value)}
                            onBlur={(e) => {
                              const val = e.target.value;
                              if (val !== "") setManualMfgCost(Math.max(0, Number(Number(val).toFixed(2))));
                            }}
                            disabled={actionMode === "view"}
                            className="pl-9 h-12 text-xl font-bold bg-white border-slate-300 focus:ring-indigo-500 shadow-sm disabled:opacity-80 disabled:bg-slate-100 disabled:text-slate-600"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-600 flex justify-between">
                          GP % 
                          <span className="text-[10px] text-slate-400 font-normal uppercase mt-1">
                            {actionMode === "review" ? "(Editable)" : ""}
                          </span>
                        </Label>
                        <div className="relative">
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">%</span>
                          <Input 
                            type="number"
                            step="0.01"
                            min="0"
                            value={manualGP}
                            onChange={(e) => handleGPChange(e.target.value)}
                            onBlur={(e) => {
                              const val = e.target.value;
                              if (val !== "") setManualGP(Math.max(0, Number(Number(val).toFixed(2))));
                            }}
                            disabled={actionMode === "view"}
                            className="pr-9 h-12 text-xl font-bold bg-white border-slate-300 focus:ring-indigo-500 shadow-sm disabled:opacity-80 disabled:bg-slate-100 disabled:text-slate-600"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2 flex flex-col justify-center items-center md:items-end space-y-3 border-l border-slate-200 md:pl-8">
                      <div className="text-center md:text-right">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Selling Price (Job Card)</p>
                        <p className="text-xl font-black text-slate-900">
                          ₹{(selectedItem.productRate || selectedItem.sellingPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="text-center md:text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Cost (RM + Mfg)</p>
                        <p className="text-lg font-bold text-slate-700">
                          ₹{totalCost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="w-full h-px bg-slate-200 my-1" />
                      <div className="text-center md:text-right">
                        <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Total Profit</p>
                        <p className={cn("text-2xl font-black transition-colors", totalProfit >= 0 ? "text-emerald-600" : "text-red-600")}>
                          ₹{totalProfit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">= Selling Price − (RM Cost + Mfg Cost)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Section>

              {/* ── Expected Values (Moved to Bottom) ── */}
              {EXPECTED_LABELS.some(({ key }) => selectedItem.expectedValues[key]) && (
                <Section title="Expected Values Table">
                  <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="font-bold text-slate-700">Parameter</TableHead>
                          <TableHead className="font-bold text-slate-700">Expected Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {EXPECTED_LABELS.map(({ key, label }) => (
                          <TableRow key={key} className="hover:bg-slate-50/30 h-10">
                            <TableCell className="text-sm font-medium text-slate-600 py-2">{label}</TableCell>
                            <TableCell className="text-sm text-slate-900 py-2 font-semibold">
                              {selectedItem.expectedValues[key] || <span className="text-slate-400 font-normal italic">—</span>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Section>
              )}

              {/* ── History PI decision ── */}
              {selectedItem.piApprovalStatus && (
                <Section title="Previous PI Decision">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <InfoCard label="Decision" value={selectedItem.piApprovalStatus} />
                    <InfoCard label="Approved At" value={selectedItem.piApprovedAt} />
                    <InfoCard label="PI Remarks" value={selectedItem.piRemarks} />
                  </div>
                </Section>
              )}



              {/* ── Remarks field for Review ── */}
              {actionMode === "review" && (
                <div className="rounded-xl p-4 border bg-indigo-50 border-indigo-100">
                  <Label htmlFor="pi-remarks" className="font-semibold text-sm mb-2 block text-indigo-800">
                    Remarks <span className="text-red-500">*</span>
                    <span className="font-normal text-xs ml-1 opacity-70">(mandatory for both approve & reject)</span>
                  </Label>
                  <Textarea
                    id="pi-remarks"
                    value={remarks}
                    onChange={(e) => { setRemarks(e.target.value); if (e.target.value.trim()) setRemarksError(""); }}
                    placeholder="Enter remarks here…"
                    rows={3}
                    className={cn("bg-white", { "border-red-400": !!remarksError })}
                  />
                  {remarksError && <p className="text-xs text-red-600 mt-1">{remarksError}</p>}
                </div>
              )}
              </SheetBody>
            </div>
          )}

          <SheetFooter className="pt-4 border-t gap-2 mt-auto flex-wrap sm:flex-nowrap">
            <Button variant="outline" onClick={() => { setActionMode(null); setSelectedItem(null); }} disabled={isSubmitting}>
              Cancel
            </Button>
            {actionMode === "review" && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => handleSubmitDecision("Rejected")}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <XCircle className="h-4 w-4 mr-1.5" />}
                  Reject
                </Button>
                <Button
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => handleSubmitDecision("SampleTest")}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <TestTube2 className="h-4 w-4 mr-1.5" />}
                  Send to Sample Test
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleSubmitDecision("Finalize")}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
                  Finalize (Move to Job Cards)
                </Button>
              </>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ──────────────── Helper Components ────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1">{title}</h3>
      {children}
    </div>
  );
}

function InfoCard({ label, value, accent }: { label: string; value?: string | null; accent?: "blue" | "amber" }) {
  const bg = accent === "blue" ? "bg-blue-50 border-blue-100" : accent === "amber" ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-100";
  return (
    <div className={cn("rounded-lg p-3 border", bg)}>
      <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-800">{value || "—"}</p>
    </div>
  );
}
