'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/systems/order/context/AuthContext';
import { NotificationProvider } from '@/systems/order/context/NotificationContext';
import DashboardLayout from '@/systems/core/components/DashboardLayout';

// Dynamic imports of Order components (ssr:false — all use browser APIs)
const OrderForm          = dynamic(() => import('@/systems/order/components/Order'),            { ssr: false });
const CheckPO            = dynamic(() => import('@/systems/order/components/CheckPO'),          { ssr: false });
const ReceivedAccounts   = dynamic(() => import('@/systems/order/components/ReceivedAccounts'), { ssr: false });
const CheckDelivery      = dynamic(() => import('@/systems/order/components/CheckDelivery'),    { ssr: false });
const ArrangeLogistics   = dynamic(() => import('@/systems/order/components/ArrangeLogistics'), { ssr: false });
const LogisticsApproval  = dynamic(() => import('@/systems/order/components/LogisticsApproval'),{ ssr: false });
const DispatchPlanning   = dynamic(() => import('@/systems/order/components/DispatchPlanning'), { ssr: false });
const AccountsApproval   = dynamic(() => import('@/systems/order/components/AccountsApproval'),  { ssr: false });
const Logistic           = dynamic(() => import('@/systems/order/components/Logistic'),          { ssr: false });
const LoadMaterial       = dynamic(() => import('@/systems/order/components/LoadMaterial'),       { ssr: false });
const WetmanEntry        = dynamic(() => import('@/systems/order/components/WetmanEntry'),        { ssr: false });
const Invoice            = dynamic(() => import('@/systems/order/components/Invoice'),            { ssr: false });
const Fullkitting        = dynamic(() => import('@/systems/order/components/Fullkitting'),        { ssr: false });
const TC                 = dynamic(() => import('@/systems/order/components/TC'),                 { ssr: false });
const BiltyUpdate        = dynamic(() => import('@/systems/order/components/BiltyUpdate'),        { ssr: false });
const CRM                = dynamic(() => import('@/systems/order/components/CRM'),                { ssr: false });
const MakePI             = dynamic(() => import('@/systems/order/components/MakePI'),             { ssr: false });
const ReceivedPIPayment  = dynamic(() => import('@/systems/order/components/ReceivedPIPayment'), { ssr: false });
const Retention          = dynamic(() => import('@/systems/order/components/Retention'),          { ssr: false });
const MaterialReturn     = dynamic(() => import('@/systems/order/components/MaterialReturn'),     { ssr: false });
const ManagementApproval = dynamic(() => import('@/systems/order/components/ManagementApproval'),{ ssr: false });
const DebitNote          = dynamic(() => import('@/systems/order/components/DebitNote'),          { ssr: false });
const ReturnOfMaterial   = dynamic(() => import('@/systems/order/components/ReturnOfMaterial'),   { ssr: false });
const OrderDashboard     = dynamic(() => import('@/systems/order/components/Dashboard'),          { ssr: false });
const ManageUsers        = dynamic(() => import('@/systems/purchase/components/ManageUsers'),     { ssr: false });

export const orderTabs = [
  { id: 'order',              label: 'Order',               stepName: 'New Order',              path: '/order' },
  { id: 'check-po',          label: 'Check PO',            stepName: 'Check PO',               path: '/check-po' },
  { id: 'received-accounts', label: 'Received Accounts',   stepName: 'received accounts',      path: '/received-accounts' },
  { id: 'check-delivery',    label: 'Check Delivery',      stepName: 'check delivery',         path: '/check-delivery' },
  { id: 'arrange-logistics', label: 'Arrange Logistics',   stepName: 'arrange logistics',      path: '/arrange-logistics' },
  { id: 'logistics-approval',label: 'Logistics App.',      stepName: 'logistics approval',     path: '/logistics-approval' },
  { id: 'dispatch-planning', label: 'Dispatch Planning',   stepName: 'dispatch planning',      path: '/dispatch-planning' },
  { id: 'accounts-approval', label: 'Accounts App.',       stepName: 'accounts approval',      path: '/accounts-approval' },
  { id: 'logistic',          label: 'Logistic',            stepName: 'logistic',               path: '/logistic' },
  { id: 'load-material',     label: 'Load Material',       stepName: 'load material',          path: '/load-material' },
  { id: 'wetman-entry',      label: 'Wetman Entry',        stepName: 'wetman entry',           path: '/wetman-entry' },
  { id: 'invoice',           label: 'Invoice',             stepName: 'invoice',                path: '/invoice' },
  { id: 'fullkitting',       label: 'Fullkitting',         stepName: 'fullkitting',            path: '/fullkitting' },
  { id: 'tc',                label: 'TC',                  stepName: 'tc',                     path: '/tc' },
  { id: 'bilty-update',      label: 'Bilty Update',        stepName: 'bilty update',           path: '/bilty-update' },
  { id: 'crm',               label: 'CRM',                 stepName: 'crm',                    path: '/crm' },
  { id: 'make-pi',           label: 'Make PI',             stepName: 'make pi',                path: '/make-pi' },
  { id: 'received-pi',       label: 'Received PI Payment', stepName: 'received pi payment',    path: '/received-pi-payment' },
  { id: 'retention',         label: 'Retention',           stepName: 'retention',              path: '/retention' },
  { id: 'material-return',   label: 'Material Return',     stepName: 'material return',        path: '/material-return' },
  { id: 'mgmt-approval',     label: 'Mgmt Approval',       stepName: 'management approval',    path: '/mgmt-approval' },
  { id: 'debit-note',        label: 'Debit Note',          stepName: 'debit note',             path: '/debit-note' },
  { id: 'return-material',   label: 'Return of Material',  stepName: 'return of material',     path: '/return-of-material' },
  { id: 'order-dashboard',   label: 'Dashboard',           stepName: 'dashboard',              path: '/dashboard' },
  { id: 'manage-users',      label: 'Manage Users',        stepName: 'admin',                  path: '/manage-users', hidden: true },
];

const renderOrderComponent = (tabId: string) => {
  switch (tabId) {
    case 'order':              return <OrderForm />;
    case 'check-po':           return <CheckPO />;
    case 'received-accounts':  return <ReceivedAccounts />;
    case 'check-delivery':     return <CheckDelivery />;
    case 'arrange-logistics':  return <ArrangeLogistics />;
    case 'logistics-approval': return <LogisticsApproval />;
    case 'dispatch-planning':  return <DispatchPlanning />;
    case 'accounts-approval':  return <AccountsApproval />;
    case 'logistic':           return <Logistic />;
    case 'load-material':      return <LoadMaterial />;
    case 'wetman-entry':       return <WetmanEntry />;
    case 'invoice':            return <Invoice />;
    case 'fullkitting':        return <Fullkitting />;
    case 'tc':                 return <TC />;
    case 'bilty-update':       return <BiltyUpdate />;
    case 'crm':                return <CRM />;
    case 'make-pi':            return <MakePI />;
    case 'received-pi':        return <ReceivedPIPayment />;
    case 'retention':          return <Retention />;
    case 'material-return':    return <MaterialReturn />;
    case 'mgmt-approval':      return <ManagementApproval />;
    case 'debit-note':         return <DebitNote />;
    case 'return-material':    return <ReturnOfMaterial />;
    case 'order-dashboard':    return <OrderDashboard />;
    case 'manage-users':       return <ManageUsers />;
    default:                   return <OrderForm />;
  }
};

function RouterApp() {
  return (
    <Routes>
      <Route element={<DashboardLayout basePath="/order" />}>
        {orderTabs.map((tab) => (
          <Route
            key={tab.id}
            path={tab.path}
            element={
              <AuthProvider>
                <NotificationProvider>
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-8 transition-colors duration-500 flex flex-col shadow-sm">
                    {renderOrderComponent(tab.id)}
                  </div>
                </NotificationProvider>
              </AuthProvider>
            }
          />
        ))}
        <Route path="*" element={<Navigate to="/order" replace />} />
      </Route>
    </Routes>
  );
}

export default function Order() {
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
