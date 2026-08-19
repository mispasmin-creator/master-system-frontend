'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/systems/production/context/AuthContext';
import DashboardLayout from '@/systems/core/components/DashboardLayout';

// Dynamic imports of Production components
const Dashboard = dynamic(() => import('@/systems/production/components/Dashboard'), { ssr: false });
const Orders = dynamic(() => import('@/systems/production/components/Orders'), { ssr: false });
const PiApproval = dynamic(() => import('@/systems/production/components/PiApproval'), { ssr: false });
const SfProduction = dynamic(() => import('@/systems/production/components/SfProduction'), { ssr: false });
const Costing = dynamic(() => import('@/systems/production/components/Costing'), { ssr: false });
const SampleTest = dynamic(() => import('@/systems/production/components/SampleTest'), { ssr: false });
const LabTesting1 = dynamic(() => import('@/systems/production/components/LabTesting1'), { ssr: false });
const LabTesting2 = dynamic(() => import('@/systems/production/components/LabTesting2'), { ssr: false });
const ChemicalTest = dynamic(() => import('@/systems/production/components/ChemicalTest'), { ssr: false });
const CompositionQc = dynamic(() => import('@/systems/production/components/CompositionQc'), { ssr: false });
const JobCards = dynamic(() => import('@/systems/production/components/JobCards'), { ssr: false });
const Crushing = dynamic(() => import('@/systems/production/components/Crushing'), { ssr: false });
const Tally = dynamic(() => import('@/systems/production/components/Tally'), { ssr: false });
const Tally_entry = dynamic(() => import('@/systems/production/components/Tally_entry'), { ssr: false });
const SfjobCard = dynamic(() => import('@/systems/production/components/SfjobCard'), { ssr: false });
const SfproductionEntry = dynamic(() => import('@/systems/production/components/SfproductionEntry'), { ssr: false });
const FullKitting = dynamic(() => import('@/systems/production/components/FullKitting'), { ssr: false });
const Management = dynamic(() => import('@/systems/production/components/Management'), { ssr: false });
const ManagementApp = dynamic(() => import('@/systems/production/components/ManagementApp'), { ssr: false });
const Kyc = dynamic(() => import('@/systems/production/components/Kyc'), { ssr: false });
const Check = dynamic(() => import('@/systems/production/components/Check'), { ssr: false });
const ProductionTracking = dynamic(() => import('@/systems/production/components/ProductionTracking'), { ssr: false });

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
  { id: "chemical-test", label: "Chemical Test", stepName: "Chemical Test", path: "/chemical-test", hidden: true },
  { id: "management", label: "Management Approval", stepName: "Management", path: "/management", hidden: true },
  { id: "check", label: "Check", stepName: "Check", path: "/check", hidden: true }
];

const renderProductionComponent = (tabId: string) => {
  switch (tabId) {
    case 'dashboard': return <Dashboard />;
    case 'orders': return <Orders />;
    case 'pi-approval': return <PiApproval />;
    case 'sf-production': return <SfProduction />;
    case 'costing': return <Costing />;
    case 'sample-test': return <SampleTest />;
    case 'lab-testing1': return <LabTesting1 />;
    case 'lab-testing2': return <LabTesting2 />;
    case 'chemical-test': return <ChemicalTest />;
    case 'composition-qc': return <CompositionQc />;
    case 'job-cards': return <JobCards />;
    case 'crushing': return <Crushing />;
    case 'tally': return <Tally />;
    case 'tally-entry': return <Tally_entry />;
    case 'sfjob-card': return <SfjobCard />;
    case 'sfproduction-entry': return <SfproductionEntry />;
    case 'full-kitting': return <FullKitting />;
    case 'management': return <Management />;
    case 'management-app': return <ManagementApp />;
    case 'kyc': return <Kyc />;
    case 'production-tracking': return <ProductionTracking />;
    case 'check': return <Check />;
    default: return <Dashboard />;
  }
};

function RouterApp() {
  return (
    <Routes>
      <Route element={<DashboardLayout basePath="/production" />}>
        {productionTabs.map((tab) => (
          <Route
            key={tab.id}
            path={tab.path}
            element={
              <AuthProvider>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-8 transition-colors duration-500 flex flex-col shadow-sm">
                  {renderProductionComponent(tab.id)}
                </div>
              </AuthProvider>
            }
          />
        ))}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default function Production() {
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
