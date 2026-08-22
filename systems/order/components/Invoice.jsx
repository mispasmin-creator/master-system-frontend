"use client";
import React, { useState, useEffect, useCallback } from "react";
import { API_URL, getToken } from "@/lib/auth";
import { useAuth } from "@/systems/order/context/AuthContext";
import { uploadFileToStorage } from "@/systems/order/utils/storageUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function Invoice() {
  const { user, isReadOnly, isSuperAdmin } = useAuth();
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [selected, setSelected] = useState([]);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [invoiceCopy, setInvoiceCopy] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, h] = await Promise.all([
        fetch(`${API_URL}/order/invoice/pending`).then(r => r.json()),
        fetch(`${API_URL}/order/invoice/history`).then(r => r.json()),
      ]);
      setPending(p.data || []); setHistory(h.data || []);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(i => i !== id) : [...s, id]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const res = await uploadFileToStorage(file, "order-invoice");
      const url = typeof res === "object" && res?.url ? res.url : (typeof res === "string" ? res : "");
      setInvoiceCopy(url);
      toast.success("Invoice uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selected.length === 0) { toast.error("Select at least one dispatch"); return; }
    const copyUrl = typeof invoiceCopy === "object" && invoiceCopy?.url ? invoiceCopy.url : String(invoiceCopy || "");
    if (!invoiceNo || !invoiceDate || !copyUrl) { toast.error("Invoice No., date and file are required"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/order/invoice/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ dispatchIds: selected, invoiceNo, invoiceDate, invoiceCopy: copyUrl }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed");
      toast.success("Invoice submitted"); setSelected([]); setInvoiceNo(""); setInvoiceDate(""); setInvoiceCopy(""); loadData();
    } catch (err) { toast.error(err.message); } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin w-6 h-6 text-emerald-500" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Invoice</h2>
      <div className="flex gap-2">
        {["pending", "history"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${tab === t ? "bg-emerald-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"}`}
          >{t} ({t === "pending" ? pending.length : history.length})</button>
        ))}
      </div>

      {tab === "pending" && selected.length > 0 && !isReadOnly && (
        <Card>
          <CardHeader><CardTitle className="text-base">Invoice Details — {selected.length} dispatch(es)</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><Label className="text-xs text-zinc-500 mb-1 block">Invoice No. *</Label><Input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} className="h-9" /></div>
                <div><Label className="text-xs text-zinc-500 mb-1 block">Invoice Date *</Label><Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="h-9" /></div>
                <div>
                  <Label className="text-xs text-zinc-500 mb-1 block">Invoice Copy *</Label>
                  <div className="flex items-center gap-2"><Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFile} className="h-9" />{uploading && <Loader2 className="animate-spin w-4 h-4 text-emerald-500 shrink-0" />}</div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={submitting || uploading} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                  {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />} Submit Invoice
                </Button>
                <Button type="button" variant="outline" onClick={() => setSelected([])}>Deselect All</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 dark:bg-zinc-900/60">
              {tab === "pending" && <TableHead className="w-8"></TableHead>}
              {["D-Sr No.", "DO No.", "Party", "Product", "Qty", "Date", tab === "history" ? "Invoice No." : "TC Required"].map(h => <TableHead key={h} className="text-xs font-semibold whitespace-nowrap">{h}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(tab === "pending" ? pending : history).length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-zinc-400">No records</TableCell></TableRow>
            ) : (tab === "pending" ? pending : history).map(r => (
              <TableRow key={r.id} className={`text-sm cursor-pointer ${selected.includes(r.id) ? "bg-emerald-50 dark:bg-emerald-900/20" : ""}`}
                onClick={() => tab === "pending" && !isReadOnly && toggle(r.id)}>
                {tab === "pending" && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.includes(r.id)}
                      disabled={isReadOnly}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (!isReadOnly) toggle(r.id);
                      }}
                      className="accent-emerald-600 cursor-pointer disabled:cursor-not-allowed"
                    />
                  </TableCell>
                )}
                <TableCell className="font-mono text-xs">{r.dSrNumber}</TableCell>
                <TableCell className="font-mono text-xs">{r.doNumber}</TableCell>
                <TableCell>{r.partyName}</TableCell>
                <TableCell>{r.productName}</TableCell>
                <TableCell>{r.qtyToBeDispatched}</TableCell>
                <TableCell className="text-xs">{r.dateOfDispatch ? new Date(r.dateOfDispatch).toLocaleDateString() : "—"}</TableCell>
                <TableCell>{tab === "history" ? (r.invoice?.billNumber || "—") : <Badge variant="outline" className="text-xs">{r.tcRequired || "—"}</Badge>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
