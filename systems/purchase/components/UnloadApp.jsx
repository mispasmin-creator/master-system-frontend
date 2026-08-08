"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, History, Info, Loader2, Search, Undo2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { canViewFirm } from "../utils/firmFilter";
import { API_URL, getToken } from "@/lib/auth";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(",", "");
};

const statusTone = (status) => {
  const value = String(status || "").toLowerCase();
  if (value === "approved") return "bg-emerald-100 text-emerald-700";
  if (value === "rejected") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
};

export default function ManagementUnloadApproval() {
  const { user } = useAuth();
  const { updateCount } = useNotification();
  const [pendingData, setPendingData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRow, setSelectedRow] = useState(null);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/purchase/unload-approval/data`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);
      
      const formatTimestamp = (dateValue) => {
        if (!dateValue) return "";
        try {
          const d = new Date(dateValue);
          if (!isNaN(d.getTime())) return d.toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).replace(/,/g, "");
        } catch (e) { return String(dateValue); }
        return String(dateValue);
      };

      const mapData = (list) => list.map(l => ({
        id: l.id, _dbId: l.id,
        liftNo: l.liftNo || '', indentNo: l.indentNo || '', vendorName: l.vendorName || '',
        rawMaterialName: l.rawMaterialName || '', firmName: l.firmName || '',
        physicalCondition: l.physicalCondition || '', moisture: l.moisture || '',
        receiptTime: formatTimestamp(l.dateOfReceiving),
        plannedUnloadApproval: l.plannedUnloadApproval || '',
        actualUnloadApproval: formatTimestamp(l.actualUnloadApproval),
        unloadApprovalRequired: l.unloadApprovalRequired || 'Yes',
        unloadApprovalStatus: l.unloadApprovalStatus || 'Pending',
        unloadApprovalTrigger: l.unloadApprovalTrigger || '',
        unloadApprovalRemarks: l.unloadApprovalRemarks || '',
        unloadApprovalBy: l.unloadApprovalBy || ''
      }));

      let pending = mapData(json.data.pending || []);
      let history = mapData(json.data.history || []);

      if (user?.firmName) {
        pending = pending.filter((row) => canViewFirm(user.firmName, row.firmName));
        history = history.filter((row) => canViewFirm(user.firmName, row.firmName));
      }

      setPendingData(pending);
      setHistoryData(history);
      updateCount("unload-management", pending.length);
    } catch (fetchErr) {
      console.error("Error fetching unload approvals:", fetchErr);
      setError(fetchErr.message || "Failed to load unload approvals");
    } finally {
      setLoading(false);
    }
  }, [updateCount, user]);
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredPending = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return pendingData.filter(
      (item) =>
        item.liftNo.toLowerCase().includes(query) ||
        item.indentNo.toLowerCase().includes(query) ||
        item.vendorName.toLowerCase().includes(query) ||
        item.rawMaterialName.toLowerCase().includes(query) ||
        item.unloadApprovalTrigger.toLowerCase().includes(query),
    );
  }, [pendingData, searchQuery]);

  const filteredHistory = useMemo(() => {
    const query = historySearchQuery.trim().toLowerCase();
    return historyData.filter(
      (item) =>
        item.liftNo.toLowerCase().includes(query) ||
        item.indentNo.toLowerCase().includes(query) ||
        item.vendorName.toLowerCase().includes(query) ||
        item.rawMaterialName.toLowerCase().includes(query) ||
        item.unloadApprovalStatus.toLowerCase().includes(query),
    );
  }, [historyData, historySearchQuery]);

  const handleRevert = async (liftId) => {
    try {
      toast.loading("Reverting unload approval...", { id: "revert-unload" });
      const res = await fetch(`${API_URL}/purchase/unload-approval/revert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ liftId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to revert");

      toast.success(data.message || "Unload approval reverted successfully", {
        id: "revert-unload",
      });
      fetchData();
    } catch (error) {
      toast.error("Revert Failed", {
        description: error.message,
        id: "revert-unload",
      });
    }
  };

  const submitDecision = async (status) => {
    if (!selectedRow) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/purchase/unload-approval/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          liftId: selectedRow._dbId || selectedRow.id,
          status,
          remarks: decisionNotes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);

      toast.success("Decision Submitted", { description: `Lift ${selectedRow.liftNo} has been ${status.toLowerCase()}` });
      setSelectedRow(null);
      setDecisionNotes("");
      fetchData();
    } catch (err) {
      toast.error("Failed to submit decision", { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTable = (rows, isHistory = false) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#2fa36b]" />
        </div>
      );
    }
    if (error) {
      return (
        <div className="p-6 text-center border border-red-200 rounded-xl bg-red-50">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-red-500" />
          <p className="font-medium text-red-700">{error}</p>
        </div>
      );
    }
    if (!rows.length) {
      return (
        <div className="py-12 text-center border border-gray-200 border-dashed rounded-xl">
          <Info className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500">
            {isHistory
              ? "No unload approval history yet."
              : "No pending unload approvals."}
          </p>
        </div>
      );
    }
    return (
      <div className="overflow-auto max-h-[calc(100vh-450px)] relative custom-scrollbar border border-gray-200 rounded-xl">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-30">
            <tr className="bg-gray-50 border-b border-gray-200">
              {!isHistory && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Action</th>}
              <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Lift</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">RI Number</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Firm</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Vendor</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Material</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Trigger</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Status</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">{isHistory ? "Closed On" : "Receipt On"}</th>
              {isHistory && user?.role === "SuperAdmin" && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Action</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {rows.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                {!isHistory && (
                  <td className="px-4 py-3">
                    <Button
                      className="bg-[#2fa36b] hover:bg-[#268a59] h-8 px-3 text-xs"
                      onClick={() => {
                        setSelectedRow(item);
                        setDecisionNotes(item.unloadApprovalRemarks || "");
                      }}
                    >
                      Review
                    </Button>
                  </td>
                )}
                <td className="px-4 py-3 font-medium text-primary text-xs">{item.liftNo}</td>
                <td className="px-4 py-3 text-gray-700 text-xs">{item.indentNo || "-"}</td>
                <td className="px-4 py-3 text-gray-700 text-xs">{item.firmName || "-"}</td>
                <td className="px-4 py-3 text-gray-700 text-xs">{item.vendorName || "-"}</td>
                <td className="px-4 py-3 text-gray-700 text-xs">{item.rawMaterialName || "-"}</td>
                <td className="px-4 py-3 text-gray-700 text-xs truncate max-w-[150px]">{item.unloadApprovalTrigger || "-"}</td>
                <td className="px-4 py-3">
                  <Badge className={`${statusTone(item.unloadApprovalStatus)} font-normal text-[10px] px-2 py-0.5`}>
                    {item.unloadApprovalStatus || "Pending"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-gray-600 text-[11px] whitespace-nowrap">
                  {formatDateTime(
                    isHistory
                      ? item.actualUnloadApproval
                      : item.receiptTime || item.plannedUnloadApproval,
                  )}
                </td>
                {isHistory && user?.role === "SuperAdmin" && (
                  <td className="px-4 py-3">
                    {item.canRevert !== false && (
                      <button
                        onClick={() => {
                          if (window.confirm("Are you sure you want to revert this unload approval?")) {
                            handleRevert(item._dbId || item.id || item.liftId);
                          }
                        }}
                        className="inline-flex items-center px-2 py-1.5 bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-xs font-medium rounded-lg hover:bg-red-200 dark:hover:bg-red-500/20 border border-red-300 dark:border-red-500/30"
                      >
                        <Undo2 className="w-3 h-3 mr-1" />Revert
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <Card className="w-full max-w-full mx-auto bg-white border border-gray-200 rounded-lg shadow-md">
      <CardHeader className="p-4 border-b border-gray-200">
        <CardTitle className="flex items-center gap-2 text-lg text-gray-800">
            <AlertTriangle className="h-5 w-5 text-[#2fa36b]" />
            Unload App.
          </CardTitle>
        
      </CardHeader>

      <CardContent className="p-4">
        <Tabs defaultValue="pending">
          <TabsList className="mb-4">
            <TabsTrigger value="pending" className="gap-2">
              Pending <Badge variant="secondary">{filteredPending.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              History <Badge variant="secondary">{filteredHistory.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <div className="relative">
              <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
              <Input
                className="pl-9"
                placeholder="Search lift, PO, vendor, trigger..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {renderTable(filteredPending)}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="relative">
              <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
              <Input
                className="pl-9"
                placeholder="Search lift history..."
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
              />
            </div>
            {renderTable(filteredHistory, true)}
          </TabsContent>
        </Tabs>
      </CardContent>

      <Sheet
        open={!!selectedRow}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRow(null);
            setDecisionNotes("");
          }
        }}
      >
        <SheetContent className="sm:max-w-2xl">
          {selectedRow && (
            <>
              <SheetHeader>
                <SheetTitle>Unload Approval Review</SheetTitle>
                <SheetDescription>
                  Approve or reject unload for lift{" "}
                  <span className="font-medium">{selectedRow.liftNo}</span>.
                </SheetDescription>
              </SheetHeader>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-gray-50">
                  <span className="block text-xs text-gray-500">Vendor</span>
                  <span className="font-medium">{selectedRow.vendorName}</span>
                </div>
                <div className="p-3 rounded-lg bg-gray-50">
                  <span className="block text-xs text-gray-500">Material</span>
                  <span className="font-medium">
                    {selectedRow.rawMaterialName}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-gray-50">
                  <span className="block text-xs text-gray-500">
                    Physical Condition
                  </span>
                  <span className="font-medium">
                    {selectedRow.physicalCondition || "-"}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-gray-50">
                  <span className="block text-xs text-gray-500">Moisture</span>
                  <span className="font-medium">
                    {selectedRow.moisture || "-"}
                  </span>
                </div>
                <div className="col-span-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <span className="block text-xs text-amber-700">Trigger</span>
                  <span className="font-medium text-amber-800">
                    {selectedRow.unloadApprovalTrigger || "-"}
                  </span>
                </div>
              </div>

              <div>
                <Textarea
                  placeholder="Decision remarks"
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                />
              </div>

              <SheetFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedRow(null);
                    setDecisionNotes("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => submitDecision("Rejected")}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Reject
                </Button>
                <Button
                  className="bg-[#2fa36b] hover:bg-[#268a59]"
                  onClick={() => submitDecision("Approved")}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Approve
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </Card>
  );
}
