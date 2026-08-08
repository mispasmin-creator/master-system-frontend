"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { API_URL, getToken } from "@/lib/auth";
import { canViewFirm } from "../utils/firmFilter";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "./ui/sheet";

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

export default function LogisticsApproval() {
  const [pendingData, setPendingData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [filteredPendingData, setFilteredPendingData] = useState([]);
  const [filteredHistoryData, setFilteredHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshData, setRefreshData] = useState(false);
  const [selectedIndent, setSelectedIndent] = useState(null);
  const [selectedTransporterIndex, setSelectedTransporterIndex] =
    useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const { user } = useAuth();
  const { updateCount } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/purchase/logistics-approval/data`);
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
      updateCount("logistics-approval", pending.length);
    } catch (fetchErr) {
      console.error("Error fetching logistics approval data:", fetchErr);
      setError(`Failed to load data: ${fetchErr.message}`);
      toast.error("Failed to load data", { description: fetchErr.message });
    } finally {
      setLoading(false);
    }
  }, [user, updateCount]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshData]);


  useEffect(() => {
    const query = searchQuery.toLowerCase();
    setFilteredPendingData(
      pendingData.filter(
        (item) =>
          item.indentId.toLowerCase().includes(query) ||
          item.firmName.toLowerCase().includes(query) ||
          item.vendorName.toLowerCase().includes(query) ||
          item.material.toLowerCase().includes(query),
      ),
    );
  }, [pendingData, searchQuery]);

  useEffect(() => {
    const query = historySearchQuery.toLowerCase();
    setFilteredHistoryData(
      historyData.filter(
        (item) =>
          item.indentId.toLowerCase().includes(query) ||
          item.firmName.toLowerCase().includes(query) ||
          item.vendorName.toLowerCase().includes(query) ||
          item.material.toLowerCase().includes(query),
      ),
    );
  }, [historyData, historySearchQuery]);

  const onApprove = async () => {
    if (!selectedIndent || selectedTransporterIndex === null) {
      toast.error("Please select a transporter");
      return;
    }

    const selectedTransporter =
      selectedIndent.logisticsOptions[selectedTransporterIndex];
    if (!selectedTransporter) {
      toast.error("Invalid transporter selection");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/purchase/logistics-approval/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          indentIds: selectedIndent.rowIds,
          selectedTransporter,
          selectedTransporterIndex,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Approval failed");

      toast.success(`Logistics approved for ${selectedIndent.poNumber}`);
      setOpenDialog(false);
      setRefreshData((prev) => !prev);
    } catch (err) {
      console.error("Error approving logistics:", err);
      toast.error("Approval failed", { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col bg-slate-50">
      <Card className="shadow-md border border-gray-200 flex-1 flex flex-col bg-white">
        <CardHeader className="p-4 border-b border-gray-200">
          <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-[#2fa36b]" />
            Logistics App.
          </CardTitle>
          
        </CardHeader>
        <CardContent className="p-4 flex-1 flex flex-col">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col"
          >
            <TabsList className="grid w-full sm:w-[400px] grid-cols-2 mb-4">
              <TabsTrigger value="pending" className="gap-2">
                Pending{" "}
                <Badge variant="secondary" className="ml-2">
                  {filteredPendingData.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                History{" "}
                <Badge variant="secondary" className="ml-2">
                  {filteredHistoryData.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <div className="mb-4">
              <div className="relative max-w-sm">
                <Search className="absolute h-4 w-4 left-3 top-2.5 text-gray-400" />
                <Input
                  value={
                    activeTab === "pending" ? searchQuery : historySearchQuery
                  }
                  onChange={(e) =>
                    activeTab === "pending"
                      ? setSearchQuery(e.target.value)
                      : setHistorySearchQuery(e.target.value)
                  }
                  className="pl-9 bg-white"
                  placeholder="Search by PO, Vendor, material..."
                />
              </div>
            </div>

            <TabsContent value="pending" className="flex-1 mt-0">
              {loading ? (
                <div className="flex items-center justify-center py-10 text-sm text-gray-500">
                  <Loader2 className="h-5 w-5 mr-2 animate-spin text-[#2fa36b]" />
                  Loading pending approvals...
                </div>
              ) : error ? (
                <div className="p-6 rounded-lg border border-dashed border-red-200 bg-red-50 text-red-700 flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5" />
                  {error}
                </div>
              ) : !filteredPendingData.length ? (
                <div className="p-6 rounded-lg border border-dashed bg-secondary/50 text-center">
                  <Info className="h-10 w-10 text-[#2fa36b] mx-auto mb-3" />
                  <p className="font-semibold">No logistics pending approval</p>
                </div>
              ) : (
                <div className="overflow-auto border border-gray-200 rounded-xl max-h-[calc(100vh-450px)] relative custom-scrollbar">
                  <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 z-30">
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Action</th>
                        <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">PO Number</th>
                        <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Firm</th>
                        <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Vendor</th>
                        <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Material</th>
                        <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Proposed Transporter</th>
                        <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Proposed Rate</th>
                        <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Submitted On</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {filteredPendingData.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                          <td className="px-4 py-3">
                            <Button
                              size="sm"
                              className="bg-[#2fa36b] hover:bg-[#268a59]"
                              onClick={() => {
                                setSelectedIndent(item);
                                setSelectedTransporterIndex(
                                  item.proposedTransporterIndex ?? 0,
                                );
                                setOpenDialog(true);
                              }}
                            >
                              Review
                            </Button>
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {item.poNumber}
                          </td>
                          <td className="px-4 py-3">{item.firmName}</td>
                          <td className="px-4 py-3">{item.vendorName}</td>
                          <td className="px-4 py-3">{item.material}</td>
                          <td className="px-4 py-3">
                            {item.proposedTransporter?.name || "-"}
                          </td>
                          <td className="px-4 py-3">
                            Rs {item.proposedTransporter?.cost || "-"}
                          </td>
                          <td className="px-4 py-3">{formatDateTime(item.planned9)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="flex-1 mt-0">
              <div className="overflow-auto border border-gray-200 rounded-xl max-h-[calc(100vh-450px)] relative custom-scrollbar">
                <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 z-30">
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">PO Number</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Firm</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Vendor</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Material</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Approved Transporter</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Rate</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Approved On</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredHistoryData.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                        <td className="px-4 py-3 font-medium">
                          {item.poNumber}
                        </td>
                        <td className="px-4 py-3">{item.firmName}</td>
                        <td className="px-4 py-3">{item.vendorName}</td>
                        <td className="px-4 py-3">{item.material}</td>
                        <td className="px-4 py-3">
                          {item.selectedTransporter?.name || "-"}
                        </td>
                        <td className="px-4 py-3">
                          Rs {item.selectedTransporter?.cost || "-"}
                        </td>
                        <td className="px-4 py-3">{formatDateTime(item.actual9)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Sheet open={openDialog} onOpenChange={setOpenDialog}>
        <SheetContent className="sm:max-w-xl p-0 flex flex-col">
          {selectedIndent && (
            <>
              <SheetHeader className="p-6 border-b border-gray-100 dark:border-zinc-800 flex-shrink-0 bg-white dark:bg-zinc-950">
                <SheetTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                  <Truck className="h-5 w-5 text-brand" />
                  Approve Logistics for {selectedIndent.poNumber}
                </SheetTitle>
                <div className="grid grid-cols-2 gap-4 mt-4 text-sm bg-slate-50 dark:bg-zinc-900/50 border border-gray-100 dark:border-zinc-800/80 p-4 rounded-xl">
                  <div>
                    <Label className="text-gray-500 dark:text-zinc-400">Vendor</Label>
                    <p className="font-medium text-gray-900 dark:text-white mt-1">{selectedIndent.vendorName}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 dark:text-zinc-400">Material</Label>
                    <p className="font-medium text-gray-900 dark:text-white mt-1">{selectedIndent.material}</p>
                  </div>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-gray-50/50 dark:bg-zinc-950/50">
                <Label className="mb-4 block text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                  Comparison of Proposed Options
                </Label>
                <div className="grid grid-cols-1 gap-4">
                  {selectedIndent.logisticsOptions.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedTransporterIndex(idx)}
                      className={`p-4 border rounded-xl text-left transition-all relative overflow-hidden ${
                        selectedTransporterIndex === idx
                          ? "border-brand bg-brand-soft ring-1 ring-brand shadow-sm"
                          : "border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900/60 shadow-sm"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2 relative z-10">
                        <span className={`font-bold ${selectedTransporterIndex === idx ? 'text-brand-deep dark:text-white' : 'text-gray-900 dark:text-white'}`}>
                          {opt.name}
                        </span>
                        {selectedIndent.proposedTransporterIndex === idx && (
                          <Badge
                            variant="secondary"
                            className={selectedTransporterIndex === idx ? "bg-brand/20 text-brand-deep dark:text-white border-none" : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-none"}
                          >
                            Proposed
                          </Badge>
                        )}
                      </div>
                      <div className="flex justify-between items-center text-sm relative z-10">
                        <span className="text-gray-500 dark:text-zinc-400 font-medium">{opt.rateType}</span>
                        <span className={`text-lg font-bold ${selectedTransporterIndex === idx ? 'text-brand-deep dark:text-[#5ec792]' : 'text-gray-900 dark:text-white'}`}>
                          Rs {opt.cost}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <SheetFooter className="p-6 border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex-shrink-0">
                <Button variant="outline" className="dark:border-zinc-700 dark:hover:bg-zinc-800" onClick={() => setOpenDialog(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-brand hover:bg-brand-dark text-white"
                  onClick={onApprove}
                  disabled={isSubmitting || selectedTransporterIndex === null}
                >
                  {isSubmitting && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Approve Selected
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
