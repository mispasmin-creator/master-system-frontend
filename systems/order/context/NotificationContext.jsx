"use client";
import React, { createContext, useContext, useState, useCallback } from "react";

// Same provider/hook shape as systems/purchase/context/NotificationContext.jsx
// ({notificationCounts, loadingNotifications, updateCount, refreshCounts}).
// Purchase's own Supabase-based counting logic is fully commented-out/dead
// today (confirmed during research), so this is written fresh: counts stay
// at 0 until a page-level component calls updateCount() with its own
// pending-count after fetching from the backend API. No realtime, no
// polling — matches the (lack of) equivalent infra on the Purchase side.

const NotificationContext = createContext();

export function useNotification() {
  return useContext(NotificationContext);
}

const INITIAL_COUNTS = {
  "check-po": 0,
  "received-accounts": 0,
  "check-delivery": 0,
  "arrange-logistics": 0,
  "logistics-approval": 0,
  "dispatch-planning": 0,
  "accounts-approval": 0,
  logistic: 0,
  "load-material": 0,
  "wetman-entry": 0,
  invoice: 0,
  fullkitting: 0,
  tc: 0,
  "bilty-update": 0,
  crm: 0,
  "make-pi": 0,
  "received-pi-payment": 0,
  retention: 0,
  "material-return": 0,
  "management-approval": 0,
  "debit-note": 0,
  "return-of-material": 0,
};

export function NotificationProvider({ children }) {
  const [notificationCounts, setNotificationCounts] = useState(INITIAL_COUNTS);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const updateCount = useCallback((key, count) => {
    setNotificationCounts((prev) => {
      if (prev[key] === count) return prev;
      return { ...prev, [key]: count };
    });
  }, []);

  const refreshCounts = useCallback(() => {
    // No-op placeholder — no central polling source exists yet. Individual
    // pages call updateCount() themselves after their own pending-list fetch.
  }, []);

  return (
    <NotificationContext.Provider value={{ notificationCounts, loadingNotifications, updateCount, refreshCounts }}>
      {children}
    </NotificationContext.Provider>
  );
}
