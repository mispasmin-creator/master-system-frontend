import React, { useState, useEffect, useMemo, useCallback } from "react";
import { FreightPayment } from "../types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { StatusBadge } from "./StatusBadge";
import { Button } from "./ui/button";
import { formatDelayDuration } from "../lib/delay";
import {
  Edit2,
  FileText,
  Check,
  X,
  Search,
  RotateCcw,
  ChevronRight,
  Package,
  Banknote,
  Clock,
  AlertTriangle,
  Filter,
  Eye,
  Truck,
  Building2,
  Hash,
  Calendar,
  DollarSign,
  Image,
  MessageSquare,
  User,
  MapPin,
  CreditCard,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { freightPaymentApi } from "../lib/api";

interface ColumnDef {
  key: string;
  label: string;
  width?: string;
  align?: "left" | "right" | "center";
  render?: (payment: FreightPayment, group?: any) => React.ReactNode;
}

interface FreightTableProps {
  payments: FreightPayment[];
  isLoading: boolean;
  onEdit: (payment: FreightPayment, targetStep?: string) => void;
  onQuickUpdate?: (payment: FreightPayment | FreightPayment[], step: string, value: "yes" | "no", actualDate?: string, selectedStatus?: string, remark?: string, amount?: number | number[], auditImage?: string) => void;
  activeTab?: string;
  subTab?: "pending" | "history";
}

const ACCOUNT_CHECKING_FIRMS = ["RKL", "PURAB", "PMMPL"] as const;
const STEP_CONFIG: Record<string, any> = {
  checkkitting: { title: "Account Checking", statusKey: "Status3", remarkKey: "Remark3", icon: Package },
  posting: { title: "Account Audit", statusKey: "Status_1", remarkKey: "Remark_1", icon: FileText },
  makepayment: { title: "Posting", statusKey: "Status2", remarkKey: "Remark2", icon: Banknote },
  freight: { title: "Freight Payment", statusKey: "Status", remarkKey: "Remark", icon: CreditCard },
};

export function FreightTable({
  payments,
  isLoading,
  onEdit,
  onQuickUpdate,
  activeTab = "posting",
  subTab = "pending",
}: FreightTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [firmFilter, setFirmFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState<FreightPayment | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [updateStatus, setUpdateStatus] = useState("");
  const [updateRemark, setUpdateRemark] = useState("");
  const [updateAmount, setUpdateAmount] = useState<number | "">("");
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [updateAuditImage, setUpdateAuditImage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [selectedModalItems, setSelectedModalItems] = useState<Set<number>>(new Set());

  const getStepField = useCallback((payment: FreightPayment, field: string) => {
    const stepMap: Record<string, any> = {
      posting: { status: "Status_1", remark: "Remark_1" },
      makepayment: { status: "Status2", remark: "Remark2" },
      checkkitting: { status: "Status3", remark: "Remark3" },
      freight: { status: "Status", remark: "Remark" },
    };
    const step = stepMap[activeTab] || stepMap.posting;
    return payment[step[field] as keyof FreightPayment];
  }, [activeTab]);

  const getStepName = useCallback(() => {
    const names: Record<string, string> = {
      posting: "Account Audit",
      makepayment: "Posting",
      checkkitting: "Account Checking",
      freight: "Freight Payment",
    };
    return names[activeTab] || "Step";
  }, [activeTab]);

  const formatDate = useCallback((dateStr?: string | null) => {
    if (!dateStr) return "—";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return dateStr;
    }
  }, []);

  const formatCurrency = useCallback((amount?: number) => {
    if (!amount) return "₹0";
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
  }, []);

  const formatDelay = useCallback((days?: number) => {
    const delay = Number(days) || 0;
    return {
      text: formatDelayDuration(delay),
      className: delay > 0 ? "text-rose-600 bg-rose-50" : "text-emerald-600 bg-emerald-50",
    };
  }, []);

  const isAccountCheckingFirm = useCallback((value: unknown) => {
    const normalized = String(value || "").trim().toLowerCase();
    return ACCOUNT_CHECKING_FIRMS.some(firm => {
      const firmKey = firm.toLowerCase();
      return normalized === firmKey || normalized === `${firmKey} order`;
    });
  }, []);

  const filteredPayments = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return payments.filter((payment) => {
      if (activeTab === "checkkitting" && !isAccountCheckingFirm(payment["Firm Name"])) return false;
      
      const firmOk = firmFilter.length === 0 || firmFilter.some((firm) => {
        const sf = firm.toLowerCase().trim();
        const rf = String(payment["Firm Name"] || "").toLowerCase().trim();
        if (sf === "rkl" || sf === "rkl order") {
          return rf === "rkl" || rf === "rkl order";
        } else if (sf === "pmmpl" || sf === "pmmpl order") {
          return rf === "pmmpl" || rf === "pmmpl order";
        } else if (sf === "purab" || sf === "purab order") {
          return rf === "purab" || rf === "purab order";
        } else {
          return rf === sf;
        }
      });
      const stepStatus = String(getStepField(payment, "status") || "").trim();
      const statusOk = statusFilter === "all" || stepStatus === statusFilter;
      const searchOk = !term || [
        payment["Unique Number"], payment["Firm Name"], payment["Fms Name"],
        payment["Transporter Name"], payment["Vehicle Number"], payment.From, payment.To
      ].some(v => String(v || "").toLowerCase().includes(term));
      
      return firmOk && statusOk && searchOk;
    });
  }, [payments, searchTerm, firmFilter, statusFilter, activeTab, getStepField, isAccountCheckingFirm]);

  const firmOptions = useMemo(() => {
    const firms = new Set(
      payments
        .map((p) => {
          const f = String(p["Firm Name"] || "").trim();
          const lower = f.toLowerCase();
          if (lower === "rkl" || lower === "rkl order") return "RKL";
          if (lower === "pmmpl" || lower === "pmmpl order") return "PMMPL";
          if (lower === "purab" || lower === "purab order") return "PURAB";
          if (lower === "refrasynth") return "Refrasynth";
          if (lower === "refratech") return "Refratech";
          return f;
        })
        .filter(Boolean)
    );
    return Array.from(firms).sort();
  }, [payments]);

  const statusOptions = useMemo(() => {
    const statuses = new Set(filteredPayments.map(p => String(getStepField(p, "status") || "").trim()).filter(Boolean));
    return Array.from(statuses).sort();
  }, [filteredPayments, getStepField]);

  const shouldGroupRows = activeTab === "posting" || activeTab === "makepayment" || activeTab === "freight" || activeTab === "checkkitting";

  const normalizeGroupValue = useCallback((value?: string) => String(value || "").trim().toLowerCase(), []);

  const groupedPayments = useMemo(() => {
    if (!shouldGroupRows) {
      return filteredPayments.map((payment) => ({
        key: `single:${payment.id}`,
        parent: payment,
        children: [payment],
        isGrouped: false,
      }));
    }

    const groups = new Map<string, FreightPayment[]>();
    filteredPayments.forEach((payment) => {
      const transporter = normalizeGroupValue(payment["Transporter Name"]);
      
      let datePart = "";
      let rawDate = "";
      if (activeTab === "makepayment") {
        // Posting tab: Group by Account Audit completion date
        rawDate = payment.Actual || payment.Timestamp || "";
      } else if (activeTab === "freight") {
        // Freight Payment tab: Group by Posting completion date
        rawDate = payment.Actual2 || payment.Actual || payment.Timestamp || "";
      } else if (activeTab === "posting") {
        // Account Audit tab: Group by Account Checking completion date
        rawDate = payment.Actual3 || payment.Timestamp || "";
      } else {
        rawDate = payment.Timestamp || payment.created_at || payment.Actual || payment.Actual2 || payment.Actual3 || payment.Actual4 || "";
      }

      if (rawDate) {
        try {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) {
            datePart = d.toISOString().split('T')[0];
          } else {
            datePart = String(rawDate).split(' ')[0] || String(rawDate).split('T')[0];
          }
        } catch {
          datePart = String(rawDate);
        }
      }

      let key = "";
      if (payment["Batch Number"] && activeTab !== "makepayment" && activeTab !== "freight") {
        key = `batch:${payment["Batch Number"]}`;
      } else {
        const isBiltyGroupedTab = activeTab === "posting" || activeTab === "checkkitting";
        if (isBiltyGroupedTab) {
          const bilty = String(payment["Bilty Number"] || "").trim().toLowerCase();
          const isValidBilty = bilty !== "" && bilty !== "000000" && bilty !== "0" && bilty !== "-";
          key = (transporter && isValidBilty)
            ? `transporter:${transporter}_bilty:${bilty}`
            : `single:${payment.id}`;
        } else {
          key = transporter
            ? (datePart ? `transporter:${transporter}_${datePart}` : `transporter:${transporter}`)
            : `single:${payment.id}`;
        }
      }
      const existing = groups.get(key) || [];
      existing.push(payment);
      groups.set(key, existing);
    });

    return Array.from(groups.entries()).map(([key, children]) => {
      const biltyNumbers = Array.from(
        new Set(
          children
            .map((payment) => String(payment["Bilty Number"] || "").trim())
            .filter(Boolean),
        ),
      );
      
      const vehicleNumbers = Array.from(
        new Set(
          children
            .map((payment) => String(payment["Vehicle Number"] || "").trim())
            .filter(Boolean),
        ),
      );

      const parent = children.length > 1
        ? {
            ...children[0],
            id: children[0].id,
            Amount: children.reduce((sum, payment) => sum + (payment.Amount || 0), 0),
            "Billing Qty": children.reduce((sum, payment) => sum + (payment["Billing Qty"] || 0), 0),
            "Bilty Number": biltyNumbers.join(", "),
            "Vehicle Number": vehicleNumbers.join(", "),
            PostingAmount: children.some((payment) => payment.PostingAmount !== undefined && payment.PostingAmount !== null)
              ? children.reduce((sum, payment) => sum + (payment.PostingAmount || 0), 0)
              : undefined,
          }
        : children[0];

      return {
        key,
        parent,
        children,
        isGrouped: children.length > 1,
      };
    });
  }, [filteredPayments, shouldGroupRows, normalizeGroupValue]);

  const handleUpdate = useCallback(() => {
    if (selectedPayment && updateStatus && onQuickUpdate) {
      const amt = updateAmount === "" ? undefined : Number(updateAmount);
      
      if (selectedGroup && selectedGroup.isGrouped) {
        const selectedChildren = selectedGroup.children.filter((c: FreightPayment) => selectedModalItems.has(c.id));
        if (selectedChildren.length === 0) {
          setShowDetailModal(false);
          return;
        }
        
        const totalAmountInPaise = amt !== undefined ? Math.round(amt * 100) : undefined;
        const currentTotal = selectedChildren.reduce((sum: number, child: FreightPayment) => sum + (child.Amount || 0), 0);
        
        const childAmounts: number[] = [];
        selectedChildren.forEach((child: FreightPayment) => {
          let childAmount = child.Amount ?? 0;
          if (totalAmountInPaise !== undefined && amt !== undefined) {
            if (selectedChildren.length === 1) {
              childAmount = amt;
            } else {
              const isLastChild = child === selectedChildren[selectedChildren.length - 1];
              if (currentTotal === 0) {
                childAmount = isLastChild ? amt : 0;
              } else {
                if (isLastChild) {
                  const sumOfOthers = selectedChildren.slice(0, -1).reduce((sum: number, c: FreightPayment) => {
                    const share = Math.round(totalAmountInPaise * (c.Amount || 0) / currentTotal);
                    return sum + Number((share / 100).toFixed(2));
                  }, 0);
                  childAmount = Number(((totalAmountInPaise / 100) - sumOfOthers).toFixed(2));
                } else {
                  const share = Math.round(totalAmountInPaise * (child.Amount || 0) / currentTotal);
                  childAmount = Number((share / 100).toFixed(2));
                }
              }
            }
          }
          childAmounts.push(childAmount);
        });
        
        const batchId = activeTab !== "makepayment" && activeTab !== "freight" ? `BATCH-${Date.now()}` : undefined;
        // Map the selected items and add the batch ID directly here or pass it if onQuickUpdate accepts it
        // Wait, onQuickUpdate receives the whole payment object. We can just attach Batch Number to it.
        const itemsToSubmit = selectedChildren.map((child: FreightPayment) => {
          const item: any = { ...child };
          if (batchId) {
            item["Batch Number"] = batchId;
          } else {
            delete item["Batch Number"];
          }
          return item;
        });
        
        onQuickUpdate(itemsToSubmit, activeTab, "yes", undefined, updateStatus, updateRemark, childAmounts, activeTab === "posting" ? updateAuditImage : undefined);
      } else {
        const batchId = activeTab !== "makepayment" && activeTab !== "freight" ? `BATCH-${Date.now()}` : undefined;
        const itemToSubmit: any = {
          ...selectedPayment
        };
        if (batchId) {
          itemToSubmit["Batch Number"] = batchId;
        } else {
          delete itemToSubmit["Batch Number"];
        }
        onQuickUpdate(itemToSubmit, activeTab, "yes", undefined, updateStatus, updateRemark, amt, activeTab === "posting" ? updateAuditImage : undefined);
      }
      
      setShowDetailModal(false);
      setSelectedPayment(null);
      setSelectedGroup(null);
      setUpdateStatus("");
      setUpdateRemark("");
      setUpdateAmount("");
      setUpdateAuditImage("");
      setSelectedModalItems(new Set());
    }
  }, [selectedPayment, selectedGroup, updateStatus, updateRemark, updateAmount, updateAuditImage, onQuickUpdate, activeTab, selectedModalItems]);

  const openDetailModal = useCallback((group: any) => {
    const payment = group.parent;
    setSelectedPayment(payment);
    setSelectedGroup(group);
    if (group.isGrouped) {
      setSelectedModalItems(new Set(group.children.map((c: FreightPayment) => c.id)));
    } else {
      setSelectedModalItems(new Set([payment.id]));
    }
    setUpdateStatus(String(getStepField(payment, "status") || ""));
    setUpdateRemark(String(getStepField(payment, "remark") || ""));
    setUpdateAmount(payment.Amount !== undefined && payment.Amount !== null ? payment.Amount : "");
    setUpdateAuditImage(payment["Audit Image"] || "");
    setShowDetailModal(true);
  }, [getStepField]);

  const columnDefs: ColumnDef[] = useMemo(() => {
    const showPaidAmount = activeTab === "posting" || activeTab === "makepayment" || activeTab === "freight";

    const cols: ColumnDef[] = [
      { key: "uniqueNumber", label: "ID", width: "100px", render: (p) => <span className="font-mono text-xs text-slate-500">{p["Unique Number"] || "—"}</span> },
      { key: "firmName", label: "Firm", width: "120px", render: (p) => <span className="px-2 py-0.5 rounded-md bg-slate-100 text-xs font-semibold">{p["Firm Name"] || "—"}</span> },
      { key: "transporterName", label: "Transporter", width: "150px", render: (p) => <span className="text-xs text-slate-600 truncate block" title={p["Transporter Name"]}>{p["Transporter Name"] || "—"}</span> },
      { key: "partyName", label: "Party Name", width: "150px", render: (p) => <span className="text-xs text-slate-600 truncate block" title={p["Party Name"]}>{p["Party Name"] || "—"}</span> },
      { key: "biltyNumber", label: "Bilty No.", width: "120px", render: (p) => <span className="font-mono text-xs truncate block" title={p["Bilty Number"] || undefined}>{p["Bilty Number"] || "—"}</span> },
      { key: "vehicleNumber", label: "Vehicle", width: "110px", render: (p) => <span className="font-mono text-xs">{p["Vehicle Number"] || "—"}</span> }
    ];

    if (activeTab !== "posting") {
      cols.push({
        key: "date",
        label: "Date",
        width: "135px",
        render: (p, g) => {
          let dateVal: string | undefined = "";
          if (activeTab === "makepayment") dateVal = p.Actual;
          else if (activeTab === "freight") dateVal = p.Actual2;
          else if (activeTab === "posting") dateVal = p.Actual3;
          else dateVal = p.Timestamp || p.created_at;

          return (
            <div className="flex items-center gap-1.5 text-xs">
              <span>{formatDate(dateVal)}</span>
              {g?.isGrouped && (
                <span className="px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold shrink-0">
                  {g.children.length}
                </span>
              )}
            </div>
          );
        }
      });
    }

    cols.push({
      key: "amount",
      label: "Amount",
      width: "110px",
      align: "right",
      render: (p) => <span className="font-bold text-sm">{formatCurrency(p.Amount)}</span>
    });

    if (showPaidAmount) {
      cols.push({
        key: "paidAmount",
        label: "Paid Amount",
        width: "130px",
        align: "right",
        render: (p) => (
          <span className="font-bold text-sm text-emerald-700">
            {p.PostingAmount !== undefined && p.PostingAmount !== null ? formatCurrency(p.PostingAmount) : "—"}
          </span>
        )
      });
    }

    if (activeTab === "makepayment") {
      cols.push({
        key: "auditImage",
        label: "Audit Image",
        width: "120px",
        align: "center",
        render: (p) => {
          const imageUrl = p["Audit Image"];
          if (!imageUrl) return <span className="text-slate-400 text-xs">—</span>;
          return (
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
            >
              <Image className="w-3.5 h-3.5 text-slate-400" />
              <span>View</span>
            </a>
          );
        }
      });
      cols.push({
        key: "auditRemark",
        label: "Audit Remark",
        width: "150px",
        render: (p) => (
          <span className="text-xs text-slate-600 truncate block" title={p.Remark_1 || undefined}>
            {p.Remark_1 || "—"}
          </span>
        )
      });
    }

    if (activeTab === "checkkitting") {
      cols.push({
        key: "transporterBillImage",
        label: "Transporter Bill Image",
        width: "140px",
        align: "center",
        render: (p) => {
          const imageUrl = p["Transporter Bill Image"];
          if (!imageUrl) return <span className="text-slate-400 text-xs">—</span>;
          return (
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
            >
              <Image className="w-3.5 h-3.5 text-slate-400" />
              <span>View</span>
            </a>
          );
        }
      });
    }

    cols.push(
      { key: "stepStatus", label: `${getStepName()} Status`, width: "130px", render: (p) => <StatusBadge status={getStepField(p, "status") as string} /> },
      { key: "overallStatus", label: "Overall", width: "120px", render: (p) => <StatusBadge status={p.Status} /> }
    );

    return cols;
  }, [activeTab, getStepName, getStepField, formatCurrency]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded ml-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border bg-slate-50/50 dark:bg-white/5">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search shipments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-card text-foreground placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
            </button>
          )}
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 min-w-[140px] max-w-[200px] justify-between bg-card border-border text-foreground hover:bg-slate-50 dark:hover:bg-white/5 text-xs"
            >
              <span className="flex items-center truncate">
                <Building2 className="w-4 h-4 mr-2 text-slate-400 shrink-0" />
                <span className="truncate">
                  {firmFilter.length === 0
                    ? "All firms"
                    : firmFilter.length === 1
                    ? firmFilter[0]
                    : `${firmFilter.length} Selected`}
                </span>
              </span>
              <ChevronRight className="w-4 h-4 ml-2 text-slate-400 shrink-0 rotate-90" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-2 bg-card border border-border text-foreground rounded-lg shadow-md" align="start">
            <div className="space-y-1">
              <div
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md cursor-pointer select-none"
                onClick={() => {
                  if (firmFilter.length === firmOptions.length) {
                    setFirmFilter([]);
                  } else {
                    setFirmFilter([...firmOptions]);
                  }
                }}
              >
                <Checkbox
                  checked={firmFilter.length === firmOptions.length}
                  className="pointer-events-none"
                />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Select All
                </span>
              </div>
              <div className="h-px bg-border my-1" />
              {firmOptions.map((firm) => {
                const isChecked = firmFilter.includes(firm);
                return (
                  <div
                    key={firm}
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md cursor-pointer select-none"
                    onClick={() => {
                      if (isChecked) {
                        setFirmFilter(firmFilter.filter((f) => f !== firm));
                      } else {
                        setFirmFilter([...firmFilter, firm]);
                      }
                    }}
                  >
                    <Checkbox
                      checked={isChecked}
                      className="pointer-events-none"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-300">
                      {firm}
                    </span>
                  </div>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value ?? "all")}>
          <SelectTrigger className="h-9 w-[140px] bg-card border-border text-foreground">
            <Filter className="w-4 h-4 mr-2 text-slate-400" />
            <SelectValue placeholder="All status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            {statusOptions.map((status) => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(searchTerm || firmFilter.length > 0 || statusFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(""); setFirmFilter([]); setStatusFilter("all"); }} className="h-9 text-slate-500 dark:text-slate-400">
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Clear
          </Button>
        )}

        <div className="ml-auto text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{filteredPayments.length}</span> of{" "}
          <span className="font-semibold text-foreground">{payments.length}</span> shipments
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden divide-y">
        {groupedPayments.map((group) => {
          const payment = group.parent;
          return (
            <div key={group.key} className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono font-semibold text-sm">{payment["Unique Number"] || `#${payment.id}`}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {payment["Firm Name"]} {group.isGrouped && <span className="text-blue-500 font-bold ml-1">({group.children.length} rows)</span>}
                  </p>
                </div>
                <p className="font-bold text-base">{formatCurrency(payment.Amount)}</p>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Truck className="w-3.5 h-3.5" />
                <span className="truncate">{payment["Transporter Name"] || "—"}</span>
                <span className="mx-1">•</span>
                <span className="truncate" title={payment["Vehicle Number"] || undefined}>{payment["Vehicle Number"] || "—"}</span>
              </div>

              {activeTab === "makepayment" && payment["Audit Image"] && (
                <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium">
                  <Image className="w-3.5 h-3.5 text-slate-400" />
                  <a href={payment["Audit Image"]} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    View Audit Image
                  </a>
                </div>
              )}

              {activeTab === "checkkitting" && payment["Transporter Bill Image"] && (
                <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium">
                  <Image className="w-3.5 h-3.5 text-slate-400" />
                  <a href={payment["Transporter Bill Image"]} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    View Transporter Bill Image
                  </a>
                </div>
              )}

              {activeTab === "makepayment" && payment.Remark_1 && (
                <div className="flex items-start gap-1.5 text-xs text-slate-500 font-medium">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <span className="truncate">Audit Remark: {payment.Remark_1}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <StatusBadge status={getStepField(payment, "status") as string} />
                <StatusBadge status={payment.Status} />
              </div>

              <div className="flex gap-2">
                <Button onClick={() => openDetailModal(group)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                  <Eye className="w-4 h-4 mr-2" />
                  {subTab === "history" ? "View Details" : "Update Status"}
                </Button>
                {activeTab === "makepayment" && ["pmmpl", "pmmpl order", "rkl", "rkl order", "purab", "purab order"].includes(payment["Firm Name"]?.toLowerCase() || "") && (
                  <Button
                    variant="outline"
                    className="px-3 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                    title="Fill Google Form"
                    onClick={(e) => {
                       e.stopPropagation();
                       const firmName = payment["Firm Name"]?.toLowerCase() || "";
                       let formId = "";
                       if (firmName === "pmmpl" || firmName === "pmmpl order") formId = "1FAIpQLScn8tHEUldlOM_8DKpHUfHHiRImDVjkpkhhfduaZUIxpxlJrA";
                       else if (firmName === "rkl" || firmName === "rkl order") formId = "1FAIpQLScJJFvh6zchRosSzX0mU-u7-oeMaQW6iv1osE70hRDoE-uVrg";
                       else if (firmName === "purab" || firmName === "purab order") formId = "1FAIpQLSdLWKfGPNXK62Orndb137GPKadFiRQZS8W_MM0c11HvdR4KkA";
                       if (!formId) return;

                       const baseUrl = `https://docs.google.com/forms/d/e/${formId}/viewform?usp=pp_url`;
                       const uniqueNumber = encodeURIComponent(payment["Unique Number"] || "");
                       const transporter = encodeURIComponent(payment["Transporter Name"] || "");
                       const amount = encodeURIComponent(payment.Amount?.toString() || "");
                       const link = `${baseUrl}&entry.1200639812=${uniqueNumber}&entry.604194301=New+Freight+Payment+Application&entry.1358288895=Yes&entry.1091308719=${transporter}&entry.1486176123=${amount}&entry.2102057582=ok`;
                       window.open(link, "_blank");
                    }}
                  >
                    <FileText className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-white/5 sticky top-0">
            <TableRow className="border-b border-border bg-[#F1F5F9] dark:bg-slate-900 hover:bg-[#F1F5F9] dark:hover:bg-slate-900">
              <TableHead className="sticky left-0 bg-slate-50 dark:bg-slate-900 z-10 w-[90px]">Action</TableHead>
              {columnDefs.map((col) => (
                <TableHead key={col.key} style={{ width: col.width }} className={cn(col.align === "right" && "text-right", col.align === "center" && "text-center")}>
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupedPayments.map((group, idx) => (
              <TableRow key={group.key} className={cn("hover:bg-slate-50/80 dark:hover:bg-white/5", idx % 2 === 0 ? "bg-card" : "bg-slate-50/30 dark:bg-white/2")}>
                <TableCell className="sticky left-0 bg-inherit border-r border-border">
                  <div className="flex gap-2">
                    <Button onClick={() => openDetailModal(group)} size="sm" className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs">
                      {subTab === "history" ? <Eye className="w-3.5 h-3.5 mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                      {subTab === "history" ? "View" : "Update"}
                    </Button>
                    {activeTab === "makepayment" && ["pmmpl", "pmmpl order", "rkl", "rkl order", "purab", "purab order"].includes(group.parent["Firm Name"]?.toLowerCase() || "") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                        title="Fill Google Form"
                        onClick={(e) => {
                           e.stopPropagation();
                           const firmName = group.parent["Firm Name"]?.toLowerCase() || "";
                           let formId = "";
                           if (firmName === "pmmpl" || firmName === "pmmpl order") formId = "1FAIpQLScn8tHEUldlOM_8DKpHUfHHiRImDVjkpkhhfduaZUIxpxlJrA";
                           else if (firmName === "rkl" || firmName === "rkl order") formId = "1FAIpQLScJJFvh6zchRosSzX0mU-u7-oeMaQW6iv1osE70hRDoE-uVrg";
                           else if (firmName === "purab" || firmName === "purab order") formId = "1FAIpQLSdLWKfGPNXK62Orndb137GPKadFiRQZS8W_MM0c11HvdR4KkA";
                           if (!formId) return;

                           const baseUrl = `https://docs.google.com/forms/d/e/${formId}/viewform?usp=pp_url`;
                           const uniqueNumber = encodeURIComponent(group.parent["Unique Number"] || "");
                           const transporter = encodeURIComponent(group.parent["Transporter Name"] || "");
                           const amount = encodeURIComponent(group.parent.Amount?.toString() || "");
                           const link = `${baseUrl}&entry.1200639812=${uniqueNumber}&entry.604194301=New+Freight+Payment+Application&entry.1358288895=Yes&entry.1091308719=${transporter}&entry.1486176123=${amount}&entry.2102057582=ok`;
                           window.open(link, "_blank");
                        }}
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
                {columnDefs.map((col) => (
                  <TableCell key={col.key} className={cn("py-3", col.align === "right" && "text-right", col.align === "center" && "text-center")}>
                    {col.key === "transporterName" ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-600 dark:text-slate-300 truncate block" title={group.parent["Transporter Name"]}>
                          {group.parent["Transporter Name"] || "—"}
                        </span>
                        {group.isGrouped && (
                          <span className="px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold shrink-0">
                            {group.children.length}
                          </span>
                        )}
                      </div>
                    ) : col.render ? col.render(group.parent, group) : "—"}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border bg-slate-50/50 dark:bg-white/5 flex justify-between items-center text-sm">
        <span className="text-muted-foreground">Total Amount: <strong className="text-foreground">{formatCurrency(filteredPayments.reduce((sum, p) => sum + (p.Amount || 0), 0))}</strong></span>
        <span className="text-slate-400 dark:text-slate-500 text-xs">Updated: {new Date().toLocaleDateString("en-IN")}</span>
      </div>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="w-[94vw] sm:max-w-[920px] max-h-[85vh] overflow-y-auto bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Shipment Details {selectedGroup?.isGrouped && "• Grouped"}
            </DialogTitle>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-5">
              {/* Header Card */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/15 dark:to-indigo-950/15 border border-blue-100/50 dark:border-blue-900/30 rounded-xl p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">
                      {selectedGroup?.isGrouped ? "Group Unique ID (First)" : "Unique ID"}
                    </p>
                    <p className="font-mono font-bold text-lg text-slate-800 dark:text-slate-200">{selectedPayment["Unique Number"] || `#${selectedPayment.id}`}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <StatusBadge status={selectedPayment.Status} />
                    {selectedGroup?.isGrouped && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md">
                        {selectedGroup.children.length} Shipments Merged
                      </span>
                    )}
                  </div>
                </div>
                <div className={cn(
                  "grid gap-4 mt-3 pt-3 border-t border-blue-100/50 dark:border-blue-900/30",
                  selectedPayment.PostingAmount !== undefined ? "grid-cols-3" : "grid-cols-2"
                )}>
                  <div>
                    <p className="text-xs text-slate-500">Firm</p>
                    <p className="font-semibold text-slate-700 dark:text-slate-200">{selectedPayment["Firm Name"] || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">
                      {selectedGroup?.isGrouped ? "Total Amount" : "Amount"}
                    </p>
                    <p className="font-bold text-lg text-emerald-600 dark:text-emerald-400">{formatCurrency(selectedPayment.Amount)}</p>
                  </div>
                  {selectedPayment.PostingAmount !== undefined && (
                    <div>
                      <p className="text-xs text-slate-500">Paid Amount</p>
                      <p className="font-bold text-lg text-blue-600 dark:text-blue-400">{formatCurrency(selectedPayment.PostingAmount)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                <DetailItem icon={Truck} label="Transporter" value={selectedPayment["Transporter Name"]} />
                <DetailItem icon={Hash} label="Vehicle Number" value={selectedPayment["Vehicle Number"]} />
                <DetailItem icon={MapPin} label="Route" value={`${selectedPayment.From || "—"} → ${selectedPayment.To || "—"}`} />
                <DetailItem icon={Package} label="Material" value={selectedPayment["Material Load Details"]} />
                <DetailItem icon={User} label="Party Name" value={selectedPayment["Party Name"]} />
                <DetailItem icon={FileText} label="Bilty Number" value={selectedPayment["Bilty Number"]} />
                <DetailItem icon={Calendar} label={getStepName()} value={formatDate(getStepField(selectedPayment, "status") as string)} />
                {selectedPayment.PostingAmount !== undefined && (
                  <DetailItem icon={DollarSign} label="Paid Amount" value={formatCurrency(selectedPayment.PostingAmount)} />
                )}
                {activeTab === "makepayment" && (
                  <DetailItem icon={MessageSquare} label="Audit Remark" value={selectedPayment.Remark_1} />
                )}
              </div>

              {/* Audit Image Display */}
              {selectedPayment["Audit Image"] && (
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Audit Image</span>
                  </div>
                  <a
                    href={selectedPayment["Audit Image"]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
                  >
                    View Audit Image
                  </a>
                </div>
              )}

              {/* Transporter Bill Image Display */}
              {selectedPayment["Transporter Bill Image"] && (
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Transporter Bill Image</span>
                  </div>
                  <a
                    href={selectedPayment["Transporter Bill Image"]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
                  >
                    View Transporter Bill Image
                  </a>
                </div>
              )}

              {/* Group's Shipments Table (Only shown for grouped rows) */}
              {selectedGroup?.isGrouped && (
                <div className="border-t border-border pt-4">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Merged Shipments ({selectedGroup.children.length})
                  </h4>
                  <div className="rounded-xl border border-border bg-card overflow-hidden max-h-[300px] overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-slate-50 dark:bg-white/5 sticky top-0">
                        <TableRow className="border-b border-border">
                          <TableHead className="w-10 text-center"><Checkbox checked={selectedModalItems.size === selectedGroup.children.length && selectedGroup.children.length > 0} onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedModalItems(new Set(selectedGroup.children.map((c: FreightPayment) => c.id)));
                              } else {
                                setSelectedModalItems(new Set());
                              }
                            }} /></TableHead>
                          <TableHead className="w-[120px]">ID</TableHead>
                          <TableHead className="w-[100px]">Firm</TableHead>
                          <TableHead>Party Name</TableHead>
                          <TableHead>Material</TableHead>
                          <TableHead className="w-[110px]">Bilty No.</TableHead>
                          <TableHead className="w-[110px]">Vehicle</TableHead>
                          <TableHead className="w-[110px] text-right">Amount</TableHead>
                          {activeTab === "makepayment" && <TableHead className="w-[120px] text-center">Audit Image</TableHead>}
                          {activeTab === "makepayment" && <TableHead className="w-[150px]">Audit Remark</TableHead>}
                          {activeTab === "checkkitting" && <TableHead className="w-[120px] text-center">Transporter Bill Image</TableHead>}
                          <TableHead className="w-[120px]">{getStepName()} Status</TableHead>
                          <TableHead className="w-[120px]">Overall</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedGroup.children.map((child: FreightPayment, childIdx: number) => (
                          <TableRow key={child.id || childIdx} className="hover:bg-slate-50/50">
                            <TableCell className="w-10 text-center py-2.5">
                              <Checkbox
                                checked={selectedModalItems.has(child.id)}
                                onCheckedChange={(checked) => {
                                  const newSelected = new Set(selectedModalItems);
                                  if (checked) {
                                    newSelected.add(child.id);
                                  } else {
                                    newSelected.delete(child.id);
                                  }
                                  setSelectedModalItems(newSelected);
                                }}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-xs text-slate-500 py-2.5">
                              {child["Unique Number"] || "—"}
                            </TableCell>
                            <TableCell className="py-2.5">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 border border-border text-[11px] font-semibold text-foreground">
                                {child["Firm Name"] || "—"}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-slate-700 dark:text-slate-300 py-2.5 max-w-[120px] truncate" title={child["Party Name"] || undefined}>
                              {child["Party Name"] || "—"}
                            </TableCell>
                            <TableCell className="text-xs text-slate-700 dark:text-slate-300 py-2.5 max-w-[150px] truncate" title={child["Material Load Details"] || undefined}>
                              {child["Material Load Details"] || "—"}
                            </TableCell>
                            <TableCell className="font-mono text-xs py-2.5">
                              {child["Bilty Number"] || "—"}
                            </TableCell>
                            <TableCell className="font-mono text-xs py-2.5">
                              {child["Vehicle Number"] || "—"}
                            </TableCell>
                            <TableCell className="font-bold text-xs text-right py-2.5">
                              {formatCurrency(child.Amount)}
                            </TableCell>
                            {activeTab === "makepayment" && (
                              <TableCell className="py-2.5 text-center">
                                {child["Audit Image"] ? (
                                  <a
                                    href={child["Audit Image"]}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                                  >
                                    <Image className="w-3.5 h-3.5 text-slate-400" />
                                    <span>View</span>
                                  </a>
                                ) : (
                                  <span className="text-slate-400 text-xs">—</span>
                                )}
                              </TableCell>
                            )}
                            {activeTab === "makepayment" && (
                              <TableCell className="text-xs text-slate-700 dark:text-slate-300 py-2.5 max-w-[150px] truncate" title={child.Remark_1 || undefined}>
                                {child.Remark_1 || "—"}
                              </TableCell>
                            )}
                            {activeTab === "checkkitting" && (
                              <TableCell className="py-2.5 text-center">
                                {child["Transporter Bill Image"] ? (
                                  <a
                                    href={child["Transporter Bill Image"]}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                                  >
                                    <Image className="w-3.5 h-3.5 text-slate-400" />
                                    <span>View</span>
                                  </a>
                                ) : (
                                  <span className="text-slate-400 text-xs">—</span>
                                )}
                              </TableCell>
                            )}
                            <TableCell className="py-2.5">
                              <StatusBadge status={getStepField(child, "status") as string} />
                            </TableCell>
                            <TableCell className="py-2.5">
                              <StatusBadge status={child.Status} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Update Section for pending tab */}
              {subTab !== "history" && onQuickUpdate && (
                <div className="border-t border-border pt-4 mt-2">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <Check className="w-4 h-4 text-green-600" />
                    Update {getStepName()}
                  </h4>
                  <div className={cn(
                    "grid grid-cols-1 gap-4",
                    activeTab === "posting" ? "sm:grid-cols-[160px_160px_1fr]" : "sm:grid-cols-[160px_1fr]"
                  )}>
                    <div>
                      <Label className="text-xs text-slate-500 dark:text-slate-400">Status</Label>
                      <Select value={updateStatus} onValueChange={(value) => setUpdateStatus(value ?? "")}> 
                        <SelectTrigger className="mt-1 bg-card border border-border text-foreground">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Done">Done</SelectItem>
                          <SelectItem value="Not Done">Not Done</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {activeTab === "posting" && (
                      <div>
                        <Label className="text-xs text-slate-500 dark:text-slate-400">Amount (₹)</Label>
                        <Input
                          type="number"
                          value={updateAmount}
                          onChange={(e) => setUpdateAmount(e.target.value === "" ? "" : Number(e.target.value))}
                          placeholder="Enter amount..."
                          className="mt-1 bg-card border border-border text-foreground"
                        />
                      </div>
                    )}
                    <div>
                      <Label className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        Remark
                      </Label>
                      <Input
                        value={updateRemark}
                        onChange={(e) => setUpdateRemark(e.target.value)}
                        placeholder="Add a remark..."
                        className="mt-1 bg-card border border-border text-foreground"
                      />
                    </div>
                  </div>

                  {activeTab === "posting" && (
                    <div className="space-y-1.5 mt-4">
                      <Label className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Image className="w-3.5 h-3.5" />
                        Audit Image
                      </Label>
                      {updateAuditImage ? (
                        <div className="flex items-center gap-3 h-9 bg-white dark:bg-slate-900 border border-border rounded-lg px-3">
                          <a
                            href={updateAuditImage}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[12px] text-blue-600 dark:text-blue-400 font-semibold hover:underline truncate flex-1"
                          >
                            View uploaded audit image
                          </a>
                          <button
                            type="button"
                            onClick={() => setUpdateAuditImage("")}
                            className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 p-1 rounded-md transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <label
                            className={cn(
                              "flex items-center justify-center gap-2 h-9 bg-white dark:bg-slate-900 border border-dashed border-border rounded-lg text-[12px] font-medium text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors",
                              isUploading && "opacity-50 pointer-events-none"
                            )}
                          >
                            <Upload className="w-3.5 h-3.5" />
                            {isUploading ? "Uploading…" : "Click to upload"}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setIsUploading(true);
                                  try {
                                    const url = await freightPaymentApi.upload(file);
                                    setUpdateAuditImage(url);
                                  } catch {
                                    alert("Upload failed. Please check your storage settings.");
                                  } finally {
                                    setIsUploading(false);
                                  }
                                }
                              }}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-4 border-t border-border pt-4">
            <Button variant="outline" onClick={() => setShowDetailModal(false)}>Cancel</Button>
            {subTab !== "history" && onQuickUpdate && (
              <Button onClick={handleUpdate} disabled={!updateStatus} className="bg-blue-600 hover:bg-blue-700">
                <Check className="w-4 h-4 mr-2" />
                Update Status
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper Component
function DetailItem({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-lg bg-slate-50/50 dark:bg-white/5 border border-border/20">
      <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500 mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate" title={value || "—"}>{value || "—"}</p>
      </div>
    </div>
  );
}