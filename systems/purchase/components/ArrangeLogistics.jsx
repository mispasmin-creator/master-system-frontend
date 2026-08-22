"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "./ui/card";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import {
  Check,
  Filter,
  History,
  Loader2,
  AlertTriangle,
  Info,
  Truck,
  Search,
  TrendingDown,
  ChevronsUpDown,
  Plus,
  Trash,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import SuperAdminEditModal from "./SuperAdminEditModal";
import { useNotification } from "../context/NotificationContext";
import { API_URL, getToken } from "@/lib/auth";
import { fetchMasterData } from "../utils/masterDataUtils";
import { canViewFirm } from "../utils/firmFilter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
// Popover replaced by custom dropdown
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";

const MAX_TRANSPORTERS = 10;
const INITIAL_TRANSPORTER_SLOTS = 3;

const formatDateTime = (isoString) => {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return String(isoString);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const money = (val) => {
  const n = Number(val);
  if (isNaN(n)) return "0.00";
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const createEmptyTransporterForm = () => ({
  name: "",
  rateType: "",
  cost: 0,
});

const normalizeTransporterForm = (transporter = {}) => ({
  ...createEmptyTransporterForm(),
  ...transporter,
  rateType: String(transporter.rateType || transporter.vehicleType || "").toLowerCase(),
});

export default function ArrangeLogistics() {
  const [pendingData, setPendingData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [filteredPendingData, setFilteredPendingData] = useState([]);
  const [filteredHistoryData, setFilteredHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshData, setRefreshData] = useState(false);
  const [selectedIndent, setSelectedIndent] = useState(null);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHistoryDate, setSelectedHistoryDate] = useState("");
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const { user, isSuperAdmin } = useAuth();
  const [superAdminEditItem, setSuperAdminEditItem] = useState(null);
  const { updateCount } = useNotification();
  const [transporterMasterOptions, setTransporterMasterOptions] = useState([]);
  const [selectedTransporterIndex, setSelectedTransporterIndex] = useState(0);
  const [transporterSearchTerms, setTransporterSearchTerms] = useState(Array.from({ length: INITIAL_TRANSPORTER_SLOTS }, () => ""));
  const [transporterDropdownOpen, setTransporterDropdownOpen] = useState(Array.from({ length: INITIAL_TRANSPORTER_SLOTS }, () => false));
  const [transporterForms, setTransporterForms] = useState(Array.from({ length: INITIAL_TRANSPORTER_SLOTS }, () => createEmptyTransporterForm()));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Three separate refs to satisfy React hooks rules (no refs in loops)
  const tRef0 = useRef(null);
  const tRef1 = useRef(null);
  const tRef2 = useRef(null);
  const tRef3 = useRef(null);
  const tRef4 = useRef(null);
  const tRef5 = useRef(null);
  const tRef6 = useRef(null);
  const tRef7 = useRef(null);
  const tRef8 = useRef(null);
  const tRef9 = useRef(null);
  const transporterDropdownRefs = [tRef0, tRef1, tRef2, tRef3, tRef4, tRef5, tRef6, tRef7, tRef8, tRef9];

  // Close transporter dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      transporterDropdownRefs.forEach((ref, i) => {
        if (ref.current && !ref.current.contains(e.target)) {
          setTransporterDropdownOpen((prev) => prev.map((v, idx) => idx === i ? false : v));
        }
      });
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const transporterMasterMap = useMemo(
    () =>
      transporterMasterOptions.reduce((acc, transporter) => {
        if (transporter?.name) {
          acc[transporter.name] = transporter;
        }
        return acc;
      }, {}),
    [transporterMasterOptions],
  );

  const syncHelperArrays = useCallback((length) => {
    setTransporterSearchTerms((prev) => {
      const next = [...prev];
      while (next.length < length) next.push("");
      return next.slice(0, length);
    });
    setTransporterDropdownOpen((prev) => {
      const next = [...prev];
      while (next.length < length) next.push(false);
      return next.slice(0, length);
    });
  }, []);

  const fetchTransporterMasterOptions = useCallback(async () => {
    try {
      const masterData = await fetchMasterData();
      setTransporterMasterOptions(masterData.transporterMasterOptions || []);
    } catch (fetchError) {
      console.error("Error fetching transporter options:", fetchError);
    }
  }, []);

  useEffect(() => {
    fetchTransporterMasterOptions();
  }, [fetchTransporterMasterOptions]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/purchase/arrange-logistics/data`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to load data");
        }

        let pending = json.data?.pending || [];
        let history = json.data?.history || [];
        if (user?.firmName) {
          pending = pending.filter((row) => canViewFirm(user.firmName, row.firmName));
          history = history.filter((row) => canViewFirm(user.firmName, row.firmName));
        }

        setPendingData(pending);
        setFilteredPendingData(pending);
        setHistoryData(history);
        setFilteredHistoryData(history);
        updateCount("logistics", pending.length);
      } catch (fetchErr) {
        console.error("Error fetching logistics data:", fetchErr);
        setError(`Failed to load data: ${fetchErr.message}`);
        toast.error("Failed to load data", { description: fetchErr.message });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [refreshData, updateCount, user]);

  useEffect(() => {
    let filtered = [...pendingData];
    if (selectedDate) {
      filtered = filtered.filter((item) => new Date(item.plannedLogistics).toISOString().split("T")[0] === selectedDate);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) =>
        String(item.indentId).toLowerCase().includes(query) ||
        String(item.firmName).toLowerCase().includes(query) ||
        String(item.vendorName).toLowerCase().includes(query) ||
        String(item.material).toLowerCase().includes(query),
      );
    }
    setFilteredPendingData(filtered);
  }, [pendingData, searchQuery, selectedDate]);

  useEffect(() => {
    let filtered = [...historyData];
    if (selectedHistoryDate) {
      filtered = filtered.filter((item) => new Date(item.actualLogistics).toISOString().split("T")[0] === selectedHistoryDate);
    }
    if (historySearchQuery.trim()) {
      const query = historySearchQuery.toLowerCase();
      filtered = filtered.filter((item) =>
        String(item.indentId).toLowerCase().includes(query) ||
        String(item.firmName).toLowerCase().includes(query) ||
        String(item.vendorName).toLowerCase().includes(query) ||
        String(item.material).toLowerCase().includes(query) ||
        String(item.selectedTransporter?.name || "").toLowerCase().includes(query),
      );
    }
    setFilteredHistoryData(filtered);
  }, [historyData, historySearchQuery, selectedHistoryDate]);

  const updateTransporterForm = (index, field, value) => {
    if (field === "cost") value = value === "" ? "" : value.replace(/[^0-9.]/g, "");
    setTransporterForms((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const applyTransporterMasterSelection = (index, transporterName) => {
    const masterTransporter = transporterMasterMap[transporterName];
    setTransporterForms((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        name: transporterName,
        rateType: masterTransporter?.rateType || next[index]?.rateType || "",
        cost: masterTransporter?.rate || next[index]?.cost || "",
      };
      return next;
    });
  };

  const addTransporterSlot = () => {
    if (transporterForms.length >= MAX_TRANSPORTERS) {
      toast.error(`Only ${MAX_TRANSPORTERS} transporter slots are allowed`);
      return;
    }
    setTransporterForms((prev) => [...prev, createEmptyTransporterForm()]);
    syncHelperArrays(transporterForms.length + 1);
  };

  const removeTransporterSlot = (index) => {
    if (transporterForms.length <= 1) {
      toast.error("At least one transporter slot is required");
      return;
    }
    setTransporterForms((prev) => prev.filter((_, formIndex) => formIndex !== index));
    syncHelperArrays(transporterForms.length - 1);
    setSelectedTransporterIndex((prev) => (prev >= transporterForms.length - 1 ? 0 : prev));
  };

  const lowestCost = useMemo(() => {
    const costs = transporterForms
      .filter((transporter) => transporter.name && Number(transporter.cost || 0) > 0)
      .map((transporter) => Number(transporter.cost));
    return costs.length ? Math.min(...costs) : null;
  }, [transporterForms]);

  const quickSelectLowestCost = () => {
    const bestIndex = transporterForms.findIndex(
      (transporter) => transporter.name && Number(transporter.cost || 0) > 0 && Number(transporter.cost) === lowestCost,
    );
    if (bestIndex !== -1) {
      setSelectedTransporterIndex(bestIndex);
      toast.success(`Selected transporter with best cost: Rs ${lowestCost}`);
    }
  };

  const openArrangeDialog = (indent) => {
    setSelectedIndent(indent);
    const nextForms = indent.logisticsOptions && indent.logisticsOptions.length
      ? indent.logisticsOptions.map(normalizeTransporterForm)
      : Array.from({ length: INITIAL_TRANSPORTER_SLOTS }, () => createEmptyTransporterForm());
    setTransporterForms(nextForms);
    syncHelperArrays(nextForms.length);
    setSelectedTransporterIndex(0);
    setOpenDialog(true);
    setSelectedHistory(null);
  };

  const openHistoryDialog = (item) => {
    setSelectedHistory(item);
    setSelectedIndent(null);
    setOpenDialog(true);
  };

  const closeDialog = () => {
    setOpenDialog(false);
    setSelectedIndent(null);
    setSelectedHistory(null);
    setTransporterForms(Array.from({ length: INITIAL_TRANSPORTER_SLOTS }, () => createEmptyTransporterForm()));
    syncHelperArrays(INITIAL_TRANSPORTER_SLOTS);
    setSelectedTransporterIndex(0);
  };

  async function onSubmit() {
    if (!selectedIndent) return;
    const filledTransporters = transporterForms.filter((transporter) =>
      Object.values(transporter).some((value) => String(value || "").trim() !== ""),
    );
    if (!filledTransporters.length) {
      toast.error("Please add at least one transporter");
      return;
    }

    const selectedTransporter = filledTransporters[selectedTransporterIndex] || filledTransporters[0] || null;
    if (!selectedTransporter?.name) {
      toast.error("Please choose a selected transporter");
      return;
    }

    setIsSubmitting(true);
    try {
      const normalizedTransporters = filledTransporters.map((transporter) => ({
        ...normalizeTransporterForm(transporter),
        cost: Number(transporter.cost || 0),
      }));
      const res = await fetch(`${API_URL}/purchase/arrange-logistics/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          indentIds: selectedIndent.rowIds || [],
          logisticsOptions: normalizedTransporters,
          selectedTransporter,
          selectedTransporterIndex: normalizedTransporters.findIndex(
            (transporter) => transporter.name === selectedTransporter.name && Number(transporter.cost) === Number(selectedTransporter.cost),
          ),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "No indent was updated for logistics submission.");
      }
      toast.success(`Arranged logistics for ${selectedIndent.poNumber || selectedIndent.indentId}`);
      closeDialog();
      setTimeout(() => setRefreshData((prev) => !prev), 500);
    } catch (submitError) {
      console.error("Error arranging logistics:", submitError);
      toast.error("Failed to arrange logistics", { description: submitError.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col">
      {superAdminEditItem && (
        <SuperAdminEditModal
          title={`Edit PO — ${superAdminEditItem.poNumber}`}
          tableName="INDENT-PO"
          pkField="id"
          pkValue={superAdminEditItem.id}
          fields={[
            { label: "PO Number", dbKey: "po_number", value: superAdminEditItem.poNumber, type: "text" },
            { label: "Firm Name", dbKey: "Firm Name", value: superAdminEditItem.firmName, type: "text" },
            { label: "Vendor Name", dbKey: "Vendor name", value: superAdminEditItem.vendorName, type: "text" },
            { label: "Total Amount", dbKey: "Total Amount", value: superAdminEditItem.totalAmount, type: "number" },
            { label: "Total Quantity", dbKey: "Total Quantity", value: superAdminEditItem.totalQuantity, type: "number" },
            { label: "Transport Type", dbKey: "Transport Type", value: superAdminEditItem.transportType, type: "text" },
          ]}
          onClose={() => setSuperAdminEditItem(null)}
          onSaved={() => { setSuperAdminEditItem(null); }}
        />
      )}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="p-4">
          <CardTitle className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <Truck className="h-6 w-6 text-[#2fa36b]" />
            Arrange Logistics
          </CardTitle>
          
        </CardHeader>
        <CardContent className="p-4 flex-1 flex flex-col">
          <Tabs defaultValue="pending" className="flex-1 flex flex-col">
            <TabsList className="grid w-full sm:w-[430px] grid-cols-2 mb-4">
              <TabsTrigger value="pending" className="gap-2"><Truck className="h-4 w-4" />Pending <Badge variant="secondary" className="ml-2">{filteredPendingData.length}</Badge></TabsTrigger>
              <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" />History <Badge variant="secondary" className="ml-2">{filteredHistoryData.length}</Badge></TabsTrigger>
            </TabsList>

            <div className="mb-4 p-4 bg-green-50/50 dark:bg-emerald-500/10 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
                <Label className="text-sm font-medium">Filters</Label>
                <Button variant="outline" size="sm" onClick={() => { setSelectedDate(""); setSearchQuery(""); }} className="ml-auto bg-white dark:bg-zinc-900">Clear Pending</Button>
                <Button variant="outline" size="sm" onClick={() => { setSelectedHistoryDate(""); setHistorySearchQuery(""); }} className="bg-white dark:bg-zinc-900">Clear History</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div><Label className="text-xs mb-1 block">Pending Date</Label><Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="h-9 bg-white dark:bg-zinc-900" /></div>
                <div><Label className="text-xs mb-1 block">Pending Search</Label><div className="relative"><Search className="absolute h-4 w-4 left-3 top-2.5 text-gray-400 dark:text-zinc-500" /><Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-9 bg-white dark:bg-zinc-900 pl-9" placeholder="PO, vendor, material..." /></div></div>
                <div><Label className="text-xs mb-1 block">History Date</Label><Input type="date" value={selectedHistoryDate} onChange={(e) => setSelectedHistoryDate(e.target.value)} className="h-9 bg-white dark:bg-zinc-900" /></div>
                <div><Label className="text-xs mb-1 block">History Search</Label><div className="relative"><Search className="absolute h-4 w-4 left-3 top-2.5 text-gray-400 dark:text-zinc-500" /><Input value={historySearchQuery} onChange={(e) => setHistorySearchQuery(e.target.value)} className="h-9 bg-white dark:bg-zinc-900 pl-9" placeholder="PO, transporter..." /></div></div>
              </div>
            </div>

            <TabsContent value="pending" className="flex-1 mt-0">
              {loading ? (
                <div className="flex items-center justify-center py-10 text-sm text-gray-500 dark:text-zinc-400">
                  <Loader2 className="h-5 w-5 mr-2 animate-spin text-[#2fa36b]" />
                  Loading pending logistics...
                </div>
              ) : error ? (
                <div className="p-6 rounded-lg border border-dashed border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5" />
                  {error}
                </div>
              ) : !filteredPendingData.length ? (
                <div className="p-6 rounded-lg border border-dashed bg-secondary/50 text-center">
                  <Info className="h-10 w-10 text-[#2fa36b] mx-auto mb-3" />
                  <p className="font-semibold">No pending logistics items</p>
                </div>
              ) : (
                <Card className="flex-1 flex flex-col">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="flex items-center text-base">
                      <Truck className="w-5 h-5 mr-2 text-[#2fa36b]" />
                      Pending Logistics ({filteredPendingData.length})
                    </CardTitle>

                  </CardHeader>
                  <CardContent className="p-0 flex-1 overflow-hidden">
                    <div className="overflow-auto max-h-[calc(100vh-450px)] relative custom-scrollbar">
                      <table className="w-full text-sm border-collapse">
                        <thead className="sticky top-0 z-30">
                          <tr className="bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-800">
                            <th className="px-4 py-3 text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase text-left bg-gray-50/95 dark:bg-zinc-800/95 backdrop-blur-sm shadow-sm">Action</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase text-left bg-gray-50/95 dark:bg-zinc-800/95 backdrop-blur-sm shadow-sm">PO Number</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase text-left bg-gray-50/95 dark:bg-zinc-800/95 backdrop-blur-sm shadow-sm">Firm Name</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase text-left bg-gray-50/95 dark:bg-zinc-800/95 backdrop-blur-sm shadow-sm">Vendor</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase text-left bg-gray-50/95 dark:bg-zinc-800/95 backdrop-blur-sm shadow-sm">Material</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase text-left bg-gray-50/95 dark:bg-zinc-800/95 backdrop-blur-sm shadow-sm">PO Qty</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase text-left bg-gray-50/95 dark:bg-zinc-800/95 backdrop-blur-sm shadow-sm">Total Amount</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase text-left bg-gray-50/95 dark:bg-zinc-800/95 backdrop-blur-sm shadow-sm">Planned</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-100 dark:divide-zinc-800">
                          {filteredPendingData.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/60 transition-colors border-b border-gray-100 dark:border-zinc-800 text-gray-700 dark:text-zinc-300">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  <Button size="sm" className="bg-[#2fa36b] hover:bg-[#268a59]" onClick={() => openArrangeDialog(item)}>Arrange</Button>
                                  {isSuperAdmin && (
                                    <button onClick={() => setSuperAdminEditItem(item)} className="inline-flex items-center px-2 py-1 bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 text-xs font-medium rounded-md hover:bg-purple-200 dark:hover:bg-purple-500/20 border border-purple-300 dark:border-purple-500/30">
                                      <ShieldCheck className="h-3 w-3 mr-1" />Edit
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">{item.poNumber || item.indentId}</td>
                              <td className="px-4 py-3">{item.firmName}</td>
                              <td className="px-4 py-3">{item.vendorName}</td>
                              <td className="px-4 py-3">{item.material}</td>
                              <td className="px-4 py-3">{item.totalQuantity || "-"}</td>
                              <td className="px-4 py-3">{item.totalAmount || "-"}</td>
                              <td className="px-4 py-3">{formatDateTime(item.plannedLogistics)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="history" className="flex-1 mt-0">
              {loading ? (
                <div className="flex items-center justify-center py-10 text-sm text-gray-500 dark:text-zinc-400">
                  <Loader2 className="h-5 w-5 mr-2 animate-spin text-[#2fa36b]" />
                  Loading logistics history...
                </div>
              ) : !filteredHistoryData.length ? (
                <div className="p-6 rounded-lg border border-dashed bg-secondary/50 text-center">
                  <Info className="h-10 w-10 text-[#2fa36b] mx-auto mb-3" />
                  <p className="font-semibold">No logistics history yet</p>
                </div>
              ) : (
                <Card className="flex-1 flex flex-col">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="flex items-center text-base">
                      <History className="w-5 h-5 mr-2 text-[#2fa36b]" />
                      Logistics History ({filteredHistoryData.length})
                    </CardTitle>

                  </CardHeader>
                  <CardContent className="p-0 flex-1 overflow-hidden">
                    <div className="overflow-auto max-h-[calc(100vh-450px)] relative custom-scrollbar">
                      <table className="w-full text-sm border-collapse">
                        <thead className="sticky top-0 z-30">
                          <tr className="bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-800">
                            <th className="px-4 py-3 text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase text-left bg-gray-50/95 dark:bg-zinc-800/95 backdrop-blur-sm shadow-sm">View</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase text-left bg-gray-50/95 dark:bg-zinc-800/95 backdrop-blur-sm shadow-sm">Status</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase text-left bg-gray-50/95 dark:bg-zinc-800/95 backdrop-blur-sm shadow-sm">PO Number</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase text-left bg-gray-50/95 dark:bg-zinc-800/95 backdrop-blur-sm shadow-sm">Firm Name</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase text-left bg-gray-50/95 dark:bg-zinc-800/95 backdrop-blur-sm shadow-sm">Vendor</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase text-left bg-gray-50/95 dark:bg-zinc-800/95 backdrop-blur-sm shadow-sm">Material</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase text-left bg-gray-50/95 dark:bg-zinc-800/95 backdrop-blur-sm shadow-sm">Selected Transporter</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase text-left bg-gray-50/95 dark:bg-zinc-800/95 backdrop-blur-sm shadow-sm">Cost</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase text-left bg-gray-50/95 dark:bg-zinc-800/95 backdrop-blur-sm shadow-sm">Date</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-100 dark:divide-zinc-800">
                          {filteredHistoryData.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/60 transition-colors border-b border-gray-100 dark:border-zinc-800 text-gray-700 dark:text-zinc-300">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  <Button variant="outline" size="sm" onClick={() => openHistoryDialog(item)}>View</Button>
                                  {isSuperAdmin && (
                                    <button onClick={() => setSuperAdminEditItem(item)} className="inline-flex items-center px-2 py-1 bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 text-xs font-medium rounded-md hover:bg-purple-200 dark:hover:bg-purple-500/20 border border-purple-300 dark:border-purple-500/30">
                                      <ShieldCheck className="h-3 w-3 mr-1" />Edit
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {item.actualLogistics ? (
                                  <Badge className="bg-green-100 dark:bg-emerald-500/10 text-green-700 dark:text-emerald-400 border-green-200 dark:border-emerald-500/20 text-xs">Approved</Badge>
                                ) : (
                                  <Badge className="bg-yellow-100 dark:bg-amber-500/10 text-yellow-700 dark:text-amber-400 border-yellow-200 dark:border-amber-500/20 text-xs">Pending Approval</Badge>
                                )}
                              </td>
                              <td className="px-4 py-3">{item.poNumber || item.indentId}</td>
                              <td className="px-4 py-3">{item.firmName}</td>
                              <td className="px-4 py-3">{item.vendorName}</td>
                              <td className="px-4 py-3">{item.material}</td>
                              <td className="px-4 py-3">{item.selectedTransporter?.name || "-"}</td>
                              <td className="px-4 py-3">{item.selectedTransporter?.cost || "-"}</td>
                              <td className="px-4 py-3">{formatDateTime(item.actualLogistics || item.planned9)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Sheet open={openDialog} onOpenChange={setOpenDialog}>
        <SheetContent className="sm:max-w-7xl max-h-[94vh] overflow-y-auto p-0">
          {selectedIndent && (
            <div className="flex flex-col">
              <SheetHeader className="p-6 pb-3 border-b">
                <SheetTitle className="text-xl font-semibold flex items-center gap-2"><Truck className="h-5 w-5 text-[#2fa36b]" />Arrange Logistics for {selectedIndent.poNumber || selectedIndent.indentId}</SheetTitle>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 text-sm">
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-zinc-800"><span className="block text-xs text-gray-500 dark:text-zinc-400">Vendor</span><span className="font-medium">{selectedIndent.vendorName}</span></div>
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-zinc-800"><span className="block text-xs text-gray-500 dark:text-zinc-400">Material</span><span className="font-medium">{selectedIndent.material}</span></div>
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-zinc-800"><span className="block text-xs text-gray-500 dark:text-zinc-400">PO Qty</span><span className="font-medium">{selectedIndent.totalQuantity || "-"}</span></div>
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-zinc-800"><span className="block text-xs text-gray-500 dark:text-zinc-400">PO Amount</span><span className="font-medium">{selectedIndent.totalAmount || "-"}</span></div>
                </div>
              </SheetHeader>

              <div className="px-6 pt-4">
                {lowestCost !== null && <Button onClick={quickSelectLowestCost} className="w-full mb-4 bg-green-600 hover:bg-green-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white" size="sm"><TrendingDown className="w-4 h-4 mr-2" />Select Lowest Cost (Rs {lowestCost})</Button>}
                <div className="flex justify-between items-center mb-3"><div><p className="text-sm font-medium text-gray-700 dark:text-zinc-300">Transporter Options</p><p className="text-xs text-gray-500 dark:text-zinc-400">Starts with 3 transporters and can scale up to {MAX_TRANSPORTERS}.</p></div><Button variant="outline" size="sm" onClick={addTransporterSlot}><Plus className="h-4 w-4 mr-1" />Add Transporter</Button></div>
              </div>

              <div className="flex-1 px-6 pb-4 overflow-y-auto">
                <div className="grid gap-4 lg:grid-cols-3">
                  {transporterForms.map((currentTransporter, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setSelectedTransporterIndex(idx)}
                      className={`p-4 border rounded-xl transition-all cursor-pointer ${
                        selectedTransporterIndex === idx
                          ? "border-[#2fa36b] bg-green-50 dark:bg-emerald-500/10 shadow-sm ring-1 ring-[#2fa36b]"
                          : "border-gray-200 dark:border-zinc-700 bg-gray-50/30 dark:bg-zinc-800/30 hover:border-gray-300 dark:hover:border-zinc-600"
                      } space-y-4`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-700 dark:text-zinc-300">Transporter {idx + 1}</span>
                        {selectedTransporterIndex === idx && <Badge className="text-white bg-[#2fa36b] hover:bg-[#2fa36b]">Selected</Badge>}
                        {transporterForms.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); removeTransporterSlot(idx); }}
                            className="h-7 w-7 p-0 text-red-400 hover:text-red-500 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/20"
                          >
                            <Trash size={16} className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      {/* Transporter Name - Custom Dropdown */}
                      <div
                        ref={transporterDropdownRefs[idx]}
                        className="relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="w-full flex items-center justify-between rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 h-9 text-sm font-normal text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTransporterDropdownOpen((prev) =>
                              prev.map((v, i) => i === idx ? !v : v)
                            );
                          }}
                        >
                          <span className="truncate">{currentTransporter.name || "Select transporter"}</span>
                          <ChevronsUpDown className="w-4 h-4 ml-2 opacity-50 shrink-0" />
                        </button>
                        {transporterDropdownOpen[idx] && (
                          <div className="absolute z-[200] left-0 right-0 top-full mt-1 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg">
                            <div className="p-2">
                              <input
                                autoFocus
                                type="text"
                                value={transporterSearchTerms[idx] || ""}
                                onChange={(e) =>
                                  setTransporterSearchTerms((prev) =>
                                    prev.map((term, index) => index === idx ? e.target.value : term)
                                  )
                                }
                                placeholder="Search transporter..."
                                className="w-full rounded-md border border-gray-200 dark:border-zinc-600 px-3 py-1.5 text-xs outline-none focus:border-gray-400 dark:bg-zinc-800 dark:text-zinc-200"
                              />
                            </div>
                            <div className="max-h-60 overflow-y-auto px-2 pb-2">
                              {transporterMasterOptions
                                .filter((transporter) => transporter.name.toLowerCase().includes((transporterSearchTerms[idx] || "").trim().toLowerCase()))
                                .map((transporter, transporterIndex) => (
                                  <button
                                    key={`${idx}-${transporterIndex}`}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      applyTransporterMasterSelection(idx, transporter.name);
                                      setTransporterSearchTerms((prev) => prev.map((term, index) => index === idx ? "" : term));
                                      setTransporterDropdownOpen((prev) => prev.map((v, i) => i === idx ? false : v));
                                    }}
                                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-zinc-800"
                                  >
                                    <span>{transporter.name}</span>
                                    {currentTransporter.name === transporter.name && <Check className="w-4 h-4 text-primary" />}
                                  </button>
                                ))}
                              {transporterMasterOptions.filter((t) =>
                                t.name.toLowerCase().includes((transporterSearchTerms[idx] || "").trim().toLowerCase())
                              ).length === 0 && (
                                <p className="px-3 py-2 text-xs text-gray-400">No transporters found</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="block mb-1 text-[10px] font-medium text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Rate Type</Label>
                          <Select value={currentTransporter.rateType || undefined} onValueChange={(value) => updateTransporterForm(idx, "rateType", value)}>
                            <SelectTrigger className="text-sm border-gray-200 dark:border-zinc-700 h-9 bg-white dark:bg-zinc-900" onClick={(e) => e.stopPropagation()}>
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fixed">Fixed</SelectItem>
                              <SelectItem value="per mt">Per MT</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="block mb-1 text-[10px] font-medium text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Entered Rate</Label>
                          <Input
                            value={currentTransporter.cost}
                            onChange={(e) => updateTransporterForm(idx, "cost", e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm border-gray-200 dark:border-zinc-700 h-9 bg-white dark:bg-zinc-900"
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      <div className="pt-3 border-t border-gray-100 dark:border-zinc-800 space-y-2">
                        {(() => {
                          const qty = Number(selectedIndent?.totalQuantity) || 1;
                          const entered = Number(currentTransporter.cost) || 0;
                          const isFixed = currentTransporter.rateType === "fixed";
                          
                          const totalCost = isFixed ? entered : entered * qty;
                          const ratePerMt = isFixed ? (entered / qty) : entered;

                          return (
                            <>
                              <div className="flex justify-between items-center p-2 rounded-lg bg-[#2fa36b]/10 border border-[#2fa36b]/20">
                                <span className="text-xs font-medium text-[#2fa36b]">Rate per MT:</span>
                                <span className="text-base font-bold text-[#2fa36b]">₹{money(ratePerMt)}</span>
                              </div>
                              <div className="flex justify-between items-center px-2 text-xs">
                                <span className="text-gray-500 dark:text-zinc-400 italic">Total Est. Cost:</span>
                                <span className="font-semibold text-gray-700 dark:text-zinc-300">₹{money(totalCost)}</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sticky bottom-0 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 p-4 px-6 flex justify-end gap-3 rounded-b-2xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]"><Button variant="outline" onClick={closeDialog} className="px-6">Cancel</Button><Button onClick={onSubmit} disabled={isSubmitting || !transporterForms.some((item) => item.name)} className="px-6 bg-[#2fa36b] hover:bg-[#268a59] text-white">{isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Submit for Approval</Button></div>
            </div>
          )}

          {selectedHistory && <div className="p-6 space-y-4"><SheetHeader className="p-0"><SheetTitle className="text-lg font-semibold">Logistics Arrangement Summary</SheetTitle></SheetHeader><div className="grid grid-cols-2 gap-3 text-sm"><div className="p-3 rounded-lg bg-gray-50 dark:bg-zinc-800"><span className="block text-xs text-gray-500 dark:text-zinc-400">PO Number</span><span className="font-medium">{selectedHistory.poNumber || selectedHistory.indentId}</span></div><div className="p-3 rounded-lg bg-gray-50 dark:bg-zinc-800"><span className="block text-xs text-gray-500 dark:text-zinc-400">Transporter</span><span className="font-medium">{selectedHistory.selectedTransporter?.name || "-"}</span></div><div className="p-3 rounded-lg bg-gray-50 dark:bg-zinc-800"><span className="block text-xs text-gray-500 dark:text-zinc-400">Cost</span><span className="font-medium">{selectedHistory.selectedTransporter?.cost || "-"}</span></div><div className="p-3 rounded-lg bg-gray-50 dark:bg-zinc-800"><span className="block text-xs text-gray-500 dark:text-zinc-400">Completed</span><span className="font-medium">{formatDateTime(selectedHistory.actualLogistics)}</span></div></div><div className="flex justify-end"><Button variant="outline" onClick={closeDialog}>Close</Button></div></div>}
        </SheetContent>
      </Sheet>
    </div>
  );
}
