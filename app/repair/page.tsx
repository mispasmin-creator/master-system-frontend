'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '@/systems/core/components/DashboardLayout';

const Dashboard = dynamic(() => import('@/systems/repair/components/modules/Dashboard'), { ssr: false });
const Indent = dynamic(() => import('@/systems/repair/components/modules/Indent'), { ssr: false });
const SentToVendor = dynamic(() => import('@/systems/repair/components/modules/SentToVendor'), { ssr: false });
const CheckMachine = dynamic(() => import('@/systems/repair/components/modules/CheckMachine'), { ssr: false });
const StoreIn = dynamic(() => import('@/systems/repair/components/modules/StoreIn'), { ssr: false });
const MakePayment = dynamic(() => import('@/systems/repair/components/modules/MakePayment'), { ssr: false });
const Accounts = dynamic(() => import('@/systems/repair/components/modules/Accounts'), { ssr: false });
const Users = dynamic(() => import('@/systems/repair/components/modules/Users'), { ssr: false });

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

const renderRepairComponent = (tabId: string) => {
  switch (tabId) {
    case 'dashboard': return <Dashboard />;
    case 'indent': return <Indent />;
    case 'sent-to-vendor': return <SentToVendor />;
    case 'check-machine': return <CheckMachine />;
    case 'store-in': return <StoreIn />;
    case 'make-payment': return <MakePayment />;
    case 'accounts': return <Accounts />;
    case 'users': return <Users />;
    default: return <Dashboard />;
  }
};

function RouterApp() {
  return (
    <Routes>
      <Route element={<DashboardLayout basePath="/repair" />}>
        {repairTabs.map((tab) => (
          <Route
            key={tab.id}
            path={tab.path}
            element={
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-8 transition-colors duration-500 flex flex-col shadow-sm">
                {renderRepairComponent(tab.id)}
              </div>
            }
          />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function RepairPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#eef3ef] dark:bg-zinc-950 transition-colors duration-500">
        <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Loading Repair FMS Application...</p>
      </div>
    );
  }

  return (
    <HashRouter>
      <RouterApp />
    </HashRouter>
  );
}
