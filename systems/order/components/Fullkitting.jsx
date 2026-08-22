"use client";
import React, { useState, useEffect, useCallback } from "react";
import { API_URL, getToken } from "@/lib/auth";
import { useAuth } from "@/systems/order/context/AuthContext";
import { uploadFileToStorage } from "@/systems/order/utils/storageUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, FileText, Clock, Eye, Package, Upload } from "lucide-react";
import { toast } from "sonner";

const EMPTY_FORM = {
  status: "No",
  transporterName: "",
  truckNo: "",
  transporterRate: "",
  totalTransporterAmount: "",
  biltyNo: "",
  remarks: "",
  transporterBillImage: "",
};

export default function Fullkitting() {
  const { user, isReadOnly, isSuperAdmin } = useAuth();
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, h] = await Promise.all([
        fetch(`${API_URL}/order/fullkitting/pending`).then((r) => r.json()),
        fetch(`${API_URL}/order/fullkitting/history`).then((r) => r.json()),
      ]);
      setPending(p.data || []);
      setHistory(h.data || []);
    } catch {
      toast.error("Failed to load fullkitting data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openProcessModal = (row) => {
    const rate = row.logistic?.transportRatePerMt || row.logistic?.fixedAmount || "";
    const qty = row.logistic?.actualTruckQty || row.qtyToBeDispatched || 0;
    const computedAmount = rate && qty ? (parseFloat(rate) * parseFloat(qty)).toFixed(2) : "";

    setSelected(row);
    setForm({
      status: "No",
      transporterName: row.logistic?.transporterName || "",
      truckNo: row.logistic?.truckNo || "",
      transporterRate: rate ? String(rate) : "",
      totalTransporterAmount: computedAmount ? String(computedAmount) : "",
      biltyNo: row.logistic?.biltyNo || row.deliveries?.[0]?.bilty?.biltyNo || "",
      remarks: "",
      transporterBillImage: row.deliveries?.[0]?.bilty?.biltyCopy || row.wetmanEntry?.imageOfSlip || "",
    });
  };

  const handleRateChange = (rateVal) => {
    const qty = selected?.logistic?.actualTruckQty || selected?.qtyToBeDispatched || 0;
    const computed = rateVal && qty ? (parseFloat(rateVal) * parseFloat(qty)).toFixed(2) : "";
    setForm((f) => ({
      ...f,
      transporterRate: rateVal,
      totalTransporterAmount: computed,
    }));
  };

  const handleBillImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadFileToStorage(file, "order-stage", "fullkitting");
      const url = typeof res === "object" && res?.url ? res.url : typeof res === "string" ? res : "";
      setForm((f) => ({ ...f, transporterBillImage: url }));
      toast.success("Bill image uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selected) {
      toast.error("No dispatch selected");
      return;
    }
    if (!form.status || (form.status !== "Yes" && form.status !== "No")) {
      toast.error("Please select a status decision (Yes or No).");
      return;
    }

    if (form.status === "Yes") {
      if (!form.transporterName?.trim()) {
        toast.error("Transporter Name is required.");
        return;
      }
      if (!form.truckNo?.trim()) {
        toast.error("Truck No. is required.");
        return;
      }
      if (form.transporterRate === "" || form.transporterRate == null) {
        toast.error("Transporter Rate is required.");
        return;
      }
      if (form.totalTransporterAmount === "" || form.totalTransporterAmount == null) {
        toast.error("Total Transporter Amount is required.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        dispatchId: selected.id,
        status: form.status,
        productName: selected.productName || selected.receipt?.productName || "",
        actualTruckQty: selected.wetmanEntry?.actualTruckQty || selected.logistic?.actualTruckQty || selected.qtyToBeDispatched || 0,
        transporterName: form.transporterName,
        truckNo: form.truckNo,
        transporterRate: form.transporterRate,
        totalTransporterAmount: form.totalTransporterAmount,
        biltyNo: form.biltyNo,
        remarks: form.remarks,
        transporterBillImage: form.transporterBillImage,
      };

      const res = await fetch(`${API_URL}/order/fullkitting`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to submit fullkitting");
      toast.success("Fullkitting submitted & sent to TC");
      setSelected(null);
      loadData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin w-6 h-6 text-emerald-500" />
      </div>
    );
  }

  const totalDispatches = pending.length + history.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Fullkitting</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Review dispatch logistics & record transporter billing status</p>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/40 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">Invoice History</p>
              <p className="text-2xl font-bold text-blue-950 dark:text-blue-100">{totalDispatches}</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
              <FileText className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">Pending Fullkitting</p>
              <p className="text-2xl font-bold text-amber-950 dark:text-amber-100">{pending.length}</p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600 dark:text-amber-400">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">Completed</p>
              <p className="text-2xl font-bold text-emerald-950 dark:text-emerald-100">{history.length}</p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {["pending", "history"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${
              tab === t
                ? "bg-emerald-600 text-white"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            {t} ({t === "pending" ? pending.length : history.length})
          </button>
        ))}
      </div>

      {/* Expanded Table */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-x-auto shadow-sm">
        <Table className="min-w-[1700px]">
          <TableHeader>
            <TableRow className="bg-zinc-50 dark:bg-zinc-900/60">
              <TableHead className="w-24 text-xs font-semibold">Status</TableHead>
              <TableHead className="w-24 text-xs font-semibold">Action</TableHead>
              <TableHead className="text-xs font-semibold">Invoice</TableHead>
              <TableHead className="text-xs font-semibold">Firm Name</TableHead>
              <TableHead className="text-xs font-semibold">PO / Party</TableHead>
              <TableHead className="text-xs font-semibold">DO Number</TableHead>
              <TableHead className="text-xs font-semibold">Product</TableHead>
              <TableHead className="text-xs font-semibold text-right">Truck Qty</TableHead>
              <TableHead className="text-xs font-semibold">Transporter Type</TableHead>
              <TableHead className="text-xs font-semibold">Transporter Name</TableHead>
              <TableHead className="text-xs font-semibold">Vehicle Number</TableHead>
              <TableHead className="text-xs font-semibold">Bilty Number</TableHead>
              <TableHead className="text-xs font-semibold">Type Of Rate</TableHead>
              <TableHead className="text-xs font-semibold text-right">Transporter Rate</TableHead>
              <TableHead className="text-xs font-semibold">Bilty Image</TableHead>
              <TableHead className="text-xs font-semibold text-right">Amount</TableHead>
              <TableHead className="text-xs font-semibold">Invoice Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(tab === "pending" ? pending : history).length === 0 ? (
              <TableRow>
                <TableCell colSpan={17} className="text-center py-10 text-zinc-400">
                  No records found
                </TableCell>
              </TableRow>
            ) : (
              (tab === "pending" ? pending : history).map((r) => (
                <TableRow
                  key={r.id}
                  className={`text-sm cursor-pointer hover:bg-zinc-50/80 dark:hover:bg-zinc-900/60 transition-colors ${
                    selected?.id === r.id ? "bg-emerald-50 dark:bg-emerald-900/20" : ""
                  }`}
                  onClick={() => tab === "pending" && !isReadOnly && openProcessModal(r)}
                >
                  {/* 1. Status */}
                  <TableCell>
                    {tab === "pending" ? (
                      <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300">
                        Pending
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300">
                        {r.fullkitting?.fullkittingStatus === "No" ? "Skipped" : "Completed"}
                      </Badge>
                    )}
                  </TableCell>

                  {/* 2. Action */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {tab === "pending" ? (
                      <Button
                        size="sm"
                        disabled={isReadOnly}
                        onClick={() => openProcessModal(r)}
                        className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-sm"
                      >
                        <Package className="w-3.5 h-3.5" /> Process
                      </Button>
                    ) : (
                      <span className="text-xs text-zinc-400 font-medium">Done</span>
                    )}
                  </TableCell>

                  {/* 3. Invoice */}
                  <TableCell className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
                    {r.invoice?.billNumber || "N/A"}
                  </TableCell>

                  {/* 4. Firm Name */}
                  <TableCell className="text-xs text-zinc-600 dark:text-zinc-400">
                    {r.receipt?.firmName || "N/A"}
                  </TableCell>

                  {/* 5. PO / Party */}
                  <TableCell className="text-xs">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{r.receipt?.partyPoNo || "No PO"}</span>
                    <span className="text-zinc-400"> / </span>
                    <span className="text-zinc-600 dark:text-zinc-400">{r.partyName || r.receipt?.partyName || "N/A"}</span>
                  </TableCell>

                  {/* 6. DO Number */}
                  <TableCell className="font-mono text-xs">{r.doNumber || "N/A"}</TableCell>

                  {/* 7. Product */}
                  <TableCell className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                    {r.fullkitting?.productName || r.productName || "N/A"}
                  </TableCell>

                  {/* 8. Truck Qty */}
                  <TableCell className="text-right text-xs font-medium">
                    {r.fullkitting?.actualTruckQty ?? r.logistic?.actualTruckQty ?? r.qtyToBeDispatched ?? "N/A"}
                  </TableCell>

                  {/* 9. Transporter Type */}
                  <TableCell className="text-xs">
                    <Badge variant="outline" className="text-[10px]">
                      {r.logistic?.confirmedTypeOfTransporting || r.typeOfTransporting || "N/A"}
                    </Badge>
                  </TableCell>

                  {/* 10. Transporter Name */}
                  <TableCell className="text-xs">{r.fullkitting?.transporterName || r.logistic?.transporterName || "N/A"}</TableCell>

                  {/* 11. Vehicle Number */}
                  <TableCell className="font-mono text-xs">{r.fullkitting?.truckNo || r.logistic?.truckNo || "N/A"}</TableCell>

                  {/* 12. Bilty Number */}
                  <TableCell className="font-mono text-xs">{r.fullkitting?.biltyNo || r.logistic?.biltyNo || "N/A"}</TableCell>

                  {/* 13. Type Of Rate */}
                  <TableCell className="text-xs">
                    {r.logistic?.typeOfRate || (r.fullkitting ? (r.fullkitting.fullkittingAmount ? "Per MT/Fixed" : "Ex Factory Transporter") : "N/A")}
                  </TableCell>

                  {/* 14. Transporter Rate */}
                  <TableCell className="text-right text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    {r.fullkitting?.fullkittingAmount != null
                      ? (r.fullkitting.fullkittingAmount > 0 ? `₹${r.fullkitting.fullkittingAmount}` : "Ex Factory")
                      : (r.logistic?.transportRatePerMt ? `₹${r.logistic.transportRatePerMt}` : "N/A")}
                  </TableCell>

                  {/* 15. Bilty Image */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {r.fullkitting?.transporterBillImage || r.deliveries?.[0]?.bilty?.biltyCopy || r.wetmanEntry?.imageOfSlip ? (
                      <a
                        href={r.fullkitting?.transporterBillImage || r.deliveries?.[0]?.bilty?.biltyCopy || r.wetmanEntry?.imageOfSlip}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-600 hover:underline text-xs font-medium"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </a>
                    ) : (
                      <span className="text-zinc-400 text-xs">N/A</span>
                    )}
                  </TableCell>

                  {/* 16. Amount */}
                  <TableCell className="text-right text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {r.fullkitting?.totalTransporterAmount ? `₹${Number(r.fullkitting.totalTransporterAmount).toLocaleString("en-IN")}` : "N/A"}
                  </TableCell>

                  {/* 17. Invoice Date */}
                  <TableCell className="text-xs text-zinc-500 whitespace-nowrap">
                    {r.invoice?.billDate ? new Date(r.invoice.billDate).toLocaleDateString() : "N/A"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Fullkitting Process Review & Data Entry Modal */}
      <Dialog open={!!selected && !isReadOnly} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b shrink-0 bg-zinc-50/80 dark:bg-zinc-900/80">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600" />
                Fullkitting Process
              </DialogTitle>
              {selected && (
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-mono text-xs">
                  {selected.dSrNumber}
                </Badge>
              )}
            </div>
          </DialogHeader>

          {selected && (
            <div className="p-6 space-y-6">
              {/* 1. Header Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
                <div>
                  <span className="text-zinc-400 block mb-0.5">Party Name</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">{selected.partyName || selected.receipt?.partyName || "N/A"}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block mb-0.5">PO Number</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">{selected.receipt?.partyPoNo || "N/A"}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block mb-0.5">DO Number</span>
                  <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">{selected.doNumber || "N/A"}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block mb-0.5">Bilty Number</span>
                  <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                    {selected.logistic?.biltyNo || selected.deliveries?.[0]?.bilty?.biltyNo || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block mb-0.5">Invoice Date</span>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {selected.invoice?.billDate ? new Date(selected.invoice.billDate).toLocaleDateString() : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block mb-0.5">Rate of Material</span>
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">
                    {selected.receipt?.rateOfMaterial ? `₹${selected.receipt.rateOfMaterial}` : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block mb-0.5">Product</span>
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">{selected.productName || "N/A"}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block mb-0.5">Dispatch Qty</span>
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">{selected.qtyToBeDispatched ?? "N/A"}</span>
                </div>
              </div>

              {/* 2. Transporter & Freight Details (Read-only) */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Transporter & Freight Details (Existing)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
                  <div>
                    <span className="text-zinc-400 block mb-0.5">Transporter Name</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{selected.logistic?.transporterName || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block mb-0.5">Vehicle Number</span>
                    <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">{selected.logistic?.truckNo || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block mb-0.5">Bilty Number</span>
                    <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                      {selected.logistic?.biltyNo || selected.deliveries?.[0]?.bilty?.biltyNo || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block mb-0.5">Type of Rate</span>
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">{selected.logistic?.typeOfRate || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block mb-0.5">Transporter Rate</span>
                    <span className="font-medium text-emerald-700 dark:text-emerald-400">
                      {selected.logistic?.transportRatePerMt
                        ? `₹${selected.logistic.transportRatePerMt} / MT`
                        : selected.logistic?.fixedAmount
                        ? `₹${selected.logistic.fixedAmount} (Fixed)`
                        : "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block mb-0.5">Bilty Image</span>
                    {selected.deliveries?.[0]?.bilty?.biltyCopy || selected.wetmanEntry?.imageOfSlip ? (
                      <a
                        href={selected.deliveries?.[0]?.bilty?.biltyCopy || selected.wetmanEntry?.imageOfSlip}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-600 hover:underline font-medium"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Image
                      </a>
                    ) : (
                      <span className="text-zinc-400">N/A</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Additional Details (Read-only) */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Additional Details
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
                  <div>
                    <span className="text-zinc-400 block mb-0.5">DO-Delivery Order No.</span>
                    <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">{selected.doNumber || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block mb-0.5">Total PO Basic Value</span>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      {selected.receipt?.totalPoBasicValue ? `₹${Number(selected.receipt.totalPoBasicValue).toLocaleString("en-IN")}` : "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block mb-0.5">Customer Category</span>
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">{selected.receipt?.customerCategory || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block mb-0.5">Marketing Manager</span>
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">{selected.receipt?.marketingSalesPerson || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block mb-0.5">Quantity</span>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{selected.qtyToBeDispatched ?? selected.receipt?.quantity ?? "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block mb-0.5">LGST-Sr Number</span>
                    <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">{selected.logistic?.lgstSrNumber || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block mb-0.5">Vehicle Plate Image</span>
                    {selected.logistic?.vehicleNoPlateImage ? (
                      <a href={selected.logistic.vehicleNoPlateImage} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-600 hover:underline font-medium">
                        <Eye className="w-3.5 h-3.5" /> View Plate
                      </a>
                    ) : (
                      <span className="text-zinc-400">N/A</span>
                    )}
                  </div>
                  <div>
                    <span className="text-zinc-400 block mb-0.5">Loading Image 1</span>
                    {selected.loadMaterial?.loadingImage1 ? (
                      <a href={selected.loadMaterial.loadingImage1} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-600 hover:underline font-medium">
                        <Eye className="w-3.5 h-3.5" /> View Image 1
                      </a>
                    ) : (
                      <span className="text-zinc-400">N/A</span>
                    )}
                  </div>
                  <div>
                    <span className="text-zinc-400 block mb-0.5">Loading Images 2 & 3</span>
                    <div className="flex gap-2">
                      {selected.loadMaterial?.loadingImage2 ? (
                        <a href={selected.loadMaterial.loadingImage2} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-600 hover:underline font-medium">
                          Img 2
                        </a>
                      ) : null}
                      {selected.loadMaterial?.loadingImage3 ? (
                        <a href={selected.loadMaterial.loadingImage3} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-600 hover:underline font-medium">
                          Img 3
                        </a>
                      ) : null}
                      {!selected.loadMaterial?.loadingImage2 && !selected.loadMaterial?.loadingImage3 && <span className="text-zinc-400">N/A</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Actionable Data Entry Form */}
              <form id="fullkitting-process-form" onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <div className="space-y-1.5 max-w-xs">
                  <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Fullkitting Status Decision <span className="text-red-500">*</span>
                  </Label>
                  <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes (Complete Fullkitting)</SelectItem>
                      <SelectItem value="No">No (Skip Billing)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.status === "Yes" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        Transporter <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={form.transporterName}
                        onChange={(e) => setForm((f) => ({ ...f, transporterName: e.target.value }))}
                        className="h-9"
                        placeholder="Enter transporter name"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        Truck No. <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={form.truckNo}
                        onChange={(e) => setForm((f) => ({ ...f, truckNo: e.target.value }))}
                        className="h-9"
                        placeholder="e.g. MH04AB1234"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        Transporter Rate <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.transporterRate}
                        onChange={(e) => handleRateChange(e.target.value)}
                        className="h-9"
                        placeholder="Rate per MT or fixed"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        Total Transporter Amount <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.totalTransporterAmount}
                        onChange={(e) => setForm((f) => ({ ...f, totalTransporterAmount: e.target.value }))}
                        className="h-9"
                        placeholder="Total amount"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Bilty No.</Label>
                      <Input
                        value={form.biltyNo}
                        onChange={(e) => setForm((f) => ({ ...f, biltyNo: e.target.value }))}
                        className="h-9"
                        placeholder="Enter bilty number"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Transporter Bill Image</Label>
                      <div className="flex items-center gap-2">
                        <Input type="file" accept="image/*" onChange={handleBillImage} className="h-9" />
                        {uploading && <Loader2 className="animate-spin w-4 h-4 text-emerald-500 shrink-0" />}
                      </div>
                    </div>

                    <div className="sm:col-span-2 lg:col-span-3 space-y-1.5">
                      <Label className="text-xs">Remarks</Label>
                      <Input
                        value={form.remarks}
                        onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                        className="h-9"
                        placeholder="Enter remarks (optional)"
                      />
                    </div>
                  </div>
                )}
              </form>
            </div>
          )}

          <DialogFooter className="px-6 py-4 border-t shrink-0 bg-zinc-50/80 dark:bg-zinc-900/80 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setSelected(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="fullkitting-process-form"
              disabled={submitting || uploading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              Submit & Send to TC
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
