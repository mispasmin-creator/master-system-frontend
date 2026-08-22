"use client";

import { useState, useEffect, useCallback, useMemo, useContext, useRef } from "react";
import { Receipt, FileText, Loader2, Upload, X, History, FileCheck, AlertTriangle, Info, ExternalLink, Filter, ShieldCheck, Edit2, Download, Undo2 } from "lucide-react";
import { MixerHorizontalIcon } from "@radix-ui/react-icons";

// Shadcn UI components
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AuthContext } from "../context/AuthContext";
import { API_URL, getToken } from "@/lib/auth";
import SuperAdminEditModal from "./SuperAdminEditModal";
import { uploadFileToStorage } from "../utils/storageUtils";
import { useRealtime } from "../hooks/useRealtime";

// --- Column Definitions for Tables ---
const PENDING_BILTY_COLUMNS_META = [
  { header: "Actions", dataKey: "actionColumn", toggleable: false, alwaysVisible: true },
  { header: "Lift ID", dataKey: "id", toggleable: true, alwaysVisible: true },
  { header: "Planned Date", dataKey: "planned3", toggleable: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
  { header: "Vendor Name", dataKey: "vendorName", toggleable: true },
  { header: "Product Name", dataKey: "rawMaterialName", toggleable: true },
  { header: "Lift Type", dataKey: "liftType", toggleable: true },
  { header: "Indent No.", dataKey: "indentNo", toggleable: true },
  { header: "Bill No.", dataKey: "billNo", toggleable: true },
  { header: "Date Of Bill", dataKey: "dateOfBill", toggleable: true },
  { header: "Truck Number", dataKey: "truckNo", toggleable: true },
  { header: "Driver No.", dataKey: "driverNo", toggleable: true },
  { header: "Transporter Name", dataKey: "transporterName", toggleable: true },
  { header: "Type Of Transporting Rate", dataKey: "rateType", toggleable: true },
  { header: "Transporting Per MT Rate", dataKey: "transportingRate", toggleable: true },
  { header: "Bill Copy", dataKey: "billImage", isLink: true, linkText: "View Bill", toggleable: true },
  { header: "PO Copy", dataKey: "poCopy", isLink: true, linkText: "View PO", toggleable: true },
  { header: "PO Rate", dataKey: "poRate", toggleable: true },
  { header: "Original Qty", dataKey: "originalQty", toggleable: true },
  { header: "Total Bill Qty", dataKey: "totalBillQuantity", toggleable: true },
  { header: "Actual Qty", dataKey: "actualQty", toggleable: true },
];

const BILTY_HISTORY_COLUMNS_META = [
  { header: "Lift ID", dataKey: "id", toggleable: true, alwaysVisible: true },
  { header: "Timestamp", dataKey: "timestamp", toggleable: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
  { header: "Vendor Name", dataKey: "vendorName", toggleable: true },
  { header: "Product Name", dataKey: "rawMaterialName", toggleable: true },
  { header: "Lift Type", dataKey: "liftType", toggleable: true },
  { header: "Indent No.", dataKey: "indentNo", toggleable: true },
  { header: "Bill No.", dataKey: "billNo", toggleable: true },
  { header: "Date Of Bill", dataKey: "dateOfBill", toggleable: true },
  { header: "Truck Number", dataKey: "truckNo", toggleable: true },
  { header: "Driver No.", dataKey: "driverNo", toggleable: true },
  { header: "Transporter Name", dataKey: "transporterName", toggleable: true },
  { header: "Type Of Transporting Rate", dataKey: "rateType", toggleable: true },
  { header: "Transporting Per MT Rate", dataKey: "transportingRate", toggleable: true },
  { header: "Bill Copy", dataKey: "billImage", isLink: true, linkText: "View Bill", toggleable: true },
  { header: "PO Copy", dataKey: "poCopy", isLink: true, linkText: "View PO", toggleable: true },
  { header: "PO Rate", dataKey: "poRate", toggleable: true },
  { header: "Original Qty", dataKey: "originalQty", toggleable: true },
  { header: "Total Bill Qty", dataKey: "totalBillQuantity", toggleable: true },
  { header: "Actual Qty", dataKey: "actualQty", toggleable: true },
  { header: "Bilty Number", dataKey: "biltyNumber", toggleable: true },
  { header: "Bilty Image", dataKey: "biltyImageUrl", isLink: true, linkText: "View Bilty", toggleable: true },
];

export default function BiltyPage() {
  const { user, isSuperAdmin } = useContext(AuthContext);
  const fetchInFlightRef = useRef(false);
  const lastFetchAtRef = useRef(0);
  const [superAdminEditLift, setSuperAdminEditLift] = useState(null);
  const [liftData, setLiftData] = useState([]);
  const [selectedLift, setSelectedLift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    biltyNumber: "",
    biltyImageFile: null,
  });
  const [formErrors, setFormErrors] = useState({});

  const [activeTab, setActiveTab] = useState("pendingBilty");
  const [visiblePendingColumns, setVisiblePendingColumns] = useState({});
  const [visibleHistoryColumns, setVisibleHistoryColumns] = useState({});
  const firmNameFilterKey = useMemo(() => JSON.stringify(user?.firmName ?? null), [user?.firmName]);
  const firmNameFilter = useMemo(() => {
    try {
      return JSON.parse(firmNameFilterKey);
    } catch {
      return null;
    }
  }, [firmNameFilterKey]);

  // Filter State
  const [filters, setFilters] = useState({
    vendorName: "all",
    materialName: "all",
    liftType: "all",
    orderNumber: "all",
    firmName: "all",
  });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearAllFilters = () => {
    setFilters({
      vendorName: "all",
      materialName: "all",
      liftType: "all",
      orderNumber: "all",
      firmName: "all",
    });
  };

  useEffect(() => {
    const initializeVisibility = (columnsMeta) => {
      const visibility = {};
      columnsMeta.forEach(col => {
        visibility[col.dataKey] = col.alwaysVisible || col.toggleable;
      });
      return visibility;
    };
    setVisiblePendingColumns(initializeVisibility(PENDING_BILTY_COLUMNS_META));
    setVisibleHistoryColumns(initializeVisibility(BILTY_HISTORY_COLUMNS_META));
  }, []);

  const fetchLiftData = useCallback(async ({ showLoader = true, force = false } = {}) => {
    if (fetchInFlightRef.current && !force) return;
    if (!force && Date.now() - lastFetchAtRef.current < 5000) return;
    fetchInFlightRef.current = true;
    if (showLoader) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/purchase/bilty/data`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to fetch bilty data");

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
        liftingQty: l.liftingQty || '', billNo: l.billNo || '', dateOfBill: '',
        areaLifting: l.areaLifting || '', truckNo: l.truckNo || '', transporterName: l.transporterName || '',
        rateType: '', transportingRate: '', poRate: '', originalQty: '', totalBillQuantity: '',
        actualQty: '', biltyNumber: l.biltyNo || '', biltyImageUrl: l.biltyImage || '',
        poCopy: '', billImage: '', driverNo: '',
        isPending: true, isHistory: false,
      }));

      const historyMapped = (json.data.history || []).map((l) => ({
        _dbId: l.id,
        id: l.liftNo || String(l.id), liftNo: l.liftNo || '', indentNo: l.indentNo || '',
        firmName: l.firmName || '', vendorName: l.vendorName || '', rawMaterialName: l.rawMaterialName || '',
        liftingQty: l.liftingQty || '', billNo: l.billNo || '', dateOfBill: '',
        areaLifting: l.areaLifting || '', truckNo: l.truckNo || '', transporterName: l.transporterName || '',
        rateType: '', transportingRate: '', poRate: '', originalQty: '', totalBillQuantity: '',
        actualQty: '', biltyNumber: l.savedBiltyNo || '', biltyImageUrl: l.savedBiltyImage || '',
        poCopy: '', billImage: '', driverNo: '', biltyId: l.biltyId,
        isPending: false, isHistory: true, timestamp: l.dateOfReceiving || new Date().toISOString()
      }));

      let processedRawRows = [...pendingMapped, ...historyMapped];
      if (firmNameFilter && String(firmNameFilter).toLowerCase() !== "all") {
        const userFirmNameLower = String(firmNameFilter).toLowerCase();
        processedRawRows = processedRawRows.filter(
          (lift) => lift.firmName && String(lift.firmName).toLowerCase() === userFirmNameLower,
        );
      }
      setLiftData(processedRawRows);
      lastFetchAtRef.current = Date.now();
    } catch (err) {
      console.error("Error fetching lift data:", err);
      setError(`Failed to load lifts data: ${err.message}`);
    } finally {
      fetchInFlightRef.current = false;
      setLoading(false);
    }
  }, [firmNameFilter]);
  useEffect(() => {
    fetchLiftData({ force: true });
  }, [fetchLiftData]);

  useRealtime(["LIFT-ACCOUNTS", "Mismatch"], () => {
    console.log("[Realtime] Bilty Page refreshing due to LIFT-ACCOUNTS/Mismatch table change");
    fetchLiftData({ showLoader: false });
  });

  const pendingBilty = useMemo(() => {
    let filtered = liftData.filter(lift => lift.isPending);
    if (filters.vendorName !== "all") filtered = filtered.filter(lift => lift.vendorName === filters.vendorName);
    if (filters.materialName !== "all") filtered = filtered.filter(lift => lift.rawMaterialName === filters.materialName);
    if (filters.liftType !== "all") filtered = filtered.filter(lift => lift.liftType === filters.liftType);
    if (filters.orderNumber !== "all") filtered = filtered.filter(lift => lift.indentNo === filters.orderNumber || lift.billNo === filters.orderNumber);
    if (filters.firmName !== "all") filtered = filtered.filter(lift => lift.firmName === filters.firmName);
    return filtered;
  }, [liftData, filters]);

  const biltyHistory = useMemo(() => {
    let filtered = liftData.filter(lift => lift.isHistory);
    if (filters.vendorName !== "all") filtered = filtered.filter(lift => lift.vendorName === filters.vendorName);
    if (filters.materialName !== "all") filtered = filtered.filter(lift => lift.rawMaterialName === filters.materialName);
    if (filters.liftType !== "all") filtered = filtered.filter(lift => lift.liftType === filters.liftType);
    if (filters.orderNumber !== "all") filtered = filtered.filter(lift => lift.indentNo === filters.orderNumber || lift.billNo === filters.orderNumber);
    if (filters.firmName !== "all") filtered = filtered.filter(lift => lift.firmName === filters.firmName);
    return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [liftData, filters]);

  const uniqueFilterOptions = useMemo(() => {
    const vendors = new Set();
    const materials = new Set();
    const types = new Set();
    const orders = new Set();

    liftData.forEach(lift => {
      if (lift.vendorName) vendors.add(lift.vendorName);
      if (lift.rawMaterialName) materials.add(lift.rawMaterialName);
      if (lift.liftType) types.add(lift.liftType);
      if (lift.indentNo) orders.add(lift.indentNo);
      if (lift.billNo) orders.add(lift.billNo);
    });

    return {
      vendorName: [...vendors].sort(),
      materialName: [...materials].sort(),
      liftType: [...types].sort(),
      orderNumber: [...orders].sort(),
      firmName: [...new Set(liftData.map(l => l.firmName).filter(Boolean))].sort(),
    };
  }, [liftData]);

  const handleLiftSelect = (lift) => {
    setSelectedLift(lift);
    setFormData({ biltyNumber: lift.biltyNumber || "", biltyImageFile: null });
    setFormErrors({});
    setShowPopup(true);
  };

  const handleRevert = async (liftId) => {
    try {
      toast.loading("Reverting bilty...", { id: "revert-bilty" });
      const res = await fetch(`${API_URL}/purchase/bilty/revert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ liftId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to revert");

      toast.success(data.message || "Bilty reverted successfully", {
        id: "revert-bilty",
      });
      fetchLiftsData();
    } catch (error) {
      toast.error("Revert Failed", {
        description: error.message,
        id: "revert-bilty",
      });
    }
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    setSelectedLift(null);
    setFormData({ biltyNumber: "", biltyImageFile: null });
    setFormErrors({});
  };

  const uploadFileToSupabase = async (file) => {
    if (!file || !(file instanceof File)) throw new Error("Invalid file provided.");
    try {
      const { url } = await uploadFileToStorage(file, 'image', 'bilty-images');
      return url;
    } catch (error) {
      console.error("Error uploading bilty image:", error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "biltyImageFile") {
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: null }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.biltyNumber.trim()) newErrors.biltyNumber = "Bilty Number is required.";
    if (!formData.biltyImageFile && !selectedLift?.biltyImageUrl) newErrors.biltyImageFile = "Bilty Image is required.";
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm() || !selectedLift) {
      toast.error("Validation Error", { description: "Please provide Bilty image." });
      return;
    }
    setIsSubmitting(true);
    toast.loading("Submitting bilty details...", { id: "bilty-submit" });

    try {
      let uploadedUrl = formData.biltyImageUrl || "";
      if (formData.biltyImageFile) {
        const { url } = await uploadFileToStorage(formData.biltyImageFile, "image", "bilty");
        uploadedUrl = url;
      }
      const res = await fetch(`${API_URL}/purchase/bilty/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          liftId: selectedLift._dbId,
          biltyNo: formData.biltyNumber || "",
          biltyImage: uploadedUrl,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to submit bilty");

      toast.success("Success!", { id: "bilty-submit", description: `Bilty for Lift ${selectedLift.liftNo || selectedLift.id} recorded successfully.` });
      fetchLiftData({ force: true });
      handleClosePopup();
    } catch (error) {
      console.error("Error submitting bilty form:", error);
      toast.error("Submission Failed", { id: "bilty-submit", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCell = (item, column) => {
    const value = item[column.dataKey];
    if (column.isLink) {
      return value ? (
        <a href={String(value).startsWith("http") ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" className="text-[#2fa36b] hover:text-green-800 hover:underline font-medium text-xs inline-flex items-center gap-1">
          <ExternalLink className="h-3 w-3" />{column.linkText || "View"}
        </a>
      ) : <span className="text-gray-400 text-xs">N/A</span>;
    }
    return value || <span className="text-xs text-gray-400">N/A</span>;
  };
  const handleToggleColumn = (tab, dataKey, checked) => {
    if (tab === "pending") {
      setVisiblePendingColumns(prev => ({ ...prev, [dataKey]: checked }));
    } else {
      setVisibleHistoryColumns(prev => ({ ...prev, [dataKey]: checked }));
    }
  };

  const handleSelectAllColumns = (tab, columnsMeta, checked) => {
    const newVisibility = {};
    columnsMeta.forEach(col => {
      if (col.toggleable && !col.alwaysVisible) newVisibility[col.dataKey] = checked;
    });
    if (tab === "pending") {
      setVisiblePendingColumns(prev => ({ ...prev, ...newVisibility }));
    } else {
      setVisibleHistoryColumns(prev => ({ ...prev, ...newVisibility }));
    }
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

  const renderTableSection = (tabKey, title, description, data, columnsMeta, visibilityState) => {
    return (
      <Card className="flex-1 flex flex-col">
        <CardHeader className="py-3 px-4 bg-muted/30">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center text-md font-semibold text-foreground">
            <FileCheck className="h-5 w-5 text-[#2fa36b] mr-2" />
            Bilty
          </CardTitle>
              
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => exportTableToCSV(`bilty-${tabKey}.csv`, columnsMeta, data, visibilityState)}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
              </Button>
              <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <MixerHorizontalIcon className="mr-1.5 h-3.5 w-3.5" /> View Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-3">
                <div className="grid gap-2">
                  <p className="text-sm font-medium">Toggle Columns</p>
                  <div className="flex items-center justify-between mt-1 mb-2">
                    <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => handleSelectAllColumns(tabKey === 'pendingBilty' ? 'pending' : 'history', columnsMeta, true)}>Select All</Button>
                    <span className="text-gray-300 dark:text-zinc-600 mx-1">|</span>
                    <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => handleSelectAllColumns(tabKey === 'pendingBilty' ? 'pending' : 'history', columnsMeta, false)}>Deselect All</Button>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {columnsMeta.filter(col => col.toggleable).map(col => (
                      <div key={`toggle-${tabKey}-${col.dataKey}`} className="flex items-center space-x-2">
                        <Checkbox
                          id={`toggle-${tabKey}-${col.dataKey}`}
                          checked={!!visibilityState[col.dataKey]}
                          onCheckedChange={(checked) => handleToggleColumn(tabKey === 'pendingBilty' ? 'pending' : 'history', col.dataKey, Boolean(checked))}
                          disabled={col.alwaysVisible}
                        />
                        <Label htmlFor={`toggle-${tabKey}-${col.dataKey}`} className="text-xs font-normal cursor-pointer">
                          {col.header}
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
        <CardContent className="p-0 flex-1 flex flex-col">
          {loading ? (
            <div className="flex flex-col justify-center items-center py-10 flex-1"><Loader2 className="h-8 w-8 text-[#2fa36b] animate-spin mb-3" /><p className="text-muted-foreground">Loading...</p></div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-green-200/50 dark:border-emerald-800/50 bg-green-50/50 dark:bg-emerald-500/10 rounded-lg mx-4 my-4 text-center flex-1">
              <Info className="h-12 w-12 text-green-500 dark:text-emerald-400 mb-3" />
              <p className="font-medium text-foreground">No Data Found</p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[calc(100vh-500px)] relative custom-scrollbar rounded-b-lg flex-1">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-30">
                  <tr className="bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-800">
                    {columnsMeta.filter(col => visibilityState[col.dataKey]).map(col => (
                      <th
                        key={col.dataKey}
                        className="px-3 py-3 text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase text-left bg-gray-50/95 dark:bg-zinc-800/95 backdrop-blur-sm shadow-sm whitespace-nowrap"
                      >
                        {col.header}
                      </th>
                    ))}
                    {isSuperAdmin && tabKey === 'biltyHistory' && (
                      <th className="px-3 py-3 text-xs font-bold text-purple-700 dark:text-purple-300 uppercase text-left bg-purple-50/95 dark:bg-purple-500/10 backdrop-blur-sm shadow-sm whitespace-nowrap">
                        SA Edit
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-100 dark:divide-zinc-800">
                  {data.map(item => (
                    <tr key={item.id || item._id || item.liftNo} className="hover:bg-green-50/50 dark:hover:bg-emerald-500/10 transition-colors border-b border-gray-100 dark:border-zinc-800">
                      {columnsMeta.filter(col => visibilityState[col.dataKey]).map(column => (
                        <td
                          key={column.dataKey}
                          className={`whitespace-nowrap text-xs px-3 py-2 ${column.dataKey === 'id' ? 'font-medium text-primary' : 'text-gray-700 dark:text-zinc-300'}`}
                        >
                          {column.dataKey === "actionColumn" ? (
                            <div className="flex items-center gap-1.5">
                              <Button
                                onClick={() => handleLiftSelect(item)}
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 px-2"
                              >
                                Enter Bilty
                              </Button>
                              {isSuperAdmin && (
                                <button
                                  onClick={() => setSuperAdminEditLift(item)}
                                  className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-md hover:bg-purple-200 border border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:hover:bg-purple-500/30 dark:border-purple-800"
                                >
                                  <ShieldCheck className="w-3 h-3 mr-1" />
                                  Edit
                                </button>
                              )}
                            </div>
                          ) : renderCell(item, column)}
                        </td>
                      ))}
                      {isSuperAdmin && tabKey === 'biltyHistory' && (
                        <td className="whitespace-nowrap text-xs px-3 py-2">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setSuperAdminEditLift(item)}
                              className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-md hover:bg-purple-200 border border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:hover:bg-purple-500/30 dark:border-purple-800"
                            >
                              <ShieldCheck className="w-3 h-3 mr-1" />
                              Edit
                            </button>
                            {item.canRevert !== false && (
                              <button
                                onClick={() => {
                                  if (window.confirm("Are you sure you want to revert this bilty?")) {
                                    handleRevert(item._dbId || item.id);
                                  }
                                }}
                                className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-md hover:bg-red-200 border border-red-300 dark:bg-red-500/20 dark:text-red-300 dark:hover:bg-red-500/30 dark:border-red-800"
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
    <div className="space-y-4 p-4 md:p-6">
      {superAdminEditLift && (
        <SuperAdminEditModal
          title={`Edit Lift — ${superAdminEditLift.id}`}
          tableName={superAdminEditLift._sourceTable === "Mismatch" ? "Mismatch" : "LIFT-ACCOUNTS"}
          pkField="id"
          pkValue={superAdminEditLift._dbId}
          fields={[
            { label: "Lift No.", dbKey: "Lift No", value: superAdminEditLift.id, type: "text" },
            { label: "Party Name", dbKey: "Vendor Name", value: superAdminEditLift.vendorName, type: "text" },
            { label: "Raw Material Name", dbKey: "Raw Material Name", value: superAdminEditLift.rawMaterialName, type: "text" },
            { label: "Truck No.", dbKey: "Truck No.", value: superAdminEditLift.truckNo, type: "text" },
            { label: "Driver No.", dbKey: "Driver No.", value: superAdminEditLift.driverNo, type: "text" },
            { label: "Transporter Name", dbKey: "Transporter Name", value: superAdminEditLift.transporterName, type: "text" },
            { label: "Type Of Transporting Rate", dbKey: "Type Of Transporting Rate", value: superAdminEditLift.rateType, type: "text" },
            { label: "Transporting Per MT Rate", dbKey: "Transporting Per MT Rate", value: superAdminEditLift.transportingRate, type: "number" },
            { label: "Qty", dbKey: "Qty", value: superAdminEditLift.originalQty, type: "number" },
            { label: "Bill No.", dbKey: "Bill No.", value: superAdminEditLift.billNo, type: "text" },
            { label: "Date Of Bill", dbKey: "Date Of Bill", value: superAdminEditLift.dateOfBill, type: "date" },
            { label: "Firm Name", dbKey: "Firm Name", value: superAdminEditLift.firmName, type: "text" },
            { label: "Bilty No.", dbKey: "Bilty No.", value: superAdminEditLift.biltyNumber, type: "text" },
            { label: "Bilty Image URL", dbKey: "Bilty Image", value: superAdminEditLift.biltyImageUrl, type: "text" },
            { label: "Bill Image URL", dbKey: "Bill Image", value: superAdminEditLift.billImage, type: "text" },
          ]}
          onClose={() => setSuperAdminEditLift(null)}
          onSaved={() => { setSuperAdminEditLift(null); fetchLiftData({ force: true, showLoader: false }); }}
        />
      )}
      <Card className="">
        <CardHeader className="p-4">
          <CardTitle className="flex items-center gap-2 text-gray-700 dark:text-zinc-300 text-lg">
            <Receipt className="h-5 w-5 text-[#2fa36b]" />
            Bilty Page
          </CardTitle>
          
        </CardHeader>
        <CardContent className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full sm:w-[450px] grid-cols-2 mb-4">
              <TabsTrigger value="pendingBilty" className="flex items-center gap-2">
                <FileCheck className="h-4 w-4" /> Pending Bilty
                <Badge variant="secondary" className="ml-1.5">{pendingBilty.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="biltyHistory" className="flex items-center gap-2">
                <History className="h-4 w-4" /> Bilty History
                <Badge variant="secondary" className="ml-1.5">{biltyHistory.length}</Badge>
              </TabsTrigger>
            </TabsList>
            
            <div className="mb-4 p-4 bg-green-50/50 dark:bg-emerald-500/10 rounded-lg grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select value={filters.vendorName} onValueChange={(value) => handleFilterChange("vendorName", value)}>
                <SelectTrigger className="h-9 bg-white dark:bg-zinc-900"><SelectValue placeholder="All Vendors" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {uniqueFilterOptions.vendorName.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.materialName} onValueChange={(value) => handleFilterChange("materialName", value)}>
                <SelectTrigger className="h-9 bg-white dark:bg-zinc-900"><SelectValue placeholder="All Materials" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Materials</SelectItem>
                  {uniqueFilterOptions.materialName.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.firmName} onValueChange={(value) => handleFilterChange("firmName", value)}>
                <SelectTrigger className="h-9 bg-white dark:bg-zinc-900"><SelectValue placeholder="All Firms" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Firms</SelectItem>
                  {uniqueFilterOptions.firmName.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={clearAllFilters}>Clear Filters</Button>
            </div>

            <TabsContent value="pendingBilty" className="mt-0">
              {renderTableSection("pendingBilty", "Lifts Pending Bilty", "Awaiting Bilty Number and Image.", pendingBilty, PENDING_BILTY_COLUMNS_META, visiblePendingColumns)}
            </TabsContent>
            <TabsContent value="biltyHistory" className="mt-0">
              {renderTableSection("biltyHistory", "Bilty History", "Completed Bilty entries.", biltyHistory, BILTY_HISTORY_COLUMNS_META, visibleHistoryColumns)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Sheet open={showPopup} onOpenChange={handleClosePopup}>
        <SheetContent className="sm:max-w-xl p-0 flex flex-col">
          <SheetHeader className="p-6 border-b border-gray-100 dark:border-zinc-800 flex-shrink-0 bg-white dark:bg-zinc-950">
            <SheetTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <FileText className="h-5 w-5 text-brand" />
              Enter Bilty for Lift {selectedLift?.id}
            </SheetTitle>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-zinc-950/50 custom-scrollbar">
            <form id="bilty-form" onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-900 dark:text-white">Bilty Number *</Label>
                <Input 
                  name="biltyNumber" 
                  value={formData.biltyNumber} 
                  onChange={handleInputChange}
                  className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 focus:ring-brand focus:border-brand h-11"
                  placeholder="Enter Bilty Number"
                />
                {formErrors.biltyNumber && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{formErrors.biltyNumber}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-900 dark:text-white">Bilty Image *</Label>
                <div className="flex items-center justify-center w-full">
                  <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer bg-white dark:bg-zinc-900 border-gray-300 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800/80 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                      <Upload className="w-8 h-8 mb-3 text-gray-400 dark:text-zinc-500" />
                      <p className="mb-1 text-sm text-gray-500 dark:text-zinc-400"><span className="font-semibold text-brand">Click to upload</span> or drag and drop</p>
                      <p className="text-xs text-gray-400 dark:text-zinc-500">Images or PDF</p>
                      {formData.biltyImageFile && <p className="mt-3 text-sm font-medium text-brand dark:text-[#5ec792] bg-brand-soft px-3 py-1 rounded-full">{formData.biltyImageFile.name}</p>}
                    </div>
                    <Input id="dropzone-file" name="biltyImageFile" type="file" onChange={handleInputChange} accept="image/*,.pdf" className="hidden" />
                  </label>
                </div>
                {formErrors.biltyImageFile && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{formErrors.biltyImageFile}</p>}
              </div>
            </form>
          </div>
          
          <SheetFooter className="p-6 border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex-shrink-0">
            <Button type="button" variant="outline" className="dark:border-zinc-700 dark:hover:bg-zinc-800" onClick={handleClosePopup}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              form="bilty-form"
              disabled={isSubmitting} 
              className="bg-brand hover:bg-brand-dark text-white"
            >
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
              ) : "Submit Bilty"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
