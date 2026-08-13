"use client"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem } from "@/systems/production/components/ui/dropdown-menu";
;

import type React from "react";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Loader2,
  AlertTriangle,
  CheckCircle,
  Settings,
  Plus,
  X,
  Eye,
  Edit,
  Zap,
  ChevronsUpDown,
  Calculator,
  RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import { productionApi } from "@/systems/production/lib/api";
import { API_URL, getToken } from "@/lib/auth";
import { useAuth, FIRM_MAP } from "@/systems/production/context/AuthContext";
import { cn } from "@/systems/production/lib/utils"; 
import { Toaster } from "@/systems/production/components/ui/toaster";
import { useToast } from "@/systems/production/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/systems/production/components/ui/tabs";
import { Button } from "@/systems/production/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/systems/production/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/systems/production/components/ui/table";
import { Checkbox } from "@/systems/production/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetBody
} from "@/systems/production/components/ui/sheet";
import { Label } from "@/systems/production/components/ui/label";
import { Input } from "@/systems/production/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/systems/production/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/systems/production/components/ui/popover";
import { Badge } from "@/systems/production/components/ui/badge";

// --- Type Definitions ---
interface ProductionItem {
  id: number;
  productionId?: number | string;
  timestamp: string;
  firmName: string;
  deliveryOrderNo: string;
  partyName: string;
  productName: string;
  orderQuantity: number;
  expectedDeliveryDate: string;
  priority: string;
  note: string;
  plannedDate?: string;
  status: string;
  crmName?: string;
  quantityDelivered?: string;
  productionPending?: string;
  productRate?: string;
  uploadSo?: string;
}

interface KycProduct {
  id: number; // Added id
  productName: string;
  alumina: number;
  iron: number;
  bd: number;
  ap: number;
  price: number; // Added price
  firmName: string; // Added firm name
}

interface KittingFormRow {
  id: number;
  productName: string;
  percentage: string;
  baseAlumina: number;
  baseIron: number;
  baseBd: number;
  baseAp: number;
  basePrice: number; // Added base price
  al: number;
  fe: number;
  bd: number;
  ap: number;
  cost: number; // Added calculated cost
}

// Expected Values table — one row per property (single product at a time)
interface ExpectedValueRow {
  property: string;
  unit: string;
  value: string; // expected value for the selected product
}

interface CostingHistoryItem {
  id: number;
  productionId?: number | string;
  timestamp: string;
  compositionNo: string;
  orderNo: string;
  productName: string;
  alumina: number;
  iron: number;
  gp: number | null;
  bd: number;
  ap: number;
  rawMaterials: string[]; // RM1..RM20
  rawMaterialQtys: string[]; // QTY1..QTY20
  rawMaterialCosts: number[]; // COST1..COST20
  plannedDate?: string;
  expectedDeliveryDate?: string;
  priority?: string;
  status?: string;
  firmName: string;
  partyName?: string;
  orderQuantity?: number;
  note?: string;
  productRate?: string;
  uploadSo?: string;
  crmName?: string;
  quantityDelivered?: string;
  productionPending?: string;
  manufacturingCost?: number;
}

// --- Constants ---
const PRODUCTION_TABLE = "production";
const KYC_TABLE = "kyc";
const COSTING_RESPONSE_TABLE = "costing_response";
const FULL_KITTING_TABLE = "full_kitting";

const DEFAULT_EXPECTED_PROPERTIES: ExpectedValueRow[] = [
  { property: "W/C (%)", unit: "%", value: "" },
  { property: "Sticky / Flow", unit: "", value: "" },
  { property: "IST (min)", unit: "min", value: "" },
  { property: "FST (min)", unit: "min", value: "" },
  { property: "BD at 110°C (g/cc)", unit: "g/cc", value: "" },
  { property: "BD at 1100°C (g/cc)", unit: "g/cc", value: "" },
  { property: "CCS at 110°C (kg/cm²)", unit: "kg/cm²", value: "" },
  { property: "CCS at 1100°C (kg/cm²)", unit: "kg/cm²", value: "" },
  { property: "PLC at 1100°C (%)", unit: "%", value: "" },
];

const PENDING_COLUMNS_META = [
  {
    header: "Action",
    dataKey: "actionColumn",
    alwaysVisible: true,
    toggleable: false,
  },
  { header: "Timestamp", dataKey: "timestamp", toggleable: true },
  { header: "ID", dataKey: "productionId", toggleable: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
  {
    header: "Delivery Order No.",
    dataKey: "deliveryOrderNo",
    toggleable: true,
  },
  { header: "Party Name", dataKey: "partyName", toggleable: true },
  { header: "Product Name", dataKey: "productName", toggleable: true },
  { header: "Order Qty", dataKey: "orderQuantity", toggleable: true },
  { header: "Planned Date", dataKey: "plannedDate", toggleable: true },
  {
    header: "Exp. Delivery",
    dataKey: "expectedDeliveryDate",
    toggleable: true,
  },
  { header: "Priority", dataKey: "priority", toggleable: true },
  { header: "Status", dataKey: "status", toggleable: true },
  { header: "CRM Name", dataKey: "crmName", toggleable: true },
  { header: "Qty Del.", dataKey: "quantityDelivered", toggleable: true },
  { header: "Prod Pend.", dataKey: "productionPending", toggleable: true },
  { header: "Notes", dataKey: "note", toggleable: true },
  { header: "Selling Price", dataKey: "productRate", toggleable: true },
];

const HISTORY_COLUMNS_META = [
  {
    header: "Action",
    dataKey: "actionColumn",
    alwaysVisible: true,
    toggleable: false,
  },
  { header: "Timestamp", dataKey: "timestamp", toggleable: true },
  { header: "ID", dataKey: "productionId", toggleable: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
  { header: "Composition No.", dataKey: "compositionNo", toggleable: true },
  { header: "Order No.", dataKey: "orderNo", toggleable: true },
  { header: "Product Name", dataKey: "productName", toggleable: true },
  { header: "Total AL", dataKey: "alumina", toggleable: true },
  { header: "Total FE", dataKey: "iron", toggleable: true },
  { header: "GP %", dataKey: "gp", toggleable: true },
  { header: "Total BD", dataKey: "bd", toggleable: true },
  { header: "Total AP", dataKey: "ap", toggleable: true },
  { header: "Raw Materials", dataKey: "rawMaterials", toggleable: true },
];

export default function CheckPage() {
  const { user } = useAuth();
  const [pendingChecks, setPendingChecks] = useState<ProductionItem[]>([]);
  const [historyChecks, setHistoryChecks] = useState<CostingHistoryItem[]>([]);
  const [kycProducts, setKycProducts] = useState<KycProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Dialog state
  const [isKittingDialogOpen, setIsKittingDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedCheck, setSelectedCheck] = useState<ProductionItem | null>(
    null,
  );
  const [selectedHistoryItem, setSelectedHistoryItem] =
    useState<CostingHistoryItem | null>(null);
  const [kittingFormRows, setKittingFormRows] = useState<KittingFormRow[]>([]);
  const [openPopoverId, setOpenPopoverId] = useState<number | null>(null);
  const [materialSearchQuery, setMaterialSearchQuery] = useState("");

  // Expected Values state
  const [expectedValues, setExpectedValues] = useState<ExpectedValueRow[]>(
    DEFAULT_EXPECTED_PROPERTIES,
  );
  const [manufacturingCost, setManufacturingCost] = useState<number>(1500);

  // Admin firm filter
  const [adminFirmFilter, setAdminFirmFilter] = useState<string>("");

  // Pre-Costing State
  const [preCostingFirmFilter, setPreCostingFirmFilter] = useState<string>("all");
  const [preCostingFormRows, setPreCostingFormRows] = useState<KittingFormRow[]>([
    {
      id: 1,
      productName: "",
      percentage: "",
      baseAlumina: 0,
      baseIron: 0,
      baseBd: 0,
      baseAp: 0,
      basePrice: 0,
      al: 0,
      fe: 0,
      bd: 0,
      ap: 0,
      cost: 0,
    },
  ]);
  const [preCostingManufacturingCost, setPreCostingManufacturingCost] = useState<number>(1500);
  const [openPreCostingPopoverId, setOpenPreCostingPopoverId] = useState<number | null>(null);
  const [preCostingMaterialSearchQuery, setPreCostingMaterialSearchQuery] = useState<string>("");

  // Search and Firm filters for listing
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [firmFilter, setFirmFilter] = useState<string[]>([]);

  // Extract unique firm names dynamically from pending and history items
  const uniqueFirms = useMemo(() => {
    const firms = new Set<string>();
    pendingChecks.forEach((item) => {
      if (item.firmName) firms.add(item.firmName);
    });
    historyChecks.forEach((item) => {
      if (item.firmName) firms.add(item.firmName);
    });
    return Array.from(firms).sort();
  }, [pendingChecks, historyChecks]);

  const filteredPendingChecks = useMemo(() => {
    return pendingChecks.filter((item) => {
      if (firmFilter.length > 0) {
        if (!item.firmName || !firmFilter.includes(item.firmName)) {
          return false;
        }
      }
      if (searchTerm.trim() !== "") {
        const term = searchTerm.toLowerCase();
        return (
          (item.deliveryOrderNo || "").toLowerCase().includes(term) ||
          (item.partyName || "").toLowerCase().includes(term) ||
          (item.productName || "").toLowerCase().includes(term) ||
          (item.firmName || "").toLowerCase().includes(term) ||
          (item.priority || "").toLowerCase().includes(term) ||
          (item.note || "").toLowerCase().includes(term) ||
          (item.crmName || "").toLowerCase().includes(term) ||
          (item.status || "").toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [pendingChecks, firmFilter, searchTerm]);

  const filteredHistoryChecks = useMemo(() => {
    return historyChecks.filter((item) => {
      if (firmFilter.length > 0) {
        if (!item.firmName || !firmFilter.includes(item.firmName)) {
          return false;
        }
      }
      if (searchTerm.trim() !== "") {
        const term = searchTerm.toLowerCase();
        return (
          (item.orderNo || "").toLowerCase().includes(term) ||
          (item.compositionNo || "").toLowerCase().includes(term) ||
          (item.productName || "").toLowerCase().includes(term) ||
          (item.firmName || "").toLowerCase().includes(term) ||
          (item.status || "").toLowerCase().includes(term) ||
          (item.priority || "").toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [historyChecks, firmFilter, searchTerm]);

  // Derived: filter kyc products by login firm (or admin selection)
  const filteredKycProducts = useMemo(() => {
    const isAdmin = user?.role?.toLowerCase() === "admin";
    if (isAdmin) {
      if (!adminFirmFilter) return kycProducts;
      return kycProducts.filter((p) => p.firmName === adminFirmFilter);
    }
    if (!user?.firm) return kycProducts;
    const userFirms = user.firm.split(',').map((f: string) => f.trim()).filter(Boolean);
    return kycProducts.filter((p) => {
      const fName = (p.firmName || "").toLowerCase();
      // No real firm data on this entry (e.g. ProductionKyc fallback rows have no
      // firmName column at all) — treat as generic reference data visible to every
      // firm rather than hiding it from firm-scoped users.
      if (!fName) return true;
      return userFirms.some((uf: string) => {
        const mappedFirm = (FIRM_MAP[uf] || uf).toLowerCase();
        const firmSearch = uf.toLowerCase();
        return fName.includes(firmSearch) || fName.includes(mappedFirm);
      });
    });
  }, [kycProducts, user?.firm, user?.role, adminFirmFilter]);

  // Raw Materials view dialog
  const [viewingMaterials, setViewingMaterials] = useState<{
    names: string[];
    qtys: string[];
  } | null>(null);

  const [activeTab, setActiveTab] = useState("pending");
  const [visiblePendingColumns, setVisiblePendingColumns] = useState<
    Record<string, boolean>
  >({});
  const [visibleHistoryColumns, setVisibleHistoryColumns] = useState<
    Record<string, boolean>
  >({});

  // Initialize column visibility
  useEffect(() => {
    const init = (meta: any[]) =>
      meta.reduce(
        (acc, col) => ({ ...acc, [col.dataKey]: col.alwaysVisible !== false }),
        {},
      );
    setVisiblePendingColumns(init(PENDING_COLUMNS_META));
    setVisibleHistoryColumns(init(HISTORY_COLUMNS_META));
  }, [user]);

  // ---------- DATA LOADING ----------
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        { data: orderReceiptData, error: orderReceiptErr },
        { data: liftAccountsData, error: kycErr },
        { data: costData, error: costErr },
        { data: allProdData, error: allProdErr },
        { data: semiActualData },
        { data: crushingActualData },
        { data: sjcData },
        { data: sfProdData },
        { data: kycMasterData },
        invHistoryRes
      ] = await Promise.all([
        fetch(`${API_URL}/order/receipt`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }).then(async res => {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            const filtered = json.data.filter((r: any) => r.checkDelivery?.inStockOrNot === "For Production Planning");
            return { data: filtered, error: null };
          }
          return { data: [], error: null };
        }).catch(err => ({ data: [], error: err })),
        Promise.resolve(productionApi.get('LIFT-ACCOUNTS')).catch(() => ({ data: [], error: null })),
        productionApi.get(COSTING_RESPONSE_TABLE),
        productionApi.get(PRODUCTION_TABLE),
        productionApi.get('semi_actual').catch(() => ({ data: [] })),
        productionApi.get('crushing_actual').catch(() => ({ data: [] })),
        productionApi.get('semi_job_card').catch(() => ({ data: [] })),
        productionApi.get('semi_production').catch(() => ({ data: [] })),
        productionApi.get('kyc').catch(() => ({ data: [] })),
        Promise.resolve(
          productionApi.get('inventory_master_history')
        ).catch(() => ({ data: [], error: null }))
      ]);

      const inventoryHistoryData = (invHistoryRes as any)?.data || [];

      if (orderReceiptErr) throw orderReceiptErr;
      if (costErr) throw costErr;
      if (allProdErr) throw allProdErr;

      // Build a map of orderNo → production data (for enriching history)
      const normalize = (value: any) =>
        String(value || "")
          .trim()
          .toLowerCase();
      const makeOrderProductKey = (orderNo: any, productName: any) =>
        `${normalize(orderNo)}::${normalize(productName)}`;
      // The same DO + product can exist for several parties, so party is part
      // of a line item's identity. Without it one party's composition marks
      // every other party's row as done.
      const makeOrderPartyProductKey = (
        orderNo: any,
        partyName: any,
        productName: any,
      ) =>
        `${normalize(orderNo)}::${normalize(partyName)}::${normalize(productName)}`;
      const pick = (row: any, keys: string[]) => {
        for (const key of keys) {
          const value = row?.[key];
          if (
            value !== null &&
            value !== undefined &&
            String(value).trim() !== ""
          )
            return value;
        }
        return "";
      };
      const buildOrderMeta = (row: any) => ({
        firmName: String(pick(row, ["firmName", "Firm Name"])),
        partyName: String(pick(row, ["partyName", "Party Names", "Party Name"])),
        productName: String(pick(row, ["productName", "Product Name"])).trim(),
        orderQuantity: Number(pick(row, ["quantity", "Quantity", "Order Quantity"]) || 0),
        expectedDeliveryDate: pick(row, ["expectedDeliveryDate", "Expected Delivery Date"]) || row.checkPo?.expectedDeliveryDate,
        note: String(pick(row, ["specificConcern", "Specific Concern", "Note"])),
        plannedDate: pick(row, ["checkDeliveryActual", "check_delivery_actual", "Planned 1"]),
        status: String(pick(row, ["status", "Status"])),
        crmName: String(pick(row, ["crmForCustomer", "Crm For The Customer", "CRM Name"])),
        quantityDelivered: String(
          pick(row, ["delivered", "Delivered", "Quantity Delivered"]),
        ),
        productionPending: String(
          pick(row, ["pendingQty", "Pending Qty", "Production Pending"]),
        ),
        productRate: String(
          pick(row, ["rateOfMaterial", "Rate Of Material", "Product Rate", "Selling Price"]),
        ),
        uploadSo: String(pick(row, ["uploadSo", "Upload SO"]) || ""),
      });

      const prodMap = new Map<string, any>();
      const productionKeys = new Set<string>();
      (allProdData || []).forEach((row: any) => {
        const doNo = String(row["Delivery Order No."] || row["deliveryOrderNo"] || "").trim();
        const productName = String(row["Product Name"] || row["productName"] || "").trim();
        const partyName = String(row["Party Name"] || row["partyName"] || "").trim();
        if (doNo) {
          const prodInfo = {
            plannedDate: row["Planned 1"] || "",
            expectedDeliveryDate: row["Expected Delivery Date"] || row["expectedDeliveryDate"] || "",
            priority: row["Priority"] || row["priority"] || "",
            firmName: row["Firm Name"] || row["firmName"] || "",
            productionId: row.id,
            uploadSo: row["Upload SO"] || row["uploadSo"] || "",
            productName: productName,
            partyName: partyName,
            orderQuantity: Number(row["Order Quantity"] || row["orderQuantity"] || 0),
            note: row["Note"] || row["reason"] || "",
            status: row["Status"] || row["status"] || "",
            crmName: row["Crm Name"] || row["crmName"] || "",
            quantityDelivered: String(row["Quantity Delivered"] || row["quantityDelivered"] || ""),
            productionPending: String(row["Production Pending"] || ""),
            productRate: String(row["product_rate"] || ""),
          };
          if (!prodMap.has(doNo)) prodMap.set(doNo, prodInfo);
          prodMap.set(makeOrderProductKey(doNo, productName), prodInfo);
          prodMap.set(makeOrderPartyProductKey(doNo, partyName, productName), prodInfo);
          productionKeys.add(makeOrderProductKey(doNo, productName));
        }
      });

      // Build metadata map from orderReceiptData
      const orderMetaMap = new Map<string, ReturnType<typeof buildOrderMeta>>();
      (orderReceiptData || []).forEach((row: any) => {
        const doNo = String(row["doNumber"] || row["DO-Delivery Order No."] || "").trim();
        const meta = buildOrderMeta(row);
        const productName = meta.productName;
        if (doNo) {
          if (!orderMetaMap.has(doNo)) orderMetaMap.set(doNo, meta);
          orderMetaMap.set(makeOrderProductKey(doNo, productName), meta);
        }
      });

      
      const verifiedKeys = new Set<string>();
      // How many compositions (costing rows) exist per DO+party+product key.
      // An order can have several identical "For Production Planning" lines
      // (same DO/party/product) that each need their own composition. Tracking
      // the count lets the surplus lines stay pending instead of one
      // composition hiding all of them.
      const verifiedCountByKey = new Map<string, number>();
      // Legacy costing rows saved before party was recorded: they can only be
      // matched on DO + product, so they still verify every party of that pair.
      const verifiedKeysWithoutParty = new Set<string>();
      const verifiedDosWithoutProduct = new Set<string>();
      (costData || []).forEach((row: any) => {
        // costData now comes straight from the real ProductionCosting model
        // (GET /api/production/costing), which nests the linked order under
        // `order` and has no "Order No." / "product name" / "Party Name"
        // bracket-string keys — those were the old Google-Sheets column names
        // and are kept only as a fallback for any not-yet-migrated rows.
        const orderNo = String(row.order?.deliveryOrderNo || row["Order No."] || "").trim();
        const productName = String(row.order?.productName || row["product name"] || "").trim();
        const partyName = String(row.order?.partyName || row["Party Name"] || "").trim();
        if (orderNo) {
          if (productName) {
            if (partyName) {
              const partyKey = makeOrderPartyProductKey(orderNo, partyName, productName);
              verifiedKeys.add(partyKey);
              verifiedCountByKey.set(partyKey, (verifiedCountByKey.get(partyKey) || 0) + 1);
            } else {
              verifiedKeysWithoutParty.add(
                makeOrderProductKey(orderNo, productName),
              );
            }
          } else {
            verifiedDosWithoutProduct.add(normalize(orderNo));
          }
        }
      });

      const formatDate = (val: any) => {
        if (!val) return "";
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          const pad = (num: number) => String(num).padStart(2, "0");
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        }
        return String(val);
      };

      const isVerified = (orderNo: any, partyName: any, productName: any) => {
        return (
          verifiedKeys.has(
            makeOrderPartyProductKey(orderNo, partyName, productName),
          ) ||
          verifiedKeysWithoutParty.has(
            makeOrderProductKey(orderNo, productName),
          ) ||
          (verifiedDosWithoutProduct.has(normalize(orderNo)) &&
            !normalize(productName))
        );
      };

      const pendingList: ProductionItem[] = [];
      const matchedProdIds = new Set<any>();

      (allProdData || []).forEach((row: any) => {
        // row is a real ProductionOrder from GET /api/production/orders — camelCase
        // fields, not the old Supabase bracket-string keys.
        const doNo = String(row["deliveryOrderNo"] || row["Delivery Order No."] || "").trim();
        const productName = String(row["productName"] || row["Product Name"] || "").trim();
        if (!doNo) return;

        if (row["orderCancelled"] || row["Order Cancel"]) return;
        if (isVerified(doNo, row["partyName"] || row["Party Name"], productName)) return;

        const key = makeOrderProductKey(doNo, productName);
        let meta = orderMetaMap.get(key);
        if (!meta) {
          const fallback = orderMetaMap.get(doNo);
          if (fallback && (!fallback.productName || !productName || normalize(fallback.productName) === normalize(productName))) {
            meta = fallback;
          }
        }

        pendingList.push({
          id: row.id,
          productionId: row.id,
          timestamp: row["createdAt"] || row["Timestamp"] || "",
          firmName: row["firmName"] || row["Firm Name"] || meta?.firmName || "",
          deliveryOrderNo: doNo,
          partyName: row["partyName"] || row["Party Name"] || meta?.partyName || "",
          productName,
          orderQuantity: Number(
            row["orderQuantity"] || row["Order Quantity"] || meta?.orderQuantity || 0,
          ),
          expectedDeliveryDate: formatDate(
            row["expectedDeliveryDate"] || row["Expected Delivery Date"] || meta?.expectedDeliveryDate,
          ),
          priority: row["priority"] || row["Priority"] || "",
          note: row["reason"] || row["Note"] || meta?.note || "",
          plannedDate: formatDate(row["Planned 1"] || meta?.plannedDate),
          status: row["status"] || row["Status"] || meta?.status || "",
          crmName: row["crmName"] || meta?.crmName || "",
          quantityDelivered: String(row["quantityDelivered"] ?? "") || meta?.quantityDelivered || "",
          productionPending: meta?.productionPending || "",
          productRate: meta?.productRate || "",
          uploadSo: row["uploadSo"] || row["Upload SO"] || meta?.uploadSo || "",
        });
      });

      // Tracks how many order lines have already "used up" the compositions
      // available for a DO+party+product key, so surplus lines stay pending.
      const consumedVerifiedByKey = new Map<string, number>();
      (orderReceiptData || []).forEach((row: any) => {
        const doNo = String(row["doNumber"] || row["DO-Delivery Order No."] || "").trim();
        const productName = String(row["productName"] || row["Product Name"] || "").trim();
        const firmName = String(row["firmName"] || row["Firm Name"] || "").trim();
        const partyName = String(row["partyName"] || row["Party Names"] || row["Party Name"] || "").trim();
        if (!doNo) return;

        // Count-aware verification: consume one composition per matching line;
        // any line beyond the number of compositions done stays pending. Legacy
        // party-less / DO-only verifications keep their original behaviour.
        let isSurplusLine = false;
        const exactKey = makeOrderPartyProductKey(doNo, partyName, productName);
        if (verifiedKeys.has(exactKey)) {
          const allowed = verifiedCountByKey.get(exactKey) || 0;
          const consumed = consumedVerifiedByKey.get(exactKey) || 0;
          if (consumed < allowed) {
            consumedVerifiedByKey.set(exactKey, consumed + 1);
            return;
          }
          isSurplusLine = true;
        } else if (isVerified(doNo, partyName, productName)) {
          return;
        }

        // A surplus line has no dedicated production row of its own — every
        // existing one belongs to an already-composed line — so it goes
        // straight to pending without stealing another line's production row.
        const matchingProd = isSurplusLine ? undefined : (allProdData || []).find((p: any) => {
          if (matchedProdIds.has(p.id)) return false;
          const pDO = normalize(p["deliveryOrderNo"] || p["Delivery Order No."]);
          const oDO = normalize(doNo);
          const pProduct = normalize(p["productName"] || p["Product Name"]);
          const oProduct = normalize(productName);
          const pFirm = normalize(p["firmName"] || p["Firm Name"]);
          const oFirm = normalize(firmName);
          const pParty = normalize(p["partyName"] || p["Party Name"]);
          const oParty = normalize(partyName);
          return (
            pDO === oDO &&
            pProduct === oProduct &&
            (!oFirm || pFirm === oFirm) &&
            (!oParty || !pParty || pParty === oParty)
          );
        });

        if (matchingProd) {
          matchedProdIds.add(matchingProd.id);
          return;
        }

        const keyWithParty = makeOrderPartyProductKey(doNo, partyName, productName);
        const key = makeOrderProductKey(doNo, productName);
        let enriched = prodMap.get(keyWithParty);
        if (!enriched) {
          enriched = prodMap.get(key);
          if (enriched && enriched.partyName && partyName && normalize(enriched.partyName) !== normalize(partyName)) {
            enriched = null;
          }
        }
        if (!enriched) {
          const fallback = prodMap.get(doNo);
          if (fallback && (!fallback.productName || !productName || normalize(fallback.productName) === normalize(productName))) {
            enriched = fallback;
            if (enriched && enriched.partyName && partyName && normalize(enriched.partyName) !== normalize(partyName)) {
              enriched = null;
            }
          }
        }
        if (!enriched) {
          enriched = {
            plannedDate: "",
            expectedDeliveryDate: "",
            priority: "",
            firmName: "",
            productionId: "",
            uploadSo: "",
          };
        }

        pendingList.push({
          id: row.id,
          productionId: "",
          timestamp: row["createdAt"] || row["Timestamp"] || "",
          firmName: row["firmName"] || row["Firm Name"] || enriched.firmName || "",
          deliveryOrderNo: doNo,
          partyName: row["partyName"] || row["Party Names"] || row["Party Name"] || "",
          productName,
          orderQuantity: Number(row["quantity"] ?? row["Quantity"] ?? 0),
          expectedDeliveryDate: formatDate(
            enriched.expectedDeliveryDate || row.checkPo?.expectedDeliveryDate || row["expectedDeliveryDate"] || row["Expected Delivery Date"],
          ),
          priority: enriched.priority || "",
          note: row["specificConcern"] || row["Specific Concern"] || row["note"] || "",
          plannedDate: formatDate(
            row.checkDelivery?.actualPlannedDate || row["check_delivery_actual"] || enriched.plannedDate,
          ),
          status: row["status"] || row["Status"] || "",
          crmName: String(row["crmForCustomer"] || row["Crm For The Customer"] || row["crmName"] || ""),
          quantityDelivered: String(row["quantityDelivered"] ?? row["Delivered"] ?? ""),
          productionPending: String(row["pendingQty"] ?? row["Pending Qty"] ?? ""),
          productRate: String(row["rateOfMaterial"] ?? row["Rate Of Material"] ?? ""),
          uploadSo: row["uploadSo"] || row["Upload SO"] || enriched.uploadSo || "",
        });
      });

      const pending = pendingList;

      const recordMap = new Map<string, {
        id: number;
        productName: string;
        alumina: number | null;
        iron: number | null;
        bd: number | null;
        ap: number | null;
        price: number | null;
        baseRate?: number | null;
        transportRate?: number | null;
        firmName: string;
        timestamp?: string;
      }>();

      let idxCounter = 1;

      const normFirm = (name: any) => {
        const str = String(name || "").toLowerCase().trim();
        if (str.includes("purab")) return "purab";
        if (str.includes("pmmpl")) return "pmmpl";
        if (str.includes("rkl")) return "rkl";
        return str;
      };

      const normProd = (name: any) => String(name || "").toLowerCase().trim();

      const sfFirmMap = new Map<string, string>();
      (sfProdData || []).forEach((row: any) => {
        const sfNo = String(row["SF-Sr No."] || "").trim();
        const pName = normProd(row["Name Of Semi Finished Good"]);
        const firm = String(row["Firm name"] || row["Firm Name"] || "").trim();
        if (sfNo && firm) {
          sfFirmMap.set(sfNo, firm);
          if (pName) sfFirmMap.set(`${sfNo}::${pName}`, firm);
        }
      });

      const sjcFirmMap = new Map<string, string>();
      (sjcData || []).forEach((row: any) => {
        const sjcNo = String(row["SJC-Sr No."] || "").trim();
        const sfNo = String(row["Semi Finished Production No."] || "").trim();
        const pName = normProd(row["Product Name"]);
        const firm = String(row["Firm Name"] || row["Firm name"] || "").trim() || sfFirmMap.get(`${sfNo}::${pName}`) || sfFirmMap.get(sfNo) || "";
        if (sjcNo && firm) {
          sjcFirmMap.set(sjcNo, firm);
          if (pName) sjcFirmMap.set(`${sjcNo}::${pName}`, firm);
        }
      });

      const procCostMap = new Map<string, number>();

      (semiActualData || []).forEach((row: any) => {
        // Real ProductionSemiActualRun shape: semiJobCardId, qtyProduced,
        // machineHours, endProductName, endProductQty, status, with
        // materials: [{materialName, quantity, processingCost}] and
        // semiJobCard: { ...semiOrder: { firmName, semiGoodName, ... } }.
        const sjcNo = String(row["semiJobCardId"] || row.semiJobCard?.id || "").trim();
        const sfNo = String(row.semiJobCard?.semiOrderId || row.semiJobCard?.semiOrder?.id || "").trim();
        const prodName = normProd(row["endProductName"] || row.semiJobCard?.semiOrder?.semiGoodName);

        const fName = normFirm(
          row.semiJobCard?.semiOrder?.firmName ||
          sjcFirmMap.get(`${sjcNo}::${prodName}`) ||
          sjcFirmMap.get(sjcNo) ||
          sfFirmMap.get(`${sfNo}::${prodName}`) ||
          sfFirmMap.get(sfNo)
        );

        const materials = Array.isArray(row.materials) ? row.materials : [];
        const mainCost = materials.reduce((sum: number, m: any) => sum + (Number(m.processingCost) || 0), 0);

        if (prodName && mainCost > 0) {
          if (fName) {
            const key = `${fName}___${prodName}`;
            if (!procCostMap.has(key)) procCostMap.set(key, mainCost);
          }
          if (!procCostMap.has(prodName)) procCostMap.set(prodName, mainCost);
        }

        materials.forEach((m: any) => {
          const rmName = normProd(m.materialName);
          const cost = Number(m.processingCost || 0);
          if (rmName && cost > 0) {
            if (fName) {
              const key = `${fName}___${rmName}`;
              if (!procCostMap.has(key)) procCostMap.set(key, cost);
            }
            if (!procCostMap.has(rmName)) procCostMap.set(rmName, cost);
          }
        });
      });

      (crushingActualData || []).forEach((row: any) => {
        const fName = normFirm(row["Firm Name"] || row["Firm name"]);
        const mainCost = Number(row["Processing Cost"] || 0);

        const crushProdName = normProd(row["Crushing Product Name"]);
        if (crushProdName && mainCost > 0) {
          if (fName) {
            const key = `${fName}___${crushProdName}`;
            if (!procCostMap.has(key)) procCostMap.set(key, mainCost);
          }
          if (!procCostMap.has(crushProdName)) procCostMap.set(crushProdName, mainCost);
        }

        for (let i = 1; i <= 4; i++) {
          const fgName = normProd(row[`Finished Goods Name ${i}`]);
          const cost = Number(row[`Processing Cost ${i}`] || 0);
          if (fgName && cost > 0) {
            if (fName) {
              const key = `${fName}___${fgName}`;
              if (!procCostMap.has(key)) procCostMap.set(key, cost);
            }
            if (!procCostMap.has(fgName)) procCostMap.set(fgName, cost);
          }
        }
      });

      // Sort liftAccountsData by Actual Receipt Date / Bill Date / Timestamp descending (matching Purchase FMS UI)
      const getReceiptTime = (row: any) => {
        const d = row["Date Of Receiving"] || row["ACTUAL RECEIPT DATE"] || row["Date Of Bill"] || row["DATE OF BILL"] || row["Timestamp"];
        return d ? new Date(d).getTime() : 0;
      };
      const sortedLiftAccountsData = (liftAccountsData || []).slice().sort((a: any, b: any) => getReceiptTime(b) - getReceiptTime(a));

      for (const row of sortedLiftAccountsData) {
        const firmName = String(row["Firm Name"] || "").trim();
        const productName = String(row["Raw Material Name"] || row["Product Name"] || "").trim();

        if (!firmName || !productName) continue;

        const key = `${firmName.toLowerCase()}___${productName.toLowerCase()}`;

        if (!recordMap.has(key)) {
          recordMap.set(key, {
            id: idxCounter++,
            productName,
            alumina: null,
            iron: null,
            bd: null,
            ap: null,
            price: null,
            baseRate: null,
            transportRate: null,
            firmName,
            timestamp: row["Timestamp"],
          });
        }

        const rec = recordMap.get(key)!;

        if (rec.alumina === null && row["Alumina Percent Age %"] !== null && row["Alumina Percent Age %"] !== undefined && !isNaN(Number(row["Alumina Percent Age %"]))) {
          rec.alumina = parseFloat(row["Alumina Percent Age %"]);
        }
        if (rec.iron === null && row["Iron Percent Age %"] !== null && row["Iron Percent Age %"] !== undefined && !isNaN(Number(row["Iron Percent Age %"]))) {
          rec.iron = parseFloat(row["Iron Percent Age %"]);
        }
        if (rec.bd === null && row["BD Percent Age %"] !== null && row["BD Percent Age %"] !== undefined && !isNaN(Number(row["BD Percent Age %"]))) {
          rec.bd = parseFloat(row["BD Percent Age %"]);
        }
        if (rec.ap === null && row["AP Percent Age %"] !== null && row["AP Percent Age %"] !== undefined && !isNaN(Number(row["AP Percent Age %"]))) {
          rec.ap = parseFloat(row["AP Percent Age %"]);
        }
        if (rec.price === null && row["Rate"] !== null && row["Rate"] !== undefined && !isNaN(Number(row["Rate"]))) {
          const baseRate = parseFloat(row["Rate"]);
          let transportRate = (row["Transporting Rate"] !== null && row["Transporting Rate"] !== undefined && !isNaN(Number(row["Transporting Rate"])))
            ? parseFloat(row["Transporting Rate"])
            : 0;

          const rateType = String(row["Type Of Transporting Rate"] || "").trim().toLowerCase();

          // Fallback: When Rate Type is Fixed and per mt transportation rate column has no value (0/null/undefined),
          // fetch (Total Transport Amount / Billing Qty)
          if ((transportRate === 0 || isNaN(transportRate)) && rateType === "fixed") {
            const totalTransportAmount = Number(row["Transporter Rate"] || 0);
            const billingQty = Number(row["Lifting Qty"] || row["Total Bill Quantity"] || row["Actual Quantity"] || row["Qty"] || 0);
            if (totalTransportAmount > 0 && billingQty > 0) {
              transportRate = totalTransportAmount / billingQty;
            }
          }

          rec.price = baseRate + transportRate;
          rec.baseRate = baseRate;
          rec.transportRate = transportRate;
        }
      }

      // Helper function to find parent raw material record in recordMap for crushed grains
      const findParentRecord = (fNameRaw: string, parentNameRaw: string, fgNameRaw: string) => {
        const normF = normFirm(fNameRaw);
        const normP = normProd(parentNameRaw);
        const normFg = normProd(fgNameRaw);

        const cleanP = normP.replace(/\s+/g, "").replace("lumps", "").replace("slag", "");
        const fgBase = normFg.split("(")[0].trim().replace(/\s+/g, "");

        let parentRec = recordMap.get(`${normF}___${normP}`);
        if (parentRec) return parentRec;

        for (const [k, v] of recordMap.entries()) {
          if (k.startsWith(`${normF}___`)) {
            const pNameInMap = k.split("___")[1].replace(/\s+/g, "").replace("lumps", "").replace("slag", "");
            if (pNameInMap === cleanP || pNameInMap === fgBase) return v;
          }
        }

        return null;
      };

      // Add crushed grains from crushingActualData if not present in recordMap
      (crushingActualData || []).forEach((row: any) => {
        const firmName = String(row["Firm Name"] || row["Firm name"] || "").trim();
        const parentProdName = String(row["Crushing Product Name"] || "").trim();
        if (!firmName) return;

        for (let i = 1; i <= 4; i++) {
          const fgName = String(row[`Finished Goods Name ${i}`] || "").trim();
          const fgCost = Number(row[`Processing Cost ${i}`] || 0);
          if (!fgName) continue;

          const grainKey = `${firmName.toLowerCase()}___${fgName.toLowerCase()}`;
          if (!recordMap.has(grainKey)) {
            const parentRec = findParentRecord(firmName, parentProdName, fgName);
            const bRate = parentRec ? (parentRec.baseRate ?? null) : null;
            const tRate = parentRec ? (parentRec.transportRate ?? null) : null;
            const calcPrice = (bRate || 0) + (tRate || 0) + fgCost;

            recordMap.set(grainKey, {
              id: idxCounter++,
              productName: fgName,
              alumina: parentRec ? parentRec.alumina : null,
              iron: parentRec ? parentRec.iron : null,
              price: calcPrice > 0 ? calcPrice : null,
              firmName,
              bd: parentRec ? parentRec.bd : null,
              ap: parentRec ? parentRec.ap : null,
            });
          }
        }
      });

      // Unique list of firms present in recordMap
      const knownFirms = Array.from(new Set(Array.from(recordMap.values()).map(r => r.firmName).filter(Boolean)));

      // Helper function to find matching grain rate for semi-finished / fines products ONLY for the target firm
      const findGrainRateForFines = (targetFirm: string, finesProdName: string) => {
        const normF = normFirm(targetFirm);
        if (!normF) return null;
        const cleanBase = normProd(finesProdName).replace("fines", "").replace("fine", "").replace(/\s+/g, "");

        // Only check exact firm match
        for (const [k, v] of recordMap.entries()) {
          if (k.startsWith(`${normF}___`)) {
            const pNameInMap = k.split("___")[1];
            const cleanedP = pNameInMap.replace(/\s+/g, "");
            const isGrain = cleanedP.includes("(0-1)") || 
                            cleanedP.includes("(1-3)") || 
                            cleanedP.includes("(3-5)") || 
                            cleanedP.includes("clinker") || 
                            cleanedP.includes("lumps") || 
                            cleanedP.includes("fired") || 
                            cleanedP.includes("green") || 
                            cleanedP.includes("slag");

            if (cleanedP.startsWith(cleanBase) && isGrain) {
              if (v.price && v.price > 0) return v;
            }
          }
        }

        return null;
      };

      // Process ALL semi_actual history products with traced firm names
      (semiActualData || []).forEach((row: any) => {
        const sjcNo = String(row["semiJobCardId"] || row.semiJobCard?.id || "").trim();
        const sfNo = String(row.semiJobCard?.semiOrderId || row.semiJobCard?.semiOrder?.id || "").trim();
        const prodName = String(row["endProductName"] || row.semiJobCard?.semiOrder?.semiGoodName || "").trim();
        const materials = Array.isArray(row.materials) ? row.materials : [];
        const procCost = materials.reduce((sum: number, m: any) => sum + (Number(m.processingCost) || 0), 0);

        if (!prodName) return;

        const tracedFirmRaw = String(
          row.semiJobCard?.semiOrder?.firmName ||
          sjcFirmMap.get(`${sjcNo}::${normProd(prodName)}`) ||
          sjcFirmMap.get(sjcNo) ||
          sfFirmMap.get(`${sfNo}::${normProd(prodName)}`) ||
          sfFirmMap.get(sfNo) ||
          ""
        ).trim();

        const targetFirms = tracedFirmRaw ? [tracedFirmRaw] : knownFirms;

        targetFirms.forEach((fName) => {
          const displayFirm = fName || "Pmmpl";
          const grainKey = `${normFirm(displayFirm)}___${prodName.toLowerCase()}`;

          const grainRec = findGrainRateForFines(displayFirm, prodName);

          // Date comparison: Compare Production Entry date vs Purchase FMS timestamp
          const semiDateStr = row.semiJobCard?.dateOfProduction || row["createdAt"];
          const semiTime = semiDateStr ? new Date(semiDateStr).getTime() : 0;

          const existingRec = recordMap.get(grainKey);
          const purchaseTime = (existingRec && existingRec.timestamp)
            ? new Date(existingRec.timestamp).getTime()
            : 0;

          // Option A: If a direct purchase bill for this product exists in Purchase FMS for this firm, preserve it as is.
          // Only synthesize / add processing cost if NO direct purchase bill exists for this product & firm.
          if (!recordMap.has(grainKey)) {
            const grainRec = findGrainRateForFines(displayFirm, prodName);
            const parentRec = grainRec || findParentRecord(displayFirm, prodName, prodName);
            const bRate = parentRec ? parentRec.baseRate : null;
            const tRate = parentRec ? parentRec.transportRate : null;
            const calcPrice = (bRate || 0) + (tRate || 0) + procCost;

            recordMap.set(grainKey, {
              id: idxCounter++,
              productName: prodName,
              alumina: parentRec ? parentRec.alumina : null,
              iron: parentRec ? parentRec.iron : null,
              price: calcPrice > 0 ? calcPrice : (procCost > 0 ? procCost : null),
              firmName: displayFirm,
              bd: parentRec ? parentRec.bd : null,
              ap: parentRec ? parentRec.ap : null,
              baseRate: bRate,
              transportRate: tRate,
            });
          }
        });
      });

      // Fallback: Merge products from the real ProductionKyc table (GET
      // /api/production/kyc — camelCase fields, no firmName column at all) ONLY
      // IF they are missing from active recordMap. An empty firmName here is
      // intentional: the popover's firm filter does `selectedFirm.includes(p.firmName)`,
      // and includes("") is always true, so these generic reference entries show
      // up for every firm instead of being excluded by a fake "N/A" mismatch.
      (kycMasterData || []).forEach((row: any) => {
        const pName = String(row["productName"] || row["Product name"] || "").trim();
        const fName = String(row["firmName"] || "").trim();
        if (!pName) return;

        const key = `${normFirm(fName)}___${normProd(pName)}`;

        // ONLY ADD IF NOT ALREADY PRESENT IN KYC PAGE ACTIVE PRODUCTS
        if (!recordMap.has(key)) {
          recordMap.set(key, {
            id: idxCounter++,
            productName: pName,
            alumina: row["alumina"] != null && !isNaN(Number(row["alumina"])) ? Number(row["alumina"]) : null,
            iron: row["iron"] != null && !isNaN(Number(row["iron"])) ? Number(row["iron"]) : null,
            bd: row["bd"] != null && !isNaN(Number(row["bd"])) ? Number(row["bd"]) : null,
            ap: row["ap"] != null && !isNaN(Number(row["ap"])) ? Number(row["ap"]) : null,
            price: row["price"] != null && !isNaN(Number(row["price"])) ? Number(row["price"]) : null,
            firmName: fName,
          });
        }
      });

      // Merge Custom Products from localStorage
      try {
        const storedCustom = typeof window !== "undefined" ? localStorage.getItem("custom_kyc_products") : null;
        if (storedCustom) {
          const parsedCustom = JSON.parse(storedCustom);
          if (Array.isArray(parsedCustom)) {
            parsedCustom.forEach((item: any) => { 
              if (item.productName && item.firmName) {
                const key = `${normFirm(item.firmName)}___${normProd(item.productName)}`;
                if (!recordMap.has(key)) {
                  const baseRate = Number(item.baseRate) || 0;
                  const transportRate = Number(item.transportRate) || 0;
                  const calcPrice = baseRate + transportRate;

                  recordMap.set(key, {
                    id: idxCounter++,
                    productName: item.productName,
                    alumina: item.alumina != null && item.alumina !== "" ? Number(item.alumina) : null,
                    iron: item.iron != null && item.iron !== "" ? Number(item.iron) : null,
                    bd: item.bd != null && item.bd !== "" ? Number(item.bd) : null,
                    ap: item.ap != null && item.ap !== "" ? Number(item.ap) : null,
                    price: calcPrice > 0 ? calcPrice : null,
                    firmName: item.firmName,
                    baseRate,
                    transportRate,
                  });
                }
              }
            });
          }
        }
      } catch (e) {}

      // Build inventory_master_history rate map (latest snapshot_date per firm_name & item_name)
      const inventoryRateMap = new Map<string, number>();
      (inventoryHistoryData || []).forEach((row: any) => {
        const f = normFirm(row["firm_name"]);
        const item = normProd(row["item_name"]);
        const rate = row["product_rate"] !== null && row["product_rate"] !== undefined ? Number(row["product_rate"]) : null;
        if (f && item && rate !== null && !isNaN(rate) && rate > 0) {
          const key = `${f}___${item}`;
          if (!inventoryRateMap.has(key)) {
            inventoryRateMap.set(key, rate);
          }
        }
      });

      const products: KycProduct[] = [];
      for (const rec of recordMap.values()) {
        const key = `${normFirm(rec.firmName)}___${normProd(rec.productName)}`;
        const invRate = inventoryRateMap.get(key);
        const price = invRate !== undefined && invRate > 0 ? invRate : (rec.price || 0);

        products.push({
          id: rec.id,
          productName: rec.productName,
          alumina: rec.alumina || 0,
          iron: rec.iron || 0,
          bd: rec.bd || 0,
          ap: rec.ap || 0,
          price,
          firmName: rec.firmName,
        });
      }

      const history: CostingHistoryItem[] = (costData || []).map((row: any) => {
        const rawMaterials: string[] = [];
        const rawMaterialQtys: string[] = [];
        const rawMaterialCosts: number[] = [];
        // Real ProductionCosting rows carry their materials via the `materials`
        // relation (materialName/quantity/sequence — no per-line cost column).
        // Bracket-string RM1../QTY1../COST1.. keys are the old Google-Sheets
        // shape and only apply to rows that predate the migration.
        const materialRows = Array.isArray(row.materials)
          ? [...row.materials].sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0))
          : [];
        if (materialRows.length > 0) {
          materialRows.forEach((m: any) => {
            if (m.materialName && String(m.materialName).trim()) rawMaterials.push(String(m.materialName));
            if (m.quantity !== null && m.quantity !== undefined) rawMaterialQtys.push(String(m.quantity));
            rawMaterialCosts.push(0);
          });
        } else {
          for (let i = 1; i <= 20; i++) {
            const rm = row[`RM${i}`];
            const qty = row[`QTY${i}`];
            const cost = row[`COST${i}`];
            if (rm && String(rm).trim()) rawMaterials.push(String(rm));
            if (qty !== null && qty !== undefined && String(qty).trim())
              rawMaterialQtys.push(String(qty));
            rawMaterialCosts.push(Number(cost || 0));
          }
        }
        const orderNo = String(row.order?.deliveryOrderNo || row["Order No."] || "").trim();
        const productName = String(row.order?.productName || row["product name"] || "").trim();
        const partyName = String(row.order?.partyName || row["Party Name"] || "").trim();

        const keyWithParty = makeOrderPartyProductKey(orderNo, partyName, productName);
        const key = makeOrderProductKey(orderNo, productName);

        let meta = orderMetaMap.get(keyWithParty);
        if (!meta) {
          meta = orderMetaMap.get(key);
          if (meta && meta.partyName && partyName && normalize(meta.partyName) !== normalize(partyName)) {
            meta = undefined;
          }
        }
        if (!meta) {
          const fallback = orderMetaMap.get(orderNo);
          if (fallback && (!fallback.productName || !productName || normalize(fallback.productName) === normalize(productName))) {
            meta = fallback;
            if (meta && meta.partyName && partyName && normalize(meta.partyName) !== normalize(partyName)) {
              meta = undefined;
            }
          }
        }

        let enriched = prodMap.get(keyWithParty);
        if (!enriched) {
          enriched = prodMap.get(key);
          if (enriched && enriched.partyName && partyName && normalize(enriched.partyName) !== normalize(partyName)) {
            enriched = { ...enriched, productionId: "" };
          }
        }
        if (!enriched) {
          const fallback = prodMap.get(orderNo);
          if (fallback && (!fallback.productName || !productName || normalize(fallback.productName) === normalize(productName))) {
            enriched = fallback;
            if (enriched && enriched.partyName && partyName && normalize(enriched.partyName) !== normalize(partyName)) {
              enriched = { ...enriched, productionId: "" };
            }
          }
        }
        if (!enriched) {
          enriched = {
            plannedDate: "",
            expectedDeliveryDate: "",
            priority: "",
            firmName: "",
            productionId: "",
            uploadSo: "",
            partyName: "",
            orderQuantity: 0,
            note: "",
            status: "",
            crmName: "",
            quantityDelivered: "",
            productionPending: "",
            productRate: "",
          };
        }
        return {
          id: row.id,
          productionId: row.orderId || enriched.productionId || "",
          firmName: row.order?.firmName || meta?.firmName || enriched.firmName || "",
          timestamp: row.createdAt
            ? format(new Date(row.createdAt), "dd/MM/yyyy HH:mm:ss")
            : (row["TIMESTAMP"] ? format(new Date(row["TIMESTAMP"]), "dd/MM/yyyy HH:mm:ss") : ""),
          compositionNo: row.compositionNo || row["Composition No."] || "",
          orderNo,
          productName,
          alumina: Number(row.aluminaPercent ?? row["alumina"] ?? 0),
          iron: Number(row.ironPercent ?? row["iron"] ?? 0),
          gp: row.gpPercent !== undefined && row.gpPercent !== null ? Number(row.gpPercent) : null,
          bd: Number(row["BD"] || 0),
          ap: Number(row["AP"] || 0),
          rawMaterials,
          rawMaterialQtys,
          rawMaterialCosts,
          plannedDate: enriched.plannedDate,
          expectedDeliveryDate: enriched.expectedDeliveryDate,
          priority: enriched.priority,
          status: row.status || row["Status"] || meta?.status || enriched.status || "",
          partyName: partyName || meta?.partyName || enriched.partyName || "",
          orderQuantity: meta?.orderQuantity || enriched.orderQuantity || 0,
          note: meta?.note || enriched.note || "",
          productRate: meta?.productRate || enriched.productRate || "",
          uploadSo: meta?.uploadSo || enriched.uploadSo || "",
          crmName: meta?.crmName || enriched.crmName || "",
          quantityDelivered: meta?.quantityDelivered || enriched.quantityDelivered || "",
          productionPending: meta?.productionPending || enriched.productionPending || "",
          manufacturingCost: row.manufacturingCost !== undefined && row.manufacturingCost !== null ? Number(row.manufacturingCost) : (row["Manufacturing Cost"] !== undefined && row["Manufacturing Cost"] !== null ? Number(row["Manufacturing Cost"]) : undefined),
        };
      });

      const userFirms = user?.firm ? user.firm.split(',').map((f: string) => f.trim().toLowerCase()).filter(Boolean) : [];
      const isAdmin = user?.role?.toLowerCase() === "admin";
      const filterByFirm = (list: any[]) => {
        if (isAdmin || userFirms.length === 0) return list;
        return list.filter((item) => {
          const fName = (item.firmName || "").toLowerCase();
          return userFirms.some((uf: string) => fName.includes(uf));
        });
      };

      setPendingChecks(filterByFirm(pending));
      setHistoryChecks(filterByFirm(history));
      setKycProducts(products);
    } catch (err: any) {
      setError(`Failed to load data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ---------- FORM LOGIC ----------
  const normalizeLookupValue = (value: any) =>
    String(value || "")
      .trim()
      .toLowerCase();

  const findKycProduct = useCallback(
    (productName: string, firmName?: string) => {
      const normalizedProductName = normalizeLookupValue(productName);
      const normalizedFirmName = normalizeLookupValue(firmName);

      if (!normalizedProductName) return null;

      const firmMatch = normalizedFirmName
        ? kycProducts.find((p) => {
            const pFirm = normalizeLookupValue(p.firmName);
            return (
              normalizeLookupValue(p.productName) === normalizedProductName &&
              (pFirm === normalizedFirmName ||
                pFirm.includes(normalizedFirmName) ||
                normalizedFirmName.includes(pFirm))
            );
          })
        : null;

      return (
        firmMatch ||
        kycProducts.find(
          (p) => normalizeLookupValue(p.productName) === normalizedProductName,
        ) ||
        null
      );
    },
    [kycProducts],
  );

  const getActiveKycFirm = useCallback(
    (firmOverride?: string) => {
      if (firmOverride !== undefined) return firmOverride;
      if (user?.role?.toLowerCase() === "admin")
        return adminFirmFilter || selectedCheck?.firmName || "";
      if (!user?.firm) return selectedCheck?.firmName || "";
      const userFirms = user.firm.split(',').map((f: string) => f.trim()).filter(Boolean);
      if (selectedCheck?.firmName) {
        const itemFirmLower = selectedCheck.firmName.toLowerCase();
        const matched = userFirms.find((uf: string) => itemFirmLower.includes(uf.toLowerCase()) || (FIRM_MAP[uf] || uf).toLowerCase().includes(itemFirmLower));
        if (matched) return FIRM_MAP[matched] || matched;
      }
      return userFirms[0] ? (FIRM_MAP[userFirms[0]] || userFirms[0]) : "";
    },
    [adminFirmFilter, selectedCheck?.firmName, user?.firm, user?.role],
  );

  const refreshKittingRowsForFirm = useCallback(
    (firmName: string) => {
      setKittingFormRows((prev) =>
        prev.map((row) => {
          if (!row.productName) return row;

          const productData = findKycProduct(row.productName, firmName);
          if (!productData) {
            return {
              ...row,
              baseAlumina: 0,
              baseIron: 0,
              baseBd: 0,
              baseAp: 0,
              basePrice: 0,
              al: 0,
              fe: 0,
              bd: 0,
              ap: 0,
              cost: 0,
            };
          }

          const pct = Number.parseFloat(row.percentage) || 0;
          return {
            ...row,
            baseAlumina: productData.alumina,
            baseIron: productData.iron,
            baseBd: productData.bd,
            baseAp: productData.ap,
            basePrice: productData.price,
            al: (productData.alumina * pct) / 100,
            fe: (productData.iron * pct) / 100,
            bd: (productData.bd * pct) / 100,
            ap: (productData.ap * pct) / 100,
            cost: (productData.price * pct) / 100,
          };
        }),
      );
    },
    [findKycProduct],
  );

  const resetKittingForm = () => {
    setKittingFormRows([
      {
        id: 1,
        productName: "",
        percentage: "",
        baseAlumina: 0,
        baseIron: 0,
        baseBd: 0,
        baseAp: 0,
        basePrice: 0,
        al: 0,
        fe: 0,
        bd: 0,
        ap: 0,
        cost: 0,
      },
    ]);
    setExpectedValues(
      DEFAULT_EXPECTED_PROPERTIES.map((r) => ({ ...r, value: "" })),
    );
    setManufacturingCost(1500);
  };

  const handleOpenKittingForm = (item: ProductionItem) => {
    setSelectedCheck(item);
    setSelectedHistoryItem(null);
    setAdminFirmFilter("");
    resetKittingForm();
    setIsKittingDialogOpen(true);
  };

  const handleAdminFirmFilterChange = (value: string) => {
    const firmName = value === "all" ? "" : value;
    setAdminFirmFilter(firmName);
    refreshKittingRowsForFirm(getActiveKycFirm(firmName));
  };

  const loadHistoryItemForRevision = (item: CostingHistoryItem) => {
    setSelectedHistoryItem(item);
    // Find the matching production item or build a mock
    const prodItem: ProductionItem = pendingChecks.find(
      (p) => p.deliveryOrderNo === item.orderNo && p.productName === item.productName,
    ) || {
      id: Number(item.productionId) || 0,
      productionId: item.productionId,
      timestamp: item.timestamp,
      firmName: item.firmName,
      deliveryOrderNo: item.orderNo,
      partyName: item.partyName || "",
      productName: item.productName,
      orderQuantity: item.orderQuantity || 0,
      expectedDeliveryDate: item.expectedDeliveryDate || "",
      priority: item.priority || "",
      note: item.note || "",
      plannedDate: item.plannedDate,
      status: item.status || "",
      uploadSo: item.uploadSo,
      productRate: item.productRate,
      crmName: item.crmName,
      quantityDelivered: item.quantityDelivered,
      productionPending: item.productionPending,
    };
    setSelectedCheck(prodItem);

    const rows: KittingFormRow[] = item.rawMaterials.map((mat, idx) => {
      const qty = item.rawMaterialQtys[idx] || "0";
      const productData = findKycProduct(
        mat,
        getActiveKycFirm(item.firmName || prodItem.firmName || ""),
      ) || { alumina: 0, iron: 0, bd: 0, ap: 0, price: 0 };
      const pct = Number.parseFloat(qty) || 0;
      return {
        id: idx + 1,
        productName: mat,
        percentage: qty,
        baseAlumina: productData.alumina,
        baseIron: productData.iron,
        baseBd: productData.bd,
        baseAp: productData.ap,
        basePrice: productData.price,
        al: (productData.alumina * pct) / 100,
        fe: (productData.iron * pct) / 100,
        bd: (productData.bd * pct) / 100,
        ap: (productData.ap * pct) / 100,
        cost: (productData.price * pct) / 100,
      };
    });

    setKittingFormRows(rows);
    setExpectedValues(
      DEFAULT_EXPECTED_PROPERTIES.map((r) => ({ ...r, value: "" })),
    );
    const firmLower = String(item.firmName || "").toLowerCase();
    const firmDefaultMfgCost = (firmLower.includes("rkl") || firmLower.includes("purab")) ? 2000 : 1500;
    setManufacturingCost(item.manufacturingCost !== undefined && item.manufacturingCost > 0 ? item.manufacturingCost : firmDefaultMfgCost);
    setIsKittingDialogOpen(true);
  };

  const addKittingFormRow = () => {
    if (kittingFormRows.length < 20) {
      setKittingFormRows((prev) => [
        ...prev,
        {
          id: (prev[prev.length - 1]?.id || 0) + 1,
          productName: "",
          percentage: "",
          baseAlumina: 0,
          baseIron: 0,
          baseBd: 0,
          baseAp: 0,
          basePrice: 0,
          al: 0,
          fe: 0,
          bd: 0,
          ap: 0,
          cost: 0,
        },
      ]);
    }
  };

  const removeKittingFormRow = (id: number) => {
    if (kittingFormRows.length > 1) {
      setKittingFormRows((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const handleKittingRowChange = (
    id: number,
    field: keyof KittingFormRow,
    value: any,
  ) => {
    setKittingFormRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: value };

        // If user directly edits calculated fields, just set the value, don't recalculate
        if (
          field === "al" ||
          field === "fe" ||
          field === "bd" ||
          field === "ap" ||
          field === "cost"
        ) {
          return updated;
        }

        if (field === "productName") {
          const p = findKycProduct(value, getActiveKycFirm());
          if (p) {
            updated.baseAlumina = p.alumina;
            updated.baseIron = p.iron;
            updated.baseBd = p.bd;
            updated.baseAp = p.ap;
            updated.basePrice = p.price;
          }
        }
        const pct = Number.parseFloat(updated.percentage) || 0;
        updated.al = (updated.baseAlumina * pct) / 100;
        updated.fe = (updated.baseIron * pct) / 100;
        updated.bd = (updated.baseBd * pct) / 100;
        updated.ap = (updated.baseAp * pct) / 100;
        updated.cost = (updated.basePrice * pct) / 100;
        return updated;
      }),
    );
  };

  // Expected Values — simple single-value per property
  const handleExpectedValueChange = (propIdx: number, value: string) => {
    setExpectedValues((prev) => {
      const updated = [...prev];
      updated[propIdx] = { ...updated[propIdx], value };
      return updated;
    });
  };

  const kittingTotals = useMemo(
    () =>
      kittingFormRows.reduce(
        (acc, row) => {
          acc.al += row.al;
          acc.fe += row.fe;
          acc.bd += row.bd;
          acc.ap += row.ap;
          acc.variableCost += row.cost;
          acc.percentage += Number.parseFloat(row.percentage) || 0;
          return acc;
        },
        { al: 0, fe: 0, bd: 0, ap: 0, percentage: 0, variableCost: 0 },
      ),
    [kittingFormRows],
  );

  const handlePreCostingRowChange = (id: number, field: keyof KittingFormRow, value: any) => {
    setPreCostingFormRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: value };
        if (field === "productName") {
          const targetFirm = preCostingFirmFilter === "all" ? "" : preCostingFirmFilter;
          const p = findKycProduct(value, targetFirm);
          if (p) {
            updated.baseAlumina = p.alumina;
            updated.baseIron = p.iron;
            updated.baseBd = p.bd;
            updated.baseAp = p.ap;
            updated.basePrice = p.price;
          }
        }
        const pct = Number.parseFloat(updated.percentage) || 0;
        updated.al = (updated.baseAlumina * pct) / 100;
        updated.fe = (updated.baseIron * pct) / 100;
        updated.bd = (updated.baseBd * pct) / 100;
        updated.ap = (updated.baseAp * pct) / 100;
        updated.cost = (updated.basePrice * pct) / 100;
        return updated;
      })
    );
  };

  const addPreCostingRow = () => {
    setPreCostingFormRows((prev) => [
      ...prev,
      {
        id: Date.now(),
        productName: "",
        percentage: "",
        baseAlumina: 0,
        baseIron: 0,
        baseBd: 0,
        baseAp: 0,
        basePrice: 0,
        al: 0,
        fe: 0,
        bd: 0,
        ap: 0,
        cost: 0,
      },
    ]);
  };

  const removePreCostingRow = (id: number) => {
    if (preCostingFormRows.length <= 1) return;
    setPreCostingFormRows((prev) => prev.filter((r) => r.id !== id));
  };

  const resetPreCosting = () => {
    setPreCostingFormRows([
      {
        id: 1,
        productName: "",
        percentage: "",
        baseAlumina: 0,
        baseIron: 0,
        baseBd: 0,
        baseAp: 0,
        basePrice: 0,
        al: 0,
        fe: 0,
        bd: 0,
        ap: 0,
        cost: 0,
      },
    ]);
    setPreCostingManufacturingCost(1500);
  };

  const preCostingTotals = useMemo(
    () =>
      preCostingFormRows.reduce(
        (acc, row) => {
          acc.al += row.al;
          acc.fe += row.fe;
          acc.bd += row.bd;
          acc.ap += row.ap;
          acc.variableCost += row.cost;
          acc.percentage += Number.parseFloat(row.percentage) || 0;
          return acc;
        },
        { al: 0, fe: 0, bd: 0, ap: 0, percentage: 0, variableCost: 0 }
      ),
    [preCostingFormRows]
  );

  // ---------- GENERATE COMPOSITION NUMBER ----------
  const generateCompositionNumber = async (): Promise<string> => {
    const { data, error } = await productionApi.get(COSTING_RESPONSE_TABLE);

    if (error) throw error;

    let maxNumber = 0;
    (data || []).forEach((row: any) => {
      const cn = row.compositionNo || row["Composition No."];
      if (cn && typeof cn === "string" && cn.startsWith("CN-")) {
        const num = Number.parseInt(cn.substring(3));
        if (!isNaN(num) && num > maxNumber) maxNumber = num;
      }
    });
    return `CN-${String(maxNumber + 1).padStart(3, "0")}`;
  };

  // ---------- AUTOFILL DUMMY DATA (DEV ONLY) ----------
  const autofillDummyData = () => {
    if (kycProducts.length < 2) {
      toast({
        title: "Dev Tool",
        description: "Not enough products in KYC to autofill.",
        variant: "destructive",
      });
      return;
    }

    // Pick 3 random materials
    const selected: KycProduct[] = [];
    const available = [...kycProducts];
    for (let i = 0; i < 3; i++) {
      if (available.length === 0) break;
      const idx = Math.floor(Math.random() * available.length);
      selected.push(available.splice(idx, 1)[0]);
    }

    // Assign percentages (e.g., 50, 30, 20)
    const pcts = [50, 30, 20];
    const rows: KittingFormRow[] = selected.map((p, i) => {
      const pct = pcts[i] || 0;
      return {
        id: i + 1,
        productName: p.productName,
        percentage: String(pct),
        baseAlumina: p.alumina,
        baseIron: p.iron,
        baseBd: p.bd,
        baseAp: p.ap,
        basePrice: p.price,
        al: (p.alumina * pct) / 100,
        fe: (p.iron * pct) / 100,
        bd: (p.bd * pct) / 100,
        ap: (p.ap * pct) / 100,
        cost: (p.price * pct) / 100,
      };
    });
    setKittingFormRows(rows);

    // Fill expected values with realistic dummy data
    const dummyExpected = [
      "12-14",
      "Sticky",
      "45",
      "120",
      "2.10",
      "2.05",
      "450",
      "400",
      "0.2",
    ];
    setExpectedValues((prev) =>
      prev.map((r, i) => ({ ...r, value: dummyExpected[i] || "" })),
    );

    toast({
      title: "Dev Tool",
      description: "Dummy data autofilled successfully.",
    });
  };

  // ---------- SAVE ----------
  const handleSaveKittingForm = async () => {
    if (!selectedCheck) return;
    setIsSubmitting(true);
    try {
      const compositionNumber = await generateCompositionNumber();

      // Raw material rows entered in the kitting form, mapped to the
      // ProductionCostingMaterial relation shape (materialName/quantity/sequence).
      const materialRows = kittingFormRows.filter((row) => row?.productName);

      // NOTE: ProductionCosting (the real Prisma model) has no columns for the
      // BD/AP composition totals or the "Expected Values" block (W/C %, Sticky/
      // Flow, IST, FST, BD/CCS/PLC at 110C & 1100C) that the old Supabase sheet
      // stored — there is nothing to map them onto, so they are intentionally
      // left off this payload rather than being written to the wrong field.
      const insertPayload: Record<string, any> = {
        compositionNo: compositionNumber,
        orderId: selectedCheck.productionId ? String(selectedCheck.productionId) : null,
        aluminaPercent: kittingTotals.al,
        ironPercent: kittingTotals.fe,
        variableCost: kittingTotals.variableCost,
        manufacturingCost: manufacturingCost || 1500,
        sellingPrice: kittingTotals.variableCost + (manufacturingCost || 1500),
        ...(materialRows.length > 0
          ? {
              materials: {
                create: materialRows.map((row, i) => ({
                  materialName: row.productName,
                  quantity: Number(row.percentage) || 0,
                  sequence: i + 1,
                })),
              },
            }
          : {}),
      };

      const { error: insertErr } = await productionApi.post(COSTING_RESPONSE_TABLE, insertPayload);

      if (insertErr) throw insertErr;

      // Update or create the production record for this exact order/product.
      if (selectedCheck?.deliveryOrderNo) {
        const completedAt = new Date().toISOString().slice(0, 10);
        const toNumberOrNull = (value: any) => {
          if (
            value === null ||
            value === undefined ||
            String(value).trim() === ""
          )
            return null;
          const parsed = Number(value);
          return Number.isNaN(parsed) ? null : parsed;
        };
        const toDateOrNull = (value: any) => {
          if (!value || String(value).trim() === "-") return null;
          const text = String(value).trim();
          if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

          const ddmmyyyy = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
          if (ddmmyyyy) {
            const [, dd, mm, yy] = ddmmyyyy;
            const yyyy = yy.length === 2 ? `20${yy}` : yy;
            return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
          }

          const parsed = new Date(text);
          return Number.isNaN(parsed.getTime())
            ? null
            : parsed.toISOString().slice(0, 10);
        };
        // NOTE: ProductionOrder (the real Prisma model) has no columns for the
        // free-text note, "Production Pending" quantity, planned date, selling
        // rate, or uploaded SO file that the old Supabase sheet stored, so
        // those are intentionally left off this payload. "status" is the
        // closest real field to mark this order as having completed full
        // kitting, replacing the old "Actual 1" completion timestamp.
        const productionPayload: Record<string, any> = {
          deliveryOrderNo: selectedCheck.deliveryOrderNo,
          firmName: selectedCheck.firmName || null,
          partyName: selectedCheck.partyName || null,
          productName: selectedCheck.productName || null,
          orderQuantity: toNumberOrNull(selectedCheck.orderQuantity),
          expectedDeliveryDate: toDateOrNull(
            selectedCheck.expectedDeliveryDate,
          ),
          priority: selectedCheck.priority || null,
          crmName: selectedCheck.crmName || null,
          quantityDelivered: toNumberOrNull(selectedCheck.quantityDelivered),
          status: selectedCheck.status || "Kitted",
        };

        const { data: prodData, error: prodFetchErr } = await productionApi.get(PRODUCTION_TABLE);
        if (prodFetchErr) throw prodFetchErr;
        const targetRow = (prodData || []).find((r: any) =>
            r.firmName === selectedCheck.firmName &&
            r.partyName === selectedCheck.partyName &&
            r.productName === selectedCheck.productName
        );

        let updatedRows: any[] | null = null;
        if (targetRow?.id) {
           const { data, error } = await productionApi.patch(PRODUCTION_TABLE, targetRow.id, productionPayload);
           if (error) throw error;
           updatedRows = data ? [data] : [];
        }

        if (!updatedRows || updatedRows.length === 0) {
          const { error: insertProdErr } = await productionApi.post(PRODUCTION_TABLE, productionPayload);

          if (insertProdErr) throw insertProdErr;
        }
      }

      setIsKittingDialogOpen(false);
      setSelectedCheck(null);
      setSelectedHistoryItem(null);
      await loadData();
      toast({
        title: "Success!",
        description: "Full Kitting data submitted successfully.",
        duration: 2000,
      });
    } catch (err: any) {
      toast({
        title: "Error!",
        description: err.message,
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------- COLUMN TOGGLING ----------
  const handleToggleColumn = (
    tab: "pending" | "history",
    dataKey: string,
    checked: boolean,
  ) => {
    const setter =
      tab === "pending" ? setVisiblePendingColumns : setVisibleHistoryColumns;
    setter((prev) => ({ ...prev, [dataKey]: checked }));
  };

  const handleSelectAllColumns = (
    tab: "pending" | "history",
    meta: any[],
    checked: boolean,
  ) => {
    const setter =
      tab === "pending" ? setVisiblePendingColumns : setVisibleHistoryColumns;
    setter((prev) => ({
      ...prev,
      ...meta.reduce(
        (acc, col) => {
          if (col.toggleable) acc[col.dataKey] = checked;
          return acc;
        },
        {} as Record<string, boolean>,
      ),
    }));
  };

  const visiblePendingMeta = useMemo(
    () => PENDING_COLUMNS_META.filter((c) => visiblePendingColumns[c.dataKey]),
    [visiblePendingColumns],
  );
  const visibleHistoryMeta = useMemo(
    () => HISTORY_COLUMNS_META.filter((c) => visibleHistoryColumns[c.dataKey]),
    [visibleHistoryColumns],
  );

  // ---------- RENDER ----------
  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-olive-600" />
      </div>
    );

  if (error)
    return (
      <div className="p-8 text-center text-red-600 bg-red-50 rounded-md">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
        <p className="text-lg font-semibold">Error Loading Data</p>
        <p>{error}</p>
        <Button
          onClick={loadData}
          className="mt-4 bg-olive-600 text-white hover:bg-olive-700"
        >
          Retry
        </Button>
      </div>
    );

  return (
    <div className="space-y-6 p-4 md:p-6 bg-white min-h-screen">
      <Toaster />

      <Card className="shadow-md border-none">
        <CardHeader className="bg-gradient-to-r from-olive-50 to-olive-100 rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <CheckCircle className="h-6 w-6 text-olive-600" />
            Composition By Lab
          </CardTitle>
          <CardDescription>
            Verify items after the full kitting process.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col lg:flex-row gap-4 mb-6 lg:items-center lg:justify-between">
              <TabsList className="grid w-full lg:w-[480px] grid-cols-3">
                <TabsTrigger value="pending" className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" /> Pending
                  <Badge
                    variant="secondary"
                    className="ml-1 px-1.5 py-0.5 text-xs"
                  >
                    {filteredPendingChecks.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" /> History
                  <Badge
                    variant="secondary"
                    className="ml-1 px-1.5 py-0.5 text-xs"
                  >
                    {filteredHistoryChecks.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="pre-costing" className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" /> Pre Costing
                </TabsTrigger>
              </TabsList>

              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-center">
                {/* Search Input */}
                <div className="relative w-full sm:w-64">
                  <Input
                    placeholder="Search orders, products, parties..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-8 py-2 text-sm h-9 border-slate-200 focus:border-olive-500 focus:ring-olive-500 rounded-md"
                  />
                  <div className="absolute left-2.5 top-2.5 text-gray-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.602 10.602z"
                      />
                    </svg>
                  </div>
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSearchTerm("")}
                      className="absolute right-1 top-1 h-7 w-7 text-gray-400 hover:text-gray-600 hover:bg-transparent"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Firm Dropdown Filter */}
                <div className="w-full sm:w-48">
                  
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-10 rounded-xl border-gray-200 justify-between font-normal text-muted-foreground hover:bg-transparent min-w-[140px]">
                      {firmFilter.length === 0 ? "All Firms" : `${firmFilter.length} Firm${firmFilter.length > 1 ? 's' : ''} Selected`}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 rounded-xl">
                    <DropdownMenuLabel>Filter by Firm</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {uniqueFirms.map((firm) => (
                      <DropdownMenuCheckboxItem
                        key={firm}
                        checked={firmFilter.includes(firm)}
                        onCheckedChange={(checked: boolean) => {
                          if (checked) {
                            setFirmFilter([...firmFilter, firm])
                          } else {
                            setFirmFilter(firmFilter.filter((f) => f !== firm))
                          }
                        }}
                      >
                        {firm}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                </div>
              </div>
            </div>

            {/* ──── PENDING ──── */}
            <TabsContent value="pending">
              <Card>
                <CardHeader className="py-3 px-4 bg-muted/30">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base">Pending Items</CardTitle>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                        >
                          <Settings className="mr-2 h-4 w-4" /> Columns
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-56">
                        <h4 className="font-medium text-sm mb-2">
                          Toggle Columns
                        </h4>
                        <div className="flex justify-between mb-2">
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto text-xs"
                            onClick={() =>
                              handleSelectAllColumns(
                                "pending",
                                PENDING_COLUMNS_META,
                                true,
                              )
                            }
                          >
                            Select All
                          </Button>
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto text-xs"
                            onClick={() =>
                              handleSelectAllColumns(
                                "pending",
                                PENDING_COLUMNS_META,
                                false,
                              )
                            }
                          >
                            Deselect All
                          </Button>
                        </div>
                        <hr className="mb-2" />
                        {PENDING_COLUMNS_META.filter((c) => c.toggleable).map(
                          (col) => (
                            <div
                              key={col.dataKey}
                              className="flex items-center space-x-2 my-1"
                            >
                              <Checkbox
                                id={`p-${col.dataKey}`}
                                checked={!!visiblePendingColumns[col.dataKey]}
                                onCheckedChange={(v) =>
                                  handleToggleColumn(
                                    "pending",
                                    col.dataKey,
                                    !!v,
                                  )
                                }
                              />
                              <Label
                                htmlFor={`p-${col.dataKey}`}
                                className="font-normal text-sm"
                              >
                                {col.header}
                              </Label>
                            </div>
                          ),
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="relative max-h-[600px] overflow-auto rounded-lg border">
                    <table className="w-full caption-bottom text-sm min-w-max border-separate border-spacing-0">
                      <TableHeader className="sticky top-0 z-20 bg-slate-100">
                        <TableRow>
                          {visiblePendingMeta.map((c) => (
                            <TableHead
                              key={c.dataKey}
                              className="sticky top-0 z-20 bg-slate-100 shadow-sm"
                            >
                              {c.header}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPendingChecks.length > 0 ? (
                          filteredPendingChecks.map((item) => (
                            <TableRow key={item.id}>
                              {visiblePendingMeta.map((col) => (
                                <TableCell key={col.dataKey}>
                                  {col.dataKey === "actionColumn" ? (
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        handleOpenKittingForm(item)
                                      }
                                      className="bg-olive-600 text-white hover:bg-olive-700"
                                    >
                                      <CheckCircle className="mr-2 h-4 w-4" />{" "}
                                      Verify
                                    </Button>
                                  ) : col.dataKey === "priority" ? (
                                    <Badge
                                      className={
                                        item.priority === "Urgent"
                                          ? "bg-red-100 text-red-800"
                                          : "bg-green-100 text-green-800"
                                      }
                                    >
                                      {item.priority || "-"}
                                    </Badge>
                                  ) : (
                                    String((item as any)[col.dataKey] ?? "-")
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={visiblePendingMeta.length}
                              className="h-24 text-center text-gray-400"
                            >
                              No pending items.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ──── HISTORY ──── */}
            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base">
                      Costing Response History
                    </CardTitle>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Settings className="mr-2 h-4 w-4" /> Columns
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-56">
                        <h4 className="font-medium text-sm mb-2">
                          Toggle Columns
                        </h4>
                        <div className="flex justify-between mb-2">
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto text-xs"
                            onClick={() =>
                              handleSelectAllColumns(
                                "history",
                                HISTORY_COLUMNS_META,
                                true,
                              )
                            }
                          >
                            Select All
                          </Button>
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto text-xs"
                            onClick={() =>
                              handleSelectAllColumns(
                                "history",
                                HISTORY_COLUMNS_META,
                                false,
                              )
                            }
                          >
                            Deselect All
                          </Button>
                        </div>
                        <hr className="mb-2" />
                        {HISTORY_COLUMNS_META.filter((c) => c.toggleable).map(
                          (col) => (
                            <div
                              key={col.dataKey}
                              className="flex items-center space-x-2 my-1"
                            >
                              <Checkbox
                                id={`h-${col.dataKey}`}
                                checked={!!visibleHistoryColumns[col.dataKey]}
                                onCheckedChange={(v) =>
                                  handleToggleColumn(
                                    "history",
                                    col.dataKey,
                                    !!v,
                                  )
                                }
                              />
                              <Label
                                htmlFor={`h-${col.dataKey}`}
                                className="font-normal text-sm"
                              >
                                {col.header}
                              </Label>
                            </div>
                          ),
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="relative max-h-[600px] overflow-auto rounded-lg border">
                    <table className="w-full caption-bottom text-sm min-w-max border-separate border-spacing-0">
                      <TableHeader className="sticky top-0 z-20 bg-slate-100">
                        <TableRow>
                          {visibleHistoryMeta.map((c) => (
                            <TableHead
                              key={c.dataKey}
                              className="sticky top-0 z-20 bg-slate-100 shadow-sm"
                            >
                              {c.header}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredHistoryChecks.length > 0 ? (
                          filteredHistoryChecks.map((item) => (
                            <TableRow key={item.id}>
                              {visibleHistoryMeta.map((col) => (
                                <TableCell key={col.dataKey}>
                                  {col.dataKey === "actionColumn" ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        loadHistoryItemForRevision(item)
                                      }
                                      className="h-8"
                                    >
                                      <Edit className="h-4 w-4 mr-1" /> Revise
                                    </Button>
                                  ) : col.dataKey === "rawMaterials" ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        setViewingMaterials({
                                          names: item.rawMaterials,
                                          qtys: item.rawMaterialQtys,
                                        })
                                      }
                                      className="h-7 text-xs"
                                    >
                                      <Eye className="h-3.5 w-3.5 mr-1" /> View
                                      ({item.rawMaterials.length})
                                    </Button>
                                  ) : col.dataKey === "alumina" ? (
                                    item.alumina.toFixed(4)
                                  ) : col.dataKey === "iron" ? (
                                    item.iron.toFixed(4)
                                  ) : col.dataKey === "gp" ? (
                                    item.gp !== null ? `${item.gp.toFixed(2)}%` : "-"
                                  ) : col.dataKey === "bd" ? (
                                    item.bd.toFixed(4)
                                  ) : col.dataKey === "ap" ? (
                                    item.ap.toFixed(4)
                                  ) : (
                                    String((item as any)[col.dataKey] ?? "-")
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={visibleHistoryMeta.length}
                              className="h-24 text-center text-gray-400"
                            >
                              No history items found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ──── PRE COSTING TRIAL TAB ──── */}
            <TabsContent value="pre-costing" className="mt-4">
              <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden">
                <CardHeader className="bg-slate-50 border-b border-slate-200 py-4 px-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-emerald-600" />
                        Raw Materials Composition (Pre Costing Trial)
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500 mt-1">
                        Build and test custom raw material blend recipes to simulate specifications and costing.
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetPreCosting}
                        className="h-8 text-xs gap-1.5 text-slate-600 hover:bg-slate-100"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reset
                      </Button>
                      <Button
                        size="sm"
                        onClick={addPreCostingRow}
                        className="h-8 text-xs gap-1.5 bg-slate-900 text-white hover:bg-slate-800"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Material
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-6 overflow-x-auto">
                  <Table className="border rounded-md text-xs">
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="w-[40px] p-2">#</TableHead>
                        <TableHead className="min-w-[200px] p-2">Material</TableHead>
                        <TableHead className="p-2">AL</TableHead>
                        <TableHead className="p-2">FE</TableHead>
                        <TableHead className="p-2">BD</TableHead>
                        <TableHead className="p-2">AP</TableHead>
                        <TableHead className="bg-yellow-100 min-w-[110px] p-2 font-semibold text-amber-900">
                          % (Input)
                        </TableHead>
                        <TableHead className="p-2 min-w-[90px]">Price (₹)</TableHead>
                        <TableHead className="p-2">AL (Calc)</TableHead>
                        <TableHead className="p-2">FE (Calc)</TableHead>
                        <TableHead className="p-2">BD (Calc)</TableHead>
                        <TableHead className="p-2">AP (Calc)</TableHead>
                        <TableHead className="bg-green-50 min-w-[110px] p-2 font-semibold text-emerald-900">
                          Cost (₹)
                        </TableHead>
                        <TableHead className="p-2 w-[40px]">Del</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preCostingFormRows.map((row, idx) => (
                        <TableRow key={row.id}>
                          <TableCell className="p-2 text-sm">{idx + 1}</TableCell>
                          <TableCell className="p-2">
                            <Popover
                              open={openPreCostingPopoverId === row.id}
                              onOpenChange={(open) => {
                                if (open) {
                                  setOpenPreCostingPopoverId(row.id);
                                  setPreCostingMaterialSearchQuery("");
                                } else {
                                  setOpenPreCostingPopoverId(null);
                                }
                              }}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className="w-full justify-between h-8 text-xs font-normal px-2 bg-white border border-input hover:bg-accent hover:text-accent-foreground"
                                >
                                  <span className="truncate">
                                    {row.productName || "Select material"}
                                  </span>
                                  <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[300px] p-2" align="start">
                                <div className="space-y-2">
                                  <Input
                                    placeholder="Search material..."
                                    value={preCostingMaterialSearchQuery}
                                    onChange={(e) => setPreCostingMaterialSearchQuery(e.target.value)}
                                    className="h-8 text-xs"
                                    autoFocus
                                  />
                                  <div
                                    className="max-h-[250px] overflow-y-auto overscroll-contain space-y-0.5 touch-pan-y pr-1"
                                    onWheel={(e) => e.stopPropagation()}
                                    onTouchMove={(e) => e.stopPropagation()}
                                  >
                                    {(() => {
                                      const filtered = filteredKycProducts.filter((p) =>
                                        String(p.productName || "")
                                          .toLowerCase()
                                          .includes(preCostingMaterialSearchQuery.toLowerCase())
                                      );

                                      if (filtered.length === 0) {
                                        return (
                                          <p className="text-xs text-muted-foreground text-center py-2">
                                            No materials found.
                                          </p>
                                        );
                                      }

                                      return filtered.map((p) => (
                                        <button
                                          key={`${p.id}-${p.productName}`}
                                          type="button"
                                          className={cn(
                                            "w-full text-left px-2 py-1.5 text-xs rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors truncate block",
                                            row.productName === p.productName && "bg-slate-100 dark:bg-slate-800 font-medium"
                                          )}
                                          onClick={() => {
                                            handlePreCostingRowChange(row.id, "productName", p.productName);
                                            setOpenPreCostingPopoverId(null);
                                          }}
                                        >
                                          {p.productName}
                                        </button>
                                      ));
                                    })()}
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </TableCell>
                          <TableCell className="p-2 text-xs">
                            {row.baseAlumina.toFixed(2)}
                          </TableCell>
                          <TableCell className="p-2 text-xs">
                            {row.baseIron.toFixed(2)}
                          </TableCell>
                          <TableCell className="p-2 text-xs">
                            {row.baseBd.toFixed(2)}
                          </TableCell>
                          <TableCell className="p-2 text-xs">
                            {row.baseAp.toFixed(2)}
                          </TableCell>
                          <TableCell className="bg-yellow-50 p-2">
                            <Input
                              type="number"
                              value={row.percentage}
                              onChange={(e) =>
                                handlePreCostingRowChange(
                                  row.id,
                                  "percentage",
                                  e.target.value,
                                )
                              }
                              placeholder="e.g. 30"
                              className="h-8 text-xs"
                            />
                          </TableCell>
                          <TableCell className="p-2 text-xs font-medium text-slate-700">
                            ₹{row.basePrice ? row.basePrice.toFixed(2) : "0.00"}
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              type="number"
                              value={row.al}
                              onChange={(e) =>
                                handlePreCostingRowChange(
                                  row.id,
                                  "al",
                                  Number(e.target.value),
                                )
                              }
                              className="h-8 text-xs"
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              type="number"
                              value={row.fe}
                              onChange={(e) =>
                                handlePreCostingRowChange(
                                  row.id,
                                  "fe",
                                  Number(e.target.value),
                                )
                              }
                              className="h-8 text-xs"
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              type="number"
                              value={row.bd}
                              onChange={(e) =>
                                handlePreCostingRowChange(
                                  row.id,
                                  "bd",
                                  Number(e.target.value),
                                )
                              }
                              className="h-8 text-xs"
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              type="number"
                              value={row.ap}
                              onChange={(e) =>
                                handlePreCostingRowChange(
                                  row.id,
                                  "ap",
                                  Number(e.target.value),
                                )
                              }
                              className="h-8 text-xs"
                            />
                          </TableCell>
                          <TableCell className="bg-green-50 p-2">
                            <Input
                              type="number"
                              value={row.cost}
                              onChange={(e) =>
                                handlePreCostingRowChange(
                                  row.id,
                                  "cost",
                                  Number(e.target.value),
                                )
                              }
                              className="h-8 text-xs font-semibold"
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removePreCostingRow(row.id)}
                            >
                              <X className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="bg-slate-50 font-bold text-xs">
                        <TableCell colSpan={6} className="text-right p-2 text-slate-600">
                          Raw Material Cost Subtotal
                        </TableCell>
                        <TableCell className="bg-yellow-100 p-2">
                          {preCostingTotals.percentage.toFixed(2)}%
                        </TableCell>
                        <TableCell className="p-2 text-xs font-semibold text-slate-400">
                          -
                        </TableCell>
                        <TableCell className="p-2">
                          {preCostingTotals.al.toFixed(4)}
                        </TableCell>
                        <TableCell className="p-2">
                          {preCostingTotals.fe.toFixed(4)}
                        </TableCell>
                        <TableCell className="p-2">
                          {preCostingTotals.bd.toFixed(4)}
                        </TableCell>
                        <TableCell className="p-2">
                          {preCostingTotals.ap.toFixed(4)}
                        </TableCell>
                        <TableCell className="bg-green-50 p-2 font-bold text-slate-800">
                          ₹{preCostingTotals.variableCost.toFixed(2)}
                        </TableCell>
                        <TableCell className="p-2" />
                      </TableRow>
                      <TableRow className="bg-amber-50/70 font-semibold text-xs border-t">
                        <TableCell colSpan={12} className="text-right p-2 text-amber-900 font-medium">
                          + Manufacturing Cost (₹)
                        </TableCell>
                        <TableCell className="bg-amber-100/80 p-1">
                          <Input
                            type="number"
                            value={preCostingManufacturingCost}
                            onChange={(e) => setPreCostingManufacturingCost(Number(e.target.value) || 0)}
                            className="h-7 text-xs font-bold text-amber-900 border-amber-300 bg-white text-right px-2"
                          />
                        </TableCell>
                        <TableCell className="p-2" />
                      </TableRow>
                      <TableRow className="bg-emerald-100/80 font-bold text-sm border-t-2 border-emerald-300">
                        <TableCell colSpan={12} className="text-right p-2.5 text-emerald-950 uppercase tracking-wide">
                          = TOTAL COST (₹)
                        </TableCell>
                        <TableCell className="bg-emerald-200/90 p-2 text-emerald-950 font-black text-base text-right">
                          ₹{(preCostingTotals.variableCost + (preCostingManufacturingCost || 0)).toFixed(2)}
                        </TableCell>
                        <TableCell className="p-2" />
                      </TableRow>
                    </TableFooter>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ──── Raw Materials Dialog ──── */}
      <Sheet
        open={!!viewingMaterials}
        onOpenChange={() => setViewingMaterials(null)}
      >
        <SheetContent className="max-w-lg sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Raw Materials Used</SheetTitle>
            <SheetDescription>
              Detailed list of raw materials and their percentages.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col flex-1 min-h-0 mt-4">
            <SheetBody>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Quantity (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewingMaterials?.names.map((name, i) => (
                    <TableRow key={i}>
                      <TableCell>{name}</TableCell>
                      <TableCell>{viewingMaterials.qtys[i] || "0"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </SheetBody>
          </div>
        </SheetContent>
      </Sheet>

      {/* ──── Full Kitting Dialog ──── */}
      {/* modal={false}: this dialog contains a nested material-select Popover.
          Radix Dialog's default modal mode sets pointer-events:none on <body> and
          only re-enables it for the Dialog's own content — the Popover, being a
          separate sibling portal, never gets exempted, so every click on it (even
          though it paints correctly on top) falls through to the dialog beneath.
          Non-modal keeps the visual overlay/backdrop but drops that interaction lock. */}
      <Sheet open={isKittingDialogOpen} onOpenChange={setIsKittingDialogOpen} modal={false}>
        <SheetContent className="max-w-7xl sm:max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col p-0">
          <SheetHeader className="p-6 pb-2">
            <SheetTitle>
              Full Kitting Details{" "}
              {selectedHistoryItem
                ? `— Revising ${selectedHistoryItem.compositionNo}`
                : ""}
            </SheetTitle>
            <SheetDescription>
              Review and verify the raw material composition and expected
              values.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col flex-1 min-h-0">
            <SheetBody className="space-y-6 p-6 pt-2">
            {/* Order Info */}
            <div className="grid grid-cols-3 gap-4 px-1">
              <div>
                <Label className="text-xs text-gray-500">
                  Delivery Order No.
                </Label>
                <Input
                  value={selectedCheck?.deliveryOrderNo || ""}
                  readOnly
                  className="bg-gray-50 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Product Name</Label>
                <Input
                  value={selectedCheck?.productName || ""}
                  readOnly
                  className="bg-gray-50 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Planned Date</Label>
                <Input
                  value={selectedCheck?.plannedDate || "-"}
                  readOnly
                  className="bg-gray-50 mt-1"
                />
              </div>
            </div>

            {/* Raw Materials Composition Table */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-sm text-gray-700">
                  Raw Materials Composition
                </h3>
                <div className="flex gap-2">
                  {process.env.NODE_ENV === "development" && (
                    <Button
                      onClick={autofillDummyData}
                      size="sm"
                      variant="outline"
                      className="text-amber-600 border-amber-200 hover:bg-amber-50"
                    >
                      <Zap className="h-4 w-4 mr-1" /> Autofill (Dev)
                    </Button>
                  )}
                  <Button
                    onClick={addKittingFormRow}
                    disabled={kittingFormRows.length >= 20}
                    size="sm"
                    className="bg-olive-600 text-white hover:bg-olive-700"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Row
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto border rounded-lg">
                <Table>
                  <TableHeader className="bg-slate-100">
                    <TableRow>
                      <TableHead className="w-10 p-2">#</TableHead>
                      <TableHead className="min-w-[180px] p-2">
                        Material
                      </TableHead>
                      <TableHead className="p-2">AL</TableHead>
                      <TableHead className="p-2">FE</TableHead>
                      <TableHead className="p-2">BD</TableHead>
                      <TableHead className="p-2">AP</TableHead>
                      <TableHead className="bg-yellow-100 min-w-[110px] p-2">
                        % (Input)
                      </TableHead>
                      <TableHead className="p-2 min-w-[90px]">Price (₹)</TableHead>
                      <TableHead className="p-2">AL (Calc)</TableHead>
                      <TableHead className="p-2">FE (Calc)</TableHead>
                      <TableHead className="p-2">BD (Calc)</TableHead>
                      <TableHead className="p-2">AP (Calc)</TableHead>
                      <TableHead className="bg-green-50 min-w-[110px] p-2">
                        Cost (₹)
                      </TableHead>
                      <TableHead className="p-2">Del</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kittingFormRows.map((row, idx) => (
                      <TableRow key={row.id}>
                        <TableCell className="p-2 text-sm">{idx + 1}</TableCell>
                        <TableCell className="p-2">
                          <Popover
                            open={openPopoverId === row.id}
                            onOpenChange={(open) => {
                              if (open) {
                                setOpenPopoverId(row.id);
                                setMaterialSearchQuery("");
                              } else {
                                setOpenPopoverId(null);
                              }
                            }}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between h-8 text-xs font-normal px-2 bg-white border border-input hover:bg-accent hover:text-accent-foreground"
                              >
                                <span className="truncate">
                                  {row.productName || "Select material"}
                                </span>
                                <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            {/* z-[60]: this popover opens while the parent Dialog (also z-50)
                                is already open — equal z-index left the dialog's own later
                                content (e.g. the Manufacturing Cost row) intercepting clicks
                                meant for the material list underneath it. */}
                            <PopoverContent className="w-[300px] p-2 z-[60]" align="start">
                              <div className="space-y-2">
                                <Input
                                  placeholder="Search material..."
                                  value={materialSearchQuery}
                                  onChange={(e) => setMaterialSearchQuery(e.target.value)}
                                  className="h-8 text-xs"
                                  autoFocus
                                />
                                <div
                                  className="max-h-[250px] overflow-y-auto overscroll-contain space-y-0.5 touch-pan-y pr-1"
                                  onWheel={(e) => e.stopPropagation()}
                                  onTouchMove={(e) => e.stopPropagation()}
                                >
                                  {(() => {
                                    const filtered = filteredKycProducts.filter((p) => {
                                      const normPFirm = normalizeLookupValue(p.firmName);
                                      const normSelectedFirm = normalizeLookupValue(selectedCheck?.firmName);

                                      const checkFirmOk =
                                        !selectedCheck?.firmName ||
                                        normPFirm === normSelectedFirm ||
                                        normPFirm.includes(normSelectedFirm) ||
                                        normSelectedFirm.includes(normPFirm);

                                      const searchOk = String(p.productName || "")
                                        .toLowerCase()
                                        .includes(materialSearchQuery.toLowerCase());

                                      return checkFirmOk && searchOk;
                                    });

                                    if (filtered.length === 0) {
                                      return (
                                        <p className="text-xs text-muted-foreground text-center py-2">
                                          No materials found.
                                        </p>
                                      );
                                    }

                                    return filtered.map((p) => (
                                      <button
                                        key={`${p.id}-${p.productName}`}
                                        type="button"
                                        className={cn(
                                          "w-full text-left px-2 py-1.5 text-xs rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors truncate block",
                                          row.productName === p.productName && "bg-slate-100 dark:bg-slate-800 font-medium"
                                        )}
                                        onClick={() => {
                                          handleKittingRowChange(row.id, "productName", p.productName);
                                          setOpenPopoverId(null);
                                        }}
                                      >
                                        {p.productName}
                                      </button>
                                    ));
                                  })()}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                        <TableCell className="p-2 text-xs">
                          {row.baseAlumina.toFixed(2)}
                        </TableCell>
                        <TableCell className="p-2 text-xs">
                          {row.baseIron.toFixed(2)}
                        </TableCell>
                        <TableCell className="p-2 text-xs">
                          {row.baseBd.toFixed(2)}
                        </TableCell>
                        <TableCell className="p-2 text-xs">
                          {row.baseAp.toFixed(2)}
                        </TableCell>
                        <TableCell className="bg-yellow-50 p-2">
                          <Input
                            type="number"
                            value={row.percentage}
                            onChange={(e) =>
                              handleKittingRowChange(
                                row.id,
                                "percentage",
                                e.target.value,
                              )
                            }
                            placeholder="e.g. 30"
                            className="h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell className="p-2 text-xs font-medium text-slate-700">
                          ₹{row.basePrice ? row.basePrice.toFixed(2) : "0.00"}
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            type="number"
                            value={row.al}
                            onChange={(e) =>
                              handleKittingRowChange(
                                row.id,
                                "al",
                                Number(e.target.value),
                              )
                            }
                            className="h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            type="number"
                            value={row.fe}
                            onChange={(e) =>
                              handleKittingRowChange(
                                row.id,
                                "fe",
                                Number(e.target.value),
                              )
                            }
                            className="h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            type="number"
                            value={row.bd}
                            onChange={(e) =>
                              handleKittingRowChange(
                                row.id,
                                "bd",
                                Number(e.target.value),
                              )
                            }
                            className="h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            type="number"
                            value={row.ap}
                            onChange={(e) =>
                              handleKittingRowChange(
                                row.id,
                                "ap",
                                Number(e.target.value),
                              )
                            }
                            className="h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell className="bg-green-50 p-2">
                          <Input
                            type="number"
                            value={row.cost}
                            onChange={(e) =>
                              handleKittingRowChange(
                                row.id,
                                "cost",
                                Number(e.target.value),
                              )
                            }
                            className="h-8 text-xs font-semibold"
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeKittingFormRow(row.id)}
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-slate-50 font-bold text-xs">
                      <TableCell colSpan={6} className="text-right p-2 text-slate-600">
                        Raw Material Cost Subtotal
                      </TableCell>
                      <TableCell className="bg-yellow-100 p-2">
                        {kittingTotals.percentage.toFixed(2)}%
                      </TableCell>
                      <TableCell className="p-2 text-xs font-semibold text-slate-400">
                        -
                      </TableCell>
                      <TableCell className="p-2">
                        {kittingTotals.al.toFixed(4)}
                      </TableCell>
                      <TableCell className="p-2">
                        {kittingTotals.fe.toFixed(4)}
                      </TableCell>
                      <TableCell className="p-2">
                        {kittingTotals.bd.toFixed(4)}
                      </TableCell>
                      <TableCell className="p-2">
                        {kittingTotals.ap.toFixed(4)}
                      </TableCell>
                      <TableCell className="bg-green-50 p-2 font-bold text-slate-800">
                        ₹{kittingTotals.variableCost.toFixed(2)}
                      </TableCell>
                      <TableCell className="p-2" />
                    </TableRow>
                    <TableRow className="bg-amber-50/70 font-semibold text-xs border-t">
                      <TableCell colSpan={12} className="text-right p-2 text-amber-900 font-medium">
                        + Manufacturing Cost (₹)
                      </TableCell>
                      <TableCell className="bg-amber-100/80 p-1">
                        <Input
                          type="number"
                          value={manufacturingCost}
                          onChange={(e) => setManufacturingCost(Number(e.target.value) || 0)}
                          className="h-7 text-xs font-bold text-amber-900 border-amber-300 bg-white text-right px-2"
                        />
                      </TableCell>
                      <TableCell className="p-2" />
                    </TableRow>
                    <TableRow className="bg-emerald-100/80 font-bold text-sm border-t-2 border-emerald-300">
                      <TableCell colSpan={12} className="text-right p-2 text-emerald-950 font-bold">
                        = Total Cost (₹)
                      </TableCell>
                      <TableCell className="bg-emerald-200/90 p-2 text-emerald-950 font-extrabold text-sm">
                        ₹{(kittingTotals.variableCost + (manufacturingCost || 0)).toFixed(2)}
                      </TableCell>
                      <TableCell className="p-2" />
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </div>

            {/* Expected Values Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm text-gray-700">
                  Expected Values
                </h3>
                <span className="text-xs text-gray-500 bg-olive-50 border border-olive-200 rounded px-2 py-0.5">
                  Product: <strong>{selectedCheck?.productName || "—"}</strong>
                </span>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-olive-50">
                      <th className="border border-gray-200 p-2.5 text-left font-semibold text-gray-700 w-[65%]">
                        Property / Parameter
                      </th>
                      <th className="border border-gray-200 p-2.5 text-center font-semibold text-olive-700 w-[35%]">
                        Expected Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {expectedValues.map((evRow, rowIdx) => (
                      <tr
                        key={evRow.property}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="border border-gray-200 p-2 font-medium text-gray-700">
                          {evRow.property}
                        </td>
                        <td className="border border-gray-200 p-1">
                          <Input
                            value={evRow.value}
                            onChange={(e) =>
                              handleExpectedValueChange(rowIdx, e.target.value)
                            }
                            placeholder="e.g. 10–12"
                            className="h-8 text-xs text-center border-dashed border-gray-300 focus:border-olive-400 bg-white"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                💡 Supports ranges (e.g.{" "}
                <code className="bg-gray-100 px-1 rounded">10–12</code>) and
                exact values (e.g.{" "}
              </p>
            </div>
            </SheetBody>
          </div>

          {/* Footer */}
          <SheetFooter className="flex justify-end gap-2 p-6 border-t bg-white mt-auto">
            <Button
              variant="outline"
              onClick={() => setIsKittingDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsPreviewOpen(true)}
              disabled={isSubmitting}
              className="bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300 font-medium"
            >
              <Eye className="mr-1 h-4 w-4 text-amber-700" />
              Preview
            </Button>
            <Button
              onClick={handleSaveKittingForm}
              disabled={isSubmitting}
              className="bg-olive-600 text-white hover:bg-olive-700"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ──── Full Kitting Preview Dialog ──── */}
      <Sheet open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <SheetContent className="max-w-5xl sm:max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col p-0">
          <SheetHeader className="pb-3 border-b border-slate-100 p-6">
            <SheetTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
              <Eye className="h-5 w-5 text-olive-600" />
              Full Kitting Details Preview
              {selectedHistoryItem
                ? ` (Revision of ${selectedHistoryItem.compositionNo})`
                : ""}
            </SheetTitle>
            <SheetDescription className="text-xs text-slate-500">
              Raw Materials Composition, calculated parameters, and cost breakdown preview.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col flex-1 min-h-0">
            <SheetBody className="space-y-4 px-6 py-2">
            {/* Raw Materials Composition Summary Table (Exact View as in Screenshot) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-800">Raw Materials Composition</h3>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow className="text-xs font-semibold text-slate-600">
                      <TableHead className="w-8 text-center">#</TableHead>
                      <TableHead className="min-w-[160px]">Material</TableHead>
                      <TableHead className="text-center w-16">AL</TableHead>
                      <TableHead className="text-center w-16">FE</TableHead>
                      <TableHead className="text-center w-16">BD</TableHead>
                      <TableHead className="text-center w-16">AP</TableHead>
                      <TableHead className="text-center w-24 bg-amber-50/60 text-amber-900">% (Input)</TableHead>
                      <TableHead className="text-right w-24">Price (₹)</TableHead>
                      <TableHead className="text-center w-20">AL (Calc)</TableHead>
                      <TableHead className="text-center w-20">FE (Calc)</TableHead>
                      <TableHead className="text-center w-20">BD (Calc)</TableHead>
                      <TableHead className="text-center w-20">AP (Calc)</TableHead>
                      <TableHead className="text-right w-28 bg-emerald-50/60 text-emerald-900 font-bold">Cost (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kittingFormRows.filter((r) => r.productName).map((row, idx) => (
                      <TableRow key={row.id} className="text-xs hover:bg-slate-50/80 transition-colors">
                        <TableCell className="text-center font-medium text-slate-500">{idx + 1}</TableCell>
                        <TableCell className="font-semibold text-slate-800">{row.productName}</TableCell>
                        <TableCell className="text-center text-slate-600">{row.baseAlumina.toFixed(2)}</TableCell>
                        <TableCell className="text-center text-slate-600">{row.baseIron.toFixed(2)}</TableCell>
                        <TableCell className="text-center text-slate-600">{row.baseBd.toFixed(2)}</TableCell>
                        <TableCell className="text-center text-slate-600">{row.baseAp.toFixed(2)}</TableCell>
                        <TableCell className="text-center font-bold text-amber-800 bg-amber-50/40">
                          {row.percentage}%
                        </TableCell>
                        <TableCell className="text-right font-medium text-slate-700">₹{row.basePrice.toFixed(2)}</TableCell>
                        <TableCell className="text-center text-slate-700">{row.al.toFixed(2)}</TableCell>
                        <TableCell className="text-center text-slate-700">{row.fe.toFixed(2)}</TableCell>
                        <TableCell className="text-center text-slate-700">{row.bd.toFixed(2)}</TableCell>
                        <TableCell className="text-center text-slate-700">{row.ap.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-bold text-emerald-800 bg-emerald-50/40">
                          ₹{row.cost.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter className="bg-slate-50 border-t border-slate-200">
                    <TableRow className="font-bold text-xs">
                      <TableCell colSpan={6} className="text-right font-extrabold text-slate-700">
                        Raw Material Cost Subtotal
                      </TableCell>
                      <TableCell className="text-center font-extrabold text-amber-900 bg-amber-100/60">
                        {kittingTotals.percentage.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right text-slate-400">-</TableCell>
                      <TableCell className="text-center font-bold text-slate-800">{kittingTotals.al.toFixed(4)}</TableCell>
                      <TableCell className="text-center font-bold text-slate-800">{kittingTotals.fe.toFixed(4)}</TableCell>
                      <TableCell className="text-center font-bold text-slate-800">{kittingTotals.bd.toFixed(4)}</TableCell>
                      <TableCell className="text-center font-bold text-slate-800">{kittingTotals.ap.toFixed(4)}</TableCell>
                      <TableCell className="text-right font-extrabold text-emerald-900 bg-emerald-100/60">
                        ₹{kittingTotals.variableCost.toFixed(2)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="bg-amber-50/80 text-xs font-semibold text-amber-950">
                      <TableCell colSpan={12} className="text-right font-bold">
                        + Manufacturing Cost (₹)
                      </TableCell>
                      <TableCell className="text-right font-black text-amber-950 bg-amber-100/80">
                        ₹{(manufacturingCost || 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="bg-emerald-100/90 text-sm font-black text-emerald-950">
                      <TableCell colSpan={12} className="text-right font-black uppercase tracking-wider">
                        = Total Cost (₹)
                      </TableCell>
                      <TableCell className="text-right font-black text-emerald-950 bg-emerald-200/80 text-base">
                        ₹{(kittingTotals.variableCost + (manufacturingCost || 0)).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </div>
            </SheetBody>
          </div>

          <SheetFooter className="gap-2 border-t pt-3 p-6 mt-auto bg-white">
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Back to Edit
            </Button>
            <Button
              onClick={() => {
                setIsPreviewOpen(false);
                handleSaveKittingForm();
              }}
              disabled={isSubmitting}
              className="bg-olive-600 text-white hover:bg-olive-700"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm & Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
