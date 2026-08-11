import React, { useEffect, useMemo, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { freightPaymentApi } from "../lib/api";
import { Button } from "./ui/button";
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
import { Checkbox } from "./ui/checkbox";
import {
  Calendar,
  ExternalLink,
  FileText,
  Filter,
  Hash,
  IndianRupee,
  Loader2,
  Package,
  PackageCheck,
  Search,
  Truck,
  User,
  X,
  Check,
  ChevronRight,
  Building2,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { cn } from "@/lib/utils";
import { FreightPayment } from "../types";

interface DispatchRow {
  "D-Sr Number"?: string | number | null;
  "Date Of Dispatch"?: string | null;
  po_id?: string | number | null;
  "Party Name"?: string | null;
  "Product Name"?: string | null;
  "Transporter Name"?: string | null;
  "Truck No."?: string | null;
  "Bilty No."?: string | number | null;
  "Type Of Rate"?: string | null;
  "Fixed Amount"?: number | string | null;
  "Transport Rate @Per Matric Ton"?: number | string | null;
  "Total Transporter Amount"?: number | string | null;
  "Actual Truck Qty"?: number | string | null;
  "Bill Number"?: string | number | null;
  "Bill Copy"?: string | null;
  "Fullkitting Remarks"?: string | null;
  "Transporter Bill Image"?: string | null;
  "Fullkitting Actual"?: string | null;
  "Fullkitting Status"?: string | null;
  [key: string]: unknown;
}

interface OrderReceiptRow {
  id?: string | number | null;
  "Firm Name"?: string | null;
  "Party Names"?: string | null;
  "Product Name"?: string | null;
  Quantity?: number | string | null;
  "Freight Amount"?: number | string | null;
  "Rate Of Material"?: number | string | null;
  Address?: string | null;
  "Lead Time to Reach Factory"?: number | string | null;
  [key: string]: unknown;
}

interface DeliveryRow {
  "D-Sr Number"?: string | number | null;
  "Bilty No."?: string | number | null;
  "Bilty Number."?: string | number | null;
  "Bilty Copy"?: string | null;
  [key: string]: unknown;
}

interface FullKittinRow {
  id?: number | string | null;
  "Lift No"?: string | null;
  "Indent No"?: string | null;
  "Material Load Details"?: string | null;
  "Bilty Number"?: string | null;
  "Transporter Name"?: string | null;
  "Vehicle Number"?: string | null;
  "Bilty Image"?: string | null;
  "Rate Type"?: string | null;
  "Transporting Per MT Rate"?: number | string | null;
  "Transporting Rate"?: number | string | null;
  Amount?: number | string | null;
  "Transporter Bill Image"?: string | null;
  "Fullkitting Remarks"?: string | null;
  [key: string]: unknown;
}

interface LiftAccountRow {
  "Lift No"?: string | null;
  "Indent no."?: string | null;
  Timestamp?: string | null;
  "Firm Name"?: string | null;
  "Vendor Name"?: string | null;
  "Raw Material Name"?: string | null;
  "Transporter Name"?: string | null;
  "Truck No."?: string | null;
  "Bilty No."?: string | null;
  "Bilty No. 2"?: string | null;
  "Bilty Image"?: string | null;
  "Transporter Rate"?: number | string | null;
  "Transporting Rate"?: number | string | null;
  "Type Of Transporting Rate"?: string | null;
  "Area lifting"?: string | null;
  "Lead Time To Reach Factory (days)"?: number | string | null;
  "Driver No."?: string | number | null;
  Qty?: number | string | null;
  "Truck Qty"?: number | string | null;
  Rate?: number | string | null;
  "Fullkitting Remarks"?: string | null;
  "Transporter Bill Image"?: string | null;
  "Bill Image"?: string | null;
  "Lifting Qty"?: number | string | null;
  "Total Bill Quantity"?: number | string | null;
  "Bill No."?: string | null;
  [key: string]: unknown;
}

interface MismatchRow {
  "Lift ID"?: string | null;
  "Lift No"?: string | null;
  "Lift Number"?: string | null;
  "Indent Number"?: string | null;
  "Bilty No."?: string | null;
  "Truck No."?: string | null;
  "Transporter Name"?: string | null;
  Transporter?: string | null;
  "Bilty Image"?: string | null;
  "Total Freight"?: number | string | null;
  [key: string]: unknown;
}

interface KittingHistoryItem {
  liftId: string;
  indentNo: string;
  date: string;
  firmName: string;
  partyName: string;
  productName: string;
  poQty: number | null;
  transporterName: string;
  vehicleNumber: string;
  biltyNumber: string;
  biltyImage: string;
  freightAmount: number | null;
  typeOfRate: string;
  transportingPerMtRate: number | null;
  totalTruckBillingQty: number | null;
  materialRate: number | null;
  billingQty: number | null;
  billNo: string;
  areaLifting: string;
  leadTimeDays: number | null;
  driverNo: string;
  fullkittingRemarks: string;
  transporterBillImage: string;
  billImage: string;
  hasBilty: "Yes" | "No";
  systemName: string;
  fullkittingDoneAt: string;
}

const str = (v: unknown): string => (v != null ? String(v).trim() : "");

const num = (v: unknown): number | null => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const isFilled = (v: unknown): boolean => str(v) !== "";

const naturalCompare = (a: string, b: string): number =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

const firstFilled = (...values: unknown[]): string => {
  for (const value of values) {
    const text = str(value);
    if (text) return text;
  }
  return "";
};

const firstNumber = (...values: unknown[]): number | null => {
  for (const value of values) {
    const parsed = num(value);
    if (parsed !== null) return parsed;
  }
  return null;
};

const validBilty = (v: unknown): boolean => {
  const value = str(v).toLowerCase();
  return value !== "" && value !== "000000" && value !== "0" && value !== "-";
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const formatCurrency = (amount?: number | null) => {
  if (amount === undefined || amount === null) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const getRowUniqueId = (row: KittingHistoryItem): string => {
  return `KIT-${row.liftId}-${row.biltyNumber || ""}-${row.vehicleNumber || ""}`.replace(
    /\s+/g,
    "",
  );
};

const toSystemPayment = (row: KittingHistoryItem, batchId?: string): Partial<FreightPayment> => {
  const uniqueId = getRowUniqueId(row);
  return {
    "Payment Number": uniqueId,
    "Unique Number": uniqueId,
    "Lift ID": row.liftId,
    "Firm Name": row.firmName,
    "Fms Name": row.systemName || "Account Checking",
    Status: "Not Done",
    "Transporter Name": row.transporterName,
    "Vehicle Number": row.vehicleNumber,
    "Material Load Details": row.productName,
    "Bilty Number": row.biltyNumber,
    "Rate Type": "External",
    Amount: row.freightAmount ?? 0,
    "Bilty Image": row.biltyImage,
    "Transporter Bill Image": row.transporterBillImage,
    Timestamp: row.date || new Date().toISOString(),
    "Party Name": row.partyName || undefined,
    "Billing Qty": row.billingQty ?? undefined,
    "Bill Number": row.billNo || undefined,
    Remark3: row.fullkittingRemarks,
    "Batch Number": batchId,
  };
};

function buildPurchaseRows(
  fullkittin: FullKittinRow[],
  liftAccounts: LiftAccountRow[],
  mismatch: MismatchRow[],
): KittingHistoryItem[] {
  const fkByLiftNo = new Map<string, FullKittinRow>();
  const fkByIndentNo = new Map<string, FullKittinRow>();
  const fkByBilty = new Map<string, FullKittinRow>();
  for (const fk of fullkittin) {
    if (str(fk.Status).toLowerCase() === "no") continue;

    const liftNo = str(fk["Lift No"]).toLowerCase();
    const indentNo = str(fk["Indent No"]).toLowerCase();
    const bilty = str(fk["Bilty Number"]).toLowerCase();

    if (liftNo) {
      fkByLiftNo.set(liftNo, fk);
    }
    if (indentNo) {
      fkByIndentNo.set(indentNo, fk);
    }
    if (validBilty(bilty) && !fkByBilty.has(bilty)) {
      fkByBilty.set(bilty, fk);
    }
  }

  const mmByLift = new Map<string, MismatchRow>();
  for (const mm of mismatch) {
    const key = firstFilled(mm["Lift Number"], mm["Lift ID"], mm["Lift No"]).toLowerCase();
    if (key) mmByLift.set(key, mm);
  }

  const merged: KittingHistoryItem[] = [];

  for (const la of liftAccounts) {
    const liftNum = str(la["Lift No"]).toLowerCase();
    const indentNum = str(la["Indent no."]).toLowerCase();
    const biltyNo1 = str(la["Bilty No."]).toLowerCase();
    const biltyNo2 = str(la["Bilty No. 2"]).toLowerCase();
    let fk = liftNum ? fkByLiftNo.get(liftNum) : undefined;
    
    if (!fk && indentNum) {
      const candidate = fkByIndentNo.get(indentNum);
      if (candidate) {
        const candidateLift = str(candidate["Lift No"]).toLowerCase();
        if (!candidateLift || candidateLift === liftNum) {
          fk = candidate;
        }
      }
    }
    
    if (!fk && validBilty(biltyNo1)) {
      const candidate = fkByBilty.get(biltyNo1);
      if (candidate) {
        const candidateLift = str(candidate["Lift No"]).toLowerCase();
        if (!candidateLift || candidateLift === liftNum) {
          fk = candidate;
        }
      }
    }

    if (!fk && validBilty(biltyNo2)) {
      const candidate = fkByBilty.get(biltyNo2);
      if (candidate) {
        const candidateLift = str(candidate["Lift No"]).toLowerCase();
        if (!candidateLift || candidateLift === liftNum) {
          fk = candidate;
        }
      }
    }

    if (!fk) continue;

    const mm = liftNum ? mmByLift.get(liftNum) : undefined;
    const fkMatchesLift = liftNum !== "" && str(fk["Lift No"]).toLowerCase() === liftNum;

    const biltyNumber = firstFilled(fk["Bilty Number"], mm?.["Bilty No."], la["Bilty No."], la["Bilty No. 2"]) || "-";
    const freightAmount = firstNumber(
      fkMatchesLift ? fk.Amount : undefined,
      mm?.["Total Freight"],
      la["Transporter Rate"],
    );
    const timestamp = firstFilled(la.Timestamp, mm?.Timestamp);
    const transporterName =
      firstFilled(fk["Transporter Name"], mm?.["Transporter Name"], mm?.Transporter, la["Transporter Name"]) ||
      "-";

    if (transporterName.trim().toLowerCase() === "for") {
      continue;
    }

    merged.push({
      liftId: str(la["Lift No"]) || "-",
      indentNo: str(la["Indent no."]) || str(fk["Indent No"]) || str(mm?.["Indent Number"]) || "-",
      date: timestamp,
      firmName: str(la["Firm Name"]),
      partyName: str(la["Vendor Name"]),
      productName: firstFilled(fk["Material Load Details"], la["Raw Material Name"]) || "-",
      poQty: num(la.Qty),
      transporterName,
      vehicleNumber:
        firstFilled(fk["Vehicle Number"], mm?.["Truck No."], la["Truck No."]) ||
        "-",
      biltyNumber,
      biltyImage:
        firstFilled(fk["Bilty Image"], mm?.["Bilty Image"], la["Bilty Image"]),
      freightAmount,
      typeOfRate: firstFilled(fk["Rate Type"], la["Type Of Transporting Rate"]) || "-",
      transportingPerMtRate: firstNumber(
        fk["Transporting Per MT Rate"],
        fk["Transporting Rate"],
        la["Transporting Rate"],
      ),
      totalTruckBillingQty: num(la["Truck Qty"]) ?? num(la["Total Bill Quantity"]),
      materialRate: num(la.Rate),
      billingQty: num(la["Lifting Qty"]) ?? num(la["Total Bill Quantity"]),
      billNo: str(la["Bill No."]) || "-",
      areaLifting: str(la["Area lifting"]) || "-",
      leadTimeDays: num(la["Lead Time To Reach Factory (days)"]),
      driverNo: str(la["Driver No."]) || "-",
      fullkittingRemarks: str(fk["Fullkitting Remarks"]) || "-",
      transporterBillImage: str(fk["Transporter Bill Image"]),
      billImage: str(la["Bill Image"]),
      hasBilty: validBilty(biltyNumber) ? "Yes" : "No",
      systemName: "Purchase FMS",
      fullkittingDoneAt: timestamp,
    });
  }

  return merged;
}

function buildOrderRows(
  dispatchRows: DispatchRow[],
  orderRows: OrderReceiptRow[],
  deliveryRows: DeliveryRow[],
): KittingHistoryItem[] {
  const ordersById = new Map<string, OrderReceiptRow>();
  for (const order of orderRows) {
    const key = str(order.id);
    if (key) ordersById.set(key, order);
  }

  const deliveryByDsr = new Map<string, DeliveryRow>();
  for (const delivery of deliveryRows) {
    const key = str(delivery["D-Sr Number"]);
    if (key && !deliveryByDsr.has(key)) deliveryByDsr.set(key, delivery);
  }

  return dispatchRows
    .filter((dispatch) => isFilled(dispatch["Fullkitting Actual"]) && str(dispatch["Fullkitting Status"]).toLowerCase() !== "no")
    .map((dispatch) => {
      const order = ordersById.get(str(dispatch.po_id));
      const delivery = deliveryByDsr.get(str(dispatch["D-Sr Number"]));
      const ratePerMt = num(dispatch["Transport Rate @Per Matric Ton"]);
      const actualQty = num(dispatch["Actual Truck Qty"]);
      const freightAmount = num(dispatch["Total Transporter Amount"]);
      const biltyNumber = firstFilled(
        delivery?.["Bilty No."],
        delivery?.["Bilty Number."],
        dispatch["Bilty No."],
      );
      const hasBilty: "Yes" | "No" =
        validBilty(delivery?.["Bilty Copy"]) || validBilty(biltyNumber)
          ? "Yes"
          : "No";

      const doNo = firstFilled(
        delivery?.["Delivery Order No."],
        order?.["DO-Delivery Order No."],
        order?.["Delivery Order No."]
      );

      return {
        liftId: str(dispatch["D-Sr Number"]) || "-",
        indentNo: doNo || "-",
        date: str(dispatch["Fullkitting Actual"]),
        firmName: str(order?.["Firm Name"]),
        partyName: firstFilled(dispatch["Party Name"], order?.["Party Names"]),
        productName:
          firstFilled(dispatch["Product Name"], order?.["Product Name"]) || "-",
        poQty: num(order?.Quantity),
        transporterName: str(dispatch["Transporter Name"]) || "-",
        vehicleNumber: str(dispatch["Truck No."]) || "-",
        biltyNumber: biltyNumber || "-",
        biltyImage: str(delivery?.["Bilty Copy"]),
        freightAmount,
        typeOfRate: str(dispatch["Type Of Rate"]) || "-",
        transportingPerMtRate: ratePerMt,
        totalTruckBillingQty: actualQty,
        materialRate: num(order?.["Rate Of Material"]),
        billingQty: actualQty,
        billNo: str(dispatch["Bill Number"]) || "-",
        areaLifting: str(order?.Address) || "-",
        leadTimeDays: num(order?.["Lead Time to Reach Factory"]),
        driverNo: "-",
        fullkittingRemarks: str(dispatch["Fullkitting Remarks"]) || "-",
        transporterBillImage: str(dispatch["Transporter Bill Image"]),
        billImage: str(dispatch["Bill Copy"]),
        hasBilty,
        systemName: "Order Management System",
        fullkittingDoneAt: str(dispatch["Fullkitting Actual"]),
      };
    })
    .sort(
      (a, b) =>
        new Date(b.fullkittingDoneAt).getTime() -
        new Date(a.fullkittingDoneAt).getTime(),
    );
}

export interface GroupedKittingHistory {
  key: string;
  isGrouped: boolean;
  parent: KittingHistoryItem;
  children: KittingHistoryItem[];
}

export function FullKittingHistory({
  refreshTrigger = 0,
  onRefreshDone,
}: {
  refreshTrigger?: number;
  onRefreshDone?: () => void;
}) {
  const queryClient = useQueryClient();
  const isInitialLoad = useRef(true);
  const [rows, setRows] = useState<KittingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchTransporter, setSearchTransporter] = useState("");
  const [searchProduct, setSearchProduct] = useState("");
  const [searchFirms, setSearchFirms] = useState<string[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());
  const [processMessage, setProcessMessage] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedGroup, setSelectedGroup] = useState<GroupedKittingHistory | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isProcessingGroup, setIsProcessingGroup] = useState(false);
  const [selectedModalItems, setSelectedModalItems] = useState<Set<string>>(new Set());

  const openDetailModal = (group: GroupedKittingHistory) => {
    setSelectedGroup(group);
    setSelectedModalItems(new Set(group.children.map(getRowUniqueId)));
    setShowDetailModal(true);
  };

  const processGroup = async (group: GroupedKittingHistory) => {
    setIsProcessingGroup(group.children.length > 0);
    setProcessMessage(null);
    let successCount = 0;
    const batchId = `BATCH-${Date.now()}`;
    try {
      for (const row of group.children) {
        const uniqueId = getRowUniqueId(row);
        if (!selectedModalItems.has(uniqueId)) continue;
        setProcessingId(uniqueId);
        await freightPaymentApi.post("kitting", toSystemPayment(row, batchId));
        setProcessedIds((prev) => {
          const next = new Set(prev);
          next.add(uniqueId);
          return next;
        });
        successCount += 1;
      }
      setShowDetailModal(false);
      setSelectedGroup(null);
      setProcessMessage(`Processed ${successCount} records successfully`);
      queryClient.invalidateQueries({ queryKey: ["freight-entries"] });
    } catch (err) {
      setProcessMessage(
        err instanceof Error ? err.message : "Failed to process group",
      );
    } finally {
      setProcessingId(null);
      setIsProcessingGroup(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function load(isSoft = false) {
      if (!isSoft) {
        setLoading(true);
      }
      setError(null);

      try {
        const res = await freightPaymentApi.get("entry");
        const entries = res.data || [];
        const processedSet = new Set<string>();

        const mappedRows: KittingHistoryItem[] = entries.map((e: any) => {
          const uniqueId = e.unique_number || `KIT-${e.id}`;
          if (e.kitting?.status === "Done") {
            processedSet.add(uniqueId);
          }
          return {
            liftId: e.lift_id || "—",
            indentNo: e.payment_number || "—",
            date: e.created_at || "",
            firmName: e.firm_name || "—",
            partyName: e.party_name || "—",
            productName: e.material_load_details || "—",
            poQty: null,
            transporterName: e.transporter_name || "—",
            vehicleNumber: e.vehicle_number || "—",
            biltyNumber: e.bilty_number || "—",
            biltyImage: e.bilty_image_url || "",
            freightAmount: e.amount ? Number(e.amount) : null,
            typeOfRate: e.rate_type || "External",
            transportingPerMtRate: null,
            totalTruckBillingQty: e.billing_qty ? Number(e.billing_qty) : null,
            materialRate: null,
            billingQty: e.billing_qty ? Number(e.billing_qty) : null,
            billNo: e.bill_number || "—",
            areaLifting: "—",
            leadTimeDays: null,
            driverNo: "—",
            fullkittingRemarks: e.remark || "—",
            transporterBillImage: e.transporter_bill_image_url || "",
            billImage: "",
            hasBilty: e.bilty_number ? "Yes" : "No",
            systemName: e.fms_name || "Freight Payment System",
            fullkittingDoneAt: e.created_at || "",
          };
        });

        if (!cancelled) {
          setRows(mappedRows);
          setProcessedIds(processedSet);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load fullkitting history",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          if (onRefreshDone) {
            onRefreshDone();
          }
        }
      }
    }

    const isSoft = !isInitialLoad.current;
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
    }

    load(isSoft);
    return () => {
      cancelled = true;
    };
  }, [refreshTrigger, onRefreshDone]);

  // Base eligible rows (excl. processed and 'For' transporter)
  const baseEligibleRows = useMemo(() => {
    return rows.filter((r) => {
      const uniqueId = getRowUniqueId(r);
      if (processedIds.has(uniqueId) || processedIds.has(`KIT-${r.liftId}`)) {
        return false;
      }
      if (String(r.transporterName || "").trim().toLowerCase() === "for") {
        return false;
      }
      return true;
    });
  }, [rows, processedIds]);

  // Apply top-level filters (search term and firm)
  const baseFilteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return baseEligibleRows.filter((r) => {
      const searchOk =
        !term ||
        [
          r.liftId,
          r.indentNo,
          r.date,
          r.firmName,
          r.partyName,
          r.productName,
          r.transporterName,
          r.vehicleNumber,
          r.biltyNumber,
          r.billNo,
          r.areaLifting,
          r.driverNo,
          r.typeOfRate,
          r.hasBilty,
          r.systemName,
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(term));

      let firmOk = searchFirms.length === 0;
      if (searchFirms.length > 0) {
        const rf = r.firmName ? r.firmName.toLowerCase().trim() : "";
        firmOk = searchFirms.some((firm) => {
          const sf = firm.toLowerCase().trim();
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
      }
      return searchOk && firmOk;
    });
  }, [baseEligibleRows, searchTerm, searchFirms]);

  // Final filtered list for display
  const filtered = useMemo(() => {
    return baseFilteredRows.filter((r) => {
      const transporterOk =
        !searchTransporter || r.transporterName === searchTransporter;
      const productOk = !searchProduct || r.productName === searchProduct;
      return transporterOk && productOk;
    });
  }, [baseFilteredRows, searchTransporter, searchProduct]);

  // Faceted Transporter options
  const transporterOptions = useMemo(() => {
    const rowsForTransporters = searchProduct
      ? baseFilteredRows.filter((r) => r.productName === searchProduct)
      : baseFilteredRows;
    return Array.from(
      new Set(rowsForTransporters.map((r) => r.transporterName).filter(Boolean))
    ).sort();
  }, [baseFilteredRows, searchProduct]);

  // Faceted Product options
  const productOptions = useMemo(() => {
    const rowsForProducts = searchTransporter
      ? baseFilteredRows.filter((r) => r.transporterName === searchTransporter)
      : baseFilteredRows;
    return Array.from(
      new Set(rowsForProducts.map((r) => r.productName).filter(Boolean))
    ).sort();
  }, [baseFilteredRows, searchTransporter]);
  const firmOptions = ["RKL", "PMMPL", "PURAB"];

  const hasFilters =
    searchTerm || searchTransporter || searchProduct || searchFirms.length > 0;

  const selectableFilteredIds = useMemo(
    () =>
      filtered
        .map((r) => getRowUniqueId(r))
        .filter((id) => !processedIds.has(id)),
    [filtered, processedIds],
  );

  const selectedRows = useMemo(
    () => filtered.filter((r) => selectedIds.has(getRowUniqueId(r))),
    [filtered, selectedIds],
  );

  const allFilteredSelected =
    selectableFilteredIds.length > 0 &&
    selectableFilteredIds.every((id) => selectedIds.has(id));

  const groupedHistory = useMemo((): GroupedKittingHistory[] => {
    const groups = new Map<string, KittingHistoryItem[]>();
    filtered.forEach((r) => {
      const transporter = str(r.transporterName).toLowerCase();
      const bilty = str(r.biltyNumber).toLowerCase();
      const key = (transporter && validBilty(bilty))
        ? `group:${transporter}_${bilty}`
        : `single:${r.liftId}_${getRowUniqueId(r)}`;
      const existing = groups.get(key) || [];
      existing.push(r);
      groups.set(key, existing);
    });

    return Array.from(groups.entries()).map(([key, children]) => {
      if (children.length === 1) {
        return {
          key,
          isGrouped: false,
          parent: children[0],
          children,
        };
      }

      const parent: KittingHistoryItem = {
        ...children[0],
        freightAmount: children.reduce((sum, item) => sum + (item.freightAmount || 0), 0),
        billingQty: children.reduce((sum, item) => sum + (item.billingQty || 0), 0),
        poQty: children.reduce((sum, item) => sum + (item.poQty || 0), 0),
        totalTruckBillingQty: children.reduce((sum, item) => sum + (item.totalTruckBillingQty || 0), 0),
        liftId: Array.from(new Set(children.map(c => c.liftId))).join(", "),
        indentNo: Array.from(new Set(children.map(c => c.indentNo).filter(Boolean))).join(", "),
        vehicleNumber: Array.from(new Set(children.map(c => c.vehicleNumber).filter(Boolean))).join(", "),
        firmName: Array.from(new Set(children.map(c => c.firmName).filter(Boolean))).join(", "),
        partyName: Array.from(new Set(children.map(c => c.partyName).filter(Boolean))).join(", "),
        productName: Array.from(new Set(children.map(c => c.productName).filter(Boolean))).join(", "),
        billNo: Array.from(new Set(children.map(c => c.billNo).filter(Boolean))).join(", "),
      };

      return {
        key,
        isGrouped: true,
        parent,
        children,
      };
    });
  }, [filtered]);

  const toggleRowSelection = (row: KittingHistoryItem) => {
    const uniqueId = getRowUniqueId(row);
    if (processedIds.has(uniqueId) || processedIds.has(`KIT-${row.liftId}`)) {
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(uniqueId)) {
        next.delete(uniqueId);
      } else {
        next.add(uniqueId);
      }
      return next;
    });
  };

  const toggleGroupSelection = (group: GroupedKittingHistory) => {
    const allSelected = group.children.every(
      (c) => selectedIds.has(getRowUniqueId(c))
    );
    setSelectedIds((prev) => {
      const next = new Set(prev);
      group.children.forEach((c) => {
        const uniqueId = getRowUniqueId(c);
        if (processedIds.has(uniqueId) || processedIds.has(`KIT-${c.liftId}`)) {
          return;
        }
        if (allSelected) {
          next.delete(uniqueId);
        } else {
          next.add(uniqueId);
        }
      });
      return next;
    });
  };

  const toggleAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        selectableFilteredIds.forEach((id) => next.delete(id));
      } else {
        selectableFilteredIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const processRow = async (row: KittingHistoryItem) => {
    const uniqueId = getRowUniqueId(row);
    setProcessingId(uniqueId);
    setProcessMessage(null);

    try {
      // Use the entry's unique number as the lookup key; the backend
      // patches the kitting stage record keyed on the FreightPaymentEntry id.
      const entryRes = await freightPaymentApi.get("entry");
      const entries: any[] = entryRes.data || [];
      const match = entries.find(
        (e: any) =>
          (e.unique_number || `KIT-${e.id}`) === uniqueId ||
          e.lift_id === row.liftId
      );
      if (!match) throw new Error(`Entry not found for ${row.liftId}`);
      await freightPaymentApi.patch("kitting", match.id, "complete", { remark: row.fullkittingRemarks });
      setProcessedIds((prev) => new Set(prev).add(uniqueId));
      setProcessMessage(`Processed ${row.liftId} successfully`);
      queryClient.invalidateQueries({ queryKey: ["freight-entries"] });
    } catch (err) {
      setProcessMessage(
        err instanceof Error ? err.message : "Failed to process record",
      );
    } finally {
      setProcessingId(null);
    }
  };

  const processSelectedRows = async () => {
    if (selectedRows.length === 0) return;
    setIsBatchProcessing(true);
    setProcessMessage(null);

    // Fetch current entry list once, then patch each matched entry
    let entries: any[] = [];
    try {
      const entryRes = await freightPaymentApi.get("entry");
      entries = entryRes.data || [];
    } catch {
      setProcessMessage("Failed to load entries from backend");
      setIsBatchProcessing(false);
      return;
    }

    let successCount = 0;
    try {
      for (const row of selectedRows) {
        const uniqueId = getRowUniqueId(row);
        setProcessingId(uniqueId);
        const match = entries.find(
          (e: any) =>
            (e.unique_number || `KIT-${e.id}`) === uniqueId ||
            e.lift_id === row.liftId
        );
        if (!match) continue;
        await freightPaymentApi.patch("kitting", match.id, "complete", { remark: row.fullkittingRemarks });
        setProcessedIds((prev) => new Set(prev).add(uniqueId));
        successCount += 1;
      }
      setSelectedIds(new Set());
      setProcessMessage(`Processed ${successCount} records successfully`);
      queryClient.invalidateQueries({ queryKey: ["freight-entries"] });
    } catch (err) {
      setProcessMessage(
        err instanceof Error ? err.message : "Failed to process selected records",
      );
    } finally {
      setProcessingId(null);
      setIsBatchProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border bg-slate-50/50 dark:bg-white/5">
          <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="flex items-center justify-center gap-3 py-8 text-[13px] text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading fullkitting history...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/10 p-6 text-center">
        <p className="text-[13px] font-semibold text-rose-700 dark:text-rose-400">{error}</p>
        <p className="text-[12px] text-rose-400 dark:text-rose-500 mt-1">
          Check your network connection and backend API status.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-border bg-slate-50/40 dark:bg-white/5 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search records..."
            className="w-full pl-8 pr-7 py-1.5 text-[12px] border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-card text-foreground placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              <X className="w-3 h-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 text-[12px] font-semibold text-slate-400 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5" />
          Filters
        </div>

        <select
          value={searchTransporter}
          onChange={(e) => setSearchTransporter(e.target.value)}
          className="h-8 min-w-[150px] bg-card border border-border rounded-lg px-2 text-[12px] text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
        >
          <option value="">All transporters</option>
          {transporterOptions.map((transporter) => (
            <option key={transporter} value={transporter}>
              {transporter}
            </option>
          ))}
        </select>

        <select
          value={searchProduct}
          onChange={(e) => setSearchProduct(e.target.value)}
          className="h-8 min-w-[150px] bg-card border border-border rounded-lg px-2 text-[12px] text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
        >
          <option value="">All products</option>
          {productOptions.map((product) => (
            <option key={product} value={product}>
              {product}
            </option>
          ))}
        </select>

        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="h-8 min-w-[130px] max-w-[200px] justify-between bg-card border border-border text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 text-[12px] px-2 rounded-lg"
              />
            }
          >
            <span className="flex items-center truncate">
              <Building2 className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" />
              <span className="truncate text-muted-foreground">
                {searchFirms.length === 0
                  ? "All firms"
                  : searchFirms.length === 1
                  ? searchFirms[0]
                  : `${searchFirms.length} Selected`}
              </span>
            </span>
            <ChevronRight className="w-3.5 h-3.5 ml-2 text-slate-400 shrink-0 rotate-90" />
          </PopoverTrigger>
          <PopoverContent className="w-[180px] p-2 bg-card border border-border text-foreground rounded-lg shadow-md" align="start">
            <div className="space-y-1">
              <div
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md cursor-pointer select-none"
                onClick={() => {
                  if (searchFirms.length === firmOptions.length) {
                    setSearchFirms([]);
                  } else {
                    setSearchFirms([...firmOptions]);
                  }
                }}
              >
                <Checkbox
                  checked={searchFirms.length === firmOptions.length}
                  className="pointer-events-none"
                />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Select All
                </span>
              </div>
              <div className="h-px bg-border my-1" />
              {firmOptions.map((firm) => {
                const isChecked = searchFirms.includes(firm);
                return (
                  <div
                    key={firm}
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md cursor-pointer select-none"
                    onClick={() => {
                      if (isChecked) {
                        setSearchFirms(searchFirms.filter((f) => f !== firm));
                      } else {
                        setSearchFirms([...searchFirms, firm]);
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

        {hasFilters && (
          <button
            onClick={() => {
              setSearchTerm("");
              setSearchTransporter("");
              setSearchProduct("");
              setSearchFirms([]);
            }}
            className="text-[11px] font-semibold text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}

        <div className="ml-auto text-[12px] font-medium text-muted-foreground">
          Showing{" "}
          <span className="font-bold text-foreground">{filtered.length}</span> of{" "}
          <span className="font-bold text-foreground">{rows.length}</span> kitted
          records
        </div>

        <Button
          size="sm"
          onClick={processSelectedRows}
          disabled={selectedRows.length === 0 || isBatchProcessing}
          className="h-8 px-3 text-[12px] font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
        >
          {isBatchProcessing && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
          Submit{selectedRows.length > 0 ? ` (${selectedRows.length})` : ""}
        </Button>
      </div>

      {processMessage && (
        <div className="px-4 py-2 border-b border-border bg-slate-50 dark:bg-white/5 text-[12px] font-semibold text-muted-foreground">
          {processMessage}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/20 rounded-full flex items-center justify-center mb-4">
            <PackageCheck className="w-7 h-7 text-emerald-400" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">
            No fullkitting history found
          </h3>
          <p className="text-[13px] text-slate-400 dark:text-slate-500 max-w-sm">
            {hasFilters
              ? "No records match your current filters."
              : "Completed purchase and dispatch records will appear here once data is synced."}
          </p>
        </div>
      )}

      {filtered.length > 0 && (
        <>
          <div className="md:hidden divide-y divide-slate-100 dark:divide-white/5">
            {groupedHistory.map((group) => {
              const r = group.parent;
              return (
                <div key={group.key} className="p-4 bg-card">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 mr-3">
                      <span className="font-mono font-bold text-[13px] text-slate-800 dark:text-slate-200 truncate block max-w-[200px]" title={r.liftId}>
                        {group.isGrouped ? (
                          <span>
                            {group.children[0].liftId}{" "}
                            <span className="text-slate-400 dark:text-slate-500 font-normal">
                              (+{group.children.length - 1} more)
                            </span>
                          </span>
                        ) : (
                          r.liftId
                        )}
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {r.firmName && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 border border-border text-foreground font-semibold text-[12px]">
                            {r.firmName}
                          </span>
                        )}
                        {r.systemName && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-semibold text-[12px] whitespace-nowrap">
                            {r.systemName}
                          </span>
                        )}
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-wide">
                          Kitted
                        </span>
                        {group.isGrouped && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold text-[12px]">
                            {group.children.length} rows
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-bold text-base text-foreground shrink-0">
                      {formatCurrency(r.freightAmount)}
                    </span>
                  </div>
                  <Button
                    onClick={() => openDetailModal(group)}
                    size="sm"
                    className="w-full mb-3 h-9 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-bold flex items-center justify-center gap-1.5"
                  >
                    Action
                  </Button>

                  <div className="text-[12px] text-muted-foreground space-y-1 mb-3">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span className="text-slate-600 dark:text-slate-300">{r.partyName || "-"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Package className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span className="text-slate-600 dark:text-slate-300">{r.productName || "-"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Truck className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span className="text-slate-600 dark:text-slate-300">{r.transporterName}</span>
                      {r.vehicleNumber !== "-" && (
                        <span className="font-mono text-slate-400 dark:text-slate-500">
                          - {r.vehicleNumber}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Hash className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span className="text-slate-600 dark:text-slate-300">Bilty: {r.biltyNumber}</span>
                      {r.biltyImage && (
                        <a
                          href={r.biltyImage}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30 rounded hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          View
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500">
                    <span>
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {formatDate(r.date)}
                    </span>
                    <span>Qty: {r.billingQty ?? "-"}</span>
                    <span>PO: {r.poQty ?? "-"}</span>
                    <span>Bill: {r.billNo}</span>
                    <span>Bilty: {r.hasBilty}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden md:block overflow-x-auto scrollbar-thin scrollbar-track-slate-100 dark:scrollbar-track-white/5 scrollbar-thumb-slate-300 dark:scrollbar-thumb-white/10">
            <Table className="min-w-max">
              <TableHeader className="sticky top-0 z-30 shadow-sm">
                <TableRow className="border-b border-border bg-[#F1F5F9] dark:bg-white/5 hover:bg-[#F1F5F9] dark:hover:bg-white/5">
                  {[
                    "Action",
                    "Lift ID",
                    "Indent",
                    "Fullkitting Done",
                    "Firm",
                    "System",
                    "Party / Vendor",
                    "Product",
                    "PO Qty",
                    "Transporter",
                    "Truck No.",
                    "Bilty No.",
                    "Has Bilty",
                    "Freight Amt",
                    "Billing Qty",
                    "Type Of Rate",
                    "Per MT Rate",
                    "Truck Bill Qty",
                    "Material Rate",
                    "Area",
                    "Lead Days",
                    "Driver No.",
                    "Bill No.",
                    "Fullkitting Remarks",
                    "Transporter Bill Image",
                    "Bill Image",
                    "Bilty Image",
                  ].map((h, i) => (
                    <TableHead
                      key={h}
                      className={cn(
                        "h-12 px-4 text-[12px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap",
                        i === 0 &&
                          "left-0 bg-[#F1F5F9] dark:bg-slate-900 z-10 shadow-[4px_0_6px_-4px_rgba(0,0,0,0.05)]",
                        h === "Freight Amt" && "text-right",
                      )}
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedHistory.map((group, idx) => {
                  const r = group.parent;
                  return (
                    <TableRow
                      key={group.key}
                      className={cn(
                        "border-b border-border hover:bg-[#F1F5F9] dark:hover:bg-white/5 zebra-row transition-colors duration-150",
                        idx % 2 === 0 ? "bg-card" : "bg-slate-50/30 dark:bg-white/2",
                      )}
                    >
                      <TableCell className="py-3 left-0 bg-card z-20 shadow-[4px_0_6px_-4px_rgba(0,0,0,0.05)] text-center sticky border-r border-border">
                        <Button
                          onClick={() => openDetailModal(group)}
                          size="sm"
                          className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                        >
                          Action
                        </Button>
                      </TableCell>
                      <TableCell className="py-3">
                        <div
                          className="font-mono font-bold text-[13px] text-slate-800 dark:text-slate-200 truncate max-w-[150px]"
                          title={r.liftId}
                        >
                          {group.isGrouped ? (
                            <span>
                              {group.children[0].liftId}{" "}
                              <span className="text-slate-400 dark:text-slate-500 font-normal">
                                (+{group.children.length - 1} more)
                              </span>
                            </span>
                          ) : (
                            r.liftId
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div
                          className="font-mono text-[13px] text-muted-foreground truncate max-w-[150px]"
                          title={r.indentNo}
                        >
                          {group.isGrouped ? (
                            <span>
                              {group.children[0].indentNo || "-"}{" "}
                              {group.children.length > 1 && (
                                <span className="text-slate-400 dark:text-slate-500 font-normal">
                                  (+{group.children.length - 1} more)
                                </span>
                              )}
                            </span>
                          ) : (
                            r.indentNo
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-[13px] text-muted-foreground whitespace-nowrap">
                        {formatDate(r.date)}
                      </TableCell>
                      <TableCell className="py-3">
                        {r.firmName ? (
                          <div
                            className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 border border-border text-foreground font-semibold text-[12px] truncate max-w-[150px]"
                            title={r.firmName}
                          >
                            {r.firmName}
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        {r.systemName ? (
                          <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-semibold text-[12px] whitespace-nowrap">
                            {r.systemName}
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        <div
                          className="text-[13px] font-medium text-foreground truncate max-w-[160px]"
                          title={r.partyName}
                        >
                          {r.partyName || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div
                          className="text-[13px] text-muted-foreground truncate max-w-[180px]"
                          title={r.productName}
                        >
                          {r.productName || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <span className="text-[13px] text-muted-foreground">
                          {r.poQty ?? "-"}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <div
                          className="text-[13px] text-muted-foreground truncate max-w-[150px] flex items-center gap-1.5"
                          title={r.transporterName}
                        >
                          <span>{r.transporterName}</span>
                          {group.isGrouped && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold text-[10px]" title={`${group.children.length} items grouped`}>
                              ({group.children.length})
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div
                          className="font-mono text-[13px] text-muted-foreground truncate max-w-[150px]"
                          title={r.vehicleNumber}
                        >
                          {group.isGrouped ? (
                            <span>
                              {group.children[0].vehicleNumber || "-"}{" "}
                              {group.children.length > 1 && (
                                <span className="text-slate-400 dark:text-slate-500 font-normal">
                                  (+{group.children.length - 1} more)
                                </span>
                              )}
                            </span>
                          ) : (
                            r.vehicleNumber
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div
                          className="font-mono text-[13px] text-muted-foreground truncate max-w-[150px]"
                          title={r.biltyNumber}
                        >
                          {group.isGrouped ? (
                            <span>
                              {group.children[0].biltyNumber || "-"}{" "}
                              {group.children.length > 1 && (
                                <span className="text-slate-400 dark:text-slate-500 font-normal">
                                  (+{group.children.length - 1} more)
                                </span>
                              )}
                            </span>
                          ) : (
                            r.biltyNumber
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-bold",
                            r.hasBilty === "Yes"
                              ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                              : "bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800",
                          )}
                        >
                          {r.hasBilty}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <span className="font-bold text-[13px] text-foreground">
                          {formatCurrency(r.freightAmount)}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <span className="text-[13px] text-muted-foreground">
                          {r.billingQty ?? "-"}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-[13px] text-muted-foreground whitespace-nowrap">
                          {r.typeOfRate}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <span className="text-[13px] text-muted-foreground">
                          {r.transportingPerMtRate ?? "-"}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <span className="text-[13px] text-muted-foreground">
                          {r.totalTruckBillingQty ?? "-"}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <span className="text-[13px] text-muted-foreground">
                          {r.materialRate ?? "-"}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-[13px] text-muted-foreground whitespace-nowrap">
                          {r.areaLifting}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <span className="text-[13px] text-muted-foreground">
                          {r.leadTimeDays ?? "-"}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="font-mono text-[13px] text-muted-foreground">
                          {r.driverNo}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <div
                          className="font-mono text-[13px] text-muted-foreground truncate max-w-[150px]"
                          title={r.billNo}
                        >
                          {group.isGrouped ? (
                            <span>
                              {group.children[0].billNo || "-"}{" "}
                              {group.children.length > 1 && (
                                <span className="text-slate-400 dark:text-slate-500 font-normal">
                                  (+{group.children.length - 1} more)
                                </span>
                              )}
                            </span>
                          ) : (
                            r.billNo
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div
                          className="font-mono text-[13px] text-muted-foreground truncate max-w-[150px]"
                          title={r.fullkittingRemarks}
                        >
                          {group.isGrouped ? (
                            <span>
                              {group.children[0].fullkittingRemarks || "-"}{" "}
                              {group.children.length > 1 && (
                                <span className="text-slate-400 font-normal">
                                </span>
                              )}
                            </span>
                          ) : (
                            r.fullkittingRemarks
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        {r.transporterBillImage ? (
                          <a
                            href={r.transporterBillImage}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2 py-1 text-[12px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors whitespace-nowrap"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            View
                          </a>
                        ) : (
                          <span className="text-[13px] text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        {r.billImage ? (
                          <a
                            href={r.billImage}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2 py-1 text-[12px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors whitespace-nowrap"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            View
                          </a>
                        ) : (
                          <span className="text-slate-300 text-[12px]">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        {r.biltyImage ? (
                          <a
                            href={r.biltyImage}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2 py-1 text-[12px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors whitespace-nowrap"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            View
                          </a>
                        ) : (
                          <span className="text-slate-300 text-[12px]">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="px-4 py-2.5 border-t border-border bg-slate-50/30 dark:bg-white/2 text-[12px] text-muted-foreground flex justify-between items-center">
            <div className="flex items-center gap-1">
              <IndianRupee className="w-3 h-3" />
              Total Freight:{" "}
              <span className="font-semibold text-foreground ml-1">
                {formatCurrency(
                  filtered.reduce((s, r) => s + (r.freightAmount ?? 0), 0),
                )}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <span>Synced from Purchase FMS + Order FMS</span>
            </div>
          </div>

          {/* Group Details Dialog Popup */}
          <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
            <DialogContent className="w-[94vw] sm:max-w-[960px] max-h-[85vh] overflow-y-auto bg-card border border-border rounded-xl shadow-lg p-6">
              <DialogHeader className="border-b border-border pb-4 mb-4">
                <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-slate-200">
                  <PackageCheck className="w-5 h-5 text-blue-600" />
                  Kitting Group Details
                </DialogTitle>
              </DialogHeader>

              {selectedGroup && (
                <div className="space-y-6">
                  {/* Group Overview Card */}
                  <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 border border-blue-100/50 dark:border-blue-900/30 rounded-xl p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Transporter</span>
                        <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedGroup.parent.transporterName}</p>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Bilty Number</span>
                        <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedGroup.parent.biltyNumber}</p>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Freight Amount</span>
                        <p className="text-[14px] font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{formatCurrency(selectedGroup.parent.freightAmount)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Group's Shipments Table */}
                  <div>
                    <h4 className="font-bold text-sm text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-blue-600" />
                      Shipments in Group ({selectedGroup.children.length})
                    </h4>
                    <div className="rounded-xl border border-border bg-card overflow-hidden max-h-[300px] overflow-y-auto scrollbar-thin">
                      <Table className="min-w-max">
                        <TableHeader className="bg-slate-50 sticky top-0 z-10">
                          <TableRow className="border-b border-[#E2E8F0]">
                            <TableHead className="w-10 text-center"><Checkbox checked={selectedModalItems.size === selectedGroup.children.length && selectedGroup.children.length > 0} onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedModalItems(new Set(selectedGroup.children.map(getRowUniqueId)));
                              } else {
                                setSelectedModalItems(new Set());
                              }
                            }} /></TableHead>
                            <TableHead className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Lift ID</TableHead>
                            <TableHead className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Indent No</TableHead>
                            <TableHead className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Date</TableHead>
                            <TableHead className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Firm</TableHead>
                            <TableHead className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Party / Vendor</TableHead>
                            <TableHead className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Product</TableHead>
                            <TableHead className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider text-right">Freight Amt</TableHead>
                            <TableHead className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider text-center">Billing Qty</TableHead>
                            <TableHead className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider text-center">Has Bilty</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedGroup.children.map((child, cIdx) => {
                            const uId = getRowUniqueId(child);
                            return (
                              <TableRow key={`${child.liftId}-${cIdx}`} className="border-b border-[#E2E8F0] hover:bg-slate-50/50">
                                <TableCell className="text-center py-2.5">
                                  <Checkbox 
                                    checked={selectedModalItems.has(uId)} 
                                    onCheckedChange={(checked) => {
                                      setSelectedModalItems(prev => {
                                        const next = new Set(prev);
                                        if (checked) next.add(uId);
                                        else next.delete(uId);
                                        return next;
                                      });
                                    }} 
                                  />
                                </TableCell>
                                <TableCell className="py-2.5 font-mono text-[12px] font-bold text-slate-800">{child.liftId}</TableCell>
                                <TableCell className="py-2.5 font-mono text-[12px] text-[#64748B]">{child.indentNo}</TableCell>
                                <TableCell className="py-2.5 text-[12px] text-[#64748B]">{formatDate(child.date)}</TableCell>
                                <TableCell className="py-2.5">
                                  {child.firmName ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 border border-border text-foreground font-semibold text-[11px]">
                                      {child.firmName}
                                    </span>
                                  ) : "-"}
                                </TableCell>
                                <TableCell className="py-2.5 text-[12px] text-foreground max-w-[150px] truncate" title={child.partyName}>{child.partyName}</TableCell>
                                <TableCell className="py-2.5 text-[12px] text-muted-foreground max-w-[150px] truncate" title={child.productName}>{child.productName}</TableCell>
                                <TableCell className="py-2.5 text-right font-bold text-[12px] text-slate-800 dark:text-slate-200">{formatCurrency(child.freightAmount)}</TableCell>
                                <TableCell className="py-2.5 text-center text-[12px] text-muted-foreground">{child.billingQty ?? "-"}</TableCell>
                                <TableCell className="py-2.5 text-center">
                                  <span className={cn(
                                    "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-bold",
                                    child.hasBilty === "Yes" ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" : "bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                                  )}>
                                    {child.hasBilty}
                                  </span>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter className="mt-6 border-t border-border pt-4 flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedGroup(null);
                  }}
                  className="text-xs font-semibold h-9"
                >
                  Cancel
                </Button>
                {selectedGroup && (
                  <Button
                    onClick={() => processGroup(selectedGroup)}
                    disabled={isProcessingGroup}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-9 px-4"
                  >
                    {isProcessingGroup && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                    Submit Group
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
