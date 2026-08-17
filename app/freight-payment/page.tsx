'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '@/systems/core/components/DashboardLayout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const DashboardPage = dynamic(
  () => import('@/systems/freight-payment/pages/content/DashboardPage'),
  { ssr: false }
);
const AccountCheckingPage = dynamic(
  () => import('@/systems/freight-payment/pages/content/AccountCheckingPage'),
  { ssr: false }
);
const AccountAuditPage = dynamic(
  () => import('@/systems/freight-payment/pages/content/AccountAuditPage'),
  { ssr: false }
);
const PostingPage = dynamic(
  () => import('@/systems/freight-payment/pages/content/PostingPage'),
  { ssr: false }
);
const FreightReleasePage = dynamic(
  () => import('@/systems/freight-payment/pages/content/FreightReleasePage'),
  { ssr: false }
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function RouterApp() {
  return (
    <Routes>
      <Route element={<DashboardLayout basePath="/freight-payment" />}>
        <Route
          path="/"
          element={
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-8 transition-colors duration-500 flex flex-col shadow-sm">
              <DashboardPage />
            </div>
          }
        />
        <Route
          path="/checkkitting"
          element={
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl transition-colors duration-500 flex flex-col shadow-sm overflow-hidden">
              <AccountCheckingPage />
            </div>
          }
        />
        <Route
          path="/posting"
          element={
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl transition-colors duration-500 flex flex-col shadow-sm overflow-hidden">
              <AccountAuditPage />
            </div>
          }
        />
        <Route
          path="/makepayment"
          element={
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl transition-colors duration-500 flex flex-col shadow-sm overflow-hidden">
              <PostingPage />
            </div>
          }
        />
        <Route
          path="/freight"
          element={
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl transition-colors duration-500 flex flex-col shadow-sm overflow-hidden">
              <FreightReleasePage />
            </div>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function FreightPaymentPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#eef3ef] dark:bg-zinc-950 transition-colors duration-500">
        <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
          Loading Freight Payment...
        </p>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <RouterApp />
      </HashRouter>
    </QueryClientProvider>
  );
}
