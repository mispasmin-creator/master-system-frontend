'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/systems/order/context/AuthContext'; // Reuse master auth if exists, or just core auth
import { NotificationProvider } from '@/systems/order/context/NotificationContext'; // Reuse notification context if shared
import DashboardLayout from '@/systems/core/components/DashboardLayout';

// Dynamic imports of Checklist components (ssr:false)
const Dashboard       = dynamic(() => import('@/systems/checklist/components/Dashboard'),       { ssr: false });
const AssignTask      = dynamic(() => import('@/systems/checklist/components/AssignTask'),      { ssr: false });
const PcDashboard     = dynamic(() => import('@/systems/checklist/components/PcDashboard'),     { ssr: false });
const Delegation      = dynamic(() => import('@/systems/checklist/components/Delegation'),      { ssr: false });
const Verification    = dynamic(() => import('@/systems/checklist/components/Verification'),    { ssr: false });
const Companies       = dynamic(() => import('@/systems/checklist/components/Companies'),       { ssr: false });
const License         = dynamic(() => import('@/systems/checklist/components/License'),         { ssr: false });
const TrainingVideo   = dynamic(() => import('@/systems/checklist/components/TrainingVideo'),   { ssr: false });
const CheckListMaster = dynamic(() => import('@/systems/checklist/components/CheckListMaster'), { ssr: false });

const checklistTabs = [
  { id: 'dashboard',        label: 'Dashboard',         stepName: 'Dashboard',         path: '/dashboard' },
  { id: 'assign-task',      label: 'Assign Task',       stepName: 'Assign Task',       path: '/assign-task' },
  { id: 'pc-dashboard',     label: 'PC Dashboard',      stepName: 'PC Dashboard',      path: '/pc-dashboard' },
  { id: 'delegation',       label: 'Delegation',        stepName: 'Delegation',        path: '/delegation' },
  { id: 'verification',     label: 'Verification',      stepName: 'Verification',      path: '/verification' },
  { id: 'companies',        label: 'Companies',         stepName: 'Companies',         path: '/companies' },
  { id: 'license',          label: 'License',           stepName: 'License',           path: '/license' },
  { id: 'training-video',   label: 'Training Video',    stepName: 'Training Video',    path: '/training-video' },
  { id: 'checklist-master', label: 'Checklist Master',  stepName: 'Checklist Master',  path: '/checklist-master' },
];

const renderChecklistComponent = (tabId: string) => {
  switch (tabId) {
    case 'dashboard':        return <Dashboard />;
    case 'assign-task':      return <AssignTask />;
    case 'pc-dashboard':     return <PcDashboard />;
    case 'delegation':       return <Delegation />;
    case 'verification':     return <Verification />;
    case 'companies':        return <Companies />;
    case 'license':          return <License />;
    case 'training-video':   return <TrainingVideo />;
    case 'checklist-master': return <CheckListMaster />;
    default:                 return <Dashboard />;
  }
};

function RouterApp() {
  return (
    <Routes>
      <Route element={<DashboardLayout basePath="/checklist" />}>
        {checklistTabs.map((tab) => (
          <Route
            key={tab.id}
            path={tab.path}
            element={
              <AuthProvider>
                <NotificationProvider>
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-8 transition-colors duration-500 flex flex-col shadow-sm">
                    {renderChecklistComponent(tab.id)}
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

export default function Checklist() {
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
