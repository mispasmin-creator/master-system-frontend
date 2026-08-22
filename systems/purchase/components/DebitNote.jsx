"use client";

import { useState, useEffect, useCallback, useContext, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Loader2,
  AlertTriangle,
  FileText,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  Package,
  Truck,
  Filter,
  ChevronsUpDown,
  Edit,
  Save,
  X,
  Clock,
  History,
  UploadCloud,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AuthContext } from "../context/AuthContext";
import SuperAdminEditModal from "./SuperAdminEditModal";
import { toast } from "sonner";
import { canViewFirm } from "../utils/firmFilter";
import { uploadFileToStorage } from "../utils/storageUtils";
import { API_URL, getToken } from "@/lib/auth";

const normalizeFirmName = (val) => {
  if (!val) return null;
  if (Array.isArray(val)) {
    return val[0] || null;
  }
  const str = String(val).trim();
  if (str.startsWith("[") && str.endsWith("]")) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        return parsed[0] || null;
      }
    } catch (e) {
      // Ignore parse error
    }
  }
  return str;
};

// Column configuration
const DEBIT_NOTE_COLUMNS_META = [
  { header: "Actions", dataKey: "actions", toggleable: false, alwaysVisible: true },
  { header: "Timestamp", dataKey: "timestamp", toggleable: true, alwaysVisible: true },
  { header: "Lift ID", dataKey: "liftId", toggleable: true, alwaysVisible: true },
  { header: "Indent Number", dataKey: "indentNo", toggleable: true, alwaysVisible: true },
  { header: "Purchase Return No.", dataKey: "purchaseReturnNo", toggleable: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
  { header: "Party Name", dataKey: "partyName", toggleable: true },
  { header: "Product Name", dataKey: "productName", toggleable: true },
  { header: "Qty", dataKey: "qty", toggleable: true },
  { header: "Product Rate", dataKey: "productRate", toggleable: true },
  { header: "Bill No", dataKey: "billNo", toggleable: true },
  { header: "Bill Image", dataKey: "billImage", toggleable: true },
  { header: "Credit Note", dataKey: "creditNoteUrl", toggleable: true },
  { header: "Advance Details", dataKey: "advanceDetails", toggleable: true },
  { header: "Transporter Name", dataKey: "transporterName", toggleable: true },
  { header: "Vehicle No", dataKey: "vehicleNo", toggleable: true },
  { header: "Status", dataKey: "status", toggleable: true },
  { header: "Qty Diff Status", dataKey: "qtyDifferenceStatus", toggleable: true },
  { header: "Debit Amount", dataKey: "debitAmount", toggleable: true },
  { header: "Remarks", dataKey: "remarks", toggleable: true },
];

// Searchable Select Component
const SearchableSelect = ({
  value,
  onValueChange,
  options,
  placeholder,
  className
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
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
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
          <div className="sticky top-0 bg-white dark:bg-zinc-900 p-2 border-b dark:border-zinc-800">
            <Input
              type="text"
              placeholder={`Search ${placeholder.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-7 text-xs"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="py-1">
            <div
              className={`px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800/60 ${value === "all" ? "bg-green-50 dark:bg-emerald-500/10" : ""}`}
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
                className={`px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800/60 ${value === option ? "bg-green-50 dark:bg-emerald-500/10" : ""}`}
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
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
};

export default function DebitNote() {
  const location = useLocation();
  const navigate = useNavigate();
  const processedReAuditRef = useRef(false);
  const { user, isSuperAdmin: isSuperAdminContext } = useContext(AuthContext);
  const isSuperAdmin = !!(isSuperAdminContext || user?.isSuperAdmin);
  const [superAdminEditItem, setSuperAdminEditItem] = useState(null);
  const [mismatchData, setMismatchData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [debitAmount, setDebitAmount] = useState("");
  const [debitImageFile, setDebitImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  const [filters, setFilters] = useState({
    firmName: "all",
    partyName: "all",
    productName: "all",
    transporterName: "all",
    status: "all"
  });

  // Format timestamp function for ISO timestamps from Supabase
  const formatTimestamp = (timestampStr) => {
    if (!timestampStr) {
      return "N/A";
    }

    try {
      const d = new Date(timestampStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        });
      }
    } catch (e) {
      // Ignore parse error
    }

    return "N/A";
  };

  // Categorize data into pending and history — the backend already decides
  // this (mirrors the old Planned/Actual-timestamp based split), we just
  // read the `_stage` tag applied when fetched.
  const categorizeData = useCallback((data) => {
    return {
      pending: data.filter((item) => item._stage === "pending"),
      history: data.filter((item) => item._stage === "history"),
    };
  }, []);

  // Fetch data from the backend (coordinated mismatches awaiting a debit
  // note + manual purchase returns needing one, plus finalized debit notes)
  const fetchMismatchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/purchase/debit-note/data`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to load debit note data");

      const pendingRows = (json.data.pending || []).map((row) => ({
        ...row,
        _stage: "pending",
        supabaseId: row.isManualReturn ? row.returnId : row.id,
        timestamp: formatTimestamp(row.timestamp),
        _rawTimestamp: row.timestamp,
        firmName: normalizeFirmName(row.firmName) || "",
        remarks: row.remarks || "",
        advanceAmount: row.advanceAmount || row.toBePaidAmount || "",
        advanceDetails: row.advanceDetails || (row.advanceAmount ? `₹${row.advanceAmount}` : ""),
        debitAmount: "",
        debitNoteUrl: "",
        isFromReAudit: row.actionType === "Make Debit Note (Re-Audit)",
      }));

      const historyRows = (json.data.history || []).map((row) => ({
        ...row,
        _stage: "history",
        timestamp: formatTimestamp(row.timestamp),
        _rawTimestamp: row.timestamp,
        firmName: normalizeFirmName(row.firmName) || "",
        remarks: row.remarks || "",
        advanceAmount: row.advanceAmount || row.debitAmount || "",
        advanceDetails: row.advanceDetails || (row.advanceAmount ? `₹${row.advanceAmount}` : ""),
      }));

      const allMergedData = [...pendingRows, ...historyRows];

      const filteredData = allMergedData.filter(
        (item) => canViewFirm(user?.firmName, item.firmName)
      );

      setMismatchData(filteredData);
    } catch (error) {
      console.error("Error fetching debit note data:", error);
      setError(`Failed to load debit note data: ${error.message}`);
      setMismatchData([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch data on component mount
  useEffect(() => {
    fetchMismatchData();
  }, [fetchMismatchData]);

  // Auto-inject and open edit modal for Re-Audit item
  useEffect(() => {
    if (!loading && location.state?.fromReAudit && location.state?.reauditRow && !processedReAuditRef.current) {
      processedReAuditRef.current = true;
      const reauditRow = location.state.reauditRow;
      const existingItem = mismatchData.find(item => item.supabaseId === reauditRow.supabaseId || (item.liftId && item.liftId === reauditRow.liftNumber));
      
      let targetItem = existingItem;
      if (!existingItem) {
        targetItem = {
          id: `REAUDIT-${reauditRow.supabaseId || Date.now()}`,
          supabaseId: reauditRow.supabaseId,
          timestamp: reauditRow.timestamp || "",
          liftId: reauditRow.liftNumber || reauditRow.liftId || "",
          indentNo: reauditRow.indentNumber || reauditRow.indentNo || "",
          firmName: reauditRow.firmName || "",
          partyName: reauditRow.partyName || "",
          productName: reauditRow.productName || "",
          transporterName: reauditRow.transporterName || "",
          status: "Pending",
          debitAmount: reauditRow.debitAmount || "",
          debitNoteUrl: reauditRow.debitNoteUrl || "",
          remarks: reauditRow.remarks || `Qty Diff Status: ${reauditRow.qtyDifferenceStatus || '0.000'}`,
          qtyDifferenceStatus: reauditRow.qtyDifferenceStatus || "",
          isFromReAudit: true
        };
        setMismatchData(prev => [targetItem, ...prev]);
      } else {
        existingItem.isFromReAudit = true;
        existingItem.qtyDifferenceStatus = reauditRow.qtyDifferenceStatus || existingItem.qtyDifferenceStatus || "";
      }
      
      if (targetItem) {
        setEditingRow(targetItem.id);
        setRemarks(targetItem.remarks || `Qty Diff Status: ${reauditRow.qtyDifferenceStatus || '0.000'}`);
        setDebitAmount(targetItem.debitAmount || "");
        setDebitImageFile(null);
      }
    }
  }, [loading, location.state, mismatchData]);

  // Categorize data
  const { pending, history } = useMemo(() => {
    return categorizeData(mismatchData);
  }, [mismatchData, categorizeData]);

  // Get data for active tab
  const getActiveTabData = useCallback(() => {
    if (activeTab === "pending") {
      return pending;
    } else {
      return history;
    }
  }, [activeTab, pending, history]);

  // Generate filter options based on active tab data
  const uniqueFilterOptions = useMemo(() => {
    const activeData = getActiveTabData();
    const firms = new Set();
    const parties = new Set();
    const products = new Set();
    const transporters = new Set();
    const statuses = new Set();

    activeData.forEach((item) => {
      if (item.firmName) firms.add(item.firmName);
      if (item.partyName) parties.add(item.partyName);
      if (item.productName) products.add(item.productName);
      if (item.transporterName) transporters.add(item.transporterName);
      if (item.status) statuses.add(item.status);
    });

    return {
      firmName: [...firms].sort(),
      partyName: [...parties].sort(),
      productName: [...products].sort(),
      transporterName: [...transporters].sort(),
      status: [...statuses].sort(),
    };
  }, [getActiveTabData]);

  // Apply filters to active tab data
  const filteredData = useMemo(() => {
    let filtered = getActiveTabData();

    if (filters.firmName !== "all") {
      filtered = filtered.filter((item) => item.firmName === filters.firmName);
    }
    if (filters.partyName !== "all") {
      filtered = filtered.filter((item) => item.partyName === filters.partyName);
    }
    if (filters.productName !== "all") {
      filtered = filtered.filter((item) => item.productName === filters.productName);
    }
    if (filters.transporterName !== "all") {
      filtered = filtered.filter((item) => item.transporterName === filters.transporterName);
    }
    if (filters.status !== "all") {
      filtered = filtered.filter((item) => item.status === filters.status);
    }

    return filtered;
  }, [getActiveTabData, filters]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearAllFilters = () => {
    setFilters({
      firmName: "all",
      partyName: "all",
      productName: "all",
      transporterName: "all",
      status: "all",
    });
  };

  // Handle edit click
  const handleEditClick = (item) => {
    setEditingRow(item.id);
    setRemarks(item.remarks || "");
    setDebitAmount(item.debitAmount || "");
    setDebitImageFile(null);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingRow(null);
    setRemarks("");
    setDebitAmount("");
    setDebitImageFile(null);
  };

  // Submit remarks and update actual timestamp in Supabase
  const handleSubmitRemarks = async () => {
    if (!editingRow) return;

    // Find the item being edited
    const editingItem = mismatchData.find(item => item.id === editingRow);
    if (!editingItem) {
      toast.error("Item not found");
      return;
    }

    if (!remarks.trim() || !debitAmount) {
      toast.error("Please provide remarks and a Debit Amount.");
      return;
    }

    setSubmitting(true);

    try {
      let publicUrl = editingItem.debitNoteUrl || null;

      if (debitImageFile) {
        const { url } = await uploadFileToStorage(debitImageFile, "image", "debit-notes");
        publicUrl = url;
      }

      const res = await fetch(`${API_URL}/purchase/debit-note/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          mismatchId: editingItem.isManualReturn ? null : editingItem.supabaseId,
          returnId: editingItem.isManualReturn ? editingItem.supabaseId : null,
          debitAmount: debitAmount ? parseFloat(debitAmount) : null,
          debitNoteUrl: publicUrl,
          remarks: remarks.trim(),
          purchaseReturnNo: editingItem.purchaseReturnNo || null,
          createdBy: user?.username || "Admin",
          liftId: editingItem.liftId || null,
          firmName: editingItem.firmName || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to submit remarks");

      toast.success(`✅ Remarks submitted successfully for ${editingItem.liftId}!`);
      handleCancelEdit();

      // Refresh data from Supabase to update counts
      await fetchMismatchData();

      if (location.state?.fromReAudit || editingItem.isFromReAudit) {
        toast.success("Returning to Re-Audit page...");
        setTimeout(() => {
          navigate('/accounts-audit', { state: { returnToTab: 'REAUDIT', openRowId: editingItem.supabaseId || editingItem.id } });
        }, 1200);
      }

    } catch (error) {
      console.error("Error submitting remarks:", error);
      toast.error(`❌ Failed to submit remarks: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Render status badge
  const renderStatusBadge = (status) => {
    const statusLower = (status || "").toLowerCase();

    if (statusLower.includes("credit") || statusLower.includes("note")) {
      return <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30">Credit Note</Badge>;
    } else if (statusLower.includes("pending")) {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30">Pending</Badge>;
    } else if (statusLower.includes("done") || statusLower.includes("completed")) {
      return <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30">Completed</Badge>;
    } else {
      return <Badge variant="outline">{status || "N/A"}</Badge>;
    }
  };

  // Render cell content
  const renderCell = (item, column) => {
    const value = item[column.dataKey];

    if (column.dataKey === "status") {
      return renderStatusBadge(value);
    }

    if (column.dataKey === "qtyDifferenceStatus") {
      return value ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-extrabold bg-red-100 text-red-800 border border-red-300 shadow-2xs dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30">
          {value}
        </span>
      ) : (
        <span className="text-gray-400 dark:text-zinc-500 text-xs">-</span>
      );
    }

    if (column.dataKey === "qty") {
      const qtyVal = item.qty;
      return qtyVal !== "" && qtyVal !== null && qtyVal !== undefined ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
          {qtyVal}
        </span>
      ) : (
        <span className="text-gray-400 dark:text-zinc-500 text-xs">-</span>
      );
    }

    if (column.dataKey === "productRate") {
      const rateVal = item.productRate;
      return rateVal !== "" && rateVal !== null && rateVal !== undefined ? (
        <span className="font-semibold text-indigo-700">₹{rateVal}</span>
      ) : (
        <span className="text-gray-400 dark:text-zinc-500 text-xs">-</span>
      );
    }

    if (column.dataKey === "billNo") {
      return item.billNo ? (
        <span className="text-xs font-medium text-gray-800">{item.billNo}</span>
      ) : (
        <span className="text-gray-400 dark:text-zinc-500 text-xs">-</span>
      );
    }

    if (column.dataKey === "billImage") {
      return item.billImage ? (
        <a
          href={String(item.billImage).startsWith("http") ? item.billImage : `https://${item.billImage}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-semibold hover:bg-blue-100 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          View Bill
        </a>
      ) : (
        <span className="text-gray-400 dark:text-zinc-500 text-xs">-</span>
      );
    }

    if (column.dataKey === "creditNoteUrl") {
      return item.creditNoteUrl ? (
        <a
          href={item.creditNoteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded text-xs font-semibold hover:bg-green-100 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          View
        </a>
      ) : (
        <span className="text-gray-400 dark:text-zinc-500 text-xs">-</span>
      );
    }

    if (column.dataKey === "advanceDetails" || column.dataKey === "advanceAmount") {
      const adv = item.advanceDetails || (item.advanceAmount ? `₹${item.advanceAmount}` : "");
      return adv ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800">
          {adv}
        </span>
      ) : (
        <span className="text-gray-400 dark:text-zinc-500 text-xs">-</span>
      );
    }

    if (column.dataKey === "debitAmount") {
      return value ? <span className="font-semibold text-red-600">₹{value}</span> : <span className="text-gray-400 dark:text-zinc-500 text-xs">N/A</span>;
    }

    if (column.dataKey === "debitNoteUrl") {
      return value ? (
        <a
          href={String(value).startsWith("http") ? value : `https://${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#2fa36b] hover:text-green-800 hover:underline inline-flex items-center text-xs whitespace-nowrap"
        >
          <ExternalLink className="h-3 w-3 mr-1" /> View Image
        </a>
      ) : (
        <span className="text-gray-400 dark:text-zinc-500 text-xs">N/A</span>
      );
    }

    if (column.dataKey === "actions") {
      if (activeTab === "history") {
        return (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-gray-50">
              Completed
            </Badge>
            {isSuperAdmin && (
              <button
                onClick={() => setSuperAdminEditItem(item)}
                className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-md hover:bg-purple-200 border border-purple-300"
              >
                <ShieldCheck className="h-3 w-3 mr-1" />
                Edit
              </button>
            )}
          </div>
        );
      }

      if (editingRow === item.id) {
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancelEdit}
              disabled={submitting}
              className="h-7 px-2"
            >
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitRemarks}
              disabled={submitting}
              className="h-7 px-2"
            >
              {submitting ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Save className="h-3 w-3 mr-1" />
              )}
              Save
            </Button>
          </div>
        );
      }

      return (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleEditClick(item)}
            className="h-7 px-2"
          >
            <Edit className="h-3 w-3 mr-1" />
            Make Debit Note
          </Button>
          {isSuperAdmin && (
            <button
              onClick={() => setSuperAdminEditItem(item)}
              className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-md hover:bg-purple-200 border border-purple-300"
            >
              <ShieldCheck className="h-3 w-3 mr-1" />
              Edit
            </button>
          )}
        </div>
      );
    }

    return value || <span className="text-gray-400 dark:text-zinc-500 text-xs">N/A</span>;
  };

  // Render edit modal
  const renderEditModal = () => {
    if (!editingRow) return null;

    const editingItem = mismatchData.find(item => item.id === editingRow);
    if (!editingItem) return null;

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="px-6 py-5 bg-gray-50 flex justify-between items-center">
            <CardTitle className="font-semibold text-lg text-gray-800">
            
            Debit Note
          </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancelEdit}
              className="text-gray-400 hover:text-gray-600"
              disabled={submitting}
            >
              <X className="h-5 w-5" />
            </Button>
          </CardHeader>

          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Lift ID</Label>
                  <div className="p-2 bg-gray-50 rounded border text-sm">{editingItem.liftId}</div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Indent Number</Label>
                  <div className="p-2 bg-gray-50 rounded border text-sm">{editingItem.indentNo}</div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Party Name</Label>
                  <div className="p-2 bg-gray-50 rounded border text-sm">{editingItem.partyName}</div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Product</Label>
                  <div className="p-2 bg-gray-50 rounded border text-sm">{editingItem.productName}</div>
                </div>
                {editingItem.advanceDetails && (
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm font-medium text-amber-800 dark:text-amber-300">Advance Details</Label>
                    <div className="p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded text-sm font-semibold text-amber-900 dark:text-amber-200">
                      {editingItem.advanceDetails}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {editingItem?.qtyDifferenceStatus && (
                  <div className="md:col-span-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
                    <span className="text-xs font-bold text-red-800">Creating Debit Note for Qty Diff Status</span>
                    <span className="px-2.5 py-1 bg-red-600 text-white font-extrabold rounded text-xs shadow-2xs">
                      Qty Diff: {editingItem.qtyDifferenceStatus}
                    </span>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Debit Amount <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    placeholder="Enter Debit Amount"
                    value={debitAmount}
                    onChange={(e) => setDebitAmount(e.target.value)}
                    className="bg-white text-gray-800 font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Debit Image (Optional)</Label>
                  <Input
                    type="file"
                    accept="image/*,application/pdf,.pdf"
                    onChange={(e) => setDebitImageFile(e.target.files[0] || null)}
                    disabled={submitting}
                    className="cursor-pointer file:cursor-pointer file:bg-green-50 file:text-[#268a59] file:border-0 file:rounded-md file:px-2 file:py-1 file:mr-2 file:text-xs hover:file:bg-green-100"
                  />
                  {editingItem.debitNoteUrl && !debitImageFile && (
                    <div className="text-xs text-[#2fa36b] flex items-center mt-1">
                      <CheckCircle className="h-3 w-3 mr-1" /> Image uploaded previously
                    </div>
                  )}
                </div>
              </div>


              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Remarks <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter your remarks here..."
                  className="min-h-[100px] resize-none"
                  disabled={submitting}
                />
                <p className="text-xs text-gray-500">
                  Note: Submitting remarks will automatically set the actual timestamp.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitRemarks}
                  disabled={submitting || !remarks.trim() || !debitAmount || (!debitImageFile && !editingItem?.debitNoteUrl)}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Submit Remarks
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
      {renderEditModal()}
      {superAdminEditItem && (
        <SuperAdminEditModal
          title={`Edit ${superAdminEditItem.isManualReturn ? "Purchase Return" : superAdminEditItem._stage === "history" ? "Debit Note" : "Mismatch"} Record — ${superAdminEditItem.liftId || superAdminEditItem.supabaseId}`}
          apiUrl={
            superAdminEditItem.isManualReturn
              ? `${API_URL}/purchase/purchase-return/update/${superAdminEditItem.supabaseId}`
              : superAdminEditItem._stage === "history"
                ? `${API_URL}/purchase/debit-note/update/${superAdminEditItem.id}`
                : `${API_URL}/purchase/mismatch/update/${superAdminEditItem.supabaseId}`
          }
          fields={
            superAdminEditItem.isManualReturn ? [
              { label: "Purchase Return No.", dbKey: "purchaseReturnNo", value: superAdminEditItem.purchaseReturnNo, type: "text" },
              { label: "Lift No", dbKey: "liftNo", value: superAdminEditItem.liftId, type: "text" },
              { label: "PO No.", dbKey: "poNo", value: superAdminEditItem.indentNo, type: "text" },
              { label: "Firm Name", dbKey: "firmName", value: superAdminEditItem.firmName, type: "text" },
              { label: "Party Name", dbKey: "partyName", value: superAdminEditItem.partyName, type: "text" },
              { label: "Product Name", dbKey: "productName", value: superAdminEditItem.productName, type: "text" },
              { label: "Return This Time", dbKey: "returnThisTime", value: superAdminEditItem.returnThisTime, type: "number" },
              { label: "Total Return Qty", dbKey: "totalReturnQty", value: superAdminEditItem.totalReturnQty, type: "number" },
              { label: "Product Rate", dbKey: "productRate", value: superAdminEditItem.productRate, type: "number" },
              { label: "Bill No", dbKey: "billNo", value: superAdminEditItem.billNo, type: "text" },
              { label: "Bill Image URL", dbKey: "billImage", value: superAdminEditItem.billImage, type: "text" },
              { label: "Credit Note URL", dbKey: "creditNoteUrl", value: superAdminEditItem.creditNoteUrl, type: "text" },
              { label: "Transporter Name", dbKey: "transport", value: superAdminEditItem.transporterName, type: "text" },
              { label: "Vehicle No", dbKey: "vehicleNo", value: superAdminEditItem.vehicleNo, type: "text" },
              { label: "Return Reason", dbKey: "returnReason", value: superAdminEditItem.remarks, type: "textarea" },
            ] : superAdminEditItem._stage === "history" ? [
              { label: "Firm Name", dbKey: "firmName", value: superAdminEditItem.firmName, type: "text" },
              { label: "Party Name", dbKey: "partyName", value: superAdminEditItem.partyName, type: "text" },
              { label: "Product Name", dbKey: "productName", value: superAdminEditItem.productName, type: "text" },
              { label: "Qty", dbKey: "qty", value: superAdminEditItem.qty, type: "number" },
              { label: "Status", dbKey: "status", value: superAdminEditItem.status, type: "text" },
              { label: "Purchase Return No.", dbKey: "purchaseReturnNo", value: superAdminEditItem.purchaseReturnNo, type: "text" },
              { label: "Debit Amount", dbKey: "debitAmount", value: superAdminEditItem.debitAmount, type: "number" },
              { label: "Debit Image URL", dbKey: "debitNoteUrl", value: superAdminEditItem.debitNoteUrl, type: "text" },
              { label: "Remarks", dbKey: "remark", value: superAdminEditItem.remarks, type: "textarea" },
            ] : [
              { label: "Firm Name", dbKey: "firmName", value: superAdminEditItem.firmName, type: "text" },
              { label: "Party Name", dbKey: "partyName", value: superAdminEditItem.partyName, type: "text" },
              { label: "Product Name", dbKey: "productName", value: superAdminEditItem.productName, type: "text" },
              { label: "Qty", dbKey: "qty", value: superAdminEditItem.qty, type: "number" },
              { label: "Product Rate", dbKey: "rate", value: superAdminEditItem.productRate, type: "number" },
              { label: "Bill No", dbKey: "billNo", value: superAdminEditItem.billNo, type: "text" },
              { label: "Bill Image URL", dbKey: "billImage", value: superAdminEditItem.billImage, type: "text" },
              { label: "Transporter Name", dbKey: "transporterName", value: superAdminEditItem.transporterName, type: "text" },
              { label: "Vehicle No", dbKey: "truckNo", value: superAdminEditItem.vehicleNo, type: "text" },
              { label: "Qty Diff Status", dbKey: "qtyDiffStatus", value: superAdminEditItem.qtyDifferenceStatus || "", type: "text" },
              { label: "Remarks", dbKey: "remarks", value: superAdminEditItem.remarks, type: "textarea" },
            ]
          }
          onClose={() => setSuperAdminEditItem(null)}
          onSaved={() => { setSuperAdminEditItem(null); fetchMismatchData(); }}
        />
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        <Card className="">
          <CardHeader className="p-4">
            <CardTitle className="flex items-center gap-2 text-gray-700 text-lg">
              <FileText className="h-5 w-5 text-[#2fa36b]" /> Debit Note Management
            </CardTitle>
            
          </CardHeader>

          <CardContent className="p-4">
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                <TabsTrigger value="pending" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Pending
                  <Badge variant="outline" className="ml-2">
                    {pending.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  History
                  <Badge variant="outline" className="ml-2">
                    {history.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              {/* Filters Section - Only for pending tab */}
              {activeTab === "pending" && (
                <TabsContent value="pending" className="space-y-4">
                  <div className="mb-4 p-4 bg-green-50/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Filter className="h-4 w-4 text-gray-500" />
                      <Label className="text-sm font-medium">Filters</Label>
                      <Button variant="outline" size="sm" onClick={clearAllFilters} className="ml-auto bg-white">
                        Clear All
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      <div>
                        <Label className="text-xs mb-1 block">Firm Name</Label>
                        <SearchableSelect
                          value={filters.firmName}
                          onValueChange={(value) => handleFilterChange("firmName", value)}
                          options={["all", ...uniqueFilterOptions.firmName]}
                          placeholder="Firms"
                          className="h-9"
                        />
                      </div>

                      <div>
                        <Label className="text-xs mb-1 block">Party Name</Label>
                        <SearchableSelect
                          value={filters.partyName}
                          onValueChange={(value) => handleFilterChange("partyName", value)}
                          options={["all", ...uniqueFilterOptions.partyName]}
                          placeholder="Parties"
                          className="h-9"
                        />
                      </div>

                      <div>
                        <Label className="text-xs mb-1 block">Product Name</Label>
                        <SearchableSelect
                          value={filters.productName}
                          onValueChange={(value) => handleFilterChange("productName", value)}
                          options={["all", ...uniqueFilterOptions.productName]}
                          placeholder="Products"
                          className="h-9"
                        />
                      </div>

                      <div>
                        <Label className="text-xs mb-1 block">Transporter</Label>
                        <SearchableSelect
                          value={filters.transporterName}
                          onValueChange={(value) => handleFilterChange("transporterName", value)}
                          options={["all", ...uniqueFilterOptions.transporterName]}
                          placeholder="Transporters"
                          className="h-9"
                        />
                      </div>

                      <div>
                        <Label className="text-xs mb-1 block">Status</Label>
                        <SearchableSelect
                          value={filters.status}
                          onValueChange={(value) => handleFilterChange("status", value)}
                          options={["all", ...uniqueFilterOptions.status]}
                          placeholder="Statuses"
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Data Table */}
                  <Card className="">
                    <CardHeader className="py-3 px-4 bg-gray-50">
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle className="flex items-center text-sm font-semibold text-foreground">
                            <Clock className="h-4 w-4 text-yellow-600 mr-2" />
                            Pending Entries ({filteredData.length})
                          </CardTitle>
                          
                        </div>
                        <Button
                          onClick={fetchMismatchData}
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs bg-white"
                        >
                          <Loader2 className="mr-1.5 h-3.5 w-3.5" />
                          Refresh
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="p-0">
                      {loading ? (
                        <div className="flex flex-col justify-center items-center py-10">
                          <Loader2 className="h-8 w-8 text-[#2fa36b] animate-spin mb-3" />
                          <p className="text-muted-foreground">Loading debit note data...</p>
                        </div>
                      ) : error && filteredData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-destructive-foreground bg-destructive/10 rounded-lg mx-4 my-4 text-center">
                          <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
                          <p className="font-medium text-destructive">Error Loading Data</p>
                          <p className="text-sm text-muted-foreground max-w-md">{error}</p>
                          <Button onClick={fetchMismatchData} variant="outline" className="mt-4">
                            Retry Loading
                          </Button>
                        </div>
                      ) : filteredData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-yellow-200/50 bg-yellow-50/50 rounded-lg mx-4 my-4 text-center">
                          <CheckCircle className="h-12 w-12 text-yellow-500 mb-3" />
                          <p className="font-medium text-foreground">No Pending Entries</p>
                          <p className="text-sm text-muted-foreground text-center">
                            All pending entries have been processed. Check the History tab.
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-auto max-h-[calc(100vh-320px)] min-h-[450px] relative custom-scrollbar rounded-b-lg">
                          <table className="w-full text-sm border-collapse">
                            <thead className="sticky top-0 z-30">
                              <tr className="bg-yellow-50 border-b border-yellow-200">
                                {DEBIT_NOTE_COLUMNS_META.filter(col => col.dataKey !== "status").map((col) => (
                                  <th
                                    key={col.dataKey}
                                    className={`px-3 py-3 text-xs font-bold text-yellow-800 uppercase text-left bg-yellow-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap ${col.dataKey === "actions" ? "w-[150px]" : ""}`}
                                  >
                                    {col.header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                              {filteredData.map((item) => (
                                <tr
                                  key={item.id}
                                  className={`hover:bg-yellow-50/50 transition-colors border-b border-gray-100 ${editingRow === item.id ? "bg-yellow-100 ring-1 ring-yellow-300" : ""}`}
                                >
                                  {DEBIT_NOTE_COLUMNS_META.filter(col => col.dataKey !== "status").map((column) => (
                                    <td
                                      key={`${item.id}-${column.dataKey}`}
                                      className={`text-xs px-3 py-2 ${column.dataKey === "actions" ? "w-[150px]" : ""}`}
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
                </TabsContent>
              )}

              {/* History Tab */}
              <TabsContent value="history" className="space-y-4">
                <Card className="">
                  <CardHeader className="py-3 px-4 bg-gray-50">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="flex items-center text-sm font-semibold text-foreground">
                          <History className="h-4 w-4 text-[#2fa36b] mr-2" />
                          History Entries ({history.length})
                        </CardTitle>
                        
                      </div>
                      <Button
                        onClick={fetchMismatchData}
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs bg-white"
                      >
                        <Loader2 className="mr-1.5 h-3.5 w-3.5" />
                        Refresh
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0">
                    {loading ? (
                      <div className="flex flex-col justify-center items-center py-10">
                        <Loader2 className="h-8 w-8 text-[#2fa36b] animate-spin mb-3" />
                        <p className="text-muted-foreground">Loading history data...</p>
                      </div>
                    ) : error && history.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-destructive-foreground bg-destructive/10 rounded-lg mx-4 my-4 text-center">
                        <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
                        <p className="font-medium text-destructive">Error Loading Data</p>
                        <p className="text-sm text-muted-foreground max-w-md">{error}</p>
                        <Button onClick={fetchMismatchData} variant="outline" className="mt-4">
                          Retry Loading
                        </Button>
                      </div>
                    ) : history.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-green-200/50 bg-green-50/50 rounded-lg mx-4 my-4 text-center">
                        <History className="h-12 w-12 text-green-500 mb-3" />
                        <p className="font-medium text-foreground">No History Entries</p>
                        <p className="text-sm text-muted-foreground text-center">
                          No entries have been processed yet. Check the Pending tab.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-auto max-h-[calc(100vh-320px)] min-h-[450px] relative custom-scrollbar rounded-b-lg">
                        <table className="w-full text-sm border-collapse">
                          <thead className="sticky top-0 z-30">
                            <tr className="bg-green-50 border-b border-green-200">
                              {DEBIT_NOTE_COLUMNS_META.map((col) => (
                                <th
                                  key={col.dataKey}
                                  className={`px-3 py-3 text-xs font-bold text-green-800 uppercase text-left bg-green-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap ${col.dataKey === "actions" ? "w-[150px]" : ""}`}
                                >
                                  {col.header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-100">
                            {history.map((item) => (
                              <tr
                                key={item.id}
                                className="hover:bg-green-50/50 transition-colors border-b border-gray-100"
                              >
                                {DEBIT_NOTE_COLUMNS_META.map((column) => (
                                  <td
                                    key={`${item.id}-${column.dataKey}`}
                                    className={`text-xs px-3 py-2 ${column.dataKey === "actions" ? "w-[150px]" : ""}`}
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
              </TabsContent>
            </Tabs>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
