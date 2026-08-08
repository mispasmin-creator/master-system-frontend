import React, { createContext, useContext, useState, useEffect } from 'react';
import { getStoredUser, getToken, clearSession } from '@/lib/auth';
import {
  hasPageAccess,
  canAccessTab,
  getPathForTab,
  getTabFromPath
} from '../lib/utils';

const AppContext = createContext();

export const ROLES = {
  ADMIN: 'Admin',
  SALES: 'Sales',
  LOGISTICS: 'Logistics',
  ACCOUNTS: 'Accounts'
};

const INITIAL_NOTIFICATIONS = [
  { id: 'n1', title: 'System Initialized', message: 'Welcome to Raw Material Sale FMS Dashboard.', type: 'info', read: false, time: '10m ago' },
  { id: 'n2', title: 'Security Alert', message: 'Row Level Security (RLS) is active on Database.', type: 'success', read: false, time: '1h ago' }
];

export const AppProvider = ({ children }) => {
  const [currentUser, setCurrentUserVal] = useState(() => {
    const storedUser = getStoredUser();
    if (storedUser) {
      return {
        user_name: storedUser.username || '',
        role: storedUser.role || ROLES.ADMIN,
        firm_name: storedUser.firm_name || ''
      };
    }
    return { user_name: '', role: ROLES.ADMIN, firm_name: '' };
  });

  const [userRole, setUserRole] = useState(() => {
    const storedUser = getStoredUser();
    if (storedUser && storedUser.role) {
      return storedUser.role;
    }
    return ROLES.ADMIN;
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return Boolean(getStoredUser() && getToken());
  });

  useEffect(() => {
    const storedUser = getStoredUser();
    const token = getToken();
    if (storedUser && token) {
      setIsAuthenticated(true);
      setCurrentUserVal({
        user_name: storedUser.username || '',
        role: storedUser.role || ROLES.ADMIN,
        firm_name: storedUser.firm_name || ''
      });
      setUserRole(storedUser.role || ROLES.ADMIN);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  const [activeTab, setActiveTab] = useState(() => {
    const routeTab = getTabFromPath(window.location.pathname);
    const storedTab = routeTab || localStorage.getItem('fms_active_tab') || 'dashboard';
    const storedUser = getStoredUser();
    const role = storedUser?.role || ROLES.ADMIN;
    return canAccessTab(storedTab, role) ? storedTab : 'dashboard';
  });

  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [supabaseConnected, setSupabaseConnected] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('fms_sidebar_collapsed') === 'true';
  });

  const logout = () => {
    clearSession();
    setIsAuthenticated(false);
    addNotification('Logged Out', 'Safely terminated active session.', 'info');
  };

  useEffect(() => {
    localStorage.setItem('fms_sidebar_collapsed', sidebarCollapsed);
  }, [sidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem('fms_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    const activePath = getPathForTab(activeTab);
    if (window.location.pathname !== activePath) {
      window.history.replaceState({ tab: activeTab }, '', activePath);
    }
  }, [activeTab]);

  useEffect(() => {
    const handlePopState = () => {
      const routeTab = getTabFromPath(window.location.pathname) || 'dashboard';
      setActiveTab(canAccessTab(routeTab, userRole) ? routeTab : 'dashboard');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [userRole]);

  const navigateToTab = (tab) => {
    const nextTab = canAccessTab(tab, userRole) ? tab : 'dashboard';
    const nextPath = getPathForTab(nextTab);

    if (window.location.pathname !== nextPath) {
      window.history.pushState({ tab: nextTab }, '', nextPath);
    }
    setActiveTab(nextTab);
  };

  // Google Drive Style Document Viewer State
  const [docViewer, setDocViewer] = useState({
    open: false,
    fileUrl: '',
    fileName: '',
    fileType: '', // 'PO', 'Bilty', 'Invoice'
    orderNo: ''
  });

  const addNotification = (title, message, type = 'info') => {
    const newNotif = {
      id: `n_${Date.now()}`,
      title,
      message,
      type,
      read: false,
      time: 'Just now'
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const openDocument = (fileUrl, fileName, fileType, orderNo) => {
    setDocViewer({
      open: true,
      fileUrl,
      fileName,
      fileType,
      orderNo
    });
  };

  const closeDocument = () => {
    setDocViewer(prev => ({ ...prev, open: false }));
  };

  const checkPermission = (requiredRole) => {
    if (Array.isArray(requiredRole)) {
      return requiredRole.some(role => hasPageAccess(userRole, role));
    }
    return hasPageAccess(userRole, requiredRole);
  };

  return (
    <AppContext.Provider value={{
      userRole,
      setUserRole,
      currentUser,
      setCurrentUser: setCurrentUserVal,
      usersList: [],
      fetchUsersList: async () => {},
      isAuthenticated,
      logout,
      activeTab,
      setActiveTab: navigateToTab,
      notifications,
      addNotification,
      markAllNotificationsRead,
      clearNotifications,
      commandPaletteOpen,
      setCommandPaletteOpen,
      supabaseConnected,
      refreshSupabaseStatus: () => {},
      docViewer,
      openDocument,
      closeDocument,
      checkPermission,
      sidebarCollapsed,
      setSidebarCollapsed
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
export default AppContext;
