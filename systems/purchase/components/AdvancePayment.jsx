"use client";
import { useState, useEffect, useCallback, useMemo, useContext } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

import {
  Calculator,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  LinkIcon,
  Filter,
  ExternalLink,
  ChevronsUpDown,
  History,
  FileClock,
  Search,
  FileText,
  Eye,
} from "lucide-react";
import { MixerHorizontalIcon } from "@radix-ui/react-icons";
import { AuthContext } from "../context/AuthContext";
import { API_URL, getToken } from "@/lib/auth";
import { canViewFirm } from "../utils/firmFilter";

// Helper Functions
const cleanIndentId = (indentId) => {
  if (!indentId) return "";
  return String(indentId).replace(/[^a-zA-Z0-9-]/g, "");
};

const formatDate = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

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
              className={`px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800/60 dark:text-zinc-200 ${value === "all" ? "bg-green-50 dark:bg-emerald-500/10" : ""}`}
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
                className={`px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800/60 dark:text-zinc-200 ${value === option ? "bg-green-50 dark:bg-emerald-500/10" : ""}`}
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

const formatSheetDateString = (dateValue) => {
  if (!dateValue || typeof dateValue !== "string" || !dateValue.trim()) {
    return "";
  }
  const dateObj = new Date(dateValue);
  if (isNaN(dateObj.getTime())) {
    const gvizMatch = dateValue.match(/^Date\((\d+),(\d+),(\d+)/);
    if (gvizMatch) {
      const [, year, month, day] = gvizMatch.map(Number);
      const parsedDate = new Date(year, month, day);
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
    return dateValue;
  }
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(dateObj);
};

const columns = [
  { header: "Select", dataKey: "selectAction", toggleable: false, alwaysVisible: true },
  { header: "Action", dataKey: "paymentAction", toggleable: false, alwaysVisible: true },
  { header: "Indent ID", dataKey: "indentId", toggleable: true, alwaysVisible: true },
  { header: "Planned", dataKey: "planned", toggleable: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
  { header: "Delivery Order No.", dataKey: "deliveryOrderNo", toggleable: true },
  { header: "Vendor", dataKey: "vendorName", toggleable: true },
  { header: "Material Name", dataKey: "rawMaterialName", toggleable: true },
  { header: "PO Qty", dataKey: "approvedQty", toggleable: true },
  { header: "Advance Amount", dataKey: "advanceAmount", toggleable: true },
  { header: "Total Amount", dataKey: "totalAmount", toggleable: true },

  { header: "Indent Type", dataKey: "typeOfIndent", toggleable: true },

  {
    header: "PO Copy",
    dataKey: "poCopyLink",
    toggleable: true,
    isLink: true,
    linkText: "View PO",
  },

  { header: "Notes", dataKey: "notes", toggleable: true },
  { header: "Paid On", dataKey: "actual", toggleable: true },
];

export default function OriginalBillsFiledPage() {
  const { user } = useContext(AuthContext);
  const [sheetData, setSheetData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingEntries, setProcessingEntries] = useState({});
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedEntries, setSelectedEntries] = useState({});
  const [activeTab, setActiveTab] = useState("pending");
  const [filters, setFilters] = useState({
    vendorName: "all",
    rawMaterialName: "all",
    typeOfIndent: "all",
    approvedQty: "all",
    deliveryOrderNo: "all",
  });
  const [visibleCols, setVisibleCols] = useState(
    columns.reduce((acc, col) => ({ ...acc, [col.dataKey]: col.alwaysVisible || col.toggleable }), {})
  );

  // PO History read-only reference state (sourced from /purchase/generate-po/po-history)
  const [poHistoryList, setPoHistoryList] = useState([]);
  const [loadingPoHistory, setLoadingPoHistory] = useState(true);
  const [poSearchQuery, setPoSearchQuery] = useState("");
  const [poDateFilter, setPoDateFilter] = useState("");

  const fetchPOHistory = useCallback(async () => {
    setLoadingPoHistory(true);
    try {
      const res = await fetch(`${API_URL}/purchase/generate-po/po-history`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load PO history");
      }

      let result = json.data || [];
      if (user?.firmName) {
        result = result.filter((po) => canViewFirm(user.firmName, po.firmName));
      }
      setPoHistoryList(result);
    } catch (err) {
      console.error("Error fetching PO history in AdvancePayment:", err);
    } finally {
      setLoadingPoHistory(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPOHistory();
  }, [fetchPOHistory, refreshTrigger]);

  const fetchSheetData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/purchase/advance-payment/data`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load data");
      }

      let parsedData = (json.data || []).map((row) => ({
        ...row,
        planned: formatSheetDateString(row.planned),
        actual: formatSheetDateString(row.actual),
      }));

      parsedData = parsedData.filter(
        (item) => canViewFirm(user?.firmName, item.firmName)
      );
      setSheetData(parsedData);
    } catch (err) {
      const errorMessage = `Failed to load data. ${err.message}`;
      setError(errorMessage);
      toast.error("Data Load Error", {
        description: errorMessage,
        icon: <XCircle className="h-4 w-4" />,
      });
    } finally {
      setLoading(false);
    }
  }, [refreshTrigger, user]);

  useEffect(() => {
    fetchSheetData();
  }, [fetchSheetData]);

  const applyFilters = useCallback(
    (data) => {
      let filtered = [...data];
      if (filters.vendorName !== "all") filtered = filtered.filter((entry) => entry.vendorName === filters.vendorName);
      if (filters.rawMaterialName !== "all")
        filtered = filtered.filter((entry) => entry.rawMaterialName === filters.rawMaterialName);
      if (filters.typeOfIndent !== "all")
        filtered = filtered.filter((entry) => entry.typeOfIndent === filters.typeOfIndent);
      if (filters.approvedQty !== "all")
        filtered = filtered.filter((entry) => entry.approvedQty === filters.approvedQty);
      if (filters.deliveryOrderNo !== "all")
        filtered = filtered.filter((entry) => entry.deliveryOrderNo === filters.deliveryOrderNo);
      return filtered;
    },
    [filters]
  );

  const pendingEntries = useMemo(() => {
    const pending = sheetData
      .filter((row) => {
        const hasPlanned5 = row.planned5 && String(row.planned5).trim() !== "" && String(row.planned5).trim() !== "-";
        const hasActual5 = row.actual5 && String(row.actual5).trim() !== "" && String(row.actual5).trim() !== "-";
        return hasPlanned5 && !hasActual5;
      })
      .sort((a, b) => new Date(b.planned5 || 0) - new Date(a.planned5 || 0));
    return applyFilters(pending);
  }, [sheetData, applyFilters]);

  const historyEntries = useMemo(() => {
    const history = sheetData
      .filter((row) => {
        const hasPlanned5 = row.planned5 && String(row.planned5).trim() !== "" && String(row.planned5).trim() !== "-";
        const hasActual5 = row.actual5 && String(row.actual5).trim() !== "" && String(row.actual5).trim() !== "-";
        return hasPlanned5 && hasActual5;
      })
      .sort((a, b) => new Date(b.actual5 || 0) - new Date(a.actual5 || 0));
    // Sort logic removed to simply show all history
    return applyFilters(history);
  }, [sheetData, applyFilters]);

  // Read-only PO History filter computation
  const filteredPOHistory = useMemo(() => {
    return poHistoryList.filter((po) => {
      const searchMatch =
        (po.poId || "").toLowerCase().includes(poSearchQuery.toLowerCase()) ||
        (po.vendorName || "").toLowerCase().includes(poSearchQuery.toLowerCase()) ||
        (po.firmName || "").toLowerCase().includes(poSearchQuery.toLowerCase()) ||
        (po.items || []).join(", ").toLowerCase().includes(poSearchQuery.toLowerCase());

      const dateMatch =
        !poDateFilter || (po.date && po.date.startsWith(poDateFilter));

      const vendorMatch =
        filters.vendorName === "all" ||
        (po.vendorName && po.vendorName.trim().toLowerCase() === filters.vendorName.trim().toLowerCase());

      return searchMatch && dateMatch && vendorMatch;
    });
  }, [poHistoryList, poSearchQuery, poDateFilter, filters.vendorName]);

  const getUniqueValues = (field) => {
    const values = sheetData.map((entry) => entry[field]).filter((value) => value && value.trim() !== "");
    return [...new Set(values)].sort();
  };

  const updateSupabase = async (entry) => {
    if (!entry?.dbIndentId) {
      throw new Error("Cannot update: Entry database ID is missing.");
    }

    const res = await fetch(`${API_URL}/purchase/advance-payment/mark-paid`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ indentId: entry.dbIndentId }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || "Update failed");
    return { success: true };
  };

  const handleSubmitSelected = async () => {
    const selectedIds = Object.keys(selectedEntries).filter(id => selectedEntries[id]);

    if (selectedIds.length === 0) {
      toast.error("No entries selected", {
        description: "Please select at least one entry to submit.",
        icon: <AlertTriangle className="h-4 w-4" />,
      });
      return;
    }

    const entriesToProcess = pendingEntries.filter(entry =>
      selectedIds.includes(entry._id) || selectedIds.includes(String(entry._id))
    );

    setProcessingEntries(prev => {
      const newState = { ...prev };
      entriesToProcess.forEach(entry => {
        newState[entry._id] = true;
      });
      return newState;
    });

    let successCount = 0;
    let errorCount = 0;

    for (const entry of entriesToProcess) {
      try {
        await updateSupabase(entry);
        successCount++;
      } catch (error) {
        console.error(`Failed to update PO ${entry.poNumber}:`, error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast.success("Entries Updated", {
        description: `${successCount} entries have been successfully updated.`,
        icon: <CheckCircle className="h-4 w-4" />,
      });
    }

    if (errorCount > 0) {
      toast.error("Some Updates Failed", {
        description: `${errorCount} entries failed to update. Please try again.`,
        icon: <XCircle className="h-4 w-4" />,
      });
    }

    setSelectedEntries({});
    setProcessingEntries({});
    setRefreshTrigger(t => t + 1);
  };

  const handleSelectEntry = (entryId, checked) => {
    setSelectedEntries(prev => ({
      ...prev,
      [entryId]: checked,
    }));
  };

  const handleSelectAll = (checked) => {
    const newSelection = {};
    if (checked) {
      pendingEntries.forEach(entry => {
        newSelection[entry._id] = true;
      });
    }
    setSelectedEntries(newSelection);
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearAllFilters = () => {
    setFilters({
      vendorName: "all",
      rawMaterialName: "all",
      typeOfIndent: "all",
      approvedQty: "all",
      deliveryOrderNo: "all",
    });
  };

  const renderCellContent = (content, { isLink, linkText } = {}) => {
    if (isLink) {
      const link = String(content || "").trim();
      if (link && link !== "-") {
        const fullLink = link.startsWith("http") ? link : `https://${link}`;
        return (
          <a href={fullLink} target="_blank" rel="noopener noreferrer" className="text-[#2fa36b] hover:underline inline-flex items-center gap-1">
            <LinkIcon className="h-3.5 w-3.5" />
            {linkText || "View"}
          </a>
        );
      }
      return <span className="text-muted-foreground">-</span>;
    }
    return String(content || "").trim() || <span className="text-muted-foreground">-</span>;
  };

  const ColumnVisibilityToggle = () => {
    const handleToggleAll = (checked) => {
      const newVisibility = { ...visibleCols };
      columns.forEach((col) => {
        if (col.toggleable && !col.alwaysVisible) {
          newVisibility[col.dataKey] = checked;
        }
      });
      setVisibleCols(newVisibility);
    };
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 bg-white dark:bg-zinc-900">
            <MixerHorizontalIcon className="mr-2 h-4 w-4" /> View
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="end">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Toggle Columns</p>
              <div>
                <Button variant="link" className="p-0 h-auto text-xs" onClick={() => handleToggleAll(true)}>
                  All
                </Button>
                <span className="text-muted-foreground mx-1">/</span>
                <Button variant="link" className="p-0 h-auto text-xs" onClick={() => handleToggleAll(false)}>
                  None
                </Button>
              </div>
            </div>
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-2">
              {columns
                .filter((c) => c.toggleable)
                .map((col) => (
                  <div key={col.dataKey} className="flex items-center space-x-2">
                    <Checkbox
                      id={col.dataKey}
                      checked={!!visibleCols[col.dataKey]}
                      onCheckedChange={(checked) => setVisibleCols((p) => ({ ...p, [col.dataKey]: !!checked }))}
                      disabled={col.alwaysVisible}
                    />
                    <Label htmlFor={col.dataKey} className="text-sm font-normal cursor-pointer flex-1">
                      {col.header} {col.alwaysVisible && <span className="text-xs text-muted-foreground">(Fixed)</span>}
                    </Label>
                  </div>
                ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const visibleColumns = columns.filter((col) => visibleCols[col.dataKey]);
  const allSelected = pendingEntries.length > 0 && pendingEntries.every(entry => selectedEntries[entry._id]);
  const someSelected = Object.values(selectedEntries).some(v => v);

  const renderTable = (entries, isHistory) => (
    <div className="overflow-auto h-full rounded-md border">
      <Table>
        <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
          <TableRow>
            {visibleColumns.map((col) => (
              <TableHead
                key={col.dataKey}
                className={col.dataKey === "selectAction" || col.dataKey === "paymentAction" ? "w-[120px] text-center" : ""}
              >
                {col.dataKey === "selectAction" ? (
                  !isHistory ? (
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                    />) : <span>#</span>
                ) : (
                  col.header
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={visibleColumns.length} className="h-24 text-center text-muted-foreground">
                No {isHistory ? "history" : "pending"} records found.
              </TableCell>
            </TableRow>
          ) : (
            entries.map((entry) => (
              <TableRow key={entry._id} className="hover:bg-muted/50">
                {visibleColumns.map((col) => (
                  <TableCell key={col.dataKey} className="py-2.5 px-3 text-xs">
                    {col.dataKey === "selectAction" ? (
                      <div className="flex justify-center items-center">
                        {!isHistory ? (
                          <>
                            {processingEntries[entry._id] ? (
                              <Loader2 className="h-4 w-4 animate-spin text-[#2fa36b]" />
                            ) : (
                              <Checkbox
                                checked={!!selectedEntries[entry._id]}
                                onCheckedChange={(checked) => handleSelectEntry(entry._id, checked)}
                              />
                            )}
                          </>
                        ) : (
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                        )}
                      </div>
                    ) : col.dataKey === "paymentAction" ? (
                      <div className="flex justify-center items-center">
                        {entry.paymentLink && entry.paymentLink.trim() !== "" && entry.paymentLink !== "-" ? (
                          <Button
                            size="sm"
                            className={`text-xs h-7 ${isHistory ? "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700" : "bg-[#2fa36b] hover:bg-[#268a59] text-white"}`}
                            variant={isHistory ? "ghost" : "default"}
                            onClick={() => {
                              const link = entry.paymentLink.startsWith("http")
                                ? entry.paymentLink
                                : `https://${entry.paymentLink}`;
                              window.open(link, "_blank");
                            }}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            {isHistory ? "View Link" : "Make Payment"}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-xs">No Link</span>
                        )}
                      </div>
                    ) : (
                      <span title={typeof entry[col.dataKey] === "string" ? entry[col.dataKey] : ""}>
                        {renderCellContent(entry[col.dataKey], { isLink: col.isLink, linkText: col.linkText })}
                      </span>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            )))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col bg-slate-50 dark:bg-zinc-950">
      <Card className="shadow-md border border-gray-200 dark:border-zinc-800 flex-1 flex flex-col bg-white dark:bg-zinc-900">
        <CardHeader className="p-4 border-b border-gray-200 dark:border-zinc-800">
          <CardTitle className="text-lg font-bold text-gray-800 dark:text-zinc-100 flex items-center gap-3">
            <Calculator className="h-6 w-6 text-[#2fa36b]" />
            Advance Payement
          </CardTitle>
          
        </CardHeader>
        <CardContent className="p-4 flex-1 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-[600px] grid-cols-3 mb-4">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <FileClock className="h-4 w-4" />
                Pending Payments
                <Badge variant="secondary" className="ml-1 text-xs">{pendingEntries.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Payment History
                <Badge variant="outline" className="ml-1 text-xs">{historyEntries.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="poHistory" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                PO History
                <Badge variant="outline" className="ml-1 text-xs">{filteredPOHistory.length}</Badge>
              </TabsTrigger>
            </TabsList>

            <div className="mb-4 p-4 bg-green-50/50 dark:bg-emerald-500/10 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
                <Label className="text-sm font-medium">Filters</Label>
                <Button variant="outline" size="sm" onClick={clearAllFilters} className="ml-auto bg-white dark:bg-zinc-900">
                  Clear All
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <Label className="text-xs mb-1 block">Vendor Name</Label>
                  <SearchableSelect
                    value={filters.vendorName}
                    onValueChange={(value) => handleFilterChange("vendorName", value)}
                    options={["all", ...getUniqueValues("vendorName")]}
                    placeholder="Vendors"
                    className="h-9"
                  />
                </div>

                <div>
                  <Label className="text-xs mb-1 block">Material Name</Label>
                  <SearchableSelect
                    value={filters.rawMaterialName}
                    onValueChange={(value) => handleFilterChange("rawMaterialName", value)}
                    options={["all", ...getUniqueValues("rawMaterialName")]}
                    placeholder="Materials"
                    className="h-9"
                  />
                </div>

                <div>
                  <Label className="text-xs mb-1 block">Type Of Indent</Label>
                  <SearchableSelect
                    value={filters.typeOfIndent}
                    onValueChange={(value) => handleFilterChange("typeOfIndent", value)}
                    options={["all", ...getUniqueValues("typeOfIndent")]}
                    placeholder="Types"
                    className="h-9"
                  />
                </div>

                <div>
                  <Label className="text-xs mb-1 block">Approved Quantity</Label>
                  <SearchableSelect
                    value={filters.approvedQty}
                    onValueChange={(value) => handleFilterChange("approvedQty", value)}
                    options={["all", ...getUniqueValues("approvedQty")]}
                    placeholder="Quantities"
                    className="h-9"
                  />
                </div>

                <div>
                  <Label className="text-xs mb-1 block">Delivery Order No</Label>
                  <SearchableSelect
                    value={filters.deliveryOrderNo}
                    onValueChange={(value) => handleFilterChange("deliveryOrderNo", value)}
                    options={["all", ...getUniqueValues("deliveryOrderNo")]}
                    placeholder="Orders"
                    className="h-9"
                  />
                </div>
              </div>
            </div>


            <TabsContent value="pending" className="flex-1 flex flex-col mt-0 h-full">
              <Card className="shadow-none border flex-1 flex flex-col h-full bg-white dark:bg-zinc-900">
                <CardHeader className="py-3 px-4 border-b">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center text-base">
                        Pending Entries ({pendingEntries.length})
                      </CardTitle>
                      
                    </div>
                    <div className="flex gap-2">
                      {someSelected && (
                        <Button
                          onClick={handleSubmitSelected}
                          disabled={Object.values(processingEntries).some(v => v)}
                          className="bg-[#2fa36b] hover:bg-[#268a59]"
                        >
                          {Object.values(processingEntries).some(v => v) ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Submit Selected ({Object.values(selectedEntries).filter(v => v).length})
                            </>
                          )}
                        </Button>
                      )}
                      <ColumnVisibilityToggle />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-hidden h-full">
                  {loading && pendingEntries.length === 0 ? (
                    <div className="flex h-40 items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-[#2fa36b]" /> Loading...
                    </div>
                  ) : (
                    renderTable(pendingEntries, false)
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="flex-1 flex flex-col mt-0 h-full">
              <Card className="shadow-none border flex-1 flex flex-col h-full bg-white dark:bg-zinc-900">
                <CardHeader className="py-3 px-4 border-b">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center text-base">
                        Payment History ({historyEntries.length})
                      </CardTitle>
                      
                    </div>
                    <div className="flex gap-2">
                      <ColumnVisibilityToggle />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-hidden h-full">
                  {loading && historyEntries.length === 0 ? (
                    <div className="flex h-40 items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-[#2fa36b]" /> Loading...
                    </div>
                  ) : (
                    renderTable(historyEntries, true)
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="poHistory" className="flex-1 flex flex-col mt-0 h-full">
              <Card className="shadow-none border flex-1 flex flex-col h-full bg-white dark:bg-zinc-900">
                <CardHeader className="py-3 px-4 border-b">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <CardTitle className="flex items-center text-base">
                        PO & Payment History ({filteredPOHistory.length})
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground mt-0.5">
                        Read-only reference of prior purchase orders and payment statuses
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                        <Input
                          placeholder="Search PO ID, vendor, material..."
                          className="pl-8 h-8 text-xs bg-white dark:bg-zinc-900"
                          value={poSearchQuery}
                          onChange={(e) => setPoSearchQuery(e.target.value)}
                        />
                      </div>
                      <Input
                        type="date"
                        className="w-36 h-8 text-xs bg-white dark:bg-zinc-900"
                        value={poDateFilter}
                        onChange={(e) => setPoDateFilter(e.target.value)}
                      />
                      {(poSearchQuery || poDateFilter) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => {
                            setPoSearchQuery("");
                            setPoDateFilter("");
                          }}
                        >
                          Reset
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-hidden h-full">
                  {loadingPoHistory ? (
                    <div className="flex h-40 items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-[#2fa36b]" /> Loading PO History...
                    </div>
                  ) : filteredPOHistory.length === 0 ? (
                    <div className="text-center py-16 border-dashed rounded-xl">
                      <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 font-medium">No purchase order records found</p>
                    </div>
                  ) : (
                    <div className="overflow-auto border-0 max-h-[calc(100vh-420px)] relative custom-scrollbar">
                      <Table>
                        <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                          <TableRow>
                            <TableHead className="text-xs font-bold">PO ID</TableHead>
                            <TableHead className="text-xs font-bold">Creation Date</TableHead>
                            <TableHead className="text-xs font-bold">Firm Name</TableHead>
                            <TableHead className="text-xs font-bold">Vendor Name</TableHead>
                            <TableHead className="text-xs font-bold">Items</TableHead>
                            <TableHead className="text-xs font-bold">PO Amount</TableHead>
                            <TableHead className="text-xs font-bold">Status</TableHead>
                            <TableHead className="text-xs font-bold text-right">PO Copy</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPOHistory.map((po) => (
                            <TableRow key={po.id} className="hover:bg-muted/50 text-xs">
                              <TableCell className="py-2.5 px-3 font-medium text-blue-600">{po.poId}</TableCell>
                              <TableCell className="py-2.5 px-3 text-gray-600">{formatDate(po.date)}</TableCell>
                              <TableCell className="py-2.5 px-3 text-gray-700">{po.firmName || "-"}</TableCell>
                              <TableCell className="py-2.5 px-3 font-semibold text-gray-800">{po.vendorName}</TableCell>
                              <TableCell className="py-2.5 px-3">
                                <div className="flex flex-wrap gap-1">
                                  {po.items.map((item, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-[10px] bg-blue-50 text-blue-700 border-blue-100">
                                      {item}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className="py-2.5 px-3 font-bold">₹{Number(po.totalAmount).toLocaleString("en-IN")}</TableCell>
                              <TableCell className="py-2.5 px-3">
                                <Badge
                                  className={`text-[10px] ${
                                    po.status === "Logistics Arranged"
                                      ? "bg-green-100 text-green-700 border-green-200"
                                      : po.status === "Entered in Tally"
                                      ? "bg-blue-100 text-blue-700 border-blue-200"
                                      : "bg-amber-100 text-amber-700 border-amber-200"
                                  }`}
                                >
                                  {po.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-2.5 px-3 text-right">
                                {po.pdfUrl ? (
                                  <Button variant="outline" size="sm" className="h-7 text-xs bg-white text-blue-600 border-blue-200 hover:bg-blue-50" asChild>
                                    <a href={po.pdfUrl} target="_blank" rel="noopener noreferrer">
                                      <Eye className="h-3.5 w-3.5 mr-1" /> View PDF
                                    </a>
                                  </Button>
                                ) : (
                                  <span className="text-gray-400 text-xs">No PDF</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}