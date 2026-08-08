"use client";
import React, { useState, useEffect, useCallback } from "react";
import { API_URL, getToken } from "@/lib/auth";
import { useAuth } from "@/systems/order/context/AuthContext";
import { uploadFileToStorage } from "@/systems/order/utils/storageUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, PackageX, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function MaterialReturn() {
  const { user } = useAuth();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [lookupInvoice, setLookupInvoice] = useState("");
  const [lookupResult, setLookupResult] = useState(null);
  const [looking, setLooking] = useState(false);
  const [form, setForm] = useState({ doNumber: "", partyName: "", productName: "", returnQty: "", reason: "", transporterName: "", vehicleNo: "", returnDate: "", dcNumber: "", dcPhoto: "" });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isAdmin = user?.role === "admin" || user?.page_access === "all" || user?.page_access === "super admin";

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/order/material-return`);
      const json = await res.json();
      setReturns(json.data || []);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleLookup = async () => {
    if (!lookupInvoice) return;
    setLooking(true);
    try {
      const res = await fetch(`${API_URL}/order/material-return/lookup?invoiceNo=${encodeURIComponent(lookupInvoice)}`);
      const json = await res.json();
      if (!json.success || !json.data) { toast.error("Invoice not found"); return; }
      setLookupResult(json.data);
      setForm(f => ({ ...f, doNumber: json.data.doNumber || "", partyName: json.data.partyName || "", productName: json.data.productName || "" }));
    } catch { toast.error("Lookup failed"); } finally { setLooking(false); }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try { const url = await uploadFileToStorage(file, "order-return-dc"); setForm(f => ({ ...f, dcPhoto: url })); toast.success("Uploaded"); }
    catch { toast.error("Upload failed"); } finally { setUploading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.returnQty || !form.reason) { toast.error("Return qty and reason required"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/order/material-return`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ...form, invoiceNo: lookupInvoice }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed");
      toast.success(`Material return created — Return No: ${json.data?.returnNo}`);
      setShowForm(false); setForm({ doNumber: "", partyName: "", productName: "", returnQty: "", reason: "", transporterName: "", vehicleNo: "", returnDate: "", dcNumber: "", dcPhoto: "" }); setLookupResult(null); setLookupInvoice("");
      loadData();
    } catch (err) { toast.error(err.message); } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin w-6 h-6 text-emerald-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Material Return</h2>
        {isAdmin && <Button onClick={() => setShowForm(v => !v)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"><PackageX className="w-4 h-4" /> New Return</Button>}
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">New Material Return</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label className="text-xs text-zinc-500 mb-1 block">Lookup by Invoice No.</Label>
                <Input value={lookupInvoice} onChange={e => setLookupInvoice(e.target.value)} className="h-9" placeholder="Enter invoice number..." />
              </div>
              <Button type="button" onClick={handleLookup} disabled={looking} variant="outline" className="h-9 gap-2">
                {looking ? <Loader2 className="animate-spin w-4 h-4" /> : "Lookup"}
              </Button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[["doNumber", "DO No."], ["partyName", "Party Name"], ["productName", "Product Name"], ["returnQty", "Return Qty *"], ["reason", "Reason *"], ["transporterName", "Transporter Name"], ["vehicleNo", "Vehicle No."], ["returnDate", "Return Date", "date"], ["dcNumber", "DC Number"]].map(([k, l, type = "text"]) => (
                  <div key={k}><Label className="text-xs text-zinc-500 mb-1 block">{l}</Label><Input type={type} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} className="h-9" /></div>
                ))}
                <div>
                  <Label className="text-xs text-zinc-500 mb-1 block">DC Photo</Label>
                  <div className="flex items-center gap-2"><Input type="file" accept="image/*,.pdf" onChange={handleFile} className="h-9" />{uploading && <Loader2 className="animate-spin w-4 h-4 text-emerald-500 shrink-0" />}</div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={submitting || uploading} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                  {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />} Submit Return
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 dark:bg-zinc-900/60">
              {["Return No.", "DO No.", "Party", "Product", "Return Qty", "Date", "Status"].map(h => <TableHead key={h} className="text-xs font-semibold whitespace-nowrap">{h}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {returns.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-zinc-400">No material returns</TableCell></TableRow>
            ) : returns.map(r => (
              <TableRow key={r.id} className="text-sm">
                <TableCell className="font-mono text-xs">{r.returnNo}</TableCell>
                <TableCell className="font-mono text-xs">{r.doNumber}</TableCell>
                <TableCell>{r.partyName}</TableCell>
                <TableCell>{r.productName}</TableCell>
                <TableCell>{r.returnQty}</TableCell>
                <TableCell className="text-xs">{r.returnDate ? new Date(r.returnDate).toLocaleDateString() : "—"}</TableCell>
                <TableCell><Badge className="text-xs border-0 bg-amber-100 text-amber-700">{r.status || "Pending"}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
