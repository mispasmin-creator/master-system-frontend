'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from '@/systems/rm-sales/context/AppContext';
import DashboardLayout from '@/systems/core/components/DashboardLayout';

const Dashboard = dynamic(() => import('@/systems/rm-sales/components/modules/Dashboard'), { ssr: false });
const SaleOrders = dynamic(() => import('@/systems/rm-sales/components/modules/SaleOrders'), { ssr: false });
const Logistics = dynamic(() => import('@/systems/rm-sales/components/modules/Logistics'), { ssr: false });
const Invoices = dynamic(() => import('@/systems/rm-sales/components/modules/Invoices'), { ssr: false });
// Hidden temporarily - not in current scope
// const Settings = dynamic(() => import('@/systems/rm-sales/components/modules/Settings'), { ssr: false });
// const Inventory = dynamic(() => import('@/systems/rm-sales/components/modules/Inventory'), { ssr: false });
// const Masters = dynamic(() => import('@/systems/rm-sales/components/modules/Masters'), { ssr: false });
// const Tracking = dynamic(() => import('@/systems/rm-sales/components/modules/Tracking'), { ssr: false });
// const Reports = dynamic(() => import('@/systems/rm-sales/components/modules/Reports'), { ssr: false });

const rmSalesTabs = [
  { id: "dashboard", label: "Dashboard", path: "/" },
  { id: "sale-orders", label: "Sale Orders", path: "/sale-orders" },
  { id: "logistics", label: "Logistics", path: "/logistics" },
  { id: "invoices", label: "Invoices", path: "/invoices" }
  // Hidden temporarily - not in current scope
  // { id: "settings", label: "User Management", path: "/settings" },
  // { id: "inventory", label: "Inventory", path: "/inventory" },
  // { id: "masters", label: "Masters", path: "/masters" },
  // { id: "tracking", label: "Tracking", path: "/tracking" },
  // { id: "reports", label: "Reports", path: "/reports" }
];

const renderRmSalesComponent = (tabId: string) => {
  switch (tabId) {
    case 'dashboard': return <Dashboard />;
    case 'sale-orders': return <SaleOrders />;
    case 'logistics': return <Logistics />;
    case 'invoices': return <Invoices />;
    // Hidden temporarily - not in current scope
    // case 'settings': return <Settings />;
    // case 'inventory': return <Inventory />;
    // case 'masters': return <Masters />;
    // case 'tracking': return <Tracking />;
    // case 'reports': return <Reports />;
    default: return <Dashboard />;
  }
};

function RouterApp() {
  return (
    <Routes>
      <Route element={<DashboardLayout basePath="/rm-sales" />}>
        {rmSalesTabs.map((tab) => (
          <Route
            key={tab.id}
            path={tab.path}
            element={
              <AppProvider>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-8 transition-colors duration-500 flex flex-col shadow-sm">
                  {renderRmSalesComponent(tab.id)}
                </div>
              </AppProvider>
            }
          />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function RmSalesPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#eef3ef] dark:bg-zinc-950 transition-colors duration-500">
        <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Loading RM Sales...</p>
      </div>
    );
  }

  return (
    <HashRouter>
      <RouterApp />
    </HashRouter>
  );
}
