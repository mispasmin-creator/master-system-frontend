import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { RefreshCw, Save, X, Edit2, Image, Filter, CheckCircle, Clock, AlertCircle, ExternalLink, Search, ShieldCheck, Download } from 'lucide-react';
import { supabase } from '../supabase';
import { toast } from 'sonner';
import { AuthContext } from '../context/AuthContext';
import SuperAdminEditModal from './SuperAdminEditModal';
import { canViewFirm } from '../utils/firmFilter';
import { API_URL, getToken } from '@/lib/auth';

// Modular Component Imports
import AuditEntryModal from './audit/AuditEntryModal';
import GroupedProductsDetailsModal from './audit/GroupedProductsDetailsModal';
import AuditTab from './audit/tabs/AuditTab';
import RectifyTab from './audit/tabs/RectifyTab';
import TallyEntryTab from './audit/tabs/TallyEntryTab';
import ReAuditTab from './audit/tabs/ReAuditTab';
import BillEntryTab from './audit/tabs/BillEntryTab';
import HistoryTab from './audit/tabs/HistoryTab';
import AllStagesTab from './audit/tabs/AllStagesTab';

const CallTrackerPage = () => {
  const location = useLocation();
  const { user, isSuperAdmin } = useContext(AuthContext);
  const [superAdminEditRow, setSuperAdminEditRow] = useState(null);
  const [accountsData, setAccountsData] = useState([]);
  const [auditMismatchData, setAuditMismatchData] = useState([]); 
  const [tallyEntryMismatchData, setTallyEntryMismatchData] = useState([]); 
  const [billEntryMismatchData, setBillEntryMismatchData] = useState([]); 
  const [rectifyMismatchData, setRectifyMismatchData] = useState([]); 
  const [reAuditMismatchData, setReAuditMismatchData] = useState([]); 
  const [allMismatchData, setAllMismatchData] = useState([]); 
  const [historyData, setHistoryData] = useState([]); 
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingAudit, setLoadingAudit] = useState(true); 
  const [loadingTallyEntry, setLoadingTallyEntry] = useState(true); 
  const [loadingBillEntry, setLoadingBillEntry] = useState(true); 
  const [loadingRectify, setLoadingRectify] = useState(true); 
  const [loadingReAudit, setLoadingReAudit] = useState(true); 
  const [loadingAll, setLoadingAll] = useState(true); 
  const [liftAccountsRawData, setLiftAccountsRawData] = useState([]); 
  const [error, setError] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedRows, setSubmittedRows] = useState(new Set());
  const [firmFilter, setFirmFilter] = useState('all');

  const [visibleColumns, setVisibleColumns] = useState({
    stage: true,
    timestamp: true,
    indentNumber: true,
    firmName: true,
    poRate: true,
    liftNumber: true,
    billNo: true,
    partyName: true,
    productName: true,
    qty: true,
    areaLifting: true,
    truckNo: true,
    transporterName: true,
    transporterRate: true,
    billImage: true,
    biltyNo: true,
    typeOfRate: true,
    rate: true,
    truckQty: true,
    liftingQty: true,
    biltyImage: true,
    qtyDifferenceStatus: true,
    weightSlip: true,
    debitAmount: true,
    debitNoteUrl: true,
    totalFreight: true,
    dateOfReceiving: true,
    remarks: true,
    auditRemarks: false,
    rectifyRemarks: false,
    reauditRemarks: false,
    tallyRemarks: false,
    billRemarks: false,
    auditStatus: false,
    rectifyStatus: false,
    reAuditStatus: false,
    tallyStatus: false,
    status: false,
    actions: true
  });
  const [liftWeightSlipMap, setLiftWeightSlipMap] = useState({}); 
  const [liftTypeMap, setLiftTypeMap] = useState({}); 
  const [liftBiltyNoMap, setLiftBiltyNoMap] = useState({}); 
  const [liftBiltyImageMap, setLiftBiltyImageMap] = useState({}); 
  const [liftActualQtyMap, setLiftActualQtyMap] = useState({}); 
  const [liftDateOfReceivingMap, setLiftDateOfReceivingMap] = useState({}); 
  const [liftTransporterRateMap, setLiftTransporterRateMap] = useState({}); 
  const [liftActual2Map, setLiftActual2Map] = useState({});
  const [liftTransporterMap, setLiftTransporterMap] = useState({});
  const [liftDateOfBillMap, setLiftDateOfBillMap] = useState({});
  const [showColumnFilter, setShowColumnFilter] = useState(false);
  const [activeTab, setActiveTab] = useState('AUDIT'); 
  const [poToIndentMap, setPoToIndentMap] = useState({});
  const [poToRateMap, setPoToRateMap] = useState({});
  const [poToAluminaMap, setPoToAluminaMap] = useState({});
  const [poToIronMap, setPoToIronMap] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  // State for collapsible grouped rows in Accounts Audit tab
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [viewGroupItems, setViewGroupItems] = useState(null);
  const [editingGroupItems, setEditingGroupItems] = useState(null);

  const toggleGroup = (groupKey) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  useEffect(() => {
    const fetchPOMapping = async () => {
      try {
        const { data, error } = await supabase
          .from("INDENT-PO")
          .select('po_number, "Indent Id.", Rate, "Alumina %", "Iron %"');
        
        if (!error && data) {
          const indentMap = {};
          const rateMap = {};
          const aluminaMap = {};
          const ironMap = {};
          data.forEach(row => {
            const rawPo = String(row.po_number || "").trim().toUpperCase();
            const rawIndent = String(row["Indent Id."] || "").trim().toUpperCase();

            if (rawPo) {
              indentMap[rawPo] = row["Indent Id."];
              rateMap[rawPo] = row["Rate"];
              aluminaMap[rawPo] = row["Alumina %"];
              ironMap[rawPo] = row["Iron %"];
              
              const parts = rawPo.split('/');
              if (parts.length > 1) {
                const normalizedPo = parts.slice(1).join('/');
                if (!indentMap[normalizedPo]) {
                  indentMap[normalizedPo] = row["Indent Id."];
                  rateMap[normalizedPo] = row["Rate"];
                  aluminaMap[normalizedPo] = row["Alumina %"];
                  ironMap[normalizedPo] = row["Iron %"];
                }
              }
            }
            
            if (rawIndent) {
              rateMap[rawIndent] = row["Rate"];
              aluminaMap[rawIndent] = row["Alumina %"];
              ironMap[rawIndent] = row["Iron %"];
            }
          });
          setPoToIndentMap(indentMap);
          setPoToRateMap(rateMap);
          setPoToAluminaMap(aluminaMap);
          setPoToIronMap(ironMap);
        }
      } catch (err) {
        console.error("Error fetching PO mapping:", err);
      }
    };
    fetchPOMapping();
  }, []);

  const SHEET_ID = "13_sHCFkVxAzPbel-k9BuUBFY-E11vdKJAOgvzhBMLMY";
  const SHEET_NAME = "ACCOUNTS";

  const STAGES = {
    AUDIT: {
      name: 'Audit',
      color: 'bg-yellow-100 text-yellow-800 dark:bg-amber-500/10 dark:text-amber-400',
      icon: CheckCircle,
      description: 'Initial audit verification'
    },
    RECTIFY: {
      name: 'Rectify',
      color: 'bg-green-100 text-green-800 dark:bg-emerald-500/10 dark:text-emerald-400',
      icon: AlertCircle,
      description: 'Correct mistakes and add bilty'
    },
    RECTIFY_2: {
      name: 'Rectify 2',
      color: 'bg-cyan-100 text-cyan-800 dark:bg-sky-500/10 dark:text-sky-400',
      icon: AlertCircle,
      description: 'Second round of corrections'
    },
    TALLY_ENTRY: {
      name: 'Tally Entry',
      color: 'bg-green-100 text-green-800 dark:bg-emerald-500/10 dark:text-emerald-400',
      icon: Clock,
      description: 'Enter data into tally system'
    },
    REAUDIT: {
      name: 'Re-Audit',
      color: 'bg-orange-100 text-orange-800 dark:bg-orange-500/10 dark:text-orange-400',
      icon: RefreshCw,
      description: 'Re-audit after corrections'
    },
    BILL_ENTRY: {
      name: 'Bill Received',
      color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400',
      icon: Save,
      description: 'Enter original bills'
    },
    COMPLETED: {
      name: 'Completed',
      color: 'bg-green-100 text-green-800 dark:bg-emerald-500/10 dark:text-emerald-400',
      icon: CheckCircle,
      description: 'All stages completed'
    }
  };

  const TAB_ORDER = ['AUDIT', 'RECTIFY', 'REAUDIT', 'TALLY_ENTRY', 'BILL_ENTRY'];

  const formatDate = (dateString) => {
    if (!dateString || dateString === '') return '-';

    try {
      let date;

      const dateMatch = dateString.match(/^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)$/);
      if (dateMatch) {
        const [, year, month, day, hours, minutes, seconds] = dateMatch.map(Number);
        date = new Date(year, month - 1, day, hours || 0, minutes || 0, seconds || 0);
      }
      else if (!isNaN(dateString) && parseFloat(dateString) > 30000) {
        const serialNumber = parseFloat(dateString);
        date = new Date((serialNumber - 25569) * 86400 * 1000);
      }
      else if (dateString.includes('/') || dateString.includes('-')) {
        date = new Date(dateString);
      }
      else {
        date = new Date(dateString);
      }

      if (isNaN(date.getTime())) {
        return dateString;
      }

      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');

      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

    } catch (error) {
      console.error('Date formatting error:', error);
      return dateString;
    }
  };

  const getCellValue = (row, colIndex) => {
    const cell = row.c?.[colIndex];
    if (!cell) return null;
    if (cell.v !== undefined && cell.v !== null) return String(cell.v).trim();
    return null;
  };

  const calculateDelayDays = (timestampString) => {
    if (!timestampString || timestampString === '' || timestampString === '-') return 0;

    try {
      let originalDate;

      if (!isNaN(timestampString) && parseFloat(timestampString) > 30000) {
        const serialNumber = parseFloat(timestampString);
        originalDate = new Date((serialNumber - 25569) * 86400 * 1000);
      } else if (timestampString.includes('/') || timestampString.includes('-')) {
        originalDate = new Date(timestampString);
      } else {
        originalDate = new Date(timestampString);
      }

      if (isNaN(originalDate.getTime())) {
        return 0;
      }

      const currentDate = new Date();
      const timeDifference = currentDate.getTime() - originalDate.getTime();
      const daysDifference = Math.floor(timeDifference / (1000 * 3600 * 24));

      return Math.max(0, daysDifference);

    } catch (error) {
      console.error('Error calculating delay:', error);
      return 0;
    }
  };

  const determineStage = (row) => {
    const rectifyActual = getCellValue(row, 21);
    const rectify2Planned = getCellValue(row, 30);
    const rectify2Actual = getCellValue(row, 31);
    const tallyPlanned = getCellValue(row, 35);
    const tallyActual = getCellValue(row, 36);
    const auditPlanned = getCellValue(row, 25);
    const auditActual = getCellValue(row, 26);
    const reauditPlanned = getCellValue(row, 40);
    const reauditActual = getCellValue(row, 41);
    const billEntryPlanned = getCellValue(row, 45);
    const billEntryActual = getCellValue(row, 46);

    if (rectifyActual && rectify2Actual && tallyActual && auditActual && reauditActual && billEntryActual) {
      return 'COMPLETED';
    }

    if (billEntryPlanned && billEntryPlanned !== '' && (!billEntryActual || billEntryActual === '')) {
      return 'BILL_ENTRY';
    }

    if (reauditPlanned && reauditPlanned !== '' && (!reauditActual || reauditActual === '')) {
      return 'REAUDIT';
    }

    if (auditPlanned && auditPlanned !== '' && (!auditActual || auditActual === '')) {
      return 'AUDIT';
    }

    if (tallyPlanned && tallyPlanned !== '' && (!tallyActual || tallyActual === '')) {
      return 'TALLY_ENTRY';
    }

    if (rectify2Planned && rectify2Planned !== '' && (!rectify2Actual || rectify2Actual === '')) {
      return 'RECTIFY_2';
    }

    if (!rectifyActual || rectifyActual === '') {
      return 'RECTIFY';
    }

    return 'COMPLETED';
  };

  const getStageConfig = (stage) => {
    switch (stage) {
      case 'RECTIFY':
        return {
          type: 'rectify',
          includeDelay: true,
          statusOptions: ['Done']
        };
      case 'RECTIFY_2':
        return {
          type: 'rectify-mistake-2',
          includeDelay: true,
          statusOptions: ['Done', 'Not Done']
        };
      case 'TALLY_ENTRY':
        return {
          type: 'take-entry-tally',
          includeDelay: false,
          statusOptions: ['Done', 'Not Done']
        };
      case 'AUDIT':
        return {
          type: 'audit-data',
          includeDelay: false,
          statusOptions: ['Done', 'Not Done']
        };
      case 'REAUDIT':
        return {
          type: 'again-auditing',
          includeDelay: true,
          statusOptions: ['Done']
        };
      case 'BILL_ENTRY':
        return {
          type: 'original-bills',
          includeDelay: true,
          statusOptions: ['Done', 'Not Done']
        };
      default:
        return null;
    }
  };

  const initializeFormData = (stage) => {
    setFormData({
      stage: stage,
      status: getDefaultStatusForStage(stage),
      remarks: ''
    });
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getDefaultStatusForStage = (stage) => (
    ['RECTIFY', 'REAUDIT', 'RE_AUDIT'].includes(stage) ? 'Done' : 'Not Done'
  );

  const getAuditNextStagePayload = (actualDateTime) => (
    formData.status === 'Done'
      ? { Planned4: actualDateTime }
      : { Planned3: actualDateTime }
  );

  const getRectifyNextStagePayload = (actualDateTime) => ({
    Planned5: actualDateTime
  });

  const getReAuditNextStagePayload = (actualDateTime) => ({
    Planned4: actualDateTime
  });

  const filterRowsByUserFirm = (rows) => {
    if (!user?.firmName) return rows;
    return rows.filter((entry) => canViewFirm(user.firmName, entry.firmName));
  };

  const isAuditNotDone = (row) => String(row.Status2 || '').trim().toLowerCase() === 'not done';
  const isAuditDone = (row) => String(row.Status2 || '').trim().toLowerCase() === 'done';
  const isReAuditDone = (row) => String(row.Status5 || '').trim().toLowerCase() === 'done';
  const hasBiltyDetails = (row, liftNo) => {
    const actualLiftNo = (typeof liftNo === 'string') ? liftNo : null;
    const normalizedLiftNo = String(actualLiftNo || row["Lift ID"] || row["Lift Number"] || row["Lift No"] || "").trim();
    const transporter = String(row["Transporter Name"] || liftTransporterMap[normalizedLiftNo] || "").trim().toUpperCase();
    const isBypassed = transporter === "FOR" || transporter === "OWNED TRUCK" || transporter === "BY COMPANY";
    if (isBypassed) {
      const labCompleted = String(row["Actual 2"] || liftActual2Map[normalizedLiftNo] || "").trim();
      return Boolean(labCompleted);
    }
    const biltyNo = String(row["Bilty No."] || row["Bilty No"] || liftBiltyNoMap[normalizedLiftNo] || "").trim();
    const biltyImage = String(row["Bilty Image"] || liftBiltyImageMap[normalizedLiftNo] || "").trim();
    return Boolean(biltyNo && biltyImage);
  };
  const getLiftKey = (row) => String(row["Lift ID"] || row["Lift Number"] || row["Lift No"] || "").trim();
  const getLiftTransporterRate = (row) => liftTransporterRateMap[getLiftKey(row)] || "";
  const getTotalFreightValue = (row) => row["Total Freight"] || getLiftTransporterRate(row) || "";
  const getQtyDifferenceStatus = (row) => {
    const materialQty = parseFloat(row["Truck Qty"] || 0);
    const truckQty = parseFloat(liftActualQtyMap[String(row["Lift ID"] || "").trim()] || row["Lifting Qty"] || 0);
    return (truckQty - materialQty).toFixed(3);
  };
  const shouldShowInTallyEntry = (row) => (
    hasBiltyDetails(row) && !row.Actual4 && (row.Planned4 || (row.Actual2 && isAuditDone(row)) || (row.Actual5 && isReAuditDone(row)))
  );

  const submitFormData = async () => {
    const STAGE_TO_KEY = {
      AUDIT: 'audit',
      RECTIFY: 'rectify',
      REAUDIT: 'reaudit',
      RE_AUDIT: 'reaudit',
      TALLY_ENTRY: 'tally-entry',
      BILL_ENTRY: 'bill-entry',
    };

    const submitOne = async (item) => {
      const stage = item.currentStage === 'ALL' ? (item.currentStage || 'AUDIT') : item.currentStage;
      const stageKey = STAGE_TO_KEY[stage];
      const targetId = item.isNewFromLift ? item.id : item.supabaseId;
      if (!stageKey || targetId == null) {
        throw new Error(`Cannot determine target for ${item.liftNumber || item.id}`);
      }
      const res = await fetch(`${API_URL}/purchase/accounts-audit/${stageKey}/submit/${targetId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ status: formData.status || 'Done', remarks: formData.remarks || '' }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to submit');
    };

    if (editingGroupItems && editingGroupItems.length > 0) {
      setSubmitting(true);
      try {
        await Promise.all(editingGroupItems.map((item) => submitOne(item)));

        setSubmittedRows((prev) => {
          const next = new Set(prev);
          editingGroupItems.forEach((item) => next.add(item.id));
          return next;
        });

        setEditingRow(null);
        setEditingGroupItems(null);
        toast.success(`✅ SUCCESS: Group mismatch data submitted for ${editingGroupItems.length} products`);

        setTimeout(() => {
          fetchAllAccountsAuditData();
        }, 500);
      } catch (error) {
        console.error('Group submission error:', error);
        toast.error(`❌ GROUP SUBMISSION FAILED: ${error.message}`);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!editingRow) return;

    const row =
      auditMismatchData.find((r) => r.id === editingRow) ||
      rectifyMismatchData.find((r) => r.id === editingRow) ||
      reAuditMismatchData.find((r) => r.id === editingRow) ||
      tallyEntryMismatchData.find((r) => r.id === editingRow) ||
      billEntryMismatchData.find((r) => r.id === editingRow) ||
      allMismatchData.find((r) => r.id === editingRow);

    if (!row) {
      toast.error('Could not find this row — please refresh and try again.');
      return;
    }

    setSubmitting(true);
    try {
      await submitOne(row);

      setSubmittedRows((prev) => new Set([...prev, editingRow]));
      setEditingRow(null);

      const now = new Date();
      const formattedDateTime = now.toLocaleString('en-GB', { hour12: false }).replace(',', '');
      toast.success(`✅ SUCCESS: Mismatch data submitted for: ${row.liftNumber} Submitted at: ${formattedDateTime}`);

      setTimeout(() => {
        fetchAllAccountsAuditData();
      }, 500);
    } catch (error) {
      console.error('Submission error:', error);
      toast.error(`❌ SUBMISSION FAILED: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}&cb=${new Date().getTime()}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch sheet data: ${response.status} ${response.statusText}`);
      }

      let text = await response.text();
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("Invalid response format from Google Sheets.");
      }

      const data = JSON.parse(text.substring(jsonStart, jsonEnd + 1));

      if (!data.table || !data.table.rows) {
        setAccountsData([]);
        return;
      }

      let parsedData = data.table.rows.map((row, index) => {
        if (!row || !row.c) return null;

        const firstCellValue = getCellValue(row, 0);
        const secondCellValue = getCellValue(row, 1);

        if (firstCellValue === 'Timestamp' ||
          firstCellValue === 'Rectify The Mistake & Bilty Add' ||
          secondCellValue === 'Lift Number' ||
          !firstCellValue || firstCellValue === '') {
          return null;
        }

        const liftNumber = getCellValue(row, 1) || '';

        const rowData = {
          id: index,
          timestamp: formatDate(getCellValue(row, 0)) || '',
          liftNumber,
          type: getCellValue(row, 2) || '',
          billNo: getCellValue(row, 3) || '',
          partyName: getCellValue(row, 4) || '',
          productName: getCellValue(row, 5) || '',
          qty: getCellValue(row, 6) || '',
          areaLifting: getCellValue(row, 7) || '',
          truckNo: getCellValue(row, 8) || '',
          transporterName: getCellValue(row, 9) || '',
          billImage: getCellValue(row, 10) || '',
          biltyNo: getCellValue(row, 11) || '',
          typeOfRate: getCellValue(row, 12) || '',
          rate: getCellValue(row, 13) || '',
          truckQty: getCellValue(row, 14) || '',
          biltyImage: getCellValue(row, 15) || '',
          qtyDifferenceStatus: getCellValue(row, 16) || '',
          differenceQty: getCellValue(row, 17) || '',
          weightSlip: getCellValue(row, 18) || '',
          totalFreight: getCellValue(row, 19) || liftTransporterRateMap[liftNumber] || '',
          auditRemarks: getCellValue(row, 29) || '',
          rectifyRemarks: getCellValue(row, 24) || '',
          tallyRemarks: getCellValue(row, 39) || '',
          reauditRemarks: getCellValue(row, 44) || '',
          billRemarks: getCellValue(row, 49) || '',
          auditStatus: getCellValue(row, 28) || '',
          rectifyStatus: getCellValue(row, 23) || '',
          reAuditStatus: getCellValue(row, 43) || '',
          tallyStatus: getCellValue(row, 38) || '',
          rawRow: row
        };

        const hasData = Object.values(rowData).some(value =>
          value && value !== '' && value !== index && value !== row
        );

        if (!hasData) return null;

        const stage = determineStage(row);
        rowData.currentStage = stage;

        switch (stage) {
          case 'RECTIFY':
            rowData.status = getCellValue(row, 23) || '';
            rowData.remarks = getCellValue(row, 24) || '';
            break;
          case 'RECTIFY_2':
            rowData.status = getCellValue(row, 33) || '';
            rowData.remarks = getCellValue(row, 34) || '';
            break;
          case 'TALLY_ENTRY':
            rowData.status = getCellValue(row, 38) || '';
            rowData.remarks = getCellValue(row, 39) || '';
            break;
          case 'AUDIT':
            rowData.status = getCellValue(row, 28) || '';
            rowData.remarks = getCellValue(row, 29) || '';
            break;
          case 'REAUDIT':
            rowData.status = getCellValue(row, 43) || '';
            rowData.remarks = getCellValue(row, 44) || '';
            break;
          case 'BILL_ENTRY':
            rowData.status = getCellValue(row, 48) || '';
            rowData.remarks = getCellValue(row, 49) || '';
            break;
          default:
            rowData.status = '';
            rowData.remarks = '';
        }

        return rowData;
      }).filter(Boolean);

      parsedData = parsedData.filter(item => {
        if (item.currentStage === 'COMPLETED') return false;
        const submittedKey = `${item.currentStage}_${item.id}`;
        return !submittedRows.has(submittedKey);
      });

      setAccountsData(parsedData);

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchLiftAccountsMeta = async () => {
      try {
        const { data } = await supabase
          .from("LIFT-ACCOUNTS")
          .select('"Lift No", "Image Of Weight Slip", "Type", "Bilty No.", "Bilty Image", "Actual Quantity", "Date Of Receiving", "Transporter Rate", "Actual 2", "Transporter Name", "Date Of Bill"')
          .order("id", { ascending: false });
        const weightSlipMap = {};
        const typeMap = {};
        const biltyNoMap = {};
        const biltyImageMap = {};
        const actualQtyMap = {};
        const dateOfReceivingMap = {};
        const transporterRateMap = {};
        const actual2Map = {};
        const transporterMap = {};
        const dateOfBillMap = {};
        (data || []).forEach(l => {
          const key = String(l["Lift No"] || "").trim();
          if (key) {
            weightSlipMap[key] = String(l["Image Of Weight Slip"] || "").trim();
            typeMap[key] = String(l["Type"] || "").trim();
            biltyNoMap[key] = String(l["Bilty No."] || "").trim();
            biltyImageMap[key] = String(l["Bilty Image"] || "").trim();
            actualQtyMap[key] = String(l["Actual Quantity"] || "").trim();
            dateOfReceivingMap[key] = String(l["Date Of Receiving"] || "").trim();
            transporterRateMap[key] = String(l["Transporter Rate"] || "").trim();
            actual2Map[key] = String(l["Actual 2"] || "").trim();
            transporterMap[key] = String(l["Transporter Name"] || "").trim();
            dateOfBillMap[key] = String(l["Date Of Bill"] || "").trim();
          }
        });
        setLiftWeightSlipMap(weightSlipMap);
        setLiftTypeMap(typeMap);
        setLiftBiltyNoMap(biltyNoMap);
        setLiftBiltyImageMap(biltyImageMap);
        setLiftActualQtyMap(actualQtyMap);
        setLiftDateOfReceivingMap(dateOfReceivingMap);
        setLiftTransporterRateMap(transporterRateMap);
        setLiftActual2Map(actual2Map);
        setLiftTransporterMap(transporterMap);
        setLiftDateOfBillMap(dateOfBillMap);
      } catch (e) {
        console.error('Failed to fetch LIFT-ACCOUNTS meta:', e);
      }
    };
    fetchLiftAccountsMeta();
  }, []);

  // Single unified fetch backing all 6 Accounts Audit stage tabs — the
  // backend (accountsAudit.controller.js) already buckets every mismatch
  // (and any lift that never triggered one but is ready to be audited) into
  // the right pending/history list per stage, mirroring the reference's
  // Planned/Actual chain via each stage's row-existence in the new schema.
  const fetchAllAccountsAuditData = async () => {
    setLoadingAudit(true);
    setLoadingRectify(true);
    setLoadingReAudit(true);
    setLoadingTallyEntry(true);
    setLoadingBillEntry(true);
    setLoadingAll(true);
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_URL}/purchase/accounts-audit/data`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to load accounts audit data');

      const tagAndFilter = (rows, stagePrefix) =>
        filterRowsByUserFirm(
          rows
            .map((r) => ({ ...r, id: r.isNewFromLift ? r.id : `${stagePrefix}_${r.id}` }))
            .filter((r) => !submittedRows.has(r.id))
        );

      const audit = tagAndFilter(json.data.audit, 'audit');
      const rectify = tagAndFilter(json.data.rectify, 'rectify');
      const reaudit = tagAndFilter(json.data.reaudit, 're_audit');
      const tallyEntry = tagAndFilter(json.data.tallyEntry, 'tally');
      const billEntry = tagAndFilter(json.data.billEntry, 'bill');
      const history = filterRowsByUserFirm(json.data.history.map((r) => ({ ...r, id: `history_${r.id}` })));

      setAuditMismatchData(audit);
      setRectifyMismatchData(rectify);
      setReAuditMismatchData(reaudit);
      setTallyEntryMismatchData(tallyEntry);
      setBillEntryMismatchData(billEntry);
      setHistoryData(history);

      const seenAll = new Set();
      setAllMismatchData(
        [...audit, ...rectify, ...reaudit, ...tallyEntry, ...billEntry].filter((item) => {
          if (seenAll.has(item.supabaseId)) return false;
          seenAll.add(item.supabaseId);
          return true;
        })
      );
    } catch (err) {
      console.error('Error fetching accounts audit data:', err);
    } finally {
      setLoadingAudit(false);
      setLoadingRectify(false);
      setLoadingReAudit(false);
      setLoadingTallyEntry(false);
      setLoadingBillEntry(false);
      setLoadingAll(false);
      setLoadingHistory(false);
    }
  };


  useEffect(() => {
    fetchData();
    fetchAllAccountsAuditData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (location.state?.returnToTab === 'REAUDIT' && !loadingReAudit && reAuditMismatchData.length > 0) {
      setActiveTab('REAUDIT');
      if (location.state.openRowId) {
        const targetRow = reAuditMismatchData.find(r => r.supabaseId === location.state.openRowId || r.id === location.state.openRowId || r.id === `mismatch_reaudit_${location.state.openRowId}`);
        if (targetRow) {
          setEditingRow(targetRow.id);
          window.history.replaceState({}, document.title);
        }
      } else {
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, loadingReAudit, reAuditMismatchData]);

  useEffect(() => {
    setVisibleColumns(prev => {
      const updated = {
        ...prev,
        remarks: false,
        auditRemarks: false,
        rectifyRemarks: false,
        reauditRemarks: false,
        tallyRemarks: false,
        billRemarks: false,
        auditStatus: false,
        rectifyStatus: false,
        reAuditStatus: false,
        tallyStatus: false
      };

      if (activeTab === 'AUDIT') {
        updated.remarks = true;
      } else if (activeTab === 'RECTIFY') {
        updated.auditRemarks = true;
        updated.auditStatus = true;
      } else if (activeTab === 'REAUDIT') {
        updated.auditRemarks = true;
        updated.rectifyRemarks = true;
        updated.auditStatus = true;
        updated.rectifyStatus = true;
      } else if (activeTab === 'TALLY_ENTRY') {
        updated.auditRemarks = true;
        updated.rectifyRemarks = true;
        updated.reauditRemarks = true;
        updated.auditStatus = true;
        updated.rectifyStatus = true;
        updated.reAuditStatus = true;
      } else if (activeTab === 'BILL_ENTRY') {
        updated.auditRemarks = true;
        updated.rectifyRemarks = true;
        updated.reauditRemarks = true;
        updated.tallyRemarks = true;
        updated.auditStatus = true;
        updated.rectifyStatus = true;
        updated.reAuditStatus = true;
        updated.tallyStatus = true;
      } else if (activeTab === 'ALL' || activeTab === 'HISTORY') {
        updated.auditRemarks = true;
        updated.rectifyRemarks = true;
        updated.reauditRemarks = true;
        updated.tallyRemarks = true;
        updated.billRemarks = true;
        updated.auditStatus = true;
        updated.rectifyStatus = true;
        updated.reAuditStatus = true;
        updated.tallyStatus = true;
      }

      return updated;
    });
  }, [activeTab]);

  const toggleColumnVisibility = (columnKey) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  };

  const toggleColumnFilter = () => {
    setShowColumnFilter(prev => !prev);
  };

  const uniqueFirms = useMemo(() => {
    const allData = [
      ...auditMismatchData,
      ...rectifyMismatchData,
      ...tallyEntryMismatchData,
      ...reAuditMismatchData,
      ...billEntryMismatchData,
      ...accountsData,
      ...historyData
    ];
    const firms = [...new Set(allData.map(item => item.firmName).filter(Boolean))];
    return firms.sort();
  }, [auditMismatchData, rectifyMismatchData, tallyEntryMismatchData, reAuditMismatchData, billEntryMismatchData, accountsData, historyData]);

  const getAllStagesData = () => {
    const combinedData = [
      ...auditMismatchData,
      ...rectifyMismatchData,
      ...tallyEntryMismatchData,
      ...reAuditMismatchData,
      ...billEntryMismatchData
    ];

    const uniqueData = combinedData.reduce((acc, current) => {
      const exists = acc.find(item => item.supabaseId === current.supabaseId);
      if (!exists) {
        acc.push(current);
      }
      return acc;
    }, []);

    return uniqueData;
  };

  const getFilteredByTab = (tab) => {
    if (tab === 'ALL') return getAllStagesData();
    if (tab === 'AUDIT') return auditMismatchData;
    if (tab === 'TALLY_ENTRY') return tallyEntryMismatchData;
    if (tab === 'BILL_ENTRY') return billEntryMismatchData;
    if (tab === 'RECTIFY') return rectifyMismatchData;
    if (tab === 'REAUDIT') return reAuditMismatchData;
    if (tab === 'HISTORY') return historyData;
    return accountsData.filter(row => row.currentStage === tab);
  };

  const filteredData = getFilteredByTab(activeTab).filter(item => {
    const matchesFirm = firmFilter === 'all' || (item.firmName && item.firmName === firmFilter);
    if (!matchesFirm) return false;

    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      String(item.liftNumber || '').toLowerCase().includes(searchLower) ||
      String(item.partyName || '').toLowerCase().includes(searchLower) ||
      String(item.productName || '').toLowerCase().includes(searchLower) ||
      String(item.billNo || '').toLowerCase().includes(searchLower) ||
      String(item.indentNumber || '').toLowerCase().includes(searchLower) ||
      String(item.firmName || '').toLowerCase().includes(searchLower) ||
      String(item.transporterName || '').toLowerCase().includes(searchLower)
    );
  }).sort((a, b) => {
    const liftA = String(a.liftNumber || '');
    const liftB = String(b.liftNumber || '');
    return liftB.localeCompare(liftA, undefined, { numeric: true, sensitivity: 'base' });
  });

  const getGroupKey = (firmName, billNo, partyName) => {
    const firm = String(firmName || '').trim().toLowerCase();
    const bill = String(billNo || '').trim().toLowerCase();
    const party = String(partyName || '').trim().toLowerCase();
    return `${firm}|||${bill}|||${party}`;
  };

  const groupedData = useMemo(() => {
    const groups = {};
    filteredData.forEach(row => {
      const key = getGroupKey(row.firmName, row.billNo, row.partyName);
      
      if (!groups[key]) {
        groups[key] = {
          firmName: row.firmName || '',
          billNo: row.billNo || '',
          partyName: row.partyName || '',
          items: [],
        };
      }
      groups[key].items.push(row);
    });

    return Object.values(groups);
  }, [filteredData, activeTab]);

  const getStageCount = (stage) => {
    const data = getFilteredByTab(stage);
    return data.filter(item => firmFilter === 'all' || (item.firmName && item.firmName === firmFilter)).length;
  };

  const COLUMN_LABELS = {
    stage: 'Stage', timestamp: 'Date', indentNumber: 'Indent No.', firmName: 'Firm Name',
    poRate: 'PO Rate', vendorName: 'Vendor Name', liftNumber: 'Lift Number', billNo: 'Bill No.',
    dateOfReceiving: 'Bill Receiving Date', partyName: 'Party Name', productName: 'Product Name',
    qty: 'PO Qty', areaLifting: 'Area Lifting', truckNo: 'Truck No.', transporterName: 'Transporter',
    transporterRate: 'Transporter Rate', billImage: 'Bill Image', biltyNo: 'Bilty No.',
    typeOfRate: 'Type Of Rate', rate: 'Material Rate', truckQty: 'Material Qty',
    liftingQty: 'Truck Qty', biltyImage: 'Bilty Image', qtyDifferenceStatus: 'Qty Diff Status',
    weightSlip: 'Weight Slip', debitAmount: 'Debit Amount', debitNoteUrl: 'Debit Image',
    totalFreight: 'Total Freight', auditStatus: 'Audit Status', rectifyStatus: 'Rectify Status',
    reAuditStatus: 'Re-Audit Status', tallyStatus: 'Tally Status', status: 'Status',
    remarks: 'Remarks', auditRemarks: 'Audit Remarks', rectifyRemarks: 'Rectify Remarks',
    reauditRemarks: 'Re-Audit Remarks', tallyRemarks: 'Tally Remarks', billRemarks: 'Bill Remarks',
  };

  const exportCSV = () => {
    const exportCols = Object.entries(COLUMN_LABELS).filter(([key]) => visibleColumns[key]);
    const headers = exportCols.map(([, label]) => `"${label}"`).join(',');
    const rows = filteredData.map((row) =>
      exportCols.map(([key]) => `"${String(row[key] ?? '').replace(/"/g, '""')}"`).join(','),
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-${activeTab.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderActiveTab = () => {
    const tabProps = {
      filteredData,
      groupedData,
      visibleColumns,
      activeTab,
      isSuperAdmin,
      setEditingRow,
      initializeFormData,
      setSuperAdminEditRow,
      toggleGroup,
      expandedGroups,
      setEditingGroupItems,
      STAGES,
      getGroupKey
    };

    switch (activeTab) {
      case 'ALL':
        return <AllStagesTab {...tabProps} />;
      case 'AUDIT':
        return <AuditTab {...tabProps} />;
      case 'RECTIFY':
        return <RectifyTab {...tabProps} />;
      case 'TALLY_ENTRY':
        return <TallyEntryTab {...tabProps} />;
      case 'REAUDIT':
        return <ReAuditTab {...tabProps} />;
      case 'BILL_ENTRY':
        return <BillEntryTab {...tabProps} />;
      case 'HISTORY':
        return <HistoryTab {...tabProps} />;
      default:
        return null;
    }
  };

  if (loading || (activeTab === 'ALL' && (loadingAudit || loadingRectify || loadingTallyEntry || loadingReAudit || loadingBillEntry)) || (activeTab === 'AUDIT' && loadingAudit) || (activeTab === 'TALLY_ENTRY' && loadingTallyEntry) || (activeTab === 'BILL_ENTRY' && loadingBillEntry) || (activeTab === 'RECTIFY' && loadingRectify) || (activeTab === 'REAUDIT' && loadingReAudit) || (activeTab === 'HISTORY' && loadingHistory)) {
    return (
      <div className="min-h-[400px] bg-linear-to-br from-gray-50 to-gray-100 dark:from-zinc-950 dark:to-zinc-900 flex flex-col items-center justify-center rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm m-4">
        <RefreshCw className="w-12 h-12 animate-spin text-green-500 dark:text-emerald-400 mx-auto mb-4" />
        <p className="text-xl text-gray-600 dark:text-zinc-300">Loading call tracker data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/30 rounded-xl p-8 max-w-2xl w-full">
          <div className="flex items-center mb-4">
            <X className="w-8 h-8 text-red-500 dark:text-red-400 mr-3" />
            <h3 className="text-xl font-semibold text-red-800 dark:text-red-400">Error Loading Data</h3>
          </div>
          <p className="text-red-700 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-linear-to-br from-gray-50 to-gray-100 dark:from-zinc-950 dark:to-zinc-900 p-4 sm:p-6 pb-20">
      {/* Entry Modal */}
      <AuditEntryModal
        visibleColumns={visibleColumns}
        editingRow={editingRow}
        editingGroupItems={editingGroupItems}
        auditMismatchData={auditMismatchData}
        tallyEntryMismatchData={tallyEntryMismatchData}
        billEntryMismatchData={billEntryMismatchData}
        rectifyMismatchData={rectifyMismatchData}
        reAuditMismatchData={reAuditMismatchData}
        allMismatchData={allMismatchData}
        accountsData={accountsData}
        STAGES={STAGES}
        formData={formData}
        handleFormChange={handleFormChange}
        submitFormData={submitFormData}
        submitting={submitting}
        setEditingRow={setEditingRow}
        setEditingGroupItems={setEditingGroupItems}
        activeTab={activeTab}
      />

      {/* Group Preview Modal */}
      <GroupedProductsDetailsModal
        viewGroupItems={viewGroupItems}
        setViewGroupItems={setViewGroupItems}
      />

      {/* SuperAdmin Edit Modal */}
      {superAdminEditRow && (
        <SuperAdminEditModal
          title={
            superAdminEditRow.isNewFromLift
              ? `Edit Lift Record — ${superAdminEditRow.liftNumber}`
              : `Edit Mismatch Record — ${superAdminEditRow.liftNumber}`
          }
          apiUrl={
            superAdminEditRow.isNewFromLift
              ? `${API_URL}/purchase/lift/entry/${superAdminEditRow.liftDbId}`
              : `${API_URL}/purchase/mismatch/update/${superAdminEditRow.supabaseId}`
          }
          fields={
            superAdminEditRow.isNewFromLift
              ? [
                  { label: "Firm Name", dbKey: "firmName", value: superAdminEditRow.firmName, type: "text" },
                  { label: "Bill No.", dbKey: "billNo", value: superAdminEditRow.billNo, type: "text" },
                  { label: "Truck No.", dbKey: "truckNo", value: superAdminEditRow.truckNo, type: "text" },
                  { label: "Transporter", dbKey: "transporterName", value: superAdminEditRow.transporterName, type: "text" },
                  { label: "Transporter Rate", dbKey: "transporterRate", value: superAdminEditRow.transporterRate, type: "number" },
                  { label: "Bill Image", dbKey: "billImage", value: superAdminEditRow.billImage, type: "file", folder: "bill-images" },
                  { label: "Bilty No.", dbKey: "biltyNo", value: superAdminEditRow.biltyNo, type: "text" },
                  { label: "Material Rate", dbKey: "rate", value: superAdminEditRow.rate, type: "number" },
                  { label: "Qty Diff Status", dbKey: "qtyDifferenceStatus", value: superAdminEditRow.qtyDifferenceStatus, type: "text", readOnly: true, skipSave: true },
                ]
              : [
                  { label: "Firm Name", dbKey: "firmName", value: superAdminEditRow.firmName, type: "text" },
                  { label: "Party Name", dbKey: "partyName", value: superAdminEditRow.partyName, type: "text" },
                  { label: "Product Name", dbKey: "productName", value: superAdminEditRow.productName, type: "text" },
                  { label: "Remarks", dbKey: "remarks", value: superAdminEditRow.remarks, type: "textarea" },
                  { label: "PO Qty", dbKey: "qty", value: superAdminEditRow.qty, type: "number" },
                  { label: "Area Lifting", dbKey: "areaLifting", value: superAdminEditRow.areaLifting, type: "text" },
                  { label: "Truck No.", dbKey: "truckNo", value: superAdminEditRow.truckNo, type: "text" },
                  { label: "Transporter", dbKey: "transporterName", value: superAdminEditRow.transporterName, type: "text" },
                  { label: "Bill No.", dbKey: "billNo", value: superAdminEditRow.billNo, type: "text" },
                  { label: "Bill Image", dbKey: "billImage", value: superAdminEditRow.billImage, type: "file", folder: "bill-images" },
                  { label: "Bilty No.", dbKey: "biltyNo", value: superAdminEditRow.biltyNo, type: "text" },
                  { label: "Type Of Rate", dbKey: "typeOfRate", value: superAdminEditRow.typeOfRate, type: "text" },
                  { label: "Material Rate", dbKey: "rate", value: superAdminEditRow.rate, type: "number" },
                  { label: "Truck Qty", dbKey: "truckQty", value: superAdminEditRow.truckQty, type: "number" },
                  { label: "Bilty Image", dbKey: "biltyImage", value: superAdminEditRow.biltyImage, type: "file", folder: "lift-bilty" },
                  { label: "Qty Diff Status", dbKey: "qtyDifferenceStatus", value: superAdminEditRow.qtyDifferenceStatus, type: "text", readOnly: true, skipSave: true },
                  { label: "Total Freight", dbKey: "totalFreight", value: superAdminEditRow.totalFreight, type: "number" },
                ]
          }
          onClose={() => setSuperAdminEditRow(null)}
          onSaved={() => {
            setSuperAdminEditRow(null);
            fetchData();
            fetchAllAccountsAuditData();
          }}
        />
      )}

      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 mb-6">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Accounts Audit</h1>
                <p className="text-sm text-gray-600 dark:text-zinc-300 mt-1">Track all stages of account processing</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="relative w-64 hidden sm:block">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#2fa36b] focus:border-[#2fa36b] sm:text-sm dark:bg-zinc-900 dark:border-zinc-700 dark:text-white dark:placeholder-zinc-500 dark:focus:placeholder-zinc-400"
                    placeholder="Search records..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2 mr-2">
                  <select
                    value={firmFilter}
                    onChange={(e) => setFirmFilter(e.target.value)}
                    className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-[#268a59] outline-none dark:bg-zinc-900 dark:border-zinc-700 dark:text-white"
                  >
                    <option value="all">All Firms</option>
                    {uniqueFirms.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <button
                    onClick={toggleColumnFilter}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors duration-200 dark:text-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Columns
                  </button>

                  {showColumnFilter && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowColumnFilter(false)}
                      ></div>

                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-80 overflow-y-auto dark:bg-zinc-900 dark:border-zinc-800">
                        <div className="p-4">
                          <h3 className="text-sm font-medium text-gray-700 mb-3 dark:text-zinc-300">Show/Hide Columns</h3>
                          <div className="grid grid-cols-1 gap-2">
                            {Object.entries({
                              stage: 'Stage',
                              timestamp: 'Date',
                              indentNumber: 'Indent No.',
                              firmName: 'Firm Name',
                              poRate: 'PO Rate',
                              vendorName: 'Vendor Name',
                              liftNumber: 'Lift Number',
                              billNo: 'Bill No.',
                              dateOfReceiving: 'Bill Receiving Date',
                              partyName: 'Party Name',
                              productName: 'Product Name',
                              qty: 'PO Qty',
                              areaLifting: 'Area Lifting',
                              truckNo: 'Truck No.',
                              transporterName: 'Transporter',
                              transporterRate: 'Transporter Rate',
                              billImage: 'Bill Image',
                              biltyNo: 'Bilty No.',
                              typeOfRate: 'Type Of Rate',
                              rate: 'Material Rate',
                              truckQty: 'Material Qty',
                              liftingQty: 'Truck Qty',
                              biltyImage: 'Bilty Image',
                              qtyDifferenceStatus: 'Qty Diff Status',
                              weightSlip: 'Weight Slip',
                              debitAmount: 'Debit Amount',
                              debitNoteUrl: 'Debit Image',
                              totalFreight: 'Total Freight',
                              auditStatus: 'Audit Status',
                              rectifyStatus: 'Rectify Status',
                              reAuditStatus: 'Re-Audit Status',
                              tallyStatus: 'Tally Status',
                              status: 'Status',
                              remarks: 'Remarks',
                              auditRemarks: 'Audit Remarks',
                              rectifyRemarks: 'Rectify Remarks',
                              reauditRemarks: 'Re-Audit Remarks',
                              tallyRemarks: 'Tally Remarks',
                              billRemarks: 'Bill Remarks',
                              actions: 'Actions'
                            }).map(([key, label]) => (
                              <label key={key} className="flex items-center space-x-2 text-sm py-1 hover:bg-gray-50 dark:hover:bg-zinc-800 px-2 rounded cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={visibleColumns[key]}
                                  onChange={() => toggleColumnVisibility(key)}
                                  className="w-4 h-4 text-[#2fa36b] bg-gray-100 border-gray-300 rounded focus:ring-[#268a59] focus:ring-2 dark:bg-zinc-800 dark:border-zinc-700"
                                />
                                <span className="text-gray-700 dark:text-zinc-300">{label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={exportCSV}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors duration-200 dark:text-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </button>
                <button
                  onClick={fetchData}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors duration-200 dark:text-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Tabs Section */}
          <div className="px-6 pt-4">
            <div className="border-b border-gray-200 dark:border-zinc-800">
              <nav className="flex space-x-2 overflow-x-auto pb-2" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('ALL')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 whitespace-nowrap ${activeTab === 'ALL'
                    ? 'bg-green-50 text-[#268a59] border border-green-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-zinc-800'
                    }`}
                >
                  <div className="flex items-center space-x-2">
                    <span>All Stages</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === 'ALL' ? 'bg-green-100 text-[#268a59] dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}>
                      {getStageCount('ALL')}
                    </span>
                  </div>
                </button>

                {TAB_ORDER.map((stageKey) => {
                  const stageInfo = STAGES[stageKey];
                  const StageIcon = stageInfo.icon;
                  const count = getStageCount(stageKey);

                  return (
                    <button
                      key={stageKey}
                      onClick={() => setActiveTab(stageKey)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 whitespace-nowrap ${activeTab === stageKey
                        ? `${stageInfo.color.replace('text', 'border').replace('bg', 'bg-opacity-20')} border`
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-zinc-800'
                        }`}
                    >
                      <div className="flex items-center space-x-2">
                        <StageIcon className="w-4 h-4" />
                        <span>{stageInfo.name}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === stageKey
                          ? `${stageInfo.color.replace('bg-100', 'bg-200')}`
                          : 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300'
                          }`}>
                          {count}
                        </span>
                      </div>
                    </button>
                  );
                })}

                {/* History Tab */}
                <button
                  onClick={() => setActiveTab('HISTORY')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 whitespace-nowrap ${activeTab === 'HISTORY'
                    ? 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/30'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-zinc-800'
                    }`}
                >
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>History</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === 'HISTORY' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' : 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300'}`}>
                      {getStageCount('HISTORY')}
                    </span>
                  </div>
                </button>
              </nav>
            </div>
          </div>

          {/* Stage Description */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 dark:bg-zinc-800/50 dark:border-zinc-800">
            {activeTab !== 'ALL' && activeTab !== 'HISTORY' && (
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${STAGES[activeTab].color.replace('bg-100', 'bg-200')}`}>
                  {React.createElement(STAGES[activeTab].icon, { className: "w-5 h-5" })}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{STAGES[activeTab].name}</h3>
                  <p className="text-sm text-gray-600 dark:text-zinc-300">{STAGES[activeTab].description}</p>
                </div>
                <div className="ml-auto text-sm text-gray-500 dark:text-zinc-400">
                  Showing {filteredData.length} records
                </div>
              </div>
            )}
            {activeTab === 'HISTORY' && (
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">History</h3>
                  <p className="text-sm text-gray-600 dark:text-zinc-300">All fully completed records (Bill Received done)</p>
                </div>
                <div className="ml-auto text-sm text-gray-500 dark:text-zinc-400">
                  Showing {filteredData.length} records
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Active Tab Content */}
        {renderActiveTab()}
      </div>
    </div>
  );
};

export default CallTrackerPage;
