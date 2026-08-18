"use client"
import { useState, useEffect, useCallback } from "react"
import { Loader2, AlertTriangle, TrendingUp, TrendingDown, Minus, Search, ChevronRight, ClipboardList } from "lucide-react"
import { format } from "date-fns"
import { productionApi } from "@/systems/production/lib/api";
import { useAuth, FIRM_MAP } from "@/systems/production/context/AuthContext"
import { Button } from "@/systems/production/components/ui/button"
import { Input } from "@/systems/production/components/ui/input"
import { Badge } from "@/systems/production/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/systems/production/components/ui/card"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from "@/systems/production/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/systems/production/components/ui/table"

// ─── Types ───────────────────────────────────────────────────────────────────
interface MaterialRow {
  name: string
  expectedPct: number
  expectedQty: number
  actualQty: number
  pricePerUnit: number
  expectedCost: number
  actualCost: number
  qtyDiffPct: number | null
  costDiffPct: number | null
  isExtra?: boolean   // used but not in composition
}

interface QCRecord {
  productionId?: number | string
  jobCardNo: string
  doNo: string
  partyName: string
  productName: string
  fgQty: number
  productRate: number          // per-unit selling price from production table
  sellingPriceTotal: number
  manufacturingCostTotal: number
  expectedCostTotal: number
  actualCostTotal: number
  matDiffPct: number | null
  costDiffPct: number | null
  expectedProfit: number | null
  actualProfit: number | null
  profitVariance: number | null
  profitLoss: number | null    // kept for backward compat (= actualProfit)
  materials: MaterialRow[]
  firmName: string
  productionDate: string
}

// ─── Constants ────────────────────────────────────────────────────────────────
const JOBCARDS_TABLE        = "jobcards"
const ACTUAL_PROD_TABLE     = "actual_production"
const PRODUCTION_TABLE      = "production"
const COSTING_TABLE         = "costing_response"

// ─── Helpers ──────────────────────────────────────────────────────────────────
const pct = (v: number | null) =>
  v === null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`

const money = (v: number) =>
  v.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })

function DiffBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-400 text-xs">—</span>
  const abs = Math.abs(value)
  const good = value <= 2
  const warn = abs <= 10
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
      good ? "bg-emerald-100 text-emerald-700" :
      warn ? "bg-amber-100 text-amber-700" :
             "bg-red-100 text-red-700"
    }`}>
      {value > 2 ? <TrendingUp className="h-3 w-3" /> :
       value < -2 ? <TrendingDown className="h-3 w-3" /> :
                    <Minus className="h-3 w-3" />}
      {pct(value)}
    </span>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function CompositionQCPage() {
  const { user } = useAuth()
  const [records, setRecords]         = useState<QCRecord[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [search, setSearch]           = useState("")
  const [selected, setSelected]       = useState<QCRecord | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [
        { data: jcData,     error: jcErr },
        { data: apData,     error: apErr },
        { data: ordersData, error: ordersErr },
        { data: costData,   error: costErr },
      ] = await Promise.all([
        await productionApi.get(JOBCARDS_TABLE),
        await productionApi.get(ACTUAL_PROD_TABLE),
        await productionApi.get(PRODUCTION_TABLE),
        await productionApi.get(COSTING_TABLE),
      ])
      if (jcErr)   throw jcErr
      if (apErr)   throw apErr
      if (ordersErr) throw ordersErr
      if (costErr) throw costErr

      // The real backend is normalized (ProductionJobCard -> ProductionOrder via
      // orderId, ProductionActualRun -> ProductionJobCard via jobCardId,
      // ProductionCosting -> ProductionOrder via orderId) instead of the old
      // Supabase spreadsheet columns (DO No., Product Name, Firm Name...) that used
      // to be duplicated onto every row. Build id-keyed lookup maps and join on
      // those foreign keys.
      const orderById = new Map<string, any>()
      ;(ordersData || []).forEach((o: any) => orderById.set(o.id, o))

      const jobCardById = new Map<string, any>()
      ;(jcData || []).forEach((jc: any) => jobCardById.set(jc.id, jc))

      // Latest costing row per order (GET /costing is already ordered by createdAt desc)
      const costingByOrder = new Map<string, any>()
      ;(costData || []).forEach((c: any) => {
        if (c.orderId && !costingByOrder.has(c.orderId)) costingByOrder.set(c.orderId, c)
      })

      const result: QCRecord[] = []

      for (const apRow of (apData || []) as any[]) {
        const jobCard = apRow.jobCardId ? jobCardById.get(apRow.jobCardId) : null
        if (!jobCard) continue
        const order = jobCard.orderId ? orderById.get(jobCard.orderId) : null
        if (!order) continue
        const costRow = costingByOrder.get(order.id)
        if (!costRow) continue // can't compare without a costing record

        const jobCardNo    = String(jobCard.jobCardNo || "").trim()
        const doNo          = String(order.deliveryOrderNo || "").trim()
        const productName   = String(order.productName || "").trim()
        const firmName       = String(order.firmName || "")
        const fgQty           = Number(apRow.quantityFg || 0)
        // ProductionOrder has no per-unit rate column; use the costing sheet's selling price.
        const productRate     = Number(costRow.sellingPrice || 0)
        const sellingPriceTotal = productRate * fgQty
        const manufacturingCostTotal = Number(costRow.manufacturingCost || 0) * fgQty

        // NOTE: GET /actual-production and GET /costing do not `include` their
        // material line-item relations (ProductionActualMaterial /
        // ProductionCostingMaterial), so a per-material expected-vs-actual
        // breakdown can't be built from the list endpoints alone. We fall back to
        // the aggregate cost fields that ARE returned (variableCost = expected RM
        // cost, costingAmount = actual RM cost) and leave the material table empty.
        const materials: MaterialRow[] = []
        const expTotal   = Number(costRow.variableCost || 0)
        const actTotal   = Number(apRow.costingAmount || 0)
        const matDiffPct = null

        const costDiffPct    = expTotal > 0 ? ((actTotal - expTotal) / expTotal) * 100 : null
        const expectedProfit = sellingPriceTotal > 0 ? sellingPriceTotal - (expTotal + manufacturingCostTotal) : null
        const actualProfit   = sellingPriceTotal > 0 ? sellingPriceTotal - (actTotal + manufacturingCostTotal) : null
        const profitVariance = (expectedProfit !== null && actualProfit !== null) ? actualProfit - expectedProfit : null
        const profitLoss     = actualProfit // backward compat alias

        result.push({
          productionId: order.id || "",
          jobCardNo, doNo,
          partyName:   String(order.partyName || ""),
          productName,
          fgQty,
          productRate,
          sellingPriceTotal,
          manufacturingCostTotal,
          expectedCostTotal: expTotal,
          actualCostTotal:   actTotal,
          matDiffPct,
          costDiffPct,
          expectedProfit,
          actualProfit,
          profitVariance,
          profitLoss,
          materials,
          firmName,
          productionDate: apRow.dateOfProduction ? format(new Date(apRow.dateOfProduction), "dd/MM/yyyy") : "",
        })
      }

      const userFirms = user?.firm ? user.firm.split(',').map((f: string) => f.trim()).filter(Boolean) : []
      const isAdmin = user?.role?.toLowerCase() === "admin"
      const filtered = result.filter((r) => {
        if (isAdmin) return true
        if (userFirms.length === 0) return true
        const fName = r.firmName.toLowerCase()
        return userFirms.some((uf: string) => {
          const firmSearch = uf.toLowerCase()
          const mappedFirmLower = (FIRM_MAP[uf] || uf).toLowerCase()
          return fName.includes(firmSearch) || fName.includes(mappedFirmLower)
        })
      })
      setRecords(filtered.sort((a, b) => Math.abs(b.costDiffPct ?? 0) - Math.abs(a.costDiffPct ?? 0)))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filtered = records.filter(r =>
    [r.jobCardNo, r.doNo, r.partyName, r.productName].some(v =>
      v.toLowerCase().includes(search.toLowerCase())
    )
  )

  // ─── Summary Stats ──────────────────────────────────────────────────────────
  const totalExpectedProfit = records.reduce((s, r) => s + (r.expectedProfit ?? 0), 0)
  const totalActualProfit   = records.reduce((s, r) => s + (r.actualProfit   ?? 0), 0)
  const totalProfitVariance = totalActualProfit - totalExpectedProfit
  const avgCostDiff = records.length
    ? records.reduce((s, r) => s + (r.costDiffPct ?? 0), 0) / records.length
    : 0
  const overBudgetCount = records.filter(r => (r.costDiffPct ?? 0) > 5).length

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500">
      <Loader2 className="h-8 w-8 animate-spin text-olive-600" />
      <p className="text-sm font-medium">Loading QC data…</p>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-red-600">
      <AlertTriangle className="h-8 w-8" />
      <p className="text-sm font-medium">{error}</p>
      <Button onClick={loadData} variant="outline" size="sm">Retry</Button>
    </div>
  )

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen max-w-full overflow-x-hidden">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-olive-600" />
            Composition QC
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Compare expected vs actual raw material consumption per production run.</p>
        </div>
      </div>

      {/* ── Summary Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Expected Profit</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className={`text-2xl font-bold ${totalExpectedProfit >= 0 ? "text-olive-600" : "text-red-600"}`}>
              {money(totalExpectedProfit)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">from composition</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Actual Profit</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className={`text-2xl font-bold ${totalActualProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {money(totalActualProfit)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{records.length} completed runs</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Profit Variance</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className={`text-2xl font-bold ${totalProfitVariance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {totalProfitVariance >= 0 ? "+" : ""}{money(totalProfitVariance)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">actual − expected</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Over Budget Runs</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className={`text-2xl font-bold ${overBudgetCount === 0 ? "text-emerald-600" : "text-red-600"}`}>
              {overBudgetCount}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">cost diff &gt; 5%</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Search + Table ─────────────────────────────────────────────────── */}
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-0">
          <div className="flex items-center gap-3 p-4 border-b">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <Input
              placeholder="Search by Job Card, DO No., Party or Product…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-olive-500 p-0 h-auto text-sm"
            />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="text-xs font-bold text-slate-600">Job Card</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600">ID</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600">DO No.</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600">Party</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600">Product</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600">Firm Name</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600 text-right">FG Qty</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600 text-center">Mat. Diff %</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600 text-center">Cost Diff %</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600 text-right">Profit / Loss</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-12 text-sm text-slate-400 italic">
                      No records found. Production logs with matching compositions will appear here.
                    </TableCell>
                  </TableRow>
                ) : filtered.map((r, i) => (
                  <TableRow
                    key={i}
                    className="cursor-pointer hover:bg-indigo-50/40 transition-colors"
                    onClick={() => setSelected(r)}
                  >
                    <TableCell className="py-3 text-sm font-semibold text-indigo-700">{r.jobCardNo || "—"}</TableCell>
                    <TableCell className="py-3 text-xs text-slate-600">{r.productionId || "—"}</TableCell>
                    <TableCell className="py-3 text-xs text-slate-600">{r.doNo || "—"}</TableCell>
                    <TableCell className="py-3 text-xs text-slate-700">{r.partyName || "—"}</TableCell>
                    <TableCell className="py-3 text-xs text-slate-700 max-w-[160px] truncate">{r.productName}</TableCell>
                    <TableCell className="py-3 text-xs text-slate-600">{r.firmName || "—"}</TableCell>
                    <TableCell className="py-3 text-xs text-right font-medium">{r.fgQty.toLocaleString()}</TableCell>
                    <TableCell className="py-3 text-center"><DiffBadge value={r.matDiffPct} /></TableCell>
                    <TableCell className="py-3 text-center"><DiffBadge value={r.costDiffPct} /></TableCell>
                    <TableCell className="py-3 text-right text-xs font-bold">
                      {r.profitLoss !== null ? (
                        <span className={r.profitLoss >= 0 ? "text-emerald-600" : "text-red-600"}>
                           {money(r.profitLoss)}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="py-3">
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Detail Modal ───────────────────────────────────────────────────── */}
      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent>
          {selected && (
            <div className="flex flex-col flex-1 min-h-0">
              <SheetHeader>
                <SheetTitle className="text-lg font-bold text-slate-800">
                  QC Detail — {selected.jobCardNo}
                </SheetTitle>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="outline" className="text-xs">{selected.doNo}</Badge>
                  <Badge variant="outline" className="text-xs">ID: {selected.productionId || "—"}</Badge>
                  <Badge variant="outline" className="text-xs">{selected.firmName}</Badge>
                  <Badge variant="outline" className="text-xs">{selected.partyName}</Badge>
                  <Badge variant="outline" className="text-xs">{selected.productName}</Badge>
                  {selected.productionDate && (
                    <Badge variant="outline" className="text-xs">📅 {selected.productionDate}</Badge>
                  )}
                </div>
              </SheetHeader>

              <SheetBody className="mt-2 pr-2">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                {[
                  { label: "FG Produced",    value: `${selected.fgQty.toLocaleString()} kg`,                              color: "text-slate-800" },
                  { label: "Selling Price",   value: selected.sellingPriceTotal > 0 ? money(selected.sellingPriceTotal) : "—", color: "text-olive-700", sub: `₹${selected.productRate.toLocaleString("en-IN")}/unit` },
                  { label: "Mfg. Cost",       value: money(selected.manufacturingCostTotal),                               color: "text-amber-700" },
                  { label: "Expected RM Cost",value: money(selected.expectedCostTotal),                                    color: "text-blue-700" },
                  { label: "Actual RM Cost",  value: money(selected.actualCostTotal),                                      color: selected.actualCostTotal > selected.expectedCostTotal ? "text-red-600" : "text-emerald-600" },
                  { label: "Cost Variance %", value: selected.costDiffPct !== null ? pct(selected.costDiffPct) : "—",      color: (selected.costDiffPct ?? 0) > 0 ? "text-red-600" : "text-emerald-600" },
                ].map(kpi => (
                  <div key={kpi.label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{kpi.label}</p>
                    <p className={`text-base font-bold mt-0.5 ${kpi.color}`}>{kpi.value}</p>
                    {(kpi as any).sub && <p className="text-[10px] text-slate-400 mt-0.5">{(kpi as any).sub}</p>}
                  </div>
                ))}
              </div>

              {/* Detailed P&L Variance Panel (Consistent with Production page) */}
              {selected.actualProfit !== null && (() => {
                const expRMCost = selected.expectedCostTotal;
                const actRMCost = selected.actualCostTotal;
                const mfgCost   = selected.manufacturingCostTotal;
                const spTotal   = selected.sellingPriceTotal;
                const expProfit = selected.expectedProfit ?? 0;
                const actProfit = selected.actualProfit ?? 0;
                const variance  = selected.profitVariance ?? 0;
                const rmDelta   = expRMCost - actRMCost;

                const fmt = (v: number) => money(v);
                const gp = (profit: number) =>
                  spTotal > 0 ? ` (GP ${((profit / spTotal) * 100).toFixed(1)}%)` : "";

                return (
                  <div className="mt-4 rounded-xl overflow-hidden border shadow-md bg-white">
                    <div className="bg-gradient-to-r from-olive-700 to-olive-800 px-4 py-2 flex items-center justify-between">
                      <span className="text-white text-[10px] font-bold tracking-widest uppercase">💰 Profit / Loss Variance Analysis</span>
                      <span className="text-violet-200 text-[10px] font-medium">
                        {selected.fgQty.toLocaleString()} units @ {money(selected.productRate)}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 divide-x text-[11px]">
                      {/* Expected */}
                      <div className="p-3 space-y-1.5 bg-slate-50/30">
                        <p className="text-[10px] font-black text-blue-700 uppercase tracking-wider mb-1">Expected</p>
                        <div className="flex justify-between text-slate-500"><span>RM Cost</span><span className="font-semibold text-slate-700">{fmt(expRMCost)}</span></div>
                        <div className="flex justify-between text-slate-500"><span>Mfg. Cost</span><span className="font-semibold text-slate-700">{fmt(mfgCost)}</span></div>
                        <div className="flex justify-between border-t pt-1 font-bold text-slate-800"><span>Total Cost</span><span>{fmt(expRMCost + mfgCost)}</span></div>
                        <div className="flex justify-between text-slate-400"><span>Selling Price</span><span>{fmt(spTotal)}</span></div>
                        <div className={`flex justify-between border-t pt-1 font-black ${expProfit >= 0 ? "text-blue-700" : "text-red-700"}`}>
                          <span>Profit</span><span>{fmt(expProfit)}{gp(expProfit)}</span>
                        </div>
                      </div>

                      {/* Actual */}
                      <div className="p-3 space-y-1.5 bg-emerald-50/20">
                        <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider mb-1">Actual</p>
                        <div className="flex justify-between text-slate-500"><span>RM Cost</span><span className="font-semibold text-slate-700">{fmt(actRMCost)}</span></div>
                        <div className="flex justify-between text-slate-500"><span>Mfg. Cost</span><span className="font-semibold text-slate-700">{fmt(mfgCost)}</span></div>
                        <div className="flex justify-between border-t pt-1 font-bold text-slate-800"><span>Total Cost</span><span>{fmt(actRMCost + mfgCost)}</span></div>
                        <div className="flex justify-between text-slate-400"><span>Selling Price</span><span>{fmt(spTotal)}</span></div>
                        <div className={`flex justify-between border-t pt-1 font-black ${actProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                          <span>Profit</span><span>{fmt(actProfit)}{gp(actProfit)}</span>
                        </div>
                      </div>

                      {/* Variance */}
                      <div className={`p-3 space-y-1.5 ${variance >= 0 ? "bg-green-50/40" : "bg-red-50/40"}`}>
                        <p className={`text-[10px] font-black uppercase tracking-wider mb-1 ${variance >= 0 ? "text-green-700" : "text-red-700"}`}>Variance</p>
                        <div className="flex justify-between text-slate-500">
                          <span>RM Δ</span>
                          <span className={`font-semibold ${rmDelta >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {rmDelta >= 0 ? "+" : ""}{fmt(rmDelta)}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-400"><span>Mfg. Δ</span><span>₹0</span></div>
                        <div className={`flex justify-between border-t pt-1 font-bold ${rmDelta >= 0 ? "text-green-700" : "text-red-700"}`}>
                          <span>Cost Δ</span>
                          <span>{rmDelta >= 0 ? "+" : ""}{fmt(rmDelta)}</span>
                        </div>
                        <div className="h-4"></div>
                        <div className={`flex justify-between border-t pt-1 font-black ${variance >= 0 ? "text-green-700" : "text-red-700"}`}>
                          <span>Profit Δ</span><span>{variance >= 0 ? "+" : ""}{fmt(variance)}</span>
                        </div>
                        <div className={`text-center text-[9px] font-bold py-0.5 rounded mt-1 ${variance >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {variance >= 0 ? "✓ BETTER" : "⚠ WORSE"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Material Breakdown Table */}
              {(() => {
                const compMats  = selected.materials.filter(m => !m.isExtra)
                const extraMats = selected.materials.filter(m => m.isExtra)
                const missingMats = compMats.filter(m => m.actualQty === 0)
                const overMats    = compMats.filter(m => (m.qtyDiffPct ?? 0) > 10)
                return (
                  <div className="mt-2 space-y-3">
                    {/* Main breakdown */}
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Material-wise Breakdown</p>
                    <div className="border rounded-xl overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 hover:bg-slate-50">
                            <TableHead className="text-xs font-bold">Material</TableHead>
                            <TableHead className="text-xs font-bold text-right">Comp %</TableHead>
                            <TableHead className="text-xs font-bold text-right bg-blue-50/50">Exp. Qty</TableHead>
                            <TableHead className="text-xs font-bold text-right bg-blue-50/50">Exp. Cost</TableHead>
                            <TableHead className="text-xs font-bold text-right bg-emerald-50/50">Act. Qty</TableHead>
                            <TableHead className="text-xs font-bold text-right bg-emerald-50/50">Act. Cost</TableHead>
                            <TableHead className="text-xs font-bold text-center">Qty Δ%</TableHead>
                            <TableHead className="text-xs font-bold text-center">Cost Δ%</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {compMats.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-8 text-xs italic text-slate-400">
                                No composition data available for this order.
                              </TableCell>
                            </TableRow>
                          ) : compMats.map((m, i) => {
                            const over = (m.qtyDiffPct ?? 0) > 10
                            const missing = m.actualQty === 0
                            return (
                              <TableRow key={i} className={over ? "bg-orange-50 hover:bg-orange-100" : missing ? "bg-red-50/40 hover:bg-red-50" : "hover:bg-slate-50"}>
                                <TableCell className="py-2 text-xs font-medium text-slate-700">
                                  {m.name}
                                  {over && <span className="ml-1 text-[9px] font-bold text-orange-600 bg-orange-100 px-1 py-0.5 rounded">↑ HIGH</span>}
                                  {missing && <span className="ml-1 text-[9px] font-bold text-red-500 bg-red-100 px-1 py-0.5 rounded">MISSING</span>}
                                </TableCell>
                                <TableCell className="py-2 text-right text-xs text-slate-500">{m.expectedPct.toFixed(2)}%</TableCell>
                                <TableCell className="py-2 text-right text-xs text-blue-700 bg-blue-50/30 font-medium">{m.expectedQty.toFixed(2)}</TableCell>
                                <TableCell className="py-2 text-right text-xs text-blue-700 bg-blue-50/30">{money(m.expectedCost)}</TableCell>
                                <TableCell className={`py-2 text-right text-xs font-medium bg-emerald-50/30 ${over ? "text-orange-600 font-bold" : "text-emerald-700"}`}>{m.actualQty > 0 ? m.actualQty.toFixed(2) : "—"}</TableCell>
                                <TableCell className="py-2 text-right text-xs text-emerald-700 bg-emerald-50/30">{m.actualQty > 0 ? money(m.actualCost) : "—"}</TableCell>
                                <TableCell className="py-2 text-center"><DiffBadge value={m.qtyDiffPct} /></TableCell>
                                <TableCell className="py-2 text-center"><DiffBadge value={m.costDiffPct} /></TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Extra materials (added, not in composition) */}
                    {extraMats.length > 0 && (
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">⚠ Added Materials (Not in Composition)</p>
                        <div className="border border-amber-200 rounded-xl overflow-hidden bg-amber-50/40">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-amber-50 hover:bg-amber-50">
                                <TableHead className="text-xs font-bold text-amber-800">Material</TableHead>
                                <TableHead className="text-xs font-bold text-right text-amber-800">Actual Qty</TableHead>
                                <TableHead className="text-xs font-bold text-right text-amber-800">Actual Cost</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {extraMats.map((m, i) => (
                                <TableRow key={i} className="bg-amber-50/60">
                                  <TableCell className="py-2 text-xs font-semibold text-amber-800">{m.name} <span className="text-[9px] font-bold bg-amber-200 text-amber-700 px-1 py-0.5 rounded">EXTRA</span></TableCell>
                                  <TableCell className="py-2 text-right text-xs font-bold text-amber-700">{m.actualQty.toFixed(2)}</TableCell>
                                  <TableCell className="py-2 text-right text-xs text-amber-700">{money(m.actualCost)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {/* Removed materials (in composition but not used) */}
                    {missingMats.length > 0 && (
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-red-500 mb-1">✕ Removed / Unused Materials (Expected but Not Used)</p>
                        <div className="flex flex-wrap gap-2">
                          {missingMats.map((m, i) => (
                            <span key={i} className="inline-flex items-center gap-1 text-[11px] font-semibold bg-red-100 text-red-700 border border-red-200 rounded-full px-3 py-1">
                              {m.name} <span className="text-[9px] opacity-70">exp. {m.expectedQty.toFixed(1)}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-[10px] text-slate-400 italic px-1">
                      * Prices from KYC table. "—" = not logged. Orange rows = usage &gt;10% over expected.
                    </p>
                  </div>
                )
              })()}
              </SheetBody>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
