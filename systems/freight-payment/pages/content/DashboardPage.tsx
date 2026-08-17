import React from "react";
import { useNavigate } from "react-router-dom";
import { OperationsDashboard } from "../../components/OperationsDashboard";
import { useFreightData } from "../../hooks/useFreightData";

export default function DashboardPage() {
  const { allPayments, refetch } = useFreightData();
  const navigate = useNavigate();

  const handleNavigate = (tab: string) => {
    // Map tab keys to route paths
    const tabToPath: Record<string, string> = {
      dashboard: "/",
      checkkitting: "/checkkitting",
      posting: "/posting",
      makepayment: "/makepayment",
      freight: "/freight",
    };
    const path = tabToPath[tab];
    if (path) navigate(path);
  };

  return (
    <OperationsDashboard
      payments={allPayments}
      onNavigate={handleNavigate}
      onRefresh={() => refetch()}
    />
  );
}
