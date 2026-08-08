"use client";

import { useState, useEffect, useCallback, useMemo, useContext } from "react";
// Shadcn/ui components
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
// Remove Command import if you don't have it, or install it
// import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"

// Sonner Toast
import { toast } from "sonner";

// Lucide icons - FIXED: Correct icon name
import {
  Beaker,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Info,
  History,
  FileCheckIcon,
  Filter,
  ChevronsUpDown,
  ShieldCheck,
  Download,
  Undo2,
} from "lucide-react";
import { MixerHorizontalIcon } from "@radix-ui/react-icons";
import { AuthContext } from "../context/AuthContext";
import SuperAdminEditModal from "./SuperAdminEditModal";
import { API_URL, getToken } from "@/lib/auth";


// --- Helper to parse Google Sheet gviz JSON response ---
const parseGvizResponse = (text, sheetNameForError) => {
  if (!text || !text.includes("google.visualization.Query.setResponse")) {
    console.error(
      `Invalid or empty gviz response for ${sheetNameForError}:`,
      text ? text.substring(0, 500) : "Response was null/empty",
    );
    throw new Error(
      `Invalid response format from Google Sheets for ${sheetNameForError}. Please ensure the sheet is publicly accessible and the sheet name is correct.`,
    );
  }

  try {
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}") + 1;
    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error(`Could not find JSON data in response`);
    }

    const jsonString = text.substring(jsonStart, jsonEnd);
    const data = JSON.parse(jsonString);

    if (data.status === "error") {
      throw new Error(
        `Google Sheets API Error: ${data.errors?.[0]?.detailed_message || "Unknown error"}`,
      );
    }

    if (!data.table) {
      console.warn(`No data.table in ${sheetNameForError}, treating as empty.`);
      return { cols: [], rows: [] };
    }

    if (!data.table.cols) {
      console.warn(
        `No data.table.cols in ${sheetNameForError}, treating as empty.`,
      );
      return { cols: [], rows: [] };
    }

    if (!data.table.rows) {
      console.warn(
        `No data.table.rows in ${sheetNameForError}, treating as empty.`,
      );
      data.table.rows = [];
    }

    return data.table;
  } catch (parseError) {
    console.error("JSON Parse Error:", parseError);
    throw new Error(
      `Failed to parse response from Google Sheets: ${parseError.message}`,
    );
  }
};

// Function to format date string
const formatDateString = (dateValue) => {
  if (!dateValue || typeof dateValue !== "string" || !dateValue.trim()) {
    return "";
  }

  const gvizMatch = dateValue.match(
    /^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?/,
  );
  if (gvizMatch) {
    const [, year, month, day, hours, minutes, seconds] = gvizMatch.map(Number);
    const parsedDate = new Date(
      year,
      month,
      day,
      hours || 0,
      minutes || 0,
      seconds || 0,
    );
    if (!isNaN(parsedDate.getTime())) {
      return new Intl.DateTimeFormat("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(parsedDate);
    }
  }

  const dateObj = new Date(dateValue);
  if (!isNaN(dateObj.getTime())) {
    return new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(dateObj);
  }

  return dateValue;
};

// --- Column Definitions for Tables ---
const ELIGIBLE_TESTS_COLUMNS_META = [
  {
    header: "Action",
    dataKey: "actionColumn",
    toggleable: false,
    alwaysVisible: true,
  },
  {
    header: "Lift Number",
    dataKey: "liftNo",
    toggleable: true,
    alwaysVisible: true,
  },
  {
    header: "RI Number",
    dataKey: "indentNo",
    toggleable: true,
  },
  {
    header: "Planned Date",
    dataKey: "aiCondition_val_formatted",
    toggleable: true,
  },
  { header: "PO Number", dataKey: "poNumber", toggleable: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
  { header: "Bill No.", dataKey: "billNo", toggleable: true },
  { header: "Date Of Bill", dataKey: "dateOfBill", toggleable: true },
  { header: "Party Name", dataKey: "vendorName", toggleable: true },
  { header: "Product Name", dataKey: "rawMaterialName", toggleable: true },
  { header: "Truck Number", dataKey: "truckNo", toggleable: true },
];

const RECORDED_TESTS_COLUMNS_META = [
  {
    header: "Lift Number",
    dataKey: "liftNo",
    toggleable: true,
    alwaysVisible: true,
  },
  {
    header: "RI Number",
    dataKey: "indentNo",
    toggleable: true,
  },
  {
    header: "Test Date (AM)",
    dataKey: "amDateOfTest_formatted_val",
    toggleable: true,
  },
  {
    header: "Test Timestamp (AJ)",
    dataKey: "ajTimestamp_formatted_val",
    toggleable: true,
  },
  {
    header: "Status (AL)",
    dataKey: "alStatus_val",
    toggleable: true,
    isBadge: true,
  },
  {
    header: "Moisture % (AN)",
    dataKey: "anMoisturePercent_val",
    toggleable: true,
  },
  { header: "BD % (AO)", dataKey: "aoBdPercent_val", toggleable: true },
  { header: "AP % (AP)", dataKey: "apApPercent_val", toggleable: true },
  {
    header: "Alumina % (AQ)",
    dataKey: "aqAluminaPercent_val",
    toggleable: true,
  },
  { header: "Iron % (AR)", dataKey: "arIronPercent_val", toggleable: true },
  {
    header: "Sieve Analysis (AS)",
    dataKey: "asSieveAnalysis_val",
    toggleable: true,
  },
  { header: "LOI % (AT)", dataKey: "atLoiPercent_val", toggleable: true },
  { header: "SiO2 % (AU)", dataKey: "auSio2Percent_val", toggleable: true },
  { header: "CaO % (AV)", dataKey: "avCaoPercent_val", toggleable: true },
  { header: "MgO % (AW)", dataKey: "awMgoPercent_val", toggleable: true },
  { header: "TiO2 % (AX)", dataKey: "axTio2Percent_val", toggleable: true },
  {
    header: "K2O+Na2O % (AY)",
    dataKey: "ayKna2oPercent_val",
    toggleable: true,
  },
  {
    header: "Free Iron % (AZ)",
    dataKey: "azFreeIronPercent_val",
    toggleable: true,
  },
  { header: "Reason", dataKey: "baReason_val", toggleable: true },
  { header: "Truck Number", dataKey: "truckNo", toggleable: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
];

// Simple SearchableSelect Component (without Command)
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
        className={`w-full justify-between h-9 bg-white dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700 text-xs ${className}`}
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
              className={`px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800/60 dark:text-zinc-100 ${value === "all" ? "bg-green-50 dark:bg-emerald-500/10" : ""}`}
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
                className={`px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800/60 dark:text-zinc-100 ${value === option ? "bg-green-50 dark:bg-emerald-500/10" : ""}`}
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

export default function LabTesting() {
  const { user, isSuperAdmin } = useContext(AuthContext);
  const [allLiftsData, setAllLiftsData] = useState([]);
  const [superAdminEditItem, setSuperAdminEditItem] = useState(null);
  const [indentData, setIndentData] = useState([]);
  const [selectedReceiptForModal, setSelectedReceiptForModal] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [errorData, setErrorData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Tab and Column Visibility States
  const [activeTab, setActiveTab] = useState("eligibleForTest");
  const [visibleEligibleTestColumns, setVisibleEligibleTestColumns] = useState(
    {},
  );
  const [visibleRecordedTestColumns, setVisibleRecordedTestColumns] = useState(
    {},
  );

  // Filter State
  const [filters, setFilters] = useState({
    vendorName: "all",
    materialName: "all",
    liftType: "all",
    totalQuantity: "all",
    orderNumber: "all",
  });

  const initialFormData = {
    liftIdToUpdate: "",
    alStatus: "",
    amDateOfTest: new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    }),
    anMoisturePercent: "",
    aoBdPercent: "",
    apApPercent: "",
    aqAluminaPercent: "",
    arIronPercent: "",
    asSieveAnalysis: "",
    atLoiPercent: "",
    auSio2Percent: "",
    avCaoPercent: "",
    awMgoPercent: "",
    axTio2Percent: "",
    ayKna2oPercent: "",
    azFreeIronPercent: "",
    baReason: "",
  };

  const [formData, setFormData] = useState(initialFormData);
  const [formErrors, setFormErrors] = useState({});

  // Filter Handlers
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearAllFilters = () => {
    setFilters({
      vendorName: "all",
      materialName: "all",
      liftType: "all",
      totalQuantity: "all",
      orderNumber: "all",
    });
  };

  // Function to get expected values
  // Function to get expected values
  // Function to get expected values
  const getExpectedValues = (indentNo) => {
    try {
      if (!indentNo || !indentData.length) {
        return { poQuantity: "", expectedAlumina: "", expectedIron: "" };
      }

      // Clean the indent number for comparison
      const cleanIndentNo = String(indentNo).trim().toLowerCase();

      // Find matching indent with multiple matching strategies
      const indent = indentData.find((item) => {
        if (!item.indentNo) return false;

        const itemIndent = String(item.indentNo).trim().toLowerCase();

        // Direct match
        if (itemIndent === cleanIndentNo) return true;

        // Try matching with/without prefixes like "RL-", "PO-", etc.
        const cleanIndentNoWithoutPrefix = cleanIndentNo.replace(
          /^(rl[-_ ]?|po[-_ ]?|indent[-_ ]?)/i,
          "",
        );
        const itemIndentWithoutPrefix = itemIndent.replace(
          /^(rl[-_ ]?|po[-_ ]?|indent[-_ ]?)/i,
          "",
        );

        if (itemIndentWithoutPrefix === cleanIndentNoWithoutPrefix) return true;

        // Try extracting numeric part only
        const cleanIndentNumeric = cleanIndentNo.match(/\d+/)?.[0];
        const itemIndentNumeric = itemIndent.match(/\d+/)?.[0];

        if (
          cleanIndentNumeric &&
          itemIndentNumeric &&
          cleanIndentNumeric === itemIndentNumeric
        )
          return true;

        return false;
      });

      return {
        poQuantity: indent?.poQuantity || "",
        expectedAlumina: indent?.expectedAlumina || "",
        expectedIron: indent?.expectedIron || "",
        expectedAp: indent?.expectedAp || "",
        expectedBd: indent?.expectedBd || "",
      };
    } catch (error) {
      console.error("Error in getExpectedValues:", error);
      return { poQuantity: "", expectedAlumina: "", expectedIron: "" };
    }
  };

  // Fetch Lab Data from backend API
  // (indent data is included via the lab endpoint)
  // Initialize column visibility
  useEffect(() => {
    const initializeVisibility = (columnsMeta) => {
      const visibility = {};
      columnsMeta.forEach((col) => {
        visibility[col.dataKey] = col.alwaysVisible || col.toggleable;
      });
      return visibility;
    };
    setVisibleEligibleTestColumns(
      initializeVisibility(ELIGIBLE_TESTS_COLUMNS_META),
    );
    setVisibleRecordedTestColumns(
      initializeVisibility(RECORDED_TESTS_COLUMNS_META),
    );
  }, []);

  // Fetch Lab Data from backend API
  useEffect(() => {
    const fetchLabData = async () => {
      setLoadingData(true);
      setErrorData(null);
      try {
        const res = await fetch(`${API_URL}/purchase/lab/data`);
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || 'Failed to fetch lab data');
        const formatTimestamp = (dateValue) => {
          if (!dateValue) return "";
          try {
            const d = new Date(dateValue);
            if (!isNaN(d.getTime())) return d.toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).replace(/,/g, "");
          } catch (e) { return String(dateValue); }
          return String(dateValue);
        };
        const pendingMapped = (json.data.pending || []).map((l) => ({
          _dbId: l.id,
          id: l.liftNo || String(l.id), liftNo: l.liftNo || '', indentNo: l.indentNo || '',
          firmName: l.firmName || '', vendorName: l.vendorName || '', rawMaterialName: l.rawMaterialName || '',
          qty: l.qty || '', liftingQty: l.liftingQty || '', billNo: l.billNo || '',
          areaLifting: l.areaLifting || '', type: l.type || '', truckNo: l.truckNo || '',
          biltyNo: l.biltyNo || '', biltyImage: l.biltyImage || '', rate: l.rate || '',
          billImage: l.billImage || '', transporterName: l.transporterName || '',
          dateOfReceiving_formatted: formatTimestamp(l.dateOfReceiving),
          actualQuantity: l.actualQuantity || '', physicalCondition: l.physicalCondition || '',
          aluminaTarget: l.aluminaTarget || '', ironTarget: l.ironTarget || '',
          // Used for table display compatibility
          aiCondition: l.dateOfReceiving || null, ajTimestampOrNull: null,
          alStatus_val: '', amDateOfTest_val: '', anMoisturePercent_val: '',
          aoBdPercent_val: '', apApPercent_val: '', aqAluminaPercent_val: '',
          arIronPercent_val: '', asSieveAnalysis_val: '', atLoiPercent_val: '',
          auSio2Percent_val: '', avCaoPercent_val: '', awMgoPercent_val: '',
          axTio2Percent_val: '', ayKna2oPercent_val: '', azFreeIronPercent_val: '',
          baReason_val: '', poQuantity: '', expectedAlumina: l.aluminaTarget || '',
          expectedIron: l.ironTarget || '',
        }));
        const historyMapped = (json.data.history || []).map((l) => ({
          _dbId: l.id,
          id: l.liftNo || String(l.id), liftNo: l.liftNo || '', indentNo: l.indentNo || '',
          firmName: l.firmName || '', vendorName: l.vendorName || '', rawMaterialName: l.rawMaterialName || '',
          qty: l.qty || '', liftingQty: l.liftingQty || '', billNo: l.billNo || '',
          areaLifting: l.areaLifting || '', type: l.type || '', truckNo: l.truckNo || '',
          biltyNo: l.biltyNo || '', biltyImage: l.biltyImage || '', rate: l.rate || '',
          billImage: l.billImage || '', transporterName: l.transporterName || '',
          dateOfReceiving_formatted: formatTimestamp(l.dateOfReceiving),
          actualQuantity: l.actualQuantity || '', physicalCondition: l.physicalCondition || '',
          aluminaTarget: l.aluminaTarget || '', ironTarget: l.ironTarget || '',
          aiCondition: l.dateOfReceiving || 'done', ajTimestampOrNull: l.dateOfTest || 'done',
          alStatus_val: l.status || '', amDateOfTest_val: formatTimestamp(l.dateOfTest),
          anMoisturePercent_val: l.moisturePercent || '', aoBdPercent_val: l.bdPercent || '',
          apApPercent_val: l.apPercent || '', aqAluminaPercent_val: l.aluminaPercent || '',
          arIronPercent_val: l.ironPercent || '', asSieveAnalysis_val: l.sieveAnalysis || '',
          atLoiPercent_val: l.loiPercent || '', auSio2Percent_val: l.sio2Percent || '',
          avCaoPercent_val: l.caoPercent || '', awMgoPercent_val: l.mgoPercent || '',
          axTio2Percent_val: l.tio2Percent || '', ayKna2oPercent_val: l.k2oNa2oPercent || '',
          azFreeIronPercent_val: l.freeIronPercent || '', baReason_val: l.reason || '',
          poQuantity: l.liftingQty || '', expectedAlumina: l.aluminaTarget || '', expectedIron: l.ironTarget || '',
          labId: l.labId,
        }));
        let processedData = [...pendingMapped, ...historyMapped];
        if (user?.firmName) {
          processedData = processedData.filter((lift) => lift && (user.firmName === 'all' || String(user.firmName).toLowerCase() === 'all' || (Array.isArray(user.firmName) ? user.firmName.some(f => String(f).toLowerCase() === String(lift.firmName).toLowerCase()) : String(user.firmName).toLowerCase() === String(lift.firmName).toLowerCase())));
        }
        setAllLiftsData(processedData);
      } catch (err) {
        setErrorData(`Failed to load data: ${err.message}.`);
      } finally {
        setLoadingData(false);
      }
    };
    fetchLabData();
  }, [refreshTrigger, user]);

  const uniqueFilterOptions = useMemo(() => {
    const vendors = new Set();
    const materials = new Set();
    const types = new Set();
    const quantities = new Set();
    const orders = new Set();

    allLiftsData.forEach((lift) => {
      if (lift.vendorName) vendors.add(lift.vendorName);
      if (lift.rawMaterialName) materials.add(lift.rawMaterialName);
      if (lift.type) types.add(lift.type);
      if (lift.qty) quantities.add(lift.qty);
      if (lift.actualQuantity) quantities.add(lift.actualQuantity);

      if (lift.indentNo) orders.add(lift.indentNo);
      if (lift.billNo) orders.add(lift.billNo);
    });

    return {
      vendorName: [...vendors].sort(),
      materialName: [...materials].sort(),
      liftType: [...types].sort(),
      totalQuantity: [...quantities].sort(
        (a, b) => parseFloat(a) - parseFloat(b),
      ),
      orderNumber: [...orders].sort(),
    };
  }, [allLiftsData]);

  const receiptsAwaitingLabTest = useMemo(() => {
    let filtered = allLiftsData.filter((lift) => lift.aiCondition && !lift.ajTimestampOrNull);
    
    if (filters.vendorName !== "all") {
      filtered = filtered.filter((lift) => lift.vendorName === filters.vendorName);
    }
    if (filters.materialName !== "all") {
      filtered = filtered.filter((lift) => lift.rawMaterialName === filters.materialName);
    }
    if (filters.liftType !== "all") {
      filtered = filtered.filter((lift) => lift.type === filters.liftType);
    }
    if (filters.totalQuantity !== "all") {
      filtered = filtered.filter(
        (lift) =>
          lift.qty === filters.totalQuantity ||
          lift.actualQuantity === filters.totalQuantity
      );
    }
    if (filters.orderNumber !== "all") {
      filtered = filtered.filter(
        (lift) =>
          lift.indentNo === filters.orderNumber ||
          lift.billNo === filters.orderNumber
      );
    }
    return filtered;
  }, [allLiftsData, filters]);

  const recordedLabTests = useMemo(() => {
    let filtered = allLiftsData.filter((lift) => lift.ajTimestampOrNull);
    
    if (filters.vendorName !== "all") {
      filtered = filtered.filter((lift) => lift.vendorName === filters.vendorName);
    }
    if (filters.materialName !== "all") {
      filtered = filtered.filter((lift) => lift.rawMaterialName === filters.materialName);
    }
    if (filters.liftType !== "all") {
      filtered = filtered.filter((lift) => lift.type === filters.liftType);
    }
    if (filters.totalQuantity !== "all") {
      filtered = filtered.filter(
        (lift) =>
          lift.qty === filters.totalQuantity ||
          lift.actualQuantity === filters.totalQuantity
      );
    }
    if (filters.orderNumber !== "all") {
      filtered = filtered.filter(
        (lift) =>
          lift.indentNo === filters.orderNumber ||
          lift.billNo === filters.orderNumber
      );
    }
    
    return filtered.sort((a, b) => {
      const dateA = new Date(a.amDateOfTest_val || 0);
      const dateB = new Date(b.amDateOfTest_val || 0);
      return dateB - dateA;
    });
  }, [allLiftsData, filters]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleSelectChange = (name) => (value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleOpenLabTestModal = (receipt) => {
    console.log("Opening modal for receipt:", {
      liftNo: receipt?.liftNo,
      indentNo: receipt?.indentNo,
      vendorName: receipt?.vendorName,
    });

    if (!receipt || !receipt.liftNo) {
      toast.error("Invalid Receipt", {
        description: "Cannot open lab test form for this receipt.",
        icon: <XCircle className="w-4 h-4" />,
      });
      return;
    }

    // Reset form first
    setFormErrors({});

    // Set form data
    let initialStatus = "";
    if (receipt.alStatus_val) {
      const valLower = receipt.alStatus_val.toLowerCase();
      if (valLower === "accepted" || valLower === "tested")
        initialStatus = "Accepted";
      else if (valLower === "rejected" || valLower === "not tested")
        initialStatus = "Rejected";
    }

    setFormData({
      liftIdToUpdate: receipt.liftNo,
      alStatus: initialStatus,
      amDateOfTest:
        receipt.amDateOfTest_val ||
        new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
      anMoisturePercent: receipt.anMoisturePercent_val || "",
      aoBdPercent: receipt.aoBdPercent_val || "",
      apApPercent: receipt.apApPercent_val || "",
      aqAluminaPercent: receipt.aqAluminaPercent_val || "",
      arIronPercent: receipt.arIronPercent_val || "",
      asSieveAnalysis: receipt.asSieveAnalysis_val || "",
      atLoiPercent: receipt.atLoiPercent_val || "",
      auSio2Percent: receipt.auSio2Percent_val || "",
      avCaoPercent: receipt.avCaoPercent_val || "",
      awMgoPercent: receipt.awMgoPercent_val || "",
      axTio2Percent: receipt.axTio2Percent_val || "",
      ayKna2oPercent: receipt.ayKna2oPercent_val || "",
      azFreeIronPercent: receipt.azFreeIronPercent_val || "",
      baReason: receipt.baReason_val || "",
    });

    // Set the receipt
    setSelectedReceiptForModal(receipt);

    // Open modal
    setIsModalOpen(true);
  };

  const handleRevert = async (liftId) => {
    try {
      toast.loading("Reverting lab test...", { id: "revert-lab" });
      const res = await fetch(`${API_URL}/purchase/lab/revert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ liftId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to revert");

      toast.success(data.message || "Lab test reverted successfully", {
        id: "revert-lab",
      });
      fetchLiftsData();
    } catch (error) {
      toast.error("Revert Failed", {
        description: error.message,
        id: "revert-lab",
      });
    }
  };

  const handleSubmitLabTest = async (e) => {
    e.preventDefault();
    if (!selectedReceiptForModal) { toast.error("No lift selected"); return; }
    if (!formData.alStatus) { setFormErrors({ alStatus: "Status is required" }); return; }
    setIsSubmitting(true);
    toast.loading("Submitting lab results...", { id: "lab-submit" });
    try {
      const res = await fetch(`${API_URL}/purchase/lab/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          liftId: selectedReceiptForModal._dbId,
          status: formData.alStatus,
          dateOfTest: formData.amDateOfTest,
          moisturePercent: formData.anMoisturePercent || null,
          bdPercent: formData.aoBdPercent || null,
          apPercent: formData.apApPercent || null,
          aluminaPercent: formData.aqAluminaPercent || null,
          ironPercent: formData.arIronPercent || null,
          sieveAnalysis: formData.asSieveAnalysis || null,
          loiPercent: formData.atLoiPercent || null,
          sio2Percent: formData.auSio2Percent || null,
          caoPercent: formData.avCaoPercent || null,
          mgoPercent: formData.awMgoPercent || null,
          tio2Percent: formData.axTio2Percent || null,
          k2oNa2oPercent: formData.ayKna2oPercent || null,
          freeIronPercent: formData.azFreeIronPercent || null,
          reason: formData.baReason || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to submit lab test');
      toast.success("Lab test submitted!", { id: "lab-submit", description: `Results saved for Lift ${selectedReceiptForModal.liftNo}.` });
      setRefreshTrigger((prev) => prev + 1);
      setIsModalOpen(false);
      setFormData(initialFormData);
      setSelectedReceiptForModal(null);
    } catch (error) {
      toast.error("Submission Failed", { id: "lab-submit", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleModalClose = () => {
    setIsModalOpen(false);
    setFormErrors({});
    setFormData(initialFormData);
    setSelectedReceiptForModal(null);
  };

  // Column Toggle Handlers
  const handleToggleColumn = (tab, dataKey, checked) => {
    if (tab === "eligible") {
      setVisibleEligibleTestColumns((prev) => ({
        ...prev,
        [dataKey]: checked,
      }));
    } else {
      setVisibleRecordedTestColumns((prev) => ({
        ...prev,
        [dataKey]: checked,
      }));
    }
  };

  const handleSelectAllColumns = (tab, columnsMeta, checked) => {
    const newVisibility = {};
    columnsMeta.forEach((col) => {
      if (col.toggleable && !col.alwaysVisible)
        newVisibility[col.dataKey] = checked;
    });
    if (tab === "eligible") {
      setVisibleEligibleTestColumns((prev) => ({ ...prev, ...newVisibility }));
    } else {
      setVisibleRecordedTestColumns((prev) => ({ ...prev, ...newVisibility }));
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status?.toLowerCase()) {
      case "tested":
      case "accepted":
        return "success";
      case "not tested":
        return "warning";
      case "rejected":
        return "destructive";
      case "passed":
        return "success";
      case "failed":
        return "destructive";
      case "conditional":
        return "warning";
      default:
        return "outline";
    }
  };

  const renderCell = (item, column) => {
    const value = item[column.dataKey];

    if (column.isBadge && column.dataKey === "alStatus_val") {
      return (
        <Badge
          variant={getStatusBadgeVariant(value)}
          className="capitalize px-2 py-0.5 text-xs whitespace-nowrap"
        >
          {value || "N/A"}
        </Badge>
      );
    }

    // Special handling for PO Quantity
    if (column.dataKey === "poQuantity") {
      // Check if we have an indent number
      if (item.indentNo && item.indentNo.trim() !== "") {
        if (value && value.trim() !== "") {
          return <span className="font-medium text-[#2fa36b]">{value}</span>;
        } else {
          // Show loading state or "Not found" with tooltip
          return (
            <div className="relative group">
              <span className="text-xs italic text-gray-400 dark:text-zinc-500">Loading...</span>
              <div className="absolute z-50 px-2 py-1 mb-2 text-xs text-white transition-opacity transform -translate-x-1/2 bg-gray-800 dark:bg-zinc-700 rounded opacity-0 bottom-full left-1/2 group-hover:opacity-100 whitespace-nowrap">
                Indent: {item.indentNo}
              </div>
            </div>
          );
        }
      } else {
        return <span className="text-xs text-gray-400 dark:text-zinc-500">N/A</span>;
      }
    }

    return (
      value ||
      (value === 0 ? "0" : <span className="text-xs text-gray-400 dark:text-zinc-500">N/A</span>)
    );
  };

  const exportTableToCSV = (filename, columnsMeta, data, visibilityState) => {
    const exportCols = columnsMeta.filter(
      (col) => col.dataKey !== "actionColumn" && visibilityState[col.dataKey],
    );
    const headers = exportCols.map((col) => `"${col.header}"`).join(",");
    const rows = data.map((row) =>
      exportCols
        .map((col) => `"${String(row[col.dataKey] ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Reusable Table Rendering Function
  const renderTableSection = (
    tabKey,
    title,
    description,
    data,
    columnsMeta,
    visibilityState,
  ) => {
    const visibleCols = columnsMeta.filter(
      (col) => visibilityState[col.dataKey],
    );
    const isLoading = loadingData && data.length === 0;
    const hasError = errorData && data.length === 0 && activeTab === tabKey;

    return (
      <Card className="flex flex-col flex-1 border shadow-sm border-border">
        <CardHeader className="px-4 py-3 bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center font-semibold text-md text-foreground">
            <FileCheckIcon className="w-5 h-5 mr-2 text-primary" />
            Lab
          </CardTitle>
              
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() =>
                  exportTableToCSV(
                    `lab-${tabKey}.csv`,
                    columnsMeta,
                    data,
                    visibilityState,
                  )
                }
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
              </Button>
              <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <MixerHorizontalIcon className="mr-1.5 h-3.5 w-3.5" /> View
                  Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[240px] p-3">
                <div className="grid gap-2">
                  <p className="text-sm font-medium">Toggle Columns</p>
                  <div className="flex items-center justify-between mt-1 mb-2">
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={() =>
                        handleSelectAllColumns(
                          tabKey === "eligibleForTest"
                            ? "eligible"
                            : "recorded",
                          columnsMeta,
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
                          tabKey === "eligibleForTest"
                            ? "eligible"
                            : "recorded",
                          columnsMeta,
                          false,
                        )
                      }
                    >
                      Deselect All
                    </Button>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {columnsMeta
                      .filter((col) => col.toggleable)
                      .map((col) => (
                        <div
                          key={`toggle-${tabKey}-${col.dataKey}`}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`toggle-${tabKey}-${col.dataKey}`}
                            checked={!!visibilityState[col.dataKey]}
                            onCheckedChange={(checked) =>
                              handleToggleColumn(
                                tabKey === "eligibleForTest"
                                  ? "eligible"
                                  : "recorded",
                                col.dataKey,
                                Boolean(checked),
                              )
                            }
                            disabled={col.alwaysVisible}
                          />
                          <Label
                            htmlFor={`toggle-${tabKey}-${col.dataKey}`}
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
        <CardContent className="flex flex-col flex-1 p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center flex-1 py-10">
              <Loader2 className="w-8 h-8 mb-3 text-primary animate-spin" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : hasError ? (
            <div className="flex flex-col items-center justify-center flex-1 px-4 py-10 mx-4 my-4 text-center border-2 border-dashed rounded-lg border-destructive-foreground bg-destructive/10">
              <AlertTriangle className="w-10 h-10 mb-3 text-destructive" />
              <p className="font-medium text-destructive">Error Loading Data</p>
              <p className="max-w-md text-sm text-muted-foreground">
                {errorData}
              </p>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 px-4 py-10 mx-4 my-4 text-center border-2 border-dashed rounded-lg border-green-200/50 dark:border-emerald-500/20 bg-green-50/50 dark:bg-emerald-500/5">
              <Info className="w-12 h-12 mb-3 text-green-500 dark:text-emerald-400" />
              <p className="font-medium text-foreground">No Data Found</p>
              <p className="text-sm text-center text-muted-foreground">
                {tabKey === "eligibleForTest"
                  ? "No materials are currently eligible for lab testing."
                  : "No lab tests have been recorded yet."}
                {user?.firmName && (
                  <span className="block mt-1">
                    (Filtered by firm:{" "}
                    {user.firmName === "all"
                      ? "All"
                      : Array.isArray(user.firmName)
                        ? user.firmName.join(", ")
                        : user.firmName}
                    )
                  </span>
                )}
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto max-h-[calc(100vh-500px)] relative custom-scrollbar rounded-b-lg">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-30">
                  <tr className="bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
                    {visibleCols.map((col) => (
                      <th
                        key={col.dataKey}
                        className="px-3 py-3 text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase text-left bg-gray-50/95 dark:bg-zinc-800/95 backdrop-blur-sm shadow-sm whitespace-nowrap"
                      >
                        {col.header}
                      </th>
                    ))}
                    {isSuperAdmin && tabKey === "recordedTests" && (
                      <th className="px-3 py-3 text-xs font-bold text-purple-700 dark:text-purple-400 uppercase text-left bg-gray-50/95 dark:bg-zinc-800/95 backdrop-blur-sm shadow-sm whitespace-nowrap">
                        SA Edit
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-100 dark:divide-zinc-800">
                  {data.map((item) => (
                    <tr key={item.id || item._id || item.liftNo} className="hover:bg-green-50/50 dark:hover:bg-emerald-500/10 transition-colors border-b border-gray-100 dark:border-zinc-800">
                      {visibleCols.map((column) => (
                        <td
                          key={column.dataKey}
                          className={`whitespace-nowrap text-xs px-3 py-2 ${column.dataKey === "liftNo" ? "font-medium text-primary" : "text-gray-700 dark:text-zinc-300"}`}
                        >
                          {column.dataKey === "actionColumn" &&
                          tabKey === "eligibleForTest" ? (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={() => handleOpenLabTestModal(item)}
                                className="h-7 px-2.5 py-1 text-xs bg-green-100 dark:bg-emerald-500/20 text-[#268a59] dark:text-emerald-400 hover:bg-green-200 dark:hover:bg-emerald-500/30 border-green-200 dark:border-emerald-500/30"
                              >
                                Record Lab Test
                              </Button>
                              {isSuperAdmin && (
                                <button
                                  onClick={() => setSuperAdminEditItem(item)}
                                  className="inline-flex items-center px-2 py-1.5 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 text-xs font-medium rounded-lg hover:bg-purple-200 dark:hover:bg-purple-500/30 border border-purple-300 dark:border-purple-500/30"
                                >
                                  <ShieldCheck className="w-3 h-3 mr-1" />Edit
                                </button>
                              )}
                            </div>
                          ) : (
                            renderCell(item, column)
                          )}
                        </td>
                      ))}
                      {isSuperAdmin && tabKey === "recordedTests" && (
                        <td className="whitespace-nowrap text-xs px-3 py-2">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setSuperAdminEditItem(item)}
                              className="inline-flex items-center px-2 py-1.5 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 text-xs font-medium rounded-lg hover:bg-purple-200 dark:hover:bg-purple-500/30 border border-purple-300 dark:border-purple-500/30"
                            >
                              <ShieldCheck className="w-3 h-3 mr-1" />Edit
                            </button>
                            {item.canRevert !== false && (
                              <button
                                onClick={() => {
                                  if (window.confirm("Are you sure you want to revert this lab test?")) {
                                    handleRevert(item._dbId || item.id);
                                  }
                                }}
                                className="inline-flex items-center px-2 py-1.5 bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-xs font-medium rounded-lg hover:bg-red-200 dark:hover:bg-red-500/20 border border-red-300 dark:border-red-500/30"
                              >
                                <Undo2 className="w-3 h-3 mr-1" />Revert
                              </button>
                            )}
                          </div>
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
    );
  };

  return (
    <div className="p-4 space-y-6 md:p-6 bg-slate-50 dark:bg-zinc-950">
      <Card className="border-none shadow-md">
        <CardHeader className="rounded-t-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-emerald-500/10 dark:to-emerald-500/5">
          <CardTitle className="flex items-center gap-2 text-gray-700 dark:text-zinc-300">
            <Beaker className="h-6 w-6 text-[#2fa36b]" />
            Step 7: Lab Testing - Is The Quality Good?
          </CardTitle>
          
        </CardHeader>

        <CardContent className="p-4 sm:p-6 lg:p-8">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex flex-col flex-1"
          >
            <TabsList className="grid w-full sm:w-[480px] grid-cols-2 mb-6">
              <TabsTrigger
                value="eligibleForTest"
                className="flex items-center gap-2"
              >
                <FileCheckIcon className="w-4 h-4" /> Eligible for Test
                <Badge
                  variant="secondary"
                  className="ml-1.5 px-1.5 py-0.5 text-xs"
                >
                  {receiptsAwaitingLabTest.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="recordedTests"
                className="flex items-center gap-2"
              >
                <History className="w-4 h-4" /> Recorded Tests
                <Badge
                  variant="secondary"
                  className="ml-1.5 px-1.5 py-0.5 text-xs"
                >
                  {recordedLabTests.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* Filter Section - START */}
            <div className="p-4 mb-6 border border-green-200 dark:border-emerald-500/20 rounded-lg bg-green-50/50 dark:bg-emerald-500/5">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
                <Label className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                  Filters
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="ml-auto bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800"
                >
                  Clear All
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
                {/* Vendor Name Filter */}
                <div>
                  <Label className="block mb-1 text-xs">Vendor Name</Label>
                  <SearchableSelect
                    value={filters.vendorName}
                    onValueChange={(value) =>
                      handleFilterChange("vendorName", value)
                    }
                    options={uniqueFilterOptions.vendorName}
                    placeholder="Vendors"
                  />
                </div>

                {/* Material Name Filter */}
                <div>
                  <Label className="block mb-1 text-xs">Material Name</Label>
                  <SearchableSelect
                    value={filters.materialName}
                    onValueChange={(value) =>
                      handleFilterChange("materialName", value)
                    }
                    options={uniqueFilterOptions.materialName}
                    placeholder="Materials"
                  />
                </div>

                {/* Lift Type Filter */}
                <div>
                  <Label className="block mb-1 text-xs">Lift Type</Label>
                  <SearchableSelect
                    value={filters.liftType}
                    onValueChange={(value) =>
                      handleFilterChange("liftType", value)
                    }
                    options={uniqueFilterOptions.liftType}
                    placeholder="Types"
                  />
                </div>

                {/* Total Quantity Filter */}
                <div>
                  <Label className="block mb-1 text-xs">Total Quantity</Label>
                  <SearchableSelect
                    value={filters.totalQuantity}
                    onValueChange={(value) =>
                      handleFilterChange("totalQuantity", value)
                    }
                    options={uniqueFilterOptions.totalQuantity}
                    placeholder="Quantities"
                  />
                </div>

                {/* Order Number Filter */}
                <div>
                  <Label className="block mb-1 text-xs">Order Number</Label>
                  <SearchableSelect
                    value={filters.orderNumber}
                    onValueChange={(value) =>
                      handleFilterChange("orderNumber", value)
                    }
                    options={uniqueFilterOptions.orderNumber}
                    placeholder="Orders"
                  />
                </div>
              </div>
            </div>
            {/* Filter Section - END */}

            <TabsContent
              value="eligibleForTest"
              className="flex flex-col flex-1 mt-0"
            >
              {renderTableSection(
                "eligibleForTest",
                "Material Receipts Eligible for Lab Testing",
                "Filtered by: Column AI (Planned Date) is NOT empty AND Column AJ (Lab Test Timestamp) IS empty.",
                receiptsAwaitingLabTest,
                ELIGIBLE_TESTS_COLUMNS_META,
                visibleEligibleTestColumns,
              )}
            </TabsContent>
            <TabsContent
              value="recordedTests"
              className="flex flex-col flex-1 mt-0"
            >
              {renderTableSection(
                "recordedTests",
                "All Recorded Lab Tests",
                "Lifts with a Lab Test Timestamp in Column AJ, sorted by latest test.",
                recordedLabTests,
                RECORDED_TESTS_COLUMNS_META,
                visibleRecordedTestColumns,
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {superAdminEditItem && (
        <SuperAdminEditModal
          title={`Edit Lab Record: ${superAdminEditItem.liftNo}`}
          tableName="LIFT-ACCOUNTS"
          pkField="id"
          pkValue={superAdminEditItem._dbId}
          fields={[
            { label: "Lift No", dbKey: "Lift No", value: superAdminEditItem.liftNo, type: "text" },
            { label: "Indent No.", dbKey: "Indent no.", value: superAdminEditItem.indentNo, type: "text" },
            { label: "Vendor Name", dbKey: "Vendor Name", value: superAdminEditItem.vendorName, type: "text" },
            { label: "Raw Material Name", dbKey: "Raw Material Name", value: superAdminEditItem.rawMaterialName, type: "text" },
            { label: "Bill No.", dbKey: "Bill No.", value: superAdminEditItem.billNo, type: "text" },
            { label: "Date Of Bill", dbKey: "Date Of Bill", value: superAdminEditItem.dateOfBill, type: "date" },
            { label: "Qty", dbKey: "Qty", value: superAdminEditItem.qty, type: "number" },
            { label: "Truck No.", dbKey: "Truck No.", value: superAdminEditItem.truckNo, type: "text" },
            { label: "Firm Name", dbKey: "Firm Name", value: superAdminEditItem.firmName, type: "text" },
            { label: "Status", dbKey: "Status", value: superAdminEditItem.alStatus_val, type: "select", options: ["Accepted", "Rejected"] },
            { label: "Moisture %", dbKey: "Moisture Percent Age %", value: superAdminEditItem.anMoisturePercent_val, type: "number" },
            { label: "BD %", dbKey: "BD Percent Age %", value: superAdminEditItem.aoBdPercent_val, type: "number" },
            { label: "AP %", dbKey: "AP Percent Age %", value: superAdminEditItem.apApPercent_val, type: "number" },
            { label: "Alumina %", dbKey: "Alumina Percent Age %", value: superAdminEditItem.aqAluminaPercent_val, type: "number" },
            { label: "Iron %", dbKey: "Iron Percent Age %", value: superAdminEditItem.arIronPercent_val, type: "number" },
            { label: "Sieve Analysis", dbKey: "Sieve Analysis", value: superAdminEditItem.asSieveAnalysis_val, type: "number" },
            { label: "LOI %", dbKey: "LOI %", value: superAdminEditItem.atLoiPercent_val, type: "number" },
            { label: "SiO2 %", dbKey: "SIO2 %", value: superAdminEditItem.auSio2Percent_val, type: "number" },
            { label: "CaO %", dbKey: "CaO %", value: superAdminEditItem.avCaoPercent_val, type: "number" },
            { label: "MgO %", dbKey: "MgO %", value: superAdminEditItem.awMgoPercent_val, type: "number" },
            { label: "TiO2 %", dbKey: "TiO2 %", value: superAdminEditItem.axTio2Percent_val, type: "number" },
            { label: "K2O+Na2O %", dbKey: "K2O + Na2O %", value: superAdminEditItem.ayKna2oPercent_val, type: "number" },
            { label: "Free Iron %", dbKey: "Free Iron %", value: superAdminEditItem.azFreeIronPercent_val, type: "number" },
            { label: "Reason", dbKey: "Reason", value: superAdminEditItem.baReason_val, type: "text" },
          ]}
          onClose={() => setSuperAdminEditItem(null)}
          onSaved={() => { setSuperAdminEditItem(null); setRefreshTrigger((p) => p + 1); }}
        />
      )}
      <Sheet open={isModalOpen} onOpenChange={handleModalClose}>
        <SheetContent className="sm:max-w-2xl lg:max-w-3xl xl:max-w-4xl max-h-[90vh] overflow-y-auto">
          <SheetHeader className="pb-4 mb-4 border-b">
            <SheetTitle className="flex items-center gap-2 text-lg md:text-xl text-foreground">
              <Beaker className="h-6 w-6 text-[#2fa36b]" />
              Record Lab Test for Lift ID:{" "}
              <span className="ml-1 font-bold text-primary">
                {selectedReceiptForModal?.liftNo}
              </span>
            </SheetTitle>
            <SheetDescription className="mt-1 text-xs text-muted-foreground">
              PO: {selectedReceiptForModal?.indentNo || "N/A"} | Party:{" "}
              {selectedReceiptForModal?.vendorName || "N/A"} | Material:{" "}
              {selectedReceiptForModal?.rawMaterialName || "N/A"}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmitLabTest} className="px-1 py-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-4">
              <div>
                <Label className="text-xs text-foreground" htmlFor="alStatus">
                  AL: Status <span className="text-destructive">*</span>
                </Label>
                <Select
                  name="alStatus"
                  value={formData.alStatus || undefined}
                  onValueChange={handleSelectChange("alStatus")}
                >
                  <SelectTrigger
                    className={`w-full h-9 mt-1 rounded-md text-xs ${!formData.alStatus ? "text-muted-foreground" : ""} ${formErrors.alStatus ? "border-destructive" : "border-gray-300 dark:border-zinc-700 focus:ring-[#268a59] focus:border-[#268a59]"}`}
                  >
                    <SelectValue placeholder="Select Accepted / Rejected" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Accepted">Accepted</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.alStatus && (
                  <p className="mt-1 text-xs text-destructive">
                    {formErrors.alStatus}
                  </p>
                )}
              </div>
              <div>
                <Label
                  className="text-xs text-foreground"
                  htmlFor="amDateOfTest"
                >
                  Date Of Test <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="date"
                  id="amDateOfTest"
                  name="amDateOfTest"
                  value={formData.amDateOfTest}
                  onChange={handleInputChange}
                  className={`h-9 mt-1 rounded-md text-xs ${formErrors.amDateOfTest ? "border-destructive" : "border-gray-300 dark:border-zinc-700 focus:ring-[#268a59] focus:border-[#268a59]"}`}
                />
                {formErrors.amDateOfTest && (
                  <p className="mt-1 text-xs text-destructive">
                    {formErrors.amDateOfTest}
                  </p>
                )}
              </div>

              {formData.alStatus !== "Rejected" ? (
                <>
                  {/* Moisture % Field */}
                  <div>
                    <Label
                      className="text-xs text-foreground"
                      htmlFor="anMoisturePercent"
                    >
                      Moisture % <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="anMoisturePercent"
                      name="anMoisturePercent"
                      value={formData.anMoisturePercent}
                      onChange={handleInputChange}
                      placeholder=""
                      className={`h-9 mt-1 rounded-md text-xs ${formErrors.anMoisturePercent ? "border-destructive" : "border-gray-300 dark:border-zinc-700 focus:ring-[#268a59] focus:border-[#268a59]"}`}
                    />
                    {formErrors.anMoisturePercent && (
                      <p className="mt-1 text-xs text-destructive">
                        {formErrors.anMoisturePercent}
                      </p>
                    )}
                  </div>

                  {/* BD % Field */}
                  <div>
                    <Label
                      className="text-xs text-foreground"
                      htmlFor="aoBdPercent"
                    >
                      BD % <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="aoBdPercent"
                      name="aoBdPercent"
                      value={formData.aoBdPercent}
                      onChange={handleInputChange}
                      placeholder=""
                      className={`h-9 mt-1 rounded-md text-xs ${formErrors.aoBdPercent ? "border-destructive" : "border-gray-300 dark:border-zinc-700 focus:ring-[#268a59] focus:border-[#268a59]"}`}
                    />
                    {formErrors.aoBdPercent && (
                      <p className="mt-1 text-xs text-destructive">
                        {formErrors.aoBdPercent}
                      </p>
                    )}
                  </div>

                  {/* AP % Field */}
                  <div>
                    <Label
                      className="text-xs text-foreground"
                      htmlFor="apApPercent"
                    >
                      AP % <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="apApPercent"
                      name="apApPercent"
                      value={formData.apApPercent}
                      onChange={handleInputChange}
                      placeholder=""
                      className={`h-9 mt-1 rounded-md text-xs ${formErrors.apApPercent ? "border-destructive" : "border-gray-300 dark:border-zinc-700 focus:ring-[#268a59] focus:border-[#268a59]"}`}
                    />
                    {formErrors.apApPercent && (
                      <p className="mt-1 text-xs text-destructive">
                        {formErrors.apApPercent}
                      </p>
                    )}
                  </div>

                  {/* Alumina % Field */}
                  <div>
                    <Label
                      className="text-xs text-foreground"
                      htmlFor="aqAluminaPercent"
                    >
                      Alumina % <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="aqAluminaPercent"
                      name="aqAluminaPercent"
                      value={formData.aqAluminaPercent}
                      onChange={handleInputChange}
                      placeholder=""
                      className={`h-9 mt-1 rounded-md text-xs ${formErrors.aqAluminaPercent ? "border-destructive" : "border-gray-300 dark:border-zinc-700 focus:ring-[#268a59] focus:border-[#268a59]"}`}
                    />
                    {formErrors.aqAluminaPercent && (
                      <p className="mt-1 text-xs text-destructive">
                        {formErrors.aqAluminaPercent}
                      </p>
                    )}
                  </div>

                  {/* Iron % Field */}
                  <div>
                    <Label
                      className="text-xs text-foreground"
                      htmlFor="arIronPercent"
                    >
                      Iron % <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="arIronPercent"
                      name="arIronPercent"
                      value={formData.arIronPercent}
                      onChange={handleInputChange}
                      placeholder=""
                      className={`h-9 mt-1 rounded-md text-xs ${formErrors.arIronPercent ? "border-destructive" : "border-gray-300 dark:border-zinc-700 focus:ring-[#268a59] focus:border-[#268a59]"}`}
                    />
                    {formErrors.arIronPercent && (
                      <p className="mt-1 text-xs text-destructive">
                        {formErrors.arIronPercent}
                      </p>
                    )}
                  </div>

                  {/* Sieve Analysis Field */}
                  <div>
                    <Label
                      className="text-xs text-foreground"
                      htmlFor="asSieveAnalysis"
                    >
                      Sieve Analysis <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="asSieveAnalysis"
                      name="asSieveAnalysis"
                      value={formData.asSieveAnalysis}
                      onChange={handleInputChange}
                      placeholder=""
                      className={`h-9 mt-1 rounded-md text-xs ${formErrors.asSieveAnalysis ? "border-destructive" : "border-gray-300 dark:border-zinc-700 focus:ring-[#268a59] focus:border-[#268a59]"}`}
                    />
                    {formErrors.asSieveAnalysis && (
                      <p className="mt-1 text-xs text-destructive">
                        {formErrors.asSieveAnalysis}
                      </p>
                    )}
                  </div>

                  {/* LOI % Field */}
                  <div>
                    <Label
                      className="text-xs text-foreground"
                      htmlFor="atLoiPercent"
                    >
                      LOI % <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="atLoiPercent"
                      name="atLoiPercent"
                      value={formData.atLoiPercent}
                      onChange={handleInputChange}
                      placeholder=""
                      className={`h-9 mt-1 rounded-md text-xs ${formErrors.atLoiPercent ? "border-destructive" : "border-gray-300 dark:border-zinc-700 focus:ring-[#268a59] focus:border-[#268a59]"}`}
                    />
                    {formErrors.atLoiPercent && (
                      <p className="mt-1 text-xs text-destructive">
                        {formErrors.atLoiPercent}
                      </p>
                    )}
                  </div>

                  {/* SiO2 % Field */}
                  <div>
                    <Label
                      className="text-xs text-foreground"
                      htmlFor="auSio2Percent"
                    >
                      SiO2 % <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="auSio2Percent"
                      name="auSio2Percent"
                      value={formData.auSio2Percent}
                      onChange={handleInputChange}
                      placeholder=""
                      className={`h-9 mt-1 rounded-md text-xs ${formErrors.auSio2Percent ? "border-destructive" : "border-gray-300 dark:border-zinc-700 focus:ring-[#268a59] focus:border-[#268a59]"}`}
                    />
                    {formErrors.auSio2Percent && (
                      <p className="mt-1 text-xs text-destructive">
                        {formErrors.auSio2Percent}
                      </p>
                    )}
                  </div>

                  {/* CaO % Field */}
                  <div>
                    <Label
                      className="text-xs text-foreground"
                      htmlFor="avCaoPercent"
                    >
                      CaO % <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="avCaoPercent"
                      name="avCaoPercent"
                      value={formData.avCaoPercent}
                      onChange={handleInputChange}
                      placeholder=""
                      className={`h-9 mt-1 rounded-md text-xs ${formErrors.avCaoPercent ? "border-destructive" : "border-gray-300 dark:border-zinc-700 focus:ring-[#268a59] focus:border-[#268a59]"}`}
                    />
                    {formErrors.avCaoPercent && (
                      <p className="mt-1 text-xs text-destructive">
                        {formErrors.avCaoPercent}
                      </p>
                    )}
                  </div>

                  {/* MgO % Field */}
                  <div>
                    <Label
                      className="text-xs text-foreground"
                      htmlFor="awMgoPercent"
                    >
                      MgO % <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="awMgoPercent"
                      name="awMgoPercent"
                      value={formData.awMgoPercent}
                      onChange={handleInputChange}
                      placeholder=""
                      className={`h-9 mt-1 rounded-md text-xs ${formErrors.awMgoPercent ? "border-destructive" : "border-gray-300 dark:border-zinc-700 focus:ring-[#268a59] focus:border-[#268a59]"}`}
                    />
                    {formErrors.awMgoPercent && (
                      <p className="mt-1 text-xs text-destructive">
                        {formErrors.awMgoPercent}
                      </p>
                    )}
                  </div>

                  {/* TiO2 % Field */}
                  <div>
                    <Label
                      className="text-xs text-foreground"
                      htmlFor="axTio2Percent"
                    >
                      TiO2 % <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="axTio2Percent"
                      name="axTio2Percent"
                      value={formData.axTio2Percent}
                      onChange={handleInputChange}
                      placeholder=""
                      className={`h-9 mt-1 rounded-md text-xs ${formErrors.axTio2Percent ? "border-destructive" : "border-gray-300 dark:border-zinc-700 focus:ring-[#268a59] focus:border-[#268a59]"}`}
                    />
                    {formErrors.axTio2Percent && (
                      <p className="mt-1 text-xs text-destructive">
                        {formErrors.axTio2Percent}
                      </p>
                    )}
                  </div>

                  {/* K2O+Na2O % Field */}
                  <div>
                    <Label
                      className="text-xs text-foreground"
                      htmlFor="ayKna2oPercent"
                    >
                      K2O+Na2O % <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="ayKna2oPercent"
                      name="ayKna2oPercent"
                      value={formData.ayKna2oPercent}
                      onChange={handleInputChange}
                      placeholder=""
                      className={`h-9 mt-1 rounded-md text-xs ${formErrors.ayKna2oPercent ? "border-destructive" : "border-gray-300 dark:border-zinc-700 focus:ring-[#268a59] focus:border-[#268a59]"}`}
                    />
                    {formErrors.ayKna2oPercent && (
                      <p className="mt-1 text-xs text-destructive">
                        {formErrors.ayKna2oPercent}
                      </p>
                    )}
                  </div>

                  {/* Free Iron % Field */}
                  <div>
                    <Label
                      className="text-xs text-foreground"
                      htmlFor="azFreeIronPercent"
                    >
                      Free Iron % <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="azFreeIronPercent"
                      name="azFreeIronPercent"
                      value={formData.azFreeIronPercent}
                      onChange={handleInputChange}
                      placeholder=""
                      className={`h-9 mt-1 rounded-md text-xs ${formErrors.azFreeIronPercent ? "border-destructive" : "border-gray-300 dark:border-zinc-700 focus:ring-[#268a59] focus:border-[#268a59]"}`}
                    />
                    {formErrors.azFreeIronPercent && (
                      <p className="mt-1 text-xs text-destructive">
                        {formErrors.azFreeIronPercent}
                      </p>
                    )}
                  </div>
                </>
              ) : null}

              {/* Reason Field */}
              <div className="sm:col-span-2 md:col-span-3 lg:col-span-4">
                <Label className="text-xs text-foreground" htmlFor="baReason">
                  Reason {formData.alStatus === "Rejected" && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  type="text"
                  id="baReason"
                  name="baReason"
                  value={formData.baReason}
                  onChange={handleInputChange}
                  placeholder="Enter reason if any..."
                  className={`h-9 mt-1 rounded-md text-xs ${formErrors.baReason ? "border-destructive" : "border-gray-300 dark:border-zinc-700 focus:ring-[#268a59] focus:border-[#268a59]"}`}
                />
                {formErrors.baReason && (
                  <p className="mt-1 text-xs text-destructive">
                    {formErrors.baReason}
                  </p>
                )}
              </div>
            </div>

            <SheetFooter className="flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleModalClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !selectedReceiptForModal}
                className={`bg-gradient-to-r from-[#2fa36b] to-[#268a59] text-white font-semibold shadow-md hover:opacity-90 transition-opacity flex items-center justify-center min-w-[100px] ${isSubmitting || !selectedReceiptForModal ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Recording...
                  </>
                ) : (
                  "Record Lab Test"
                )}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
