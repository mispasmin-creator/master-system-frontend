import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

import { format } from "date-fns";

export const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const toDateInput = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  if (typeof value === "string") {
    const ddmmyy = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
    if (ddmmyy) {
      const [, dd, mm, yy] = ddmmyy;
      const year = yy.length === 2 ? `20${yy}` : yy;
      return `${year}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : format(date, "yyyy-MM-dd");
};

export const toDisplayDate = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string" && value.includes("/")) return value;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : format(date, "dd/MM/yy");
};

export const toDisplayTimestamp = (value: unknown): string => {
  if (!value) return "";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : format(date, "dd/MM/yy HH:mm:ss");
};

// Backend rows are raw Prisma objects (ProductionSemiOrder / ProductionSemiJobCard /
// ProductionSemiActualRun — see master-system-backend/prisma/schema.prisma), not the old
// Supabase sheet rows. _rowIndex carries the real string id (used for PATCH/DELETE calls
// and as a React key) — it is NOT a numeric row position anymore.
export const mapSemiProduction = (row: any) => ({
  _rowIndex: row.id,
  timestamp: toDisplayTimestamp(row.createdAt),
  sfSrNo: String(row.id || ""),
  nameOfSemiFinished: String(row.semiGoodName || ""),
  qty: toNumber(row.qtyPlanned),
  notes: String(row.notes || ""),
  totalPlanned: toNumber(row.qtyPlanned),
  totalMade: toNumber(row.totalMade),
  pending: row.pending === null || row.pending === undefined ? toNumber(row.qtyPlanned) : toNumber(row.pending),
  cancelOrder: row.cancelled ? "1" : "0",
  status: String(row.status || ""),
  planned: toDisplayDate(row.createdAt),
  actual: toDisplayDate(row.updatedAt),
  firmName: String(row.firmName || ""),
  reason: String(row.notes || ""),
});

export const mapSemiJobCard = (row: any) => ({
  _rowIndex: row.id,
  timestamp: toDisplayTimestamp(row.createdAt),
  sjcSrNo: String(row.id || ""),
  sfSrNo: String(row.semiOrderId || ""),
  supervisorName: String(row.supervisorName || ""),
  productName: String(row.semiOrder?.semiGoodName || ""),
  qty: toNumber(row.qty),
  dateOfProduction: toDisplayDate(row.dateOfProduction),
  planned: toDisplayDate(row.createdAt),
  actual: toDisplayDate(row.updatedAt),
  actualMade: toNumber(row.actualMade),
  pending: toNumber(row.pending ?? row.qty),
  status: String(row.status || ""),
});

export const mapSemiActual = (row: any) => {
  const mats = Array.isArray(row.materials) ? row.materials : [];
  const mat = (i: number) => mats[i - 1] || {};
  return {
    _rowIndex: row.id,
    timestamp: toDisplayTimestamp(row.createdAt),
    semiFinishedJobCardNo: String(row.semiJobCardId || ""),
    supervisorName: String(row.semiJobCard?.supervisorName || ""),
    dateOfProduction: toDisplayDate(row.createdAt),
    productName: String(row.semiJobCard?.semiOrder?.semiGoodName || ""),
    qtyOfSemiFinishedGood: toNumber(row.qtyProduced),
    rawMaterial1Name: String(mat(1).materialName || ""),
    rawMaterial1Qty: toNumber(mat(1).quantity),
    rawMaterial1Rate: toNumber(mat(1).processingCost),
    rawMaterial2Name: String(mat(2).materialName || ""),
    rawMaterial2Qty: toNumber(mat(2).quantity),
    rawMaterial2Rate: toNumber(mat(2).processingCost),
    rawMaterial3Name: String(mat(3).materialName || ""),
    rawMaterial3Qty: toNumber(mat(3).quantity),
    rawMaterial3Rate: toNumber(mat(3).processingCost),
    rawMaterial4Name: String(mat(4).materialName || ""),
    rawMaterial4Qty: toNumber(mat(4).quantity),
    rawMaterial4Rate: toNumber(mat(4).processingCost),
    rawMaterial5Name: String(mat(5).materialName || ""),
    rawMaterial5Qty: toNumber(mat(5).quantity),
    rawMaterial5Rate: toNumber(mat(5).processingCost),
    isAnyEndProduct: row.isEndProduct ? "Yes" : "No",
    endProductRawMaterialName: String(row.endProductName || ""),
    endProductQty: toNumber(row.endProductQty),
    processingCost: mats.reduce((s: number, m: any) => s + toNumber(m.processingCost), 0),
    narration: "",
    sNo: String(row.id || ""),
    serialNo: String(row.id || ""),
    startingReading: 0,
    startingReadingPhoto: String(row.startingReadingPhoto || ""),
    endingReading: 0,
    endingReadingPhoto: String(row.endingReadingPhoto || ""),
    machineRunningHour: toNumber(row.machineHours),
    machineRunning: toNumber(row.machineHours),
    sfProductionNo: String(row.semiJobCard?.semiOrderId || ""),
    semiFinishedProductionNo: String(row.semiJobCard?.semiOrderId || ""),
    planned1: toDisplayDate(row.createdAt),
    actual1: toDisplayDate(row.createdAt),
    timeDelay1: "",
    status: String(row.status || ""),
    actualQty1: toNumber(row.qtyProduced),
    planned2: toDisplayDate(row.createdAt),
    actual2: toDisplayDate(row.updatedAt),
    timeDelay2: "",
    actualQty2: toNumber(row.endProductQty || row.qtyProduced),
    finalQty: toNumber(row.endProductQty || row.qtyProduced),
  };
};

const toCamelCaseKey = (str: string) => {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) =>
      index === 0 ? letter.toLowerCase() : letter.toUpperCase()
    )
    .replace(/\s+/g, "");
};

export const getMasterValue = (row: any, keys: string[]): string => {
  if (!row) return "";
  for (const key of keys) {
    const val1 = row[key];
    if (val1 !== null && val1 !== undefined && String(val1).trim()) return String(val1).trim();

    const camelKey = toCamelCaseKey(key);
    const val2 = row[camelKey];
    if (val2 !== null && val2 !== undefined && String(val2).trim()) return String(val2).trim();
  }
  return "";
};

export const toSupabaseDate = toDateInput;
