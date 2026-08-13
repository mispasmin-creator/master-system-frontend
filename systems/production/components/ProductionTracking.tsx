"use client"
import React, { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import {
  Search,
  Filter,
  Plus,
  Loader2,
  Calendar as CalendarIcon,
  XCircle,
  Eye,
  Trash2
} from "lucide-react";
import { productionApi } from "@/systems/production/lib/api";
import { useAuth, FIRM_MAP } from "@/systems/production/context/AuthContext";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/systems/production/components/ui/tabs";
import { Button } from "@/systems/production/components/ui/button";
import { Input } from "@/systems/production/components/ui/input";
import { Label } from "@/systems/production/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/systems/production/components/ui/select";
import { Textarea } from "@/systems/production/components/ui/textarea";
import { Calendar } from "@/systems/production/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/systems/production/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/systems/production/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/systems/production/components/ui/card";
import { Badge } from "@/systems/production/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody, SheetFooter } from "@/systems/production/components/ui/sheet";
import { cn } from "@/systems/production/lib/utils";
import { useToast } from "@/systems/production/components/ui/use-toast";

export default function ProductionTracking() {
  const { user } = useAuth();
  const { toast } = useToast();
  // State
  const [activeTab, setActiveTab] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [rmSummary, setRmSummary] = useState<any[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [firmFilter, setFirmFilter] = useState("all");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });

  // Log Dialog
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [selectedJobCard, setSelectedJobCard] = useState<any>(null);

  const [logForm, setLogForm] = useState({
    quantityFg: "",
    machineHours: "",
    dateOfProduction: new Date(),
    supervisorName: "",
    remarks: "",
    materials: [{ materialName: "", quantity: "" }]
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pendingRes, historyRes, rmRes] = await Promise.all([
        productionApi.get("production_tracking_pending"),
        productionApi.get("production_tracking_history"),
        productionApi.get("production_tracking_rm_summary")
      ]);

      setPendingItems(pendingRes.data || []);
      setHistoryItems(historyRes.data || []);
      setRmSummary(rmRes.data || []);
    } catch (err: any) {
      toast({ title: "Error!", description: err.message || "Failed to fetch production data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openLogDialog = (item: any) => {
    setSelectedJobCard(item);
    setLogForm({
      quantityFg: "",
      machineHours: "",
      dateOfProduction: new Date(),
      supervisorName: user?.username || "",
      remarks: "",
      materials: [{ materialName: "", quantity: "" }]
    });
    setIsLogDialogOpen(true);
  };

  const handleMaterialChange = (index: number, field: string, value: string) => {
    const newMaterials = [...logForm.materials];
    newMaterials[index] = { ...newMaterials[index], [field]: value };
    setLogForm({ ...logForm, materials: newMaterials });
  };

  const addMaterialRow = () => {
    setLogForm({
      ...logForm,
      materials: [...logForm.materials, { materialName: "", quantity: "" }]
    });
  };

  const removeMaterialRow = (index: number) => {
    const newMaterials = logForm.materials.filter((_, i) => i !== index);
    setLogForm({ ...logForm, materials: newMaterials });
  };

  const submitLog = async () => {
    if (!logForm.quantityFg) {
      toast({ title: "Error!", description: "Quantity FG is required", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        jobCardId: selectedJobCard.id,
        quantityFg: logForm.quantityFg,
        machineHours: logForm.machineHours,
        dateOfProduction: logForm.dateOfProduction,
        supervisorName: logForm.supervisorName,
        remarks: logForm.remarks,
        materials: logForm.materials.filter(m => m.materialName && m.quantity)
      };

      await productionApi.post("production_tracking_log", payload);
      toast({ title: "Success!", description: "Production log submitted successfully" });
      setIsLogDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Error!", description: err.message || "Failed to submit log", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter Logic
  const filteredPending = useMemo(() => {
    return pendingItems.filter(item => {
      const matchesSearch = !searchQuery ||
        item.jobCardNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.deliveryOrderNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.productName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFirm = firmFilter === "all" || item.firmName === firmFilter;

      return matchesSearch && matchesFirm;
    });
  }, [pendingItems, searchQuery, firmFilter]);

  const filteredHistory = useMemo(() => {
    return historyItems.filter(item => {
      const matchesSearch = !searchQuery ||
        item.jobCardNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.deliveryOrderNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.productName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFirm = firmFilter === "all" || item.firmName === firmFilter;

      let matchesDate = true;
      if (dateRange.from && item.dateOfProduction) {
        const itemDate = new Date(item.dateOfProduction);
        if (dateRange.to) {
          matchesDate = itemDate >= dateRange.from && itemDate <= dateRange.to;
        } else {
          matchesDate = itemDate.toDateString() === dateRange.from.toDateString();
        }
      }

      return matchesSearch && matchesFirm && matchesDate;
    });
  }, [historyItems, searchQuery, firmFilter, dateRange]);

  const filteredRmSummary = useMemo(() => {
    return rmSummary.filter(item => {
      return !searchQuery || item.materialName?.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [rmSummary, searchQuery]);

  return (
    <div className="space-y-6">


      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search JC No, DO No, Product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700"
          />
        </div>

        <div className="w-full sm:w-48">
          <Select value={firmFilter} onValueChange={setFirmFilter}>
            <SelectTrigger className="bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700">
              <SelectValue placeholder="All Firms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Firms</SelectItem>
              {Object.keys(FIRM_MAP).map(f => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(activeTab === "history" || activeTab === "rm-summary") && (
          <div className="w-full sm:w-64">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700", !dateRange.from && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range: any) => setDateRange(range || { from: undefined, to: undefined })}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-[600px] mb-6 h-11 p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg">
          <TabsTrigger value="pending" className="rounded-md font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:shadow-sm">
            Pending <Badge variant="secondary" className="ml-2 bg-zinc-200 dark:bg-zinc-600 text-xs">{pendingItems.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-md font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:shadow-sm">
            History <Badge variant="secondary" className="ml-2 bg-zinc-200 dark:bg-zinc-600 text-xs">{historyItems.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="rm-summary" className="rounded-md font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:shadow-sm">
            RM Summary <Badge variant="secondary" className="ml-2 bg-zinc-200 dark:bg-zinc-600 text-xs">{rmSummary.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <Card className="border-none shadow-sm">
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </div>
          ) : (
            <>
              {/* PENDING TAB */}
              <TabsContent value="pending" className="m-0">
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
                  <Table>
                    <TableHeader className="bg-zinc-50 dark:bg-zinc-800/50">
                      <TableRow>
                        <TableHead className="w-[80px]">Action</TableHead>
                        <TableHead>Job Card No</TableHead>
                        <TableHead>Firm Name</TableHead>
                        <TableHead>Delivery Order No</TableHead>
                        <TableHead>Party Name</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Total Made</TableHead>
                        <TableHead>Exp. Delivery</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPending.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center h-24 text-zinc-500">No pending job cards found.</TableCell>
                        </TableRow>
                      ) : (
                        filteredPending.map(item => (
                          <TableRow key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20">
                            <TableCell>
                              <Button size="sm" onClick={() => openLogDialog(item)} className="bg-brand hover:bg-brand/90 text-white shadow-sm h-8">
                                Log
                              </Button>
                            </TableCell>
                            <TableCell className="font-medium">{item.jobCardNo}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                                {item.firmName}
                              </Badge>
                            </TableCell>
                            <TableCell>{item.deliveryOrderNo}</TableCell>
                            <TableCell>{item.partyName}</TableCell>
                            <TableCell className="max-w-[200px] truncate" title={item.productName}>{item.productName}</TableCell>
                            <TableCell className="text-right font-semibold">{item.quantity}</TableCell>
                            <TableCell className="text-right font-semibold text-brand">
                              {item.totalMade}
                            </TableCell>
                            <TableCell>
                              {item.expectedDeliveryDate ? format(new Date(item.expectedDeliveryDate), "dd MMM yyyy") : "-"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* HISTORY TAB */}
              <TabsContent value="history" className="m-0">
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
                  <Table>
                    <TableHeader className="bg-zinc-50 dark:bg-zinc-800/50">
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Job Card No</TableHead>
                        <TableHead>Firm Name</TableHead>
                        <TableHead>Delivery Order No</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty FG</TableHead>
                        <TableHead className="text-right">M/C Hours</TableHead>
                        <TableHead>Supervisor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHistory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center h-24 text-zinc-500">No history found.</TableCell>
                        </TableRow>
                      ) : (
                        filteredHistory.map(item => (
                          <TableRow key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20">
                            <TableCell>{item.dateOfProduction ? format(new Date(item.dateOfProduction), "dd MMM yyyy") : "-"}</TableCell>
                            <TableCell className="font-medium">{item.jobCardNo}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                                {item.firmName}
                              </Badge>
                            </TableCell>
                            <TableCell>{item.deliveryOrderNo}</TableCell>
                            <TableCell className="max-w-[200px] truncate" title={item.productName}>{item.productName}</TableCell>
                            <TableCell className="text-right font-semibold text-brand">{item.quantityFg}</TableCell>
                            <TableCell className="text-right">{item.machineHours || "-"}</TableCell>
                            <TableCell>{item.supervisorName}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* RM SUMMARY TAB */}
              <TabsContent value="rm-summary" className="m-0">
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900 max-w-2xl">
                  <Table>
                    <TableHeader className="bg-zinc-50 dark:bg-zinc-800/50">
                      <TableRow>
                        <TableHead>Material Name</TableHead>
                        <TableHead className="text-right">Total Quantity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRmSummary.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center h-24 text-zinc-500">No RM summary data found.</TableCell>
                        </TableRow>
                      ) : (
                        filteredRmSummary.map((item, idx) => (
                          <TableRow key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20">
                            <TableCell className="font-medium">{item.materialName}</TableCell>
                            <TableCell className="text-right font-semibold">{item.quantity}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </>
          )}
        </Card>
      </Tabs>

      {/* Log Production Sheet */}
      <Sheet open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="text-xl">Log Production</SheetTitle>
            <SheetDescription>
              Submit actual production run details for Job Card: <span className="font-semibold text-zinc-900 dark:text-white">{selectedJobCard?.jobCardNo}</span>
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col flex-1 min-h-0">
          <SheetBody className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity FG</Label>
                <Input
                  type="number"
                  value={logForm.quantityFg}
                  onChange={e => setLogForm({ ...logForm, quantityFg: e.target.value })}
                  placeholder="Produced quantity..."
                />
              </div>
              <div className="space-y-2">
                <Label>Machine Hours</Label>
                <Input
                  type="number"
                  value={logForm.machineHours}
                  onChange={e => setLogForm({ ...logForm, machineHours: e.target.value })}
                  placeholder="Total machine hours..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date of Production</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !logForm.dateOfProduction && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {logForm.dateOfProduction ? format(logForm.dateOfProduction, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={logForm.dateOfProduction}
                      onSelect={(date) => date && setLogForm({ ...logForm, dateOfProduction: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Supervisor Name</Label>
                <Input
                  value={logForm.supervisorName}
                  onChange={e => setLogForm({ ...logForm, supervisorName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Raw Materials Consumed</Label>
                <Button type="button" variant="outline" size="sm" onClick={addMaterialRow} className="h-8">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>

              <div className="space-y-3 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
                {logForm.materials.map((mat, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder="Material Name"
                      value={mat.materialName}
                      onChange={e => handleMaterialChange(index, 'materialName', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={mat.quantity}
                      onChange={e => handleMaterialChange(index, 'quantity', e.target.value)}
                      className="w-24"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMaterialRow(index)}
                      disabled={logForm.materials.length === 1}
                      className="h-9 w-9 text-red-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                value={logForm.remarks}
                onChange={e => setLogForm({ ...logForm, remarks: e.target.value })}
                placeholder="Any additional notes..."
                className="resize-none h-20"
              />
            </div>
          </SheetBody>
          <SheetFooter className="flex justify-end gap-3 pt-4 mt-auto border-t border-zinc-100 dark:border-zinc-800">
            <Button variant="outline" onClick={() => setIsLogDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitLog} disabled={submitting} className="bg-brand hover:bg-brand/90 text-white">
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting</>
              ) : (
                'Submit Log'
              )}
            </Button>
          </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
