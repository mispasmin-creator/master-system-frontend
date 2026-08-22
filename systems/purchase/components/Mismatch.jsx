"use client";
import { useState, useEffect, useMemo, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  AlertTriangle,
  TrendingDown,
  DollarSign,
  Package,
  Info,
  Filter,
  ExternalLink,
  Beaker,
  Edit,
  Eye,
  FileText,
  AlertCircle,
  RefreshCw,
  Save,
  X,
  History,
  CheckCircle2,
  ShieldCheck,
  Download,
  Undo2,
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
import { toast } from "sonner";
import { API_URL, getToken } from "@/lib/auth";
import { canViewFirm } from "../utils/firmFilter";
import SuperAdminEditModal from "./SuperAdminEditModal";
import { Input } from "@/components/ui/input";

const UNIFIED_MISMATCH_COLUMNS_META = [
  { header: "Actions", dataKey: "actions", toggleable: false, alwaysVisible: true },
  { header: "Stage", dataKey: "stage", toggleable: true, alwaysVisible: true },
  { header: "Detected Issues", dataKey: "mismatchTypes", toggleable: true, alwaysVisible: true },
  { header: "Lift Number", dataKey: "liftIdDisplay", toggleable: true, alwaysVisible: true },
  { header: "Truck No.", dataKey: "truckNo", toggleable: true },
  { header: "PO Number", dataKey: "indentNo", toggleable: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
  { header: "Party Name", dataKey: "vendorName", toggleable: true },
  { header: "Product", dataKey: "material", toggleable: true },
  { header: "Difference Summary", dataKey: "diffSummary", toggleable: true },
  // Core fields for visibility
  { header: "PO Rate", dataKey: "poRate", toggleable: true },
  { header: "Bill Rate", dataKey: "materialRate", toggleable: true },
  { header: "Rate Diff", dataKey: "rateDifference", toggleable: true },
  { header: "PO Qty", dataKey: "poQuantity", toggleable: true },
  { header: "Bill Qty", dataKey: "billQuantity", toggleable: true },
  { header: "Receive Qty", dataKey: "actualQuantity", toggleable: true },
  { header: "Diff(Bill-Rec)", dataKey: "diffBillRec", toggleable: true },
  { header: "Qty Diff Status", dataKey: "qtyDifferenceStatus", toggleable: true },
  { header: "PO Al2O3%", dataKey: "poAlumina", toggleable: true },
  { header: "PO Fe%", dataKey: "poIron", toggleable: true },
  { header: "Lab Al2O3%", dataKey: "aluminaPercent", toggleable: true },
  { header: "Lab Fe%", dataKey: "ironPercent", toggleable: true },
];

const HISTORY_COLUMNS_META = [
  {
    header: "Date",
    dataKey: "timestamp",
    toggleable: true,
    alwaysVisible: true,
  },
  {
    header: "Lift ID",
    dataKey: "liftIdDisplay",
    toggleable: true,
    alwaysVisible: true,
  },
  {
    header: "PO Number",
    dataKey: "indentNo",
    toggleable: true,
    alwaysVisible: true,
  },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
  { header: "Party Name", dataKey: "vendorName", toggleable: true },
  { header: "Product Name", dataKey: "material", toggleable: true },
  { header: "Transporter", dataKey: "transporterName", toggleable: true },
  { header: "Status", dataKey: "status", toggleable: true },
  { header: "Remarks", dataKey: "remarks", toggleable: true },
  { header: "Lift Number", dataKey: "liftNo", toggleable: true },
  { header: "Type", dataKey: "liftType", toggleable: true },
  { header: "Bill No.", dataKey: "billNo", toggleable: true },
  { header: "Date Of Bill", dataKey: "dateOfBill", toggleable: true },
  { header: "Bill Qty", dataKey: "billQuantity", toggleable: true },
  { header: "Area Lifting", dataKey: "areaLifting", toggleable: true },
  { header: "Truck No.", dataKey: "truckNo", toggleable: true },
  {
    header: "Bill Image",
    dataKey: "billImageUrl",
    toggleable: true,
    isLink: true,
    linkText: "View",
  },
  { header: "Bilty No.", dataKey: "biltyNo", toggleable: true },
  { header: "Type Of Rate", dataKey: "typeOfTransportingRate", toggleable: true },
  { header: "Bill Rate", dataKey: "materialRate", toggleable: true },
  { header: "Receive Qty", dataKey: "actualQuantity", toggleable: true },
  { header: "Diff(Bill-Rec)", dataKey: "diffBillRec", toggleable: true },
  {
    header: "Bilty Image",
    dataKey: "biltyImageUrl",
    toggleable: true,
    isLink: true,
    linkText: "View",
  },
  { header: "Qty Diff Status", dataKey: "qtyDifferenceStatus", toggleable: true },
  { header: "Diff Qty", dataKey: "differenceQty", toggleable: true },
  {
    header: "Weight Slip",
    dataKey: "weightSlipImageUrl",
    toggleable: true,
    isLink: true,
    linkText: "View",
  },
  { header: "PO Al2O3%", dataKey: "poAlumina", toggleable: true },
  { header: "PO Fe%", dataKey: "poIron", toggleable: true },
  { header: "Lab Al2O3%", dataKey: "aluminaPercent", toggleable: true },
  { header: "Lab Fe%", dataKey: "ironPercent", toggleable: true },
  {
    header: "Actions",
    dataKey: "actions",
    toggleable: false,
    alwaysVisible: true,
  },
];

export default function MismatchAnalysis() {
  const { user, isSuperAdmin } = useContext(AuthContext);
  const [superAdminEditItem, setSuperAdminEditItem] = useState(null);
  const navigate = useNavigate();
  const [liftAccountsData, setLiftAccountsData] = useState([]);
  const [purchaseOrdersData, setPurchaseOrdersData] = useState([]);
  const [tlData, setTlData] = useState([]);
  const [loadingLifts, setLoadingLifts] = useState(true);
  const [loadingPOs, setLoadingPOs] = useState(true);
  const [loadingTL, setLoadingTL] = useState(true);
  const [loadingMismatch, setLoadingMismatch] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [editingRow, setEditingRow] = useState(null);
  const [editingRowData, setEditingRowData] = useState(null); // Store full row data
  const [submitting, setSubmitting] = useState(false);
  const [visibleUnifiedColumns, setVisibleUnifiedColumns] = useState({});
  const [visibleHistoryColumns, setVisibleHistoryColumns] = useState({});
  const [mismatchSheetData, setMismatchSheetData] = useState([]);
  const [formData, setFormData] = useState({});
  const [submittedRows, setSubmittedRows] = useState(new Set());
  const [actionType, setActionType] = useState("");

  const [filters, setFilters] = useState({
    vendorName: "all",
    materialName: "all",
    firmName: "all",
    orderNumber: "all",
    fromDate: "",
    toDate: "",
  });

  // Fetch Mismatch data from Supabase
  const fetchMismatchSheetData = useCallback(async () => {
    setLoadingMismatch(true);
    try {
      const res = await fetch(`${API_URL}/purchase/mismatch/data`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);
      let formattedData = (json.data || []).map(m => ({
        id: m.id, Timestamp: m.createdAt, "Lift ID": m.liftId, "Lift Number": m.liftNo, "Indent Number": m.indentNo,
        "Product Name": m.productName, "Rate Difference": m.rateDifference, "Quantity Difference": m.quantityDifference,
        "Diff Qty": m.diffQty, "Qty Diff Status": m.qtyDiffStatus, "Alumina Difference": m.aluminaDifference,
        "Iron Difference": m.ironDifference, "AP Difference": m.apDifference, "BD Difference": m.bdDifference,
        "Party Name": m.partyName, "Firm Name": m.firmName, Status: m.status, Remarks: m.remarks, Rate: m.rate,
        "Action Type": m.actionType, "Debit Amount": m.debitAmount, "Debit Note URL": m.debitNoteUrl, "Total Freight": m.totalFreight,
        "Truck No.": m.truckNo, "Truck Qty": m.truckQty, Qty: m.qty, "Bill No.": m.billNo, "Area Lifting": m.areaLifting,
        "Bill Image": m.billImage, "Bilty No.": m.biltyNo, "Bilty Image": m.biltyImage, "Weight Slip": m.weightSlip, "Type Of Rate": m.typeOfRate,
        "Actual Quantity": m.actualQuantity, "Lab Alumina": m.labAlumina, "Lab Iron": m.labIron,
        "PO Alumina": m.poAlumina, "PO Iron": m.poIron, Stage: m.stage, "Transporter Name": m.transporterName,
        Type: m.type, "Testing Certificate": m.testingCertificate,
        "PO Rate": m.poRate, "Quantity (PO)": m.poQuantity,
      }));
      if (user?.firmName) {
        formattedData = formattedData.filter((item) => canViewFirm(user.firmName, item["Firm Name"] || item.firmName));
      }
      setMismatchSheetData(formattedData);
    } catch (error) {
      console.error("Failed to load Mismatch data:", error);
      setMismatchSheetData([]);
    } finally {
      setLoadingMismatch(false);
    }
  }, [user?.firmName]);
  // Initialize column visibility
  useEffect(() => {
    const initializeVisibility = (columnsMeta) => {
      const visibility = {};
      columnsMeta.forEach((col) => {
        visibility[col.dataKey] = col.alwaysVisible || col.toggleable;
      });
      return visibility;
    };
    setVisibleUnifiedColumns(
      initializeVisibility(UNIFIED_MISMATCH_COLUMNS_META),
    );
    setVisibleHistoryColumns(initializeVisibility(HISTORY_COLUMNS_META));
  }, []);

  // Initialize form data
  const initializeFormData = (rowId, rowData) => {
    setFormData({
      remarks: "",
      debitAmount: "",
    });
    setActionType("");
  };

  // Handle form changes
  const handleRevert = async (liftId) => {
    try {
      toast.loading("Reverting mismatch...", { id: "revert-mismatch" });
      const res = await fetch(`${API_URL}/purchase/mismatch/revert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ liftId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to revert");

      toast.success(data.message || "Mismatch reverted successfully", {
        id: "revert-mismatch",
      });
      fetchMismatchSheetData();
      fetchLiftAccountsData();
    } catch (error) {
      toast.error("Revert Failed", {
        description: error.message,
        id: "revert-mismatch",
      });
    }
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle purchase return form changes
  const handlePurchaseReturnChange = (field, value) => {
    setPurchaseReturnForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Action handlers
  const handleViewDetails = (item, mismatchType) => {
    const details = {
      rateMismatch: {
        title: "Rate Mismatch Details",
        content: `Lift ID: ${item.id}\nMaterial Rate: ₹${item.materialRate}\nPO Rate: ₹${item.poRate}\nDifference: ₹${item.rateDifference}\nVendor: ${item.vendorName}\nMaterial: ${item.material}`,
      },
      quantityMismatch: {
        title: "Quantity Mismatch Details",
        content: `Lift No: ${item.liftNo}\nBilling Quantity (Col J): ${item.liftedQty}\nActual Qty (Col Y): ${item.actualQuantityY}\nDifference: ${item.qtyDifference}\nVendor: ${item.vendorName}\nMaterial: ${item.rawMaterialName}`,
      },
      materialMismatch: {
        title: "Material Properties Mismatch Details",
        content: `Lift No: ${item.liftNo}\nRaw Material: ${item.rawMaterialName}\nAlumina: PO ${item.poAluminaPercent}% vs Lab ${item.liftAlumina}% (Diff: ${item.aluminaDiff}%)\nIron: PO ${item.poIronPercent}% vs Lab ${item.liftIron}% (Diff: ${item.ironDiff}%)`,
      },
    };

    toast.info(details[mismatchType].title, {
      description: details[mismatchType].content,
      duration: 10000,
    });
  };

  const handleCorrectData = (item, mismatchType) => {
    setEditingRow(item.liftNo || item.liftIdDisplay || item.id);
    setEditingRowData(item);
    initializeFormData(item.id || item.liftNo, item);
  };


  const handleReportIssue = (item, mismatchType) => {
    toast.success("Issue Reported", {
      description: `Mismatch issue has been reported to the quality team. Reference: ${item.id || item.liftNo}`,
      duration: 3000,
    });
  };

  const handleExportData = (item, mismatchType) => {
    // Create CSV data for the specific item
    const csvData = Object.entries(item)
      .filter(([key]) => !key.startsWith("_"))
      .map(([key, value]) => `"${key}","${value}"`)
      .join("\n");

    const blob = new Blob([`"Field","Value"\n${csvData}`], {
      type: "text/csv",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${mismatchType}_${item.id || item.liftNo}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast.success("Data Exported", {
      description: `${mismatchType} data exported successfully for ${item.id || item.liftNo}`,
      duration: 3000,
    });
  };

  // Submit form data to Backend (Update existing record)
  const submitFormData = async () => {
    if (!editingRow || !editingRowData) return;
    if (!actionType) { toast.error("Please select an Action Type."); return; }

    if (actionType === "Return Material and Make Debit Note") {
      setSubmitting(true);
      try {
        const res = await fetch(`${API_URL}/purchase/mismatch/update/${editingRowData.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({ status: "Purchase Return", coordinationStatus: "COORDINATED", actionType: actionType, remarks: formData.remarks || "" })
        });
        if (!res.ok) throw new Error("Failed to update mismatch");
        setSubmittedRows((prev) => new Set([...prev, `mismatch_${editingRowData.liftNo}`]));
        setEditingRow(null); setEditingRowData(null); setFormData({}); setActionType("");
        toast.success(`? SUCCESS: Mismatch record marked for Purchase Return.`);
        setTimeout(() => { fetchMismatchSheetData(); fetchLiftAccountsData(); }, 500);
      } catch (error) { toast.error(`? SUBMISSION FAILED: ${error.message}`); } finally { setSubmitting(false); }
      return;
    }

    if (!formData.debitAmount) { toast.error("Please enter a Debit Amount."); return; }
    setSubmitting(true);
    try {
      const recordId = editingRowData.id;
      if (!recordId) throw new Error("Missing Record ID for update");
      const res = await fetch(`${API_URL}/purchase/mismatch/update/${recordId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ status: "Credit Notes", coordinationStatus: "COORDINATED", actionType: actionType, remarks: formData.remarks || "", debitAmount: parseFloat(formData.debitAmount) || null })
      });
      if (!res.ok) throw new Error("Failed to update mismatch");
      setSubmittedRows((prev) => new Set([...prev, `mismatch_${editingRowData.liftNo}`]));
      setEditingRow(null); setEditingRowData(null); setFormData({}); setActionType("");
      toast.success(`? SUCCESS: Mismatch data corrected and resolved for: ${editingRow}`);
      setTimeout(() => { fetchMismatchSheetData(); fetchLiftAccountsData(); }, 500);
    } catch (error) { toast.error(`? SUBMISSION FAILED: ${error.message}`); } finally { setSubmitting(false); }
  };
  const handleAcknowledgeMismatch = async (item) => {
    const recordId = item.id || item.supabaseId;
    if (!recordId) { toast.error("Cannot acknowledge: Missing record ID"); return; }
    if (!window.confirm(`Mark Lift Number ${item.liftNo || item.liftIdDisplay} as proper/resolved?`)) return;
    try {
      const res = await fetch(`${API_URL}/purchase/mismatch/update/${recordId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ Status: "Acknowledge", "Action Type": "Manual Acknowledge", Remarks: "Marked as proper by user" })
      });
      if (!res.ok) throw new Error("Failed to acknowledge");
      toast.success(`? SUCCESS: Record marked as Acknowledged (Proper).`);
      setTimeout(() => { fetchMismatchSheetData(); }, 500);
    } catch (error) { toast.error(`? UPDATE FAILED: ${error.message}`); }
  };
  // Modal render
  const renderModal = () => {
    if (!editingRow) return null;

    const isDebitNote = actionType === "Make Debit Note";
    const isPurchaseReturn = actionType === "Return Material and Make Debit Note";

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Submit Mismatch Correction
              </h3>
              <button
                onClick={() => {
                  setEditingRow(null);
                  setActionType("");
                }}
                className="text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Mismatch Details */}
            <div className="mb-4 p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg">
              <h4 className="font-medium text-gray-700 dark:text-zinc-300 mb-2">
                Mismatch Details
              </h4>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-zinc-400">Lift ID:</span>{" "}
                    <span className="font-medium">{editingRow}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-zinc-400">Firm:</span>{" "}
                    <span className="font-medium">{editingRowData?.firmName}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-zinc-400">Party:</span>{" "}
                    <span className="font-medium">{editingRowData?.vendorName}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-zinc-400">Material:</span>{" "}
                    <span className="font-medium">{editingRowData?.material}</span>
                  </div>
                </div>

                <div className="border-t dark:border-zinc-800 pt-2 mt-2">
                  <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-2">DETECTED MISMATCHES:</p>
                  <div className="space-y-1">
                    {editingRowData?.mismatchTypes?.map(type => (
                      <div key={type} className="flex items-center gap-2 text-xs bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 p-1 rounded px-2">
                        <AlertCircle className="w-3 h-3" />
                        <span className="font-semibold uppercase">{type}</span>
                        <span className="text-gray-400 dark:text-zinc-500">|</span>
                        <span>{getMismatchSummary(type, editingRowData)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Type Dropdown */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
                  Action Type <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-[#268a59] focus:border-[#268a59] bg-white dark:bg-zinc-900 dark:text-white text-sm"
                >
                  <option value="">-- Select Action Type --</option>
                  <option value="Make Debit Note">Make Debit Note</option>
                  <option value="Return Material and Make Debit Note">
                    Return Material and Make Debit Note
                  </option>
                </select>
              </div>

              {/* Purchase Return Info Banner */}
              {isPurchaseReturn && (
                <div className="p-4 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-orange-500 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
                        Return Material First
                      </p>
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                        Click confirm to send this mismatch to Purchase Return.
                        After return finalization, it will move to the Debit Note
                        page.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Debit Note Fields - shown for both Purchaser and Transporter */}
              {isDebitNote && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
                      Debit Amount <span className="text-red-500 dark:text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.debitAmount || ""}
                      onChange={(e) =>
                        handleFormChange("debitAmount", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-[#268a59] focus:border-[#268a59] dark:bg-zinc-900 dark:text-white text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="Enter debit amount (e.g. 5000)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
                      Reason / Remarks
                    </label>
                    <textarea
                      value={formData.remarks || ""}
                      onChange={(e) =>
                        handleFormChange("remarks", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-[#268a59] focus:border-[#268a59] dark:bg-zinc-900 dark:text-white text-sm resize-none"
                      placeholder="Enter correction details and notes..."
                      rows={3}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-gray-200 dark:border-zinc-800">
              <button
                onClick={() => {
                  setEditingRow(null);
                  setActionType("");
                }}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 transition-colors duration-200"
              >
                Cancel
              </button>
              {actionType && (
                <button
                  onClick={submitFormData}
                  disabled={submitting}
                  className={`inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md ${
                    isPurchaseReturn
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:ring-blue-500"
                      : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 focus:ring-[#268a59]"
                  }`}
                >
                  {submitting ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {submitting
                    ? "Submitting..."
                    : isPurchaseReturn
                      ? "Confirm Return Material"
                      : "Submit Debit Note"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Optimized Fetch LIFT-ACCOUNTS data for Mismatches
  const fetchLiftAccountsForMismatches = useCallback(async (mismatches) => {
    setLiftAccountsData([]);
    setLoadingLifts(false);
  }, []);
  const fetchLiftAccountsData = useCallback(async () => {
    setLiftAccountsData([]);
    setLoadingLifts(false);
  }, []);
  const fetchPOsForMismatches = useCallback(async (mismatches) => {
    setPurchaseOrdersData([]);
    setLoadingPOs(false);
  }, []);
  const fetchPurchaseOrdersData = useCallback(async () => {
    setPurchaseOrdersData([]);
    setLoadingPOs(false);
  }, []);
  const fetchTLData = useCallback(async () => {
    setTlData([]);
    setLoadingTL(false);
  }, []);

  useEffect(() => {
    fetchTLData();
    fetchLiftAccountsData();
    fetchPurchaseOrdersData();
    fetchMismatchSheetData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.firmName]);
  // Helper for mismatch details in modal
  const getMismatchSummary = (type, item) => {
    const format = (val) => val !== undefined && val !== null ? val : "N/A";
    switch(type) {
      case 'rate': return `PO Rate: ₹${format(item.poRate)} vs Lift Rate: ₹${format(item.materialRate)} (Diff: ₹${format(item.rateDifference)})`;
      case 'quantity': return `PO Qty: ${format(item.poQuantity)} vs Lift Qty: ${format(item.liftingQty)} (Diff: ${format(item.qtyDifference || item.differenceQty)})`;
      case 'lab': return `Lab values out of tolerance: Alumina (${format(item.aluminaDiff)}%), Iron (${format(item.ironDiff)}%), AP (${format(item.apDiff)}%), BD (${format(item.bdDiff)}%)`;
      default: return "";
    }
  };

  // Calculate mismatch data (Hybrid: Differences from DB, Details from Source Tables)
  const getHybridRow = useCallback(
    (mismatchItem) => {
      const normalizeLookupKey = (value) =>
        String(value || "")
          .trim()
          .toUpperCase()
          .replace(/\s+/g, "");
      const numericLookupKey = (value) =>
        String(value || "").match(/\d+/g)?.join("") || "";

      const liftId = String(mismatchItem["Lift Number"] || mismatchItem["Lift ID"] || "").trim();
      const indentId = String(mismatchItem["Indent Number"] || mismatchItem["Indent Id."] || "").trim();

      const lift =
        liftAccountsData.find(
          (l) =>
            String(l.liftNo || "").trim() === liftId
        ) || {};

      const poLookupValues = [
        indentId,
        mismatchItem["PO Number"],
        mismatchItem["po_number"],
        mismatchItem["Indent No"],
        mismatchItem["Indent No."],
        lift.indentNo,
      ].filter(Boolean);
      const poLookupKeys = poLookupValues.map(normalizeLookupKey).filter(Boolean);
      const poNumericKeys = poLookupValues.map(numericLookupKey).filter(Boolean);
      const mismatchMaterial = String(
        mismatchItem["Product Name"] || lift.rawMaterialName || lift.material || "",
      ).trim().toLowerCase();

      const poCandidates = purchaseOrdersData.filter((p) => {
        const candidateKeys = [
          p.indentNo,
          p.indentId,
          p.poNumber,
        ].map(normalizeLookupKey).filter(Boolean);
        const candidateNumericKeys = [
          p.indentNo,
          p.indentId,
          p.poNumber,
        ].map(numericLookupKey).filter(Boolean);
        return candidateKeys.some((key) => poLookupKeys.includes(key)) ||
          candidateNumericKeys.some((key) => poNumericKeys.includes(key));
      });

      const po =
        poCandidates.find((p) =>
          String(p.rawMaterialName || p.materialName || "").trim().toLowerCase() === mismatchMaterial
        ) || poCandidates[0] || {};

      // Match TL row by Product Name (from Mismatch table) or Raw Material Name (from LIFT-ACCOUNTS)
      const productNameForTL = String(
        mismatchItem["Product Name"] || lift.rawMaterialName || "",
      )
        .trim()
        .toLowerCase();
      const tlRow =
        tlData.find(
          (tl) =>
            String(tl.productName || "")
              .trim()
              .toLowerCase() === productNameForTL,
        ) || {};

      // 4 Stages: Lift → Receipt → Lab → Mismatch
      let liveStage;
      if (mismatchItem["Stage"]) {
        liveStage = mismatchItem["Stage"];
      } else if (lift.planned2 && !lift.actual2) {
        liveStage = "Lab";
      } else if (lift.planned1 && !lift.actual1) {
        liveStage = "Receipt";
      } else if (!lift.planned1) {
        liveStage = "Lift";
      } else {
        liveStage = "Mismatch";
      }

      // Identify Mismatch Types
      const rateTypeStr = String(lift.typeOfTransportingRate || mismatchItem["Type Of Rate"] || mismatchItem["Type Of Transporting Rate"] || "").toUpperCase();
      const liftTypeStr = String(lift.liftType || mismatchItem["Type"] || "").toUpperCase();
      const isTransporter = rateTypeStr.includes("TO PAY") || liftTypeStr.includes("TRANSPORTER");
      const isVendor = liftTypeStr.includes("VENDOR") || rateTypeStr.includes("PAID") || rateTypeStr.includes("BILLED") || rateTypeStr.includes("FOR");
      
      
      // Handle both MT and KG: if bill quantity > 500, it's likely in KG. (Trucks carry 9-40 MT)
      const baseBillQty = parseFloat(lift.liftingQty || lift.quantity || po.poQuantity || 0);
      const isKG = baseBillQty > 500; 
      const multiplier = isKG ? 1000 : 1;
      const tolerance = isTransporter ? (-0.10 * multiplier) : (-0.05 * multiplier);

      const mismatchTypes = [];
      const hasRate = Math.abs(parseFloat(mismatchItem["Rate Difference"] || 0)) > 0.001;
      const hasQty = (parseFloat(mismatchItem["Quantity Difference"] || 0) < tolerance || 
                     parseFloat(mismatchItem["Diff Qty"] || 0) < tolerance || 
                     (mismatchItem["Qty Diff Status"] === "Mismatch" && parseFloat(mismatchItem["Quantity Difference"] || 0) < tolerance));
      
      const aluminaDiff = mismatchItem["Alumina Difference"];
      const ironDiff = mismatchItem["Iron Difference"];
      const apDiff = mismatchItem["AP Difference"];
      const bdDiff = mismatchItem["BD Difference"];

      // Check stored difference columns from Mismatch table
      const hasAluminaStored = aluminaDiff !== null && Math.abs(parseFloat(aluminaDiff || 0)) > 0;
      const hasIronStored = ironDiff !== null && Math.abs(parseFloat(ironDiff || 0)) > 0;
      const hasApStored = apDiff !== null && Math.abs(parseFloat(apDiff || 0)) > 0;
      const hasBdStored = bdDiff !== null && Math.abs(parseFloat(bdDiff || 0)) > 0;

      // LIVE comparison: compare LIFT-ACCOUNTS lab values directly against TL thresholds
      // This catches records where Mismatch table diff columns are null (e.g. submitted before integration)
      const labAluminaVal = parseFloat(lift.aluminaPercent || "");
      const labIronVal = parseFloat(lift.ironPercent || "");
      const labApVal = parseFloat(lift.apPercent || "");
      const labBdVal = parseFloat(lift.bdPercent || "");
      const tlAluminaMinVal = parseFloat(tlRow.tlAluminaMin ?? "");
      const tlIronMaxVal = parseFloat(tlRow.tlIronMax ?? "");
      const tlApMaxVal = parseFloat(tlRow.tlApMax ?? "");
      const tlBdMinVal = parseFloat(tlRow.tlBdMin ?? "");

      // Alumina: TL Alumina is MINIMUM → mismatch if lab < min
      const hasAluminaLive = !isNaN(labAluminaVal) && !isNaN(tlAluminaMinVal) && labAluminaVal < tlAluminaMinVal;
      // Iron: TL Iron is MAXIMUM → mismatch if lab > max
      const hasIronLive = !isNaN(labIronVal) && !isNaN(tlIronMaxVal) && labIronVal > tlIronMaxVal;
      // AP: TL AP is MAXIMUM → mismatch if lab > max
      const hasApLive = !isNaN(labApVal) && !isNaN(tlApMaxVal) && labApVal > tlApMaxVal;
      // BD: TL BD is MINIMUM → mismatch if lab < min
      const hasBdLive = !isNaN(labBdVal) && !isNaN(tlBdMinVal) && labBdVal < tlBdMinVal;

      const hasAlumina = hasAluminaStored || hasAluminaLive;
      const hasIron = hasIronStored || hasIronLive;
      const hasAp = hasApStored || hasApLive;
      const hasBd = hasBdStored || hasBdLive;
      const isRejected = lift.status?.toLowerCase() === "rejected";
      const hasLab = hasAlumina || hasIron || hasAp || hasBd || isRejected || (lift.physicalCondition === "Bad" && lift.moisture === "Yes");

      if (hasRate) mismatchTypes.push("rate");
      if (hasQty) mismatchTypes.push("quantity");
      if (hasLab) mismatchTypes.push("lab");

      const diffSummary = [
        hasRate ? "Rate" : "",
        hasQty ? "Qty" : "",
        hasLab ? "Lab" : ""
      ].filter(Boolean).join(", ");

      const billQtyVal = parseFloat(lift.truckQty || mismatchItem["Truck Qty"] || mismatchItem["Qty"]);
      const actQtyVal = parseFloat(lift.actualQuantity || mismatchItem["Actual Quantity"]);
      const diffBillRecVal = (!isNaN(billQtyVal) && !isNaN(actQtyVal))
        ? parseFloat((billQtyVal - actQtyVal).toFixed(3))
        : "N/A";

      return {
        ...lift,
        ...po,
        // Map DB Mismatch columns to component props
        id: mismatchItem.id,
        liftIdDisplay: mismatchItem["Lift ID"],
        // Core Identifiers
        liftNo: mismatchItem["Lift Number"],
        indentNo: po.poNumber || po.indentNo || po.indentId || mismatchItem["Indent Number"] || lift.indentNo || "",
        truckNo: lift.truckNo || mismatchItem["Truck No."] || mismatchItem["Truck No"] || "",

        // Differences from Mismatch Table (TL vs LIFT-ACCOUNTS)
        rateDifference: mismatchItem["Rate Difference"],
        qtyDifference: mismatchItem["Quantity Difference"],
        qtyDifferenceStatus: mismatchItem["Qty Diff Status"],
        differenceQty: mismatchItem["Diff Qty"],
        aluminaDiff: mismatchItem["Alumina Difference"],
        ironDiff: mismatchItem["Iron Difference"],
        apDiff: mismatchItem["AP Difference"],
        bdDiff: mismatchItem["BD Difference"],

        // TL table tolerance values (shown instead of PO values in Lab Mismatch)
        tlAlumina: tlRow.aluminaRange || "N/A",
        tlIron: tlRow.ironRange || "N/A",
        tlAP: tlRow.apRange || "N/A",
        tlBD: tlRow.bdRange || "N/A",

        // Fallback/Priority for shared fields
        vendorName:
          mismatchItem["Party Name"] || lift.vendorName || po.vendorName,
        rawMaterialName:
          mismatchItem["Product Name"] || lift.rawMaterialName || lift.material,
        material:
          mismatchItem["Product Name"] || lift.material || po.materialName || po.rawMaterialName,
        firmName: mismatchItem["Firm Name"] || lift.firmName || po.firmName,
        timestamp: String(mismatchItem["Timestamp"] || "").replace("T", " "),

        // Live stage derived from LIFT-ACCOUNTS actual timestamps
        stage: liveStage,
        status: mismatchItem["Status"] || mismatchItem.Status || "",
        Status: mismatchItem["Status"] || mismatchItem.Status || "",
        remarks: mismatchItem["Remarks"] || mismatchItem.Remarks || "",
        mismatchTypes,
        diffSummary,
        qtyUnit: isKG ? "KG" : "MT",

        // Explicit Mapping for Mismatch Summaries
        materialRate: lift.materialRate || mismatchItem["Rate"] || mismatchItem["Material Rate (Lift)"],
        poRate: po.poRate || mismatchItem["PO Rate"] || mismatchItem["PO Rate (Original)"],
        liftingQty: lift.liftingQty || lift.quantity || mismatchItem["Billing Quantity"],
        poQuantity: po.poQuantity || po.quantity || mismatchItem["Quantity (PO)"],
        billQuantity: lift.truckQty || mismatchItem["Truck Qty"] || mismatchItem["Qty"] || "N/A",
        actualQuantity: lift.actualQuantity || mismatchItem["Actual Quantity"] || "N/A",
        diffBillRec: diffBillRecVal,
        billNo: lift.billNo || mismatchItem["Bill No."] || mismatchItem["Bill No"] || "",
        dateOfBill: lift.dateOfBill || "",
        areaLifting: lift.areaLifting || mismatchItem["Area Lifting"] || mismatchItem["Area lifting"] || "",
        billImageUrl: lift.billImageUrl || mismatchItem["Bill Image"] || "",
        biltyNo: lift.biltyNo || mismatchItem["Bilty No."] || mismatchItem["Bilty No"] || "",
        biltyImageUrl: lift.biltyImageUrl || mismatchItem["Bilty Image"] || "",
        weightSlipImageUrl: lift.weightSlipImageUrl || mismatchItem["Weight Slip"] || "",
        typeOfTransportingRate: lift.typeOfTransportingRate || mismatchItem["Type Of Rate"] || mismatchItem["Type Of Transporting Rate"] || "",
        
        // Lab Data Explicit Mapping
        aluminaPercent: lift.aluminaPercent || mismatchItem["Lab Alumina"] || "",
        ironPercent: lift.ironPercent || mismatchItem["Lab Iron"] || "",
        apPercent: lift.apPercent || "",
        bdPercent: lift.bdPercent || "",
        poAlumina: po.poAlumina || mismatchItem["PO Alumina"] || mismatchItem["PO Al2O3%"] || mismatchItem["Alumina %"] || "",
        poIron: po.poIron || mismatchItem["PO Iron"] || mismatchItem["PO Fe%"] || mismatchItem["Iron %"] || ""
      };
    },
    [liftAccountsData, purchaseOrdersData, tlData],
  );

  const unifiedMismatchData = useMemo(() => {
    const raw = mismatchSheetData
      .filter(
        (item) =>
          item["Status"] !== "Credit Notes" &&
          item["Status"] !== "Others" &&
          item["Status"] !== "Purchase Return" &&
          item["Status"] !== "Acknowledge" &&
          item["Status"] !== "Completed" &&
          item["Status"] !== "Resolved - Return",
      )
      .map(getHybridRow)
      .filter(row => row.mismatchTypes.length > 0);

    if (user?.firmName) {
      return raw.filter((item) => canViewFirm(user.firmName, item.firmName));
    }
    return raw;
  }, [mismatchSheetData, getHybridRow, user]);

  const historyMismatchData = useMemo(() => {
    const raw = mismatchSheetData
      .filter(item => item.Status !== "Pending" && item.Status !== "Not Done" && item.Status !== "Purchase Return")
      .map(getHybridRow);

    if (user?.firmName) {
      return raw.filter((item) => canViewFirm(user.firmName, item.firmName));
    }
    return raw;
  }, [mismatchSheetData, getHybridRow, user]);


  const filteredUnifiedData = useMemo(() => {
    let filtered = unifiedMismatchData.filter(
      (item) => !submittedRows.has(`mismatch_${item.liftNo}`),
    );
    if (filters.vendorName !== "all") {
      filtered = filtered.filter(
        (item) => item.vendorName === filters.vendorName,
      );
    }
    if (filters.materialName !== "all") {
      filtered = filtered.filter(
        (item) => item.material === filters.materialName || item.rawMaterialName === filters.materialName,
      );
    }
    if (filters.firmName !== "all") {
      filtered = filtered.filter((item) => item.firmName === filters.firmName);
    }
    if (filters.orderNumber !== "all") {
      filtered = filtered.filter(
        (item) => item.indentNo === filters.orderNumber,
      );
    }
    if (filters.fromDate) {
      filtered = filtered.filter((item) => {
        if (!item.timestamp) return false;
        const itemDateStr = item.timestamp.substring(0, 10);
        return itemDateStr >= filters.fromDate;
      });
    }
    if (filters.toDate) {
      filtered = filtered.filter((item) => {
        if (!item.timestamp) return false;
        const itemDateStr = item.timestamp.substring(0, 10);
        return itemDateStr <= filters.toDate;
      });
    }
    return filtered;
  }, [unifiedMismatchData, filters, submittedRows]);

  const filteredHistoryData = useMemo(() => {
    let filtered = historyMismatchData;
    if (filters.vendorName !== "all") {
      filtered = filtered.filter(
        (item) => item.vendorName === filters.vendorName,
      );
    }
    if (filters.materialName !== "all") {
      filtered = filtered.filter(
        (item) => item.material === filters.materialName || item.rawMaterialName === filters.materialName,
      );
    }
    if (filters.firmName !== "all") {
      filtered = filtered.filter((item) => item.firmName === filters.firmName);
    }
    if (filters.orderNumber !== "all") {
      filtered = filtered.filter(
        (item) => item.indentNo === filters.orderNumber,
      );
    }
    if (filters.fromDate) {
      filtered = filtered.filter((item) => {
        if (!item.timestamp) return false;
        const itemDateStr = item.timestamp.substring(0, 10);
        return itemDateStr >= filters.fromDate;
      });
    }
    if (filters.toDate) {
      filtered = filtered.filter((item) => {
        if (!item.timestamp) return false;
        const itemDateStr = item.timestamp.substring(0, 10);
        return itemDateStr <= filters.toDate;
      });
    }
    return filtered;
  }, [historyMismatchData, filters]);

  // Filter options
  const uniqueFilterOptions = useMemo(() => {
    const vendors = new Set();
    const materials = new Set();
    const firms = new Set();
    const orders = new Set();

    unifiedMismatchData.forEach((item) => {
      if (item.vendorName) vendors.add(item.vendorName);
      if (item.material || item.rawMaterialName) {
        materials.add(item.material || item.rawMaterialName);
      }
      if (item.firmName) firms.add(item.firmName);
      if (item.indentNo) orders.add(item.indentNo);
    });

    return {
      vendorName: [...vendors].sort(),
      materialName: [...materials].sort(),
      firmName: [...firms].sort(),
      orderNumber: [...orders].sort(),
    };
  }, [unifiedMismatchData]);

  // Event handlers (keeping existing logic unchanged)
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearAllFilters = () => {
    setFilters({
      vendorName: "all",
      materialName: "all",
      firmName: "all",
      orderNumber: "all",
      fromDate: "",
      toDate: "",
    });
  };

  const handleToggleColumn = (tab, dataKey, checked) => {
    if (tab === "unified") {
      setVisibleUnifiedColumns((prev) => ({
        ...prev,
        [dataKey]: checked,
      }));
    } else if (tab === "history") {
      setVisibleHistoryColumns((prev) => ({ ...prev, [dataKey]: checked }));
    }
  };

  const handleSelectAllColumns = (tab, columnsMeta, selectAll) => {
    const newVisibility = {};
    columnsMeta.forEach((col) => {
      newVisibility[col.dataKey] = col.alwaysVisible || selectAll;
    });
    if (tab === "unified") {
      setVisibleUnifiedColumns(newVisibility);
    } else if (tab === "history") {
      setVisibleHistoryColumns(newVisibility);
    }
  };

  // Render cell with action buttons
  const renderCell = (item, column) => {
    const value = item[column.dataKey];

    if (column.dataKey === "actions") {
      const mismatchType = "unified";

      if (activeTab === "history") {
        return (
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-green-50 dark:bg-emerald-500/10 text-[#268a59] dark:text-emerald-400 border-green-200 dark:border-emerald-500/30"
            >
              Submitted
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-green-600 dark:text-emerald-400 hover:text-green-700 dark:hover:text-emerald-300 hover:bg-green-50 dark:hover:bg-emerald-500/10 border border-green-200 dark:border-emerald-500/30 font-bold"
              onClick={() => handleAcknowledgeMismatch(item)}
              title="Mark as Proper"
              disabled={item.status === "Acknowledge"}
            >
              {item.status === "Acknowledge" ? "Proper" : "OK"}
            </Button>
            {isSuperAdmin && (
              <button
                onClick={() => setSuperAdminEditItem(item)}
                className="inline-flex items-center px-2 py-1 bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 text-xs font-medium rounded-md hover:bg-purple-200 dark:hover:bg-purple-500/20 border border-purple-300 dark:border-purple-500/30"
              >
                <ShieldCheck className="w-3 h-3 mr-1" />
                Edit
              </button>
            )}
            {isSuperAdmin && item.canRevert !== false && (
              <button
                onClick={() => {
                  if (window.confirm("Are you sure you want to revert this mismatch?")) {
                    handleRevert(item.liftIdDisplay || item.liftNo || item.id);
                  }
                }}
                className="inline-flex items-center px-2 py-1 bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-xs font-medium rounded-md hover:bg-red-200 dark:hover:bg-red-500/20 border border-red-300 dark:border-red-500/30"
              >
                <Undo2 className="w-3 h-3 mr-1" />Revert
              </button>
            )}
          </div>
        );
      }

      return (
        <div className="flex gap-2 whitespace-nowrap items-center">
          <button
            onClick={() => handleCorrectData(item, mismatchType)}
            className="inline-flex items-center px-3 py-1 text-xs font-medium text-white bg-linear-to-r from-green-500 to-green-600 rounded-md hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-[#268a59] focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Edit className="w-3 h-3 mr-1" />
            Management Approval
          </button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-green-600 dark:text-emerald-400 hover:text-green-700 dark:hover:text-emerald-300 hover:bg-green-50 dark:hover:bg-emerald-500/10 border border-green-200 dark:border-emerald-500/30 font-bold"
            onClick={() => handleAcknowledgeMismatch(item)}
            title="Mark as Proper"
          >
            OK
          </Button>
          {isSuperAdmin && (
            <button
              onClick={() => setSuperAdminEditItem(item)}
              className="inline-flex items-center px-2 py-1 bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 text-xs font-medium rounded-md hover:bg-purple-200 dark:hover:bg-purple-500/20 border border-purple-300 dark:border-purple-500/30"
            >
              <ShieldCheck className="w-3 h-3 mr-1" />
              Edit
            </button>
          )}
        </div>
      );
    }

    if (column.isLink) {
      return value ? (
        <a
          href={String(value).startsWith("http") ? value : `https://${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#2fa36b] hover:text-green-800 dark:hover:text-emerald-300 hover:underline inline-flex items-center text-xs"
        >
          <ExternalLink className="h-3 w-3 mr-1" /> {column.linkText || "View"}
        </a>
      ) : (
        <span className="text-gray-400 dark:text-zinc-500 text-xs">N/A</span>
      );
    }

    if (column.dataKey === "mismatchTypes") {
      return (
        <div className="flex flex-wrap gap-1">
          {item.mismatchTypes.map(type => (
            <Badge key={type} className="text-[9px] px-1 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/30 uppercase">
              {type}
            </Badge>
          ))}
        </div>
      );
    }

    if (column.dataKey === "diffSummary") {
      return <span className="text-[10px] text-gray-500 dark:text-zinc-400 font-medium">{item.diffSummary}</span>;
    }

    // Stage badge rendering
    if (column.dataKey === "stage") {
      const stageValue = String(value || "Lift");
      const stageConfig = {
        Lift: {
          className: "bg-orange-100 dark:bg-orange-500/10 text-orange-800 dark:text-orange-400 border-orange-200 dark:border-orange-500/30",
          icon: "🚛",
        },
        Receipt: {
          className: "bg-green-100 dark:bg-emerald-500/10 text-green-800 dark:text-emerald-400 border-green-200 dark:border-emerald-500/30",
          icon: "📦",
        },
        Lab: {
          className: "bg-green-100 dark:bg-emerald-500/10 text-green-800 dark:text-emerald-400 border-green-200 dark:border-emerald-500/30",
          icon: "🧪",
        },
        Mismatch: {
          className: "bg-red-100 dark:bg-red-500/10 text-red-800 dark:text-red-400 border-red-200 dark:border-red-500/30",
          icon: "⚠️",
        },
      };
      const config = stageConfig[stageValue] || stageConfig["Lift"];
      return (
        <Badge
          variant="outline"
          className={`whitespace-nowrap text-xs font-semibold px-2 py-0.5 ${config.className}`}
        >
          <span className="mr-1">{config.icon}</span>
          {stageValue}
        </Badge>
      );
    }

    // Highlight differences with color coding
    if (
      column.dataKey === "rateDifference" ||
      column.dataKey === "qtyDifference" ||
      column.dataKey === "aluminaDiff" ||
      column.dataKey === "ironDiff" ||
      column.dataKey === "apDiff" ||
      column.dataKey === "bdDiff"
    ) {
      const numValue = parseFloat(value) || 0;
      let displayValue = numValue > 0 ? `+${value}` : value;
      if (column.dataKey === "qtyDifference" && value !== undefined && value !== null) {
        displayValue = `${displayValue} ${item.qtyUnit || ""}`;
      }
      return (
        <span
          className={
            numValue < 0
              ? "text-red-600 dark:text-red-400 font-semibold"
              : "text-[#2fa36b] dark:text-emerald-400 font-semibold"
          }
        >
          {displayValue}
        </span>
      );
    }

    if (column.dataKey === "diffBillRec") {
      if (value === "N/A" || value === undefined || value === null) {
        return <span className="text-gray-400 dark:text-zinc-500 text-xs">N/A</span>;
      }
      const numValue = parseFloat(value) || 0;
      let displayValue = numValue > 0 ? `+${value}` : value;
      return (
        <span
          className={
            numValue > 0
              ? "text-red-600 dark:text-red-400 font-semibold"
              : numValue < 0
                ? "text-[#2fa36b] dark:text-emerald-400 font-semibold"
                : "text-gray-700 dark:text-zinc-300 font-medium"
          }
        >
          {displayValue} <span className="text-[10px] text-gray-500 dark:text-zinc-400 ml-0.5">{item.qtyUnit || ""}</span>
        </span>
      );
    }

    if (
      (column.dataKey === "billQuantity" ||
       column.dataKey === "actualQuantity" ||
       column.dataKey === "poQuantity" ||
       column.dataKey === "differenceQty") &&
      value && value !== "N/A"
    ) {
      return <span>{value} <span className="text-[10px] text-gray-500 dark:text-zinc-400 ml-0.5">{item.qtyUnit || ""}</span></span>;
    }

    if (column.dataKey === "qtyDifferenceStatus") {
      if (!value) return <span className="text-gray-400 dark:text-zinc-500 text-xs">N/A</span>;
      const isMismatch = String(value).toLowerCase() === "mismatch";
      return (
        <Badge
          variant="outline"
          className={
            isMismatch
              ? "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30"
              : "bg-green-50 dark:bg-emerald-500/10 text-[#268a59] dark:text-emerald-400 border-green-200 dark:border-emerald-500/30"
          }
        >
          {value}
        </Badge>
      );
    }

    return value || <span className="text-gray-400 dark:text-zinc-500 text-xs">N/A</span>;
  };

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
    const isLoading = tabKey === "unified" 
      ? loadingLifts || loadingPOs || loadingMismatch 
      : loadingLifts;
    const hasError = error && data.length === 0;

    return (
      <Card className="flex-1 flex-col">
        <CardHeader className="py-3 px-4 bg-red-50/50 dark:bg-red-500/10">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center text-md font-semibold text-foreground">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
            Mismatch
          </CardTitle>
              
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  fetchLiftAccountsData();
                  fetchPurchaseOrdersData();
                  fetchTLData();
                  fetchMismatchSheetData();
                }}
                variant="outline"
                size="sm"
                className="h-8 text-xs bg-white dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Refresh
              </Button>
              <Button
                onClick={() => {
                  const exportHeaders = columnsMeta
                    .filter((col) => col.dataKey !== "actions")
                    .map((col) => `"${col.header.replace(/"/g, '""')}"`);

                  const exportRows = data.map((item) => {
                    return columnsMeta
                      .filter((col) => col.dataKey !== "actions")
                      .map((col) => {
                        let val = item[col.dataKey];
                        if (val === undefined || val === null) {
                          val = "";
                        } else {
                          val = String(val);
                        }
                        return `"${val.replace(/"/g, '""')}"`;
                      })
                      .join(",");
                  });

                  const csvContent = [exportHeaders.join(","), ...exportRows].join("\n");
                  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.setAttribute("href", url);
                  link.setAttribute("download", `${tabKey}_mismatches_${new Date().toISOString().slice(0, 10)}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  toast.success("Excel (CSV) Exported Successfully", {
                    description: `Downloaded ${data.length} records in Excel format.`,
                    duration: 3000,
                  });
                }}
                variant="outline"
                size="sm"
                className="h-8 text-xs bg-white text-emerald-600 border-emerald-200 hover:text-emerald-700 hover:bg-emerald-50/50 dark:bg-zinc-900 dark:text-emerald-400 dark:border-emerald-500/30 dark:hover:text-emerald-300 dark:hover:bg-emerald-500/10"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Export
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs bg-white dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    <MixerHorizontalIcon className="mr-1.5 h-3.5 w-3.5" /> View Columns
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-3">
                  <div className="grid gap-2">
                    <p className="text-sm font-medium">Toggle Columns</p>
                    <div className="flex items-center justify-between mt-1 mb-2">
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto text-xs"
                        onClick={() => handleSelectAllColumns(tabKey === "unified" ? "unified" : "history", columnsMeta, true)}
                      >
                        Select All
                      </Button>
                      <span className="text-gray-300 dark:text-zinc-600 mx-1">|</span>
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto text-xs"
                        onClick={() => handleSelectAllColumns(tabKey === "unified" ? "unified" : "history", columnsMeta, false)}
                      >
                        Deselect All
                      </Button>
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {columnsMeta
                        .filter((col) => col.toggleable)
                        .map((col) => (
                          <div key={`toggle-${tabKey}-${col.dataKey}`} className="flex items-center space-x-2">
                            <Checkbox
                              id={`toggle-${tabKey}-${col.dataKey}`}
                              checked={!!visibilityState[col.dataKey]}
                              onCheckedChange={(checked) => handleToggleColumn(tabKey === "unified" ? "unified" : "history", col.dataKey, Boolean(checked))}
                              disabled={col.alwaysVisible}
                            />
                            <Label htmlFor={`toggle-${tabKey}-${col.dataKey}`} className="text-xs font-normal cursor-pointer">
                              {col.header} {col.alwaysVisible && <span className="text-gray-400 dark:text-zinc-500 ml-0.5 text-xs">(Fixed)</span>}
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
        <CardContent className="p-0 flex-1 flex-col">
          {isLoading ? (
            <div className="flex flex-col justify-center items-center py-10 flex-1">
              <Loader2 className="h-8 w-8 text-red-600 dark:text-red-400 animate-spin mb-3" />
              <p className="text-muted-foreground ml-2">
                Loading mismatch data...
              </p>
            </div>
          ) : hasError ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-destructive-foreground bg-destructive/10 rounded-lg mx-4 my-4 text-center flex-1">
              <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
              <p className="font-medium text-destructive">Error Loading Data</p>
              <p className="text-sm text-muted-foreground max-w-md">{error}</p>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-green-200/50 dark:border-emerald-500/30 bg-green-50/50 dark:bg-emerald-500/10 rounded-lg mx-4 my-4 text-center flex-1">
              <Info className="h-12 w-12 text-green-500 dark:text-emerald-400 mb-3" />
              <p className="font-medium text-foreground">No Mismatches Found</p>
              <p className="text-sm text-muted-foreground text-center">
                {tabKey === "rateMismatch"
                  ? "All material rates match their corresponding PO rates."
                  : tabKey === "quantityMismatch"
                    ? "All lifted quantities match their weight slip quantities."
                    : "All material properties match between TL and LIFT-ACCOUNTS sheets."}
                {user?.firmName && String(user.firmName).toLowerCase() !== "all" && (
                  <span className="block mt-1">
                    (Filtered by firm: {user.firmName})
                  </span>
                )}
              </p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[calc(100vh-280px)] min-h-[400px] relative custom-scrollbar rounded-b-lg flex-1">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-30">
                  <tr className="bg-red-50 dark:bg-red-500/10 border-b border-red-200 dark:border-red-500/30">
                    {visibleCols.map((col) => (
                      <th
                        key={col.dataKey}
                        className={`px-3 py-3 text-xs font-bold text-red-800 dark:text-red-400 uppercase text-left bg-red-50/95 dark:bg-zinc-900/95 backdrop-blur-sm shadow-sm whitespace-nowrap ${col.dataKey === "actions" ? "w-[150px]" : ""}`}
                      >
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-100 dark:divide-zinc-800">
                  {data.map((item, index) => (
                    <tr
                      key={`${tabKey}-${item.id || item.liftNo}-${index}`}
                      className="hover:bg-red-50/50 dark:hover:bg-red-500/20 bg-red-100/30 dark:bg-red-500/10 border-l-4 border-l-red-500 transition-colors border-b border-gray-100 dark:border-zinc-800"
                    >
                      {visibleCols.map((column) => (
                        <td
                          key={`${item.id || item.liftNo}-${column.dataKey}`}
                          className={`text-xs px-3 py-2 ${
                            column.dataKey === "id" ||
                            column.dataKey === "liftNo" ||
                            column.dataKey === "liftIdDisplay"
                              ? "font-medium text-primary"
                              : column.dataKey === "actions"
                                ? "w-[150px]"
                                : "text-gray-700 dark:text-zinc-300"
                          }`}
                        >
                          {renderCell(item, column)}
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
    );
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-950 dark:to-zinc-950 p-4 sm:p-6">
      {renderModal()}
      {superAdminEditItem && (
        <SuperAdminEditModal
          title={`Edit Mismatch — ${superAdminEditItem.liftIdDisplay || superAdminEditItem.liftNo}`}
          tableName="Mismatch"
          pkField="id"
          pkValue={superAdminEditItem.id}
          fields={[
            { label: "Stage", dbKey: "stage", value: superAdminEditItem.stage, type: "text", readOnly: true },
            { label: "Detected Issues", dbKey: "mismatchTypes", value: (superAdminEditItem.mismatchTypes || []).join(", ").toUpperCase(), type: "text", readOnly: true },
            { label: "Difference Summary", dbKey: "diffSummary", value: superAdminEditItem.diffSummary, type: "text", readOnly: true },
            
            { label: "Lift ID (Mismatch)", dbKey: "Lift ID", value: superAdminEditItem.liftIdDisplay || superAdminEditItem.liftNo, type: "text" },
            { label: "Lift Number (Mismatch)", dbKey: "Lift Number", value: superAdminEditItem.liftNo, type: "text" },
            { label: "Lift Number (LIFT-ACCOUNTS)", dbKey: "liftNoLift", saveDbKey: "Lift No", customTable: "LIFT-ACCOUNTS", customPkField: "Lift No", customPkValue: superAdminEditItem.liftNo, value: superAdminEditItem.liftNo, type: "text" },
            
            { label: "Truck No. (Mismatch)", dbKey: "Truck No.", value: superAdminEditItem.truckNo, type: "text" },
            { label: "Truck No. (LIFT-ACCOUNTS)", dbKey: "truckNoLift", saveDbKey: "Truck No.", customTable: "LIFT-ACCOUNTS", customPkField: "Lift No", customPkValue: superAdminEditItem.liftNo, value: superAdminEditItem.truckNo, type: "text" },
            
            { label: "PO Number (Mismatch)", dbKey: "Indent Number", value: superAdminEditItem.indentNo, type: "text" },
            { label: "PO Number (LIFT-ACCOUNTS)", dbKey: "poNoLift", saveDbKey: "Indent no.", customTable: "LIFT-ACCOUNTS", customPkField: "Lift No", customPkValue: superAdminEditItem.liftNo, value: superAdminEditItem.indentNo, type: "text" },
            
            { label: "Firm Name (Mismatch)", dbKey: "Firm Name", value: superAdminEditItem.firmName, type: "text" },
            { label: "Firm Name (LIFT-ACCOUNTS)", dbKey: "firmNameLift", saveDbKey: "Firm Name", customTable: "LIFT-ACCOUNTS", customPkField: "Lift No", customPkValue: superAdminEditItem.liftNo, value: superAdminEditItem.firmName, type: "text" },
            
            { label: "Party Name (Mismatch)", dbKey: "Party Name", value: superAdminEditItem.vendorName, type: "text" },
            { label: "Party Name (LIFT-ACCOUNTS)", dbKey: "partyNameLift", saveDbKey: "Vendor Name", customTable: "LIFT-ACCOUNTS", customPkField: "Lift No", customPkValue: superAdminEditItem.liftNo, value: superAdminEditItem.vendorName, type: "text" },
            
            { label: "Product Name (Mismatch)", dbKey: "Product Name", value: superAdminEditItem.material, type: "text" },
            { label: "Product Name (LIFT-ACCOUNTS)", dbKey: "productNameLift", saveDbKey: "Raw Material Name", customTable: "LIFT-ACCOUNTS", customPkField: "Lift No", customPkValue: superAdminEditItem.liftNo, value: superAdminEditItem.material, type: "text" },
            
            { label: "PO Rate (INDENT-PO)", dbKey: "poRatePO", saveDbKey: "Rate", customTable: "INDENT-PO", customPkField: "po_number", customPkValue: superAdminEditItem.indentNo, value: superAdminEditItem.poRate, type: "number" },
            
            { label: "Bill Rate (Mismatch)", dbKey: "Rate", value: superAdminEditItem.materialRate, type: "number" },
            { label: "Bill Rate (LIFT-ACCOUNTS)", dbKey: "rateLift", saveDbKey: "Rate", customTable: "LIFT-ACCOUNTS", customPkField: "Lift No", customPkValue: superAdminEditItem.liftNo, value: superAdminEditItem.materialRate, type: "number" },
            
            { label: "Bill Qty (Mismatch)", dbKey: "Truck Qty", value: superAdminEditItem.billQuantity, type: "number" },
            { label: "Date Of Bill (Mismatch)", dbKey: "Date Of Bill", value: superAdminEditItem.dateOfBill, type: "date" },
            { label: "Date Of Bill (LIFT-ACCOUNTS)", dbKey: "dateOfBillLift", saveDbKey: "Date Of Bill", customTable: "LIFT-ACCOUNTS", customPkField: "Lift No", customPkValue: superAdminEditItem.liftNo, value: superAdminEditItem.dateOfBill, type: "date" },
            { label: "Bill Qty (LIFT-ACCOUNTS)", dbKey: "truckQtyLift", saveDbKey: "Truck Qty", customTable: "LIFT-ACCOUNTS", customPkField: "Lift No", customPkValue: superAdminEditItem.liftNo, value: superAdminEditItem.billQuantity, type: "number" },
            
            { label: "Receive Qty (LIFT-ACCOUNTS)", dbKey: "actualQtyLift", saveDbKey: "Actual Quantity", customTable: "LIFT-ACCOUNTS", customPkField: "Lift No", customPkValue: superAdminEditItem.liftNo, value: superAdminEditItem.actualQuantity, type: "number" },
            
            { label: "PO Al2O3% (INDENT-PO)", dbKey: "poAluminaPO", saveDbKey: "Alumina %", customTable: "INDENT-PO", customPkField: "po_number", customPkValue: superAdminEditItem.indentNo, value: superAdminEditItem.poAlumina, type: "number" },
            { label: "PO Fe% (INDENT-PO)", dbKey: "poIronPO", saveDbKey: "Iron %", customTable: "INDENT-PO", customPkField: "po_number", customPkValue: superAdminEditItem.indentNo, value: superAdminEditItem.poIron, type: "number" },
            
            { label: "Lab Al2O3% (LIFT-ACCOUNTS)", dbKey: "aluminaPercentLift", saveDbKey: "Alumina Percent Age %", customTable: "LIFT-ACCOUNTS", customPkField: "Lift No", customPkValue: superAdminEditItem.liftNo, value: superAdminEditItem.aluminaPercent, type: "number" },
            { label: "Lab Fe% (LIFT-ACCOUNTS)", dbKey: "ironPercentLift", saveDbKey: "Iron Percent Age %", customTable: "LIFT-ACCOUNTS", customPkField: "Lift No", customPkValue: superAdminEditItem.liftNo, value: superAdminEditItem.ironPercent, type: "number" },
            
            { label: "Debit Amount", dbKey: "Debit Amount", value: superAdminEditItem.debitAmount, type: "number" },
            { label: "Debit Note URL", dbKey: "Debit Note URL", value: superAdminEditItem.debitNoteUrl, type: "text" },
            { label: "Total Freight", dbKey: "Total Freight", value: superAdminEditItem.totalFreight, type: "number" },
            { label: "Remarks", dbKey: "Remarks", value: superAdminEditItem.remarks, type: "textarea" },
          ]}
          onClose={() => setSuperAdminEditItem(null)}
          onSaved={() => { setSuperAdminEditItem(null); fetchMismatchSheetData(); fetchLiftAccountsData(); }}
        />
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        <Card className="">
          <CardHeader className="p-4">
            <CardTitle className="flex items-center gap-2 text-gray-700 dark:text-zinc-300 text-lg">
              <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" /> Mismatch
              Analysis Dashboard
            </CardTitle>
            
          </CardHeader>
          <CardContent className="p-4">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex-1 flex flex-col"
            >
              <TabsList className="grid w-full sm:w-[400px] grid-cols-2 mb-4">
                <TabsTrigger value="pending" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Active Mismatches
                  <Badge variant="destructive" className="ml-1.5 px-1.5 py-0.5 text-xs">
                    {filteredUnifiedData.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="h-4 w-4" /> Resolution History
                </TabsTrigger>
              </TabsList>

              {/* Filters */}
              <div className="mb-4 p-4 bg-red-50/50 dark:bg-red-500/10 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
                  <Label className="text-sm font-medium">Filters</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllFilters}
                    className="ml-auto bg-white dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Clear All
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <Select
                    value={filters.vendorName}
                    onValueChange={(value) =>
                      handleFilterChange("vendorName", value)
                    }
                  >
                    <SelectTrigger className="h-8 bg-white dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300">
                      <SelectValue placeholder="All Vendors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Vendors</SelectItem>
                      {uniqueFilterOptions.vendorName.map((vendor) => (
                        <SelectItem key={vendor} value={vendor}>
                          {vendor}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.materialName}
                    onValueChange={(value) =>
                      handleFilterChange("materialName", value)
                    }
                  >
                    <SelectTrigger className="h-8 bg-white dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300">
                      <SelectValue placeholder="All Materials" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Materials</SelectItem>
                      {uniqueFilterOptions.materialName.map((material) => (
                        <SelectItem key={material} value={material}>
                          {material}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.firmName}
                    onValueChange={(value) =>
                      handleFilterChange("firmName", value)
                    }
                  >
                    <SelectTrigger className="h-8 bg-white dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300">
                      <SelectValue placeholder="All Firms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Firms</SelectItem>
                      {uniqueFilterOptions.firmName.map((firm) => (
                        <SelectItem key={firm} value={firm}>
                          {firm}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.orderNumber}
                    onValueChange={(value) =>
                      handleFilterChange("orderNumber", value)
                    }
                  >
                    <SelectTrigger className="h-8 bg-white dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300">
                      <SelectValue placeholder="All Orders" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Orders</SelectItem>
                      {uniqueFilterOptions.orderNumber.map((order) => (
                        <SelectItem key={order} value={order}>
                          {order}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="relative">
                    <Input
                      type="date"
                      value={filters.fromDate}
                      onChange={(e) =>
                        handleFilterChange("fromDate", e.target.value)
                      }
                      className="h-8 bg-white dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 text-xs pl-12"
                    />
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase pointer-events-none">
                      From
                    </span>
                  </div>

                  <div className="relative">
                    <Input
                      type="date"
                      value={filters.toDate}
                      onChange={(e) =>
                        handleFilterChange("toDate", e.target.value)
                      }
                      className="h-8 bg-white dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 text-xs pl-8"
                    />
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase pointer-events-none">
                      To
                    </span>
                  </div>
                </div>
              </div>

              <TabsContent value="pending" className="flex-1 flex flex-col mt-0">
                {renderTableSection(
                  "unified",
                  "Active Mismatches",
                  "Consolidated view of all rate, quantity, and quality mismatches for pending lifts.",
                  filteredUnifiedData,
                  UNIFIED_MISMATCH_COLUMNS_META,
                  visibleUnifiedColumns,
                )}
              </TabsContent>

              <TabsContent value="history" className="flex-1 flex flex-col mt-0">
                {renderTableSection(
                  "history",
                  "Resolution History",
                  "View previously resolved mismatches and management actions taken.",
                  filteredHistoryData,
                  HISTORY_COLUMNS_META,
                  visibleHistoryColumns,
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
