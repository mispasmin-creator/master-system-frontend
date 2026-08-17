import React, { useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { FullKittingHistory } from "../../components/FullKittingHistory";
import { cn } from "@/lib/utils";
import { useFreightData } from "../../hooks/useFreightData";

export default function AccountCheckingPage() {
  const { refetch } = useFreightData();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isSoftRefreshing, setIsSoftRefreshing] = useState(false);

  const handleRefreshDone = useCallback(() => {
    setIsSoftRefreshing(false);
  }, []);

  const handleSoftRefresh = async () => {
    if (isSoftRefreshing) return;
    setIsSoftRefreshing(true);
    setRefreshTrigger((prev) => prev + 1);
    try {
      await refetch();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-white dark:bg-[oklch(0.16_0.006_247)] border border-slate-200/80 dark:border-white/6 rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-100 dark:border-white/6 bg-white dark:bg-[oklch(0.16_0.006_247)] flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Account Checking
        </span>
        <button
          onClick={handleSoftRefresh}
          disabled={isSoftRefreshing}
          className="flex items-center justify-center p-1 rounded-md text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 active:scale-95 transition-all disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw
            className={cn("w-3.5 h-3.5", isSoftRefreshing && "animate-spin text-brand-500")}
          />
        </button>
      </div>
      <FullKittingHistory
        refreshTrigger={refreshTrigger}
        onRefreshDone={handleRefreshDone}
      />
    </div>
  );
}
