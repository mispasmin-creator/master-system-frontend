import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Banknote, FileText, LayoutDashboard, Loader2, Package, Package2, RefreshCw, Users, WifiOff } from "lucide-react";
import { freightPaymentApi } from "../lib/api";
import { AuthUser as LoginUser } from "@/lib/auth";
import { FreightPayment } from "../types";
import { FreightForm } from "../components/FreightForm";
import { FreightTable } from "../components/FreightTable";
import { FullKittingHistory } from "../components/FullKittingHistory";
import { OperationsDashboard } from "../components/OperationsDashboard";
import { AppHeader } from "../components/layout/AppHeader";
import { AppSidebar } from "../components/layout/AppSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { getUserAllowedTabs, hasAccess } from "../config/navigation";
import { cn } from "@/lib/utils";

const UserManagementLazy = lazy(() =>
  import("../components/UserManagement").then((module) => ({ default: module.UserManagement }))
);

const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
  if (typeof toast !== "undefined") {
    toast[type](message);
  } else {
    alert(message);
  }
};

const ACCOUNT_CHECKING_FIRMS = ["RKL", "PURAB", "PMMPL"] as const;

const normalizeFirm = (value: unknown): string => String(value || "").trim().toLowerCase();

const getAccountCheckingFirm = (value: unknown): string => {
  const normalized = normalizeFirm(value);
  const matchedFirm = ACCOUNT_CHECKING_FIRMS.find((firm) => {
    const firmKey = firm.toLowerCase();
    return normalized === firmKey || normalized === `${firmKey} order`;
  });
  return matchedFirm || "";
};

const calculateDelayWithHours = (planned?: string, actual?: string) => {
  if (!planned || !actual) return 0;
  const plannedDate = new Date(planned);
  const actualDate = new Date(actual);
  if (Number.isNaN(plannedDate.getTime()) || Number.isNaN(actualDate.getTime())) return 0;
  const diffHours = Math.ceil((actualDate.getTime() - plannedDate.getTime()) / 3600000);
  return diffHours > 0 ? Number((diffHours / 24).toFixed(2)) : 0;
};

// Per-tab page titles and descriptions
const PAGE_META: Record<string, { title: string; description: string }> = {
  dashboard: { title: "Operations Dashboard", description: "Overview of freight payment operations" },
  checkkitting: { title: "Account Checking", description: "Review and verify kitting accounts" },
  posting: { title: "Account Audit", description: "Audit payment records" },
  makepayment: { title: "Posting", description: "Post approved payments" },
  freight: { title: "Freight Payments", description: "Release and track freight payments" },
  users: { title: "User Management", description: "Manage system users and permissions" },
};

const isDone = (status?: string | null) => {
  const n = String(status || "").trim().toLowerCase();
  return n === "done" || n === "completed";
};

interface FreightDashboardProps {
  user: LoginUser;
  onLogout: () => void;
}

export function FreightDashboard({ user, onLogout }: FreightDashboardProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<FreightPayment | undefined>();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    return saved === "true";
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [formStep, setFormStep] = useState<string>("posting");
  const [isSoftRefreshing, setIsSoftRefreshing] = useState(false);
  const [kittingRefreshTrigger, setKittingRefreshTrigger] = useState(0);

  const handleKittingRefreshDone = useCallback(() => {
    setIsSoftRefreshing(false);
  }, []);

  // Dark mode state — persisted in localStorage
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("dark_mode") === "true";
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("dark_mode", String(darkMode));
  }, [darkMode]);

  const isAdmin = user.Role?.toLowerCase() === "admin";
  const userFirm = user["Firm Name"] || "";
  const allowedTabs = useMemo(() => getUserAllowedTabs(user), [user]);

  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace('#', '').replace('/', '');
    if (hash && allowedTabs.includes(hash)) return hash;
    const saved = localStorage.getItem("freight_active_tab");
    if (saved && allowedTabs.includes(saved)) return saved;
    return allowedTabs[0] || "dashboard";
  });

  const [subTab, setSubTab] = useState<"pending" | "history">("pending");

  useEffect(() => setSubTab("pending"), [activeTab]);

  useEffect(() => {
    if (allowedTabs.length > 0 && !allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0]);
    }
  }, [activeTab, allowedTabs]);

  useEffect(() => {
    localStorage.setItem("freight_active_tab", activeTab);
    const targetHash = `#/${activeTab}`;
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
  }, [activeTab]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').replace('/', '');
      if (hash && allowedTabs.includes(hash)) setActiveTab(hash);
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [allowedTabs]);

  useEffect(() => {
    localStorage.setItem("sidebar_collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const toggleSidebar = useCallback(() => {
    if (window.innerWidth < 1024) {
      setMobileSidebarOpen((prev: boolean) => !prev);
    } else {
      setSidebarCollapsed((prev: boolean) => !prev);
    }
  }, []);

  const queryClient = useQueryClient();

  const {
    data: entriesData = [],
    isLoading: isEntriesLoading,
    refetch,
    error,
  } = useQuery({
    queryKey: ["freight-entries"],
    queryFn: async () => {
      const res = await freightPaymentApi.get("entry");
      return res.data || [];
    },
    retry: 1,
  });

  const isLoading = isEntriesLoading;

  const allPayments = useMemo(() => {
    return entriesData.map((e: any) => {
      const kitting = e.kitting || {};
      const audit = e.audit || {};
      const posting = e.posting || {};
      const release = e.release || {};

      return {
        id: e.id,
        "Payment Number": e.payment_number || `KIT-${e.id}`,
        "Unique Number": e.unique_number || `KIT-${e.id}`,
        "Lift ID": e.lift_id,
        "Firm Name": e.firm_name,
        "Fms Name": e.fms_name || "Account Checking",
        "Transporter Name": e.transporter_name,
        "Vehicle Number": e.vehicle_number,
        From: e.from_location || "—",
        To: e.to_location || "—",
        "Material Load Details": e.material_load_details,
        "Bilty Number": e.bilty_number,
        "Rate Type": e.rate_type || "External",
        Amount: e.amount !== undefined && e.amount !== null ? Number(e.amount) : 0,
        PostingAmount: e.posting_amount !== undefined && e.posting_amount !== null ? Number(e.posting_amount) : undefined,
        "Bilty Image": e.bilty_image_url,
        Timestamp: e.created_at,
        "Party Name": e.party_name,
        "Billing Qty": e.billing_qty !== undefined && e.billing_qty !== null ? Number(e.billing_qty) : undefined,
        "Bill Number": e.bill_number,
        "Transporter Bill Image": release.transporter_bill_image_url || e.transporter_bill_image_url,

        Status3: kitting.status || "Not Done",
        Actual3: kitting.actual_at || e.actual_at || e.created_at,
        Delay3: e.kitting_delay_days ?? 0,
        Planned3: e.planned_at || e.created_at,
        Remark3: kitting.remark || e.remark,

        Status_1: audit.status || "Not Done",
        Planned: e.planned_at || e.created_at,
        Actual: audit.actual_at,
        Delay: audit.audit_delay_days ?? e.audit_delay_days ?? 0,
        Remark_1: audit.remark,
        "Audit Image": audit.audit_image_url,

        Status2: posting.status || "Not Done",
        Planned2: kitting.next_planned_at,
        Actual2: posting.actual_at,
        Delay2: posting.posting_delay_days ?? e.posting_delay_days ?? 0,
        Remark2: posting.remark,

        Status: release.status || "Not Done",
        Actual4: release.actual_at,
        Delay4: release.release_delay_days ?? e.release_delay_days ?? 0,
        Remark: release.remark,
        "Batch Number": e.batch_number || kitting.batch_number || audit.batch_number || posting.batch_number || release.batch_number,
        currentStage: e.current_stage || 'Kitting',
        kittingObj: kitting,
        auditObj: audit,
        postingObj: posting,
        releaseObj: release,
      };
    });
  }, [entriesData]);

  // ─── Per-tab filtered payment lists ───────────────────────────────────────
  const checkKittingPayments = useMemo(
    () => allPayments.filter((p: FreightPayment) => !isDone(p.Status3)),
    [allPayments]
  );

  const postingPayments = useMemo(
    () => allPayments.filter((p: FreightPayment) => isDone(p.Status3) && !isDone(p.Status_1)),
    [allPayments]
  );

  const makePaymentPayments = useMemo(
    () => allPayments.filter((p: FreightPayment) => isDone(p.Status_1) && !isDone(p.Status2)),
    [allPayments]
  );

  const freightPaymentPayments = useMemo(
    () => allPayments.filter((p: FreightPayment) => isDone(p.Status2) && !isDone(p.Status)),
    [allPayments]
  );

  // Active tab's payments for FreightTable
  const payments = useMemo(() => {
    switch (activeTab) {
      case "checkkitting": return checkKittingPayments;
      case "posting": return postingPayments;
      case "makepayment": return makePaymentPayments;
      case "freight": return freightPaymentPayments;
      default: return allPayments;
    }
  }, [activeTab, checkKittingPayments, postingPayments, makePaymentPayments, freightPaymentPayments, allPayments]);

  // ─── Sidebar badge counts ──────────────────────────────────────────────────
  const pendingPosting = postingPayments.length;
  const pendingMakePayment = makePaymentPayments.length;
  const pendingFreight = freightPaymentPayments.length;

  // ─── Delayed count for header ──────────────────────────────────────────────
  const delayedCount = useMemo(
    () => allPayments.filter((p: FreightPayment) => (p.Delay ?? 0) > 0 || (p.Delay2 ?? 0) > 0 || (p.Delay3 ?? 0) > 0).length,
    [allPayments]
  );

  // ─── Page title / description ──────────────────────────────────────────────
  const pageMeta = PAGE_META[activeTab] ?? { title: "Freight Payment", description: "" };
  const pageTitle = pageMeta.title;
  const pageDescription = pageMeta.description;

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const quickUpdateMutation = useMutation({
    mutationFn: async ({ data, step }: { data: (Partial<FreightPayment> & { id: number }) | (Partial<FreightPayment> & { id: number })[]; step: string }) => {
      const items = Array.isArray(data) ? data : [data];
      const results = [];
      for (const item of items) {
        let res;
        const entryId = item.id;
        if (step === "checkkitting") {
          res = await freightPaymentApi.patch("kitting", entryId, "complete", { remark: item.Remark3 });
        } else if (step === "posting") {
          res = await freightPaymentApi.patch("audit", entryId, "complete", {
            amount: item.Amount,
            remark: item.Remark_1,
            auditImageUrl: item["Audit Image"],
            batchNumber: item["Batch Number"],
          });
        } else if (step === "makepayment" || step === "payment") {
          res = await freightPaymentApi.patch("posting", entryId, "complete", {
            remark: item.Remark2,
            batchNumber: item["Batch Number"],
          });
        } else if (step === "freight") {
          res = await freightPaymentApi.patch("release", entryId, "complete", {
            remark: item.Remark,
            transporterBillImageUrl: item["Transporter Bill Image"],
            batchNumber: item["Batch Number"],
          });
        }
        results.push(res);
      }
      return Array.isArray(data) ? results : results[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["freight-entries"] });
      showToast("Status updated successfully", "success");
    },
    onError: (err: any) => {
      showToast(err?.message || "Failed to update status", "error");
    },
  });

  const handleQuickUpdate = useCallback(
    (
      payment: FreightPayment | FreightPayment[],
      step: string,
      value: "yes" | "no",
      actualDate?: string,
      selectedStatus?: string,
      remark?: string,
      amount?: number | number[],
      auditImage?: string
    ) => {
      const today = actualDate || new Date().toISOString();
      const payments = Array.isArray(payment) ? payment : [payment];
      const amounts = Array.isArray(amount) ? amount : Array(payments.length).fill(amount);

      const updateDataArray = payments.map((p, idx) => {
        const updateData: Partial<FreightPayment> & { id: number } = { id: p.id! };
        const amt = amounts[idx];

        if (step === "checkkitting") {
          updateData.Status3 = selectedStatus || (value === "yes" ? "Done" : "Not Done");
          if (remark !== undefined) updateData.Remark3 = remark;
          if (value === "yes") {
            updateData.Actual3 = today;
            updateData.Actual = today;
            updateData.Status_1 = "Not Done";
            updateData.Status = "Not Done";
            updateData.Planned2 = today;
            updateData.Status2 = "Not Done";
          }
        } else if (step === "posting") {
          const finalStatus = selectedStatus || (value === "yes" ? "Done" : "Not Done");
          updateData.Status_1 = finalStatus;
          if (amt !== undefined) updateData.Amount = amt;
          if (remark !== undefined) updateData.Remark_1 = remark;
          if (auditImage !== undefined) updateData["Audit Image"] = auditImage;
          if (finalStatus === "Done") {
            updateData.Actual = today;
            updateData.Delay = calculateDelayWithHours(p.Planned, today);
          }
        } else if (step === "makepayment" || step === "payment") {
          updateData.Status2 = selectedStatus || (value === "yes" ? "Done" : "Not Done");
          if (remark !== undefined) updateData.Remark2 = remark;
          if (value === "yes") {
            updateData.Actual2 = today;
            updateData.Delay2 = calculateDelayWithHours(p.Planned2, today);
          }
        } else if (step === "freight") {
          updateData.Status = selectedStatus || (value === "yes" ? "Done" : "Not Done");
          if (remark !== undefined) updateData.Remark = remark;
          if (value === "yes") {
            updateData.Actual4 = today;
            updateData.Delay4 = calculateDelayWithHours(p.Actual4 || p.Actual2, today);
          }
        }
        return updateData;
      });

      quickUpdateMutation.mutate({
        data: Array.isArray(payment) ? updateDataArray : updateDataArray[0],
        step,
      });
    },
    [quickUpdateMutation]
  );

  // ─── Edit handler ──────────────────────────────────────────────────────────
  const handleEdit = useCallback((payment: FreightPayment, targetStep?: string) => {
    setEditingPayment(payment);
    setFormStep(targetStep || activeTab || "posting");
    setIsFormOpen(true);
  }, [activeTab]);

  const handleNavigate = useCallback(
    (tab: string) => {
      if (hasAccess(user, tab)) {
        setActiveTab(tab);
        setMobileSidebarOpen(false);
      }
    },
    [user]
  );

  const handleLogoutWithConfirm = useCallback(() => {
    if (window.confirm("Are you sure you want to log out?")) {
      onLogout();
    }
  }, [onLogout]);

  if (isLoading && allPayments.length === 0) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-[oklch(0.12_0.008_247)]">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-brand-600 animate-spin" />
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 tracking-wide">Loading freight data…</p>
          </div>
          {/* Skeleton rows */}
          <div className="mt-2 w-64 space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton h-8 rounded-lg" style={{ opacity: 1 - i * 0.2 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[oklch(0.12_0.008_247)] relative">
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full z-30 transition-transform duration-300 ease-in-out",
          "lg:static lg:h-screen",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <AppSidebar
          collapsed={sidebarCollapsed}
          activeTab={activeTab}
          allowedTabs={allowedTabs}
          user={user}
          onNavigate={handleNavigate}
          onLogout={handleLogoutWithConfirm}
          totalCount={allPayments.length}
          pendingPosting={pendingPosting}
          pendingMakePayment={pendingMakePayment}
          pendingFreight={pendingFreight}
        />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        <AppHeader
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={toggleSidebar}
          pageTitle={pageTitle}
          pageDescription={pageDescription}
          isAdmin={isAdmin}
          userFirm={userFirm}
          user={user}
          onLogout={handleLogoutWithConfirm}
          delayedCount={delayedCount}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode((d) => !d)}
        />

        <main className="flex-1 overflow-y-auto main-scroll pb-16 lg:pb-0">
          <div className="p-3 md:p-4 max-w-[1600px] mx-auto space-y-3 md:space-y-4 animate-fade-in">
            {activeTab === "dashboard" ? (
              <OperationsDashboard payments={allPayments} onNavigate={handleNavigate} onRefresh={() => refetch()} />
            ) : activeTab === "users" ? (
              <Suspense
                fallback={
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
                  </div>
                }
              >
                <UserManagementLazy />
              </Suspense>
            ) : (
              <div className="bg-white dark:bg-[oklch(0.16_0.006_247)] border border-slate-200/80 dark:border-white/6 rounded-xl shadow-sm overflow-hidden">
                <Tabs value={subTab} onValueChange={(val) => setSubTab(val as any)} className="w-full">
                  <div className="px-4 py-2.5 border-b border-slate-100 dark:border-white/6 bg-white dark:bg-[oklch(0.16_0.006_247)] flex items-center justify-between flex-wrap gap-2">
                    <TabsList className="h-8 bg-slate-100/80 dark:bg-white/6 rounded-lg">
                      <TabsTrigger
                        value="pending"
                        className="rounded-md px-3.5 py-1 text-[11px] font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:text-brand-700 dark:data-[state=active]:text-brand-400 data-[state=active]:shadow-sm transition-all h-6"
                      >
                        Pending
                      </TabsTrigger>
                      <TabsTrigger
                        value="history"
                        className="rounded-md px-3.5 py-1 text-[11px] font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:text-brand-700 dark:data-[state=active]:text-brand-400 data-[state=active]:shadow-sm transition-all h-6"
                      >
                        History
                      </TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-3">
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

                      {activeTab === "checkkitting" && (
                        <button
                          onClick={async () => {
                            if (!isSoftRefreshing) {
                              setIsSoftRefreshing(true);
                              setKittingRefreshTrigger((prev) => prev + 1);
                              try {
                                await refetch();
                              } catch (e) {
                                console.error(e);
                              } finally {
                                if (subTab === "history") {
                                  setIsSoftRefreshing(false);
                                }
                              }
                            }
                          }}
                          disabled={isSoftRefreshing}
                          className="flex items-center justify-center p-1 rounded-md text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 active:scale-95 transition-all disabled:opacity-50"
                          title="Soft Refresh"
                        >
                          <RefreshCw
                            className={cn(
                              "w-3.5 h-3.5",
                              isSoftRefreshing && "animate-spin text-brand-500"
                            )}
                          />
                        </button>
                      )}
                    </div>
                  </div>

                  <TabsContent value="pending" className="mt-0">
                    {activeTab === "checkkitting" ? (
                      <FullKittingHistory
                        refreshTrigger={kittingRefreshTrigger}
                        onRefreshDone={handleKittingRefreshDone}
                      />
                    ) : (
                      <FreightTable
                        payments={payments}
                        isLoading={isLoading}
                        onEdit={handleEdit}
                        onQuickUpdate={handleQuickUpdate}
                        activeTab={activeTab}
                        subTab="pending"
                      />
                    )}
                  </TabsContent>
                  <TabsContent value="history" className="mt-0">
                    <FreightTable
                      payments={allPayments}
                      isLoading={isLoading}
                      onEdit={handleEdit}
                      onQuickUpdate={handleQuickUpdate}
                      activeTab={activeTab}
                      subTab="history"
                    />
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-20 mobile-nav-bg border-t border-slate-200 dark:border-white/6 safe-pb">
        <div className="flex items-stretch justify-around px-1 py-1">
          {allowedTabs.slice(0, 5).map((tab: string) => {
            const tabConfig: Record<string, { icon: React.ElementType; label: string }> = {
              dashboard: { icon: LayoutDashboard, label: "Home" },
              checkkitting: { icon: Package, label: "Check" },
              posting: { icon: FileText, label: "Audit" },
              makepayment: { icon: Banknote, label: "Post" },
              freight: { icon: Package2, label: "Freight" },
              users: { icon: Users, label: "Users" },
            };
            const config = tabConfig[tab] || { icon: LayoutDashboard, label: tab };
            const Icon = config.icon;
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => handleNavigate(tab)}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl flex-1 transition-all active:scale-90",
                  isActive ? "text-brand-600 dark:text-brand-400" : "text-slate-400 dark:text-slate-600"
                )}
              >
                <div className={cn("p-1.5 rounded-xl transition-all", isActive ? "bg-brand-50 dark:bg-brand-900/30" : "")}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <span className={cn("text-[9px] font-bold leading-none", isActive ? "text-brand-600 dark:text-brand-400" : "text-slate-400 dark:text-slate-600")}>
                  {config.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <FreightForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        payment={editingPayment}
        defaultStep={formStep}
        userFirm={isAdmin ? undefined : userFirm}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["freight-entries"] });
          setIsFormOpen(false);
        }}
      />
    </div>
  );
}
