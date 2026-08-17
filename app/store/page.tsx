'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/systems/store/context/AuthContext';
import { SheetsProvider } from '@/systems/store/context/SheetsContext';
import DashboardLayout from '@/systems/core/components/DashboardLayout';

// Dynamic imports of Store components
const Dashboard = dynamic(() => import('@/systems/store/components/views/Dashboard'), { ssr: false });
const IndentTrackerDashboard = dynamic(() => import('@/systems/store/components/views/IndentTrackerDashboard'), { ssr: false });
const StoreIssue = dynamic(() => import('@/systems/store/components/views/StoreIssue'), { ssr: false });
const IssueData = dynamic(() => import('@/systems/store/components/views/IssueData'), { ssr: false });
const Inventory = dynamic(() => import('@/systems/store/components/views/Inventory'), { ssr: false });
const StoreMaster = dynamic(() => import('@/systems/store/components/views/Master'), { ssr: false });
const StoreReceived = dynamic(() => import('@/systems/store/components/views/Received'), { ssr: false });
const StoreStock = dynamic(() => import('@/systems/store/components/views/Stock'), { ssr: false });
const CreateIndent = dynamic(() => import('@/systems/store/components/views/CreateIndent'), { ssr: false });
const ApproveIndent = dynamic(() => import('@/systems/store/components/views/ApproveIndent'), { ssr: false });
const VendorUpdate = dynamic(() => import('@/systems/store/components/views/VendorUpdate'), { ssr: false });
const DepartmentApproval = dynamic(() => import('@/systems/store/components/views/TechnicalApproval'), { ssr: false });
const RateApproval = dynamic(() => import('@/systems/store/components/views/RateApproval'), { ssr: false });
const PendingPo = dynamic(() => import('@/systems/store/components/views/PendingPo'), { ssr: false });
const CreatePO = dynamic(() => import('@/systems/store/components/views/CreatePO'), { ssr: false });
const Order = dynamic(() => import('@/systems/store/components/views/Order'), { ssr: false });
const GetLift = dynamic(() => import('@/systems/store/components/views/GetLift'), { ssr: false });
const StoreIn = dynamic(() => import('@/systems/store/components/views/StoreIn'), { ssr: false });
const HodStoreApproval = dynamic(() => import('@/systems/store/components/views/HodStoreApproval'), { ssr: false });
const FullKitting = dynamic(() => import('@/systems/store/components/views/FullKitting'), { ssr: false });
const PaymentStatus = dynamic(() => import('@/systems/store/components/views/PaymentStatus'), { ssr: false });
const MakePayment = dynamic(() => import('@/systems/store/components/views/MakePayment'), { ssr: false });
const QuantityCheckInReceiveItem = dynamic(() => import('@/systems/store/components/views/QuantityCheckInReceiveItem'), { ssr: false });
const SendDebitNote = dynamic(() => import('@/systems/store/components/views/SendDebitNote'), { ssr: false });
const AuditData = dynamic(() => import('@/systems/store/components/views/AuditData'), { ssr: false });
const BillNotReceived = dynamic(() => import('@/systems/store/components/views/BillNotReceived'), { ssr: false });
const Administration = dynamic(() => import('@/systems/store/components/views/Administration'), { ssr: false });

const storeTabs = [
  { id: "dashboard", label: "Dashboard", path: "/" },
  { id: "procurement-tracker", label: "Procurement Tracker", path: "/procurement-tracker" },
  { id: "store-issue", label: "Store Issue", path: "/store-issue" },
  { id: "issue-data", label: "Issue Data", path: "/Issue-data" },
  { id: "inventory", label: "Inventory", path: "/inventory" },
  { id: "master", label: "Master", path: "/master" },
  { id: "received", label: "Received", path: "/received" },
  { id: "stock", label: "Stock", path: "/stock" },
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

const renderStoreComponent = (tabId: string) => {
  switch (tabId) {
    case 'dashboard': return <Dashboard />;
    case 'procurement-tracker': return <IndentTrackerDashboard />;
    case 'store-issue': return <StoreIssue />;
    case 'issue-data': return <IssueData />;
    case 'inventory': return <Inventory />;
    case 'master': return <StoreMaster />;
    case 'received': return <StoreReceived />;
    case 'stock': return <StoreStock />;
    case 'create-indent': return <CreateIndent />;
    case 'approve-indent': return <ApproveIndent />;
    case 'vendor-rate-update': return <VendorUpdate />;
    case 'technical-approval': return <DepartmentApproval />;
    case 'management-approval': return <RateApproval />;
    case 'pending-poss': return <PendingPo />;
    case 'create-po': return <CreatePO />;
    case 'po-history': return <Order />;
    case 'get-lift': return <GetLift />;
    case 'store-in': return <StoreIn />;
    case 'hod-store-check': return <HodStoreApproval />;
    case 'full-kitting': return <FullKitting />;
    case 'payment-status': return <PaymentStatus />;
    case 'make-payment': return <MakePayment />;
    case 'quality-check': return <QuantityCheckInReceiveItem />;
    case 'send-debit-note': return <SendDebitNote />;
    case 'audit-data': return <AuditData />;
    case 'bill-not-received': return <BillNotReceived />;
    case 'administration': return <Administration />;
    default: return <Dashboard />;
  }
};

// SheetsProvider is hoisted here — outside Routes — so all 12 data fetches
// fire once when the store loads and survive tab navigation without re-mounting.
// AuthProvider stays per-route, matching the production & purchase pattern exactly.
function RouterApp() {
  return (
    <SheetsProvider>
      <Routes>
        <Route element={<DashboardLayout basePath="/store" />}>
          {storeTabs.map((tab) => (
            <Route
              key={tab.id}
              path={tab.path}
              element={
                <AuthProvider>
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-8 transition-colors duration-500 flex flex-col shadow-sm">
                    {renderStoreComponent(tab.id)}
                  </div>
                </AuthProvider>
              }
            />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </SheetsProvider>
  );
}

export default function Store() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#eef3ef] dark:bg-zinc-950 transition-colors duration-500">
        <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Loading...</p>
      </div>
    );
  }

  return (
    <HashRouter>
      <RouterApp />
    </HashRouter>
  );
}
