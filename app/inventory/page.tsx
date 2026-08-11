'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '@/systems/core/components/DashboardLayout';

const Dashboard = dynamic(() => import('@/systems/inventory/components/modules/Dashboard'), { ssr: false });
const RawMaterial = dynamic(() => import('@/systems/inventory/components/modules/RawMaterial'), { ssr: false });
const FinishedGood = dynamic(() => import('@/systems/inventory/components/modules/FinishedGood'), { ssr: false });
const TradingMaterial = dynamic(() => import('@/systems/inventory/components/modules/TradingMaterial'), { ssr: false });
const StockAdjustment = dynamic(() => import('@/systems/inventory/components/modules/StockAdjustment'), { ssr: false });
const History = dynamic(() => import('@/systems/inventory/components/modules/History'), { ssr: false });
const Settings = dynamic(() => import('@/systems/inventory/components/modules/Settings'), { ssr: false });

const inventoryTabs = [
  { id: "dashboard", label: "Dashboard", path: "/" },
  { id: "raw-material", label: "Raw Material", path: "/raw-material" },
  { id: "finished-good", label: "Finished Good", path: "/finished-good" },
  { id: "trading-material", label: "Trading Material", path: "/trading-material" },
  { id: "stock-adjustment", label: "Stock Adjustment", path: "/stock-adjustment" },
  { id: "history", label: "History", path: "/history" },
  { id: "settings", label: "Settings", path: "/settings" }
];

const renderInventoryComponent = (tabId: string) => {
  switch (tabId) {
    case 'dashboard': return <Dashboard />;
    case 'raw-material': return <RawMaterial />;
    case 'finished-good': return <FinishedGood />;
    case 'trading-material': return <TradingMaterial />;
    case 'stock-adjustment': return <StockAdjustment />;
    case 'history': return <History />;
    case 'settings': return <Settings />;
    default: return <Dashboard />;
  }
};

function RouterApp() {
  return (
    <Routes>
      <Route element={<DashboardLayout basePath="/inventory" />}>
        {inventoryTabs.map((tab) => (
          <Route
            key={tab.id}
            path={tab.path}
            element={
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-8 transition-colors duration-500 flex flex-col shadow-sm">
                {renderInventoryComponent(tab.id)}
              </div>
            }
          />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function InventoryPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#eef3ef] dark:bg-zinc-950 transition-colors duration-500">
        <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Loading Inventory System...</p>
      </div>
    );
  }

  return (
    <HashRouter>
      <RouterApp />
    </HashRouter>
  );
}
