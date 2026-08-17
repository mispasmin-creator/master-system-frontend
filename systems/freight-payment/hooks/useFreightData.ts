import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { freightPaymentApi } from "../lib/api";
import { FreightPayment } from "../types";

// ─── Helpers ─────────────────────────────────────────────────────────────────
export const isDone = (status?: string | null) => {
  const n = String(status || "").trim().toLowerCase();
  return n === "done" || n === "completed";
};

const calculateDelayWithHours = (planned?: string, actual?: string) => {
  if (!planned || !actual) return 0;
  const plannedDate = new Date(planned);
  const actualDate = new Date(actual);
  if (Number.isNaN(plannedDate.getTime()) || Number.isNaN(actualDate.getTime())) return 0;
  const diffHours = Math.ceil((actualDate.getTime() - plannedDate.getTime()) / 3600000);
  return diffHours > 0 ? Number((diffHours / 24).toFixed(2)) : 0;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useFreightData() {
  const queryClient = useQueryClient();

  const {
    data: entriesData = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["freight-entries"],
    queryFn: async () => {
      const res = await freightPaymentApi.get("entry");
      return res.data || [];
    },
    staleTime: 60 * 1000,
    retry: 1,
  });

  // ─── Normalise raw API rows into FreightPayment objects ───────────────────
  const allPayments: FreightPayment[] = useMemo(() => {
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
        PostingAmount:
          e.posting_amount !== undefined && e.posting_amount !== null
            ? Number(e.posting_amount)
            : undefined,
        "Bilty Image": e.bilty_image_url,
        Timestamp: e.created_at,
        "Party Name": e.party_name,
        "Billing Qty":
          e.billing_qty !== undefined && e.billing_qty !== null
            ? Number(e.billing_qty)
            : undefined,
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
        "Batch Number":
          e.batch_number ||
          kitting.batch_number ||
          audit.batch_number ||
          posting.batch_number ||
          release.batch_number,
        currentStage: e.current_stage || "Kitting",
        kittingObj: kitting,
        auditObj: audit,
        postingObj: posting,
        releaseObj: release,
      } as FreightPayment;
    });
  }, [entriesData]);

  // ─── Per-tab filtered lists ───────────────────────────────────────────────
  const checkKittingPayments = useMemo(
    () => allPayments.filter((p) => !isDone(p.Status3)),
    [allPayments]
  );

  const postingPayments = useMemo(
    () => allPayments.filter((p) => isDone(p.Status3) && !isDone(p.Status_1)),
    [allPayments]
  );

  const makePaymentPayments = useMemo(
    () => allPayments.filter((p) => isDone(p.Status_1) && !isDone(p.Status2)),
    [allPayments]
  );

  const freightPaymentPayments = useMemo(
    () => allPayments.filter((p) => isDone(p.Status2) && !isDone(p.Status)),
    [allPayments]
  );

  // ─── Quick-update mutation ────────────────────────────────────────────────
  const quickUpdateMutation = useMutation({
    mutationFn: async ({
      data,
      step,
    }: {
      data:
        | (Partial<FreightPayment> & { id: number })
        | (Partial<FreightPayment> & { id: number })[];
      step: string;
    }) => {
      const items = Array.isArray(data) ? data : [data];
      const results = [];
      for (const item of items) {
        let res;
        const entryId = item.id;
        if (step === "checkkitting") {
          res = await freightPaymentApi.patch("kitting", entryId, "complete", {
            remark: item.Remark3,
          });
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
    },
  });

  // ─── handleQuickUpdate ────────────────────────────────────────────────────
  const handleQuickUpdate = (
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
        if (amt !== undefined) updateData.Amount = amt as number;
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
  };

  return {
    allPayments,
    checkKittingPayments,
    postingPayments,
    makePaymentPayments,
    freightPaymentPayments,
    isLoading,
    error,
    refetch,
    handleQuickUpdate,
    isMutating: quickUpdateMutation.isPending,
  };
}
