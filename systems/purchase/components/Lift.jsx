"use client";

import { useState, useEffect, useCallback, useContext, useMemo } from "react";
import {
  Truck,
  FileText,
  Loader2,
  Upload,
  X,
  History,
  FileCheck,
  AlertTriangle,
  Filter,
  ChevronsUpDown,
  Download,
  FileUp,
  Plus,
  Check,
  ShieldCheck,
} from "lucide-react";
import { MixerHorizontalIcon } from "@radix-ui/react-icons";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { AuthContext } from "../context/AuthContext";
import SuperAdminEditModal from "./SuperAdminEditModal";
import { useNotification } from "../context/NotificationContext";
import { toast } from "sonner";
import { API_URL, getToken } from "@/lib/auth";
import { fetchMasterDataForSelects } from "../utils/masterDataUtils";
import { uploadFileToStorage } from "../utils/storageUtils";
import { canViewFirm } from "../utils/firmFilter";

function formatTimestamp(timestampStr) {
  if (!timestampStr || typeof timestampStr !== "string") {
    return "N/A";
  }
  const numbers = timestampStr.match(/\d+/g);
  if (!numbers || numbers.length < 6) {
    const d = new Date(timestampStr);
    if (!isNaN(d.getTime())) {
      return d
        .toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
        .replace(",", "");
    }
    return "Invalid Date";
  }
  const date = new Date(
    parseInt(numbers[0]), // Year
    parseInt(numbers[1]) - 1, // Month (0-based)
    parseInt(numbers[2]), // Day
    parseInt(numbers[3]), // Hours
    parseInt(numbers[4]), // Minutes
    parseInt(numbers[5]), // Seconds
  );
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

const PO_COLUMNS_META = [
  {
    header: "Actions",
    dataKey: "actionColumn",
    toggleable: false,
    alwaysVisible: true,
  },
  {
    header: "PO Number",
    dataKey: "poNumber",
    toggleable: true,
    alwaysVisible: true,
  },
  {
    header: "RI Number",
    dataKey: "indentNo",
    toggleable: true,
  },
  { header: "Planned Date", dataKey: "planned", toggleable: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
  { header: "Party Name", dataKey: "vendorName", toggleable: true },
  { header: "Product Name", dataKey: "rawMaterialName", toggleable: true },
  { header: "Quantity", dataKey: "quantity", toggleable: true },
  { header: "Rate", dataKey: "rate", toggleable: true },
  { header: "Alumina %", dataKey: "alumina", toggleable: true },
  { header: "Iron %", dataKey: "iron", toggleable: true },
  { header: "Received Qty", dataKey: "receivedQty", toggleable: true },
  { header: "Pending PO Qty", dataKey: "pendingPOQty", toggleable: true },
  {
    header: "Order Cancel Qty",
    dataKey: "orderCancelQty",
    toggleable: true,
    alwaysVisible: true,
  },
  { header: "Cancel Reason", dataKey: "cancelReason", toggleable: true },
  { header: "Status", dataKey: "status", toggleable: true },
  { header: "Notes", dataKey: "whatIsToBeDone", toggleable: true },
  {
    header: "DO Number",
    dataKey: "doNumber",
    toggleable: true,
  },
  {
    header: "Transporter Name",
    dataKey: "transporterName",
    toggleable: true,
  },
  {
    header: "Cancel PO",
    dataKey: "cancelAction",
    toggleable: false,
    alwaysVisible: true,
  },
];
const LIFTS_COLUMNS_META = [
  { header: "Lift ID", dataKey: "id", toggleable: true, alwaysVisible: true },
  { header: "Lifted On", dataKey: "createdAt", toggleable: true },
  { header: "PO NUMBER", dataKey: "indentNo", toggleable: true },
  { header: "RI Number", dataKey: "riNo", toggleable: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
  { header: "Party Name", dataKey: "vendorName", toggleable: true },
  { header: "Product Name", dataKey: "material", toggleable: true },
  { header: "PO Qty", dataKey: "quantity", toggleable: true },
  { header: "Billing Quantity", dataKey: "liftingQty", toggleable: true },
  { header: "Rate", dataKey: "rate", toggleable: true },
  {
    header: "Per MT Transportation Rate",
    dataKey: "perMTTransportationRate",
    toggleable: true,
  },
  { header: "Rate Type", dataKey: "rateType", toggleable: true },
  {
    header: "Transportation Total Amount",
    dataKey: "transportRate",
    toggleable: true,
  },
  { header: "Bill No.", dataKey: "billNo", toggleable: true },
  { header: "Date Of Bill", dataKey: "dateOfBill", toggleable: true },
  { header: "Truck No.", dataKey: "truckNo", toggleable: true },
  { header: "Transporter Name", dataKey: "transporterName", toggleable: true },
  { header: "Bilty Number", dataKey: "biltyNo", toggleable: true },
  {
    header: "Bilty Image",
    dataKey: "biltyImageUrl",
    toggleable: true,
    isLink: true,
    linkText: "View Bilty",
  },
  {
    header: "Bill Image",
    dataKey: "billImageUrl",
    toggleable: true,
    isLink: true,
    linkText: "View Bill",
  },
  {
    header: "Material Billing Quantity",
    dataKey: "additionalTruckQty",
    toggleable: true,
  },
  { header: "DO Number", dataKey: "doNumber", toggleable: true },
  { header: "Order Cancel Qty", dataKey: "orderCancelQty", toggleable: true },
  { header: "Cancel Reason", dataKey: "cancelReason", toggleable: true },
];

const createEmptyLiftForm = () => ({
  billNo: "",
  dateOfBill: "",
  Arealifting: "",
  liftingLeadTime: "",
  truckNo: "",
  driverNo: "",
  TransporterName: "",
  rateType: "",
  rate: "",
  truckQty: "",
  biltyNo: "",
  indentNo: "",
  vendorName: "",
  material: "",
  totalQuantity: "",
  billImage: null,
  additionalTruckQty: "",
  transportRate: "",
  transportingRate: "",
  hasBilty: "no",
  biltyImage: null,
  testingCertificate: null,
});

const toNumber = (value) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundQuantity = (value) => Number(toNumber(value).toFixed(3));

const normalizeTransportRateType = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (normalized === "per mt") return "Per MT";
  if (normalized === "fixed") return "Fixed";
  return String(value || "").trim();
};

const formatMoney = (value) =>
  toNumber(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const makeLiftItemKey = (poNumber, material, uniqueId = "") => {
  const baseKey = `${String(poNumber || "").trim()}::${String(material || "").trim().toLowerCase()}`;
  return uniqueId ? `${baseKey}::${uniqueId}` : baseKey;
};

// Backend (`/purchase/lift/data`) already computes lifted/pending quantities
// per item server-side — this just reshapes those items into the row shape
// the "Products To Lift" form/table expects.
const normalizeBackendPoItems = (po) => {
  const items = Array.isArray(po.items) ? po.items : [];
  return items.map((item, index) => {
    const uniqueId = item.indentId || index;
    const key = makeLiftItemKey(po.poNumber, item.material, uniqueId);
    const aggregationKey = makeLiftItemKey(po.poNumber, item.material);
    const rate = toNumber(item.poRate);
    return {
      key,
      aggregationKey,
      index,
      material: item.material,
      maxQuantity: toNumber(item.quantity),
      liftedQuantity: toNumber(item.liftedQuantity),
      pendingQuantity: toNumber(item.pendingQuantity),
      quantityToLift: toNumber(item.pendingQuantity),
      rate,
      poRate: rate, // Store original PO rate for mismatch tracking
      totalAmount: roundQuantity(toNumber(item.pendingQuantity) * rate),
      indentId: item.indentId != null ? String(item.indentId) : "",
    };
  });
};

export default function LiftMaterial() {
  const { user, isSuperAdmin, isReadOnly, hasPageFirmAccess } = useContext(AuthContext);
  const { updateCount } = useNotification();
  const [superAdminEditItem, setSuperAdminEditItem] = useState(null);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [materialLifts, setMaterialLifts] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);
  const [selectedLiftItems, setSelectedLiftItems] = useState([]);
  const [loadingPOs, setLoadingPOs] = useState(true);
  const [loadingLifts, setLoadingLifts] = useState(true);
  const [masterDataLoading, setMasterDataLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [error, setError] = useState(null);
  const [areaOptions, setAreaOptions] = useState([]);
  const [transporterOptions, setTransporterOptions] = useState([]);
  const [transporterMasterMap, setTransporterMasterMap] = useState({});
  const [typeOptions, setTypeOptions] = useState([]);
  const [rateTypeOptions, setRateTypeOptions] = useState([]);
  const [formData, setFormData] = useState(createEmptyLiftForm);

  const [formErrors, setFormErrors] = useState({});
  const [activeTab, setActiveTab] = useState("availablePOs");
  const [visiblePoColumns, setVisiblePoColumns] = useState({});
  const [visibleLiftsColumns, setVisibleLiftsColumns] = useState({});
  const [cancelPendingPO, setCancelPendingPO] = useState({
    show: false,
    poId: null,
    indentNo: "",
    cancelQuantity: "",
    reason: "",
    loading: false,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    firmName: "all",
    vendorName: "all",
    materialName: "all",
    liftType: "all",
    totalQuantity: "all",
    orderNumber: "all",
    transporterName: "all",
  });
  const [exportDateRanges, setExportDateRanges] = useState({
    pending: { from: "", to: "" },
    history: { from: "", to: "" },
  });

  useEffect(() => {
    const initializeVisibility = (columnsMeta) => {
      const visibility = {};
      columnsMeta.forEach((col) => {
        visibility[col.dataKey] = col.alwaysVisible || col.toggleable;
      });
      return visibility;
    };
    setVisiblePoColumns(initializeVisibility(PO_COLUMNS_META));
    setVisibleLiftsColumns(initializeVisibility(LIFTS_COLUMNS_META));
  }, []);

  const fetchMasterData = useCallback(async () => {
    setMasterDataLoading(true);
    setError(null);
    try {
      // Fetch data from Supabase Master table
      const masterData = await fetchMasterDataForSelects();

      setAreaOptions(masterData.areaLiftingOptions);
      setTransporterOptions(masterData.transporterOptions);
      setTransporterMasterMap(masterData.transporterMasterMap || {});
      setFormData((prev) => {
        const defaultTransporter = masterData.transporterOptions[0]?.value || "";
        const defaultMaster = masterData.transporterMasterMap?.[defaultTransporter];
        return {
          ...prev,
          TransporterName: defaultTransporter,
          rateType: prev.rateType || defaultMaster?.rateType || "",
        };
      });
      setTypeOptions(masterData.typeOptions);
      setRateTypeOptions(masterData.rateTypeOptions);
    } catch (error) {
      setError(`Failed to load Master data: ${error.message}`);
      setAreaOptions([]);
      setTypeOptions([]);
      setTransporterOptions([]);
      setTransporterMasterMap({});
      setRateTypeOptions([]);
    } finally {
      setMasterDataLoading(false);
    }
  }, []);

  // Simple SearchableSelect Component
  const SearchableSelect = ({
    value,
    onValueChange,
    options,
    placeholder,
    className,
  }) => {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const filteredOptions = options.filter((option) =>
      option.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    return (
      <div className="relative">
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className={`w-full justify-between h-9 bg-white dark:bg-zinc-900 text-xs ${className}`}
        >
          {value === "all" || !value ? `All ${placeholder}` : value}
          <ChevronsUpDown className="w-4 h-4 ml-2 opacity-50 shrink-0" />
        </Button>

        {open && (
          <div className="absolute z-50 w-full mt-1 overflow-y-auto bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md shadow-lg max-h-60">
            <div className="sticky top-0 p-2 bg-white dark:bg-zinc-900 border-b dark:border-zinc-800">
              <Input
                type="text"
                placeholder={`Search ${placeholder.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-xs h-7"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="py-1">
              <div
                className={`px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 ${value === "all" ? "bg-green-50 dark:bg-emerald-500/10" : ""}`}
                onClick={() => {
                  onValueChange("all");
                  setOpen(false);
                  setSearchTerm("");
                }}
              >
                All {placeholder}
              </div>
              {filteredOptions.map((option, index) => (
                <div
                  key={`${option}-${index}`}
                  className={`px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 ${value === option ? "bg-green-50 dark:bg-emerald-500/10" : ""}`}
                  onClick={() => {
                    onValueChange(option);
                    setOpen(false);
                    setSearchTerm("");
                  }}
                >
                  {option}
                </div>
              ))}
            </div>
          </div>
        )}

        {open && (
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
        )}
      </div>
    );
  };

  const fetchPurchaseOrders = useCallback(async () => {
    setLoadingPOs(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/purchase/lift/data`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load data");
      }

      let formattedData = (json.data?.pending || []).map((po) => {
        const items = normalizeBackendPoItems(po);
        return {
          id: po.id,
          indentNo: po.indentNo || "",
          poNumber: po.poNumber || "",
          firmName: po.firmName || "",
          vendorName: po.vendorName || "",
          rawMaterialName:
            items.length > 1
              ? items.map((it) => it.material).join(", ")
              : items[0]?.material || "",
          quantity: String(po.quantity ?? ""),
          dbRowIds: po.dbRowIds || [],
          rate: String(po.rate || ""),
          alumina: String(po.alumina || ""),
          iron: String(po.iron || ""),
          transportType: String(po.transportType || ""),
          transporterName: String(po.transporterName || ""),
          transportRateType: normalizeTransportRateType(""),
          pendingQty: String(po.pendingQty ?? "0"),
          transporterRate: String(po.transporterRate || ""),
          plannedRaw: po.plannedRaw || "",
          planned: po.planned ? String(po.planned).replace("T", " ") : "",
          whatIsToBeDone: po.whatIsToBeDone || "",
          pendingLiftQty: String(po.pendingLiftQty ?? "0"),
          receivedQty: String(po.receivedQty ?? ""),
          pendingPOQty: String(po.pendingPOQty ?? "0"),
          pendingPOQty_DB: po.pendingQty,
          orderCancelQty: String(po.orderCancelQty || "0"),
          cancelReason: po.cancelReason || "",
          status: po.status || "Pending",
          doNumber: po.doNumber || "",
          _totalQty: po._totalQty,
          _liftedSoFar: po._liftedSoFar,
          items,
        };
      });

      // Update global notification count with the count of actual pending lifts
      updateCount("lift-material", formattedData.length);

      if (user?.firmName) {
        formattedData = formattedData.filter((po) =>
          canViewFirm(user.firmName, po.firmName),
        );
      }

      // Sort by PO/RI Number descending
      formattedData.sort((a, b) => {
        // Extract the first indent from the potentially comma-separated string
        const indentA = String(a.poNumber || a.indentNo || "").split(',')[0].trim();
        const indentB = String(b.poNumber || b.indentNo || "").split(',')[0].trim();

        // Try to sort numerically if they have numbers (e.g., RI-042 -> 42)
        const numA = parseInt(indentA.replace(/\D/g, ""), 10);
        const numB = parseInt(indentB.replace(/\D/g, ""), 10);

        if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
          return numB - numA; // Descending numeric
        }

        // Fallback to string descending
        if (indentA > indentB) return -1;
        if (indentA < indentB) return 1;

        // If indent numbers are identical, fallback to planned date descending
        const dateA = new Date(a.planned).getTime();
        const dateB = new Date(b.planned).getTime();
        if (!isNaN(dateA) && !isNaN(dateB)) return dateB - dateA;

        return 0;
      });

      setPurchaseOrders(formattedData);
    } catch (error) {
      setError(`Failed to load PO data: ${error.message}`);
      setPurchaseOrders([]);
    } finally {
      setLoadingPOs(false);
    }
  }, [user]);

  const fetchMaterialLifts = useCallback(async () => {
    setLoadingLifts(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/purchase/lift/data`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load data");
      }

      let formattedData = (json.data?.history || []).map((row) => {
        let perMTTransportationRate = "-";
        const currentRateType = String(row.typeOfTransportingRate || "").trim().toLowerCase();
        if (currentRateType === "per mt" || currentRateType === "fixed") {
          const tRate = parseFloat(row.transporterRate);
          const bQty = parseFloat(row.liftingQty);
          if (!isNaN(tRate) && !isNaN(bQty) && bQty !== 0) {
            perMTTransportationRate = (tRate / bQty).toFixed(2);
          }
        }

        return {
          perMTTransportationRate,
          _dbId: row._dbId,
          id: row.liftNo || String(row.id ?? ""),
          indentNo: row.indentNo || "",
          riNo: row.indentNo || "",
          vendorName: row.vendorName || "",
          quantity: String(row.qty || ""),
          material: row.rawMaterialName || "",
          billNo: row.billNo || "",
          dateOfBill: row.dateOfBill ? formatTimestamp(row.dateOfBill) : "",
          areaName: row.areaLifting || "",
          liftingLeadTime: "",
          liftingQty: String(row.liftingQty || ""),
          liftType: row.type || "",
          transporterName: row.transporterName || "",
          truckNo: row.truckNo || "",
          driverNo: row.driverNo || "",
          biltyNo: row.biltyNo || "",
          biltyImageUrl: row.biltyImage || "",
          rateType: row.typeOfTransportingRate || "",
          rate: String(row.rate || ""),
          billImageUrl: row.billImage || "",
          additionalTruckQty: String(row.truckQty || ""),
          createdAtRaw: row.timestamp || "",
          createdAt: row.createdAt ? formatTimestamp(row.createdAt) : "",
          firmName: row.firmName || "",
          transportRate: String(row.transporterRate || ""),
          orderCancelQty: "0",
          cancelReason: "",
          doNumber: row.doNumber || "",
        };
      });

      // Filter by user's firm name if applicable
      if (user?.firmName) {
        formattedData = formattedData.filter((lift) =>
          canViewFirm(user.firmName, lift.firmName),
        );
      }

      setMaterialLifts(formattedData);
    } catch (err) {
      setError((prev) =>
        prev
          ? `${prev}\nFailed to load lifts data: ${err.message}`
          : `Failed to load lifts data: ${err.message}`,
      );
      setMaterialLifts([]);
    } finally {
      setLoadingLifts(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPurchaseOrders();
    fetchMaterialLifts();
    fetchMasterData();
  }, [fetchPurchaseOrders, fetchMaterialLifts, fetchMasterData]);

  const handleCancelPendingPO = (po) => {
    setCancelPendingPO({
      show: true,
      poId: po.id,
      indentNo: po.indentNo,
      cancelQuantity: "",
      reason: "",
      loading: false,
    });
  };

  const handleCloseCancelPopup = () => {
    setCancelPendingPO({
      show: false,
      poId: null,
      indentNo: "",
      cancelQuantity: "",
      loading: false,
    });
  };

  const handleCancelQuantityChange = (e) => {
    const value = e.target.value;
    setCancelPendingPO((prev) => ({
      ...prev,
      cancelQuantity: value,
    }));
  };

  const submitCancelPendingPO = async () => {
    if (
      !cancelPendingPO.cancelQuantity ||
      isNaN(parseFloat(cancelPendingPO.cancelQuantity))
    ) {
      toast.error("Please enter a valid quantity");
      return;
    }

    setCancelPendingPO((prev) => ({ ...prev, loading: true }));

    try {
      const poToUpdate = purchaseOrders.find(
        (po) => po.id === cancelPendingPO.poId,
      );

      if (!poToUpdate) {
        throw new Error("PO not found");
      }

      const cancelQty = parseFloat(cancelPendingPO.cancelQuantity);

      const res = await fetch(`${API_URL}/purchase/lift/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          indentIds: poToUpdate.dbRowIds || [],
          cancelQty,
          reason: cancelPendingPO.reason,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Cancel failed");
      }

      toast.success(
        `✅ Cancel quantity ${cancelPendingPO.cancelQuantity} submitted successfully to ${cancelPendingPO.indentNo}!`,
      );

      // Refresh data
      await fetchPurchaseOrders();
      handleCloseCancelPopup();
    } catch (error) {
      console.error("Error submitting cancel quantity:", error);
      toast.error(`❌ Failed to submit cancel quantity: ${error.message}`);
    } finally {
      setCancelPendingPO((prev) => ({ ...prev, loading: false }));
    }
  };

  const uniqueFilterOptions = useMemo(() => {
    const firms = new Set();
    const vendors = new Set();
    const materials = new Set();
    const types = new Set();
    const quantities = new Set();
    const orders = new Set();
    const transporters = new Set();

    purchaseOrders.forEach((po) => {
      if (po.firmName) firms.add(po.firmName);
      if (po.vendorName) vendors.add(po.vendorName);
      if (po.rawMaterialName) materials.add(po.rawMaterialName);
      (po.items || []).forEach((item) => {
        if (item.material) materials.add(item.material);
      });
      if (po.quantity) quantities.add(po.quantity);
      if (po.indentNo) orders.add(po.indentNo);
      if (po.poNumber) orders.add(po.poNumber);
      if (po.transporterName) transporters.add(po.transporterName);
    });

    materialLifts.forEach((lift) => {
      if (lift.firmName) firms.add(lift.firmName);
      if (lift.vendorName) vendors.add(lift.vendorName);
      if (lift.material) materials.add(lift.material);
      if (lift.liftType) types.add(lift.liftType);
      if (lift.liftingQty) quantities.add(lift.liftingQty);
      if (lift.additionalTruckQty) quantities.add(lift.additionalTruckQty);
      if (lift.indentNo) orders.add(lift.indentNo);
      if (lift.billNo) orders.add(lift.billNo);
      if (lift.transporterName) transporters.add(lift.transporterName);
    });

    return {
      firmName: [...firms].sort(),
      vendorName: [...vendors].sort(),
      materialName: [...materials].sort(),
      liftType: [...types].sort(),
      totalQuantity: [...quantities].sort(
        (a, b) => parseFloat(a) - parseFloat(b),
      ),
      orderNumber: [...orders].sort(),
      transporterName: [...transporters].sort(),
    };
  }, [purchaseOrders, materialLifts]);

  const parseExportDate = (value) => {
    if (!value) return null;
    if (value instanceof Date && !isNaN(value.getTime())) return value;

    const raw = String(value).trim();
    if (!raw || raw === "N/A") return null;

    const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (match) {
      const day = Number(match[1]);
      const month = Number(match[2]) - 1;
      const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
      const hour = Number(match[4] || 0);
      const minute = Number(match[5] || 0);
      const second = Number(match[6] || 0);
      const parsedDate = new Date(year, month, day, hour, minute, second);
      return isNaN(parsedDate.getTime()) ? null : parsedDate;
    }

    const isoDate = new Date(raw);
    return isNaN(isoDate.getTime()) ? null : isoDate;
  };

  const isWithinExportDateRange = (value, range) => {
    if (!range?.from && !range?.to) return true;

    const date = parseExportDate(value);
    if (!date) return false;

    if (range.from) {
      const fromDate = new Date(range.from);
      fromDate.setHours(0, 0, 0, 0);
      if (date < fromDate) return false;
    }

    if (range.to) {
      const toDate = new Date(range.to);
      toDate.setHours(23, 59, 59, 999);
      if (date > toDate) return false;
    }

    return true;
  };

  const filteredPurchaseOrders = useMemo(() => {
    let filtered = purchaseOrders;
    if (filters.firmName !== "all") {
      filtered = filtered.filter((po) => po.firmName === filters.firmName);
    }
    if (filters.vendorName !== "all") {
      filtered = filtered.filter((po) => po.vendorName === filters.vendorName);
    }
    if (filters.materialName !== "all") {
      filtered = filtered.filter(
        (po) =>
          po.rawMaterialName === filters.materialName ||
          (po.items || []).some((item) => item.material === filters.materialName),
      );
    }
    if (filters.totalQuantity !== "all") {
      filtered = filtered.filter((po) => po.quantity === filters.totalQuantity);
    }
    if (filters.orderNumber !== "all") {
      filtered = filtered.filter(
        (po) =>
          po.poNumber === filters.orderNumber ||
          po.indentNo === filters.orderNumber ||
          String(po.indentNo || "")
            .split(",")
            .map((part) => part.trim())
            .includes(filters.orderNumber),
      );
    }
    if (filters.transporterName !== "all") {
      filtered = filtered.filter(
        (po) => po.transporterName === filters.transporterName,
      );
    }
    const searchLower = searchQuery.trim().toLowerCase();
    if (searchLower) {
      filtered = filtered.filter((po) => {
        return (
          String(po.poNumber || "").toLowerCase().includes(searchLower) ||
          String(po.indentNo || "").toLowerCase().includes(searchLower) ||
          String(po.firmName || "").toLowerCase().includes(searchLower) ||
          String(po.vendorName || "").toLowerCase().includes(searchLower) ||
          String(po.rawMaterialName || "").toLowerCase().includes(searchLower) ||
          String(po.transporterName || "").toLowerCase().includes(searchLower) ||
          String(po.doNumber || "").toLowerCase().includes(searchLower) ||
          String(po.status || "").toLowerCase().includes(searchLower)
        );
      });
    }
    filtered = filtered.filter((po) =>
      isWithinExportDateRange(po.plannedRaw || po.planned, exportDateRanges.pending),
    );
    return filtered;
  }, [purchaseOrders, filters, exportDateRanges.pending, searchQuery]);

  const filteredMaterialLifts = useMemo(() => {
    let filtered = materialLifts;
    if (filters.firmName !== "all") {
      filtered = filtered.filter((lift) => lift.firmName === filters.firmName);
    }
    if (filters.vendorName !== "all") {
      filtered = filtered.filter(
        (lift) => lift.vendorName === filters.vendorName,
      );
    }
    if (filters.materialName !== "all") {
      filtered = filtered.filter(
        (lift) => lift.material === filters.materialName,
      );
    }
    if (filters.liftType !== "all") {
      filtered = filtered.filter((lift) => lift.liftType === filters.liftType);
    }
    if (filters.totalQuantity !== "all") {
      filtered = filtered.filter(
        (lift) =>
          lift.liftingQty === filters.totalQuantity ||
          lift.additionalTruckQty === filters.totalQuantity,
      );
    }
    if (filters.orderNumber !== "all") {
      filtered = filtered.filter(
        (lift) =>
          lift.indentNo === filters.orderNumber ||
          lift.billNo === filters.orderNumber,
      );
    }
    if (filters.transporterName !== "all") {
      filtered = filtered.filter(
        (lift) => lift.transporterName === filters.transporterName,
      );
    }
    const searchLower = searchQuery.trim().toLowerCase();
    if (searchLower) {
      filtered = filtered.filter((lift) => {
        return (
          String(lift.id || "").toLowerCase().includes(searchLower) ||
          String(lift.indentNo || "").toLowerCase().includes(searchLower) ||
          String(lift.riNo || "").toLowerCase().includes(searchLower) ||
          String(lift.firmName || "").toLowerCase().includes(searchLower) ||
          String(lift.vendorName || "").toLowerCase().includes(searchLower) ||
          String(lift.material || "").toLowerCase().includes(searchLower) ||
          String(lift.truckNo || "").toLowerCase().includes(searchLower) ||
          String(lift.transporterName || "").toLowerCase().includes(searchLower) ||
          String(lift.billNo || "").toLowerCase().includes(searchLower) ||
          String(lift.biltyNo || "").toLowerCase().includes(searchLower) ||
          String(lift.doNumber || "").toLowerCase().includes(searchLower)
        );
      });
    }
    filtered = filtered.filter((lift) =>
      isWithinExportDateRange(lift.createdAtRaw || lift.createdAt, exportDateRanges.history),
    );
    return filtered;
  }, [materialLifts, filters, exportDateRanges.history, searchQuery]);

  const selectedLiftSummary = useMemo(() => {
    const activeItems = selectedLiftItems.filter(
      (item) => toNumber(item.quantityToLift) > 0,
    );
    const totalLiftQuantity = roundQuantity(
      activeItems.reduce((sum, item) => sum + toNumber(item.quantityToLift), 0),
    );
    const totalMaterialAmount = activeItems.reduce(
      (sum, item) => sum + toNumber(item.quantityToLift) * toNumber(item.rate),
      0,
    );

    return {
      activeItems,
      totalLiftQuantity,
      totalMaterialAmount,
    };
  }, [selectedLiftItems]);

  useEffect(() => {
    setFormData((prev) => {
      const newTruckQty = selectedLiftSummary.totalLiftQuantity
        ? String(selectedLiftSummary.totalLiftQuantity)
        : "";

      const isExFactory =
        String(selectedPO?.transportType || "").trim().toUpperCase() ===
        "EX-FACTORY";
      let transportRate = prev.transportRate;
      if (prev.rateType === "Per MT" && !isExFactory) {
        const tRate = parseFloat(prev.transportingRate) || 0;
        const bQty = parseFloat(newTruckQty) || 0;
        transportRate = (tRate * bQty).toFixed(2);
      }

      return {
        ...prev,
        truckQty: newTruckQty,
        transportRate,
        totalQuantity: selectedPO?.quantity || "",
        material:
          selectedLiftSummary.activeItems.length > 1
            ? `${selectedLiftSummary.activeItems.length} products`
            : selectedLiftSummary.activeItems[0]?.material ||
              selectedPO?.rawMaterialName ||
              "",
        rate:
          selectedLiftSummary.activeItems.length === 1
            ? String(selectedLiftSummary.activeItems[0]?.rate || "")
            : prev.rate,
      };
    });
  }, [selectedLiftSummary, selectedPO]);

  const handleLiftItemQuantityChange = (itemKey, value) => {
    setSelectedLiftItems((prev) =>
      prev.map((item) => {
        if (item.key !== itemKey) return item;

        if (value === "") {
          return { ...item, quantityToLift: "" };
        }

        const nextQuantity = roundQuantity(value);

        return {
          ...item,
          quantityToLift: nextQuantity,
          totalAmount: roundQuantity(nextQuantity * item.rate),
        };
      }),
    );
  };

  const handleLiftItemRateChange = (itemKey, value) => {
    setSelectedLiftItems((prev) =>
      prev.map((item) => {
        if (item.key !== itemKey) return item;

        if (value === "") {
          return { ...item, rate: "" };
        }

        const nextRate = toNumber(value);

        return {
          ...item,
          rate: nextRate,
          totalAmount: roundQuantity(toNumber(item.quantityToLift) * nextRate),
        };
      }),
    );
  };

  const handleRemoveLiftItem = (itemKey) => {
    setSelectedLiftItems((prev) => prev.filter((item) => item.key !== itemKey));
  };

  const handlePOSelect = (po) => {
    setSelectedPO(po);
    setSelectedLiftItems(
      (po.items || []).map((item) => ({
        ...item,
        quantityToLift: item.pendingQuantity,
        rate: "", // Set rate to blank initially
        totalAmount: 0, // Set total amount to 0 since rate is blank
      })),
    );
    setFormData({
      ...createEmptyLiftForm(),
      indentNo: po.indentNo || po.poNumber,
      vendorName: po.vendorName,
      material: po.rawMaterialName,
      totalQuantity: po.quantity,
      TransporterName:
        po.transportType?.toUpperCase() === "EX-FACTORY"
          ? po.transporterName || transporterOptions[0]?.value || ""
          : po.transporterName || "",
      rateType:
        po.transportType?.toUpperCase() === "EX-FACTORY" || po.transportRateType
          ? po.transportRateType || ""
          : "",

      transportRate:
        po.transportType?.toUpperCase() === "EX-FACTORY"
          ? String(po.transporterRate || "")
          : "",
      rate: "", // Set rate to blank initially
    });
    setFormErrors({});
    setShowPopup(true);
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    setSelectedPO(null);
    setSelectedLiftItems([]);
    setFormData(createEmptyLiftForm());
    setFormErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const updatedForm = { ...formData, [name]: value };

    if (
      (name === "transportingRate" ||
        name === "additionalTruckQty" ||
        name === "truckQty" ||
        name === "rateType") &&
      updatedForm.rateType === "Per MT"
    ) {
      const tRate = parseFloat(updatedForm.transportingRate) || 0;
      const bQty = parseFloat(updatedForm.additionalTruckQty || updatedForm.truckQty) || 0;
      if (tRate > 0 && bQty > 0) {
        updatedForm.transportRate = (tRate * bQty).toFixed(2);
      }
    } else if (name === "rateType") {
      updatedForm.transportRate = "";
      if (value !== "Per MT") {
        updatedForm.transportingRate = "";
      }
    }

    setFormData(updatedForm);
    if (formErrors[name]) setFormErrors({ ...formErrors, [name]: null });
  };

  const handleFormSelectChange = (name, value) => {
    const updatedForm = { ...formData, [name]: value };

    if (name === "TransporterName" && value) {
      const masterInfo = transporterMasterMap[value];
      if (masterInfo) {
        if (masterInfo.rateType && !updatedForm.rateType) {
          updatedForm.rateType = masterInfo.rateType;
        }
        if (masterInfo.rate && !updatedForm.transportingRate && (masterInfo.rateType === "Per MT" || updatedForm.rateType === "Per MT")) {
          updatedForm.transportingRate = masterInfo.rate;
        }
      }
    }

    if (
      (name === "transportingRate" ||
        name === "additionalTruckQty" ||
        name === "truckQty" ||
        name === "rateType" ||
        name === "TransporterName") &&
      updatedForm.rateType === "Per MT"
    ) {
      const tRate = parseFloat(updatedForm.transportingRate) || 0;
      const bQty = parseFloat(updatedForm.additionalTruckQty || updatedForm.truckQty) || 0;
      if (tRate > 0 && bQty > 0) {
        updatedForm.transportRate = (tRate * bQty).toFixed(2);
      }
    } else if (name === "rateType") {
      updatedForm.transportRate = "";
      if (value !== "Per MT") {
        updatedForm.transportingRate = "";
      }
    }

    setFormData(updatedForm);
    if (formErrors[name]) setFormErrors({ ...formErrors, [name]: null });
  };

  const handleFileUpload = (e) => {
    const { name, files } = e.target;
    setFormData({ ...formData, [name]: files && files[0] ? files[0] : null });
    if (formErrors[name]) setFormErrors({ ...formErrors, [name]: null });
  };

  const validateForm = () => {
    const newErrors = {};
    const isCommon = formData.Type === "Common";
    const activeLiftItems = selectedLiftItems.filter(
      (item) => String(item.quantityToLift).trim() !== "",
    );

    let requiredFields = [
      "billNo",
      "Arealifting",
      "liftingLeadTime",
      "truckNo",
      "driverNo",
      "TransporterName",
      "rateType",
      "transportRate",
      "additionalTruckQty",
    ];

    if (formData.rateType === "Per MT") {
      requiredFields.push("transportingRate");
    }

    if (isCommon) {
      requiredFields = ["billNo", "Arealifting", "Type", "liftingLeadTime", "rateType", "transportRate"];
      if (formData.rateType === "Per MT") {
        requiredFields.push("transportingRate");
      }
    }

    requiredFields.forEach((field) => {
      let readableField = field
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase());
      if (field === "Arealifting") readableField = "Area Lifting";
      if (field === "TransporterName") readableField = "Transporter Name";

      if (!formData[field] || String(formData[field]).trim() === "") {
        newErrors[field] = `${readableField} is required.`;
      }
    });

    // Bill image and other specific validations only for non-Common types or if visible
    if (!isCommon) {
      if (!formData.billImage) {
        newErrors.billImage = "Bill image is required.";
      }
      if (!formData.hasBilty) {
        newErrors.hasBilty = "Selection for 'Has Bilty?' is required.";
      }
      if (formData.transportRate && isNaN(parseFloat(formData.transportRate)))
        newErrors.transportRate =
          "Transportation Total Amount must be a valid number.";
      if (
        formData.additionalTruckQty &&
        isNaN(parseFloat(formData.additionalTruckQty))
      ) {
        newErrors.additionalTruckQty =
          "Total Truck Billing Quantity must be a valid number.";
      }

      // Validate bilty fields if hasBilty is yes
      if (formData.hasBilty === "yes") {
        if (!formData.biltyNo.trim()) {
          newErrors.biltyNo = "Bilty number is required when has bilty is yes";
        }
        if (!formData.biltyImage) {
          newErrors.biltyImage =
            "Bilty image is required when has bilty is yes";
        }
      }
    } else {
      // Basic number validation for Common fields
      if (
        formData.transportingRate &&
        isNaN(parseFloat(formData.transportingRate))
      ) {
        newErrors.transportingRate =
          "Transporting Rate must be a valid number.";
      }
    }

    if (
      formData.liftingLeadTime &&
      isNaN(parseFloat(formData.liftingLeadTime))
    ) {
      newErrors.liftingLeadTime = "Lead Time must be a valid number.";
    }

    if (!selectedLiftItems.length) {
      newErrors.liftItems = "Add at least one product to record a lift.";
    } else if (!activeLiftItems.length) {
      newErrors.liftItems =
        "Enter a lifting quantity for at least one product.";
    } else {
      selectedLiftItems.forEach((item) => {
        const quantity = toNumber(item.quantityToLift);
        if (String(item.quantityToLift).trim() === "") return;
        if (quantity <= 0) {
          newErrors[`liftItem-${item.key}`] =
            "Quantity must be greater than 0.";
        }
      });
    }

    if (!selectedLiftSummary.totalLiftQuantity) {
      newErrors.liftItems = "Total lift quantity must be greater than 0.";
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Upload file to Supabase Storage
  const uploadFileToSupabase = async (file, folder) => {
    try {
      console.log(`Uploading ${folder} image:`, file.name);
      const { url } = await uploadFileToStorage(file, "image", folder);
      console.log(`${folder} upload successful:`, url);
      return url;
    } catch (error) {
      console.error(`Error uploading ${folder} image:`, error);
      throw new Error(`Failed to upload ${folder} image: ${error.message}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Validation failed. Please check the required fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      const itemsToSubmit = selectedLiftSummary.activeItems.map((item) => ({
        ...item,
        quantityToLift: toNumber(item.quantityToLift),
      }));

      // Upload bill image (if provided)
      let billImageUrl = "";
      if (formData.billImage) {
        billImageUrl = await uploadFileToSupabase(
          formData.billImage,
          "lift-bills",
        );
      }

      // Upload bilty image (if provided and hasBilty is yes)
      let biltyImageUrl = "";
      if (formData.hasBilty === "yes" && formData.biltyImage) {
        biltyImageUrl = await uploadFileToSupabase(
          formData.biltyImage,
          "lift-bilty",
        );
      }

      // Upload testing certificate (if provided)
      let testingCertificateUrl = "";
      if (formData.testingCertificate) {
        testingCertificateUrl = await uploadFileToSupabase(
          formData.testingCertificate,
          "testing-certificates",
        );
      }

      const transportTotal = toNumber(formData.transportRate);
      const totalLiftQuantity = selectedLiftSummary.totalLiftQuantity;
      const transportingRate = toNumber(formData.transportingRate);

      // Freight is split across items proportional to each item's lift
      // quantity (same allocation the reference did client-side), so a
      // multi-material lift doesn't charge the full truck rate to every line.
      const items = itemsToSubmit.map((item) => {
        const quantityShare =
          totalLiftQuantity > 0 ? item.quantityToLift / totalLiftQuantity : 0;
        const allocatedTransportRate =
          formData.rateType === "Per MT"
            ? roundQuantity(transportingRate * item.quantityToLift)
            : roundQuantity(transportTotal * quantityShare);

        return {
          indentId: item.indentId || null,
          material: item.material,
          liftingQty: item.quantityToLift,
          rate: toNumber(item.rate),
          poRate: item.poRate,
          transporterRate: allocatedTransportRate,
          transportingRate,
        };
      });

      const res = await fetch(`${API_URL}/purchase/lift/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          poNumber: selectedPO?.poNumber,
          firmName: selectedPO?.firmName || "",
          vendorName: formData.vendorName,
          items,
          billNo: formData.billNo,
          dateOfBill: formData.dateOfBill || null,
          areaLifting: formData.Arealifting,
          leadTimeToReachFactory: formData.liftingLeadTime || null,
          type: formData.Type,
          transporterName: formData.TransporterName,
          truckNo: formData.truckNo,
          driverNo: formData.driverNo,
          biltyNo: formData.hasBilty === "yes" ? formData.biltyNo || null : null,
          typeOfTransportingRate: formData.rateType,
          billImage: billImageUrl,
          truckQty: formData.additionalTruckQty || null,
          biltyImage: biltyImageUrl || null,
          testingCertificate: testingCertificateUrl || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Submission failed");
      }

      toast.success(
        `Recorded ${itemsToSubmit.length} lift item${itemsToSubmit.length > 1 ? "s" : ""} successfully!`,
      );

      await Promise.all([fetchPurchaseOrders(), fetchMaterialLifts()]);
      handleClosePopup();
    } catch (error) {
      console.error("Error submitting lift form:", error);
      toast.error(`Submission failed: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const liftExistsForPO = (indentNo) => {
    if (!indentNo) return false;
    return materialLifts.some((lift) => lift.indentNo === indentNo);
  };

  const handleToggleColumn = (tab, dataKey, checked) => {
    if (tab === "pos") {
      setVisiblePoColumns((prev) => ({ ...prev, [dataKey]: checked }));
    } else {
      setVisibleLiftsColumns((prev) => ({ ...prev, [dataKey]: checked }));
    }
  };

  const handleSelectAllColumns = (tab, columnsMeta, selectAll) => {
    if (tab === "pos") {
      const newVisibility = {};
      columnsMeta.forEach((col) => {
        newVisibility[col.dataKey] = col.alwaysVisible || selectAll;
      });
      setVisiblePoColumns(newVisibility);
    } else {
      const newVisibility = {};
      columnsMeta.forEach((col) => {
        newVisibility[col.dataKey] = col.alwaysVisible || selectAll;
      });
      setVisibleLiftsColumns(newVisibility);
    }
  };

  const renderCell = (item, column) => {
    const value = item[column.dataKey];
    if (column.isLink) {
      return value ? (
        <a
          href={String(value).startsWith("http") ? value : `https://${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#2fa36b] hover:text-green-800 dark:hover:text-emerald-400 hover:underline font-medium text-xs"
        >
          {column.linkText || "View"}
        </a>
      ) : (
        <span className="text-xs text-gray-400 dark:text-zinc-500">N/A</span>
      );
    }

    // Show status with badge
    if (column.dataKey === "status") {
      const statusValue = value || "";
      const isPending = statusValue.toLowerCase() === "pending";
      return (
        <Badge
          variant={isPending ? "outline" : "secondary"}
          className={
            isPending
              ? "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30"
              : "bg-green-100 text-green-800 dark:bg-emerald-500/10 dark:text-emerald-400"
          }
        >
          {statusValue || "N/A"}
        </Badge>
      );
    }

    return (
      value ||
      (value === 0 ? "0" : <span className="text-xs text-gray-400 dark:text-zinc-500">N/A</span>)
    );
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleExportDateChange = (section, key, value) => {
    setExportDateRanges((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  const downloadCsv = (filename, columns, rows) => {
    const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const headers = columns.map((column) => escapeCsv(column.header)).join(",");
    const body = rows.map((row) =>
      columns.map((column) => escapeCsv(row[column.dataKey])).join(","),
    );
    const csv = [headers, ...body].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSection = (section) => {
    const isPending = section === "pending";
    const range = exportDateRanges[section];
    const rows = isPending
      ? filteredPurchaseOrders.filter((po) =>
          isWithinExportDateRange(po.plannedRaw || po.planned, range),
        )
      : filteredMaterialLifts.filter((lift) =>
          isWithinExportDateRange(lift.createdAtRaw || lift.createdAt, range),
        );
    const columns = (isPending ? PO_COLUMNS_META : LIFTS_COLUMNS_META).filter(
      (column) =>
        column.dataKey !== "actionColumn" &&
        column.dataKey !== "cancelAction" &&
        (isPending
          ? column.alwaysVisible || visiblePoColumns[column.dataKey] !== false
          : column.alwaysVisible || visibleLiftsColumns[column.dataKey] !== false),
    );
    const from = range.from || "all";
    const to = range.to || "all";
    const filename = `${isPending ? "lift-pending" : "lift-history"}_${from}_to_${to}.csv`;

    if (rows.length === 0) {
      toast.warning("No data found for selected date range.");
      return;
    }

    downloadCsv(filename, columns, rows);
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilters({
      firmName: "all",
      vendorName: "all",
      materialName: "all",
      liftType: "all",
      totalQuantity: "all",
      orderNumber: "all",
      transporterName: "all",
    });
  };

  return (
    <div className="p-4 space-y-4 md:p-6">
      <Card className="">
        <CardHeader className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-lg text-gray-700 dark:text-zinc-300">
              <Truck className="h-5 w-5 text-[#2fa36b]" />
              Lift
            </CardTitle>
            <div className="flex items-center gap-2">
              {user?.role && (
                <Badge variant="outline" className="text-xs bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-300">
                  Role: <span className="font-semibold ml-1 capitalize">{user.role}</span>
                </Badge>
              )}
              {isSuperAdmin && (
                <div className="flex items-center gap-1.5 bg-purple-100 text-purple-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                  <ShieldCheck size={14} />
                  Super Admin Mode
                </div>
              )}
              {isReadOnly && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                  View Only
                </Badge>
              )}
            </div>
          </div>

          {masterDataLoading && (
            <div className="flex items-center gap-2 text-sm text-[#2fa36b]">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading dropdown options from Master sheet...
            </div>
          )}
          {!masterDataLoading &&
            (areaOptions.length > 0 || typeOptions.length > 0) && (
              <div className="text-sm text-[#2fa36b]">
                ✅ Dropdown options loaded: {areaOptions.length} areas,{" "}
                {typeOptions.length} types, {transporterOptions.length}{" "}
                transporters, {rateTypeOptions.length} rate types
              </div>
            )}
        </CardHeader>
        <CardContent className="p-4">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex flex-col flex-1"
          >
            <TabsList className="grid w-full sm:w-[450px] grid-cols-2 mb-4">
              <TabsTrigger
                value="availablePOs"
                className="flex items-center gap-2"
              >
                <FileCheck className="w-4 h-4" /> Available POs
                <Badge
                  variant="secondary"
                  className="ml-1.5 px-1.5 py-0.5 text-xs"
                >
                  {filteredPurchaseOrders.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="liftsHistory"
                className="flex items-center gap-2"
              >
                <History className="w-4 h-4" /> Lifts History
                <Badge
                  variant="secondary"
                  className="ml-1.5 px-1.5 py-0.5 text-xs"
                >
                  {filteredMaterialLifts.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <div className="p-4 mb-4 rounded-lg bg-green-50/50 dark:bg-emerald-500/10">
              <div className="flex flex-col gap-3 mb-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
                  <Label className="text-sm font-medium">Filters</Label>
                </div>
                <div className="sm:ml-4 w-full sm:w-72">
                  <Input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 text-xs bg-white dark:bg-zinc-900 border-gray-300 dark:border-zinc-700 focus:border-[#2fa36b] focus:ring-[#2fa36b]"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="sm:ml-auto bg-white dark:bg-zinc-900 h-8 text-xs"
                >
                  Clear All
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div>
                  <Label className="block mb-1 text-xs">Firm Name</Label>
                  <SearchableSelect
                    value={filters.firmName}
                    onValueChange={(value) =>
                      handleFilterChange("firmName", value)
                    }
                    options={["all", ...uniqueFilterOptions.firmName]}
                    placeholder="Firms"
                    className="h-9"
                  />
                </div>

                <div>
                  <Label className="block mb-1 text-xs">Vendor Name</Label>
                  <SearchableSelect
                    value={filters.vendorName}
                    onValueChange={(value) =>
                      handleFilterChange("vendorName", value)
                    }
                    options={["all", ...uniqueFilterOptions.vendorName]}
                    placeholder="Vendors"
                    className="h-9"
                  />
                </div>

                <div>
                  <Label className="block mb-1 text-xs">Material Name</Label>
                  <SearchableSelect
                    value={filters.materialName}
                    onValueChange={(value) =>
                      handleFilterChange("materialName", value)
                    }
                    options={["all", ...uniqueFilterOptions.materialName]}
                    placeholder="Materials"
                    className="h-9"
                  />
                </div>

                <div>
                  <Label className="block mb-1 text-xs">Lift Type</Label>
                  <SearchableSelect
                    value={filters.liftType}
                    onValueChange={(value) =>
                      handleFilterChange("liftType", value)
                    }
                    options={["all", ...uniqueFilterOptions.liftType]}
                    placeholder="Types"
                    className="h-9"
                  />
                </div>

                <div>
                  <Label className="block mb-1 text-xs">Total Quantity</Label>
                  <SearchableSelect
                    value={filters.totalQuantity}
                    onValueChange={(value) =>
                      handleFilterChange("totalQuantity", value)
                    }
                    options={["all", ...uniqueFilterOptions.totalQuantity]}
                    placeholder="Quantities"
                    className="h-9"
                  />
                </div>

                <div>
                  <Label className="block mb-1 text-xs">Transporter Name</Label>
                  <SearchableSelect
                    value={filters.transporterName}
                    onValueChange={(value) =>
                      handleFilterChange("transporterName", value)
                    }
                    options={["all", ...uniqueFilterOptions.transporterName]}
                    placeholder="Transporters"
                    className="h-9"
                  />
                </div>

                <div>
                  <Label className="block mb-1 text-xs">Order Number</Label>
                  <SearchableSelect
                    value={filters.orderNumber}
                    onValueChange={(value) =>
                      handleFilterChange("orderNumber", value)
                    }
                    options={["all", ...uniqueFilterOptions.orderNumber]}
                    placeholder="Orders"
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            <TabsContent
              value="availablePOs"
              className="flex flex-col flex-1 mt-0"
            >
              <Card className="flex-col flex-1">
                <CardHeader className="px-4 py-3 bg-gray-50 dark:bg-zinc-800">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div className="min-w-0">
                      <CardTitle className="flex items-center text-sm font-semibold text-foreground">
                        <FileCheck className="h-4 w-4 text-[#2fa36b] mr-2" />{" "}
                        Available Purchase Orders (
                        {filteredPurchaseOrders.length})
                      </CardTitle>
                      
                    </div>
                    <div className="flex w-full flex-wrap items-end justify-start gap-2 lg:w-auto lg:justify-end">
                      <div className="grid gap-1">
                        <Label className="text-[10px] text-gray-500 dark:text-zinc-400">From</Label>
                        <Input
                          type="date"
                          value={exportDateRanges.pending.from}
                          onChange={(e) =>
                            handleExportDateChange("pending", "from", e.target.value)
                          }
                          className="h-8 w-[150px] bg-white dark:bg-zinc-900 dark:border-zinc-700 text-xs"
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-[10px] text-gray-500 dark:text-zinc-400">To</Label>
                        <Input
                          type="date"
                          value={exportDateRanges.pending.to}
                          onChange={(e) =>
                            handleExportDateChange("pending", "to", e.target.value)
                          }
                          className="h-8 w-[150px] bg-white dark:bg-zinc-900 dark:border-zinc-700 text-xs"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportSection("pending")}
                        className="h-8 text-xs bg-white dark:bg-zinc-900"
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        Export CSV
                      </Button>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs bg-transparent"
                          >
                            <MixerHorizontalIcon className="mr-1.5 h-3.5 w-3.5" />{" "}
                            View Columns
                          </Button>
                        </PopoverTrigger>
                      <PopoverContent className="w-[220px] p-3">
                        <div className="grid gap-2">
                          <p className="text-sm font-medium">
                            Toggle PO Columns
                          </p>
                          <div className="flex items-center justify-between mt-1 mb-2">
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              onClick={() =>
                                handleSelectAllColumns(
                                  "pos",
                                  PO_COLUMNS_META,
                                  true,
                                )
                              }
                            >
                              Select All
                            </Button>
                            <span className="mx-1 text-gray-300 dark:text-zinc-600">|</span>
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              onClick={() =>
                                handleSelectAllColumns(
                                  "pos",
                                  PO_COLUMNS_META,
                                  false,
                                )
                              }
                            >
                              Deselect All
                            </Button>
                          </div>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {PO_COLUMNS_META.filter(
                              (col) => col.toggleable,
                            ).map((col) => (
                              <div
                                key={`toggle-po-${col.dataKey}`}
                                className="flex items-center space-x-2"
                              >
                                <Checkbox
                                  id={`toggle-po-${col.dataKey}`}
                                  checked={!!visiblePoColumns[col.dataKey]}
                                  onCheckedChange={(checked) =>
                                    handleToggleColumn(
                                      "pos",
                                      col.dataKey,
                                      Boolean(checked),
                                    )
                                  }
                                  disabled={col.alwaysVisible}
                                />
                                <Label
                                  htmlFor={`toggle-po-${col.dataKey}`}
                                  className="text-xs font-normal cursor-pointer"
                                >
                                  {col.header}{" "}
                                  {col.alwaysVisible && (
                                    <span className="text-gray-400 dark:text-zinc-500 ml-0.5 text-xs">
                                      (Fixed)
                                    </span>
                                  )}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-col flex-1 p-0">
                  {loadingPOs ? (
                    <div className="flex flex-col items-center justify-center flex-1 py-8">
                      <Loader2 className="h-8 w-8 text-[#2fa36b] animate-spin mb-3" />
                      <p className="ml-2 text-muted-foreground">
                        Loading Purchase Orders...
                      </p>
                    </div>
                  ) : error && filteredPurchaseOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 px-4 py-8 mx-4 my-4 text-center border-2 border-dashed rounded-lg border-destructive-foreground bg-destructive/10">
                      <AlertTriangle className="w-10 h-10 mb-3 text-destructive" />
                      <p className="font-medium text-destructive">
                        Error Loading POs
                      </p>
                      <p className="max-w-md text-sm text-muted-foreground">
                        {error}
                      </p>
                    </div>
                  ) : filteredPurchaseOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 px-4 py-10 mx-4 my-4 text-center border-2 border-dashed rounded-lg border-green-200/50 dark:border-emerald-500/30 bg-green-50/50 dark:bg-emerald-500/10">
                      <FileText className="w-12 h-12 mb-3 text-green-500 dark:text-emerald-400" />
                      <p className="font-medium text-foreground">
                        No Eligible POs Found
                      </p>
                      <p className="text-sm text-center text-muted-foreground">
                        Pending lift records appear here until every product
                        quantity is fully lifted or cancelled.
                        {user?.firmName &&
                          String(user.firmName).toLowerCase() !== "all" && (
                            <span className="block mt-1">
                              (Filtered by firm: {user.firmName})
                            </span>
                          )}
                      </p>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-auto max-h-[calc(100vh-280px)] min-h-[400px] relative custom-scrollbar rounded-b-lg">
                      <table className="w-full text-sm border-collapse">
                        <thead className="sticky top-0 z-30">
                          <tr className="bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
                            {PO_COLUMNS_META.filter(
                              (col) =>
                                col.alwaysVisible ||
                                visiblePoColumns[col.dataKey] !== false,
                            ).map((col) => (
                              <th
                                key={col.dataKey}
                                className="px-3 py-3 text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase text-left bg-gray-50/95 dark:bg-zinc-800/95 backdrop-blur-sm shadow-sm whitespace-nowrap"
                              >
                                {col.header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-100 dark:divide-zinc-800">
                          {filteredPurchaseOrders.map((po) => (
                            <tr
                              key={po.id}
                              className={`hover:bg-green-50/50 dark:hover:bg-emerald-500/10 transition-colors border-b border-gray-100 dark:border-zinc-800 ${selectedPO?.id === po.id ? "bg-green-100 ring-1 ring-green-300 dark:bg-emerald-500/20 dark:ring-emerald-500/40" : ""}`}
                            >
                              {PO_COLUMNS_META.filter(
                                (col) =>
                                  col.alwaysVisible ||
                                  visiblePoColumns[col.dataKey] !== false,
                              ).map((column) => (
                                <td
                                  key={column.dataKey}
                                  title={String(po[column.dataKey] || "")}
                                  className={`whitespace-nowrap text-xs px-3 py-2 ${
                                    column.dataKey === "indentNo" || column.dataKey === "poNumber"
                                      ? "font-medium text-primary"
                                      : "text-gray-700 dark:text-zinc-300"
                                  } ${
                                    column.dataKey === "vendorName" ||
                                    column.dataKey === "rawMaterialName" ||
                                    column.dataKey === "whatIsToBeDone" ||
                                    column.dataKey === "transporterName"
                                      ? "truncate max-w-[150px]"
                                      : ""
                                  }`}
                                >
                                  {column.dataKey === "actionColumn" ? (
                                    <div className="flex items-center gap-1">
                                      <Button
                                        onClick={() => handlePOSelect(po)}
                                        size="xs"
                                        variant="outline"
                                        disabled={isSubmitting || isReadOnly}
                                        className="px-2 py-1 text-xs h-7"
                                      >
                                        Create Lift
                                      </Button>
                                      {isSuperAdmin && (
                                        <button
                                          onClick={() => setSuperAdminEditItem({ ...po, _isPORow: true })}
                                          className="inline-flex items-center px-2 py-1.5 bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 text-xs font-medium rounded-lg hover:bg-purple-200 dark:hover:bg-purple-500/20 border border-purple-300 dark:border-purple-500/30"
                                        >
                                          <ShieldCheck className="w-3 h-3 mr-1" />Edit
                                        </button>
                                      )}
                                    </div>
                                  ) : column.dataKey === "cancelAction" ? (
                                    <div className="flex justify-center">
                                      <Button
                                        onClick={() =>
                                          handleCancelPendingPO(po)
                                        }
                                        size="xs"
                                        variant="destructive"
                                        className="px-2 py-1 text-xs h-7"
                                        disabled={isSubmitting || isReadOnly}
                                      >
                                        Cancel PO
                                      </Button>
                                    </div>
                                  ) : (
                                    <span
                                      title={
                                        column.dataKey === "whatIsToBeDone"
                                          ? po[column.dataKey]
                                          : undefined
                                      }
                                    >
                                      {renderCell(po, column)}
                                    </span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent
              value="liftsHistory"
              className="flex flex-col flex-1 mt-0"
            >
              <Card className="flex-col flex-1">
                <CardHeader className="px-4 py-3 bg-gray-50 dark:bg-zinc-800">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div className="min-w-0">
                      <CardTitle className="flex items-center text-sm font-semibold text-foreground">
                        <History className="h-4 w-4 text-[#2fa36b] mr-2" /> All
                        Material Lifts ({filteredMaterialLifts.length})
                      </CardTitle>
                      
                    </div>
                    <div className="flex w-full flex-wrap items-end justify-start gap-2 lg:w-auto lg:justify-end">
                      <div className="grid gap-1">
                        <Label className="text-[10px] text-gray-500 dark:text-zinc-400">From</Label>
                        <Input
                          type="date"
                          value={exportDateRanges.history.from}
                          onChange={(e) =>
                            handleExportDateChange("history", "from", e.target.value)
                          }
                          className="h-8 w-[150px] bg-white dark:bg-zinc-900 dark:border-zinc-700 text-xs"
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-[10px] text-gray-500 dark:text-zinc-400">To</Label>
                        <Input
                          type="date"
                          value={exportDateRanges.history.to}
                          onChange={(e) =>
                            handleExportDateChange("history", "to", e.target.value)
                          }
                          className="h-8 w-[150px] bg-white dark:bg-zinc-900 dark:border-zinc-700 text-xs"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportSection("history")}
                        className="h-8 text-xs bg-white dark:bg-zinc-900"
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        Export CSV
                      </Button>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs bg-transparent"
                          >
                            <MixerHorizontalIcon className="mr-1.5 h-3.5 w-3.5" />{" "}
                            View Columns
                          </Button>
                        </PopoverTrigger>
                      <PopoverContent className="w-[220px] p-3">
                        <div className="grid gap-2">
                          <p className="text-sm font-medium">
                            Toggle Lift Columns
                          </p>
                          <div className="flex items-center justify-between mt-1 mb-2">
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              onClick={() =>
                                handleSelectAllColumns(
                                  "lifts",
                                  LIFTS_COLUMNS_META,
                                  true,
                                )
                              }
                            >
                              Select All
                            </Button>
                            <span className="mx-1 text-gray-300 dark:text-zinc-600">|</span>
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              onClick={() =>
                                handleSelectAllColumns(
                                  "lifts",
                                  LIFTS_COLUMNS_META,
                                  false,
                                )
                              }
                            >
                              Deselect All
                            </Button>
                          </div>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {LIFTS_COLUMNS_META.filter(
                              (col) => col.toggleable,
                            ).map((col) => (
                              <div
                                key={`toggle-lift-${col.dataKey}`}
                                className="flex items-center space-x-2"
                              >
                                <Checkbox
                                  id={`toggle-lift-${col.dataKey}`}
                                  checked={!!visibleLiftsColumns[col.dataKey]}
                                  onCheckedChange={(checked) =>
                                    handleToggleColumn(
                                      "lifts",
                                      col.dataKey,
                                      Boolean(checked),
                                    )
                                  }
                                  disabled={col.alwaysVisible}
                                />
                                <Label
                                  htmlFor={`toggle-lift-${col.dataKey}`}
                                  className="text-xs font-normal cursor-pointer"
                                >
                                  {col.header}{" "}
                                  {col.alwaysVisible && (
                                    <span className="text-gray-400 dark:text-zinc-500 ml-0.5 text-xs">
                                      (Fixed)
                                    </span>
                                  )}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-col flex-1 p-0">
                  {loadingLifts ? (
                    <div className="flex flex-col items-center justify-center flex-1 py-8">
                      <Loader2 className="h-8 w-8 text-[#2fa36b] animate-spin mb-3" />
                      <p className="ml-2 text-muted-foreground">
                        Loading Material Lifts...
                      </p>
                    </div>
                  ) : error && filteredMaterialLifts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 px-4 py-8 mx-4 my-4 text-center border-2 border-dashed rounded-lg border-destructive-foreground bg-destructive/10">
                      <AlertTriangle className="w-10 h-10 mb-3 text-destructive" />
                      <p className="font-medium text-destructive">
                        Error Loading Lifts
                      </p>
                      <p className="max-w-md text-sm text-muted-foreground">
                        {error
                          .split("\n")
                          .find((line) => line.includes("lifts data")) || error}
                      </p>
                    </div>
                  ) : filteredMaterialLifts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 px-4 py-10 mx-4 my-4 text-center border-2 border-dashed rounded-lg border-green-200/50 dark:border-emerald-500/30 bg-green-50/50 dark:bg-emerald-500/10">
                      <Truck className="w-12 h-12 mb-3 text-green-500 dark:text-emerald-400" />
                      <p className="font-medium text-foreground">
                        No Material Lifts Recorded
                      </p>
                      <p className="text-sm text-center text-muted-foreground">
                        Create lifts from the 'Available POs' tab.
                        {user?.firmName &&
                          String(user.firmName).toLowerCase() !== "all" && (
                            <span className="block mt-1">
                              (Filtered by firm: {user.firmName})
                            </span>
                          )}
                      </p>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-auto max-h-[calc(100vh-280px)] min-h-[400px] relative custom-scrollbar rounded-b-lg">
                      <table className="w-full text-sm border-collapse">
                        <thead className="sticky top-0 z-30">
                          <tr className="bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
                            {LIFTS_COLUMNS_META.filter(
                              (col) => visibleLiftsColumns[col.dataKey],
                            ).map((col) => (
                              <th
                                key={col.dataKey}
                                className="px-3 py-3 text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase text-left bg-gray-50/95 dark:bg-zinc-800/95 backdrop-blur-sm shadow-sm whitespace-nowrap"
                              >
                                {col.header}
                              </th>
                            ))}
                            {isSuperAdmin && (
                              <th className="px-3 py-3 text-xs font-bold text-purple-700 dark:text-purple-400 uppercase text-left bg-gray-50/95 dark:bg-zinc-800/95 backdrop-blur-sm shadow-sm whitespace-nowrap">
                                SA Edit
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-100 dark:divide-zinc-800">
                          {filteredMaterialLifts.map((lift) => (
                            <tr
                              key={lift.id}
                              className="hover:bg-green-50/50 dark:hover:bg-emerald-500/10 transition-colors border-b border-gray-100 dark:border-zinc-800"
                            >
                              {LIFTS_COLUMNS_META.filter(
                                (col) => visibleLiftsColumns[col.dataKey],
                              ).map((column) => (
                                <td
                                  key={column.dataKey}
                                  className={`whitespace-nowrap text-xs px-3 py-2 ${
                                    column.dataKey === "id"
                                      ? "font-medium text-primary"
                                      : "text-gray-700 dark:text-zinc-300"
                                  } ${
                                    column.dataKey === "vendorName" ||
                                    column.dataKey === "material" ||
                                    column.dataKey === "transporterName"
                                      ? "truncate max-w-[150px]"
                                      : ""
                                  }`}
                                >
                                  {renderCell(lift, column)}
                                </td>
                              ))}
                              {isSuperAdmin && (
                                <td className="whitespace-nowrap text-xs px-3 py-2">
                                  <button
                                    onClick={() => setSuperAdminEditItem(lift)}
                                    className="inline-flex items-center px-2 py-1.5 bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 text-xs font-medium rounded-lg hover:bg-purple-200 dark:hover:bg-purple-500/20 border border-purple-300 dark:border-purple-500/30"
                                  >
                                    <ShieldCheck className="w-3 h-3 mr-1" />Edit
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {superAdminEditItem && (
        <SuperAdminEditModal
          title={superAdminEditItem._isPORow
            ? `Edit PO: ${superAdminEditItem.indentNo}`
            : `Edit Lift: ${superAdminEditItem.id}`}
          apiUrl={superAdminEditItem._isPORow
            ? `${API_URL}/purchase/lift/po/${superAdminEditItem.dbRowIds?.[0]}`
            : `${API_URL}/purchase/lift/entry/${superAdminEditItem._dbId}`}
          fields={superAdminEditItem._isPORow ? [
            { label: "Indent Id.", dbKey: "indentId", value: superAdminEditItem.indentNo, type: "text", readOnly: true },
            { label: "Vendor Name", dbKey: "vendorName", value: superAdminEditItem.vendorName, type: "text" },
            { label: "Firm Name", dbKey: "firmName", value: superAdminEditItem.firmName, type: "text" },
            { label: "Quantity", dbKey: "quantity", value: superAdminEditItem.quantity, type: "number" },
            { label: "Rate", dbKey: "rate", value: superAdminEditItem.rate, type: "number" },
            { label: "Alumina %", dbKey: "alumina", value: superAdminEditItem.alumina, type: "number" },
            { label: "Iron %", dbKey: "iron", value: superAdminEditItem.iron, type: "number" },
            { label: "Status", dbKey: "status", value: superAdminEditItem.status, type: "text" },
            { label: "Order Cancel Qty", dbKey: "orderCancelQty", value: superAdminEditItem.orderCancelQty, type: "number" },
            { label: "Cancel Reason", dbKey: "cancelReason", value: superAdminEditItem.cancelReason, type: "text" },
          ] : [
            { label: "Lift No", dbKey: "liftNo", value: superAdminEditItem.id, type: "text", readOnly: true },
            { label: "Indent No.", dbKey: "indentNo", value: superAdminEditItem.indentNo, type: "text", readOnly: true },
            { label: "Vendor Name", dbKey: "vendorName", value: superAdminEditItem.vendorName, type: "text" },
            { label: "Raw Material Name", dbKey: "material", value: superAdminEditItem.material, type: "text", readOnly: true },
            { label: "Bill No.", dbKey: "billNo", value: superAdminEditItem.billNo, type: "text" },
            { label: "Date Of Bill", dbKey: "dateOfBill", value: superAdminEditItem.dateOfBill, type: "date" },
            { label: "Qty", dbKey: "qty", value: superAdminEditItem.quantity, type: "number" },
            { label: "Lifting Qty", dbKey: "liftingQty", value: superAdminEditItem.liftingQty, type: "number" },
            { label: "Material Billing Quantity", dbKey: "truckQty", value: superAdminEditItem.additionalTruckQty, type: "number" },
            { label: "Truck No.", dbKey: "truckNo", value: superAdminEditItem.truckNo, type: "text" },
            { label: "Firm Name", dbKey: "firmName", value: superAdminEditItem.firmName, type: "text" },
            { label: "Rate", dbKey: "rate", value: superAdminEditItem.rate, type: "number" },
            { label: "Transporter Rate", dbKey: "transporterRate", value: superAdminEditItem.transportRate, type: "number" },
            { label: "Transporter Name", dbKey: "transporterName", value: superAdminEditItem.transporterName, type: "text" },
            { label: "Bilty No.", dbKey: "biltyNo", value: superAdminEditItem.biltyNo, type: "text" },
            { label: "Bill Image", dbKey: "billImage", value: superAdminEditItem.billImageUrl, type: "file", folder: "bill-images" },
          ]}
          onClose={() => setSuperAdminEditItem(null)}
          onSaved={() => { setSuperAdminEditItem(null); fetchMaterialLifts(); fetchPurchaseOrders(); }}
        />
      )}
      {showPopup && selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-3xl max-h-[95vh] flex flex-col">
            <CardHeader className="flex items-center justify-between py-5 px-7 bg-gray-50 dark:bg-zinc-800 rounded-t-xl">
              <CardTitle className="text-lg font-semibold text-gray-800 dark:text-white">
                Record Lift for{" "}
                <span className="text-[#2fa36b]">{formData.indentNo}</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClosePopup}
                className="text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300"
              >
                <X className="w-5 h-5" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-6 overflow-y-auto p-7 scrollbar-hide">
              <form onSubmit={handleSubmit}>
                <div className="p-4 mb-6 border rounded-lg dark:bg-zinc-800 border-slate-200 dark:border-zinc-700">
                  <h4 className="text-sm font-semibold text-[#268a59] mb-2">
                    Selected Purchase Order Details{" "}
                  </h4>
                  <div className="grid grid-cols-2 text-xs md:grid-cols-4 gap-x-4 gap-y-2">
                    <div>
                      <Label className="text-slate-500 dark:text-zinc-400">Indent No.</Label>
                      <p className="font-medium text-slate-600 dark:text-zinc-300">
                        {selectedPO.indentNo}
                      </p>
                    </div>
                    <div>
                      <Label className="text-slate-500 dark:text-zinc-400">Vendor</Label>
                      <p className="font-medium truncate text-slate-600 dark:text-zinc-300">
                        {selectedPO.vendorName}
                      </p>
                    </div>
                    <div>
                      <Label className="text-slate-500 dark:text-zinc-400">Material</Label>
                      <p className="font-medium truncate text-slate-600 dark:text-zinc-300">
                        {selectedLiftItems.length} product
                        {selectedLiftItems.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div>
                      <Label className="text-slate-500 dark:text-zinc-400">PO Quantity</Label>
                      <p className="font-medium text-slate-600 dark:text-zinc-300">
                        {selectedPO.quantity} units
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-6 overflow-hidden border rounded-lg border-slate-200 dark:border-zinc-700">
                  <div className="flex items-center justify-between px-4 py-3 dark:bg-zinc-800">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-white">
                        Products To Lift
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-zinc-400">
                        Edit quantities per product. Removed products will not
                        be included in this lift.
                      </p>
                    </div>
                    <div className="text-xs text-right text-slate-600 dark:text-zinc-300">
                      <p>
                        Total lift qty:{" "}
                        <span className="font-semibold">
                          {selectedLiftSummary.totalLiftQuantity || 0}
                        </span>
                      </p>
                      <p>
                        Material amount:{" "}
                        <span className="font-semibold">
                          Rs.{" "}
                          {formatMoney(selectedLiftSummary.totalMaterialAmount)}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="overflow-auto max-h-[300px] relative custom-scrollbar">
                    <table className="w-full text-sm border-collapse">
                      <thead className="sticky top-0 z-30">
                        <tr className="border-b border-slate-200">
                          <th className="px-3 py-2 text-xs font-bold text-slate-700 uppercase text-left /95 backdrop-blur-sm shadow-sm whitespace-nowrap">Product</th>
                          <th className="px-3 py-2 text-xs font-bold text-slate-700 uppercase text-left /95 backdrop-blur-sm shadow-sm whitespace-nowrap">RI Number</th>
                          <th className="px-3 py-2 text-xs font-bold text-slate-700 uppercase text-right /95 backdrop-blur-sm shadow-sm whitespace-nowrap">Indent Qty</th>
                          <th className="px-3 py-2 text-xs font-bold text-slate-700 uppercase text-right /95 backdrop-blur-sm shadow-sm whitespace-nowrap">Lifted</th>
                          <th className="px-3 py-2 text-xs font-bold text-slate-700 uppercase text-right /95 backdrop-blur-sm shadow-sm whitespace-nowrap">Pending</th>
                          <th className="px-3 py-2 text-xs font-bold text-slate-700 uppercase text-right /95 backdrop-blur-sm shadow-sm whitespace-nowrap">Bill Rate</th>
                          <th className="px-3 py-2 text-xs font-bold text-slate-700 uppercase text-right /95 backdrop-blur-sm shadow-sm whitespace-nowrap">Lift Qty</th>
                          <th className="px-3 py-2 text-xs font-bold text-slate-700 uppercase text-right /95 backdrop-blur-sm shadow-sm whitespace-nowrap">Amount</th>
                          <th className="px-3 py-2 text-xs font-bold text-slate-700 uppercase text-center /95 backdrop-blur-sm shadow-sm whitespace-nowrap">Remove</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-100">
                        {selectedLiftItems.map((item) => (
                          <tr key={item.key} className="hover: transition-colors border-b border-slate-100">
                            <td className="px-3 py-2 font-medium text-slate-700 text-xs">
                              {item.material}
                            </td>
                            <td className="px-3 py-2 text-xs text-slate-600">
                              {item.indentId || "-"}
                            </td>
                            <td className="px-3 py-2 text-right text-xs">
                              {item.maxQuantity}
                            </td>
                            <td className="px-3 py-2 text-right text-xs">
                              {item.liftedQuantity}
                            </td>
                            <td className="px-3 py-2 text-right text-xs">
                              {item.pendingQuantity}
                            </td>
                            <td className="px-3 py-2 text-right text-xs">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.rate}
                                onChange={(e) =>
                                  handleLiftItemRateChange(
                                    item.key,
                                    e.target.value,
                                  )
                                }
                                className="h-8 ml-auto text-right w-24 text-xs"
                              />
                            </td>
                            <td className="px-3 py-2 text-right text-xs">
                              <Input
                                type="number"
                                min="0"
                                step="0.001"
                                value={item.quantityToLift}
                                onChange={(e) =>
                                  handleLiftItemQuantityChange(
                                    item.key,
                                    e.target.value,
                                  )
                                }
                                className="h-8 ml-auto text-right w-28 text-xs"
                              />
                              {formErrors[`liftItem-${item.key}`] && (
                                <p className="mt-1 text-xs text-red-600">
                                  {formErrors[`liftItem-${item.key}`]}
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right text-xs">
                              Rs.{" "}
                              {formatMoney(
                                toNumber(item.quantityToLift) * item.rate,
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveLiftItem(item.key)}
                                className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {formErrors.liftItems && (
                    <p className="px-4 py-2 text-xs text-red-600 border-t border-slate-200">
                      {formErrors.liftItems}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
                  {[
                    {
                      label: "Bill No.",
                      name: "billNo",
                      type: "text",
                      isRequired: true,
                    },
                    {
                      label: "Date Of Bill",
                      name: "dateOfBill",
                      type: "date",
                    },
                    {
                      label: "Area Lifting",
                      name: "Arealifting",
                      type: "select",
                      options: [
                        { value: "", label: "Select area" },
                        ...areaOptions,
                      ],
                      isRequired: true,
                    },
                    {
                      label: "Lead Time (Days)",
                      name: "liftingLeadTime",
                      type: "number",
                      isRequired: true,
                    },
                    {
                      label: "Truck No.",
                      name: "truckNo",
                      type: "text",
                      isRequired: true,
                    },
                    {
                      label: "Driver No.",
                      name: "driverNo",
                      type: "text",
                      isRequired: true,
                    },
                    {
                      label: "Transporter Name",
                      name: "TransporterName",
                      type: "select",
                      disabled: false,
                      options: [
                        { value: "", label: "Select transporter" },
                        ...transporterOptions,
                      ],
                      isRequired: true,
                    },
                    {
                      label: "Type Of Transporting Rate",
                      name: "rateType",
                      type: "select",
                      disabled: false,
                      options: [
                        { value: "", label: "Select rate type" },
                        ...rateTypeOptions,
                      ],
                      isRequired: true,
                    },
                    ...(formData.rateType === "Per MT"
                      ? [
                          {
                            label: "Transporting Per MT Rate",
                            name: "transportingRate",
                            type: "text",
                            step: "any",
                            isRequired: true,
                          },
                        ]
                      : []),
                    {
                      label: "Transportation Total Amount",
                      name: "transportRate",
                      type: "text",
                      step: "any",
                      isRequired: true,
                      readOnly: false,
                    },
                    {
                      label: "Material Billing Quantity",
                      name: "additionalTruckQty",
                      type: "text",
                      step: "any",
                      isRequired: true,
                    },
                  ].map((field) => {
                    const placeholderLabel =
                      field.type === "select"
                        ? field.options.find((opt) => opt.value === "")
                            ?.label ||
                          `Select ${field.label.toLowerCase().replace(" *", "")}`
                        : field.label.replace(" *", "");
                    const actualOptions =
                      field.type === "select"
                        ? field.options.filter((opt) => opt.value !== "")
                        : [];
                    return (
                      <div key={field.name}>
                        <Label
                          className="block mb-1 text-sm font-medium text-gray-700"
                          htmlFor={field.name}
                        >
                          {field.label}{" "}
                          {field.isRequired && (
                            <span className="text-red-500">*</span>
                          )}
                        </Label>
                        {field.type === "select" ? (
                          <Select
                            name={field.name}
                            value={formData[field.name]}
                            disabled={field.disabled}
                            onValueChange={(value) =>
                              handleFormSelectChange(field.name, value)
                            }
                          >
                            <SelectTrigger
                              className={`w-full ${formErrors[field.name] ? "border-red-500" : "border-gray-300"} ${field.disabled ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
                            >
                              <SelectValue placeholder={placeholderLabel} />
                            </SelectTrigger>
                            <SelectContent>
                              {actualOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            type={field.type}
                            id={field.name}
                            name={field.name}
                            value={formData[field.name]}
                            onChange={handleInputChange}
                            step={field.step}
                            readOnly={field.readOnly}
                            disabled={field.readOnly}
                            className={`${formErrors[field.name] ? "border-red-500" : "border-gray-300"} ${field.readOnly ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
                            placeholder={placeholderLabel}
                          />
                        )}
                        {formErrors[field.name] && (
                          <p className="mt-1 text-xs text-red-600">
                            {formErrors[field.name]}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {formData.TransporterName && transporterMasterMap[formData.TransporterName] && (
                  <div className="p-3.5 mb-6 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-lg text-xs">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 font-semibold text-blue-800 dark:text-blue-300">
                        <Truck className="w-3.5 h-3.5" />
                        Transporter Profile: {formData.TransporterName}
                      </div>
                      <Badge variant="outline" className="text-xs bg-blue-100/70 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-300">
                        Role: Transporter
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-slate-600 dark:text-zinc-300">
                      {transporterMasterMap[formData.TransporterName].gstNumber && (
                        <div>
                          <span className="text-slate-400 dark:text-zinc-500 block text-[10px] uppercase font-bold">GST Number</span>
                          <span className="font-medium">{transporterMasterMap[formData.TransporterName].gstNumber}</span>
                        </div>
                      )}
                      {transporterMasterMap[formData.TransporterName].phoneNumber && (
                        <div>
                          <span className="text-slate-400 dark:text-zinc-500 block text-[10px] uppercase font-bold">Phone</span>
                          <span className="font-medium">{transporterMasterMap[formData.TransporterName].phoneNumber}</span>
                        </div>
                      )}
                      {transporterMasterMap[formData.TransporterName].email && (
                        <div>
                          <span className="text-slate-400 dark:text-zinc-500 block text-[10px] uppercase font-bold">Email</span>
                          <span className="font-medium">{transporterMasterMap[formData.TransporterName].email}</span>
                        </div>
                      )}
                      {transporterMasterMap[formData.TransporterName].bankAccountNo && (
                        <div>
                          <span className="text-slate-400 dark:text-zinc-500 block text-[10px] uppercase font-bold">Bank A/C</span>
                          <span className="font-medium">{transporterMasterMap[formData.TransporterName].bankAccountNo}</span>
                        </div>
                      )}
                      {transporterMasterMap[formData.TransporterName].ifscCode && (
                        <div>
                          <span className="text-slate-400 dark:text-zinc-500 block text-[10px] uppercase font-bold">IFSC Code</span>
                          <span className="font-medium">{transporterMasterMap[formData.TransporterName].ifscCode}</span>
                        </div>
                      )}
                      {transporterMasterMap[formData.TransporterName].rateType && (
                        <div>
                          <span className="text-slate-400 dark:text-zinc-500 block text-[10px] uppercase font-bold">Default Rate Type</span>
                          <span className="font-medium">{transporterMasterMap[formData.TransporterName].rateType}</span>
                        </div>
                      )}
                      {transporterMasterMap[formData.TransporterName].firmName && (
                        <div>
                          <span className="text-slate-400 dark:text-zinc-500 block text-[10px] uppercase font-bold">Firm</span>
                          <span className="font-medium">{transporterMasterMap[formData.TransporterName].firmName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {formData.Type !== "Common" && (
                  <div className="col-span-3">
                    <Label
                      className="block mb-1 text-sm font-medium text-gray-700"
                      htmlFor="hasBilty"
                    >
                      Has Bilty? <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      name="hasBilty"
                      value={formData.hasBilty}
                      onValueChange={(value) =>
                        handleFormSelectChange("hasBilty", value)
                      }
                    >
                      <SelectTrigger
                        className={`w-full ${formErrors.hasBilty ? "border-red-500" : "border-gray-300"}`}
                      >
                        <SelectValue placeholder="Select option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                    {formErrors.hasBilty && (
                      <p className="mt-1 text-xs text-red-600">
                        {formErrors.hasBilty}
                      </p>
                    )}
                  </div>
                )}

                {formData.hasBilty === "yes" && (
                  <>
                    <div>
                      <Label
                        className="block mb-1 text-sm font-medium text-gray-700"
                        htmlFor="biltyNo"
                      >
                        Bilty Number <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="text"
                        id="biltyNo"
                        name="biltyNo"
                        value={formData.biltyNo}
                        onChange={handleInputChange}
                        className={`${formErrors.biltyNo ? "border-red-500" : "border-gray-300"}`}
                        placeholder="Enter bilty number"
                      />
                      {formErrors.biltyNo && (
                        <p className="mt-1 text-xs text-red-600">
                          {formErrors.biltyNo}
                        </p>
                      )}
                    </div>

                    <div className="col-span-2">
                      <Label
                        className="block mb-1 text-sm font-medium text-gray-700"
                        htmlFor="biltyImage"
                      >
                        Upload Bilty Image{" "}
                        <span className="text-red-500">*</span>
                      </Label>
                      <div
                        className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 ${formErrors.biltyImage ? "border-red-500" : "border-gray-300"} border-dashed rounded-md hover:border-green-400 transition-colors`}
                      >
                        <div className="space-y-1 text-center">
                          <Upload className="w-10 h-10 mx-auto text-gray-400" />
                          <div className="flex justify-center text-sm text-gray-600">
                            <Label
                              htmlFor="biltyImage"
                              className="relative cursor-pointer bg-white rounded-md font-medium text-[#2fa36b] hover:text-green-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-[#268a59] px-1"
                            >
                              <span>Upload bilty image</span>
                              <Input
                                id="biltyImage"
                                name="biltyImage"
                                type="file"
                                className="sr-only"
                                onChange={(e) => {
                                  const { name, files } = e.target;
                                  setFormData({
                                    ...formData,
                                    [name]: files && files[0] ? files[0] : null,
                                  });
                                }}
                                accept="image/*,.pdf"
                              />
                            </Label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500">
                            {formData.biltyImage
                              ? formData.biltyImage.name
                              : "PNG, JPG, PDF up to 10MB"}
                          </p>
                        </div>
                      </div>
                      {formErrors.biltyImage && (
                        <p className="mt-1 text-xs text-red-600">
                          {formErrors.biltyImage}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {formData.Type !== "Common" && (
                  <div className="mt-5">
                    <Label
                      className="block mb-1 text-sm font-medium text-gray-700"
                      htmlFor="billImage"
                    >
                      Upload Bill Image <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex justify-center px-6 pt-5 pb-6 mt-1 transition-colors border-2 border-gray-300 border-dashed rounded-md hover:border-green-400">
                      <div className="space-y-1 text-center">
                        <Upload className="w-10 h-10 mx-auto text-gray-400" />
                        <div className="flex justify-center text-sm text-gray-600">
                          <Label
                            htmlFor="billImage"
                            className="relative cursor-pointer bg-white rounded-md font-medium text-[#2fa36b] hover:text-green-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-[#268a59] px-1"
                          >
                            <span>Upload a file</span>
                            <Input
                              id="billImage"
                              name="billImage"
                              type="file"
                              className="sr-only"
                              onChange={handleFileUpload}
                              accept="image/*,.pdf"
                            />
                          </Label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          {formData.billImage
                            ? formData.billImage.name
                            : "PNG, JPG, PDF up to 10MB"}
                        </p>
                      </div>
                    </div>
                    {formErrors.billImage && (
                      <p className="mt-1 text-xs text-red-600">
                        {formErrors.billImage}
                      </p>
                    )}
                  </div>
                )}

                {formData.Type !== "Common" && (
                  <div className="mt-5">
                    <Label
                      className="block mb-1 text-sm font-medium text-gray-700"
                      htmlFor="testingCertificate"
                    >
                      Upload Testing Certificate
                    </Label>
                    <div className="flex justify-center px-6 pt-5 pb-6 mt-1 transition-colors border-2 border-gray-300 border-dashed rounded-md hover:border-green-400">
                      <div className="space-y-1 text-center">
                        <FileUp className="w-10 h-10 mx-auto text-gray-400" />
                        <div className="flex justify-center text-sm text-gray-600">
                          <Label
                            htmlFor="testingCertificate"
                            className="relative cursor-pointer bg-white rounded-md font-medium text-[#2fa36b] hover:text-green-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-[#268a59] px-1"
                          >
                            <span>Upload testing certificate</span>
                            <Input
                              id="testingCertificate"
                              name="testingCertificate"
                              type="file"
                              className="sr-only"
                              onChange={handleFileUpload}
                              accept="image/*,.pdf,.doc,.docx"
                            />
                          </Label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          {formData.testingCertificate
                            ? formData.testingCertificate.name
                            : "PNG, JPG, PDF, DOC, DOCX up to 10MB"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-4 pt-6 mt-4 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClosePopup}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="w-full md:w-auto"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin my-0.5" />{" "}
                        Recording Lift...
                      </>
                    ) : (
                      "Record Material Lifting"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cancel Pending PO Quantity Popup */}
      {cancelPendingPO.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-9999 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex items-center justify-between px-6 py-5 bg-gray-50">
              <CardTitle className="text-lg font-semibold text-gray-800">
                Cancel Pending PO Quantity
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCloseCancelPopup}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </Button>
            </CardHeader>

            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <Label>Indent No.</Label>
                      <p className="font-medium">{cancelPendingPO.indentNo}</p>
                    </div>
                    <div>
                      <Label>Current Cancel Qty</Label>
                      <p className="font-medium">
                        {purchaseOrders.find(
                          (po) => po.id === cancelPendingPO.poId,
                        )?.orderCancelQty || "0"}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Cancel Quantity *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={cancelPendingPO.cancelQuantity}
                    onChange={handleCancelQuantityChange}
                    placeholder="Enter quantity"
                  />
                </div>

                <div>
                  <Label>Reason of Cancel *</Label>
                  <Input
                    type="text"
                    value={cancelPendingPO.reason}
                    onChange={(e) =>
                      setCancelPendingPO((prev) => ({
                        ...prev,
                        reason: e.target.value,
                      }))
                    }
                    placeholder="Enter reason for cancellation"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={handleCloseCancelPopup}>
                    Cancel
                  </Button>
                  <Button
                    onClick={submitCancelPendingPO}
                    disabled={cancelPendingPO.loading}
                  >
                    {cancelPendingPO.loading ? "Submitting..." : "Submit"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
