'use client';
import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Warehouse,
  Truck,
  Package,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { API_URL, getToken, getStoredUser } from '@/lib/auth';
import { AuthProvider } from '../../../purchase/context/AuthContext';
import ManageUsers from '../../../purchase/components/ManageUsers';
import { SYSTEM_REGISTRY, parseUserPermissions } from '../../config/systemRegistry';

import {
  PURCHASE_CATEGORIES,
  ORDER_CATEGORIES,
  PRODUCTION_CATEGORIES,
  STORE_CATEGORIES,
  RMSALES_CATEGORIES,
  SERVICES_CATEGORIES,
  CHECKLIST_CATEGORIES,
  INVENTORY_CATEGORIES,
  CATEGORIES_BY_SYSTEM,
} from './categories';
import { NAV_SECTIONS, EMPTY_MASTER_FORM } from './constants';
import { EmptyRow, LoadingRows } from './helpers';
import CategoryTabSection from './CategoryTabSection';
import ProfileTab from './ProfileTab';
import DeleteConfirmDialog from './DeleteConfirmDialog';

// The Add/Edit modal is ~2300 lines (every system's category Select options +
// per-category field blocks) but is never needed until the user actually opens
// it — so it's its own chunk, fetched on first "Add Master Entry" click instead
// of being part of this page's initial bundle.
const MasterEntrySheet = dynamic(() => import('./MasterEntrySheet'), { ssr: false });

export default function MasterPage() {
  const storedUser = getStoredUser();
  const { isAdmin, isSuperAdmin, isViewOnly } = parseUserPermissions(storedUser?.page_access, storedUser?.role);
  const canAddEntry = isAdmin && !isViewOnly;

  // "User Management" and "Systems" are Super Admin only (Admin/User only
  // ever see "Profile") — both at the nav level (so the tabs don't even
  // show) and, for User Management, again inside ManageUsers itself since
  // that component is also reachable from other systems' own routes.
  const visibleNavSections = isSuperAdmin
    ? NAV_SECTIONS
    : NAV_SECTIONS.filter((s) => s.id === "profile");

  const [activeSection, setActiveSection] = useState(isSuperAdmin ? "systems" : "profile");
  const [activeItem, setActiveItem] = useState(isSuperAdmin ? "purchase" : "my-profile");

  // Which category tab is active within CategoryTabSection (Purchase/Order/
  // Production/Store/RM Sales/Services/Checklist all render through it) —
  // resets to that system's first category whenever the system tab changes.
  const activeCategories = CATEGORIES_BY_SYSTEM[activeItem];
  const [activeCategoryTab, setActiveCategoryTab] = useState(activeCategories?.[0]?.id || null);
  const [categorySearch, setCategorySearch] = useState("");
  useEffect(() => {
    if (activeCategories && activeCategories.length > 0) {
      setActiveCategoryTab(activeCategories[0].id);
      setCategorySearch("");
    }
  }, [activeItem]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectSection = (section) => {
    setActiveSection(section.id);
    setActiveItem(section.items[0]?.id || "");
  };

  // Master Entry modal state
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // "add" | "edit"
  const [modalCategory, setModalCategory] = useState("vendor");
  const [editingRowId, setEditingRowId] = useState(null);
  const [masterFormData, setMasterFormData] = useState(EMPTY_MASTER_FORM);
  const [masterSubmitLoading, setMasterSubmitLoading] = useState(false);
  const [masterRows, setMasterRows] = useState([]);
  const [tlRows, setTlRows] = useState([]);
  const [vendorList, setVendorList] = useState([]);
  const [transporterList, setTransporterList] = useState([]);
  const [productList, setProductList] = useState([]);
  const [masterDataLoading, setMasterDataLoading] = useState(true);

  // Full purchase_firm records (firmName/dataName/gstin/pan/phone/email/poPrefix)
  // for the "Firms" category table — distinct from `purchaseFirms` below, which is
  // just a list of firm-name strings pulled from purchase_master for Select options.
  const [firms, setFirms] = useState([]);
  const [firmsLoading, setFirmsLoading] = useState(true);

  const fetchFirms = useCallback(async () => {
    setFirmsLoading(true);
    try {
      const res = await fetch(`${API_URL}/purchase/firms`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to load firms");
      setFirms(json.data || []);
    } catch (err) {
      toast.error("Failed to load firms", { description: err.message });
    } finally {
      setFirmsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeSection === "systems" && activeItem === "purchase") fetchFirms();
  }, [activeSection, activeItem, fetchFirms]);

  // Purchase Firms list for read-only selection in Order
  const [purchaseFirms, setPurchaseFirms] = useState([
    "PMMPL",
    "Purab",
    "Rkl",
    "Refrasynth",
    "Refratech",
    "PMM Logisol",
    "PMM Retail",
    "PMM Infra",
    "PMM Ventures",
  ]);

  useEffect(() => {
    const fetchPurchaseFirms = async () => {
      try {
        const res = await fetch(`${API_URL}/purchase/master/firms`);
        const json = await res.json();
        if (res.ok && Array.isArray(json.data) && json.data.length > 0) {
          setPurchaseFirms(json.data);
        }
      } catch {
        // Fallback to initial defaults if fetch fails
      }
    };
    fetchPurchaseFirms();
  }, []);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const openAddModal = (category = "vendor") => {
    setModalMode("add");
    setModalCategory(category);
    setEditingRowId(null);
    let typeVal = "Vendor Name";
    const foundPurchase = PURCHASE_CATEGORIES.find((c) => c.id === category);
    const foundOrder = ORDER_CATEGORIES.find((c) => c.id === category);
    const foundProduction = PRODUCTION_CATEGORIES.find((c) => c.id === category);
    const foundStore = STORE_CATEGORIES.find((c) => c.id === category);
    const foundRmSales = RMSALES_CATEGORIES.find((c) => c.id === category);
    const foundServices = SERVICES_CATEGORIES.find((c) => c.id === category);
    const foundChecklist = CHECKLIST_CATEGORIES.find((c) => c.id === category);
    const foundInventory = INVENTORY_CATEGORIES.find((c) => c.id === category);
    if (activeItem === "purchase" && foundPurchase) {
      typeVal = foundPurchase.typeValue;
    } else if (activeItem === "order" && foundOrder) {
      typeVal = foundOrder.typeValue;
    } else if (activeItem === "production" && foundProduction) {
      typeVal = foundProduction.typeValue;
    } else if (activeItem === "store" && foundStore) {
      typeVal = foundStore.typeValue;
    } else if (activeItem === "rm-sales" && foundRmSales) {
      typeVal = foundRmSales.typeValue;
    } else if (activeItem === "services" && foundServices) {
      typeVal = foundServices.typeValue;
    } else if (activeItem === "checklist" && foundChecklist) {
      typeVal = foundChecklist.typeValue;
    } else if (activeItem === "inventory" && foundInventory) {
      typeVal = foundInventory.typeValue;
    } else if (category === "transporter") {
      typeVal = activeItem === "payment" ? "FMS Master" : "Transporter Name";
    } else if (category === "raw_material") {
      typeVal = activeItem === "repair" ? "Machine Name" : activeItem === "payment" ? "Funding Channel" : "Raw Material";
    }

    setMasterFormData({
      ...EMPTY_MASTER_FORM,
      type: typeVal,
      firmName: purchaseFirms.length > 0 ? purchaseFirms[0] : "PMMPL",
      firm: purchaseFirms.length > 0 ? purchaseFirms[0] : "PMMPL",
      typeOfKycForm: category === "transporter" ? "Transportation" : "",
    });
    setIsMasterModalOpen(true);
  };

  const openEditModal = (category, row) => {
    setModalMode("edit");
    setModalCategory(category);
    setEditingRowId(row.id || null);
    const raw = row.raw || {};
    let typeVal = "Vendor Name";
    const foundPurchase = PURCHASE_CATEGORIES.find((c) => c.id === category);
    const foundOrder = ORDER_CATEGORIES.find((c) => c.id === category);
    const foundProduction = PRODUCTION_CATEGORIES.find((c) => c.id === category);
    const foundStore = STORE_CATEGORIES.find((c) => c.id === category);
    const foundRmSales = RMSALES_CATEGORIES.find((c) => c.id === category);
    const foundServices = SERVICES_CATEGORIES.find((c) => c.id === category);
    const foundChecklist = CHECKLIST_CATEGORIES.find((c) => c.id === category);
    const foundInventory = INVENTORY_CATEGORIES.find((c) => c.id === category);
    if (activeItem === "purchase" && foundPurchase) {
      typeVal = foundPurchase.typeValue;
    } else if (activeItem === "order" && foundOrder) {
      typeVal = foundOrder.typeValue;
    } else if (activeItem === "production" && foundProduction) {
      typeVal = foundProduction.typeValue;
    } else if (activeItem === "store" && foundStore) {
      typeVal = foundStore.typeValue;
    } else if (activeItem === "rm-sales" && foundRmSales) {
      typeVal = foundRmSales.typeValue;
    } else if (activeItem === "services" && foundServices) {
      typeVal = foundServices.typeValue;
    } else if (activeItem === "checklist" && foundChecklist) {
      typeVal = foundChecklist.typeValue;
    } else if (activeItem === "inventory" && foundInventory) {
      typeVal = foundInventory.typeValue;
    } else if (category === "transporter") {
      typeVal = activeItem === "payment" ? "FMS Master" : "Transporter Name";
    } else if (category === "raw_material") {
      typeVal = activeItem === "repair" ? "Machine Name" : activeItem === "payment" ? "Funding Channel" : "Raw Material";
    }

    setMasterFormData({
      ...EMPTY_MASTER_FORM,
      type: raw.type || typeVal,
      vendorName: raw.vendorName || raw.partyName || "",
      vendorNameKyc: raw.vendorNameKyc || "",
      typeOfKycForm: raw.typeOfKycForm || (category === "transporter" ? "Transportation" : ""),
      firmName: raw.firmName || raw.firm || (purchaseFirms.length > 0 ? purchaseFirms[0] : "PMMPL"),
      firm: raw.firm || raw.firmName || (purchaseFirms.length > 0 ? purchaseFirms[0] : "PMMPL"),
      gstNumber: raw.gstNumber || "",
      phoneNumber: raw.phoneNumber || "",
      email: raw.email || "",
      bankAccountNo: raw.bankAccountNo || "",
      ifscCode: raw.ifscCode || "",
      transporterName: raw.transporterName || "",
      transporterName2: raw.transporterName2 || "",
      materialReturnTransporterName: raw.materialReturnTransporterName || "",
      rateType: raw.rateType || raw.typeOfRate || "",
      typeOfRate: raw.typeOfRate || raw.rateType || "",
      rawMaterialName: raw.rawMaterialName || "",
      productName: raw.productName || raw.rawMaterialName || "",
      itemName: raw.itemName || "",
      uom: raw.uom || raw.unit || "MT",
      fmsName: raw.fmsName || "",
      department: raw.department || "",
      groupHead: raw.groupHead || "",
      machineName: raw.machineName || "",
      typeOfIndent: raw.typeOfIndent || "",
      areaLifting: raw.areaLifting || "",
      paymentTerm: raw.paymentTerm || "",
      generatedBy: raw.generatedBy || "",
      aluminaRange: raw.tlAlumina ?? "",
      ironRange: raw.tlIron ?? "",
      apRange: raw.apPercent ?? "",
      bdRange: raw.bdPercent ?? "",
      partyName: raw.partyName || "",
      address: raw.address || "",
      customerCategory: raw.customerCategory || "",
      typeOfPi: raw.typeOfPi || "",
      marketingSalesPerson: raw.marketingSalesPerson || "",
      nameOfRawMaterial: raw.nameOfRawMaterial || "",
      finishedGoodsName: raw.finishedGoodsName || "",
      crushingProductName: raw.crushingProductName || "",
      materialName: raw.materialName || "",
      supervisorName: raw.supervisorName || "",
      sfSupervisorName: raw.sfSupervisorName || "",
      testedBy: raw.testedBy || "",
      flowOfMaterial: raw.flowOfMaterial || "",
      shift: raw.shift || "",
      priority: raw.priority || "",
      status: raw.status || "",
      testStatus: raw.testStatus || "",
      category: raw.category || "",
      groupName: raw.groupName || "",
      areaOfUse: raw.areaOfUse || "",
      defaultTerms: raw.defaultTerms || "",
      where: raw.where || "",
      vendorGstin: raw.vendorGstin || "",
      vendorAddress: raw.vendorAddress || "",
      vendorEmail: raw.vendorEmail || "",
      companyName: raw.companyName || "",
      companyAddress: raw.companyAddress || "",
      companyGstin: raw.companyGstin || "",
      companyPhone: raw.companyPhone || "",
      companyPan: raw.companyPan || "",
      billingAddress: raw.billingAddress || "",
      destinationAddress: raw.destinationAddress || "",
      transportType: raw.transportType || "",
      doerName: raw.doerName || "",
      givenBy: raw.givenBy || "",
      role: raw.role || "",
    });
    setIsMasterModalOpen(true);
  };

  const fetchMasterData = useCallback(async (systemId) => {
    setMasterDataLoading(true);
    try {
      if (systemId === "purchase") {
        const [masterRes, tlRes] = await Promise.all([
          fetch(`${API_URL}/purchase/master`),
          fetch(`${API_URL}/purchase/master/tolerance`),
        ]);
        const masterJson = await masterRes.json();
        const tlJson = await tlRes.json();
        if (!masterRes.ok) throw new Error(masterJson.message || "Failed to load master data");
        if (!tlRes.ok) throw new Error(tlJson.message || "Failed to load tolerance data");
        
        const mRows = masterJson.data || [];
        const tRows = tlJson.data || [];
        setMasterRows(mRows);
        setTlRows(tRows);
        setVendorList(
          mRows
            .filter((r) => r.vendorName)
            .map((r) => ({
              id: r.id,
              name: r.vendorName,
              raw: r,
            }))
        );
        setTransporterList(
          mRows
            .filter((r) => r.transporterName)
            .map((r) => ({
              id: r.id,
              name: r.transporterName,
              raw: r,
            }))
        );
        setProductList(
          mRows
            .filter((r) => r.rawMaterialName || r.productName)
            .map((r) => ({
              id: r.id,
              name: r.rawMaterialName || r.productName || "—",
              raw: r,
            }))
        );
        return;
      }

      // Other systems
      const res = await fetch(`${API_URL}/${systemId}/master`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || `Failed to load ${systemId} master data`);

      const resData = json.data || {};
      const rows = Array.isArray(resData) ? resData : (resData.items || resData.rows || []);
      setMasterRows(rows);
      setTlRows([]);

      if (systemId === "order") {
        setVendorList(rows.filter(r => r.partyName).map(r => ({ id: r.id, name: r.partyName, details: r.gstNumber ? `GST: ${r.gstNumber}` : r.customerCategory, raw: r })));
        setTransporterList(rows.filter(r => r.transporterName || r.materialReturnTransporterName).map(r => ({ id: r.id, name: r.transporterName || r.materialReturnTransporterName, details: r.uom, raw: r })));
        setProductList(rows.filter(r => r.productName).map(r => ({ id: r.id, name: r.productName, details: r.uom ? `UOM: ${r.uom}` : r.firmName, raw: r })));
      } else if (systemId === "production") {
        setVendorList(rows.filter(r => r.supervisorName || r.sfSupervisorName).map(r => ({ id: r.id, name: r.supervisorName || r.sfSupervisorName, details: r.shift ? `Shift: ${r.shift}` : r.priority, raw: r })));
        setTransporterList(rows.filter(r => r.flowOfMaterial || r.shift).map(r => ({ id: r.id, name: r.flowOfMaterial || r.shift, details: r.status, raw: r })));
        setProductList(rows.filter(r => r.materialName || r.nameOfRawMaterial || r.finishedGoodsName || r.crushingProductName).map(r => ({ id: r.id, name: r.materialName || r.nameOfRawMaterial || r.finishedGoodsName || r.crushingProductName, details: r.firmName, raw: r })));
      } else if (systemId === "store") {
        setVendorList(rows.filter(r => r.vendorName || r.companyName).map(r => ({ id: r.id, name: r.vendorName || r.companyName, details: r.department || r.category, raw: r })));
        setTransporterList(rows.filter(r => r.category || r.department || r.groupName).map(r => ({ id: r.id, name: r.category || r.department || r.groupName, details: r.where, raw: r })));
        setProductList(rows.filter(r => r.itemName).map(r => ({ id: r.id, name: r.itemName, details: r.uom ? `UOM: ${r.uom}` : r.groupName, raw: r })));
      } else if (systemId === "rm-sales") {
        const parties = Array.isArray(resData.parties) ? resData.parties : rows.filter(r => r.partyName);
        const products = Array.isArray(resData.products) ? resData.products : rows.filter(r => r.productName);
        const transports = Array.isArray(resData.transportTypes) ? resData.transportTypes : rows.filter(r => r.transportType);
        setVendorList(parties.map(p => ({ id: p.id, name: p.name || p.partyName, details: p.firm_name || p.firmName, raw: p })));
        setTransporterList(transports.map(t => ({ id: t.id, name: typeof t === 'string' ? t : (t.transportType || t.name), details: 'Transport Option', raw: t })));
        setProductList(products.map(p => ({ id: p.id, name: p.name || p.productName, details: p.unit ? `Unit: ${p.unit}` : '', raw: p })));
      } else if (systemId === "checklist") {
        setVendorList(rows.filter(r => r.doerName).map(r => ({ id: r.id, name: r.doerName, details: r.role ? `Role: ${r.role}` : (r.firm ? `Firm: ${r.firm}` : ''), raw: r })));
        setTransporterList(rows.filter(r => r.givenBy).map(r => ({ id: r.id, name: r.givenBy, details: r.firm ? `Firm: ${r.firm}` : 'Task Assigner', raw: r })));
        setProductList(rows.filter(r => r.role).map(r => ({ id: r.id, name: r.role, details: r.firm, raw: r })));
      } else if (systemId === "inventory") {
        // Tag each row with which of the 3 dedicated tables it came from —
        // INVENTORY_CATEGORIES' filter()/getName() below rely on __source
        // rather than field presence, since finished goods and trading
        // material both key off "productName" and would otherwise be
        // indistinguishable.
        const raw = (resData.rawMaterials || []).map((r) => ({ ...r, __source: "raw" }));
        const finished = (resData.finishedGoods || []).map((r) => ({ ...r, __source: "finish" }));
        const trading = (resData.tradingMaterials || []).map((r) => ({ ...r, __source: "trading" }));
        setMasterRows([...raw, ...finished, ...trading]);
        setVendorList(raw.map(r => ({ id: r.id, name: r.itemName || r.name, details: r.firmName ? `Firm: ${r.firmName}` : (r.unit ? `Unit: ${r.unit}` : ''), raw: r })));
        setTransporterList(trading.map(r => ({ id: r.id, name: r.productName || r.itemName, details: r.firmName ? `Firm: ${r.firmName}` : 'Trading Material', raw: r })));
        setProductList(finished.map(r => ({ id: r.id, name: r.productName || r.itemName, details: r.firmName ? `Firm: ${r.firmName}` : 'Finished Goods', raw: r })));
      } else if (systemId === "payment") {
        const vendors = Array.isArray(resData.vendors) ? resData.vendors : [];
        const fms = Array.isArray(resData.fms) ? resData.fms : [];
        const funding = Array.isArray(resData.typeOfFunding) ? resData.typeOfFunding : [];
        setVendorList(vendors.map(v => ({ id: v.id, name: typeof v === 'string' ? v : (v.vendorName || v.name), details: 'Vendor', raw: v })));
        setTransporterList(fms.map(f => ({ id: f.id, name: typeof f === 'string' ? f : (f.fmsName || f.name), details: f.firmName ? `Firm: ${f.firmName} | ${f.paymentMode || ''}` : 'FMS Master', raw: f })));
        setProductList(funding.map(tf => ({ id: tf.id, name: typeof tf === 'string' ? tf : (tf.name || tf.typeOfFunding), details: 'Funding Channel', raw: tf })));
      } else if (systemId === "services") {
        const depts = Array.isArray(resData.departments) ? resData.departments : [];
        const fmsNames = Array.isArray(resData.fmsNames) ? resData.fmsNames : [];
        const groupHeads = Array.isArray(resData.groupHeads) ? resData.groupHeads : [];
        setVendorList(depts.map(d => ({ id: d.id, name: typeof d === 'string' ? d : (d.department || d.name), details: 'Department', raw: d })));
        setTransporterList(fmsNames.map(f => ({ id: f.id, name: typeof f === 'string' ? f : (f.fmsName || f.name), details: 'FMS Master', raw: f })));
        setProductList(groupHeads.map(gh => ({ id: gh.id, name: typeof gh === 'string' ? gh : (gh.groupHead || gh.name), details: 'Group Head', raw: gh })));
      } else if (systemId === "repair") {
        const vendors = Array.isArray(resData.vendors) ? resData.vendors : rows.filter(r => r.vendorName);
        const transports = Array.isArray(resData.transporters) ? resData.transporters : rows.filter(r => r.transporterName);
        const machines = Array.isArray(resData.machines) ? resData.machines : rows.filter(r => r.machineName);
        setVendorList(vendors.map(v => ({ id: v.id, name: typeof v === 'string' ? v : (v.vendorName || v.name), details: 'Repair Vendor', raw: v })));
        setTransporterList(transports.map(t => ({ id: t.id, name: typeof t === 'string' ? t : (t.transporterName || t.name), details: 'Logistics', raw: t })));
        setProductList(machines.map(m => ({ id: m.id, name: typeof m === 'string' ? m : (m.machineName || m.name), details: 'Machine / Asset', raw: m })));
      } else if (systemId === "freight-payment") {
        setVendorList(rows.map(r => ({ id: r.id, name: r.transporterName || r.partyName || `Entry #${r.id}`, details: r.firmName || r.status, raw: r })));
        setTransporterList(rows.filter(r => r.transporterName).map(r => ({ id: r.id, name: r.transporterName, details: r.rateType, raw: r })));
        setProductList(rows.filter(r => r.biltyNo).map(r => ({ id: r.id, name: r.biltyNo, details: r.vehicleNo, raw: r })));
      }
    } catch (err) {
      toast.error(`Failed to load ${systemId} master data`, { description: err.message });
      setMasterRows([]);
      setTlRows([]);
      setVendorList([]);
      setTransporterList([]);
      setProductList([]);
    } finally {
      setMasterDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeSection === "systems") {
      fetchMasterData(activeItem);
    }
  }, [activeSection, activeItem, fetchMasterData]);

  const handleMasterSubmit = async (e) => {
    e.preventDefault();
    setMasterSubmitLoading(true);
    try {
      let payload;
      if (activeItem === "purchase" && modalCategory === "firm") {
        // purchase_firm is a separate table from purchase_master (see
        // master-system-backend/src/purchase/firms) — POST /purchase/firms only
        // (no update endpoint exists there yet, so Firms is add-only here).
        payload = {
          firmName: masterFormData.firmName?.trim() || null,
          dataName: masterFormData.dataName?.trim() || null,
          address: masterFormData.address?.trim() || null,
          billingAddress: masterFormData.billingAddress?.trim() || masterFormData.address?.trim() || null,
          gstin: masterFormData.gstin?.trim() || null,
          pan: masterFormData.pan?.trim() || null,
          phone: masterFormData.phone?.trim() || null,
          email: masterFormData.email?.trim() || null,
          poPrefix: masterFormData.poPrefix?.trim() || null,
        };
      } else if (activeItem === "order") {
        payload = {
          firmName: masterFormData.firmName?.trim() || null,
          partyName: masterFormData.partyName?.trim() || null,
          address: masterFormData.address?.trim() || null,
          gstNumber: masterFormData.gstNumber?.trim() || null,
          customerCategory: masterFormData.customerCategory?.trim() || null,
          typeOfPi: masterFormData.typeOfPi?.trim() || null,
          marketingSalesPerson: masterFormData.marketingSalesPerson?.trim() || null,
          productName: masterFormData.productName?.trim() || null,
          uom: masterFormData.uom?.trim() || null,
          transporterName: masterFormData.transporterName?.trim() || null,
          materialReturnTransporterName: masterFormData.materialReturnTransporterName?.trim() || null,
        };
      } else if (activeItem === "production") {
        payload = {
          firmName: masterFormData.firmName?.trim() || null,
          nameOfRawMaterial: masterFormData.nameOfRawMaterial?.trim() || null,
          finishedGoodsName: masterFormData.finishedGoodsName?.trim() || null,
          crushingProductName: masterFormData.crushingProductName?.trim() || null,
          materialName: masterFormData.materialName?.trim() || null,
          supervisorName: masterFormData.supervisorName?.trim() || null,
          sfSupervisorName: masterFormData.sfSupervisorName?.trim() || null,
          testedBy: masterFormData.testedBy?.trim() || null,
          flowOfMaterial: masterFormData.flowOfMaterial?.trim() || null,
          shift: masterFormData.shift?.trim() || null,
          priority: masterFormData.priority?.trim() || null,
          status: masterFormData.status?.trim() || null,
          testStatus: masterFormData.testStatus?.trim() || null,
        };
      } else if (activeItem === "store") {
        payload = {
          firmName: masterFormData.firmName?.trim() || null,
          category: masterFormData.category?.trim() || null,
          groupName: masterFormData.groupName?.trim() || null,
          itemName: masterFormData.itemName?.trim() || null,
          department: masterFormData.department?.trim() || null,
          areaOfUse: masterFormData.areaOfUse?.trim() || null,
          uom: masterFormData.uom?.trim() || null,
          fmsName: masterFormData.fmsName?.trim() || null,
          paymentTerm: masterFormData.paymentTerm?.trim() || null,
          defaultTerms: masterFormData.defaultTerms?.trim() || null,
          where: masterFormData.where?.trim() || null,
          vendorName: masterFormData.vendorName?.trim() || null,
          vendorGstin: masterFormData.vendorGstin?.trim() || null,
          vendorAddress: masterFormData.vendorAddress?.trim() || null,
          vendorEmail: masterFormData.vendorEmail?.trim() || null,
          companyName: masterFormData.companyName?.trim() || null,
          companyAddress: masterFormData.companyAddress?.trim() || null,
          companyGstin: masterFormData.companyGstin?.trim() || null,
          companyPhone: masterFormData.companyPhone?.trim() || null,
          companyPan: masterFormData.companyPan?.trim() || null,
          billingAddress: masterFormData.billingAddress?.trim() || null,
          destinationAddress: masterFormData.destinationAddress?.trim() || null,
        };
      } else if (activeItem === "rm-sales") {
        payload = {
          firmName: masterFormData.firmName?.trim() || null,
          partyName: masterFormData.partyName?.trim() || null,
          productName: masterFormData.productName?.trim() || null,
          transportType: masterFormData.transportType?.trim() || null,
        };
      } else if (activeItem === "services") {
        payload = {
          firmName: masterFormData.firmName?.trim() || null,
          department: masterFormData.department?.trim() || null,
          groupHead: masterFormData.groupHead?.trim() || null,
          fmsName: masterFormData.fmsName?.trim() || null,
        };
      } else if (activeItem === "checklist") {
        payload = {
          firm: masterFormData.firmName?.trim() || masterFormData.firm?.trim() || null,
          doerName: masterFormData.doerName?.trim() || null,
          givenBy: masterFormData.givenBy?.trim() || null,
          role: masterFormData.role?.trim() || null,
        };
      } else if (activeItem === "inventory") {
        // Each category writes straight to its own real table (raw material / finished
        // goods / trading material) instead of the generic /inventory/master stub, which
        // can only ever create raw material rows — see the isEdit/url override below.
        if (modalCategory === "finished_goods") {
          payload = {
            firmName: masterFormData.firmName?.trim() || null,
            productName: masterFormData.finishedGoodsName?.trim() || masterFormData.productName?.trim() || null,
          };
        } else if (modalCategory === "trading_material") {
          payload = {
            firmName: masterFormData.firmName?.trim() || null,
            productName: masterFormData.productName?.trim() || null,
          };
        } else {
          payload = {
            firmName: masterFormData.firmName?.trim() || null,
            itemName: masterFormData.itemName?.trim() || masterFormData.rawMaterialName?.trim() || null,
            unit: masterFormData.uom?.trim() || "MT",
          };
        }
      } else {
        let typeValue = masterFormData.type || "Vendor Name";
        if (activeItem !== "purchase") {
          if (modalCategory === "transporter") {
            typeValue = activeItem === "services" ? "FMS Name" : "Transporter";
          } else if (modalCategory === "raw_material") {
            typeValue = activeItem === "repair" ? "Machine Name" : "Raw Material";
          } else if (modalCategory === "vendor" && activeItem === "services") {
            typeValue = "Department";
          }
        }

        payload = {
          type: typeValue,
          vendorName: masterFormData.vendorName?.trim() || null,
          vendorNameKyc: masterFormData.vendorNameKyc?.trim() || null,
          typeOfKycForm: masterFormData.typeOfKycForm?.trim() || null,
          firmName: masterFormData.firmName?.trim() || null,
          gstNumber: masterFormData.gstNumber?.trim() || null,
          phoneNumber: masterFormData.phoneNumber?.trim() || null,
          email: masterFormData.email?.trim() || null,
          bankAccountNo: masterFormData.bankAccountNo?.trim() || null,
          ifscCode: masterFormData.ifscCode?.trim() || null,
          partyName: masterFormData.vendorName?.trim() || null,
          transporterName: masterFormData.transporterName?.trim() || null,
          transporterName2: masterFormData.transporterName2?.trim() || null,
          transportType: masterFormData.transporterName?.trim() || null,
          rateType: masterFormData.rateType?.trim() || null,
          typeOfRate: masterFormData.typeOfRate?.trim() || masterFormData.rateType?.trim() || null,
          rawMaterialName: masterFormData.rawMaterialName?.trim() || null,
          productName: masterFormData.productName?.trim() || masterFormData.rawMaterialName?.trim() || null,
          itemName: masterFormData.itemName?.trim() || masterFormData.rawMaterialName?.trim() || null,
          uom: masterFormData.uom?.trim() || null,
          machineName: masterFormData.machineName?.trim() || masterFormData.rawMaterialName?.trim() || null,
          fmsName: masterFormData.fmsName?.trim() || masterFormData.transporterName?.trim() || null,
          department: masterFormData.department?.trim() || masterFormData.vendorName?.trim() || null,
          groupHead: masterFormData.groupHead?.trim() || null,
          typeOfIndent: masterFormData.typeOfIndent?.trim() || null,
          areaLifting: masterFormData.areaLifting?.trim() || null,
          paymentTerm: masterFormData.paymentTerm?.trim() || null,
          generatedBy: masterFormData.generatedBy?.trim() || null,
          aluminaRange: masterFormData.aluminaRange || null,
          ironRange: masterFormData.ironRange || null,
          apRange: masterFormData.apRange || null,
          bdRange: masterFormData.bdRange || null,
        };
      }

      const isEdit = modalMode === "edit" && editingRowId;
      let url = isEdit
        ? `${API_URL}/${activeItem}/master/${editingRowId}`
        : `${API_URL}/${activeItem}/master`;
      let method = isEdit ? "PATCH" : "POST";

      if (activeItem === "inventory") {
        const base =
          modalCategory === "finished_goods"
            ? "finished-goods"
            : modalCategory === "trading_material"
            ? "trading-material"
            : "raw-material";
        url = isEdit ? `${API_URL}/inventory/${base}/${editingRowId}` : `${API_URL}/inventory/${base}`;
        method = isEdit ? "PUT" : "POST"; // these 3 endpoints use PUT, not PATCH, for updates
      } else if (activeItem === "purchase" && modalCategory === "firm") {
        url = `${API_URL}/purchase/firms`; // add-only — no update/delete endpoint exists yet
        method = "POST";
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || `Failed to ${isEdit ? "update" : "add"} master entry`);
      toast.success(isEdit ? "Master Entry Updated Successfully" : "Master Entry Added Successfully");
      setIsMasterModalOpen(false);
      setMasterFormData(EMPTY_MASTER_FORM);
      setEditingRowId(null);
      if (activeItem === "purchase" && modalCategory === "firm") {
        fetchFirms();
      } else {
        fetchMasterData(activeItem);
      }
    } catch (err) {
      toast.error(`Error ${modalMode === "edit" ? "updating" : "adding"} master entry`, { description: err.message });
    } finally {
      setMasterSubmitLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      let deleteUrl = `${API_URL}/${activeItem}/master/${deleteTarget.id}`;
      if (activeItem === "inventory") {
        const source = deleteTarget.raw?.__source;
        const base = source === "finish" ? "finished-goods" : source === "trading" ? "trading-material" : "raw-material";
        deleteUrl = `${API_URL}/inventory/${base}/${deleteTarget.id}`;
      }
      const res = await fetch(deleteUrl, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || "Failed to delete master entry");
      toast.success("Master Entry Deleted Successfully");
      setDeleteTarget(null);
      fetchMasterData(activeItem);
    } catch (err) {
      toast.error("Error deleting master entry", { description: err.message });
    } finally {
      setDeleteLoading(false);
    }
  };

  const currentSystem = SYSTEM_REGISTRY[activeItem] || { label: activeItem };
  const currentSystemLabel = currentSystem.label || activeItem;

  // Adapt labels per system for non-purchase systems
  const card1Title = activeItem === "checklist" ? "Users & Doers" : activeItem === "production" ? "Supervisors & Staff" : activeItem === "services" ? "Departments" : "Vendors & Parties";
  const card1BtnLabel = activeItem === "checklist" ? "User" : activeItem === "production" ? "Supervisor" : activeItem === "services" ? "Department" : "Vendor";

  const card2Title = activeItem === "services" ? "FMS Dropdowns" : activeItem === "payment" ? "FMS Masters" : activeItem === "checklist" ? "Assigners" : "Transporters & Logistics";
  const card2BtnLabel = activeItem === "services" ? "FMS Dropdown" : activeItem === "payment" ? "FMS Master" : activeItem === "checklist" ? "Assigner" : "Transporter";

  const card3Title = activeItem === "repair" ? "Machines & Assets" : activeItem === "payment" ? "Funding Channels" : "Products & Materials";
  const card3BtnLabel = activeItem === "repair" ? "Machine / Asset" : activeItem === "payment" ? "Funding Channel" : "Product / Material";

  return (
    <div className="w-full pb-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Settings sub-sidebar */}
        <aside className="md:w-64 shrink-0">
          <nav className="p-2 rounded-2xl bg-white dark:bg-card border border-zinc-200/80 dark:border-border shadow-xs space-y-1">
            {visibleNavSections.map((section) => {
              const SectionIcon = section.icon;
              const isSectionActive = activeSection === section.id;
              return (
                <div key={section.id} className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => selectSection(section)}
                    className={`w-full flex items-center justify-between h-10 px-3 rounded-xl text-sm font-semibold transition-all ${
                      isSectionActive
                        ? "bg-zinc-100 dark:bg-secondary text-zinc-900 dark:text-white"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <SectionIcon className={`w-4 h-4 shrink-0 ${isSectionActive ? "text-[#10b981]" : "text-zinc-400"}`} />
                      <span>{section.label}</span>
                    </div>
                  </button>

                  {isSectionActive && (
                    <div className="mt-1 mb-2 ml-4 pl-3.5 border-l-2 border-zinc-200 dark:border-border space-y-1">
                      {section.items.map((item) => {
                        const isItemActive = activeItem === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setActiveItem(item.id)}
                            className={`w-full text-left flex items-center h-8.5 px-3 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                              isItemActive
                                ? "bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold"
                                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-muted/30"
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Content area */}
        <main className="flex-1 min-w-0">
          {activeSection === "profile" && activeItem === "my-profile" && <ProfileTab />}

          {activeSection === "user-management" && activeItem === "manage-users" && (
            <AuthProvider>
              <ManageUsers />
            </AuthProvider>
          )}

          {activeSection === "systems" && (
            <div className="space-y-6">
              {!activeCategories && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      {currentSystemLabel} Master Data
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Configure master values, vendors, logistics, and parameters for {currentSystemLabel}.
                    </p>
                  </div>
                  {canAddEntry && activeItem !== "freight-payment" && (
                    <Button
                      onClick={() =>
                        openAddModal(
                          activeItem === "inventory"
                            ? "raw_material"
                            : "vendor"
                        )
                      }
                      className="bg-[#2fa36b] hover:bg-[#278f5d] dark:bg-[#5ec792] dark:hover:bg-[#4fb984] text-white dark:text-zinc-900 rounded-full px-4 text-xs font-medium flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Master Entry ({currentSystemLabel})
                    </Button>
                  )}
                </div>
              )}

              {activeCategories ? (
                <CategoryTabSection
                  categories={activeCategories}
                  systemLabel={currentSystemLabel}
                  activeCategoryTab={activeCategoryTab}
                  setActiveCategoryTab={setActiveCategoryTab}
                  categorySearch={categorySearch}
                  setCategorySearch={setCategorySearch}
                  masterRows={masterRows}
                  tlRows={tlRows}
                  firms={firms}
                  masterDataLoading={masterDataLoading}
                  firmsLoading={firmsLoading}
                  canAddEntry={canAddEntry}
                  openAddModal={openAddModal}
                  openEditModal={openEditModal}
                  setDeleteTarget={setDeleteTarget}
                />
              ) : activeItem === "inventory" ? (
                /* Inventory System: 3 Category Tables — each backed by its own real CRUD
                   endpoint (raw-material / finished-goods / trading-material), not the
                   generic 3-card Vendor/Transporter/Product fallback below. */
                <div className="space-y-6">
                  {INVENTORY_CATEGORIES.map((cat) => {
                    const CategoryIcon = cat.icon;
                    const items = masterRows
                      .filter(cat.filter)
                      .map((r) => ({
                        id: r.id,
                        name: cat.getName(r) || "—",
                        raw: r,
                      }));

                    return (
                      <Card key={cat.id} className="border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <CategoryIcon className="h-4 w-4 text-[#2fa36b]" />
                            {cat.title}
                          </CardTitle>
                          <CardDescription>{cat.description}</CardDescription>
                          {canAddEntry && (
                            <CardAction>
                              <Button
                                size="sm"
                                onClick={() => openAddModal(cat.id)}
                                className="bg-[#2fa36b] hover:bg-[#278f5d] dark:bg-[#5ec792] dark:hover:bg-[#4fb984] text-white dark:text-zinc-900 rounded-full px-4 text-xs font-medium flex items-center gap-1.5 shadow-sm"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Add {cat.btnLabel}
                              </Button>
                            </CardAction>
                          )}
                        </CardHeader>
                        <CardContent className="p-0">
                          <div className="flex items-center justify-between px-6 py-3 bg-zinc-50/50 dark:bg-zinc-900/50 border-y border-zinc-100 dark:border-zinc-800">
                            <span className="text-sm font-medium">{cat.title}</span>
                            <Badge variant="outline" className="bg-white dark:bg-zinc-900">
                              Total: {items.length}
                            </Badge>
                          </div>
                          <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
                            <Table>
                              <TableHeader className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-900">
                                <TableRow>
                                  <TableHead className="whitespace-nowrap px-6 font-semibold">Firm</TableHead>
                                  <TableHead className="whitespace-nowrap px-6 font-semibold">{cat.columnHeader}</TableHead>
                                  <TableHead className="w-[120px] text-right pr-6 whitespace-nowrap font-semibold">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {masterDataLoading ? (
                                  <LoadingRows colSpan={3} />
                                ) : items.length > 0 ? (
                                  items.map((row, idx) => (
                                    <TableRow key={row.id || idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50">
                                      <TableCell className="text-zinc-500 dark:text-zinc-400 whitespace-nowrap px-6 py-3.5">
                                        {row.raw.firmName || "—"}
                                      </TableCell>
                                      <TableCell className="font-medium text-zinc-900 dark:text-white whitespace-nowrap px-6 py-3.5">
                                        {row.name}
                                        {cat.id === "raw_material" && row.raw.unit ? (
                                          <span className="text-zinc-400 dark:text-zinc-500 font-normal"> · {row.raw.unit}</span>
                                        ) : null}
                                      </TableCell>
                                      <TableCell className="text-right pr-6 py-3.5">
                                        {canAddEntry && (
                                          <div className="flex items-center justify-end gap-1">
                                            {cat.id === "raw_material" && (
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                                                onClick={() => openEditModal(cat.id, row)}
                                                title="Edit unit"
                                              >
                                                <Pencil className="h-4 w-4" />
                                                <span className="sr-only">Edit</span>
                                              </Button>
                                            )}
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                              onClick={() => setDeleteTarget(row)}
                                              title="Delete entry"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                              <span className="sr-only">Delete</span>
                                            </Button>
                                          </div>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))
                                ) : (
                                  <EmptyRow
                                    colSpan={3}
                                    label={`No ${cat.title.toLowerCase()} added yet for Inventory`}
                                  />
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : activeItem === "freight-payment" ? (
                /* Freight Payment has no dropdown/master-data concept of its own — its firm
                   and rate-type options are hardcoded in the freight entry form, both in this
                   merged app and in the original reference app (_reference/FreightPaymnetPassary).
                   The generic fallback below reuses /freight-payment/master, which the backend
                   aliases to the *freight entry* CRUD (src/freightpayment/routes.js), so wiring
                   "Add Master Entry" here would silently create bogus freight-payment entries
                   instead of any kind of dropdown value — so it's disabled rather than shown. */
                <Card className="border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <CardContent className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    Freight Payment has no master/dropdown data to manage here — its firm and rate options
                    are fixed within the Freight Payment application itself.
                  </CardContent>
                </Card>
              ) : (
                /* Payment / Repair only at this point — every system with a real,
                   verified master-data category list renders via CategoryTabSection
                   above; Inventory and Freight Payment have their own branches above
                   too. This generic 3-card Vendor/Transporter/Product fallback is what's
                   left for the two systems that don't have one yet. */
                <div className="space-y-6">
                  {/* Card 1: Vendors / Parties */}
                  <Card className="border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Warehouse className="h-4 w-4 text-[#2fa36b]" />
                        {currentSystemLabel} - {card1Title}
                      </CardTitle>
                      <CardDescription>
                        Manage {card1Title.toLowerCase()} records for {currentSystemLabel}.
                      </CardDescription>
                      {canAddEntry && (
                        <CardAction>
                          <Button
                            size="sm"
                            onClick={() => openAddModal("vendor")}
                            className="bg-[#2fa36b] hover:bg-[#278f5d] dark:bg-[#5ec792] dark:hover:bg-[#4fb984] text-white dark:text-zinc-900 rounded-full px-4 text-xs font-medium flex items-center gap-1.5 shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add {card1BtnLabel}
                          </Button>
                        </CardAction>
                      )}
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between px-6 py-3 bg-zinc-50/50 dark:bg-zinc-900/50 border-y border-zinc-100 dark:border-zinc-800">
                        <span className="text-sm font-medium">{card1Title}</span>
                        <Badge variant="outline" className="bg-white dark:bg-zinc-900">
                          Total: {vendorList.length}
                        </Badge>
                      </div>
                      <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
                        <Table>
                          <TableHeader className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-900">
                            <TableRow>
                              <TableHead className="whitespace-nowrap px-6 font-semibold">Name / Entity</TableHead>
                              <TableHead className="whitespace-nowrap px-6 font-semibold">Details / Info</TableHead>
                              <TableHead className="w-[120px] text-right pr-6 whitespace-nowrap font-semibold">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {masterDataLoading ? (
                              <LoadingRows colSpan={3} />
                            ) : vendorList.length > 0 ? (
                              vendorList.map((row, idx) => (
                                <TableRow key={row.id || idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50">
                                  <TableCell className="font-medium text-zinc-900 dark:text-white whitespace-nowrap px-6 py-3.5">
                                    {row.name || "—"}
                                  </TableCell>
                                  <TableCell className="text-zinc-500 dark:text-zinc-400 whitespace-nowrap px-6 py-3.5">
                                    {row.details || "—"}
                                  </TableCell>
                                  <TableCell className="text-right pr-6 py-3.5">
                                    {canAddEntry && (
                                      <div className="flex items-center justify-end gap-1">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                                          onClick={() => openEditModal("vendor", row)}
                                          title="Edit entry"
                                        >
                                          <Pencil className="h-4 w-4" />
                                          <span className="sr-only">Edit</span>
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                          onClick={() => setDeleteTarget(row)}
                                          title="Delete entry"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          <span className="sr-only">Delete</span>
                                        </Button>
                                      </div>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <EmptyRow
                                colSpan={3}
                                label={`No ${card1Title.toLowerCase()} added yet for ${currentSystemLabel}`}
                              />
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card 2: Transporters / Logistics */}
                  <Card className="border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Truck className="h-4 w-4 text-[#2fa36b]" />
                        {card2Title}
                      </CardTitle>
                      <CardDescription>
                        Manage {card2Title.toLowerCase()} records for {currentSystemLabel}.
                      </CardDescription>
                      {canAddEntry && (
                        <CardAction>
                          <Button
                            size="sm"
                            onClick={() => openAddModal("transporter")}
                            className="bg-[#2fa36b] hover:bg-[#278f5d] dark:bg-[#5ec792] dark:hover:bg-[#4fb984] text-white dark:text-zinc-900 rounded-full px-4 text-xs font-medium flex items-center gap-1.5 shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add {card2BtnLabel}
                          </Button>
                        </CardAction>
                      )}
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between px-6 py-3 bg-zinc-50/50 dark:bg-zinc-900/50 border-y border-zinc-100 dark:border-zinc-800">
                        <span className="text-sm font-medium">{card2Title}</span>
                        <Badge variant="outline" className="bg-white dark:bg-zinc-900">
                          Total: {transporterList.length}
                        </Badge>
                      </div>
                      <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
                        <Table>
                          <TableHeader className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-900">
                            <TableRow>
                              <TableHead className="whitespace-nowrap px-6 font-semibold">Name / Parameter</TableHead>
                              <TableHead className="whitespace-nowrap px-6 font-semibold">Type / Category</TableHead>
                              <TableHead className="w-[120px] text-right pr-6 whitespace-nowrap font-semibold">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {masterDataLoading ? (
                              <LoadingRows colSpan={3} />
                            ) : transporterList.length > 0 ? (
                              transporterList.map((row, idx) => (
                                <TableRow key={row.id || idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50">
                                  <TableCell className="font-medium text-zinc-900 dark:text-white whitespace-nowrap px-6 py-3.5">
                                    {row.name || "—"}
                                  </TableCell>
                                  <TableCell className="text-zinc-500 dark:text-zinc-400 whitespace-nowrap px-6 py-3.5">
                                    {row.details || "—"}
                                  </TableCell>
                                  <TableCell className="text-right pr-6 py-3.5">
                                    {canAddEntry && (
                                      <div className="flex items-center justify-end gap-1">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                                          onClick={() => openEditModal("transporter", row)}
                                          title="Edit entry"
                                        >
                                          <Pencil className="h-4 w-4" />
                                          <span className="sr-only">Edit</span>
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                          onClick={() => setDeleteTarget(row)}
                                          title="Delete entry"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          <span className="sr-only">Delete</span>
                                        </Button>
                                      </div>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <EmptyRow
                                colSpan={3}
                                label={`No ${card2Title.toLowerCase()} added yet for ${currentSystemLabel}`}
                              />
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card 3: Products / Materials */}
                  <Card className="border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Package className="h-4 w-4 text-[#2fa36b]" />
                        {card3Title}
                      </CardTitle>
                      <CardDescription>
                        Configure {card3Title.toLowerCase()} parameters for {currentSystemLabel}.
                      </CardDescription>
                      {canAddEntry && (
                        <CardAction>
                          <Button
                            size="sm"
                            onClick={() => openAddModal("raw_material")}
                            className="bg-[#2fa36b] hover:bg-[#278f5d] dark:bg-[#5ec792] dark:hover:bg-[#4fb984] text-white dark:text-zinc-900 rounded-full px-4 text-xs font-medium flex items-center gap-1.5 shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add {card3BtnLabel}
                          </Button>
                        </CardAction>
                      )}
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between px-6 py-3 bg-zinc-50/50 dark:bg-zinc-900/50 border-y border-zinc-100 dark:border-zinc-800">
                        <span className="text-sm font-medium">{card3Title}</span>
                        <Badge variant="outline" className="bg-white dark:bg-zinc-900">
                          Total: {productList.length}
                        </Badge>
                      </div>
                      <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
                        <Table>
                          <TableHeader className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-900">
                            <TableRow>
                              <TableHead className="whitespace-nowrap px-6 font-semibold">Product / Material Name</TableHead>
                              <TableHead className="whitespace-nowrap px-6 font-semibold">Details / Configuration</TableHead>
                              <TableHead className="w-[120px] text-right pr-6 whitespace-nowrap font-semibold">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {masterDataLoading ? (
                              <LoadingRows colSpan={3} />
                            ) : productList.length > 0 ? (
                              productList.map((row, idx) => (
                                <TableRow key={row.id || idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50">
                                  <TableCell className="font-medium text-zinc-900 dark:text-white whitespace-nowrap px-6 py-3.5">
                                    {row.name || "—"}
                                  </TableCell>
                                  <TableCell className="text-zinc-500 dark:text-zinc-400 whitespace-nowrap px-6 py-3.5">
                                    {row.details || "—"}
                                  </TableCell>
                                  <TableCell className="text-right pr-6 py-3.5">
                                    {canAddEntry && (
                                      <div className="flex items-center justify-end gap-1">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                                          onClick={() => openEditModal("raw_material", row)}
                                          title="Edit entry"
                                        >
                                          <Pencil className="h-4 w-4" />
                                          <span className="sr-only">Edit</span>
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                          onClick={() => setDeleteTarget(row)}
                                          title="Delete entry"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          <span className="sr-only">Delete</span>
                                        </Button>
                                      </div>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <EmptyRow
                                colSpan={3}
                                label={`No ${card3Title.toLowerCase()} added yet for ${currentSystemLabel}`}
                              />
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <MasterEntrySheet
        isOpen={isMasterModalOpen}
        onOpenChange={setIsMasterModalOpen}
        modalMode={modalMode}
        modalCategory={modalCategory}
        setModalCategory={setModalCategory}
        masterFormData={masterFormData}
        setMasterFormData={setMasterFormData}
        activeItem={activeItem}
        currentSystemLabel={currentSystemLabel}
        purchaseFirms={purchaseFirms}
        onSubmit={handleMasterSubmit}
        submitLoading={masterSubmitLoading}
      />

      <DeleteConfirmDialog
        deleteTarget={deleteTarget}
        setDeleteTarget={setDeleteTarget}
        deleteLoading={deleteLoading}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
