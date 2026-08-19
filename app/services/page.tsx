'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '@/systems/core/components/DashboardLayout';

const Dashboard = dynamic(() => import('@/systems/services/components/modules/Dashboard'), { ssr: false });
const Offers = dynamic(() => import('@/systems/services/components/modules/Offers'), { ssr: false });
const Services = dynamic(() => import('@/systems/services/components/modules/Services'), { ssr: false });
const Bills = dynamic(() => import('@/systems/services/components/modules/Bills'), { ssr: false });
const Tally = dynamic(() => import('@/systems/services/components/modules/Tally'), { ssr: false });
const Utility = dynamic(() => import('@/systems/services/components/modules/Utility'), { ssr: false });
const Reports = dynamic(() => import('@/systems/services/components/modules/Reports'), { ssr: false });

const servicesTabs = [
  { id: "dashboard", label: "Dashboard", path: "/" },
  { id: "offers", label: "Offers", path: "/offers" },
  { id: "services", label: "Services", path: "/services" },
  { id: "bills", label: "Bills", path: "/bills" },
  { id: "tally", label: "Tally", path: "/tally" },
  { id: "utility", label: "Utility", path: "/utility" },
  { id: "reports", label: "Reports", path: "/reports" }
];

const renderServicesComponent = (tabId: string) => {
  switch (tabId) {
    case 'dashboard': return <Dashboard />;
    case 'offers': return <Offers />;
    case 'services': return <Services />;
    case 'bills': return <Bills />;
    case 'tally': return <Tally />;
    case 'utility': return <Utility />;
    case 'reports': return <Reports />;
    default: return <Dashboard />;
  }
};

function RouterApp() {
  return (
    <Routes>
      <Route element={<DashboardLayout basePath="/services" />}>
        {servicesTabs.map((tab) => (
          <Route
            key={tab.id}
            path={tab.path}
            element={
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-8 transition-colors duration-500 flex flex-col shadow-sm">
                {renderServicesComponent(tab.id)}
              </div>
            }
          />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function ServicesPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#eef3ef] dark:bg-zinc-950 transition-colors duration-500">
        <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Loading Services Application...</p>
      </div>
    );
  }

  return (
    <HashRouter>
      <RouterApp />
    </HashRouter>
  );
}
