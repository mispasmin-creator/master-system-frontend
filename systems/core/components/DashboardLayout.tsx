'use client';
import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { API_URL, AuthUser, clearSession, getToken, getStoredUser, saveSession } from '@/lib/auth';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';

type IconProps = { className?: string };
const icon = (paths: React.ReactNode) =>
  function Icon({ className }: IconProps) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {paths}
      </svg>
    );
  };

const SunIcon = icon(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
  </>
);
const MoonIcon = icon(<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />);
const BuildingIcon = icon(<><rect x="4" y="2" width="16" height="20" rx="1" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" /></>);
const LogOutIcon = icon(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>);
const SearchIcon = icon(<><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>);
const ChevronsLeftIcon = icon(<><path d="m11 17-5-5 5-5" /><path d="m18 17-5-5 5-5" /></>);
const ChevronDownIcon = icon(<path d="m6 9 6 6 6-6" />);
const XIcon = icon(<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>);
const LogInIcon = icon(<><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /></>);
const LayoutIcon = icon(<><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></>);
const PurchaseIcon = icon(<><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></>);
const OrderIcon = icon(<><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="m9 12 2 2 4-4" /></>);
const DownloadIcon = icon(<><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>);
const ProductionIcon = icon(<><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /></>);
const ChecklistIcon = icon(<><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /><path d="m9 14 2 2 4-4" /></>);
const BellIcon = icon(<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>);
const StoreIcon = icon(<><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" /></>);
const RmSalesIcon = icon(<><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="M7 21h10" /><path d="M12 3v18" /><path d="M3 7h18" /></>);
const FreightIcon = icon(<><rect x="1" y="3" width="15" height="13" rx="1" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></>);
const InventoryIcon = icon(<><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></>);
const PaymentIcon = icon(<><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></>);
const ServicesIcon = icon(<><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></>);
const RepairIcon = icon(<><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></>);


const productionTabs = [
  { id: "dashboard", label: "Dashboard", stepName: "Overview", path: "/dashboard" },
  { id: "orders", label: "Orders", stepName: "Orders", path: "/orders" },
  { id: "full-kitting", label: "Composition By Lab", stepName: "Full Kitting", path: "/full-kitting" },
  { id: "pi-approval", label: "PI Approval", stepName: "PI Approval", path: "/pi-approval" },
  { id: "management-app", label: "Management App", stepName: "Management App", path: "/management-app" },
  { id: "sample-test", label: "Sample Test", stepName: "Sample Test", path: "/sample-test" },
  { id: "job-cards", label: "Job Cards", stepName: "Job Cards", path: "/job-cards" },
  { id: "production-tracking", label: "Production", stepName: "Production", path: "/production-tracking" },
  { id: "composition-qc", label: "Composition QC", stepName: "Composition QC", path: "/composition-qc" },
  { id: "lab-testing1", label: "Lab Testing 1", stepName: "Lab Testing 1", path: "/lab-testing1" },
  { id: "lab-testing2", label: "Lab Testing 2", stepName: "Lab Testing 2", path: "/lab-testing2" },
  { id: "costing", label: "Costing", stepName: "Costing", path: "/costing" },
  { id: "tally", label: "Tally", stepName: "Tally", path: "/tally" },
  { id: "kyc", label: "KYC", stepName: "KYC", path: "/kyc" },
  { id: "sf-production", label: "SF Production", stepName: "SF Production", path: "/sf-production", isSf: true },
  { id: "sfjob-card", label: "Job Card Planning", stepName: "SF Job Card", path: "/sfjob-card", isSf: true },
  { id: "sfproduction-entry", label: "Production Entry", stepName: "SF Production Entry", path: "/sfproduction-entry", isSf: true },
  { id: "crushing", label: "Crushing", stepName: "Crushing", path: "/crushing", isSf: true },
  { id: "tally-entry", label: "Tally Entry", stepName: "Tally Entry", path: "/tally-entry", isSf: true },
  { id: "settings", label: "Settings", stepName: "Settings", path: "/settings" },
  { id: "chemical-test", label: "Chemical Test", stepName: "Chemical Test", path: "/chemical-test", hidden: true },
  { id: "management", label: "Management Approval", stepName: "Management", path: "/management", hidden: true },
  { id: "check", label: "Check", stepName: "Check", path: "/check", hidden: true }
];

const purchaseTabs = [
  { id: "indent", label: "Indent", stepName: "Generate Indent", path: "/indent" },
  { id: "stock", label: "HOD Approval", stepName: "Recheck the Stock And Approve Quantity", path: "/stock-approval" },
  { id: "three-party", label: "Three Party", stepName: "vendor", path: "/three-party" },
  { id: "factory-approval", label: "Factory App.", stepName: "management", path: "/factory-approval" },
  { id: "management-approval", label: "Mgmt App.", stepName: "management", path: "/management-approval" },
  { id: "generate-po", label: " Make PO", stepName: "Generate Purchase Order", path: "/make-po" },
  { id: "po-history", label: "PO History", stepName: "Generate Purchase Order", path: "/po-history" },
  { id: "arrange-logistics", label: "Arrange Logistics", stepName: "Arrange Logistics", path: "/arrange-logistics" },
  { id: "logistics-approval", label: "Logistics App.", stepName: "Logistics Approval", path: "/logistics-approval" },
  { id: "tally-entry", label: "PO Entry", stepName: "Purchase Order Entry In Tally", path: "/po-entry" },
  { id: "original-bills", label: "Advance Payement", stepName: "accounts", path: "/advance-payement" },
  { id: "lift-material", label: "Lift", stepName: "Lift The Material", path: "/lift" },
  { id: "receipt-check", label: "Receipt", stepName: "Receipt Of Material / Physical Quality Check", path: "/receipt" },
  { id: "unload-management", label: "Unload App.", stepName: "management", path: "/management-unload", hidden: true },
  { id: "lab-testing", label: "Lab", stepName: "Lab Testing - Is The Quality Good?", path: "/lab" },
  { id: "lab-report", label: "Lab Report", stepName: "Lab Testing - Is The Quality Good?", path: "/lab-report" },
  { id: "bilty", label: "Bilty", stepName: "Bilty", path: "/bilty" },
  { id: "mismatch", label: "Mismatch", stepName: "mismatch", path: "/mismatch" },
  { id: "purchase-return", label: "Purchase Return", stepName: "mismatch", path: "/purchase-return" },
  { id: "purchaser-coordinate", label: "Purchaser Coord.", stepName: "mismatch", path: "/purchaser-coordinate" },
  { id: "audit-data", label: "Accounts Audit", stepName: "accounts", path: "/accounts-audit" },
  { id: "debit-note", label: "Debit Note", stepName: "Debit Note", path: "/debit-note" },
  { id: "fullkitting", label: "Fullkitting", stepName: "Fullkitting", path: "/fullkitting" },
  { id: "manage-users", label: "Manage Users", stepName: "admin", path: "/manage-users", hidden: true },
  { id: "rectify-mistake", label: "Rectify Mistake", stepName: "rectify-mistake", path: "/rectify-mistake", hidden: true },
  { id: "final-tally-entry", label: "Final Tally Entry", stepName: "accounts", path: "/final-tally-entry", hidden: true },
  { id: "rectify-mistake-2", label: "Rectify Mistake 2", stepName: "rectify-mistake", path: "/rectify-mistake-2", hidden: true },
  { id: "take-entry-tally", label: "Take Entry Tally", stepName: "accounts", path: "/take-entry-tally", hidden: true },
  { id: "again-auditing", label: "Again Auditing", stepName: "accounts", path: "/again-auditing", hidden: true },
  { id: "tolerance", label: "Tolerance", stepName: "accounts", path: "/tolrance", hidden: true },
  { id: "kyc", label: "KYC", stepName: "accounts", path: "/kyc", hidden: true },
  { id: "vendor-payment", label: "Vendor Payment", stepName: "accounts", path: "/vendor-payment", hidden: true }
];

const storeTabs = [
  { id: "dashboard", label: "Dashboard", path: "/" },
  { id: "procurement-tracker", label: "Procurement Tracker", path: "/procurement-tracker" },
  { id: "store-issue", label: "Store Issue", path: "/store-issue" },
  { id: "issue-data", label: "Issue Data", path: "/Issue-data" },
  { id: "inventory", label: "Inventory", path: "/inventory" },
  { id: "create-indent", label: "Create Indent", path: "/create-indent" },
  { id: "approve-indent", label: "Group Indent Approval", path: "/approve-indent" },
  { id: "vendor-rate-update", label: "Vendor Rate Update", path: "/vendor-rate-update" },
  { id: "technical-approval", label: "Technical Approval", path: "/technical-approval" },
  { id: "management-approval", label: "Mgmt Approval", path: "/management-approval" },
  { id: "pending-poss", label: "Pending PO to be Created", path: "/pending-poss" },
  { id: "create-po", label: "Create PO", path: "/create-po" },
  { id: "po-history", label: "PO History", path: "/po-history" },
  { id: "get-lift", label: "Material Receipt / Store In", path: "/get-lift" },
  { id: "store-in", label: "HOD Check", path: "/store-in" },
  { id: "hod-store-check", label: "Transporting Update", path: "/hod-store-check" },
  { id: "full-kitting", label: "Freight Payment", path: "/Full-Kiting" },
  { id: "payment-status", label: "Process for Payment / Debit Note", path: "/Payment-Status" },
  { id: "make-payment", label: "Make Payment", path: "/Make-Payment" },
  { id: "quality-check", label: "Reject For GRN", path: "/Quality-Check-In-Received-Item" },
  { id: "send-debit-note", label: "Send Debit Note", path: "/Send-Debit-Note" },
  { id: "audit-data", label: "Audit Data", path: "/audit-data" },
  { id: "bill-not-received", label: "Bill Not Received", path: "/Bill-Not-Received" },
  { id: "administration", label: "Adminstration", path: "/administration" }
];

const rmSalesTabs = [
  { id: "dashboard", label: "Dashboard", path: "/" },
  { id: "sale-orders", label: "Sale Orders", path: "/sale-orders" },
  { id: "logistics", label: "Logistics", path: "/logistics" },
  { id: "invoices", label: "Invoices", path: "/invoices" },
  { id: "inventory", label: "Inventory", path: "/inventory" },
  { id: "masters", label: "Masters", path: "/masters" },
  { id: "tracking", label: "Tracking", path: "/tracking" },
  { id: "reports", label: "Reports", path: "/reports" },
  { id: "settings", label: "Settings", path: "/settings" }
];

const checklistTabs = [
  { id: 'dashboard', label: 'Dashboard', stepName: 'Dashboard', path: '/dashboard' },
  { id: 'assign-task', label: 'Assign Task', stepName: 'Assign Task', path: '/assign-task' },
  { id: 'pc-dashboard', label: 'PC Dashboard', stepName: 'PC Dashboard', path: '/pc-dashboard' },
  { id: 'delegation', label: 'Delegation', stepName: 'Delegation', path: '/delegation' },
  { id: 'verification', label: 'Verification', stepName: 'Verification', path: '/verification' },
  { id: 'companies', label: 'Companies', stepName: 'Companies', path: '/companies' },
  { id: 'license', label: 'License', stepName: 'License', path: '/license' },
  { id: 'training-video', label: 'Training Video', stepName: 'Training Video', path: '/training-video' },
  { id: 'checklist-master', label: 'Checklist Master', stepName: 'Checklist Master', path: '/checklist-master' }
];

const freightPaymentTabs = [
  { id: "dashboard", label: "Dashboard", path: "/" },
  { id: "checkkitting", label: "Account Checking", path: "/checkkitting" },
  { id: "posting", label: "Account Audit", path: "/posting" },
  { id: "makepayment", label: "Posting", path: "/makepayment" },
  { id: "freight", label: "Freight", path: "/freight" },
  { id: "users", label: "Users", path: "/users" }
];

const inventoryTabs = [
  { id: "dashboard", label: "Dashboard", path: "/" },
  { id: "raw-material", label: "Raw Material", path: "/raw-material" },
  { id: "finished-good", label: "Finished Good", path: "/finished-good" },
  { id: "trading-material", label: "Trading Material", path: "/trading-material" },
  { id: "stock-adjustment", label: "Stock Adjustment", path: "/stock-adjustment" },
  { id: "history", label: "History", path: "/history" },
  { id: "settings", label: "Settings", path: "/settings" }
];

const paymentTabs = [
  { id: "dashboard", label: "Dashboard", path: "/" },
  { id: "payment-creation", label: "Payment Creation", path: "/payment-creation" },
  { id: "channel-funding", label: "Channel Funding", path: "/channel-funding" },
  { id: "payment-approval", label: "Payment Approval", path: "/payment-approval" },
  { id: "posting", label: "Posting", path: "/posting" },
  { id: "make-payment", label: "Make Payment", path: "/make-payment" },
  { id: "user-management", label: "User Management", path: "/user-management" }
];

const servicesTabs = [
  { id: "dashboard", label: "Dashboard", path: "/" },
  { id: "offers", label: "Offers", path: "/offers" },
  { id: "services", label: "Services", path: "/services" },
  { id: "bills", label: "Bills", path: "/bills" },
  { id: "tally", label: "Tally", path: "/tally" },
  { id: "utility", label: "Utility", path: "/utility" },
  { id: "reports", label: "Reports", path: "/reports" },
  { id: "users", label: "User Management", path: "/users" }
];

const repairTabs = [
  { id: "dashboard", label: "Dashboard", path: "/" },
  { id: "indent", label: "Indent", path: "/indent" },
  { id: "sent-to-vendor", label: "Sent to Vendor", path: "/sent-to-vendor" },
  { id: "check-machine", label: "Check Machine", path: "/check-machine" },
  { id: "store-in", label: "Store In", path: "/store-in" },
  { id: "make-payment", label: "Make Payment", path: "/make-payment" },
  { id: "accounts", label: "Accounts", path: "/accounts" },
  { id: "users", label: "User Management", path: "/users" }
];

export default function DashboardLayout({
  children,
  hideRightSidebar = false,
  basePath
}: {
  children?: ReactNode;
  hideRightSidebar?: boolean;
  basePath: '/dashboard' | '/purchase' | '/order' | '/production' | '/store' | '/rm-sales' | '/checklist' | '/freight-payment' | '/inventory' | '/payment' | '/services' | '/repair';
}) {
  const router = useRouter(); // Next.js Router — used for cross-system navigation
  const navigate = useNavigate(); // React Router — used for in-system navigation
  const location = useLocation(); // React Router

  const [user, setUser] = useState<AuthUser | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [checking, setChecking] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);

  const [sfExpanded, setSfExpanded] = useState(false);
  const [purchaseExpanded, setPurchaseExpanded] = useState(basePath === '/purchase');
  const [orderExpanded, setOrderExpanded] = useState(basePath === '/order');
  const [productionExpanded, setProductionExpanded] = useState(basePath === '/production');
  const [storeExpanded, setStoreExpanded] = useState(basePath === '/store');
  const [rmSalesExpanded, setRmSalesExpanded] = useState(basePath === '/rm-sales');
  const [checklistExpanded, setChecklistExpanded] = useState(basePath === '/checklist');
  const [freightPaymentExpanded, setFreightPaymentExpanded] = useState(basePath === '/freight-payment');
  const [inventoryExpanded, setInventoryExpanded] = useState(basePath === '/inventory');
  const [paymentExpanded, setPaymentExpanded] = useState(basePath === '/payment');
  const [servicesExpanded, setServicesExpanded] = useState(basePath === '/services');
  const [repairExpanded, setRepairExpanded] = useState(basePath === '/repair');

  const selectedSystem: 'overview' | 'purchase' | 'order' | 'production' | 'store' | 'rm-sales' | 'checklist' | 'freight-payment' | 'inventory' | 'payment' | 'services' | 'repair' =
    basePath === '/purchase'
      ? 'purchase'
      : basePath === '/order'
      ? 'order'
      : basePath === '/production'
      ? 'production'
      : basePath === '/store'
      ? 'store'
      : basePath === '/rm-sales'
      ? 'rm-sales'
      : basePath === '/checklist'
      ? 'checklist'
      : basePath === '/freight-payment'
      ? 'freight-payment'
      : basePath === '/inventory'
      ? 'inventory'
      : basePath === '/payment'
      ? 'payment'
      : basePath === '/services'
      ? 'services'
      : basePath === '/repair'
      ? 'repair'
      : 'overview';

  const toggleSystemAccordion = (system: 'purchase' | 'order' | 'production' | 'store' | 'rmSales' | 'checklist' | 'freightPayment' | 'inventory' | 'payment' | 'services' | 'repair') => {
    const isCurrentlyOpen =
      system === 'purchase' ? purchaseExpanded :
      system === 'order' ? orderExpanded :
      system === 'production' ? productionExpanded :
      system === 'store' ? storeExpanded :
      system === 'rmSales' ? rmSalesExpanded :
      system === 'checklist' ? checklistExpanded :
      system === 'freightPayment' ? freightPaymentExpanded :
      system === 'inventory' ? inventoryExpanded :
      system === 'payment' ? paymentExpanded :
      system === 'services' ? servicesExpanded :
      system === 'repair' ? repairExpanded : false;

    const nextState = !isCurrentlyOpen;

    setPurchaseExpanded(false);
    setOrderExpanded(false);
    setProductionExpanded(false);
    setStoreExpanded(false);
    setRmSalesExpanded(false);
    setChecklistExpanded(false);
    setFreightPaymentExpanded(false);
    setInventoryExpanded(false);
    setPaymentExpanded(false);
    setServicesExpanded(false);
    setRepairExpanded(false);

    if (typeof window !== 'undefined') {
      localStorage.setItem('purchaseExpanded', 'false');
      localStorage.setItem('orderExpanded', 'false');
      localStorage.setItem('productionExpanded', 'false');
      localStorage.setItem('storeExpanded', 'false');
      localStorage.setItem('rmSalesExpanded', 'false');
      localStorage.setItem('checklistExpanded', 'false');
      localStorage.setItem('freightPaymentExpanded', 'false');
      localStorage.setItem('inventoryExpanded', 'false');
      localStorage.setItem('paymentExpanded', 'false');
      localStorage.setItem('servicesExpanded', 'false');
      localStorage.setItem('repairExpanded', 'false');
    }

    if (nextState) {
      if (system === 'purchase') { setPurchaseExpanded(true); if (typeof window !== 'undefined') localStorage.setItem('purchaseExpanded', 'true'); }
      else if (system === 'order') { setOrderExpanded(true); if (typeof window !== 'undefined') localStorage.setItem('orderExpanded', 'true'); }
      else if (system === 'production') { setProductionExpanded(true); if (typeof window !== 'undefined') localStorage.setItem('productionExpanded', 'true'); }
      else if (system === 'store') { setStoreExpanded(true); if (typeof window !== 'undefined') localStorage.setItem('storeExpanded', 'true'); }
      else if (system === 'rmSales') { setRmSalesExpanded(true); if (typeof window !== 'undefined') localStorage.setItem('rmSalesExpanded', 'true'); }
      else if (system === 'checklist') { setChecklistExpanded(true); if (typeof window !== 'undefined') localStorage.setItem('checklistExpanded', 'true'); }
      else if (system === 'freightPayment') { setFreightPaymentExpanded(true); if (typeof window !== 'undefined') localStorage.setItem('freightPaymentExpanded', 'true'); }
      else if (system === 'inventory') { setInventoryExpanded(true); if (typeof window !== 'undefined') localStorage.setItem('inventoryExpanded', 'true'); }
      else if (system === 'payment') { setPaymentExpanded(true); if (typeof window !== 'undefined') localStorage.setItem('paymentExpanded', 'true'); }
      else if (system === 'services') { setServicesExpanded(true); if (typeof window !== 'undefined') localStorage.setItem('servicesExpanded', 'true'); }
      else if (system === 'repair') { setRepairExpanded(true); if (typeof window !== 'undefined') localStorage.setItem('repairExpanded', 'true'); }
    }
  };

  // Hydration-safe localStorage reading (ensures only 1 system accordion is open at a time)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSf = localStorage.getItem('sfExpanded');
      if (savedSf !== null) setSfExpanded(savedSf === 'true');

      const basePathToKey: Record<string, string> = {
        '/purchase': 'purchase',
        '/order': 'order',
        '/production': 'production',
        '/store': 'store',
        '/rm-sales': 'rmSales',
        '/checklist': 'checklist',
        '/freight-payment': 'freightPayment',
        '/inventory': 'inventory',
        '/payment': 'payment',
        '/services': 'services',
        '/repair': 'repair',
      };

      let activeKey = basePathToKey[basePath];

      if (!activeKey) {
        const savedKeys: Record<string, string> = {
          purchase: 'purchaseExpanded',
          order: 'orderExpanded',
          production: 'productionExpanded',
          store: 'storeExpanded',
          rmSales: 'rmSalesExpanded',
          checklist: 'checklistExpanded',
          freightPayment: 'freightPaymentExpanded',
          inventory: 'inventoryExpanded',
          payment: 'paymentExpanded',
          services: 'servicesExpanded',
          repair: 'repairExpanded',
        };

        for (const [key, storeKey] of Object.entries(savedKeys)) {
          if (localStorage.getItem(storeKey) === 'true') {
            activeKey = key;
            break;
          }
        }
      }

      setPurchaseExpanded(activeKey === 'purchase');
      setOrderExpanded(activeKey === 'order');
      setProductionExpanded(activeKey === 'production');
      setStoreExpanded(activeKey === 'store');
      setRmSalesExpanded(activeKey === 'rmSales');
      setChecklistExpanded(activeKey === 'checklist');
      setFreightPaymentExpanded(activeKey === 'freightPayment');
      setInventoryExpanded(activeKey === 'inventory');
      setPaymentExpanded(activeKey === 'payment');
      setServicesExpanded(activeKey === 'services');
      setRepairExpanded(activeKey === 'repair');
    }
  }, [basePath]);

  // Context properties defaults
  const poRows: any[] = [];
  const poLoading = false;
  const pendingApprovals = 0;

  const goToPurchase = (hashPath: string) => {
    if (basePath !== '/purchase') {
      router.push(`/purchase#${hashPath}`);
    } else {
      navigate(hashPath);
    }
  };

  const goToOrder = (hashPath: string) => {
    if (basePath !== '/order') {
      router.push(`/order#${hashPath}`);
    } else {
      navigate(hashPath);
    }
  };

  const goToProduction = (hashPath: string) => {
    if (basePath !== '/production') {
      router.push(`/production#${hashPath}`);
    } else {
      navigate(hashPath);
    }
  };

  const goToStore = (hashPath: string) => {
    if (basePath !== '/store') {
      router.push(`/store#${hashPath}`);
    } else {
      navigate(hashPath);
    }
  };

  const goToRmSales = (hashPath: string) => {
    if (basePath !== '/rm-sales') {
      router.push(`/rm-sales#${hashPath}`);
    } else {
      navigate(hashPath);
    }
  };

  const goToChecklist = (hashPath: string) => {
    if (basePath !== '/checklist') {
      router.push(`/checklist#${hashPath}`);
    } else {
      navigate(hashPath);
    }
  };

  const goToFreightPayment = (hashPath: string) => {
    if (basePath !== '/freight-payment') {
      router.push(`/freight-payment#${hashPath}`);
    } else {
      navigate(hashPath);
    }
  };

  const goToInventory = (hashPath: string) => {
    if (basePath !== '/inventory') {
      router.push(`/inventory#${hashPath}`);
    } else {
      navigate(hashPath);
    }
  };

  const goToPayment = (hashPath: string) => {
    if (basePath !== '/payment') {
      router.push(`/payment#${hashPath}`);
    } else {
      navigate(hashPath);
    }
  };

  const goToServices = (hashPath: string) => {
    if (basePath !== '/services') {
      router.push(`/services#${hashPath}`);
    } else {
      navigate(hashPath);
    }
  };

  const goToRepair = (hashPath: string) => {
    if (basePath !== '/repair') {
      router.push(`/repair#${hashPath}`);
    } else {
      navigate(hashPath);
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
      setTheme('dark');
    } else if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark');
      setTheme('light');
    } else {
      if (document.documentElement.classList.contains('dark')) {
        setTheme('dark');
      } else {
        document.documentElement.classList.remove('dark');
        setTheme('light');
      }
    }
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/');
      return;
    }

    setUser(getStoredUser());

    fetch(`${API_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Session expired');
        return res.json();
      })
      .then((data) => {
        const freshUser: AuthUser = {
          id: data.id,
          username: data.username,
          role: data.role,
          page_access: data.page_access,
          firm_name: data.firm_name,
          last_login: data.last_login,
        };
        setUser(freshUser);
        saveSession(token, freshUser);
        setChecking(false);
      })
      .catch(() => {
        clearSession();
        router.replace('/');
      });
  }, [router]);

  const toggleTheme = () => {
    if (theme === 'light') {
      document.documentElement.classList.add('dark');
      setTheme('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      setTheme('light');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleLogout = () => {
    clearSession();
    router.push('/');
  };

  if (checking || !user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#eef3ef] dark:bg-zinc-950 transition-colors duration-500">
        <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Loading...</p>
      </div>
    );
  }

  const initial = user?.username ? user.username.charAt(0).toUpperCase() : 'U';

  let pageTitle = `Welcome back, ${user.username || 'User'}!`;
  if (basePath === '/dashboard') {
    if (location.pathname === '/master') {
      pageTitle = 'Setting';
    }
  } else if (basePath === '/purchase') {
    const activeTab = purchaseTabs.find((tab) => tab.path === location.pathname);
    if (activeTab) {
      pageTitle = activeTab.id === 'dashboard' ? 'Dashboard' : activeTab.label;
    }
  } else if (basePath === '/order') {
    const orderPathToLabel: Record<string, string> = {
      '/order': 'Order', '/check-po': 'Check PO', '/received-accounts': 'Received Accounts',
      '/check-delivery': 'Check Delivery', '/arrange-logistics': 'Arrange Logistics',
      '/logistics-approval': 'Logistics Approval', '/dispatch-planning': 'Dispatch Planning',
      '/accounts-approval': 'Accounts Approval', '/logistic': 'Logistic',
      '/load-material': 'Load Material', '/wetman-entry': 'Wetman Entry',
      '/invoice': 'Invoice', '/fullkitting': 'Fullkitting', '/tc': 'TC',
      '/bilty-update': 'Bilty Update', '/crm': 'CRM', '/make-pi': 'Make PI',
      '/received-pi-payment': 'Received PI Payment', '/retention': 'Retention',
      '/material-return': 'Material Return', '/mgmt-approval': 'Management Approval',
      '/debit-note': 'Debit Note', '/return-of-material': 'Return of Material',
      '/dashboard': 'Dashboard',
    };
    pageTitle = orderPathToLabel[location.pathname] || `Welcome back, ${user.username}!`;
  } else if (basePath === '/production') {
    const activeTab = productionTabs.find((tab) => tab.path === location.pathname);
    if (activeTab) {
      pageTitle = activeTab.label;
    }
  } else if (basePath === '/store') {
    const activeTab = storeTabs.find((tab) => tab.path === location.pathname);
    if (activeTab) {
      pageTitle = activeTab.label;
    }
  } else if (basePath === '/checklist') {
    const activeTab = checklistTabs.find((tab) => tab.path === location.pathname);
    if (activeTab) {
      pageTitle = activeTab.label;
    }
  } else if (basePath === '/freight-payment') {
    const activeTab = freightPaymentTabs.find((tab) => tab.path === location.pathname);
    if (activeTab) {
      pageTitle = activeTab.label;
    } else {
      pageTitle = 'Freight Payment';
    }
  } else if (basePath === '/inventory') {
    const activeTab = inventoryTabs.find((tab) => tab.path === location.pathname);
    if (activeTab) {
      pageTitle = activeTab.label;
    } else {
      pageTitle = 'Inventory';
    }
  } else if (basePath === '/payment') {
    const activeTab = paymentTabs.find((tab) => tab.path === location.pathname);
    if (activeTab) {
      pageTitle = activeTab.label;
    } else {
      pageTitle = 'Payment';
    }
  } else if (basePath === '/services') {
    const activeTab = servicesTabs.find((tab) => tab.path === location.pathname);
    if (activeTab) {
      pageTitle = activeTab.label;
    } else {
      pageTitle = 'Services';
    }
  } else if (basePath === '/repair') {
    const activeTab = repairTabs.find((tab) => tab.path === location.pathname);
    if (activeTab) {
      pageTitle = activeTab.label;
    } else {
      pageTitle = 'Repair FMS';
    }
  }

  // Active Tab Highlight Helper
  const isTabActive = (sysPath: string, tabPath: string) => {
    if (basePath !== sysPath) return false;
    if (location.pathname === tabPath) return true;
    if ((location.pathname === '/' || location.pathname === '') && tabPath === '/dashboard') return true;
    return false;
  };

  // Calculate accessible Purchase steps for the user
  const allowedSteps = user ? (
    user.role === 'admin' || user.page_access === 'all' || user.page_access === 'super admin'
      ? ['admin']
      : (user.page_access || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean)
  ) : [];

  const isReadOnly = user?.page_access === 'viewonly';

  const accessiblePurchaseTabs = purchaseTabs.filter((tab) => {
    if (isReadOnly && tab.id === 'manage-users') return false;
    if (allowedSteps.includes('admin')) return !tab.hidden;
    const tabLabel = tab.label?.toLowerCase().trim();
    const tabStepName = tab.stepName?.toLowerCase().trim();
    return (
      allowedSteps.some((step) => {
        const stepLower = step.toLowerCase().trim();
        return stepLower === tabLabel || stepLower === tabStepName;
      }) && !tab.hidden
    );
  });

  const accessibleProductionTabs = productionTabs.filter(tab => !tab.hidden);

  return (
    <div className="fixed inset-0 overflow-hidden w-full flex bg-[#eef3ef] dark:bg-zinc-950 transition-colors duration-500 font-sans">
      {/* Mobile backdrop */}
      {mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
        />
      )}

      <aside
        className={`fixed md:sticky md:top-0 md:h-screen inset-y-0 left-0 z-40 flex flex-col shrink-0 w-72 bg-white dark:bg-zinc-900 shadow-[1px_0_0_0_rgba(0,0,0,0.04)] dark:shadow-none md:border-r md:border-zinc-100 dark:md:border-zinc-800/70 transition-transform md:transition-[width] duration-300 ${
          collapsed ? 'md:w-[84px]' : 'md:w-72'
        } ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Brand */}
        <div className={`flex items-center gap-3 px-5 pt-6 pb-5 ${collapsed ? 'md:justify-center md:px-0' : ''}`}>
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
            <Image src="/logo.png" alt="Passary System Logo" width={22} height={22} className="object-contain brightness-0 invert" priority />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-base font-bold text-zinc-900 dark:text-white tracking-tight leading-none truncate">Passary</p>
              <p className="text-[11px] font-medium text-zinc-400 mt-1">Merge System</p>
            </div>
          )}
          <button
            onClick={() => setMobileNavOpen(false)}
            className="md:hidden ml-auto shrink-0 flex items-center justify-center w-8 h-8 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Close menu"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className={`px-4 flex-1 overflow-y-auto scrollbar-none relative pb-4 ${collapsed ? 'md:px-3' : ''}`}>
          <p className={`text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-3 mb-2 ${collapsed ? 'md:hidden' : ''}`}>Menu</p>

          {/* Dashboard Link */}
          <button
            onClick={() => {
              if (basePath !== '/dashboard') {
                router.push('/dashboard');
              } else {
                navigate('/overview');
              }
              setMobileNavOpen(false);
            }}
            title="Dashboard"
            className={`w-full flex items-center gap-3 h-11 px-3 rounded-2xl text-sm font-semibold transition-all ${collapsed ? 'md:justify-center md:px-0' : ''} ${
              basePath === '/dashboard'
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                : 'text-zinc-500 dark:text-zinc-400 hover:bg-surface dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <LayoutIcon className="w-[18px] h-[18px] shrink-0" />
            {!collapsed && <span>Dashboard</span>}
          </button>

          {/* Systems */}
          <div className="mt-5">
            <p className={`text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-3 mb-2 ${collapsed ? 'md:hidden' : ''}`}>Systems</p>
            
            {/* Purchase System */}
            <button
              onClick={() => toggleSystemAccordion('purchase')}
              className={`w-full flex items-center gap-3 h-10 px-3 rounded-lg text-sm font-medium transition-colors ${
                selectedSystem === 'purchase'
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <PurchaseIcon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">Purchase</span>
              <ChevronDownIcon className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform ${purchaseExpanded ? 'rotate-180' : ''}`} />
            </button>

            {!collapsed && (
              <div className={`grid transition-all duration-300 ease-in-out ${purchaseExpanded ? 'grid-rows-[1fr] opacity-100 mt-1' : 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none'}`}>
                <div className="overflow-hidden">
                  <div className="space-y-1 max-h-[50vh] overflow-y-auto scrollbar-none pr-1">
                    {accessiblePurchaseTabs.map((tab) => {
                      const isActive = isTabActive('/purchase', tab.path);
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            goToPurchase(tab.path);
                            setMobileNavOpen(false);
                          }}
                          className={`w-full flex items-center pl-10 pr-3 h-9 rounded-lg text-sm font-medium transition-colors ${
                            isActive
                              ? 'text-zinc-900 dark:text-zinc-100 bg-zinc-50/80 dark:bg-zinc-800/40 font-semibold'
                              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                          }`}
                        >
                          <span className="truncate">{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Order System */}
          <div className="mt-2">
            <button
              onClick={() => toggleSystemAccordion('order')}
              className={`w-full flex items-center gap-3 h-10 px-3 rounded-lg text-sm font-medium transition-colors ${
                selectedSystem === 'order'
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <OrderIcon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">Order</span>
              <ChevronDownIcon className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform ${orderExpanded ? 'rotate-180' : ''}`} />
            </button>

            {!collapsed && (
              <div className={`grid transition-all duration-300 ease-in-out ${orderExpanded ? 'grid-rows-[1fr] opacity-100 mt-1' : 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none'}`}>
                <div className="overflow-hidden">
                  <div className="space-y-1 max-h-[50vh] overflow-y-auto scrollbar-none pr-1">
                    {[
                      { id: 'order', label: 'Order', path: '/order' },
                      { id: 'check-po', label: 'Check PO', path: '/check-po' },
                      { id: 'received-accounts', label: 'Received Accounts', path: '/received-accounts' },
                      { id: 'check-delivery', label: 'Check Delivery', path: '/check-delivery' },
                      { id: 'arrange-logistics', label: 'Arrange Logistics', path: '/arrange-logistics' },
                      { id: 'logistics-approval', label: 'Logistics App.', path: '/logistics-approval' },
                      { id: 'dispatch-planning', label: 'Dispatch Planning', path: '/dispatch-planning' },
                      { id: 'accounts-approval', label: 'Accounts App.', path: '/accounts-approval' },
                      { id: 'logistic', label: 'Logistic', path: '/logistic' },
                      { id: 'load-material', label: 'Load Material', path: '/load-material' },
                      { id: 'wetman-entry', label: 'Wetman Entry', path: '/wetman-entry' },
                      { id: 'invoice', label: 'Invoice', path: '/invoice' },
                      { id: 'fullkitting', label: 'Fullkitting', path: '/fullkitting' },
                      { id: 'tc', label: 'TC', path: '/tc' },
                      { id: 'bilty-update', label: 'Bilty Update', path: '/bilty-update' },
                      { id: 'crm', label: 'CRM', path: '/crm' },
                      { id: 'make-pi', label: 'Make PI', path: '/make-pi' },
                      { id: 'received-pi', label: 'Received PI Payment', path: '/received-pi-payment' },
                      { id: 'retention', label: 'Retention', path: '/retention' },
                      { id: 'material-return', label: 'Material Return', path: '/material-return' },
                      { id: 'mgmt-approval', label: 'Mgmt Approval', path: '/mgmt-approval' },
                      { id: 'debit-note', label: 'Debit Note', path: '/debit-note' },
                      { id: 'return-material', label: 'Return of Material', path: '/return-of-material' },
                      { id: 'order-dashboard', label: 'Dashboard', path: '/dashboard' },
                    ].map((tab) => {
                      const isActive = isTabActive('/order', tab.path);
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            goToOrder(tab.path);
                            setMobileNavOpen(false);
                          }}
                          className={`w-full flex items-center pl-10 pr-3 h-9 rounded-lg text-sm font-medium transition-colors ${
                            isActive
                              ? 'text-zinc-900 dark:text-zinc-100 bg-zinc-50/80 dark:bg-zinc-800/40 font-semibold'
                              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                          }`}
                        >
                          <span className="truncate">{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Production System */}
          <div className="mt-2">
            <button
              onClick={() => toggleSystemAccordion('production')}
              className={`w-full flex items-center gap-3 h-10 px-3 rounded-lg text-sm font-medium transition-colors ${
                selectedSystem === 'production'
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <ProductionIcon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">Production</span>
              <ChevronDownIcon className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform ${productionExpanded ? 'rotate-180' : ''}`} />
            </button>

            {!collapsed && (
              <div className={`grid transition-all duration-300 ease-in-out ${productionExpanded ? 'grid-rows-[1fr] opacity-100 mt-1' : 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none'}`}>
                <div className="overflow-hidden">
                  <div className="space-y-1 max-h-[50vh] overflow-y-auto scrollbar-none pr-1">
                    {(() => {
                      const sfTabs = accessibleProductionTabs.filter(t => t.isSf);
                      const regularTabs = accessibleProductionTabs.filter(t => !t.isSf);
                      
                      const kycIdx = regularTabs.findIndex(t => t.id === 'kyc');
                      const beforeSf = kycIdx !== -1 ? regularTabs.slice(0, kycIdx + 1) : regularTabs;
                      const afterSf = kycIdx !== -1 ? regularTabs.slice(kycIdx + 1) : [];

                      const renderTab = (tab: { id: string; label: string; path: string }, isSub = false) => {
                        const isActive = isTabActive('/production', tab.path);
                        return (
                          <button
                            key={tab.id}
                            onClick={() => {
                              goToProduction(tab.path);
                              setMobileNavOpen(false);
                            }}
                            className={`w-full flex items-center ${isSub ? 'pl-14' : 'pl-10'} pr-3 h-9 rounded-lg text-sm font-medium transition-colors ${
                              isActive
                                ? 'text-zinc-900 dark:text-zinc-100 bg-zinc-50/80 dark:bg-zinc-800/40 font-semibold'
                                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                            }`}
                          >
                            <span className="truncate">{tab.label}</span>
                          </button>
                        );
                      };

                      return (
                        <>
                          {beforeSf.map(tab => renderTab(tab))}
                          
                          {sfTabs.length > 0 && (
                            <div className="flex flex-col">
                              <button
                                onClick={() => {
                                  setSfExpanded(v => {
                                    const next = !v;
                                    if (typeof window !== 'undefined') localStorage.setItem('sfExpanded', String(next));
                                    return next;
                                  });
                                }}
                                className="w-full flex items-center pl-10 pr-3 h-9 rounded-lg text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                              >
                                <span className="flex-1 text-left truncate">Semi Finished</span>
                                <ChevronDownIcon className={`w-4 h-4 shrink-0 transition-transform ${sfExpanded ? 'rotate-180' : ''}`} />
                              </button>
                              <div className={`grid transition-all duration-300 ease-in-out ${sfExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
                                <div className="overflow-hidden">
                                  <div className="space-y-1">
                                    {sfTabs.map(tab => renderTab(tab, true))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {afterSf.map(tab => renderTab(tab))}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Store System */}
          <div className="mt-2">
            <button
              onClick={() => toggleSystemAccordion('store')}
              className={`w-full flex items-center gap-3 h-10 px-3 rounded-lg text-sm font-medium transition-colors ${
                selectedSystem === 'store'
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <StoreIcon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">Store</span>
              <ChevronDownIcon className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform ${storeExpanded ? 'rotate-180' : ''}`} />
            </button>

            {!collapsed && (
              <div className={`grid transition-all duration-300 ease-in-out ${storeExpanded ? 'grid-rows-[1fr] opacity-100 mt-1' : 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none'}`}>
                <div className="overflow-hidden">
                  <div className="space-y-1 max-h-[50vh] overflow-y-auto scrollbar-none pr-1">
                    {storeTabs.map((tab) => {
                      const isActive = isTabActive('/store', tab.path);
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            goToStore(tab.path);
                            setMobileNavOpen(false);
                          }}
                          className={`w-full flex items-center pl-10 pr-3 h-9 rounded-lg text-sm font-medium transition-colors ${
                            isActive
                              ? 'text-zinc-900 dark:text-zinc-100 bg-zinc-50/80 dark:bg-zinc-800/40 font-semibold'
                              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                          }`}
                        >
                          <span className="truncate">{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RM Sales System */}
          <div className="mt-2">
            <button
              onClick={() => toggleSystemAccordion('rmSales')}
              className={`w-full flex items-center gap-3 h-10 px-3 rounded-lg text-sm font-medium transition-colors ${
                selectedSystem === 'rm-sales'
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <RmSalesIcon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">RM Sales</span>
              <ChevronDownIcon className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform ${rmSalesExpanded ? 'rotate-180' : ''}`} />
            </button>

            {!collapsed && (
              <div className={`grid transition-all duration-300 ease-in-out ${rmSalesExpanded ? 'grid-rows-[1fr] opacity-100 mt-1' : 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none'}`}>
                <div className="overflow-hidden">
                  <div className="space-y-1 max-h-[50vh] overflow-y-auto scrollbar-none pr-1">
                    {rmSalesTabs.map((tab) => {
                      const isActive = isTabActive('/rm-sales', tab.path);
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            goToRmSales(tab.path);
                            setMobileNavOpen(false);
                          }}
                          className={`w-full flex items-center pl-10 pr-3 h-9 rounded-lg text-sm font-medium transition-colors ${
                            isActive
                              ? 'text-zinc-900 dark:text-zinc-100 bg-zinc-50/80 dark:bg-zinc-800/40 font-semibold'
                              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                          }`}
                        >
                          <span className="truncate">{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Checklist & Delegation System */}
          <div className="mt-2">
            <button
              onClick={() => toggleSystemAccordion('checklist')}
              className={`w-full flex items-center gap-3 h-10 px-3 rounded-lg text-sm font-medium transition-colors ${
                selectedSystem === 'checklist'
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <ChecklistIcon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">Checklist &amp; Delegation</span>
              <ChevronDownIcon className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform ${checklistExpanded ? 'rotate-180' : ''}`} />
            </button>

            {!collapsed && (
              <div className={`grid transition-all duration-300 ease-in-out ${checklistExpanded ? 'grid-rows-[1fr] opacity-100 mt-1' : 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none'}`}>
                <div className="overflow-hidden">
                  <div className="space-y-1 max-h-[50vh] overflow-y-auto scrollbar-none pr-1">
                    {checklistTabs.map((tab) => {
                      const isActive = isTabActive('/checklist', tab.path);
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            goToChecklist(tab.path);
                            setMobileNavOpen(false);
                          }}
                          className={`w-full flex items-center pl-10 pr-3 h-9 rounded-lg text-sm font-medium transition-colors ${
                            isActive
                              ? 'text-zinc-900 dark:text-zinc-100 bg-zinc-50/80 dark:bg-zinc-800/40 font-semibold'
                              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                          }`}
                        >
                          <span className="truncate">{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Freight Payment System */}
          <div className="mt-2">
            <button
              onClick={() => toggleSystemAccordion('freightPayment')}
              className={`w-full flex items-center gap-3 h-10 px-3 rounded-lg text-sm font-medium transition-colors ${
                selectedSystem === 'freight-payment'
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <FreightIcon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">Freight Payment</span>
              <ChevronDownIcon className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform ${freightPaymentExpanded ? 'rotate-180' : ''}`} />
            </button>

            {!collapsed && (
              <div className={`grid transition-all duration-300 ease-in-out ${freightPaymentExpanded ? 'grid-rows-[1fr] opacity-100 mt-1' : 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none'}`}>
                <div className="overflow-hidden">
                  <div className="space-y-1 max-h-[50vh] overflow-y-auto scrollbar-none pr-1">
                    {freightPaymentTabs.map((tab) => {
                      const isActive = isTabActive('/freight-payment', tab.path);
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            goToFreightPayment(tab.path);
                            setMobileNavOpen(false);
                          }}
                          className={`w-full flex items-center pl-10 pr-3 h-9 rounded-lg text-sm font-medium transition-colors ${
                            isActive
                              ? 'text-zinc-900 dark:text-zinc-100 bg-zinc-50/80 dark:bg-zinc-800/40 font-semibold'
                              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                          }`}
                        >
                          <span className="truncate">{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Inventory System */}
          <div className="mt-2">
            <button
              onClick={() => toggleSystemAccordion('inventory')}
              className={`w-full flex items-center gap-3 h-10 px-3 rounded-lg text-sm font-medium transition-colors ${
                selectedSystem === 'inventory'
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <InventoryIcon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">Inventory</span>
              <ChevronDownIcon className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform ${inventoryExpanded ? 'rotate-180' : ''}`} />
            </button>

            {!collapsed && (
              <div className={`grid transition-all duration-300 ease-in-out ${inventoryExpanded ? 'grid-rows-[1fr] opacity-100 mt-1' : 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none'}`}>
                <div className="overflow-hidden">
                  <div className="space-y-1 max-h-[50vh] overflow-y-auto scrollbar-none pr-1">
                    {inventoryTabs.map((tab) => {
                      const isActive = isTabActive('/inventory', tab.path);
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            goToInventory(tab.path);
                            setMobileNavOpen(false);
                          }}
                          className={`w-full flex items-center pl-10 pr-3 h-9 rounded-lg text-sm font-medium transition-colors ${
                            isActive
                              ? 'text-zinc-900 dark:text-zinc-100 bg-zinc-50/80 dark:bg-zinc-800/40 font-semibold'
                              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                          }`}
                        >
                          <span className="truncate">{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment System */}
          <div className="mt-2">
            <button
              onClick={() => toggleSystemAccordion('payment')}
              className={`w-full flex items-center gap-3 h-10 px-3 rounded-lg text-sm font-medium transition-colors ${
                selectedSystem === 'payment'
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <PaymentIcon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">Payment</span>
              <ChevronDownIcon className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform ${paymentExpanded ? 'rotate-180' : ''}`} />
            </button>

            {!collapsed && (
              <div className={`grid transition-all duration-300 ease-in-out ${paymentExpanded ? 'grid-rows-[1fr] opacity-100 mt-1' : 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none'}`}>
                <div className="overflow-hidden">
                  <div className="space-y-1 max-h-[50vh] overflow-y-auto scrollbar-none pr-1">
                    {paymentTabs.map((tab) => {
                      const isActive = isTabActive('/payment', tab.path);
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            goToPayment(tab.path);
                            setMobileNavOpen(false);
                          }}
                          className={`w-full flex items-center pl-10 pr-3 h-9 rounded-lg text-sm font-medium transition-colors ${
                            isActive
                              ? 'text-zinc-900 dark:text-zinc-100 bg-zinc-50/80 dark:bg-zinc-800/40 font-semibold'
                              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                          }`}
                        >
                          <span className="truncate">{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Services System */}
          <div className="mt-2">
            <button
              onClick={() => toggleSystemAccordion('services')}
              className={`w-full flex items-center gap-3 h-10 px-3 rounded-lg text-sm font-medium transition-colors ${
                selectedSystem === 'services'
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <ServicesIcon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">Services</span>
              <ChevronDownIcon className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform ${servicesExpanded ? 'rotate-180' : ''}`} />
            </button>

            {!collapsed && (
              <div className={`grid transition-all duration-300 ease-in-out ${servicesExpanded ? 'grid-rows-[1fr] opacity-100 mt-1' : 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none'}`}>
                <div className="overflow-hidden">
                  <div className="space-y-1 max-h-[50vh] overflow-y-auto scrollbar-none pr-1">
                    {servicesTabs.map((tab) => {
                      const isActive = isTabActive('/services', tab.path);
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            goToServices(tab.path);
                            setMobileNavOpen(false);
                          }}
                          className={`w-full flex items-center pl-10 pr-3 h-9 rounded-lg text-sm font-medium transition-colors ${
                            isActive
                              ? 'text-zinc-900 dark:text-zinc-100 bg-zinc-50/80 dark:bg-zinc-800/40 font-semibold'
                              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                          }`}
                        >
                          <span className="truncate">{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Repair FMS System */}
          <div className="mt-2">
            <button
              onClick={() => toggleSystemAccordion('repair')}
              className={`w-full flex items-center gap-3 h-10 px-3 rounded-lg text-sm font-medium transition-colors ${
                selectedSystem === 'repair'
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <RepairIcon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">Repair FMS</span>
              <ChevronDownIcon className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform ${repairExpanded ? 'rotate-180' : ''}`} />
            </button>

            {!collapsed && (
              <div className={`grid transition-all duration-300 ease-in-out ${repairExpanded ? 'grid-rows-[1fr] opacity-100 mt-1' : 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none'}`}>
                <div className="overflow-hidden">
                  <div className="space-y-1 max-h-[50vh] overflow-y-auto scrollbar-none pr-1">
                    {repairTabs.map((tab) => {
                      const isActive = isTabActive('/repair', tab.path);
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            goToRepair(tab.path);
                            setMobileNavOpen(false);
                          }}
                          className={`w-full flex items-center pl-10 pr-3 h-9 rounded-lg text-sm font-medium transition-colors ${
                            isActive
                              ? 'text-zinc-900 dark:text-zinc-100 bg-zinc-50/80 dark:bg-zinc-800/40 font-semibold'
                              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                          }`}
                        >
                          <span className="truncate">{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={`p-4 border-t border-zinc-100 dark:border-zinc-800/70 shrink-0 ${collapsed ? 'md:px-3' : ''}`}>
          <button
            onClick={() => {
              if (basePath !== '/dashboard') {
                router.push('/dashboard#/master');
              } else {
                navigate('/master');
              }
              setMobileNavOpen(false);
            }}
            title="Setting"
            className={`w-full flex items-center gap-3 h-11 px-3 rounded-2xl text-sm font-semibold transition-colors ${collapsed ? 'md:justify-center md:px-0' : ''} ${
              (basePath === '/dashboard' && location.pathname === '/master')
                ? 'bg-brand-soft text-[#1b5e41] dark:text-[#a7e3c4]'
                : 'text-zinc-500 dark:text-zinc-400 hover:bg-surface dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <LayoutIcon className="w-[18px] h-[18px] shrink-0" />
            {!collapsed && <span>Setting</span>}
          </button>

          <button
            onClick={() => setCollapsed((c) => !c)}
            className={`hidden md:flex w-full items-center gap-3 h-10 px-3 mt-1.5 rounded-2xl text-sm font-medium text-zinc-400 hover:bg-surface dark:hover:bg-zinc-800/60 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors ${collapsed ? 'justify-center px-0' : ''}`}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronsLeftIcon className={`w-[18px] h-[18px] shrink-0 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="grow flex-1 min-w-0 overflow-y-auto">
        <div className="flex flex-col xl:flex-row gap-6 p-4 sm:p-6 lg:p-10">
          <div className="flex-1 min-w-0">
            {/* Top row / Header */}
            <header className="flex items-center justify-between gap-4 flex-wrap mb-8">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileNavOpen(true)}
                  className="md:hidden flex items-center justify-center w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 shrink-0"
                  title="Open menu"
                >
                  <LogInIcon className="w-4 h-4 rotate-180" />
                </button>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  {pageTitle}
                </h1>
              </div>

              <div className="flex items-center gap-3 sm:gap-5">
                <div className="relative hidden sm:block">
                  <SearchIcon className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search vendor, material, firm…"
                    className="w-[220px] h-[42px] pl-10 pr-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs font-medium outline-none shadow-sm focus:ring-1 focus:ring-[#2fa36b] dark:focus:ring-[#5ec792] transition-all placeholder:text-zinc-400 text-zinc-900 dark:text-white"
                  />
                </div>

                {/* Theme Toggle Button */}
                <button
                  onClick={toggleTheme}
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                >
                  {theme === 'light' ? <MoonIcon className="w-4 h-4" /> : <SunIcon className="w-4 h-4" />}
                </button>

                <div className="relative shrink-0">
                  <button
                    onClick={() => setAvatarMenuOpen((o) => !o)}
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-[#2fa36b] dark:bg-[#5ec792] text-white dark:text-zinc-900 text-sm font-bold"
                  >
                    {initial}
                  </button>
                  {avatarMenuOpen && (
                    <div className="absolute right-0 mt-2 w-52 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl z-50">
                      <div className="px-3.5 py-2 border-b border-zinc-100 dark:border-zinc-800">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{user.username}</p>
                        <p className="text-xs text-zinc-400 capitalize">{user.role}</p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      >
                        <LogOutIcon className="w-3.5 h-3.5" />
                        Log out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </header>

            {/* Dynamic Content area */}
            <div className={location.pathname !== '/overview' ? 'hide-page-titles' : ''}>
              {children || <Outlet context={{ user, searchQuery, poRows, poLoading, theme, toggleTheme, goToPurchase, pendingApprovals }} />}
            </div>

            <style>{`
              .hide-page-titles h1:first-of-type,
              .hide-page-titles [data-slot="card"]:first-of-type > [data-slot="card-header"]:first-of-type [data-slot="card-title"] {
                display: none !important;
              }
              .hide-page-titles .mb-8:first-of-type h1 {
                display: none !important;
              }
            `}</style>
          </div>
        </div>
      </div>
    </div>
  );
}
