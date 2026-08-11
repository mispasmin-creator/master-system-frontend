import React, { useEffect, useState, useCallback } from "react";
import { FreightPayment } from "../types";
import { freightPaymentApi } from "../lib/api";
import { useMutation } from "@tanstack/react-query";
import { StatusBadge } from "./StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { parseISO, differenceInHours } from "date-fns";
import {
  AlertCircle,
  Layers,
  Package,
  FileText,
  Banknote,
  Upload,
  X,
  Truck,
  MapPin,
  Hash,
  Building2,
  Image,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Constants ─── */
const FIRM_OPTIONS = ["Pmmpl", "Rkl", "Purab", "Refrasynth", "Refratech"];
const RATE_TYPE_OPTIONS = ["Per Ton", "Fixed", "Per Km", "Negotiated"];

const jk: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" };

interface FreightFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment?: FreightPayment;
  onSuccess: () => void;
  defaultStep?: string;
  userFirm?: string;
}

const formatDateForInput = (dateTimeStr?: string) => {
  if (!dateTimeStr) return "";
  return dateTimeStr.split(" ")[0].split("T")[0];
};

const formatDateForDisplay = (dateStr?: string) => {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

export function FreightForm({
  open,
  onOpenChange,
  payment,
  onSuccess,
  defaultStep,
  userFirm,
}: FreightFormProps) {
  const [formData, setFormData] = useState<Partial<FreightPayment>>({});
  const [activeTab, setActiveTab] = useState(defaultStep || "checkkitting");
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open) {
      setActiveTab(defaultStep || "checkkitting");
      setErrors({});
      setTouched({});
    }
  }, [open, defaultStep]);

  useEffect(() => {
    if (payment) {
      setFormData(payment);
    } else {
      setFormData({
        Status: "Not Done",
        "Rate Type": "Per Ton",
        Delay: 0,
        Delay2: 0,
        Delay3: 0,
        "Firm Name": userFirm || "",
      });
    }
  }, [payment, open, userFirm]);

  const mutation = useMutation({
    mutationFn: (data: Partial<FreightPayment>) => {
      return freightPaymentApi.post("entry", data);
    },
    onSuccess: () => {
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: any) => {
      setErrors({ submit: err?.message || "Failed to save shipment" });
    },
  });

  const calculateDelay = useCallback((planned?: string, actual?: string) => {
    if (!planned || !actual) return 0;
    try {
      const p = parseISO(planned);
      const a = parseISO(actual);
      const diff = differenceInHours(a, p);
      return diff > 0 ? Number((diff / 24).toFixed(2)) : 0;
    } catch {
      return 0;
    }
  }, []);

  const updateField = useCallback(
    (field: keyof FreightPayment, value: any) => {
      const updated = { ...formData, [field]: value };
      if (field === "Planned" || field === "Actual") updated.Delay = calculateDelay(updated.Planned, updated.Actual);
      if (field === "Planned2" || field === "Actual2") updated.Delay2 = calculateDelay(updated.Planned2, updated.Actual2);
      if (field === "Planned3" || field === "Actual3") updated.Delay3 = calculateDelay(updated.Planned3, updated.Actual3);
      setFormData(updated);
      if (errors[field as string]) setErrors((prev) => ({ ...prev, [field as string]: "" }));
    },
    [formData, calculateDelay, errors]
  );

  const handleBlur = (field: string) => setTouched((prev) => ({ ...prev, [field]: true }));

  const validate = (data: Partial<FreightPayment> = formData): boolean => {
    const newErrors: Record<string, string> = {};
    if (!data["Payment Number"]?.trim()) newErrors["Payment Number"] = "Payment number is required";
    if (!data["Unique Number"]?.trim()) newErrors["Unique Number"] = "Unique number is required";
    if (!data["Firm Name"]?.trim()) newErrors["Firm Name"] = "Firm name is required";
    if (!data["Transporter Name"]?.trim()) newErrors["Transporter Name"] = "Transporter name is required";
    if (!data["Vehicle Number"]?.trim()) newErrors["Vehicle Number"] = "Vehicle number is required";
    if (data.Amount !== undefined && data.Amount <= 0) newErrors.Amount = "Amount must be greater than 0";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalData = { ...formData, "Payment Number": formData["Payment Number"] || formData["Unique Number"] };
    if (!validate(finalData)) return;
    mutation.mutate(finalData);
  };

  const isPending = mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl sm:max-w-4xl w-[94vw] h-[88vh] flex flex-col p-0 overflow-hidden rounded-2xl border border-slate-200/90 shadow-2xl shadow-slate-950/25 ring-1 ring-slate-900/5"
        style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)" }}
      >
        {/* ─── Header ─── */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0 relative">
          {/* Brand accent top bar */}
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl bg-linear-to-r from-brand-600 via-brand-400 to-brand-200" />

          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-3">
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
                {payment ? (
                  <FileText className="w-5 h-5 text-brand-600" />
                ) : (
                  <Package className="w-5 h-5 text-brand-600" />
                )}
              </div>
              <div>
                <DialogTitle
                  className="text-[15px] font-bold text-slate-900 tracking-tight leading-tight"
                  style={jk}
                >
                  {payment ? "Edit Shipment" : "Create New Shipment"}
                </DialogTitle>
                <DialogDescription className="text-[11px] text-slate-400 font-medium mt-0.5">
                  {payment
                    ? "Update logistics parameters and track step-by-step progress."
                    : "Add a new freight shipment to the system."}
                </DialogDescription>
              </div>
            </div>

            {payment && (
              <div className="hidden sm:flex flex-col items-end gap-0.5 mr-8">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Shipment ID</span>
                <span className="text-[12px] font-mono font-bold text-slate-700">#{payment.id}</span>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* ─── Form Body ─── */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-6">

            {/* Submit Error */}
            {errors.submit && (
              <div className="flex items-center gap-2.5 px-4 py-3 bg-rose-50 border border-rose-200/60 rounded-xl">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="text-[12px] font-semibold text-rose-600">{errors.submit}</span>
              </div>
            )}

            {/* ── Section: Freight Details ── */}
            <div className="space-y-3">
              <SectionHeader icon={<Truck className="w-3.5 h-3.5 text-brand-600" />} label="Freight Details" />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 bg-brand-50/30 p-5 rounded-xl border border-brand-100/60">

                {/* Unique Number */}
                <FieldWrap label="Unique Number" icon={<Hash className="w-3 h-3" />} required error={touched["Unique Number"] && errors["Unique Number"]}>
                  <Input
                    className={cn("h-9 bg-white border-slate-200 rounded-lg text-[13px] font-mono", touched["Unique Number"] && errors["Unique Number"] && "border-rose-300 focus-visible:border-rose-400")}
                    value={formData["Unique Number"] || ""}
                    onChange={(e) => updateField("Unique Number", e.target.value)}
                    onBlur={() => handleBlur("Unique Number")}
                    placeholder="e.g., UNQ-1001"
                  />
                </FieldWrap>

                {/* Firm Name */}
                <FieldWrap label="Firm" icon={<Building2 className="w-3 h-3" />} required error={touched["Firm Name"] && errors["Firm Name"]}>
                  <Select
                    value={formData["Firm Name"] || ""}
                    onValueChange={(v) => updateField("Firm Name", v)}
                    disabled={!!userFirm}
                  >
                    <SelectTrigger className={cn("h-9 bg-white border-slate-200 rounded-lg text-[13px]", userFirm && "opacity-70 cursor-not-allowed", touched["Firm Name"] && errors["Firm Name"] && "border-rose-300")}>
                      <SelectValue placeholder="Select firm" />
                    </SelectTrigger>
                    <SelectContent>
                      {FIRM_OPTIONS.map((firm) => (
                        <SelectItem key={firm} value={firm}>{firm}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldWrap>

                {/* FMS Name */}
                <FieldWrap label="FMS Name">
                  <Input className="h-9 bg-white border-slate-200 rounded-lg text-[13px]" value={formData["Fms Name"] || ""} onChange={(e) => updateField("Fms Name", e.target.value)} placeholder="e.g., FMS-A" />
                </FieldWrap>

                {/* Transporter Name */}
                <FieldWrap label="Transporter" icon={<Truck className="w-3 h-3" />} required error={touched["Transporter Name"] && errors["Transporter Name"]}>
                  <Input
                    className={cn("h-9 bg-white border-slate-200 rounded-lg text-[13px]", touched["Transporter Name"] && errors["Transporter Name"] && "border-rose-300")}
                    value={formData["Transporter Name"] || ""}
                    onChange={(e) => updateField("Transporter Name", e.target.value)}
                    onBlur={() => handleBlur("Transporter Name")}
                    placeholder="e.g., Fast Freight"
                  />
                </FieldWrap>

                {/* Vehicle Number */}
                <FieldWrap label="Vehicle No." icon={<Truck className="w-3 h-3" />} required error={touched["Vehicle Number"] && errors["Vehicle Number"]}>
                  <Input
                    className={cn("h-9 bg-white border-slate-200 rounded-lg text-[13px] font-mono", touched["Vehicle Number"] && errors["Vehicle Number"] && "border-rose-300")}
                    value={formData["Vehicle Number"] || ""}
                    onChange={(e) => updateField("Vehicle Number", e.target.value)}
                    onBlur={() => handleBlur("Vehicle Number")}
                    placeholder="e.g., MH-12-AB-1234"
                  />
                </FieldWrap>

                {/* From */}
                <FieldWrap label="From" icon={<MapPin className="w-3 h-3" />}>
                  <Input className="h-9 bg-white border-slate-200 rounded-lg text-[13px]" value={formData.From || ""} onChange={(e) => updateField("From", e.target.value)} placeholder="Origin city" />
                </FieldWrap>

                {/* To */}
                <FieldWrap label="To" icon={<MapPin className="w-3 h-3" />}>
                  <Input className="h-9 bg-white border-slate-200 rounded-lg text-[13px]" value={formData.To || ""} onChange={(e) => updateField("To", e.target.value)} placeholder="Destination city" />
                </FieldWrap>

                {/* Material Details */}
                <FieldWrap label="Material Details" className="lg:col-span-2">
                  <Input className="h-9 bg-white border-slate-200 rounded-lg text-[13px]" value={formData["Material Load Details"] || ""} onChange={(e) => updateField("Material Load Details", e.target.value)} placeholder="e.g., Steel Coils, Electronics, Textiles..." />
                </FieldWrap>

                {/* Bilty Number */}
                <FieldWrap label="Bilty Number">
                  <Input className="h-9 bg-white border-slate-200 rounded-lg text-[13px] font-mono" value={formData["Bilty Number"] || ""} onChange={(e) => updateField("Bilty Number", e.target.value)} placeholder="e.g., BLT-8921" />
                </FieldWrap>

                {/* Party Name */}
                <FieldWrap label="Party Name">
                  <Input className="h-9 bg-white border-slate-200 rounded-lg text-[13px]" value={formData["Party Name"] || ""} onChange={(e) => updateField("Party Name", e.target.value)} placeholder="e.g., Party Name" />
                </FieldWrap>

                {/* Billing Qty */}
                <FieldWrap label="Billing Qty">
                  <Input type="number" className="h-9 bg-white border-slate-200 rounded-lg text-[13px]" value={formData["Billing Qty"] ?? ""} onChange={(e) => updateField("Billing Qty", e.target.value === "" ? null : Number(e.target.value))} placeholder="e.g., 25" />
                </FieldWrap>

                {/* Bill Number */}
                <FieldWrap label="Bill Number">
                  <Input className="h-9 bg-white border-slate-200 rounded-lg text-[13px] font-mono" value={formData["Bill Number"] || ""} onChange={(e) => updateField("Bill Number", e.target.value)} placeholder="e.g., BILL-1234" />
                </FieldWrap>

                {/* Rate Type */}
                <FieldWrap label="Rate Type">
                  <Select value={formData["Rate Type"] || "Per Ton"} onValueChange={(v) => updateField("Rate Type", v)}>
                    <SelectTrigger className="h-9 bg-white border-slate-200 rounded-lg text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RATE_TYPE_OPTIONS.map((rt) => (
                        <SelectItem key={rt} value={rt}>{rt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldWrap>

                {/* Amount */}
                <FieldWrap label="Amount (₹)" icon={<DollarSign className="w-3 h-3" />} error={touched.Amount && errors.Amount}>
                  <Input
                    type="number"
                    className={cn("h-9 bg-white border-slate-200 rounded-lg text-[13px] font-semibold", touched.Amount && errors.Amount && "border-rose-300")}
                    value={formData.Amount || 0}
                    onChange={(e) => updateField("Amount", parseFloat(e.target.value) || 0)}
                    onBlur={() => handleBlur("Amount")}
                    min={0}
                    step={100}
                  />
                </FieldWrap>

                {/* Lift ID */}
                <FieldWrap label="Lift ID">
                  <Input
                    className="h-9 bg-white border-slate-200 rounded-lg text-[13px] font-mono"
                    value={formData["Lift ID"] || ""}
                    onChange={async (e) => {
                      const liftId = e.target.value;
                      updateField("Lift ID", liftId);
                      if (liftId.trim().length >= 3) {
                        try {
                          const lookupRes = await freightPaymentApi.getDispatchInfo(liftId.trim());
                          if (lookupRes && lookupRes.data) {
                            const info = lookupRes.data;
                            if (info.computedAmount) updateField("Amount", info.computedAmount);
                            if (info.partyName) updateField("Party Name", info.partyName);
                            if (info.transporterName) updateField("Transporter Name", info.transporterName);
                            if (info.truckNo) updateField("Vehicle Number", info.truckNo);
                            if (info.biltyNo) updateField("Bilty Number", info.biltyNo);
                          }
                        } catch (err) {
                          // Quiet ignore lookup error
                        }
                      }
                    }}
                    placeholder="e.g., LIFT-101"
                  />
                </FieldWrap>

                {/* Bilty Image */}
                <div className="space-y-1.5 lg:col-span-3">
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest" style={jk}>
                    <Image className="w-3 h-3" /> Bilty Image
                  </label>
                  {formData["Bilty Image"] ? (
                    <div className="flex items-center gap-3 h-9 bg-white border border-slate-200 rounded-lg px-3">
                      <a href={formData["Bilty Image"]} target="_blank" rel="noopener noreferrer" className="text-[12px] text-brand-600 font-semibold hover:underline truncate flex-1">
                        View uploaded image
                      </a>
                      <button type="button" onClick={() => updateField("Bilty Image", "")} className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded-md transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <label className={cn("flex items-center justify-center gap-2 h-9 bg-white border border-dashed border-brand-300 rounded-lg text-[12px] font-medium text-brand-600 cursor-pointer hover:bg-brand-50/50 transition-colors", isUploading && "opacity-50 pointer-events-none")}>
                        <Upload className="w-3.5 h-3.5" />
                        {isUploading ? "Uploading…" : "Click to upload"}
                        <input type="file" accept="image/*" className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setIsUploading(true);
                              try {
                                const url = await freightPaymentApi.upload(file);
                                updateField("Bilty Image", url);
                              } catch {
                                setErrors((prev) => ({ ...prev, biltyImage: "Upload failed." }));
                              } finally {
                                setIsUploading(false);
                              }
                            }
                          }}
                        />
                      </label>
                      {errors.biltyImage && <p className="text-[9px] font-medium text-rose-500 mt-1">{errors.biltyImage}</p>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Section: Workflow Steps (edit only) ── */}
            {payment && (
              <div className="space-y-3">
                <SectionHeader icon={<Layers className="w-3.5 h-3.5 text-brand-600" />} label="Workflow Steps" />

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid grid-cols-3 gap-1.5 bg-slate-100/80 p-1 rounded-xl mb-4 h-auto">
                    <TabsTrigger
                      value="checkkitting"
                      className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-brand-700 text-[11px] font-bold py-2 gap-1.5 transition-all"
                      style={jk}
                    >
                      <Package className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                      Checking
                    </TabsTrigger>
                    <TabsTrigger
                      value="posting"
                      className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-700 text-[11px] font-bold py-2 gap-1.5 transition-all"
                      style={jk}
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      Audit
                    </TabsTrigger>
                    <TabsTrigger
                      value="makepayment"
                      className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-amber-700 text-[11px] font-bold py-2 gap-1.5 transition-all"
                      style={jk}
                    >
                      <Banknote className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      Posting
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="checkkitting" className="mt-0">
                    <StepCard title="Account Checking" status={formData.Status3} onStatusChange={(v) => updateField("Status3", v)} statusOptions={["Done", "Not Done"]} color="brand" remark={formData.Remark3} onRemarkChange={(v) => updateField("Remark3", v)} />
                  </TabsContent>
                  <TabsContent value="posting" className="mt-0">
                    <StepCard title="Account Audit" status={formData.Status_1} onStatusChange={(v) => updateField("Status_1", v)} statusOptions={["Done", "Not Done"]} color="blue" remark={formData.Remark_1} onRemarkChange={(v) => updateField("Remark_1", v)} />
                  </TabsContent>
                  <TabsContent value="makepayment" className="mt-0 space-y-4">
                    <StepCard title="Posting" status={formData.Status2} onStatusChange={(v) => updateField("Status2", v)} statusOptions={["Done", "Not Done"]} color="amber" remark={formData.Remark2} onRemarkChange={(v) => updateField("Remark2", v)} />
                    {["pmmpl", "pmmpl order", "rkl", "rkl order", "purab", "purab order"].includes(formData["Firm Name"]?.toLowerCase() || "") && (
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 text-[12px] font-bold"
                          onClick={() => {
                            const firmName = formData["Firm Name"]?.toLowerCase() || "";
                            let formId = "";
                            if (firmName === "pmmpl" || firmName === "pmmpl order") formId = "1FAIpQLScn8tHEUldlOM_8DKpHUfHHiRImDVjkpkhhfduaZUIxpxlJrA";
                            else if (firmName === "rkl" || firmName === "rkl order") formId = "1FAIpQLScJJFvh6zchRosSzX0mU-u7-oeMaQW6iv1osE70hRDoE-uVrg";
                            else if (firmName === "purab" || firmName === "purab order") formId = "1FAIpQLSdLWKfGPNXK62Orndb137GPKadFiRQZS8W_MM0c11HvdR4KkA";
                            if (!formId) return;

                            const baseUrl = `https://docs.google.com/forms/d/e/${formId}/viewform?usp=pp_url`;
                            const uniqueNumber = encodeURIComponent(formData["Unique Number"] || "");
                            const transporter = encodeURIComponent(formData["Transporter Name"] || "");
                            const amount = encodeURIComponent(formData.Amount?.toString() || "");
                            const link = `${baseUrl}&entry.1200639812=${uniqueNumber}&entry.604194301=New+Freight+Payment+Application&entry.1358288895=Yes&entry.1091308719=${transporter}&entry.1486176123=${amount}&entry.2102057582=ok`;
                            window.open(link, "_blank");
                          }}
                        >
                          <FileText className="w-3.5 h-3.5 mr-1.5" />
                          Fill Google Form
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                {/* Overall Status */}
                <div className="bg-slate-50/60 rounded-xl border border-slate-200/60 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                      <Layers className="w-4 h-4 text-brand-500" />
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-slate-800" style={jk}>Overall Status</p>
                      <p className="text-[10px] text-slate-400">Final state of the transaction</p>
                    </div>
                  </div>
                  <div className="w-full sm:w-56">
                    <Select value={formData.Status} onValueChange={(v) => updateField("Status", v)}>
                      <SelectTrigger className="h-9 bg-white border-slate-200 rounded-lg text-[13px] font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Done">Done</SelectItem>
                        <SelectItem value="Not Done">Not Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Overall Remark */}
                <FieldWrap label="Overall Remark">
                  <Input className="h-9 bg-white border-slate-200 rounded-lg text-[13px]" value={formData.Remark || ""} onChange={(e) => updateField("Remark", e.target.value)} placeholder="Enter overall remark…" />
                </FieldWrap>
              </div>
            )}
          </div>

          {/* ─── Footer ─── */}
          <DialogFooter className="mx-0 mb-0 px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex flex-col-reverse sm:flex-row gap-2 sm:items-center sm:justify-between shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl w-full sm:w-auto px-5 h-10 border-slate-200 bg-white text-slate-600 font-semibold text-[12px] hover:bg-slate-50 hover:border-slate-300 transition-all"
              style={jk}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="rounded-xl w-full sm:w-auto px-7 h-10 bg-brand-600 hover:bg-brand-700 text-white font-bold text-[12px] shadow-md shadow-brand-600/25 disabled:opacity-50 transition-all"
              style={jk}
            >
              {isPending ? (
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving…
                </div>
              ) : payment ? (
                "Save Changes"
              ) : (
                "Create Shipment"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Field Wrapper ─── */
interface FieldWrapProps {
  label: string;
  icon?: React.ReactNode;
  required?: boolean;
  error?: string | false;
  className?: string;
  children: React.ReactNode;
}

function FieldWrap({ label, icon, required, error, className, children }: FieldWrapProps) {
  const jk: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" };
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest" style={jk}>
        {icon}
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[9px] font-semibold text-rose-500">{error}</p>}
    </div>
  );
}

/* ─── Section Header ─── */
function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  const jk: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" };
  return (
    <div className="flex items-center gap-2 mb-1">
      <div className="w-6 h-6 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-widest" style={jk}>{label}</h3>
      <div className="flex-1 h-px bg-slate-200/70 ml-1" />
    </div>
  );
}

/* ─── Step Card ─── */
interface StepCardProps {
  title: string;
  status?: string;
  onStatusChange: (v: string) => void;
  statusOptions: string[];
  color: "brand" | "blue" | "amber";
  remark?: string;
  onRemarkChange?: (v: string) => void;
}

function StepCard({ title, status, onStatusChange, statusOptions, color, remark, onRemarkChange }: StepCardProps) {
  const jk: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" };

  const styles = {
    brand: { border: "border-brand-100", bg: "bg-brand-50/40", dot: "bg-brand-500", title: "text-brand-800" },
    blue: { border: "border-blue-100", bg: "bg-blue-50/40", dot: "bg-blue-500", title: "text-blue-800" },
    amber: { border: "border-amber-100", bg: "bg-amber-50/40", dot: "bg-amber-500", title: "text-amber-800" },
  };
  const cs = styles[color];

  return (
    <div className={cn("border rounded-xl p-5 space-y-4", cs.border, cs.bg)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", cs.dot)} />
          <h4 className={cn("text-[13px] font-bold", cs.title)} style={jk}>{title}</h4>
        </div>
        <div className="flex items-center justify-center bg-white rounded-lg border border-slate-100 px-3 py-1.5">
          <StatusBadge status={status} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FieldWrap label="Status">
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger className="h-9 bg-white border-slate-200 rounded-lg text-[13px] font-medium">
              <SelectValue placeholder="Update status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldWrap>

        <FieldWrap label="Remark">
          <Input className="h-9 bg-white border-slate-200 rounded-lg text-[13px]" value={remark || ""} onChange={(e) => onRemarkChange?.(e.target.value)} placeholder="Enter remark…" />
        </FieldWrap>
      </div>
    </div>
  );
}
