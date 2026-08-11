'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '@/systems/core/components/DashboardLayout';

const Dashboard = dynamic(() => import('@/systems/payment/components/modules/Dashboard'), { ssr: false });
const PaymentCreation = dynamic(() => import('@/systems/payment/components/modules/PaymentCreation'), { ssr: false });
const ChannelFunding = dynamic(() => import('@/systems/payment/components/modules/ChannelFunding'), { ssr: false });
const PaymentApproval = dynamic(() => import('@/systems/payment/components/modules/PaymentApproval'), { ssr: false });
const Posting = dynamic(() => import('@/systems/payment/components/modules/Posting'), { ssr: false });
const MakePayment = dynamic(() => import('@/systems/payment/components/modules/MakePayment'), { ssr: false });
const UserManagement = dynamic(() => import('@/systems/payment/components/modules/UserManagement'), { ssr: false });

const paymentTabs = [
  { id: "dashboard", label: "Dashboard", path: "/" },
  { id: "payment-creation", label: "Payment Creation", path: "/payment-creation" },
  { id: "channel-funding", label: "Channel Funding", path: "/channel-funding" },
  { id: "payment-approval", label: "Payment Approval", path: "/payment-approval" },
  { id: "posting", label: "Posting", path: "/posting" },
  { id: "make-payment", label: "Make Payment", path: "/make-payment" },
  { id: "user-management", label: "User Management", path: "/user-management" }
];

const renderPaymentComponent = (tabId: string) => {
  switch (tabId) {
    case 'dashboard': return <Dashboard />;
    case 'payment-creation': return <PaymentCreation />;
    case 'channel-funding': return <ChannelFunding />;
    case 'payment-approval': return <PaymentApproval />;
    case 'posting': return <Posting />;
    case 'make-payment': return <MakePayment />;
    case 'user-management': return <UserManagement />;
    default: return <Dashboard />;
  }
};

function RouterApp() {
  return (
    <Routes>
      <Route element={<DashboardLayout basePath="/payment" />}>
        {paymentTabs.map((tab) => (
          <Route
            key={tab.id}
            path={tab.path}
            element={
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-8 transition-colors duration-500 flex flex-col shadow-sm">
                {renderPaymentComponent(tab.id)}
              </div>
            }
          />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function PaymentPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#eef3ef] dark:bg-zinc-950 transition-colors duration-500">
        <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Loading Payment Application...</p>
      </div>
    );
  }

  return (
    <HashRouter>
      <RouterApp />
    </HashRouter>
  );
}
