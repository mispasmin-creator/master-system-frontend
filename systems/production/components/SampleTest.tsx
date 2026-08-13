"use client"
import { API_URL } from "@/lib/auth"
import React, { useState, useEffect, useCallback, useMemo } from "react"
import {
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Upload,
  Image as ImageIcon,
  FlaskConical,
  ArrowLeft,
  ShieldCheck,
  Check,
  Beaker,
  Search
} from "lucide-react"
import { format } from "date-fns"
import { productionApi } from "@/systems/production/lib/api";
import { Toaster } from "@/systems/production/components/ui/toaster"
import { useToast } from "@/systems/production/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/systems/production/components/ui/tabs"
import { Button } from "@/systems/production/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/systems/production/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/systems/production/components/ui/table"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription, SheetBody } from "@/systems/production/components/ui/sheet"
import { Label } from "@/systems/production/components/ui/label"
import { Input } from "@/systems/production/components/ui/input"
import { Textarea } from "@/systems/production/components/ui/textarea"
import { Badge } from "@/systems/production/components/ui/badge"
import { cn } from "@/systems/production/lib/utils"

// --- Constants ---
const SAMPLE_TEST_TABLE = "sample_test"
const COSTING_RESPONSE_TABLE = "costing_response"
const PRODUCTION_TABLE = "production"

interface SampleItem {
  id: string // ProductionSampleTest row id; empty string if no row exists yet for this costing
  costingId: string
  productionId?: string
  compositionNo: string
  orderNo: string
  partyName: string
  productName: string
  orderQuantity: number
  status: string
  sampleTestStatus?: string
  sampleTestCompletedAt?: string
  // Composition for display
  rmValues: { rm: string; qty: number; cost: number }[]
}

export default function SampleTestPage() {
  const { toast } = useToast()
  const [pendingItems, setPendingItems] = useState<SampleItem[]>([])
  const [historyItems, setHistoryItems] = useState<SampleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("pending")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredPending = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return pendingItems
    return pendingItems.filter(item =>
      (item.compositionNo || "").toLowerCase().includes(q) ||
      (item.orderNo || "").toLowerCase().includes(q) ||
      (item.partyName || "").toLowerCase().includes(q) ||
      (item.productName || "").toLowerCase().includes(q)
    )
  }, [pendingItems, searchQuery])

  const filteredHistory = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return historyItems
    return historyItems.filter(item =>
      (item.compositionNo || "").toLowerCase().includes(q) ||
      (item.orderNo || "").toLowerCase().includes(q) ||
      (item.partyName || "").toLowerCase().includes(q) ||
      (item.productName || "").toLowerCase().includes(q)
    )
  }, [historyItems, searchQuery])

  // Modal / Action state
  const [selectedItem, setSelectedItem] = useState<SampleItem | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [remarks, setRemarks] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [
        { data: sampleTestData, error: sampleErr },
        { data: costingData, error: costingErr },
        { data: prodData, error: prodErr },
      ] = await Promise.all([
        await productionApi.get(SAMPLE_TEST_TABLE),
        await productionApi.get(COSTING_RESPONSE_TABLE),
        await productionApi.get(PRODUCTION_TABLE),
      ])

      if (sampleErr) throw sampleErr
      if (costingErr) throw costingErr
      if (prodErr) throw prodErr

      // Map of ProductionOrder rows by id (for party/product/qty display)
      const orderById = new Map<string, any>()
        ; (prodData || []).forEach((o: any) => {
          if (o?.id) orderById.set(o.id, o)
        })

      // Map of ProductionSampleTest rows by costingId (1:1 relation)
      const sampleTestByCostingId = new Map<string, any>()
        ; (sampleTestData || []).forEach((s: any) => {
          if (s?.costingId) sampleTestByCostingId.set(s.costingId, s)
        })

      // Build one row per ProductionCosting, joined with its (optional) sample test
      // result and its (optional) order for display info.
      const mapped: SampleItem[] = (costingData || []).map((costing: any) => {
        const order = costing?.orderId ? orderById.get(costing.orderId) : undefined
        const sampleTest = sampleTestByCostingId.get(costing.id)
        const rawStatus = sampleTest?.status || ""

        // Synthesize the same workflow status labels the UI already understands.
        const status =
          rawStatus === "OK" ? "Management Approved" :
          rawStatus === "Not OK" ? "Sample Test Failed" :
          "Sample Test Pending"

        return {
          id: sampleTest?.id || "",
          costingId: costing.id,
          productionId: order?.id || "",
          compositionNo: costing.compositionNo || "",
          orderNo: order?.deliveryOrderNo || "",
          partyName: order?.partyName || "",
          productName: order?.productName || "",
          orderQuantity: Number(order?.orderQuantity || 0),
          status,
          sampleTestStatus: rawStatus || undefined,
          sampleTestCompletedAt: sampleTest?.updatedAt
            ? format(new Date(sampleTest.updatedAt), "dd/MM/yy HH:mm")
            : undefined,
          rmValues: [] // Composition breakdown (RM/QTY/COST) is not exposed by /costing yet
        }
      })

      setPendingItems(mapped.filter(i => i.status === "Sample Test Pending"))
      setHistoryItems(mapped.filter(i => i.status !== "Sample Test Pending"))

    } catch (err: any) {
      setError(`Failed to load data: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const openTestDialog = (item: SampleItem) => {
    setSelectedItem(item)
    // ProductionSampleTest has no remarks/image columns, so there is nothing to
    // preload here — each test attempt starts with a clean remarks/image state.
    setRemarks("")
    setImageFile(null)
    setImagePreview(null)
    setIsDialogOpen(true)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (result: "OK" | "Not OK") => {
    if (!selectedItem) return
    if (!imageFile && !imagePreview) {
      toast({ title: "Image Required", description: "Please upload a sample test image.", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      // 1. Upload Image if new file selected. Kept as physical evidence storage;
      // ProductionSampleTest has no column to link this URL to, so it is not
      // attached to the record below (only status is persisted there).
      if (imageFile) {
        const uploadResponse = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          body: (() => { const fd = new FormData(); fd.append('file', imageFile); return fd; })()
        })

        if (!uploadResponse.ok) {
          const errorBody = await uploadResponse.json().catch(() => null)
          throw new Error(errorBody?.error || `Upload failed with status ${uploadResponse.status}`)
        }
      }

      // 2. Find-or-create the ProductionSampleTest row for this costing.
      if (selectedItem.id) {
        const { error: updateErr } = await productionApi.patch(SAMPLE_TEST_TABLE, selectedItem.id, { status: result })
        if (updateErr) throw updateErr
      } else {
        const { error: createErr } = await productionApi.post(SAMPLE_TEST_TABLE, {
          costingId: selectedItem.costingId,
          status: result,
        })
        if (createErr) throw createErr
      }

      toast({
        title: result === "OK" ? "Test Passed" : "Test Failed",
        description: result === "OK" ? "Item moved to Job Cards." : "Item remains in pending list.",
        variant: result === "OK" ? "default" : "destructive"
      })

      setIsDialogOpen(false)
      loadData()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen max-w-full overflow-x-hidden">
      <Toaster />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Beaker className="h-6 w-6 text-olive-600" />
            Sample Test
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Verify products with physical sample tests before production.</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-olive-50 px-3 py-1 text-sm shadow-sm border-olive-100 text-olive-700">
            <div className="w-2 h-2 rounded-full bg-olive-500 mr-2 animate-pulse" />
            {filteredPending.length} Pending
          </Badge>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <TabsList className="grid w-full max-w-md grid-cols-2 mb-0 p-1 bg-slate-100 rounded-xl">
                <TabsTrigger value="pending" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-olive-700 data-[state=active]:shadow-sm transition-all">
                  Pending Tests
                </TabsTrigger>
                <TabsTrigger value="history" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-olive-700 data-[state=active]:shadow-sm transition-all">
                  Test History
                </TabsTrigger>
              </TabsList>
              <div className="relative w-full sm:w-[300px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search sample tests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 focus-visible:ring-olive-500"
                />
              </div>
            </div>

            <TabsContent value="pending" className="mt-0">
              {loading ? (
                <div className="flex justify-center items-center py-20"><Loader2 className="h-10 w-10 animate-spin text-olive-600" /></div>
              ) : filteredPending.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 animate-fade-in flex flex-col items-center justify-center">
                  <CheckCircle2 className="h-16 w-16 text-slate-300 mb-4" />
                  <p className="text-slate-500 text-lg font-medium">No pending sample tests found.</p>
                </div>
              ) : (
                <div className="overflow-hidden border border-slate-100 rounded-2xl shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50/80">
                      <TableRow>
                        <TableHead>Composition No.</TableHead>
                        <TableHead>ID</TableHead>
                        <TableHead>Order No.</TableHead>
                        <TableHead>Party Name</TableHead>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPending.map((item) => (
                        <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell className="font-bold text-olive-600">{item.compositionNo}</TableCell>
                          <TableCell className="font-medium text-slate-700">{item.productionId || "-"}</TableCell>
                          <TableCell className="font-medium text-slate-700">{item.orderNo}</TableCell>
                          <TableCell className="font-medium text-slate-700">{item.partyName || "-"}</TableCell>
                          <TableCell className="font-semibold text-slate-900">{item.productName}</TableCell>
                          <TableCell className="font-medium text-slate-700">{item.orderQuantity || "-"}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              onClick={() => openTestDialog(item)}
                              className="bg-olive-600 hover:bg-olive-700 text-white shadow-lg shadow-olive-100"
                            >
                              Perform Test
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              <div className="overflow-hidden border border-slate-100 rounded-2xl shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50/80">
                    <TableRow>
                      <TableHead>Composition No.</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Order No.</TableHead>
                      <TableHead>Party Name</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Completed At</TableHead>
                      <TableHead className="text-right">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-12 text-sm text-slate-400 italic">
                          No test history found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredHistory.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-bold text-slate-600">{item.compositionNo}</TableCell>
                          <TableCell className="text-slate-600">{item.productionId || "-"}</TableCell>
                          <TableCell className="text-slate-600">{item.orderNo}</TableCell>
                          <TableCell className="text-slate-600">{item.partyName || "-"}</TableCell>
                          <TableCell className="font-medium text-slate-700">{item.productName}</TableCell>
                          <TableCell className="text-slate-600">{item.orderQuantity || "-"}</TableCell>
                          <TableCell>
                            <Badge className={cn("px-2 py-1", item.sampleTestStatus === "OK" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                              {item.sampleTestStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-500">{item.sampleTestCompletedAt}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => openTestDialog(item)}>
                              <Eye className="h-5 w-5 text-slate-400" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* --- TEST SHEET --- */}
      <Sheet open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="text-2xl font-bold flex items-center gap-2">
              {selectedItem?.status === "Sample Test Pending" ? "Submit Sample Test" : "Sample Test Details"}
            </SheetTitle>
            <SheetDescription>
              Order: {selectedItem?.orderNo} | Party: {selectedItem?.partyName || "-"} | Product: {selectedItem?.productName} | Qty: {selectedItem?.orderQuantity || "-"}
            </SheetDescription>
          </SheetHeader>

          {selectedItem && (
            <div className="flex flex-col flex-1 min-h-0">
              <SheetBody className="space-y-6 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Composition Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Composition</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {selectedItem.rmValues.map((pair, idx) => (
                      <div key={idx} className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex justify-between">
                        <span className="text-xs text-slate-600 truncate max-w-[120px]">{pair.rm}</span>
                        <span className="text-xs font-bold text-slate-900">{pair.qty}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4">
                    <Label className="text-sm font-bold text-slate-500 uppercase tracking-widest block mb-2">Remarks</Label>
                    <Textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Add any observations from the sample test..."
                      disabled={selectedItem.status !== "Sample Test Pending"}
                      className="bg-white"
                    />
                  </div>
                </div>

                {/* Right: Image Upload */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Sample Image</h3>
                  <div className="relative aspect-square rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center overflow-hidden group">
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} alt="Sample" className="w-full h-full object-cover" />
                        {selectedItem.status === "Sample Test Pending" && (
                          <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white font-medium">
                            <Upload className="mr-2 h-5 w-5" /> Change Image
                            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                          </label>
                        )}
                      </>
                    ) : (
                      <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-6 text-center">
                        <ImageIcon className="h-12 w-12 text-slate-300 mb-2" />
                        <span className="text-sm text-slate-500 font-medium">Upload physical sample photograph</span>
                        <span className="text-[10px] text-slate-400 mt-1 uppercase">JPG, PNG up to 5MB</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                      </label>
                    )}
                  </div>
                </div>
              </div>
              </SheetBody>

              <SheetFooter className="mt-auto pt-4 border-t gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                {selectedItem?.status === "Sample Test Pending" && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => handleSubmit("Not OK")}
                      disabled={isSubmitting}
                      className="px-6"
                    >
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                      Result Not OK
                    </Button>
                    <Button
                      onClick={() => handleSubmit("OK")}
                      disabled={isSubmitting}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-8"
                    >
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                      Result OK
                    </Button>
                  </>
                )}
              </SheetFooter>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
