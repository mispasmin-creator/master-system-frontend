'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/systems/purchase/context/AuthContext';
import { NotificationProvider } from '@/systems/purchase/context/NotificationContext';
import DashboardLayout from '@/systems/core/components/DashboardLayout';

// Dynamic imports of Purchase components
// Note: the Purchase system's own Dashboard now lives on the main Dashboard
// page (Overview.tsx) behind the system-select dropdown, not as a tab here.
const IndentForm = dynamic(() => import('@/systems/purchase/components/Indent'), { ssr: false });
const StockApproval = dynamic(() => import('@/systems/purchase/components/HODApproval'), { ssr: false });
const ThreeParty = dynamic(() => import('@/systems/purchase/components/ThreeParty'), { ssr: false });
const FactoryApprovals = dynamic(() => import('@/systems/purchase/components/FactoryApp'), { ssr: false });
const ManagementApprovals = dynamic(() => import('@/systems/purchase/components/MgmtApp'), { ssr: false });
const GeneratePO = dynamic(() => import('@/systems/purchase/components/MakePO'), { ssr: false });
const POHistory = dynamic(() => import('@/systems/purchase/components/POHistory'), { ssr: false });
const ArrangeLogistics = dynamic(() => import('@/systems/purchase/components/ArrangeLogistics'), { ssr: false });
const LogisticsApproval = dynamic(() => import('@/systems/purchase/components/LogisticsApp'), { ssr: false });
const TallyEntry = dynamic(() => import('@/systems/purchase/components/POEntry'), { ssr: false });
const OriginalBillsFiledPage = dynamic(() => import('@/systems/purchase/components/AdvancePayment'), { ssr: false });
const LiftMaterial = dynamic(() => import('@/systems/purchase/components/Lift'), { ssr: false });
const ReceiptCheck = dynamic(() => import('@/systems/purchase/components/Receipt'), { ssr: false });
const ManagementUnloadApproval = dynamic(() => import('@/systems/purchase/components/UnloadApp'), { ssr: false });
const LabTesting = dynamic(() => import('@/systems/purchase/components/Lab'), { ssr: false });
const LabReportPage = dynamic(() => import('@/systems/purchase/components/LabReport'), { ssr: false });
const BiltyPage = dynamic(() => import('@/systems/purchase/components/Bilty'), { ssr: false });
const Mismatch = dynamic(() => import('@/systems/purchase/components/Mismatch'), { ssr: false });
const PurchaseReturnPage = dynamic(() => import('@/systems/purchase/components/PurchaseReturn'), { ssr: false });
const PurchaserCoordinate = dynamic(() => import('@/systems/purchase/components/PurchaserCoord'), { ssr: false });
const AuditData = dynamic(() => import('@/systems/purchase/components/AccountsAudit'), { ssr: false });
const DebitNote = dynamic(() => import('@/systems/purchase/components/DebitNote'), { ssr: false });
const FullkittingTransportingPage = dynamic(() => import('@/systems/purchase/components/Fullkitting'), { ssr: false });
const ManageUsers = dynamic(() => import('@/systems/purchase/components/ManageUsers'), { ssr: false });
const RactifyMistake = dynamic(() => import('@/systems/purchase/components/Ractify-mistake'), { ssr: false });
const FinalTallyEntry = dynamic(() => import('@/systems/purchase/components/final-tally-entry'), { ssr: false });
const RactifyMistake2 = dynamic(() => import('@/systems/purchase/components/Ractify-mistake2'), { ssr: false });
const TakeEntryTallyPage = dynamic(() => import('@/systems/purchase/components/Take-entryby-tally'), { ssr: false });
const AgainAuditingPage = dynamic(() => import('@/systems/purchase/components/Again-for-auditing'), { ssr: false });
const TolrancePage = dynamic(() => import('@/systems/purchase/components/Tolrance'), { ssr: false });
const KycPage = dynamic(() => import('@/systems/purchase/components/KycPage'), { ssr: false });
const VendorPaymentPage = dynamic(() => import('@/systems/purchase/components/VendorPaymentPage'), { ssr: false });

const purchaseTabs = [
  { id: "indent", label: "Indent", stepName: "Generate Indent", path: "/indent" },
  { id: "stock", label: "HOD Approval", stepName: "Recheck the Stock And Approve Quantity", path: "/stock-approval" },
  { id: "three-party", label: "Three Party", stepName: "vendor", path: "/three-party" },
  { id: "factory-approval", label: "Factory App.", stepName: "management", path: "/factory-approval" },
  { id: "management-approval", label: "Mgmt App.", stepName: "management", path: "/management-approval" },
  { id: "generate-po", label: " Make PO", stepName: "Generate Purchase Order", path: "/make-po" },
  { id: "po-history", label: "PO History", stepName: "Generate Purchase Order", path: "/po-history" },
  { id: "original-bills", label: "Advance Payement", stepName: "accounts", path: "/advance-payement" },
  { id: "arrange-logistics", label: "Arrange Logistics", stepName: "Arrange Logistics", path: "/arrange-logistics" },
  { id: "logistics-approval", label: "Logistics App.", stepName: "Logistics Approval", path: "/logistics-approval" },
  { id: "tally-entry", label: "PO Entry", stepName: "Purchase Order Entry In Tally", path: "/po-entry" },
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

const renderPurchaseComponent = (tabId: string) => {
  switch (tabId) {
    case 'indent': return <IndentForm />;
    case 'stock': return <StockApproval />;
    case 'three-party': return <ThreeParty />;
    case 'factory-approval': return <FactoryApprovals />;
    case 'management-approval': return <ManagementApprovals />;
    case 'generate-po': return <GeneratePO />;
    case 'po-history': return <POHistory />;
    case 'arrange-logistics': return <ArrangeLogistics />;
    case 'logistics-approval': return <LogisticsApproval />;
    case 'tally-entry': return <TallyEntry />;
    case 'original-bills': return <OriginalBillsFiledPage />;
    case 'lift-material': return <LiftMaterial />;
    case 'receipt-check': return <ReceiptCheck />;
    case 'unload-management': return <ManagementUnloadApproval />;
    case 'lab-testing': return <LabTesting />;
    case 'lab-report': return <LabReportPage />;
    case 'bilty': return <BiltyPage />;
    case 'mismatch': return <Mismatch />;
    case 'purchase-return': return <PurchaseReturnPage />;
    case 'purchaser-coordinate': return <PurchaserCoordinate />;
    case 'audit-data': return <AuditData />;
    case 'debit-note': return <DebitNote />;
    case 'fullkitting': return <FullkittingTransportingPage />;
    case 'manage-users': return <ManageUsers />;
    case 'rectify-mistake': return <RactifyMistake />;
    case 'final-tally-entry': return <FinalTallyEntry />;
    case 'rectify-mistake-2': return <RactifyMistake2 />;
    case 'take-entry-tally': return <TakeEntryTallyPage />;
    case 'again-auditing': return <AgainAuditingPage />;
    case 'tolerance': return <TolrancePage />;
    case 'kyc': return <KycPage />;
    case 'vendor-payment': return <VendorPaymentPage />;
    default: return <IndentForm />;
  }
};

function RouterApp() {
  return (
    <Routes>
      <Route element={<DashboardLayout basePath="/purchase" />}>
        {purchaseTabs.map((tab) => (
          <Route
            key={tab.id}
            path={tab.path}
            element={
              <AuthProvider>
                <NotificationProvider>
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-8 transition-colors duration-500 flex flex-col shadow-sm">
                    {renderPurchaseComponent(tab.id)}
                  </div>
                </NotificationProvider>
              </AuthProvider>
            }
          />
        ))}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default function Purchase() {
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
