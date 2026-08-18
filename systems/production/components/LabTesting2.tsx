"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Loader2, AlertTriangle, CalendarIcon, TestTube2, History, Settings, Eye, Search, FileDown } from "lucide-react"
import { format } from "date-fns"
import { productionApi } from "@/systems/production/lib/api";
import { useAuth, FIRM_MAP } from "@/systems/production/context/AuthContext"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/systems/production/components/ui/tabs"
import { Button } from "@/systems/production/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/systems/production/components/ui/card"
import { Input } from "@/systems/production/components/ui/input"
import { Label } from "@/systems/production/components/ui/label"
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "@/systems/production/components/ui/table"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody, SheetFooter } from "@/systems/production/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/systems/production/components/ui/select"
import { Calendar } from "@/systems/production/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/systems/production/components/ui/popover"
import { Badge } from "@/systems/production/components/ui/badge"
import { Checkbox } from "@/systems/production/components/ui/checkbox"
import { cn } from "@/systems/production/lib/utils"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

// Type Definitions
interface RawMaterial {
  name: string
  quantity: number | string
}

interface ProductionItem {
  id: string
  jobCardId: string
  productionId?: number | string
  jobCardNo: string
  deliveryOrderNo: string
  partyName: string
  productName: string
  quantity: number
  expectedDeliveryDate: string
  plannedDate: string
  priority: string
  dateOfProduction: string
  supervisorName: string
  shift: string
  rawMaterials: RawMaterial[]
  machineHours: string
  labTest1Status: string
  firmName: string
}

interface HistoryItem {
  id: string
  jobCardId: string
  productionId?: number | string
  jobCardNo: string
  deliveryOrderNo: string
  partyName: string
  productName: string
  quantity: number
  test1Status: string
  dateOfTest2: string
  testedBy: string
  test2Status: string
  bdAt110?: string
  ccsAt100?: string
  // BD/CCS/PLC at 1100°C have no matching columns on ProductionQcCheckpoint (only
  // bdAt110c/ccsAt100c exist) - kept in the UI/interface but always blank.
  ccsAt1100: string
  plcAt1100: string
  bdAt1100: string
  test2CompletedAt: string
  firmName: string
}

// Table Names
const JOBCARDS_TABLE = "jobcards"
const MASTER_TABLE = "master"
const QC_CHECKPOINTS_TABLE = "qc_checkpoints"
const LAB1_STAGE = "lab1"
const LAB2_STAGE = "lab2"

// Add this function for formatting machine hours
const formatMachineHours = (hours: any) => {
  if (!hours || hours === "-") return "-"
  const hoursStr = String(hours)
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(hoursStr)) return hoursStr
  
  const numHours = Number.parseFloat(hoursStr)
  if (!isNaN(numHours)) {
    const wholeHours = Math.floor(numHours)
    const minutes = Math.floor((numHours - wholeHours) * 60)
    const seconds = Math.floor(((numHours - wholeHours) * 60 - minutes) * 60)
    return `${wholeHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  const date = new Date(hours)
  if (!isNaN(date.getTime())) {
    const h = date.getHours()
    const m = date.getMinutes()
    const s = date.getSeconds()
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  return hoursStr
}

// Column Definitions
const PENDING_COLUMNS_META = [
  { header: "Action", dataKey: "actionColumn", alwaysVisible: true, toggleable: false },
  { header: "ID", dataKey: "productionId", toggleable: true },
  { header: "Job Card No.", dataKey: "jobCardNo", alwaysVisible: true, toggleable: false },
  { header: "Party Name", dataKey: "partyName", toggleable: true },
  { header: "Delivery Order No.", dataKey: "deliveryOrderNo", toggleable: true },
  { header: "Product Name", dataKey: "productName", toggleable: true },
  { header: "Quantity", dataKey: "quantity", toggleable: true },
  { header: "Expected Delivery Date", dataKey: "expectedDeliveryDate", toggleable: true },
  { header: "Priority", dataKey: "priority", toggleable: true },
  { header: "Planned Date", dataKey: "plannedDate", toggleable: true },
  { header: "Date of Production", dataKey: "dateOfProduction", toggleable: true },
  { header: "Supervisor Name", dataKey: "supervisorName", toggleable: true },
  { header: "Shift", dataKey: "shift", toggleable: true },
  { header: "Raw Materials", dataKey: "rawMaterials", toggleable: true },
  { header: "Machine Hours", dataKey: "machineHours", toggleable: true },
  { header: "Lab Test 1 Status", dataKey: "labTest1Status", toggleable: true },
]

const HISTORY_COLUMNS_META = [
  { header: "Completed At", dataKey: "test2CompletedAt", toggleable: true },
  { header: "ID", dataKey: "productionId", toggleable: true },
  { header: "Job Card No.", dataKey: "jobCardNo", alwaysVisible: true, toggleable: false },
  { header: "Party Name", dataKey: "partyName", toggleable: true },
  { header: "Product Name", dataKey: "productName", toggleable: true },
  { header: "Delivery Order No.", dataKey: "deliveryOrderNo", toggleable: true },
  { header: "Quantity", dataKey: "quantity", toggleable: true },
  { header: "Test 1 Status", dataKey: "test1Status", toggleable: true },
  { header: "Date of Test 2", dataKey: "dateOfTest2", toggleable: true },
  { header: "Tested By", dataKey: "testedBy", toggleable: true },
  { header: "Test 2 Status", dataKey: "test2Status", toggleable: true },
  { header: "BD at 110°C", dataKey: "bdAt110", toggleable: true },
  { header: "CCS at 100°C", dataKey: "ccsAt100", toggleable: true },
  { header: "CCS at 1100°C", dataKey: "ccsAt1100", toggleable: true },
  { header: "PLC at 1100°C", dataKey: "plcAt1100", toggleable: true },
  { header: "BD at 1100°C", dataKey: "bdAt1100", toggleable: true },
]

// Initial State for Form
const initialFormState = {
  dateOfTest: new Date(),
  testStatus: "",
  bdAt110: "",
  ccsAt100: "",
  bdAt1100: "",
  ccsAt1100: "",
  plcAt1100: "",
  testedBy: "",
  remarks: "",
}

const isCancelledStatus = (value: any) => String(value || "").trim().toLowerCase() === "cancelled"
const normalizeKey = (value: any) => String(value || "").trim().toLowerCase()

const parseUIDate = (dateStr: string) => {
  if (!dateStr || dateStr === "-") return null
  const parts = dateStr.split("/")
  if (parts.length !== 3) return null
  const day = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1
  let year = parseInt(parts[2], 10)
  if (parts[2].length === 2) {
    year += 2000
  }
  const date = new Date(year, month, day)
  return isNaN(date.getTime()) ? null : date
}

export default function LabTesting2Page() {
  const { user } = useAuth()
  const [pendingTests, setPendingTests] = useState<ProductionItem[]>([])
  const [historyTests, setHistoryTests] = useState<HistoryItem[]>([])
  const [statusOptions, setStatusOptions] = useState<string[]>([])
  const [testedByOptions, setTestedByOptions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedTest, setSelectedTest] = useState<ProductionItem | null>(null)
  const [formData, setFormData] = useState(initialFormState)
  const [formErrors, setFormErrors] = useState<Record<string, string | null>>({})
  const [activeTab, setActiveTab] = useState("pending")
  const [visiblePendingColumns, setVisiblePendingColumns] = useState<Record<string, boolean>>({})
  const [visibleHistoryColumns, setVisibleHistoryColumns] = useState<Record<string, boolean>>({})
  const [viewingMaterials, setViewingMaterials] = useState<RawMaterial[] | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [productFilter, setProductFilter] = useState("all")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  const uniqueProductsForFilter = useMemo(() => {
    const products = new Set<string>()
    pendingTests.forEach((item) => {
      if (item.productName) products.add(item.productName.trim())
    })
    historyTests.forEach((item) => {
      if (item.productName) products.add(item.productName.trim())
    })
    return Array.from(products).sort()
  }, [pendingTests, historyTests])

  const filteredPending = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    let list = pendingTests

    if (productFilter !== "all") {
      list = list.filter((item) => String(item.productName || "").trim().toLowerCase() === productFilter.toLowerCase())
    }

    if (fromDate || toDate) {
      const from = fromDate ? new Date(fromDate) : null
      if (from) from.setHours(0, 0, 0, 0)
      const to = toDate ? new Date(toDate) : null
      if (to) to.setHours(23, 59, 59, 999)

      list = list.filter((item) => {
        const itemDate = parseUIDate(item.dateOfProduction || item.plannedDate || "")
        if (!itemDate) return false
        if (from && itemDate < from) return false
        if (to && itemDate > to) return false
        return true
      })
    }

    if (!q) return list
    return list.filter(item =>
      (item.jobCardNo || "").toLowerCase().includes(q) ||
      (item.deliveryOrderNo || "").toLowerCase().includes(q) ||
      (item.productName || "").toLowerCase().includes(q) ||
      (item.partyName || "").toLowerCase().includes(q) ||
      (item.supervisorName || "").toLowerCase().includes(q)
    )
  }, [pendingTests, searchQuery, fromDate, toDate, productFilter])

  const filteredHistory = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    let list = historyTests

    if (productFilter !== "all") {
      list = list.filter((item) => String(item.productName || "").trim().toLowerCase() === productFilter.toLowerCase())
    }

    if (fromDate || toDate) {
      const from = fromDate ? new Date(fromDate) : null
      if (from) from.setHours(0, 0, 0, 0)
      const to = toDate ? new Date(toDate) : null
      if (to) to.setHours(23, 59, 59, 999)

      list = list.filter((item) => {
        const itemDate = parseUIDate(item.dateOfTest2)
        if (!itemDate) return false
        if (from && itemDate < from) return false
        if (to && itemDate > to) return false
        return true
      })
    }

    if (!q) return list
    return list.filter(item =>
      (item.jobCardNo || "").toLowerCase().includes(q) ||
      (item.deliveryOrderNo || "").toLowerCase().includes(q) ||
      (item.productName || "").toLowerCase().includes(q) ||
      (item.partyName || "").toLowerCase().includes(q) ||
      (item.testedBy || "").toLowerCase().includes(q)
    )
  }, [historyTests, searchQuery, fromDate, toDate, productFilter])

  const pendingTotalQty = useMemo(
    () => filteredPending.reduce((total, item) => total + (Number(item.quantity) || 0), 0),
    [filteredPending]
  )

  const historyTotalQty = useMemo(
    () => filteredHistory.reduce((total, item) => total + (Number(item.quantity) || 0), 0),
    [filteredHistory]
  )

  const handleExportPDF = () => {
    const doc = new jsPDF("landscape")
    const isPending = activeTab === "pending"
    const title = isPending ? "Lab Testing 2 - Pending Tests" : "Lab Testing 2 - Test History"
    const columnsMeta = isPending ? visiblePendingColumnsMeta : visibleHistoryColumnsMeta
    const dataList = isPending ? filteredPending : filteredHistory

    const exportColumns = columnsMeta.filter(col => col.dataKey !== "actionColumn")
    const headers = exportColumns.map(col => col.header)
    const rows = dataList.map(item => {
      return exportColumns.map(col => {
        const key = col.dataKey
        const value = (item as any)[key]
        if (key === "rawMaterials") {
          const materials = value as RawMaterial[]
          if (!materials || materials.length === 0) return "-"
          return materials.map(m => `${m.name}: ${m.quantity}`).join(", ")
        }
        if (key === "machineHours") {
          return formatMachineHours(value)
        }
        return value !== undefined && value !== null ? String(value) : "-"
      })
    })

    const colCount = exportColumns.length
    const fontSize = colCount > 15 ? 6 : colCount > 11 ? 7 : 8
    const cellPadding = colCount > 15 ? 1 : colCount > 11 ? 1.5 : 2
    const startY = fromDate || toDate ? 22 : 15

    doc.setFontSize(14)
    doc.text(title, 8, 10)

    if (fromDate || toDate) {
      doc.setFontSize(9)
      doc.text(`Date Range: ${fromDate || "Any"} to ${toDate || "Any"}`, 8, 16)
    }

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: startY,
      margin: { left: 8, right: 8 },
      theme: "grid",
      styles: { 
        fontSize: fontSize, 
        cellPadding: cellPadding,
        overflow: "linebreak" 
      },
      headStyles: { fillColor: [107, 110, 48] },
      bodyStyles: { textColor: [0, 0, 0] }
    })

    doc.save(`${title.toLowerCase().replace(/ /g, "_")}_${format(new Date(), "yyyyMMdd")}.pdf`)
  }

  useEffect(() => {
    const initializeVisibility = (columnsMeta: any[]) => {
      const visibility: Record<string, boolean> = {}
      columnsMeta.forEach((col) => {
        visibility[col.dataKey] = col.alwaysVisible !== false
      })
      return visibility
    }
    setVisiblePendingColumns(initializeVisibility(PENDING_COLUMNS_META))
    setVisibleHistoryColumns(initializeVisibility(HISTORY_COLUMNS_META))
  }, [])

  const loadAllData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // job-cards returns each card with its order (ProductionOrder), actualRuns
      // (with materials) and qcChecks already joined in - no more manual
      // jobCardNo/orderNo/productName string-matching across separate sheets.
      const [
        { data: jobCardsData, error: jobCardsErr },
        { data: masterData, error: masterErr },
      ] = await Promise.all([
        productionApi.get(JOBCARDS_TABLE),
        productionApi.get(MASTER_TABLE),
      ])

      if (jobCardsErr) throw jobCardsErr
      if (masterErr) throw masterErr

      const buildRawMaterials = (materials: any[]): RawMaterial[] =>
        (materials || []).map((m: any) => ({ name: m.materialName || "", quantity: m.quantity ?? 0 }))

      const pendingData: ProductionItem[] = []
      const historyData: HistoryItem[] = []

      ;(jobCardsData || []).forEach((jc: any) => {
        if (isCancelledStatus(jc.status)) return
        const order = jc.order || {}
        const actualRun = (jc.actualRuns && jc.actualRuns[0]) || null
        if (!actualRun) return

        const lab1Check = (jc.qcChecks || []).find((c: any) => c.stage === "lab1")
        // Lab 2 only becomes relevant once Lab 1 has a recorded decision (tested, non
        // tested, or auto-skipped from Lab 1 - see LabTesting1's save handler).
        if (!lab1Check) return
        const lab2Check = (jc.qcChecks || []).find((c: any) => c.stage === LAB2_STAGE)

        const base = {
          id: jc.id,
          jobCardId: jc.id,
          productionId: order.id ?? "",
          jobCardNo: String(jc.jobCardNo || "").trim(),
          deliveryOrderNo: String(order.deliveryOrderNo || ""),
          partyName: String(order.partyName || ""),
          productName: String(order.productName || ""),
          quantity: Number(actualRun.quantityFg || jc.quantity || 0),
          expectedDeliveryDate: order.expectedDeliveryDate ? format(new Date(order.expectedDeliveryDate), "dd/MM/yyyy") : "",
          priority: String(order.priority || ""),
          dateOfProduction: actualRun.dateOfProduction
            ? format(new Date(actualRun.dateOfProduction), "dd/MM/yyyy")
            : (jc.dateOfProduction ? format(new Date(jc.dateOfProduction), "dd/MM/yyyy") : ""),
          // No "Planned Date" concept remains for this stage in the new schema.
          plannedDate: "",
          supervisorName: String(actualRun.supervisorName || jc.supervisorName || ""),
          shift: String(jc.shift || ""),
          rawMaterials: buildRawMaterials(actualRun.materials),
          machineHours: actualRun.machineHours != null ? String(actualRun.machineHours) : "-",
          labTest1Status: String(lab1Check.status || "N/A"),
          firmName: String(order.firmName || ""),
        }

        if (!lab2Check) {
          pendingData.push(base as ProductionItem)
        } else {
          historyData.push({
            ...base,
            test1Status: base.labTest1Status,
            dateOfTest2: lab2Check.dateOfTest ? format(new Date(lab2Check.dateOfTest), "dd/MM/yyyy") : "",
            testedBy: String(lab2Check.testedBy || ""),
            test2Status: String(lab2Check.status || "N/A"),
            bdAt110: lab2Check.bdAt110c != null ? String(lab2Check.bdAt110c) : "",
            ccsAt100: lab2Check.ccsAt100c != null ? String(lab2Check.ccsAt100c) : "",
            // BD/CCS/PLC at 1100°C have no matching columns on ProductionQcCheckpoint.
            ccsAt1100: "",
            plcAt1100: "",
            bdAt1100: "",
            test2CompletedAt: lab2Check.createdAt ? format(new Date(lab2Check.createdAt), "dd/MM/yy HH:mm") : "",
          } as HistoryItem)
        }
      })

      const userFirms = user?.firm ? user.firm.split(',').map((f: string) => f.trim()).filter(Boolean) : []
      const isAdmin = user?.role?.toLowerCase() === "admin"
      const filterByFirm = (list: any[]) => {
        if (isAdmin || userFirms.length === 0) return list
        return list.filter((item) => {
          const fName = String(item.firmName || "").toLowerCase()
          return userFirms.some((uf: string) => {
            const firmSearch = uf.toLowerCase()
            const mappedFirmLower = (FIRM_MAP[uf] || uf).toLowerCase()
            return fName.includes(firmSearch) || fName.includes(mappedFirmLower)
          })
        })
      }

      setPendingTests(filterByFirm(pendingData))
      setHistoryTests(
        filterByFirm(historyData).sort(
          (a: any, b: any) => new Date(b.test2CompletedAt).getTime() - new Date(a.test2CompletedAt).getTime()
        )
      )

      // Set options from master data
      const statuses = [...new Set((masterData || []).map((row: any) => String(row.testStatus || "")).filter(Boolean))] as string[]
      if (!statuses.includes("Tested")) statuses.push("Tested")
      if (!statuses.includes("Non Tested")) statuses.push("Non Tested")
      setStatusOptions(statuses)

      const testedByOpts = [...new Set((masterData || []).map((row: any) => String(row.testedBy || "")).filter(Boolean))] as string[]
      setTestedByOptions(testedByOpts)
    } catch (err: any) {
      console.error("Error in loadAllData:", err)
      setError(`Failed to load data: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [user?.firm, user?.role])

  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  const handleFormChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const validateForm = () => {
    const errors: Record<string, string | null> = {}
    if (!formData.testStatus) errors.testStatus = "Status is required."
    
    if (formData.testStatus !== "Non Tested") {
      if (!formData.dateOfTest) errors.dateOfTest = "Date of Test is required."
      if (!formData.testedBy) errors.testedBy = "Tested By is required."
    } else {
      if (!formData.remarks || !formData.remarks.trim()) {
        errors.remarks = "Remark is required for Non Tested."
      }
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleOpenLabTesting = (test: ProductionItem) => {
    setSelectedTest(test)
    setFormData(initialFormState)
    setFormErrors({})
    setIsDialogOpen(true)
  }

  const handleSaveLabTest = async () => {
    if (!validateForm() || !selectedTest) return

    setIsSubmitting(true)
    try {
      const isNonTested = formData.testStatus === "Non Tested"

      // Only jobCardId/stage/dateOfTest/testedBy/bdAt110c/ccsAt100c/status map to real
      // columns on ProductionQcCheckpoint. BD/CCS/PLC at 1100°C and free-text remarks
      // have no matching column, so remarks are folded into `status` (Non Tested case)
      // and the 1100°C readings are simply not sent.
      let statusNote = String(formData.testStatus)
      if (isNonTested && formData.remarks?.trim()) {
        statusNote = `${statusNote}: ${formData.remarks.trim()}`
      }

      const payload: any = {
        jobCardId: selectedTest.jobCardId,
        stage: LAB2_STAGE,
        status: statusNote,
      }

      if (!isNonTested) {
        payload.testedBy = formData.testedBy
        payload.dateOfTest = formData.dateOfTest ? new Date(formData.dateOfTest).toISOString() : new Date().toISOString()
        payload.bdAt110c = formData.bdAt110 ? Number(formData.bdAt110) : null
        payload.ccsAt100c = formData.ccsAt100 ? Number(formData.ccsAt100) : null
      }

      const { error: createErr } = await productionApi.post(QC_CHECKPOINTS_TABLE, payload)

      if (createErr) throw createErr

      alert("Lab Test 2 data saved successfully!")
      setIsDialogOpen(false)
      await loadAllData()
    } catch (err: any) {
      setError(err.message)
      alert(`Error: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleColumn = (tab: string, dataKey: string, checked: boolean) => {
    const setter = tab === "pending" ? setVisiblePendingColumns : setVisibleHistoryColumns
    setter((prev) => ({ ...prev, [dataKey]: checked }))
  }

  const handleSelectAllColumns = (tab: string, columnsMeta: any[], checked: boolean) => {
    const newVisibility: Record<string, boolean> = {}
    columnsMeta.forEach((col: any) => {
      if (col.toggleable) newVisibility[col.dataKey] = checked
    })
    const setter = tab === "pending" ? setVisiblePendingColumns : setVisibleHistoryColumns
    setter((prev) => ({ ...prev, ...newVisibility }))
  }

  const visiblePendingColumnsMeta = useMemo(
    () => PENDING_COLUMNS_META.filter((col) => visiblePendingColumns[col.dataKey]),
    [visiblePendingColumns],
  )

  const visibleHistoryColumnsMeta = useMemo(
    () => HISTORY_COLUMNS_META.filter((col) => visibleHistoryColumns[col.dataKey]),
    [visibleHistoryColumns],
  )

  const renderRawMaterials = (materials: RawMaterial[]) => {
    if (!materials || materials.length === 0) return "-"

    return (
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs bg-transparent"
        onClick={() => setViewingMaterials(materials)}
      >
        <Eye className="h-3.5 w-3.5 mr-1.5" />
        View ({materials.length})
      </Button>
    )
  }

  const ColumnToggler = ({ tab, columnsMeta }: { tab: string; columnsMeta: any[] }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs bg-transparent ml-auto">
          <Settings className="mr-1.5 h-3.5 w-3.5" />
          View Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-3">
        <div className="grid gap-2">
          <p className="text-sm font-medium">Toggle Columns</p>
          <div className="flex items-center justify-between mt-1 mb-2">
            <Button
              variant="link"
              size="sm"
              className="p-0 h-auto text-xs"
              onClick={() => handleSelectAllColumns(tab, columnsMeta, true)}
            >
              Select All
            </Button>
            <span className="text-gray-300 mx-1">|</span>
            <Button
              variant="link"
              size="sm"
              className="p-0 h-auto text-xs"
              onClick={() => handleSelectAllColumns(tab, columnsMeta, false)}
            >
              Deselect All
            </Button>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {columnsMeta
              .filter((col: any) => col.toggleable)
              .map((col: any) => (
                <div key={`toggle-${tab}-${col.dataKey}`} className="flex items-center space-x-2">
                  <Checkbox
                    id={`toggle-${tab}-${col.dataKey}`}
                    checked={
                      tab === "pending" ? !!visiblePendingColumns[col.dataKey] : !!visibleHistoryColumns[col.dataKey]
                    }
                    onCheckedChange={(checked) => handleToggleColumn(tab, col.dataKey, Boolean(checked))}
                  />
                  <Label htmlFor={`toggle-${tab}-${col.dataKey}`} className="text-xs font-normal cursor-pointer">
                    {col.header}
                  </Label>
                </div>
              ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-olive-600" />
        <p className="ml-4 text-lg">Loading Lab Test Data...</p>
      </div>
    )

  if (error)
    return (
      <div className="p-8 text-center text-red-600 bg-red-50 rounded-md">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
        <p className="text-lg font-semibold">Error Loading Data</p>
        <p className="text-sm">{error}</p>
        <Button onClick={loadAllData} className="mt-4">
          Retry
        </Button>
      </div>
    )

  return (
    <div className="space-y-6 p-4 md:p-6 bg-white min-h-screen">
      <Card className="shadow-md border-none">
        <CardHeader className="bg-gradient-to-r from-olive-50 to-olive-100 rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <TestTube2 className="h-6 w-6 text-olive-600" />
            Lab Test 2
          </CardTitle>
          <CardDescription className="text-gray-700">
            Perform Physical Test 2 for items where Test 1 is complete.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 lg:p-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <TabsList className="grid w-full lg:w-[450px] grid-cols-2 mb-0 shrink-0">
                  <TabsTrigger value="pending" className="flex items-center gap-2">
                    <TestTube2 className="h-4 w-4" /> Pending Tests
                    <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-xs">
                      {filteredPending.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="history" className="flex items-center gap-2">
                    <History className="h-4 w-4" /> Test History
                    <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-xs">
                      {filteredHistory.length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>

                <div className="text-sm font-semibold text-slate-700 lg:text-right">
                  Total Quantity:{" "}
                  <span className="text-olive-700">
                    {(activeTab === "pending"
                      ? pendingTotalQty
                      : historyTotalQty
                    ).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full bg-slate-50/50 p-3 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs text-muted-foreground font-semibold whitespace-nowrap">From:</span>
                    <Input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full sm:w-[130px] h-8 text-xs focus-visible:ring-olive-500 bg-white"
                    />
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs text-muted-foreground font-semibold whitespace-nowrap">To:</span>
                    <Input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full sm:w-[130px] h-8 text-xs focus-visible:ring-olive-500 bg-white"
                    />
                  </div>
                  {(fromDate || toDate) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFromDate("")
                        setToDate("")
                      }}
                      className="h-8 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded shrink-0 self-end sm:self-auto"
                    >
                      Clear Date
                    </Button>
                  )}
                </div>
                <div className="w-[180px]">
                  <Select value={productFilter} onValueChange={setProductFilter}>
                    <SelectTrigger className="h-8 text-xs bg-white focus-visible:ring-olive-500">
                      <SelectValue placeholder="All Products" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="all">All Products</SelectItem>
                      {uniqueProductsForFilter.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative w-full sm:w-[200px]">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search tests..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs focus-visible:ring-olive-500"
                  />
                </div>
                <div className="ml-auto">
                  <Button
                    onClick={handleExportPDF}
                    className="bg-olive-600 hover:bg-olive-700 text-white text-xs h-8 px-3 gap-1.5"
                  >
                    <FileDown className="h-4 w-4" />
                    Export PDF
                  </Button>
                </div>
              </div>
            </div>

            <TabsContent value="pending">
              <Card className="shadow-sm border border-border">
                <CardHeader className="py-3 px-4 bg-olive-50 rounded-md p-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-md font-semibold text-foreground">
                      <TestTube2 className="h-5 w-5 text-primary mr-2" />
                      Pending Items ({filteredPending.length})
                    </CardTitle>
                    <ColumnToggler tab="pending" columnsMeta={PENDING_COLUMNS_META} />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          {visiblePendingColumnsMeta.map((col) => (
                            <TableHead key={col.dataKey}>{col.header}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPending.length > 0 ? (
                          filteredPending.map((test, index) => (
                            <TableRow key={`${test.jobCardNo}-${index}`} className="hover:bg-olive-50/50">
                              {visiblePendingColumnsMeta.map((col) => (
                                <TableCell key={col.dataKey} className="whitespace-nowrap text-sm py-2 px-3">
                                  {col.dataKey === "actionColumn" ? (
                                    <Button
                                      size="sm"
                                      onClick={() => handleOpenLabTesting(test)}
                                      className="bg-olive-600 text-white hover:bg-olive-700"
                                    >
                                      <TestTube2 className="mr-2 h-4 w-4" />
                                      Perform Test 2
                                    </Button>
                                  ) : col.dataKey === "labTest1Status" ? (
                                    <Badge variant={test.labTest1Status === "Accepted" ? "default" : "destructive"}>
                                      {test.labTest1Status}
                                    </Badge>
                                  ) : col.dataKey === "rawMaterials" ? (
                                    renderRawMaterials(test.rawMaterials)
                                  ) : col.dataKey === "machineHours" ? (
                                    formatMachineHours(test[col.dataKey as keyof ProductionItem])
                                  ) : (
                                    (test as any)[col.dataKey] || "-"
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={visiblePendingColumnsMeta.length} className="h-48">
                              <div className="flex flex-col items-center justify-center text-center border-2 border-dashed border-olive-200/50 bg-olive-50/50 rounded-lg mx-4 my-4 flex-1">
                                <TestTube2 className="h-12 w-12 text-olive-500 mb-3" />
                                <p className="font-medium text-foreground">No Pending Tests</p>
                                <p className="text-sm text-muted-foreground">All required tests have been completed.</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card className="shadow-sm border border-border">
                <CardHeader className="py-3 px-4 bg-olive-50 rounded-md p-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-md font-semibold text-foreground">
                      <History className="h-5 w-5 text-primary mr-2" />
                      History Items ({filteredHistory.length})
                    </CardTitle>
                    <ColumnToggler tab="history" columnsMeta={HISTORY_COLUMNS_META} />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          {visibleHistoryColumnsMeta.map((col) => (
                            <TableHead key={col.dataKey}>{col.header}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredHistory.length > 0 ? (
                          filteredHistory.map((test, index) => (
                            <TableRow key={`${test.jobCardNo}-${index}`} className="hover:bg-olive-50/50">
                              {visibleHistoryColumnsMeta.map((col) => (
                                <TableCell key={col.dataKey} className="whitespace-nowrap text-sm py-2 px-3">
                                  {col.dataKey === "test2Status" ? (
                                    <Badge variant={test.test2Status === "Pass" || test.test2Status === "Tested" ? "default" : "destructive"}>
                                      {test.test2Status}
                                    </Badge>
                                  ) : col.dataKey === "test1Status" ? (
                                    <Badge variant={test.test1Status === "Accepted" || test.test1Status === "Tested" ? "default" : "destructive"}>
                                      {test.test1Status}
                                    </Badge>
                                  ) : (
                                    (test as any)[col.dataKey] || "-"
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={visibleHistoryColumnsMeta.length} className="h-48">
                              <div className="flex flex-col items-center justify-center text-center border-2 border-dashed border-olive-200/50 bg-olive-50/50 rounded-lg mx-4 my-4 flex-1">
                                <History className="h-12 w-12 text-olive-500 mb-3" />
                                <p className="font-medium text-foreground">No Test History</p>
                                <p className="text-sm text-muted-foreground">
                                  Completed test records will appear here.
                                </p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Sheet open={!!viewingMaterials} onOpenChange={(isOpen) => !isOpen && setViewingMaterials(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Raw Materials Used</SheetTitle>
            <SheetDescription>Full list of materials and quantities used for this production run.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col flex-1 min-h-0">
            <SheetBody className="mt-4 max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material Name</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewingMaterials?.map((material, index) => (
                    <TableRow key={index}>
                      <TableCell>{material.name}</TableCell>
                      <TableCell className="text-right">{material.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </SheetBody>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Physical Test 2 Details for JC: {selectedTest?.jobCardNo}</SheetTitle>
            <SheetDescription>Fill out the test results below. Fields with * are required.</SheetDescription>
          </SheetHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSaveLabTest()
            }}
            className="flex flex-col flex-1 min-h-0"
          >
            <SheetBody className="space-y-4 pt-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/50 text-xs">
              <div>
                <Label className="text-[10px] text-muted-foreground uppercase font-bold">DO No.</Label>
                <p className="font-semibold">{selectedTest?.deliveryOrderNo}</p>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground uppercase font-bold">Product</Label>
                <p className="font-semibold">{selectedTest?.productName}</p>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground uppercase font-bold">Test 1 Status</Label>
                <p className="font-semibold">{selectedTest?.labTest1Status}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Test Status *</Label>
                <Select value={formData.testStatus} onValueChange={(v) => handleFormChange("testStatus", v)}>
                  <SelectTrigger className={formErrors.testStatus ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.testStatus && <p className="text-xs text-red-500">{formErrors.testStatus}</p>}
              </div>

              {formData.testStatus === "Non Tested" && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="remarks">Remarks *</Label>
                  <Input
                    id="remarks"
                    placeholder="Enter reason for not testing..."
                    value={formData.remarks || ""}
                    onChange={(e) => handleFormChange("remarks", e.target.value)}
                    className={formErrors.remarks ? "border-red-500" : ""}
                  />
                  {formErrors.remarks && <p className="text-xs text-red-500">{formErrors.remarks}</p>}
                </div>
              )}

              {formData.testStatus !== "Non Tested" && (
                <>
                  <div className="space-y-2">
                    <Label>Date of Test *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.dateOfTest && "text-muted-foreground",
                            formErrors.dateOfTest && "border-red-500",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.dateOfTest ? format(formData.dateOfTest, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.dateOfTest}
                          onSelect={(date) => date && handleFormChange("dateOfTest", date)}
                        />
                      </PopoverContent>
                    </Popover>
                    {formErrors.dateOfTest && <p className="text-xs text-red-500">{formErrors.dateOfTest}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Tested By *</Label>
                    <Select value={formData.testedBy} onValueChange={(v) => handleFormChange("testedBy", v)}>
                      <SelectTrigger className={formErrors.testedBy ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select technician" />
                      </SelectTrigger>
                      <SelectContent>
                        {testedByOptions.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.testedBy && <p className="text-xs text-red-500">{formErrors.testedBy}</p>}
                  </div>
                </>
              )}
            </div>

            {formData.testStatus !== "Non Tested" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t pt-4">
                <div className="space-y-2">
                  <Label htmlFor="bdAt110">BD at 110°C</Label>
                  <Input
                    id="bdAt110"
                    placeholder="Enter value"
                    value={formData.bdAt110}
                    onChange={(e) => handleFormChange("bdAt110", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ccsAt100">CCS at 100°C</Label>
                  <Input
                    id="ccsAt100"
                    placeholder="Enter value"
                    value={formData.ccsAt100}
                    onChange={(e) => handleFormChange("ccsAt100", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bdAt1100">BD at 1100°C</Label>
                  <Input
                    id="bdAt1100"
                    placeholder="Enter value"
                    value={formData.bdAt1100}
                    onChange={(e) => handleFormChange("bdAt1100", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ccsAt1100">CCS at 1100°C</Label>
                  <Input
                    id="ccsAt1100"
                    placeholder="Enter value"
                    value={formData.ccsAt1100}
                    onChange={(e) => handleFormChange("ccsAt1100", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plcAt1100">PLC at 1100°C</Label>
                  <Input
                    id="plcAt1100"
                    placeholder="Enter value"
                    value={formData.plcAt1100}
                    onChange={(e) => handleFormChange("plcAt1100", e.target.value)}
                  />
                </div>
              </div>
            )}

            </SheetBody>

            <SheetFooter className="flex justify-end gap-3 pt-6 mt-auto">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" className="bg-olive-600 hover:bg-olive-700 text-white" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Test Results"
                )}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
