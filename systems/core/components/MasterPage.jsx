'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  UserCog,
  Building2,
  Warehouse,
  Truck,
  Package,
  Users as UsersIcon,
  Camera,
  Sun,
  Moon,
  Plus,
  Pencil,
  Trash2,
  FileText,
  Tags,
  MapPin,
  CreditCard,
  Scale,
  ShieldCheck,
  Layers,
  UserCheck,
  Sliders,
} from 'lucide-react';
import { toast } from 'sonner';
import { useOutletContext } from 'react-router-dom';
import { API_URL, getToken, getStoredUser } from '@/lib/auth';
import { AuthProvider } from '../../purchase/context/AuthContext';
import ManageUsers from '../../purchase/components/ManageUsers';
import { SYSTEM_REGISTRY, parseUserPermissions } from '../config/systemRegistry';

const EMPTY_MASTER_FORM = {
  type: "Vendor Name",
  vendorName: "",
  vendorNameKyc: "",
  typeOfKycForm: "",
  firmName: "PMMPL",
  gstNumber: "",
  phoneNumber: "",
  email: "",
  bankAccountNo: "",
  ifscCode: "",
  transporterName: "",
  transporterName2: "",
  materialReturnTransporterName: "",
  rateType: "",
  typeOfRate: "",
  rawMaterialName: "",
  productName: "",
  itemName: "",
  uom: "MT",
  fmsName: "",
  department: "",
  groupHead: "",
  machineName: "",
  typeOfIndent: "",
  areaLifting: "",
  paymentTerm: "",
  generatedBy: "",
  aluminaRange: "",
  ironRange: "",
  apRange: "",
  bdRange: "",
  partyName: "",
  address: "",
  customerCategory: "",
  typeOfPi: "",
  marketingSalesPerson: "",
  nameOfRawMaterial: "",
  finishedGoodsName: "",
  crushingProductName: "",
  materialName: "",
  supervisorName: "",
  sfSupervisorName: "",
  testedBy: "",
  flowOfMaterial: "",
  shift: "",
  priority: "",
  status: "",
  testStatus: "",
  category: "",
  groupName: "",
  areaOfUse: "",
  defaultTerms: "",
  where: "",
  vendorGstin: "",
  vendorAddress: "",
  vendorEmail: "",
  companyName: "",
  companyAddress: "",
  companyGstin: "",
  companyPhone: "",
  companyPan: "",
  billingAddress: "",
  destinationAddress: "",
  transportType: "",
  doerName: "",
  givenBy: "",
  role: "",
  firm: "PMMPL",
};

const PURCHASE_CATEGORIES = [
  {
    id: "vendor",
    title: "Vendors & Parties",
    description: "Manage vendor and supplier records for Purchase.",
    icon: Warehouse,
    btnLabel: "Vendor",
    columnHeader: "Vendor Name",
    typeValue: "Vendor Name",
    filter: (r) => Boolean(r.vendorName),
    getName: (r) => r.vendorName,
  },
  {
    id: "transporter",
    title: "Transporters & Logistics",
    description: "Manage transporter and logistics records for Purchase.",
    icon: Truck,
    btnLabel: "Transporter",
    columnHeader: "Transporter Name",
    typeValue: "Transporter Name",
    filter: (r) => Boolean(r.transporterName),
    getName: (r) => r.transporterName,
  },
  {
    id: "raw_material",
    title: "Raw Materials & Products",
    description: "Configure raw materials and product parameters for Purchase.",
    icon: Package,
    btnLabel: "Raw Material",
    columnHeader: "Raw Material / Product",
    typeValue: "Raw Material",
    filter: (r) => Boolean(r.rawMaterialName || r.productName),
    getName: (r) => r.rawMaterialName || r.productName,
  },
  {
    id: "firm",
    title: "Firms",
    description: "Manage participating company firms for Purchase.",
    icon: Building2,
    btnLabel: "Firm",
    columnHeader: "Firm Name",
    typeValue: "Firm Name",
    filter: (r) => Boolean(r.firmName),
    getName: (r) => r.firmName,
  },
  {
    id: "indent_type",
    title: "Indent Types",
    description: "Manage types of indents (e.g. Raw Purchase, Trading Purchase).",
    icon: FileText,
    btnLabel: "Indent Type",
    columnHeader: "Indent Type",
    typeValue: "Type Of Indent",
    filter: (r) => Boolean(r.typeOfIndent),
    getName: (r) => r.typeOfIndent,
  },
  {
    id: "rate_type",
    title: "Rate Types",
    description: "Manage pricing and freight rate calculation types.",
    icon: Tags,
    btnLabel: "Rate Type",
    columnHeader: "Rate Type",
    typeValue: "Rate Type",
    filter: (r) => Boolean(r.rateType || r.typeOfRate),
    getName: (r) => r.rateType || r.typeOfRate,
  },
  {
    id: "area_lifting",
    title: "Area Lifting / Delivery Locations",
    description: "Manage area lifting and delivery destination categories.",
    icon: MapPin,
    btnLabel: "Area Lifting",
    columnHeader: "Area Lifting",
    typeValue: "Area Lifting",
    filter: (r) => Boolean(r.areaLifting),
    getName: (r) => r.areaLifting,
  },
  {
    id: "payment_term",
    title: "Payment Terms",
    description: "Manage standard payment terms and billing conditions.",
    icon: CreditCard,
    btnLabel: "Payment Term",
    columnHeader: "Payment Term",
    typeValue: "Payment Term",
    filter: (r) => Boolean(r.paymentTerm),
    getName: (r) => r.paymentTerm,
  },
  {
    id: "uom",
    title: "Units of Measurement (UOM)",
    description: "Manage measurement units for materials and items.",
    icon: Scale,
    btnLabel: "UOM",
    columnHeader: "Unit of Measurement",
    typeValue: "UOM",
    filter: (r) => Boolean(r.uom),
    getName: (r) => r.uom,
  },
  {
    id: "kyc_form",
    title: "KYC Form Types",
    description: "Manage KYC classification categories.",
    icon: ShieldCheck,
    btnLabel: "KYC Form Type",
    columnHeader: "KYC Form Type",
    typeValue: "Type Of KYC Form",
    filter: (r) => Boolean(r.typeOfKycForm),
    getName: (r) => r.typeOfKycForm,
  },
  {
    id: "fms_name",
    title: "FMS Names",
    description: "Manage FMS system master identifiers.",
    icon: Layers,
    btnLabel: "FMS Name",
    columnHeader: "FMS Name",
    typeValue: "Fms Name",
    filter: (r) => Boolean(r.fmsName),
    getName: (r) => r.fmsName,
  },
  {
    id: "generated_by",
    title: "Generated By (Requesters)",
    description: "Manage authorized indent generators and requesters.",
    icon: UserCheck,
    btnLabel: "Generated By",
    columnHeader: "Requester / Creator Name",
    typeValue: "Generated By",
    filter: (r) => Boolean(r.generatedBy),
    getName: (r) => r.generatedBy,
  },
  {
    id: "entry_type",
    title: "Entry Classification / Types",
    description: "Manage master entry classification categories (e.g. Common, Independent).",
    icon: Sliders,
    btnLabel: "Entry Type",
    columnHeader: "Entry Type",
    typeValue: "Type",
    filter: (r) => Boolean(r.type),
    getName: (r) => r.type,
  },
];

const ORDER_CATEGORIES = [
  {
    id: "party",
    title: "Customers & Parties",
    description: "Manage customer, client, and party records for Order.",
    icon: Warehouse,
    btnLabel: "Customer / Party",
    columnHeader: "Party Name",
    typeValue: "Party Name",
    filter: (r) => Boolean(r.partyName),
    getName: (r) => r.partyName,
  },
  {
    id: "transporter",
    title: "Transporters & Logistics",
    description: "Manage transporter and logistics providers for Order.",
    icon: Truck,
    btnLabel: "Transporter",
    columnHeader: "Transporter Name",
    typeValue: "Transporter Name",
    filter: (r) => Boolean(r.transporterName),
    getName: (r) => r.transporterName,
  },
  {
    id: "material_return_transporter",
    title: "Material Return Transporters",
    description: "Manage return logistics transporters for Order.",
    icon: Truck,
    btnLabel: "Return Transporter",
    columnHeader: "Material Return Transporter Name",
    typeValue: "Material Return Transporter Name",
    filter: (r) => Boolean(r.materialReturnTransporterName),
    getName: (r) => r.materialReturnTransporterName,
  },
  {
    id: "product",
    title: "Products & Materials",
    description: "Manage product catalogue and item configurations for Order.",
    icon: Package,
    btnLabel: "Product",
    columnHeader: "Product Name",
    typeValue: "Product Name",
    filter: (r) => Boolean(r.productName),
    getName: (r) => r.productName,
  },
  {
    id: "sales_person",
    title: "Marketing & Sales Persons",
    description: "Manage sales coordinators and marketing representatives for Order.",
    icon: UserCheck,
    btnLabel: "Sales Person",
    columnHeader: "Marketing Sales Person",
    typeValue: "Marketing Sales Person",
    filter: (r) => Boolean(r.marketingSalesPerson),
    getName: (r) => r.marketingSalesPerson,
  },
  {
    id: "pi_type",
    title: "PI Types (Type of PI)",
    description: "Manage Proforma Invoice payment conditions and types.",
    icon: FileText,
    btnLabel: "PI Type",
    columnHeader: "Type of PI",
    typeValue: "Type of PI",
    filter: (r) => Boolean(r.typeOfPi),
    getName: (r) => r.typeOfPi,
  },
  {
    id: "customer_category",
    title: "Customer Categories",
    description: "Manage customer classifications and priority categories.",
    icon: Tags,
    btnLabel: "Customer Category",
    columnHeader: "Customer Category",
    typeValue: "Customer Category",
    filter: (r) => Boolean(r.customerCategory),
    getName: (r) => r.customerCategory,
  },
  {
    id: "uom",
    title: "Units of Measurement (UOM)",
    description: "Manage measurement units for order items.",
    icon: Scale,
    btnLabel: "UOM",
    columnHeader: "Unit of Measurement",
    typeValue: "UOM",
    filter: (r) => Boolean(r.uom),
    getName: (r) => r.uom,
  },
];

const PRODUCTION_CATEGORIES = [
  {
    id: "raw_material",
    title: "Raw Materials",
    description: "Manage raw material master items for Production.",
    icon: Package,
    btnLabel: "Raw Material",
    columnHeader: "Name of Raw Material",
    typeValue: "Raw Material",
    filter: (r) => Boolean(r.nameOfRawMaterial),
    getName: (r) => r.nameOfRawMaterial,
  },
  {
    id: "finished_goods",
    title: "Finished Goods",
    description: "Manage finished goods product catalog for Production.",
    icon: Package,
    btnLabel: "Finished Good",
    columnHeader: "Finished Goods Name",
    typeValue: "Finished Goods",
    filter: (r) => Boolean(r.finishedGoodsName),
    getName: (r) => r.finishedGoodsName,
  },
  {
    id: "crushing_product",
    title: "Crushing Products",
    description: "Manage crushing product types and output configurations.",
    icon: Package,
    btnLabel: "Crushing Product",
    columnHeader: "Crushing Product Name",
    typeValue: "Crushing Product",
    filter: (r) => Boolean(r.crushingProductName),
    getName: (r) => r.crushingProductName,
  },
  {
    id: "material",
    title: "General Materials",
    description: "Manage general materials and composition elements for Production.",
    icon: Layers,
    btnLabel: "Material",
    columnHeader: "Material Name",
    typeValue: "Material",
    filter: (r) => Boolean(r.materialName),
    getName: (r) => r.materialName,
  },
  {
    id: "supervisor",
    title: "Supervisors",
    description: "Manage production supervisors and shift managers.",
    icon: UserCheck,
    btnLabel: "Supervisor",
    columnHeader: "Supervisor Name",
    typeValue: "Supervisor",
    filter: (r) => Boolean(r.supervisorName),
    getName: (r) => r.supervisorName,
  },
  {
    id: "sf_supervisor",
    title: "SF Supervisors",
    description: "Manage SF production supervisor staff.",
    icon: UserCheck,
    btnLabel: "SF Supervisor",
    columnHeader: "SF Supervisor Name",
    typeValue: "SF Supervisor",
    filter: (r) => Boolean(r.sfSupervisorName),
    getName: (r) => r.sfSupervisorName,
  },
  {
    id: "tested_by",
    title: "Tested By (QC Testers)",
    description: "Manage QC testing personnel and laboratory in-charge names.",
    icon: ShieldCheck,
    btnLabel: "Tester",
    columnHeader: "Tested By",
    typeValue: "Tested By",
    filter: (r) => Boolean(r.testedBy),
    getName: (r) => r.testedBy,
  },
  {
    id: "shift",
    title: "Shifts",
    description: "Manage production shift timings and schedules.",
    icon: Sliders,
    btnLabel: "Shift",
    columnHeader: "Shift",
    typeValue: "Shift",
    filter: (r) => Boolean(r.shift),
    getName: (r) => r.shift,
  },
  {
    id: "priority",
    title: "Priorities",
    description: "Manage production order priority levels.",
    icon: Tags,
    btnLabel: "Priority",
    columnHeader: "Priority",
    typeValue: "Priority",
    filter: (r) => Boolean(r.priority),
    getName: (r) => r.priority,
  },
  {
    id: "flow_of_material",
    title: "Flow of Material",
    description: "Manage material flow classifications and status indicators.",
    icon: Sliders,
    btnLabel: "Flow of Material",
    columnHeader: "Flow of Material",
    typeValue: "Flow of Material",
    filter: (r) => Boolean(r.flowOfMaterial),
    getName: (r) => r.flowOfMaterial,
  },
  {
    id: "status",
    title: "Statuses",
    description: "Manage operational status values for production tasks.",
    icon: Sliders,
    btnLabel: "Status",
    columnHeader: "Status",
    typeValue: "Status",
    filter: (r) => Boolean(r.status),
    getName: (r) => r.status,
  },
  {
    id: "test_status",
    title: "Test Statuses",
    description: "Manage laboratory QC test result statuses.",
    icon: ShieldCheck,
    btnLabel: "Test Status",
    columnHeader: "Test Status",
    typeValue: "Test Status",
    filter: (r) => Boolean(r.testStatus),
    getName: (r) => r.testStatus,
  },
];

const STORE_CATEGORIES = [
  {
    id: "item",
    title: "Items & Products",
    description: "Manage store catalog items, inventory descriptions, and units.",
    icon: Package,
    btnLabel: "Item",
    columnHeader: "Item Name",
    typeValue: "Item",
    filter: (r) => Boolean(r.itemName),
    getName: (r) => r.itemName,
  },
  {
    id: "category",
    title: "Item Categories",
    description: "Manage classification categories for store items.",
    icon: Layers,
    btnLabel: "Category",
    columnHeader: "Category",
    typeValue: "Category",
    filter: (r) => Boolean(r.category),
    getName: (r) => r.category,
  },
  {
    id: "group_name",
    title: "Item Groups",
    description: "Manage group groupings for store inventory.",
    icon: Tags,
    btnLabel: "Group",
    columnHeader: "Group Name",
    typeValue: "Group",
    filter: (r) => Boolean(r.groupName),
    getName: (r) => r.groupName,
  },
  {
    id: "uom",
    title: "Units of Measurement (UOM)",
    description: "Manage units of measurement for store items.",
    icon: Scale,
    btnLabel: "UOM",
    columnHeader: "Unit of Measurement",
    typeValue: "UOM",
    filter: (r) => Boolean(r.uom),
    getName: (r) => r.uom,
  },
  {
    id: "vendor",
    title: "Vendors & Suppliers",
    description: "Manage vendors, suppliers, and contractor contacts.",
    icon: Warehouse,
    btnLabel: "Vendor",
    columnHeader: "Vendor Name",
    typeValue: "Vendor",
    filter: (r) => Boolean(r.vendorName),
    getName: (r) => r.vendorName,
  },
  {
    id: "company",
    title: "Companies",
    description: "Manage registered company and enterprise profiles.",
    icon: Building2,
    btnLabel: "Company",
    columnHeader: "Company Name",
    typeValue: "Company",
    filter: (r) => Boolean(r.companyName),
    getName: (r) => r.companyName,
  },
  {
    id: "department",
    title: "Departments",
    description: "Manage internal requisitioning departments.",
    icon: Building2,
    btnLabel: "Department",
    columnHeader: "Department",
    typeValue: "Department",
    filter: (r) => Boolean(r.department),
    getName: (r) => r.department,
  },
  {
    id: "area_of_use",
    title: "Areas of Use",
    description: "Manage designated application areas and usage locations.",
    icon: MapPin,
    btnLabel: "Area of Use",
    columnHeader: "Area of Use",
    typeValue: "Area of Use",
    filter: (r) => Boolean(r.areaOfUse),
    getName: (r) => r.areaOfUse,
  },
  {
    id: "where",
    title: "Locations & Where",
    description: "Manage storage locations and bin placements.",
    icon: MapPin,
    btnLabel: "Location",
    columnHeader: "Where / Location",
    typeValue: "Location",
    filter: (r) => Boolean(r.where),
    getName: (r) => r.where,
  },
  {
    id: "fms_name",
    title: "FMS Master",
    description: "Manage follow-up management system dropdown targets.",
    icon: Sliders,
    btnLabel: "FMS Name",
    columnHeader: "FMS Name",
    typeValue: "FMS Name",
    filter: (r) => Boolean(r.fmsName),
    getName: (r) => r.fmsName,
  },
  {
    id: "payment_term",
    title: "Payment Terms",
    description: "Manage commercial credit terms and conditions.",
    icon: CreditCard,
    btnLabel: "Payment Term",
    columnHeader: "Payment Term",
    typeValue: "Payment Term",
    filter: (r) => Boolean(r.paymentTerm),
    getName: (r) => r.paymentTerm,
  },
  {
    id: "address",
    title: "Addresses",
    description: "Manage billing and destination delivery addresses.",
    icon: MapPin,
    btnLabel: "Address",
    columnHeader: "Billing / Destination Address",
    typeValue: "Address",
    filter: (r) => Boolean(r.billingAddress || r.destinationAddress),
    getName: (r) => r.billingAddress || r.destinationAddress,
  },
];

const RMSALES_CATEGORIES = [
  {
    id: "party",
    title: "Customers & Parties",
    description: "Manage RM sales customers, buyers, and client parties.",
    icon: Warehouse,
    btnLabel: "Party",
    columnHeader: "Party Name",
    typeValue: "Party",
    filter: (r) => Boolean(r.partyName),
    getName: (r) => r.partyName,
  },
  {
    id: "product",
    title: "Products & Materials",
    description: "Manage raw materials and sellable inventory products.",
    icon: Package,
    btnLabel: "Product",
    columnHeader: "Product Name",
    typeValue: "Product",
    filter: (r) => Boolean(r.productName),
    getName: (r) => r.productName,
  },
  {
    id: "transport",
    title: "Transport Types",
    description: "Manage dispatch logistics methods and delivery freight types.",
    icon: Truck,
    btnLabel: "Transport Type",
    columnHeader: "Transport Type",
    typeValue: "Transport",
    filter: (r) => Boolean(r.transportType),
    getName: (r) => r.transportType,
  },
];

const SERVICES_CATEGORIES = [
  {
    id: "department",
    title: "Departments",
    description: "Manage operational service departments.",
    icon: Building2,
    btnLabel: "Department",
    columnHeader: "Department",
    typeValue: "Department",
    filter: (r) => Boolean(r.department),
    getName: (r) => r.department,
  },
  {
    id: "group_head",
    title: "Group Heads",
    description: "Manage group heads and designated department leads.",
    icon: UserCheck,
    btnLabel: "Group Head",
    columnHeader: "Group Head",
    typeValue: "Group Head",
    filter: (r) => Boolean(r.groupHead),
    getName: (r) => r.groupHead,
  },
  {
    id: "fms_name",
    title: "FMS Master",
    description: "Manage FMS process dropdown mappings for Services.",
    icon: Sliders,
    btnLabel: "FMS Name",
    columnHeader: "FMS Name",
    typeValue: "FMS Name",
    filter: (r) => Boolean(r.fmsName),
    getName: (r) => r.fmsName,
  },
];

const CHECKLIST_CATEGORIES = [
  {
    id: "doer",
    title: "Doers / Assignees",
    description: "Manage doers and assignees responsible for checklist tasks.",
    icon: UsersIcon,
    btnLabel: "Doer",
    columnHeader: "Doer Name",
    typeValue: "Doer",
    filter: (r) => Boolean(r.doerName),
    getName: (r) => r.doerName,
  },
  {
    id: "given_by",
    title: "Assigners (Given By)",
    description: "Manage assigners who delegate and assign checklist tasks.",
    icon: UserCheck,
    btnLabel: "Assigner",
    columnHeader: "Assigner Name",
    typeValue: "Assigner",
    filter: (r) => Boolean(r.givenBy),
    getName: (r) => r.givenBy,
  },
];

// Generate system items dynamically from SYSTEM_REGISTRY
const SYSTEM_NAV_ITEMS = Object.entries(SYSTEM_REGISTRY).map(([id, sys]) => ({
  id,
  label: sys.label,
}));

// Settings sub-sidebar structure
const NAV_SECTIONS = [
  {
    id: "profile",
    label: "Profile",
    icon: UserCog,
    items: [{ id: "my-profile", label: "My Profile" }],
  },
  {
    id: "user-management",
    label: "User Management",
    icon: UsersIcon,
    items: [{ id: "manage-users", label: "Manage Users" }],
  },
  {
    id: "systems",
    label: "Systems",
    icon: Building2,
    items: SYSTEM_NAV_ITEMS,
  },
];

function EmptyRow({ colSpan, label }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-32 text-center text-sm text-zinc-500 dark:text-zinc-400">
        {label}
      </TableCell>
    </TableRow>
  );
}

function LoadingRows({ colSpan, rows = 3 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          <TableCell colSpan={colSpan}>
            <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-full animate-pulse" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

// "My Profile" tab
function ProfileTab() {
  const { theme, toggleTheme } = useOutletContext();
  const storedUser = getStoredUser();
  const initial = (storedUser?.username || "?").charAt(0).toUpperCase();

  const [form, setForm] = useState({
    name: storedUser?.username || "",
    surname: "",
    email: "",
    phone: "",
  });
  const [saving, setSaving] = useState(false);

  const [pwForm, setPwForm] = useState({ next: "", confirm: "" });
  const [changingPw, setChangingPw] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Profile updated");
    }, 300);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!pwForm.next || !pwForm.confirm) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (pwForm.next.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      toast.error("New password and confirmation do not match");
      return;
    }
    setChangingPw(true);
    try {
      const res = await fetch(`${API_URL}/users/profile/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ password: pwForm.next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update password");
      
      setPwForm({ next: "", confirm: "" });
      toast.success("Password updated successfully");
    } catch (err) {
      toast.error("Error updating password", { description: err.message });
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <form onSubmit={handleSave}>
          <CardHeader>
            <CardTitle className="text-base">Profile Information</CardTitle>
            <CardDescription>Update your personal details and photo</CardDescription>
            <CardAction>
              <Button
                type="submit"
                disabled={saving}
                className="bg-[#2fa36b] hover:bg-[#278f5d] dark:bg-[#5ec792] dark:hover:bg-[#4fb984] text-white dark:text-zinc-900 rounded-full px-6"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </CardAction>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center bg-[#2fa36b] dark:bg-[#5ec792] text-white dark:text-zinc-900 text-xl font-bold shrink-0">
                {initial}
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">{storedUser?.username || "—"}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 capitalize mt-0.5">{storedUser?.role || "User"}</p>
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-xs font-medium text-[#2fa36b] dark:text-[#5ec792] hover:underline mt-2"
                >
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#2fa36b] dark:bg-[#5ec792] text-white dark:text-zinc-900">
                    <Camera className="w-3 h-3" />
                  </div>
                  Change photo
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="profileName">Name</Label>
                <Input
                  id="profileName"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profileSurname">Surname</Label>
                <Input
                  id="profileSurname"
                  placeholder="—"
                  value={form.surname}
                  onChange={(e) => setForm((f) => ({ ...f, surname: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profileEmail">Email address</Label>
              <Input
                id="profileEmail"
                type="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="profilePhone">Phone number</Label>
                <Input
                  id="profilePhone"
                  placeholder="+91 00000 00000"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profileRole">Role</Label>
                <Input id="profileRole" value={storedUser?.role || ""} disabled className="capitalize disabled:opacity-70" />
              </div>
            </div>
            
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold">Appearance</Label>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Toggle between light and dark mode.</p>
                </div>
                <Button
                  type="button"
                  onClick={toggleTheme}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {theme === 'light' ? (
                    <><Sun className="w-4 h-4" /> Light Mode</>
                  ) : (
                    <><Moon className="w-4 h-4" /> Dark Mode</>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </form>
      </Card>

      <Card>
        <form onSubmit={handlePasswordChange}>
          <CardHeader>
            <CardTitle className="text-base">Change Password</CardTitle>
            <CardDescription>Set a new password for your account</CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Enter new password"
                value={pwForm.next}
                onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={pwForm.confirm}
                onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
              />
            </div>
          </CardContent>

          <CardFooter className="border-t border-zinc-100 dark:border-zinc-800 pt-6 justify-end">
            <Button type="submit" disabled={changingPw} variant="outline">
              {changingPw && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update password
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function MasterPage() {
  const [activeSection, setActiveSection] = useState("systems");
  const [activeItem, setActiveItem] = useState("purchase");

  const storedUser = getStoredUser();
  const { isAdmin, isViewOnly } = parseUserPermissions(storedUser?.page_access, storedUser?.role);
  const canAddEntry = isAdmin && !isViewOnly;

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
      uom: raw.uom || "MT",
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
        const raw = resData.rawMaterials || rows;
        const trading = resData.tradingMaterials || [];
        const finished = resData.finishedGoods || [];
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
      if (activeItem === "order") {
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
      const url = isEdit
        ? `${API_URL}/${activeItem}/master/${editingRowId}`
        : `${API_URL}/${activeItem}/master`;
      const method = isEdit ? "PATCH" : "POST";

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
      fetchMasterData(activeItem);
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
      const res = await fetch(`${API_URL}/${activeItem}/master/${deleteTarget.id}`, {
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
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Settings</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Manage your profile, users, and system master tables.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Settings sub-sidebar */}
        <aside className="md:w-60 shrink-0">
          <nav className="space-y-1">
            {NAV_SECTIONS.map((section) => {
              const SectionIcon = section.icon;
              const isSectionActive = activeSection === section.id;
              return (
                <div key={section.id}>
                  <button
                    type="button"
                    onClick={() => selectSection(section)}
                    className={`w-full flex items-center gap-2.5 h-10 px-3 rounded-lg text-sm font-medium transition-colors ${
                      isSectionActive
                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                        : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    <SectionIcon className="w-4 h-4 shrink-0" />
                    {section.label}
                  </button>

                  {isSectionActive && (
                    <div className="mt-1 mb-2 ml-[18px] pl-4 border-l border-zinc-200 dark:border-zinc-800 space-y-0.5">
                      {section.items.map((item) => {
                        const isItemActive = activeItem === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setActiveItem(item.id)}
                            className={`w-full text-left flex items-center h-9 px-3 rounded-md text-sm transition-colors ${
                              isItemActive
                                ? "bg-[#2fa36b]/10 dark:bg-[#5ec792]/10 text-[#1b5e41] dark:text-[#a7e3c4] font-medium"
                                : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    {currentSystemLabel} Master Data
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Configure master values, vendors, logistics, and parameters for {currentSystemLabel}.
                  </p>
                </div>
                {canAddEntry && (
                  <Button
                    onClick={() =>
                      openAddModal(
                        activeItem === "order"
                          ? "party"
                          : activeItem === "production"
                          ? "raw_material"
                          : activeItem === "store"
                          ? "item"
                          : activeItem === "rm-sales"
                          ? "party"
                          : activeItem === "services"
                          ? "department"
                          : activeItem === "checklist"
                          ? "doer"
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

              {/* Purchase System: 13 Category Tables */}
              {activeItem === "purchase" ? (
                <div className="space-y-6">
                  {PURCHASE_CATEGORIES.map((cat) => {
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
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                                <TableRow>
                                  <TableHead className="whitespace-nowrap">{cat.columnHeader}</TableHead>
                                  <TableHead className="w-[100px] text-right whitespace-nowrap">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {masterDataLoading ? (
                                  <LoadingRows colSpan={2} />
                                ) : items.length > 0 ? (
                                  items.map((row, idx) => (
                                    <TableRow key={row.id || idx}>
                                      <TableCell className="font-medium text-zinc-900 dark:text-white whitespace-nowrap">
                                        {row.name}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {canAddEntry && (
                                          <div className="flex items-center justify-end gap-1">
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                                              onClick={() => openEditModal(cat.id, row)}
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
                                    colSpan={2}
                                    label={`No ${cat.title.toLowerCase()} added yet for Purchase`}
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
              ) : activeItem === "order" ? (
                /* Order System: 8 Category Tables */
                <div className="space-y-6">
                  {ORDER_CATEGORIES.map((cat) => {
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
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                                <TableRow>
                                  <TableHead className="whitespace-nowrap">{cat.columnHeader}</TableHead>
                                  <TableHead className="w-[100px] text-right whitespace-nowrap">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {masterDataLoading ? (
                                  <LoadingRows colSpan={2} />
                                ) : items.length > 0 ? (
                                  items.map((row, idx) => (
                                    <TableRow key={row.id || idx}>
                                      <TableCell className="font-medium text-zinc-900 dark:text-white whitespace-nowrap">
                                        {row.name}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {canAddEntry && (
                                          <div className="flex items-center justify-end gap-1">
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                                              onClick={() => openEditModal(cat.id, row)}
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
                                    colSpan={2}
                                    label={`No ${cat.title.toLowerCase()} added yet for Order`}
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
              ) : activeItem === "production" ? (
                /* Production System: 12 Category Tables */
                <div className="space-y-6">
                  {PRODUCTION_CATEGORIES.map((cat) => {
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
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                                <TableRow>
                                  <TableHead className="whitespace-nowrap">{cat.columnHeader}</TableHead>
                                  <TableHead className="w-[100px] text-right whitespace-nowrap">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {masterDataLoading ? (
                                  <LoadingRows colSpan={2} />
                                ) : items.length > 0 ? (
                                  items.map((row, idx) => (
                                    <TableRow key={row.id || idx}>
                                      <TableCell className="font-medium text-zinc-900 dark:text-white whitespace-nowrap">
                                        {row.name}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {canAddEntry && (
                                          <div className="flex items-center justify-end gap-1">
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                                              onClick={() => openEditModal(cat.id, row)}
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
                                    colSpan={2}
                                    label={`No ${cat.title.toLowerCase()} added yet for Production`}
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
              ) : activeItem === "store" ? (
                /* Store System: 12 Category Tables */
                <div className="space-y-6">
                  {STORE_CATEGORIES.map((cat) => {
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
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                                <TableRow>
                                  <TableHead className="whitespace-nowrap">{cat.columnHeader}</TableHead>
                                  <TableHead className="w-[100px] text-right whitespace-nowrap">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {masterDataLoading ? (
                                  <LoadingRows colSpan={2} />
                                ) : items.length > 0 ? (
                                  items.map((row, idx) => (
                                    <TableRow key={row.id || idx}>
                                      <TableCell className="font-medium text-zinc-900 dark:text-white whitespace-nowrap">
                                        {row.name}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {canAddEntry && (
                                          <div className="flex items-center justify-end gap-1">
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                                              onClick={() => openEditModal(cat.id, row)}
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
                                    colSpan={2}
                                    label={`No ${cat.title.toLowerCase()} added yet for Store`}
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
              ) : activeItem === "rm-sales" ? (
                /* RM Sales System: 3 Category Tables */
                <div className="space-y-6">
                  {RMSALES_CATEGORIES.map((cat) => {
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
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                                <TableRow>
                                  <TableHead className="whitespace-nowrap">{cat.columnHeader}</TableHead>
                                  <TableHead className="w-[100px] text-right whitespace-nowrap">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {masterDataLoading ? (
                                  <LoadingRows colSpan={2} />
                                ) : items.length > 0 ? (
                                  items.map((row, idx) => (
                                    <TableRow key={row.id || idx}>
                                      <TableCell className="font-medium text-zinc-900 dark:text-white whitespace-nowrap">
                                        {row.name}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {canAddEntry && (
                                          <div className="flex items-center justify-end gap-1">
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                                              onClick={() => openEditModal(cat.id, row)}
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
                                    colSpan={2}
                                    label={`No ${cat.title.toLowerCase()} added yet for RM Sales`}
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
              ) : activeItem === "services" ? (
                /* Services System: 3 Category Tables */
                <div className="space-y-6">
                  {SERVICES_CATEGORIES.map((cat) => {
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
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                                <TableRow>
                                  <TableHead className="whitespace-nowrap">{cat.columnHeader}</TableHead>
                                  <TableHead className="w-[100px] text-right whitespace-nowrap">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {masterDataLoading ? (
                                  <LoadingRows colSpan={2} />
                                ) : items.length > 0 ? (
                                  items.map((row, idx) => (
                                    <TableRow key={row.id || idx}>
                                      <TableCell className="font-medium text-zinc-900 dark:text-white whitespace-nowrap">
                                        {row.name}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {canAddEntry && (
                                          <div className="flex items-center justify-end gap-1">
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                                              onClick={() => openEditModal(cat.id, row)}
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
                                    colSpan={2}
                                    label={`No ${cat.title.toLowerCase()} added yet for Services`}
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
              ) : activeItem === "checklist" ? (
                /* Checklist System: 2 Category Tables */
                <div className="space-y-6">
                  {CHECKLIST_CATEGORIES.map((cat) => {
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
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                                <TableRow>
                                  <TableHead className="whitespace-nowrap">{cat.columnHeader}</TableHead>
                                  <TableHead className="w-[100px] text-right whitespace-nowrap">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {masterDataLoading ? (
                                  <LoadingRows colSpan={2} />
                                ) : items.length > 0 ? (
                                  items.map((row, idx) => (
                                    <TableRow key={row.id || idx}>
                                      <TableCell className="font-medium text-zinc-900 dark:text-white whitespace-nowrap">
                                        {row.name}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {canAddEntry && (
                                          <div className="flex items-center justify-end gap-1">
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                                              onClick={() => openEditModal(cat.id, row)}
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
                                    colSpan={2}
                                    label={`No ${cat.title.toLowerCase()} added yet for Checklist`}
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
              ) : (
                /* Non-Purchase, Non-Order, Non-Production, Non-Store, Non-RmSales, Non-Services, Non-Checklist Systems (Standard 3 Categories) */
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
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                            <TableRow>
                              <TableHead>Name / Entity</TableHead>
                              <TableHead>Details / Info</TableHead>
                              <TableHead className="w-[100px] text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {masterDataLoading ? (
                              <LoadingRows colSpan={3} />
                            ) : vendorList.length > 0 ? (
                              vendorList.map((row, idx) => (
                                <TableRow key={row.id || idx}>
                                  <TableCell className="font-medium text-zinc-900 dark:text-white">
                                    {row.name || "—"}
                                  </TableCell>
                                  <TableCell className="text-zinc-500 dark:text-zinc-400">
                                    {row.details || "—"}
                                  </TableCell>
                                  <TableCell className="text-right">
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
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                            <TableRow>
                              <TableHead>Name / Parameter</TableHead>
                              <TableHead>Type / Category</TableHead>
                              <TableHead className="w-[100px] text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {masterDataLoading ? (
                              <LoadingRows colSpan={3} />
                            ) : transporterList.length > 0 ? (
                              transporterList.map((row, idx) => (
                                <TableRow key={row.id || idx}>
                                  <TableCell className="font-medium text-zinc-900 dark:text-white">
                                    {row.name || "—"}
                                  </TableCell>
                                  <TableCell className="text-zinc-500 dark:text-zinc-400">
                                    {row.details || "—"}
                                  </TableCell>
                                  <TableCell className="text-right">
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
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                            <TableRow>
                              <TableHead>Product / Material Name</TableHead>
                              <TableHead>Details / Configuration</TableHead>
                              <TableHead className="w-[100px] text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {masterDataLoading ? (
                              <LoadingRows colSpan={3} />
                            ) : productList.length > 0 ? (
                              productList.map((row, idx) => (
                                <TableRow key={row.id || idx}>
                                  <TableCell className="font-medium text-zinc-900 dark:text-white">
                                    {row.name || "—"}
                                  </TableCell>
                                  <TableCell className="text-zinc-500 dark:text-zinc-400">
                                    {row.details || "—"}
                                  </TableCell>
                                  <TableCell className="text-right">
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

      {/* Add / Edit Master Entry Sheet */}
      <Sheet open={isMasterModalOpen} onOpenChange={setIsMasterModalOpen}>
        <SheetContent className="sm:max-w-[480px]">
          <form onSubmit={handleMasterSubmit} className="flex flex-col h-full min-h-0">
            <SheetHeader>
              <SheetTitle>
                {modalMode === "edit" ? "Edit Master Entry" : "Add Master Entry"} ({currentSystemLabel})
              </SheetTitle>
              <SheetDescription>
                {modalMode === "edit"
                  ? `Update details for this entry in the ${currentSystemLabel} master table.`
                  : `Add a new entry in the ${currentSystemLabel} master table.`}
              </SheetDescription>
            </SheetHeader>

            <SheetBody className="space-y-4 overflow-y-auto pr-1">
              {/* Type Select Dropdown */}
              <div className="space-y-1.5">
                <Label htmlFor="entryType">Category / Type</Label>
                <Select
                  value={
                    activeItem === "purchase" ||
                    activeItem === "order" ||
                    activeItem === "production" ||
                    activeItem === "store" ||
                    activeItem === "rm-sales" ||
                    activeItem === "services" ||
                    activeItem === "checklist"
                      ? modalCategory
                      : masterFormData.type ||
                        (modalCategory === "transporter"
                          ? "Transporter Name"
                          : modalCategory === "raw_material"
                          ? (activeItem === "repair" ? "Machine Name" : "Raw Material")
                          : "Vendor Name")
                  }
                  onValueChange={(val) => {
                    if (activeItem === "purchase") {
                      const found = PURCHASE_CATEGORIES.find((c) => c.id === val);
                      if (found) {
                        setModalCategory(found.id);
                        setMasterFormData((prev) => ({
                          ...prev,
                          type: found.typeValue,
                          typeOfKycForm: found.id === "transporter" ? (prev.typeOfKycForm || "Transportation") : prev.typeOfKycForm,
                        }));
                      }
                    } else if (activeItem === "order") {
                      const found = ORDER_CATEGORIES.find((c) => c.id === val);
                      if (found) {
                        setModalCategory(found.id);
                        setMasterFormData((prev) => ({
                          ...prev,
                          type: found.typeValue,
                        }));
                      }
                    } else if (activeItem === "production") {
                      const found = PRODUCTION_CATEGORIES.find((c) => c.id === val);
                      if (found) {
                        setModalCategory(found.id);
                        setMasterFormData((prev) => ({
                          ...prev,
                          type: found.typeValue,
                        }));
                      }
                    } else if (activeItem === "store") {
                      const found = STORE_CATEGORIES.find((c) => c.id === val);
                      if (found) {
                        setModalCategory(found.id);
                        setMasterFormData((prev) => ({
                          ...prev,
                          type: found.typeValue,
                        }));
                      }
                    } else if (activeItem === "rm-sales") {
                      const found = RMSALES_CATEGORIES.find((c) => c.id === val);
                      if (found) {
                        setModalCategory(found.id);
                        setMasterFormData((prev) => ({
                          ...prev,
                          type: found.typeValue,
                        }));
                      }
                    } else if (activeItem === "services") {
                      const found = SERVICES_CATEGORIES.find((c) => c.id === val);
                      if (found) {
                        setModalCategory(found.id);
                        setMasterFormData((prev) => ({
                          ...prev,
                          type: found.typeValue,
                        }));
                      }
                    } else if (activeItem === "checklist") {
                      const found = CHECKLIST_CATEGORIES.find((c) => c.id === val);
                      if (found) {
                        setModalCategory(found.id);
                        setMasterFormData((prev) => ({
                          ...prev,
                          type: found.typeValue,
                        }));
                      }
                    } else {
                      setMasterFormData((prev) => ({ ...prev, type: val }));
                      if (val === "Vendor Name" || val === "Department") {
                        setModalCategory("vendor");
                      } else if (val === "Transporter Name" || val === "Transporter" || val === "FMS Name" || val === "FMS Master") {
                        setModalCategory("transporter");
                        setMasterFormData((prev) => ({
                          ...prev,
                          type: val,
                          typeOfKycForm: prev.typeOfKycForm || "Transportation",
                        }));
                      } else {
                        setModalCategory("raw_material");
                      }
                    }
                  }}
                  disabled={modalMode === "edit"}
                >
                  <SelectTrigger id="entryType" className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeItem === "purchase" && (
                      <>
                        {PURCHASE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.title}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {activeItem === "order" && (
                      <>
                        {ORDER_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.title}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {activeItem === "production" && (
                      <>
                        {PRODUCTION_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.title}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {activeItem === "store" && (
                      <>
                        {STORE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.title}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {activeItem === "rm-sales" && (
                      <>
                        {RMSALES_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.title}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {activeItem === "services" && (
                      <>
                        {SERVICES_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.title}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {activeItem === "checklist" && (
                      <>
                        {CHECKLIST_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.title}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {activeItem === "repair" && (
                      <>
                        <SelectItem value="Vendor Name">Vendor</SelectItem>
                        <SelectItem value="Transporter Name">Logistics</SelectItem>
                        <SelectItem value="Machine Name">Machine / Equipment</SelectItem>
                      </>
                    )}
                    {activeItem === "payment" && (
                      <>
                        <SelectItem value="Transporter Name">FMS Master</SelectItem>
                        <SelectItem value="Raw Material">Funding Channel</SelectItem>
                      </>
                    )}
                    {![
                      "purchase",
                      "order",
                      "production",
                      "store",
                      "rm-sales",
                      "services",
                      "checklist",
                      "repair",
                      "payment",
                    ].includes(activeItem) && (
                      <>
                        <SelectItem value="Vendor Name">Vendor / Party</SelectItem>
                        <SelectItem value="Transporter Name">Transporter / Logistics</SelectItem>
                        <SelectItem value="Raw Material">Product / Material</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* ================= ORDER SYSTEM MODAL INPUTS ================= */}
              {activeItem === "order" && (
                <>
                  {/* Category: Party */}
                  {modalCategory === "party" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="orderFirmName">Firm Name</Label>
                        <Select
                          value={masterFormData.firmName || (purchaseFirms[0] || "PMMPL")}
                          onValueChange={(val) =>
                            setMasterFormData((prev) => ({ ...prev, firmName: val }))
                          }
                        >
                          <SelectTrigger id="orderFirmName" className="w-full">
                            <SelectValue placeholder="Select firm" />
                          </SelectTrigger>
                          <SelectContent>
                            {purchaseFirms.map((f) => (
                              <SelectItem key={f} value={f}>
                                {f}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="orderPartyName">Party Name</Label>
                        <Input
                          id="orderPartyName"
                          placeholder="Enter party / customer name"
                          value={masterFormData.partyName}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, partyName: e.target.value }))
                          }
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="orderAddress">Address</Label>
                        <Input
                          id="orderAddress"
                          placeholder="Enter address"
                          value={masterFormData.address}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, address: e.target.value }))
                          }
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="orderGstNumber">GST Number</Label>
                          <Input
                            id="orderGstNumber"
                            placeholder="e.g. 22AAECA7235N1ZM"
                            value={masterFormData.gstNumber}
                            onChange={(e) =>
                              setMasterFormData((prev) => ({ ...prev, gstNumber: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="orderCustomerCategory">Customer Category</Label>
                          <Input
                            id="orderCustomerCategory"
                            placeholder="e.g. A, B, C"
                            value={masterFormData.customerCategory}
                            onChange={(e) =>
                              setMasterFormData((prev) => ({ ...prev, customerCategory: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Category: Transporter */}
                  {modalCategory === "transporter" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="orderTransporterName">Transporter Name</Label>
                      <Input
                        id="orderTransporterName"
                        placeholder="Enter transporter name"
                        value={masterFormData.transporterName}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, transporterName: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Material Return Transporter */}
                  {modalCategory === "material_return_transporter" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="orderMaterialReturnTransporterName">Material Return Transporter Name</Label>
                      <Input
                        id="orderMaterialReturnTransporterName"
                        placeholder="Enter material return transporter name"
                        value={masterFormData.materialReturnTransporterName}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, materialReturnTransporterName: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Product */}
                  {modalCategory === "product" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="orderProductName">Product Name</Label>
                        <Input
                          id="orderProductName"
                          placeholder="Enter product name"
                          value={masterFormData.productName}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, productName: e.target.value }))
                          }
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="orderUom">UOM / Unit</Label>
                        <Input
                          id="orderUom"
                          placeholder="e.g. MT, PCS, KG"
                          value={masterFormData.uom}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, uom: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                  )}

                  {/* Category: Sales Person */}
                  {modalCategory === "sales_person" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="orderSalesPerson">Marketing / Sales Person Name</Label>
                      <Input
                        id="orderSalesPerson"
                        placeholder="Enter marketing / sales person name"
                        value={masterFormData.marketingSalesPerson}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, marketingSalesPerson: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: PI Type */}
                  {modalCategory === "pi_type" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="orderTypeOfPi">Type of PI</Label>
                      <Input
                        id="orderTypeOfPi"
                        placeholder="e.g. 100% Advance, Partly Advance Partly PI"
                        value={masterFormData.typeOfPi}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, typeOfPi: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Customer Category */}
                  {modalCategory === "customer_category" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="orderCustomerCategoryOnly">Customer Category</Label>
                      <Input
                        id="orderCustomerCategoryOnly"
                        placeholder="e.g. A, B, C, D"
                        value={masterFormData.customerCategory}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, customerCategory: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: UOM */}
                  {modalCategory === "uom" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="orderUomOnly">Unit of Measurement (UOM)</Label>
                      <Input
                        id="orderUomOnly"
                        placeholder="e.g. MT, PCS, KG, ROLL, KL"
                        value={masterFormData.uom}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, uom: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}
                </>
              )}

              {/* ================= PRODUCTION SYSTEM MODAL INPUTS ================= */}
              {activeItem === "production" && (
                <>
                  {/* Category: Raw Material */}
                  {modalCategory === "raw_material" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="prodFirmNameRaw">Firm Name</Label>
                        <Select
                          value={masterFormData.firmName || (purchaseFirms[0] || "PMMPL")}
                          onValueChange={(val) =>
                            setMasterFormData((prev) => ({ ...prev, firmName: val }))
                          }
                        >
                          <SelectTrigger id="prodFirmNameRaw" className="w-full">
                            <SelectValue placeholder="Select firm" />
                          </SelectTrigger>
                          <SelectContent>
                            {purchaseFirms.map((f) => (
                              <SelectItem key={f} value={f}>
                                {f}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="prodRawMaterialName">Name of Raw Material</Label>
                        <Input
                          id="prodRawMaterialName"
                          placeholder="Enter raw material name"
                          value={masterFormData.nameOfRawMaterial}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, nameOfRawMaterial: e.target.value }))
                          }
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Category: Finished Goods */}
                  {modalCategory === "finished_goods" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="prodFirmNameFG">Firm Name</Label>
                        <Select
                          value={masterFormData.firmName || (purchaseFirms[0] || "PMMPL")}
                          onValueChange={(val) =>
                            setMasterFormData((prev) => ({ ...prev, firmName: val }))
                          }
                        >
                          <SelectTrigger id="prodFirmNameFG" className="w-full">
                            <SelectValue placeholder="Select firm" />
                          </SelectTrigger>
                          <SelectContent>
                            {purchaseFirms.map((f) => (
                              <SelectItem key={f} value={f}>
                                {f}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="prodFinishedGoodsName">Finished Goods Name</Label>
                        <Input
                          id="prodFinishedGoodsName"
                          placeholder="Enter finished goods name"
                          value={masterFormData.finishedGoodsName}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, finishedGoodsName: e.target.value }))
                          }
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Category: Crushing Product */}
                  {modalCategory === "crushing_product" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="prodFirmNameCrush">Firm Name</Label>
                        <Select
                          value={masterFormData.firmName || (purchaseFirms[0] || "PMMPL")}
                          onValueChange={(val) =>
                            setMasterFormData((prev) => ({ ...prev, firmName: val }))
                          }
                        >
                          <SelectTrigger id="prodFirmNameCrush" className="w-full">
                            <SelectValue placeholder="Select firm" />
                          </SelectTrigger>
                          <SelectContent>
                            {purchaseFirms.map((f) => (
                              <SelectItem key={f} value={f}>
                                {f}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="prodCrushingProductName">Crushing Product Name</Label>
                        <Input
                          id="prodCrushingProductName"
                          placeholder="Enter crushing product name"
                          value={masterFormData.crushingProductName}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, crushingProductName: e.target.value }))
                          }
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Category: General Material */}
                  {modalCategory === "material" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="prodFirmNameMat">Firm Name</Label>
                        <Select
                          value={masterFormData.firmName || (purchaseFirms[0] || "PMMPL")}
                          onValueChange={(val) =>
                            setMasterFormData((prev) => ({ ...prev, firmName: val }))
                          }
                        >
                          <SelectTrigger id="prodFirmNameMat" className="w-full">
                            <SelectValue placeholder="Select firm" />
                          </SelectTrigger>
                          <SelectContent>
                            {purchaseFirms.map((f) => (
                              <SelectItem key={f} value={f}>
                                {f}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="prodMaterialName">Material Name</Label>
                        <Input
                          id="prodMaterialName"
                          placeholder="Enter material name"
                          value={masterFormData.materialName}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, materialName: e.target.value }))
                          }
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Category: Supervisor */}
                  {modalCategory === "supervisor" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="prodSupervisorName">Supervisor Name</Label>
                      <Input
                        id="prodSupervisorName"
                        placeholder="Enter supervisor name"
                        value={masterFormData.supervisorName}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, supervisorName: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: SF Supervisor */}
                  {modalCategory === "sf_supervisor" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="prodSfSupervisorName">SF Supervisor Name</Label>
                      <Input
                        id="prodSfSupervisorName"
                        placeholder="Enter SF supervisor name"
                        value={masterFormData.sfSupervisorName}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, sfSupervisorName: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Tested By */}
                  {modalCategory === "tested_by" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="prodTestedBy">Tested By (QC Tester Name)</Label>
                      <Input
                        id="prodTestedBy"
                        placeholder="Enter tester name"
                        value={masterFormData.testedBy}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, testedBy: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Shift */}
                  {modalCategory === "shift" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="prodShift">Shift</Label>
                      <Input
                        id="prodShift"
                        placeholder="e.g. Morning, Evening, Night, Day"
                        value={masterFormData.shift}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, shift: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Priority */}
                  {modalCategory === "priority" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="prodPriority">Priority</Label>
                      <Input
                        id="prodPriority"
                        placeholder="e.g. Normal, High, Urgent"
                        value={masterFormData.priority}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, priority: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Flow of Material */}
                  {modalCategory === "flow_of_material" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="prodFlowOfMaterial">Flow of Material</Label>
                      <Input
                        id="prodFlowOfMaterial"
                        placeholder="e.g. Good, Not Good, OK OK"
                        value={masterFormData.flowOfMaterial}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, flowOfMaterial: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Status */}
                  {modalCategory === "status" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="prodStatus">Status</Label>
                      <Input
                        id="prodStatus"
                        placeholder="e.g. Ok, Not Ok"
                        value={masterFormData.status}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, status: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                    {/* Category: Test Status */}
                  {modalCategory === "test_status" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="prodTestStatus">Test Status</Label>
                      <Input
                        id="prodTestStatus"
                        placeholder="e.g. Pass, Fail"
                        value={masterFormData.testStatus}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, testStatus: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}
                </>
              )}

              {/* ================= STORE SYSTEM MODAL INPUTS ================= */}
              {activeItem === "store" && (
                <>
                  {/* Category: Items & Products */}
                  {modalCategory === "item" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="storeItemFirmName">Firm Name</Label>
                        <Select
                          value={masterFormData.firmName || (purchaseFirms.length > 0 ? purchaseFirms[0] : "PMMPL")}
                          onValueChange={(val) =>
                            setMasterFormData((prev) => ({ ...prev, firmName: val }))
                          }
                        >
                          <SelectTrigger id="storeItemFirmName" className="w-full">
                            <SelectValue placeholder="Select Firm Name" />
                          </SelectTrigger>
                          <SelectContent>
                            {purchaseFirms.map((f) => (
                              <SelectItem key={f} value={f}>
                                {f}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="storeItemName">Item Name</Label>
                        <Input
                          id="storeItemName"
                          placeholder="e.g. MS Pipe, Safety Helmet, Grease"
                          value={masterFormData.itemName}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, itemName: e.target.value }))
                          }
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="storeItemCategory">Category</Label>
                          <Input
                            id="storeItemCategory"
                            placeholder="e.g. Consumable, Raw Material"
                            value={masterFormData.category}
                            onChange={(e) =>
                              setMasterFormData((prev) => ({ ...prev, category: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="storeItemGroup">Group Name</Label>
                          <Input
                            id="storeItemGroup"
                            placeholder="e.g. Mechanical, Electrical"
                            value={masterFormData.groupName}
                            onChange={(e) =>
                              setMasterFormData((prev) => ({ ...prev, groupName: e.target.value }))
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="storeItemUom">Unit of Measurement (UOM)</Label>
                        <Input
                          id="storeItemUom"
                          placeholder="e.g. MT, PCS, NOS, MTR, KG"
                          value={masterFormData.uom}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, uom: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                  )}

                  {/* Category: Item Categories */}
                  {modalCategory === "category" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="storeCategory">Category</Label>
                      <Input
                        id="storeCategory"
                        placeholder="e.g. Consumable, Raw Material, Tools, Spare Parts"
                        value={masterFormData.category}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, category: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Item Groups */}
                  {modalCategory === "group_name" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="storeGroupName">Group Name</Label>
                      <Input
                        id="storeGroupName"
                        placeholder="e.g. Mechanical, Electrical, Civil, Safety"
                        value={masterFormData.groupName}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, groupName: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Units of Measurement (UOM) */}
                  {modalCategory === "uom" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="storeUom">Unit of Measurement (UOM)</Label>
                      <Input
                        id="storeUom"
                        placeholder="e.g. MT, PCS, NOS, KG, LTR, MTR"
                        value={masterFormData.uom}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, uom: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Vendors & Suppliers */}
                  {modalCategory === "vendor" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="storeVendorName">Vendor Name</Label>
                        <Input
                          id="storeVendorName"
                          placeholder="Enter vendor or supplier name"
                          value={masterFormData.vendorName}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, vendorName: e.target.value }))
                          }
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="storeVendorGstin">Vendor GSTIN</Label>
                        <Input
                          id="storeVendorGstin"
                          placeholder="e.g. 24AAAAA0000A1Z5"
                          value={masterFormData.vendorGstin}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, vendorGstin: e.target.value }))
                          }
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="storeVendorEmail">Vendor Email</Label>
                        <Input
                          id="storeVendorEmail"
                          type="email"
                          placeholder="vendor@example.com"
                          value={masterFormData.vendorEmail}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, vendorEmail: e.target.value }))
                          }
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="storeVendorAddress">Vendor Address</Label>
                        <Input
                          id="storeVendorAddress"
                          placeholder="Enter vendor address"
                          value={masterFormData.vendorAddress}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, vendorAddress: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                  )}

                  {/* Category: Companies */}
                  {modalCategory === "company" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="storeCompanyName">Company Name</Label>
                        <Input
                          id="storeCompanyName"
                          placeholder="Enter company name"
                          value={masterFormData.companyName}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, companyName: e.target.value }))
                          }
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="storeCompanyGstin">Company GSTIN</Label>
                          <Input
                            id="storeCompanyGstin"
                            placeholder="e.g. 24AAAAA0000A1Z5"
                            value={masterFormData.companyGstin}
                            onChange={(e) =>
                              setMasterFormData((prev) => ({ ...prev, companyGstin: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="storeCompanyPan">Company PAN</Label>
                          <Input
                            id="storeCompanyPan"
                            placeholder="e.g. ABCDE1234F"
                            value={masterFormData.companyPan}
                            onChange={(e) =>
                              setMasterFormData((prev) => ({ ...prev, companyPan: e.target.value }))
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="storeCompanyPhone">Company Phone</Label>
                        <Input
                          id="storeCompanyPhone"
                          placeholder="e.g. +91 9876543210"
                          value={masterFormData.companyPhone}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, companyPhone: e.target.value }))
                          }
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="storeCompanyAddress">Company Address</Label>
                        <Input
                          id="storeCompanyAddress"
                          placeholder="Enter company address"
                          value={masterFormData.companyAddress}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, companyAddress: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                  )}

                  {/* Category: Departments */}
                  {modalCategory === "department" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="storeDepartment">Department</Label>
                      <Input
                        id="storeDepartment"
                        placeholder="e.g. Production, Electrical, Maintenance, QC, HR"
                        value={masterFormData.department}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, department: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Areas of Use */}
                  {modalCategory === "area_of_use" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="storeAreaOfUse">Area of Use</Label>
                      <Input
                        id="storeAreaOfUse"
                        placeholder="e.g. Kiln 1, Boiler House, Workshop, Lab"
                        value={masterFormData.areaOfUse}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, areaOfUse: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Locations & Where */}
                  {modalCategory === "where" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="storeWhere">Where / Location</Label>
                      <Input
                        id="storeWhere"
                        placeholder="e.g. Main Store Rack A1, Yard 2, Shelf B3"
                        value={masterFormData.where}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, where: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: FMS Master */}
                  {modalCategory === "fms_name" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="storeFmsName">FMS Name</Label>
                      <Input
                        id="storeFmsName"
                        placeholder="e.g. Store FMS, Indent FMS, Procurement FMS"
                        value={masterFormData.fmsName}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, fmsName: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Payment Terms */}
                  {modalCategory === "payment_term" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="storePaymentTerm">Payment Term</Label>
                        <Input
                          id="storePaymentTerm"
                          placeholder="e.g. 30 Days Credit, 100% Advance, Against Delivery"
                          value={masterFormData.paymentTerm}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, paymentTerm: e.target.value }))
                          }
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="storeDefaultTerms">Default Terms & Conditions</Label>
                        <Input
                          id="storeDefaultTerms"
                          placeholder="e.g. Standard 30 days after inspection"
                          value={masterFormData.defaultTerms}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, defaultTerms: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                  )}

                  {/* Category: Addresses */}
                  {modalCategory === "address" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="storeBillingAddress">Billing Address</Label>
                        <Input
                          id="storeBillingAddress"
                          placeholder="Enter billing address"
                          value={masterFormData.billingAddress}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, billingAddress: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="storeDestinationAddress">Destination Address</Label>
                        <Input
                          id="storeDestinationAddress"
                          placeholder="Enter destination delivery address"
                          value={masterFormData.destinationAddress}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, destinationAddress: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ================= RM SALES SYSTEM MODAL INPUTS ================= */}
              {activeItem === "rm-sales" && (
                <>
                  {/* Category: Customers & Parties */}
                  {modalCategory === "party" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="rmSalesPartyFirmName">Firm Name</Label>
                        <Select
                          value={masterFormData.firmName || (purchaseFirms.length > 0 ? purchaseFirms[0] : "PMMPL")}
                          onValueChange={(val) =>
                            setMasterFormData((prev) => ({ ...prev, firmName: val }))
                          }
                        >
                          <SelectTrigger id="rmSalesPartyFirmName" className="w-full">
                            <SelectValue placeholder="Select Firm Name" />
                          </SelectTrigger>
                          <SelectContent>
                            {purchaseFirms.map((f) => (
                              <SelectItem key={f} value={f}>
                                {f}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="rmSalesPartyName">Party Name</Label>
                        <Input
                          id="rmSalesPartyName"
                          placeholder="Enter buyer or customer party name"
                          value={masterFormData.partyName}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, partyName: e.target.value }))
                          }
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Category: Products & Materials */}
                  {modalCategory === "product" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="rmSalesProductFirmName">Firm Name</Label>
                        <Select
                          value={masterFormData.firmName || (purchaseFirms.length > 0 ? purchaseFirms[0] : "PMMPL")}
                          onValueChange={(val) =>
                            setMasterFormData((prev) => ({ ...prev, firmName: val }))
                          }
                        >
                          <SelectTrigger id="rmSalesProductFirmName" className="w-full">
                            <SelectValue placeholder="Select Firm Name" />
                          </SelectTrigger>
                          <SelectContent>
                            {purchaseFirms.map((f) => (
                              <SelectItem key={f} value={f}>
                                {f}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="rmSalesProductName">Product Name</Label>
                        <Input
                          id="rmSalesProductName"
                          placeholder="Enter product or raw material name"
                          value={masterFormData.productName}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, productName: e.target.value }))
                          }
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Category: Transport Types */}
                  {modalCategory === "transport" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="rmSalesTransportType">Transport Type</Label>
                      <Input
                        id="rmSalesTransportType"
                        placeholder="e.g. FOR Destination, Ex Factory Depot, By Road"
                        value={masterFormData.transportType}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, transportType: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}
                </>
              )}

              {/* ================= SERVICES SYSTEM MODAL INPUTS ================= */}
              {activeItem === "services" && (
                <>
                  {/* Category: Departments */}
                  {modalCategory === "department" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="serviceDeptFirmName">Firm Name</Label>
                        <Select
                          value={masterFormData.firmName || (purchaseFirms.length > 0 ? purchaseFirms[0] : "PMMPL")}
                          onValueChange={(val) =>
                            setMasterFormData((prev) => ({ ...prev, firmName: val }))
                          }
                        >
                          <SelectTrigger id="serviceDeptFirmName" className="w-full">
                            <SelectValue placeholder="Select Firm Name" />
                          </SelectTrigger>
                          <SelectContent>
                            {purchaseFirms.map((f) => (
                              <SelectItem key={f} value={f}>
                                {f}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="serviceDept">Department</Label>
                        <Input
                          id="serviceDept"
                          placeholder="e.g. IT, Logistics, Maintenance, Finance, HR"
                          value={masterFormData.department}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, department: e.target.value }))
                          }
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Category: Group Heads */}
                  {modalCategory === "group_head" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="serviceGroupHeadFirmName">Firm Name</Label>
                        <Select
                          value={masterFormData.firmName || (purchaseFirms.length > 0 ? purchaseFirms[0] : "PMMPL")}
                          onValueChange={(val) =>
                            setMasterFormData((prev) => ({ ...prev, firmName: val }))
                          }
                        >
                          <SelectTrigger id="serviceGroupHeadFirmName" className="w-full">
                            <SelectValue placeholder="Select Firm Name" />
                          </SelectTrigger>
                          <SelectContent>
                            {purchaseFirms.map((f) => (
                              <SelectItem key={f} value={f}>
                                {f}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="serviceGroupHead">Group Head Name</Label>
                        <Input
                          id="serviceGroupHead"
                          placeholder="e.g. Operations Head, Management, Finance Head"
                          value={masterFormData.groupHead}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, groupHead: e.target.value }))
                          }
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Category: FMS Master */}
                  {modalCategory === "fms_name" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="serviceFmsFirmName">Firm Name</Label>
                        <Select
                          value={masterFormData.firmName || (purchaseFirms.length > 0 ? purchaseFirms[0] : "PMMPL")}
                          onValueChange={(val) =>
                            setMasterFormData((prev) => ({ ...prev, firmName: val }))
                          }
                        >
                          <SelectTrigger id="serviceFmsFirmName" className="w-full">
                            <SelectValue placeholder="Select Firm Name" />
                          </SelectTrigger>
                          <SelectContent>
                            {purchaseFirms.map((f) => (
                              <SelectItem key={f} value={f}>
                                {f}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="serviceFmsName">FMS Name</Label>
                        <Input
                          id="serviceFmsName"
                          placeholder="e.g. Repair FMS, Store FMS, Utility FMS"
                          value={masterFormData.fmsName}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, fmsName: e.target.value }))
                          }
                          required
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ================= CHECKLIST SYSTEM MODAL INPUTS ================= */}
              {activeItem === "checklist" && (
                <>
                  {/* Category: Doers / Assignees */}
                  {modalCategory === "doer" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="checklistDoerFirmName">Firm Name</Label>
                        <Select
                          value={masterFormData.firmName || masterFormData.firm || (purchaseFirms.length > 0 ? purchaseFirms[0] : "PMMPL")}
                          onValueChange={(val) =>
                            setMasterFormData((prev) => ({ ...prev, firmName: val, firm: val }))
                          }
                        >
                          <SelectTrigger id="checklistDoerFirmName" className="w-full">
                            <SelectValue placeholder="Select Firm Name" />
                          </SelectTrigger>
                          <SelectContent>
                            {purchaseFirms.map((f) => (
                              <SelectItem key={f} value={f}>
                                {f}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="checklistDoerName">Doer Name</Label>
                        <Input
                          id="checklistDoerName"
                          placeholder="Enter doer / assignee name"
                          value={masterFormData.doerName}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, doerName: e.target.value }))
                          }
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="checklistRole">Role</Label>
                        <Input
                          id="checklistRole"
                          placeholder="e.g. User, Supervisor, Manager"
                          value={masterFormData.role}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, role: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                  )}

                  {/* Category: Assigners (Given By) */}
                  {modalCategory === "given_by" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="checklistGivenByFirmName">Firm Name</Label>
                        <Select
                          value={masterFormData.firmName || masterFormData.firm || (purchaseFirms.length > 0 ? purchaseFirms[0] : "PMMPL")}
                          onValueChange={(val) =>
                            setMasterFormData((prev) => ({ ...prev, firmName: val, firm: val }))
                          }
                        >
                          <SelectTrigger id="checklistGivenByFirmName" className="w-full">
                            <SelectValue placeholder="Select Firm Name" />
                          </SelectTrigger>
                          <SelectContent>
                            {purchaseFirms.map((f) => (
                              <SelectItem key={f} value={f}>
                                {f}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="checklistGivenByName">Assigner Name (Task Given By)</Label>
                        <Input
                          id="checklistGivenByName"
                          placeholder="Enter task assigner name"
                          value={masterFormData.givenBy}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, givenBy: e.target.value }))
                          }
                          required
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ================= PURCHASE & OTHER SYSTEMS MODAL INPUTS ================= */}
              {!["order", "production", "store", "rm-sales", "services", "checklist"].includes(activeItem) && (
                <>
                  {/* Category: Vendor */}
                  {modalCategory === "vendor" && (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="vendorName">
                          {activeItem === "checklist" ? "User / Doer Name" : activeItem === "production" ? "Supervisor Name" : activeItem === "services" ? "Department Name" : "Vendor / Party Name"}
                        </Label>
                        <Input
                          id="vendorName"
                          placeholder="Enter name"
                          value={masterFormData.vendorName}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({
                              ...prev,
                              vendorName: e.target.value,
                              department: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>

                      {activeItem === "purchase" && (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="vendorNameKyc">Vendor Name KYC</Label>
                              <Input
                                id="vendorNameKyc"
                                placeholder="Enter KYC name"
                                value={masterFormData.vendorNameKyc}
                                onChange={(e) =>
                                  setMasterFormData((prev) => ({ ...prev, vendorNameKyc: e.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="typeOfKycForm">Type Of KYC Form</Label>
                              <Input
                                id="typeOfKycForm"
                                placeholder="e.g. Vendor, Transporter"
                                value={masterFormData.typeOfKycForm}
                                onChange={(e) =>
                                  setMasterFormData((prev) => ({ ...prev, typeOfKycForm: e.target.value }))
                                }
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="firmName">Firm Name</Label>
                              <Input
                                id="firmName"
                                placeholder="e.g. PMMPL"
                                value={masterFormData.firmName}
                                onChange={(e) =>
                                  setMasterFormData((prev) => ({ ...prev, firmName: e.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="gstNumber">GST Number</Label>
                              <Input
                                id="gstNumber"
                                placeholder="GST number"
                                value={masterFormData.gstNumber}
                                onChange={(e) =>
                                  setMasterFormData((prev) => ({ ...prev, gstNumber: e.target.value }))
                                }
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="phoneNumber">Phone Number</Label>
                              <Input
                                id="phoneNumber"
                                placeholder="Phone number"
                                value={masterFormData.phoneNumber}
                                onChange={(e) =>
                                  setMasterFormData((prev) => ({ ...prev, phoneNumber: e.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="email">Email Address</Label>
                              <Input
                                id="email"
                                type="email"
                                placeholder="Email address"
                                value={masterFormData.email}
                                onChange={(e) =>
                                  setMasterFormData((prev) => ({ ...prev, email: e.target.value }))
                                }
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="bankAccountNo">Current Bank A/C No</Label>
                              <Input
                                id="bankAccountNo"
                                placeholder="Account number"
                                value={masterFormData.bankAccountNo}
                                onChange={(e) =>
                                  setMasterFormData((prev) => ({ ...prev, bankAccountNo: e.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="ifscCode">IFSC Code</Label>
                              <Input
                                id="ifscCode"
                                placeholder="IFSC code"
                                value={masterFormData.ifscCode}
                                onChange={(e) =>
                                  setMasterFormData((prev) => ({ ...prev, ifscCode: e.target.value }))
                                }
                              />
                            </div>
                          </div>
                        </>
                      )}

                      {activeItem !== "purchase" && (
                        <div className="space-y-1.5">
                          <Label htmlFor="firmName">Firm Name</Label>
                          <Input
                            id="firmName"
                            placeholder="e.g. PMMPL"
                            value={masterFormData.firmName}
                            onChange={(e) =>
                              setMasterFormData((prev) => ({ ...prev, firmName: e.target.value }))
                            }
                          />
                        </div>
                      )}
                    </>
                  )}

                  {/* Category: Transporter */}
                  {modalCategory === "transporter" && (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="transporterName">
                          {activeItem === "services" ? "FMS Name" : activeItem === "checklist" ? "Assigner Name" : "Transporter Name"}
                        </Label>
                        <Input
                          id="transporterName"
                          placeholder="Enter name"
                          value={masterFormData.transporterName}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({
                              ...prev,
                              transporterName: e.target.value,
                              fmsName: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>

                      {activeItem === "purchase" && (
                        <div className="space-y-1.5">
                          <Label htmlFor="transporterName2">Transporter Name 2</Label>
                          <Input
                            id="transporterName2"
                            placeholder="Secondary transporter name"
                            value={masterFormData.transporterName2}
                            onChange={(e) =>
                              setMasterFormData((prev) => ({ ...prev, transporterName2: e.target.value }))
                            }
                          />
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <Label htmlFor="rateType">Rate Type / Logistics Option</Label>
                        <Input
                          id="rateType"
                          placeholder="e.g. Per MT, Fixed"
                          value={masterFormData.rateType}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({
                              ...prev,
                              rateType: e.target.value,
                              typeOfRate: e.target.value,
                            }))
                          }
                        />
                      </div>

                      {activeItem === "purchase" && (
                        <div className="space-y-1.5">
                          <Label htmlFor="transporterTypeOfKyc">Type Of KYC Form</Label>
                          <Input
                            id="transporterTypeOfKyc"
                            placeholder="e.g. Transportation"
                            value={masterFormData.typeOfKycForm}
                            onChange={(e) =>
                              setMasterFormData((prev) => ({ ...prev, typeOfKycForm: e.target.value }))
                            }
                          />
                        </div>
                      )}
                    </>
                  )}

                  {/* Category: Raw Material / Product */}
                  {modalCategory === "raw_material" && (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="rawMaterialName">
                          {activeItem === "repair" ? "Machine / Equipment Name" : activeItem === "payment" ? "Funding Channel Name" : "Product / Raw Material Name"}
                        </Label>
                        <Input
                          id="rawMaterialName"
                          placeholder="Enter name"
                          value={masterFormData.rawMaterialName}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({
                              ...prev,
                              rawMaterialName: e.target.value,
                              productName: e.target.value,
                              itemName: e.target.value,
                              machineName: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>

                      {activeItem === "purchase" && (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="productName">Product Name</Label>
                              <Input
                                id="productName"
                                placeholder="Product name"
                                value={masterFormData.productName}
                                onChange={(e) =>
                                  setMasterFormData((prev) => ({ ...prev, productName: e.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="uom">UOM / Unit</Label>
                              <Input
                                id="uom"
                                placeholder="e.g. MT, PCS, KG"
                                value={masterFormData.uom}
                                onChange={(e) =>
                                  setMasterFormData((prev) => ({ ...prev, uom: e.target.value }))
                                }
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="typeOfIndent">Type Of Indent</Label>
                              <Input
                                id="typeOfIndent"
                                placeholder="e.g. Raw Purchase"
                                value={masterFormData.typeOfIndent}
                                onChange={(e) =>
                                  setMasterFormData((prev) => ({ ...prev, typeOfIndent: e.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="typeOfRate">Type Of Rate</Label>
                              <Input
                                id="typeOfRate"
                                placeholder="e.g. Per MT, Fixed"
                                value={masterFormData.typeOfRate}
                                onChange={(e) =>
                                  setMasterFormData((prev) => ({
                                    ...prev,
                                    typeOfRate: e.target.value,
                                    rateType: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="areaLifting">Area Lifting</Label>
                              <Input
                                id="areaLifting"
                                placeholder="e.g. Factory"
                                value={masterFormData.areaLifting}
                                onChange={(e) =>
                                  setMasterFormData((prev) => ({ ...prev, areaLifting: e.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="paymentTerm">Payment Term</Label>
                              <Input
                                id="paymentTerm"
                                placeholder="e.g. 100% Advance"
                                value={masterFormData.paymentTerm}
                                onChange={(e) =>
                                  setMasterFormData((prev) => ({ ...prev, paymentTerm: e.target.value }))
                                }
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="rmFirmName">Firm Name</Label>
                              <Input
                                id="rmFirmName"
                                placeholder="e.g. PMMPL"
                                value={masterFormData.firmName}
                                onChange={(e) =>
                                  setMasterFormData((prev) => ({ ...prev, firmName: e.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="generatedBy">Generated By</Label>
                              <Input
                                id="generatedBy"
                                placeholder="Generated by"
                                value={masterFormData.generatedBy}
                                onChange={(e) =>
                                  setMasterFormData((prev) => ({ ...prev, generatedBy: e.target.value }))
                                }
                              />
                            </div>
                          </div>

                          {modalMode === "add" && (
                            <div className="grid grid-cols-2 gap-3 pt-2">
                              <div className="space-y-1.5">
                                <Label htmlFor="aluminaRange">Alumina Range</Label>
                                <Input
                                  id="aluminaRange"
                                  placeholder="e.g. 70-75"
                                  value={masterFormData.aluminaRange}
                                  onChange={(e) =>
                                    setMasterFormData((prev) => ({ ...prev, aluminaRange: e.target.value }))
                                  }
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="ironRange">Iron Range</Label>
                                <Input
                                  id="ironRange"
                                  placeholder="e.g. 1.2-1.8"
                                  value={masterFormData.ironRange}
                                  onChange={(e) =>
                                    setMasterFormData((prev) => ({ ...prev, ironRange: e.target.value }))
                                  }
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="apRange">AP Range</Label>
                                <Input
                                  id="apRange"
                                  placeholder="e.g. 18"
                                  value={masterFormData.apRange}
                                  onChange={(e) =>
                                    setMasterFormData((prev) => ({ ...prev, apRange: e.target.value }))
                                  }
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="bdRange">BD Range</Label>
                                <Input
                                  id="bdRange"
                                  placeholder="e.g. 2.8"
                                  value={masterFormData.bdRange}
                                  onChange={(e) =>
                                    setMasterFormData((prev) => ({ ...prev, bdRange: e.target.value }))
                                  }
                                />
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {activeItem !== "purchase" && (
                        <div className="space-y-1.5">
                          <Label htmlFor="uom">UOM / Unit</Label>
                          <Input
                            id="uom"
                            placeholder="e.g. MT, PCS, KG"
                            value={masterFormData.uom}
                            onChange={(e) =>
                              setMasterFormData((prev) => ({ ...prev, uom: e.target.value }))
                            }
                          />
                        </div>
                      )}
                    </>
                  )}

                  {/* Category: Firm */}
                  {modalCategory === "firm" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="firmNameOnly">Firm Name</Label>
                      <Input
                        id="firmNameOnly"
                        placeholder="e.g. PMMPL, Purab, Rkl"
                        value={masterFormData.firmName}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, firmName: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Indent Type */}
                  {modalCategory === "indent_type" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="typeOfIndentOnly">Type Of Indent</Label>
                      <Input
                        id="typeOfIndentOnly"
                        placeholder="e.g. Raw Purchase, Trading Purchase, Finished Goods"
                        value={masterFormData.typeOfIndent}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, typeOfIndent: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Rate Type */}
                  {modalCategory === "rate_type" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="rateTypeOnly">Rate Type</Label>
                      <Input
                        id="rateTypeOnly"
                        placeholder="e.g. Per MT, Fixed"
                        value={masterFormData.rateType}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({
                            ...prev,
                            rateType: e.target.value,
                            typeOfRate: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Area Lifting */}
                  {modalCategory === "area_lifting" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="areaLiftingOnly">Area Lifting / Location</Label>
                      <Input
                        id="areaLiftingOnly"
                        placeholder="e.g. Factory, Direct Supply To Party"
                        value={masterFormData.areaLifting}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, areaLifting: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Payment Term */}
                  {modalCategory === "payment_term" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="paymentTermOnly">Payment Term</Label>
                      <Input
                        id="paymentTermOnly"
                        placeholder="e.g. 100% Advance, Credit, Partly Advance/ Partly PI"
                        value={masterFormData.paymentTerm}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, paymentTerm: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: UOM */}
                  {modalCategory === "uom" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="uomOnly">Unit of Measurement (UOM)</Label>
                      <Input
                        id="uomOnly"
                        placeholder="e.g. MT, KG, PCS, Box, Liter, Meter, Bag"
                        value={masterFormData.uom}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, uom: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: KYC Form Type */}
                  {modalCategory === "kyc_form" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="kycFormOnly">Type Of KYC Form</Label>
                      <Input
                        id="kycFormOnly"
                        placeholder="e.g. Vendor, Transportation, Product"
                        value={masterFormData.typeOfKycForm}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, typeOfKycForm: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: FMS Name */}
                  {modalCategory === "fms_name" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="fmsNameOnly">FMS Name</Label>
                      <Input
                        id="fmsNameOnly"
                        placeholder="e.g. Pasmin"
                        value={masterFormData.fmsName}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, fmsName: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Generated By */}
                  {modalCategory === "generated_by" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="generatedByOnly">Generated By (Requester Name)</Label>
                      <Input
                        id="generatedByOnly"
                        placeholder="e.g. Saurabh, Ajay Kumar, Ankit"
                        value={masterFormData.generatedBy}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, generatedBy: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Entry Type */}
                  {modalCategory === "entry_type" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="entryTypeField">Entry Classification / Type</Label>
                      <Input
                        id="entryTypeField"
                        placeholder="e.g. Independent, Common"
                        value={masterFormData.type}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, type: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}
                </>
              )}
            </SheetBody>

            <SheetFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsMasterModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={masterSubmitLoading}>
                {masterSubmitLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {modalMode === "edit" ? "Save Changes" : "Add Entry"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Sheet */}
      <Sheet open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <SheetContent className="sm:max-w-[420px]">
          <SheetHeader>
            <SheetTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              Delete Master Entry
            </SheetTitle>
            <SheetDescription className="pt-2 text-zinc-600 dark:text-zinc-300">
              Are you sure you want to delete <strong className="text-zinc-900 dark:text-white">"{deleteTarget?.name}"</strong>?
              <br /><br />
              <span className="text-red-600 dark:text-red-400 font-semibold block bg-red-50 dark:bg-red-950/40 p-3 rounded-lg border border-red-200 dark:border-red-900/50">
                Warning: This cannot be undone.
              </span>
            </SheetDescription>
          </SheetHeader>
          <SheetFooter className="mt-6 flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Entry
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
