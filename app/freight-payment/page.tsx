'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { HashRouter } from 'react-router-dom';
import DashboardLayout from '@/systems/core/components/DashboardLayout';

const App = dynamic(() => import('@/systems/freight-payment/App'), {
  ssr: false,
});

export default function FreightPaymentPage() {
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
      <DashboardLayout basePath="/freight-payment">
        <App />
      </DashboardLayout>
    </HashRouter>
  );
}
