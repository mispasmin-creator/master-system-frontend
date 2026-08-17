import React, { useCallback, useState } from "react";
import { WifiOff } from "lucide-react";
import { FreightTable } from "../../components/FreightTable";
import { FreightForm } from "../../components/FreightForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { useFreightData } from "../../hooks/useFreightData";
import { FreightPayment } from "../../types";
import { useQueryClient } from "@tanstack/react-query";

export default function AccountAuditPage() {
  const { postingPayments, allPayments, isLoading, error, handleQuickUpdate } = useFreightData();
  const queryClient = useQueryClient();

  const [subTab, setSubTab] = useState<"pending" | "history">("pending");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<FreightPayment | undefined>();

  const handleEdit = useCallback((payment: FreightPayment) => {
    setEditingPayment(payment);
    setIsFormOpen(true);
  }, []);

  return (
    <div className="bg-white dark:bg-[oklch(0.16_0.006_247)] border border-slate-200/80 dark:border-white/6 rounded-xl shadow-sm overflow-hidden">
      <Tabs value={subTab} onValueChange={(v) => setSubTab(v as "pending" | "history")} className="w-full">
        <div className="px-4 py-2.5 border-b border-slate-100 dark:border-white/6 bg-white dark:bg-[oklch(0.16_0.006_247)] flex items-center justify-between flex-wrap gap-2">
          <TabsList className="h-8 bg-slate-100/80 dark:bg-white/6 rounded-lg">
            <TabsTrigger value="pending" className="rounded-md px-3.5 py-1 text-[11px] font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:text-brand-700 dark:data-[state=active]:text-brand-400 data-[state=active]:shadow-sm transition-all h-6">
              Pending
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-md px-3.5 py-1 text-[11px] font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:text-brand-700 dark:data-[state=active]:text-brand-400 data-[state=active]:shadow-sm transition-all h-6">
              History
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2 text-[9.5px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider">
            {error ? (
              <>
                <WifiOff className="w-3 h-3 text-rose-500" />
                <span className="text-rose-500">Offline mode</span>
              </>
            ) : (
              <>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                <span>Live sync</span>
              </>
            )}
          </div>
        </div>

        <TabsContent value="pending" className="mt-0">
          <FreightTable
            payments={postingPayments}
            isLoading={isLoading}
            onEdit={handleEdit}
            onQuickUpdate={handleQuickUpdate}
            activeTab="posting"
            subTab="pending"
          />
        </TabsContent>
        <TabsContent value="history" className="mt-0">
          <FreightTable
            payments={allPayments}
            isLoading={isLoading}
            onEdit={handleEdit}
            onQuickUpdate={handleQuickUpdate}
            activeTab="posting"
            subTab="history"
          />
        </TabsContent>
      </Tabs>

      <FreightForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        payment={editingPayment}
        defaultStep="posting"
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["freight-entries"] });
          setIsFormOpen(false);
        }}
      />
    </div>
  );
}
