import React, { useState, useEffect, useCallback, useContext } from "react";
import {
    Loader2,
    Plus,
    X,
    Save,
    RotateCcw,
    FileText,
    Eye,
    Edit,
    ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { AuthContext } from "../context/AuthContext";
import { canViewFirm } from "../utils/firmFilter";
import SuperAdminEditModal from "./SuperAdminEditModal";
import { uploadFileToStorage } from "../utils/storageUtils";
import { API_URL, getToken } from "@/lib/auth";

const normalizeFirmName = (val) => {
    if (!val) return null;
    if (Array.isArray(val)) {
        return val[0] || null;
    }
    const str = String(val).trim();
    if (str.startsWith("[") && str.endsWith("]")) {
        try {
            const parsed = JSON.parse(str);
            if (Array.isArray(parsed)) {
                return parsed[0] || null;
            }
        } catch (e) {
            // Ignore parse error
        }
    }
    return str;
};

const EMPTY_FORM = {
    purchaseReturnNo: "",
    poNo: "",
    actionType: "",
    partyName: "",
    productName: "",
    qty: "",
    totalReturnQty: "",
    returnThisTime: "",
    returnedQtyBefore: 0,
    maxReturnQty: 0,
    hasFixedTotalReturnQty: false,
    returnReason: "",
    transport: "",
    typeOfTransport: "",
    vehicleNo: "",
    builtyNo: "",
    rateType: "",
    amount: "",
    productRate: "",
    orgBillNo: "",
    billNo: "",
    billCopy: "",
    creditNoteUrl: "",
    liftNo: "",
    firmName: "",
    mismatch_id: null,
    id: null,
};

export default function PurchaseReturnPage() {
    const { user, isSuperAdmin: isSuperAdminContext } = useContext(AuthContext);
    const isSuperAdmin = !!(isSuperAdminContext || user?.isSuperAdmin);
    const [records, setRecords] = useState([]);
    const [pendingMismatches, setPendingMismatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("pending");
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [viewRecord, setViewRecord] = useState(null);
    const [availableLifts, setAvailableLifts] = useState([]);
    const [creditNoteImageFile, setCreditNoteImageFile] = useState(null);
    const [superAdminEditItem, setSuperAdminEditItem] = useState(null);
    const [superAdminEditMismatch, setSuperAdminEditMismatch] = useState(null);

    // ── Fetch all records ──────────────────────────────────────────────────
    const fetchRecords = useCallback(async () => {
        setLoading(true);
        try {
            const [dataRes, liftsRes] = await Promise.all([
                fetch(`${API_URL}/purchase/purchase-return/data`),
                fetch(`${API_URL}/purchase/purchase-return/lifts`),
            ]);
            const dataJson = await dataRes.json();
            const liftsJson = await liftsRes.json();
            if (!dataRes.ok || !dataJson.success) throw new Error(dataJson.message || "Failed to load records");
            if (!liftsRes.ok || !liftsJson.success) throw new Error(liftsJson.message || "Failed to load lifts");

            let fetchedReturns = dataJson.data.history || [];
            let fetchedMismatches = dataJson.data.pending || [];
            let fetchedLifts = liftsJson.data || [];

            // Role-based filtering
            if (user?.firmName) {
                fetchedReturns = fetchedReturns.filter((rec) =>
                    canViewFirm(user.firmName, rec["Firm Name"])
                );
                fetchedMismatches = fetchedMismatches.filter((rec) =>
                    canViewFirm(user.firmName, rec["Firm Name"])
                );
                fetchedLifts = fetchedLifts.filter((lift) =>
                    canViewFirm(user.firmName, lift["Firm Name"])
                );
            }

            setRecords(fetchedReturns);
            setPendingMismatches(fetchedMismatches);
            setAvailableLifts(fetchedLifts);
        } catch (err) {
            console.error("Failed to fetch records:", err);
            toast.error("Failed to load records.");
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    // ── Auto-generate PR No. ───────────────────────────────────────────────
    const generatePRNumber = async () => {
        try {
            const res = await fetch(`${API_URL}/purchase/purchase-return/next-number`);
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.message || "Failed");
            return json.data.purchaseReturnNo;
        } catch (err) {
            console.error("PR Number generation error:", err);
            return `PR-${Math.floor(Math.random() * 1000)}`;
        }
    };

    // ── Open form for new manual record ────────────────────────────────────
    const handleOpenForm = async () => {
        const prNo = await generatePRNumber();
        setForm({ ...EMPTY_FORM, purchaseReturnNo: prNo });
        setShowForm(true);
    };

    // ── Open form for creating from mismatch ──────────────────────────────
    const handleCreateFromMismatch = async (mismatch) => {
        const prNo = await generatePRNumber();
        setForm({
            ...EMPTY_FORM,
            purchaseReturnNo: prNo,
            poNo: mismatch["Indent Number"] || "",
            actionType: mismatch["Action Type"] || "Purchase Return",
            partyName: mismatch["Party Name"] || "",
            productName: mismatch["Product Name"] || "",
            qty: "",
            totalReturnQty: mismatch.totalReturnQty
                ? String(mismatch.totalReturnQty)
                : "",
            returnThisTime: "",
            returnedQtyBefore: mismatch.returnedQty || 0,
            maxReturnQty: mismatch.totalQty || 0,
            hasFixedTotalReturnQty: Boolean(mismatch.totalReturnQty),
            returnReason: mismatch["Remarks"] || "",
            liftNo: mismatch["Lift Number"] || "",
            firmName: mismatch["Firm Name"] || "",
            mismatch_id: mismatch.id,
            id: null,
        });
        setShowForm(true);
    };

    // ── Open form for editing existing finalized record ────────────────────
    const handleEditRecord = async (rec) => {
        const liftNo = String(rec["Lift No"] || "").trim();
        const mismatchId = String(rec.mismatch_id || "").trim();
        const otherLiftReturns = records
            .filter((item) => {
                if (String(item.id) === String(rec.id)) return false;
                const itemMismatchId = String(item.mismatch_id || "").trim();
                const itemLiftNo = String(item["Lift No"] || "").trim();
                // Match by EITHER same mismatch_id OR same Lift No (covers all partial returns for this lift)
                if (mismatchId && itemMismatchId === mismatchId) return true;
                if (liftNo && itemLiftNo === liftNo) return true;
                return false;
            })
            .reduce(
                (sum, item) =>
                    sum +
                    (parseFloat(item["Return This Time"]) ||
                        parseFloat(item["Qty"]) ||
                        0),
                0
            );
        // Always use the sum of OTHER records for same lift/mismatch as "already returned before this edit"
        const returnedQtyBefore = otherLiftReturns;

        let maxReturnQty = 0;
        if (liftNo) {
            try {
                const res = await fetch(`${API_URL}/purchase/purchase-return/lift/${encodeURIComponent(liftNo)}`);
                const json = await res.json();
                if (res.ok && json.success) {
                    // Always use full received qty from the lift as the total baseline
                    maxReturnQty = parseFloat(json.data.actualQuantity) || 0;
                }
            } catch (e) {
                console.error("Lift lookup error:", e);
            }
        }

        setForm({
            purchaseReturnNo: rec["Purchase Return No."],
            poNo: rec["Po No."],
            actionType: rec["Action Type"],
            partyName: rec["Party Name"],
            productName: rec["Product Name"],
            qty: rec["Return This Time"] ?? rec["Qty"],
            totalReturnQty: rec["Total Return Qty"] ?? rec["Qty"] ?? "",
            returnThisTime: rec["Return This Time"] ?? rec["Qty"] ?? "",
            returnedQtyBefore,
            maxReturnQty: rec["Total Qty"] !== undefined && rec["Total Qty"] !== null ? parseFloat(rec["Total Qty"]) : maxReturnQty,
            hasFixedTotalReturnQty: Boolean(rec["Total Return Qty"]),
            returnReason: rec["Return Reason"],
            transport: rec["Transport"],
            typeOfTransport: rec["Type of Transport"],
            vehicleNo: rec["Vehicle No"],
            builtyNo: rec["Builty No"],
            rateType: rec["Rate Type"],
            amount: rec["Amount"],
            productRate: rec["Product Rate"] || "",
            orgBillNo: rec["Org. Bill No"],
            billNo: rec["Bill No"] || rec["Bill No."],
            billCopy: rec["Bill Copy"] || rec["Bill Image"],
            creditNoteUrl: rec["Credit Note URL"] || "",
            liftNo: rec["Lift No"],
            firmName: rec["Firm Name"],
            mismatch_id: rec.mismatch_id,
            id: rec.id,
        });
        setShowForm(true);
    };

    const handleChange = (field, value) => {
        setForm((prev) => ({
            ...prev,
            [field]: value,
            ...(field === "returnThisTime" ? { qty: value } : {}),
        }));
    };

    // ── When Po No. changes (optional additional logic) ────────────────────
    const handlePoNoBlur = async (poNo) => {
        if (!poNo) return;
        try {
            const res = await fetch(`${API_URL}/purchase/purchase-return/po/${encodeURIComponent(poNo)}`);
            const json = await res.json();
            if (res.ok && json.success && json.data) {
                setForm(prev => ({
                    ...prev,
                    billNo: json.data.billNo || prev.billNo,
                    billCopy: json.data.billImage || prev.billCopy,
                    partyName: json.data.partyName || prev.partyName,
                    productName: json.data.productName || prev.productName,
                }));
            }
        } catch (err) {
            console.error("Auto-fetch error:", err);
        }
    };

    const handleLiftNoBlur = async (value) => {
        const liftNo = String(value || "").trim();
        if (!liftNo) return;

        try {
            const res = await fetch(
                `${API_URL}/purchase/purchase-return/lift/${encodeURIComponent(liftNo)}?excludeReturnId=${form.id || ""}`
            );
            const json = await res.json();
            if (!res.ok || !json.success) {
                toast.warning(`Lift No. ${liftNo} was not found.`);
                return;
            }
            const liftData = json.data;

            setForm((prev) => ({
                ...prev,
                liftNo,
                poNo: liftData.poNo || prev.poNo,
                partyName: liftData.partyName || prev.partyName,
                productName: liftData.productName || prev.productName,
                billNo: liftData.billNo || prev.billNo,
                billCopy: liftData.billImage || prev.billCopy,
                productRate: liftData.productRate || prev.productRate,
                firmName: normalizeFirmName(liftData.firmName) || prev.firmName,
                maxReturnQty: liftData.maxReturnQty || 0,
                returnedQtyBefore: 0,
            }));
        } catch (err) {
            console.error("Lift auto-fetch error:", err);
            toast.error("Failed to load the selected Lift quantity.");
        }
    };

    // Note: cascading the linked Mismatch's Status/Action Type once a return
    // is fully processed now happens server-side (purchaseReturn.controller.js
    // saveReturn -> cascadeMismatchStatus), mirroring this page's old
    // updateMismatchStatus logic.

    const handleSubmit = async () => {
        const totalReturnQty = parseFloat(form.totalReturnQty);
        const returnThisTime = parseFloat(form.returnThisTime);
        const returnedQtyBefore = parseFloat(form.returnedQtyBefore) || 0;
        const remainingReturnQty = totalReturnQty - returnedQtyBefore;

        if (!form.purchaseReturnNo || !form.liftNo || !form.poNo || !totalReturnQty || !returnThisTime) {
            toast.warning("Please provide PR No., Lift No., PO / Indent No, Total Return Qty and Return This Time.");
            return;
        }
        if (totalReturnQty <= 0 || returnThisTime <= 0) {
            toast.warning("Return quantities must be greater than zero.");
            return;
        }
        if (form.maxReturnQty > 0 && totalReturnQty > form.maxReturnQty) {
            toast.warning(`Total Return Qty cannot exceed received quantity (${form.maxReturnQty}).`);
            return;
        }
        if (remainingReturnQty <= 0 || returnThisTime > remainingReturnQty + 0.000001) {
            toast.warning(`Return This Time cannot exceed pending return quantity (${Math.max(0, remainingReturnQty)}).`);
            return;
        }
        if (!creditNoteImageFile && !form.creditNoteUrl) {
            toast.warning("Please upload a Credit Note Image.");
            return;
        }

        setSubmitting(true);
        try {
            // Upload Credit Note image if provided
            let creditNoteUrl = form.creditNoteUrl || null;
            if (creditNoteImageFile) {
                const { url } = await uploadFileToStorage(creditNoteImageFile, "image", "credit-note");
                creditNoteUrl = url;
            }

            const actionTypeToUse = form.actionType || "Return Material and Make Debit Note";

            const payload = {
                purchaseReturnNo: form.purchaseReturnNo,
                poNo: form.poNo || "",
                actionType: actionTypeToUse,
                partyName: form.partyName || null,
                productName: form.productName || null,
                qty: Math.round(returnThisTime),
                totalReturnQty,
                returnThisTime,
                returnReason: form.returnReason || null,
                transport: form.transport || null,
                typeOfTransport: form.typeOfTransport || null,
                vehicleNo: form.vehicleNo || null,
                builtyNo: form.builtyNo || null,
                rateType: form.rateType || null,
                amount: form.amount || null,
                productRate: form.productRate ? parseFloat(form.productRate) : null,
                billNo: form.billNo || null,
                orgBillNo: form.orgBillNo || null,
                liftNo: form.liftNo || null,
                firmName: normalizeFirmName(form.firmName) || normalizeFirmName(user?.firmName) || null,
                mismatchId: form.mismatch_id || null,
                totalQty: form.maxReturnQty ? parseFloat(form.maxReturnQty) : null,
                creditNoteUrl: creditNoteUrl || null,
                billImage: form.billCopy || null,
            };

            const url = form.id
                ? `${API_URL}/purchase/purchase-return/update/${form.id}`
                : `${API_URL}/purchase/purchase-return/submit`;
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.message || "Failed to save");

            toast.success("✅ Purchase Return saved successfully!");
            setShowForm(false);
            setForm(EMPTY_FORM);
            setCreditNoteImageFile(null);
            fetchRecords();
        } catch (err) {
            console.error("Submit error:", err);
            toast.error(`❌ Failed to save: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (val) => {
        if (!val) return "—";
        try {
            return new Date(val).toLocaleString("en-GB", { hour12: false }).replace(",", "");
        } catch {
            return val;
        }
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            {superAdminEditItem && (
                <SuperAdminEditModal
                    title={`Edit Purchase Return Record — ${superAdminEditItem["Purchase Return No."] || superAdminEditItem.id}`}
                    apiUrl={`${API_URL}/purchase/purchase-return/update/${superAdminEditItem.id}`}
                    fields={[
                        { label: "Purchase Return No.", dbKey: "purchaseReturnNo", value: superAdminEditItem["Purchase Return No."], type: "text" },
                        { label: "Lift No", dbKey: "liftNo", value: superAdminEditItem["Lift No"], type: "text" },
                        { label: "Po No.", dbKey: "poNo", value: superAdminEditItem["Po No."], type: "text" },
                        { label: "Party Name", dbKey: "partyName", value: superAdminEditItem["Party Name"], type: "text" },
                        { label: "Product Name", dbKey: "productName", value: superAdminEditItem["Product Name"], type: "text" },
                        { label: "Product Rate", dbKey: "productRate", value: superAdminEditItem["Product Rate"], type: "number" },
                        { label: "Bill No", dbKey: "billNo", value: superAdminEditItem["Bill No"], type: "text" },
                        { label: "Bill Image URL", dbKey: "billImage", value: superAdminEditItem["Bill Image"], type: "text" },
                        { label: "Total Qty", dbKey: "totalQty", value: superAdminEditItem["Total Qty"] ?? superAdminEditItem["Qty"], type: "number" },
                        { label: "Total Return Qty", dbKey: "totalReturnQty", value: superAdminEditItem["Total Return Qty"], type: "number" },
                        { label: "Return This Time", dbKey: "returnThisTime", value: superAdminEditItem["Return This Time"], type: "number" },
                        { label: "Qty (Internal)", dbKey: "qty", value: superAdminEditItem["Qty"], type: "number" },
                        { label: "Credit Note URL", dbKey: "creditNoteUrl", value: superAdminEditItem["Credit Note URL"], type: "text" },
                        { label: "Return Reason", dbKey: "returnReason", value: superAdminEditItem["Return Reason"], type: "textarea" },
                        { label: "Transport", dbKey: "transport", value: superAdminEditItem["Transport"], type: "text" },
                        { label: "Type of Transport", dbKey: "typeOfTransport", value: superAdminEditItem["Type of Transport"], type: "text" },
                        { label: "Vehicle No", dbKey: "vehicleNo", value: superAdminEditItem["Vehicle No"], type: "text" },
                        { label: "Builty No", dbKey: "builtyNo", value: superAdminEditItem["Builty No"], type: "text" },
                        { label: "Rate Type", dbKey: "rateType", value: superAdminEditItem["Rate Type"], type: "text" },
                        { label: "Amount", dbKey: "amount", value: superAdminEditItem["Amount"], type: "text" },
                        { label: "Org. Bill No", dbKey: "orgBillNo", value: superAdminEditItem["Org. Bill No"], type: "text" },
                        { label: "Firm Name", dbKey: "firmName", value: superAdminEditItem["Firm Name"], type: "text" },
                    ]}
                    onClose={() => setSuperAdminEditItem(null)}
                    onSaved={() => {
                        setSuperAdminEditItem(null);
                        fetchRecords();
                    }}
                />
            )}
            {superAdminEditMismatch && (
                <SuperAdminEditModal
                    title={`Edit Mismatch — ${superAdminEditMismatch["Lift Number"] || superAdminEditMismatch.id}`}
                    apiUrl={`${API_URL}/purchase/mismatch/update/${superAdminEditMismatch.id}`}
                    fields={[
                        { label: "Firm Name", dbKey: "firmName", value: superAdminEditMismatch["Firm Name"], type: "text" },
                        { label: "Party Name", dbKey: "partyName", value: superAdminEditMismatch["Party Name"], type: "text" },
                        { label: "Product Name", dbKey: "productName", value: superAdminEditMismatch["Product Name"], type: "text" },
                        { label: "Qty", dbKey: "qty", value: superAdminEditMismatch["Qty"], type: "number" },
                        { label: "Status", dbKey: "status", value: superAdminEditMismatch["Status"], type: "text" },
                        { label: "coordination_status", dbKey: "coordinationStatus", value: superAdminEditMismatch["coordination_status"], type: "text" },
                        { label: "Action Type", dbKey: "actionType", value: superAdminEditMismatch["Action Type"], type: "text" },
                        { label: "Remarks", dbKey: "remarks", value: superAdminEditMismatch["Remarks"], type: "textarea" },
                    ]}
                    onClose={() => setSuperAdminEditMismatch(null)}
                    onSaved={() => {
                        setSuperAdminEditMismatch(null);
                        fetchRecords();
                    }}
                />
            )}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-100 rounded-xl">
                        <RotateCcw className="w-6 h-6 text-[#268a59]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Purchase Return</h1>
                        <p className="text-sm text-gray-500 font-medium">Manage and track material returns and credit notes</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={fetchRecords} variant="outline" size="sm" className="h-10" disabled={loading}>
                        <Loader2 className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button onClick={handleOpenForm} className="h-10 bg-[#268a59] hover:bg-[#5a7a27] text-white shadow-lg">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Purchase Return
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="bg-white border rounded-lg p-1">
                    <TabsTrigger value="pending" className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700 h-9 px-4">
                        Pending Mismatches ({pendingMismatches.length})
                    </TabsTrigger>
                    <TabsTrigger value="finalized" className="data-[state=active]:bg-green-100 data-[state=active]:text-green-700 h-9 px-4">
                        Finalized Returns ({records.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="finalized">
                    <Card className="overflow-hidden flex flex-col">
                        <CardHeader className="pb-3 bg-gray-50/30">
                            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#2fa36b]" />
            Purchase Return
          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 flex flex-col">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                    <Loader2 className="w-10 h-10 animate-spin mb-4" />
                                    <span>Loading finalized returns...</span>
                                </div>
                            ) : (
                                <div className="overflow-auto max-h-[calc(100vh-250px)] relative custom-scrollbar">
                                    <table className="w-full text-sm border-collapse">
                                        <thead className="sticky top-0 z-30">
                                            <tr className="bg-gray-50 border-b border-gray-200">
                                                <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Actions</th>
                                                <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm w-[60px]">#</th>
                                                <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">PR No.</th>
                                                <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Lift No</th>
                                                <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">PO No.</th>
                                                <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Party Name</th>
                                                <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Product Name</th>
                                                <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Product Rate</th>
                                                <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Bill No</th>
                                                <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Bill Image</th>
                                                <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Qty</th>
                                                <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Total Return Qty</th>
                                                <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Return This Time</th>
                                                <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Credit Note</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-100">
                                            {records.map((rec, idx) => (
                                                <tr key={rec.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} hover:bg-green-50/50 transition-colors border-b border-gray-100`}>
                                                    <td className="px-4 py-3 whitespace-nowrap text-left">
                                                        <div className="flex items-center justify-start gap-1">
                                                            <Button variant="ghost" size="xs" className="h-7 w-7 p-0 text-[#2fa36b] hover:bg-[#2fa36b]/10" onClick={() => setViewRecord(rec)}>
                                                                <Eye className="w-3.5 h-3.5" />
                                                            </Button>
                                                            <Button variant="ghost" size="xs" className="h-7 w-7 p-0 text-primary hover:bg-primary/10" onClick={() => handleEditRecord(rec)}>
                                                                <Edit className="w-3.5 h-3.5" />
                                                            </Button>
                                                            {isSuperAdmin && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="xs"
                                                                    className="h-7 w-7 p-0 text-purple-600 hover:bg-purple-100/50 border border-purple-200"
                                                                    onClick={() => setSuperAdminEditItem(rec)}
                                                                    title="Super Admin Edit"
                                                                >
                                                                    <ShieldCheck className="w-3.5 h-3.5" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-gray-500 font-mono text-xs">{idx + 1}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap font-bold text-[#268a59]">{rec["Purchase Return No."]}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap font-bold text-orange-700 text-xs">{rec["Lift No"] || "—"}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-primary">{rec["Po No."] || "—"}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 italic font-medium">{rec["Party Name"]}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700">{rec["Product Name"]}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-indigo-700">{rec["Product Rate"] ? `₹${rec["Product Rate"]}` : "—"}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700">{rec["Bill No"] || "—"}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        {rec["Bill Image"] || rec["Bill Copy"] ? (
                                                            <a href={rec["Bill Image"] || rec["Bill Copy"]} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-semibold hover:bg-blue-100 transition-colors">
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                                View Bill
                                                            </a>
                                                        ) : <span className="text-gray-400 text-xs">—</span>}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap font-bold text-gray-900">{rec["Total Qty"] ?? rec["Qty"]}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-gray-700">{rec["Total Return Qty"] ?? "—"}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-[#268a59]">{rec["Return This Time"] ?? "—"}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        {rec["Credit Note URL"] ? (
                                                            <a href={rec["Credit Note URL"]} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded text-xs font-semibold hover:bg-green-100 transition-colors">
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                                View
                                                            </a>
                                                        ) : <span className="text-gray-400 text-xs">—</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                            {records.length === 0 && (
                                                <tr>
                                                    <td colSpan={10} className="px-6 py-12 text-center text-gray-400 bg-gray-50/30">
                                                        <div className="flex flex-col items-center justify-center">
                                                            <RotateCcw className="w-10 h-10 text-gray-300 mb-3 opacity-20" />
                                                            <p className="text-sm font-medium">No finalized returns found.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="pending">
                    <Card className="overflow-hidden flex flex-col">
                        <CardHeader className="pb-3 bg-orange-50/20">
                            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                                <RotateCcw className="w-4 h-4 text-orange-500" />
                                Pending Mismatches Needs Return
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 flex flex-col">
                            <div className="overflow-auto max-h-[calc(100vh-250px)] relative custom-scrollbar">
                                <table className="w-full text-sm border-collapse">
                                    <thead className="sticky top-0 z-30">
                                        <tr className="bg-gray-50 border-b border-gray-200">
                                            <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Actions</th>
                                            <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm w-[60px]">#</th>
                                            <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Lift No</th>
                                            <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">PO No</th>
                                            <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Bill Image</th>
                                            <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Party Name</th>
                                            <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Product Name</th>
                                            <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Total Return Qty</th>
                                            <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Returned</th>
                                            <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Pending Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {pendingMismatches.map((m, idx) => (
                                            <tr key={m.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-orange-50/10'} hover:bg-orange-50/20 transition-colors border-b border-gray-100`}>
                                                <td className="px-4 py-3 whitespace-nowrap text-left font-medium">
                                                    <div className="flex items-center justify-start gap-1">
                                                        <Button 
                                                            size="xs" 
                                                            className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm h-7 text-[10px] font-bold uppercase tracking-wider px-3"
                                                            onClick={() => handleCreateFromMismatch(m)}
                                                        >
                                                            <Plus className="w-3 h-3 mr-1" />
                                                            Create PR
                                                        </Button>
                                                        {isSuperAdmin && (
                                                            <Button
                                                                variant="ghost"
                                                                size="xs"
                                                                className="h-7 w-7 p-0 text-purple-600 hover:bg-purple-100/50 border border-purple-200"
                                                                onClick={() => setSuperAdminEditMismatch(m)}
                                                                title="Super Admin Edit Mismatch"
                                                            >
                                                                <ShieldCheck className="w-3.5 h-3.5" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-gray-500 font-mono text-xs">{idx + 1}</td>
                                                <td className="px-4 py-3 whitespace-nowrap font-bold text-orange-700">{m["Lift Number"]}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-primary">{m["Indent Number"] || "—"}</td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {m["Bill Image"] ? (
                                                        <a href={m["Bill Image"]} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-semibold hover:bg-blue-100 transition-colors">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                            View Bill
                                                        </a>
                                                    ) : <span className="text-gray-400 text-xs">—</span>}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 italic font-medium">{m["Party Name"]}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700">{m["Product Name"]}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-gray-800">{m.returnTargetQty > 0 ? m.returnTargetQty : "—"}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-green-700">{m.returnedQty > 0 ? m.returnedQty.toFixed(2) : "0"}</td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                                                        m.pendingQty > 0.001 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                        {m.pendingQty > 0.001 ? m.pendingQty.toFixed(2) : "—"}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {pendingMismatches.length === 0 && (
                                            <tr>
                                                <td colSpan={9} className="px-6 py-12 text-center text-gray-400 bg-gray-50/30">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <RotateCcw className="w-10 h-10 text-gray-300 mb-3 opacity-20" />
                                                        <p className="text-sm font-medium">No pending mismatches found.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Modal Form */}
            {showForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-100">
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Purchase Return Details</h3>
                                    <p className="text-sm text-gray-500 font-medium">Finalize return and transport info</p>
                                </div>
                                <button onClick={() => setShowForm(false)} className="p-2 text-gray-400 hover:text-gray-600">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Return Progress Summary — shown when context is available */}
                            {(form.mismatch_id || form.maxReturnQty > 0 || form.id !== null || parseFloat(form.totalReturnQty) > 0) && (() => {
                                const isEditMode = form.id !== null;
                                const totalTarget = parseFloat(form.totalReturnQty) || parseFloat(form.maxReturnQty) || 0;
                                // For edit: "already returned" includes this record; for new: only previous records
                                const thisRecordQty = isEditMode ? (parseFloat(form.returnThisTime) || 0) : 0;
                                const alreadyReturned = (parseFloat(form.returnedQtyBefore) || 0) + thisRecordQty;
                                const stillPending = Math.max(0, totalTarget - alreadyReturned);
                                return (
                                    <div className="mb-6 grid grid-cols-3 gap-3">
                                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                                            <p className="text-[10px] uppercase font-bold text-blue-400 tracking-widest mb-1">Total Received Qty</p>
                                            <p className="text-xl font-extrabold text-blue-700">{form.maxReturnQty > 0 ? form.maxReturnQty : (totalTarget > 0 ? totalTarget : "—")}</p>
                                        </div>
                                        <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                                            <p className="text-[10px] uppercase font-bold text-green-400 tracking-widest mb-1">Already Returned</p>
                                            <p className="text-xl font-extrabold text-green-700">{alreadyReturned.toFixed(2)}</p>
                                            {isEditMode && <p className="text-[9px] text-green-400 mt-0.5">Incl. this record</p>}
                                        </div>
                                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
                                            <p className="text-[10px] uppercase font-bold text-orange-400 tracking-widest mb-1">Still Pending</p>
                                            <p className="text-xl font-extrabold text-orange-600">{stillPending > 0.001 ? stillPending.toFixed(2) : "0"}</p>
                                        </div>
                                    </div>
                                );
                            })()}
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">PR Number</label>
                                        <input type="text" value={form.purchaseReturnNo} readOnly className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Lift No *</label>
                                        {Boolean(form.mismatch_id) || form.id !== null ? (
                                            <input
                                                type="text"
                                                value={form.liftNo}
                                                readOnly
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 outline-none cursor-not-allowed"
                                            />
                                        ) : (
                                            <select
                                                value={form.liftNo}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    handleChange("liftNo", val);
                                                    handleLiftNoBlur(val);
                                                }}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white"
                                            >
                                                <option value="">Select Lift No.</option>
                                                {Array.from(new Set(availableLifts.map(l => String(l["Lift No"] || "").trim()).filter(Boolean))).map(liftNum => {
                                                    const lift = availableLifts.find(l => String(l["Lift No"] || "").trim() === liftNum);
                                                    return (
                                                        <option key={liftNum} value={liftNum}>
                                                            {liftNum} {lift ? `(${lift["Vendor Name"] || lift["Party Name"] || "No Vendor"})` : ""}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">PO / Indent No *</label>
                                        <input type="text" value={form.poNo} onChange={(e) => handleChange("poNo", e.target.value)} onBlur={(e) => handlePoNoBlur(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Party Name</label>
                                        <input type="text" value={form.partyName} readOnly={form.id !== null} onChange={(e) => handleChange("partyName", e.target.value)} className={`w-full px-4 py-3 rounded-xl border text-sm outline-none ${form.id !== null ? "bg-gray-50 border-gray-200" : "border-gray-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500"}`} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Product Name</label>
                                        <input type="text" value={form.productName} readOnly={form.id !== null} onChange={(e) => handleChange("productName", e.target.value)} className={`w-full px-4 py-3 rounded-xl border text-sm outline-none ${form.id !== null ? "bg-gray-50 border-gray-200" : "border-gray-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500"}`} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Product Rate</label>
                                        <input
                                            type="number"
                                            step="any"
                                            value={form.productRate}
                                            onChange={(e) => handleChange("productRate", e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all"
                                            placeholder="₹ Rate per unit"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Total Qty</label>
                                        <input
                                            type="number"
                                            value={form.maxReturnQty || ""}
                                            readOnly={Boolean(form.mismatch_id)}
                                            onChange={(e) => handleChange("maxReturnQty", e.target.value)}
                                            className={`w-full px-4 py-3 rounded-xl border text-sm outline-none ${
                                                Boolean(form.mismatch_id)
                                                    ? "bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed"
                                                    : "border-gray-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                                            }`}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Total Return Qty</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max={form.maxReturnQty > 0 ? form.maxReturnQty : undefined}
                                            step="any"
                                            value={form.totalReturnQty}
                                            readOnly={form.hasFixedTotalReturnQty}
                                            onChange={(e) => handleChange("totalReturnQty", e.target.value)}
                                            className={`w-full px-4 py-3 rounded-xl border text-sm outline-none ${
                                                form.hasFixedTotalReturnQty
                                                    ? "bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed"
                                                    : "border-gray-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                                            }`}
                                            placeholder="e.g. 5"
                                        />
                                        {form.maxReturnQty > 0 && !form.hasFixedTotalReturnQty && (
                                            <p className="mt-1 text-[11px] text-gray-500">
                                                Maximum received quantity: {form.maxReturnQty}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Return This Time</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max={Math.max(
                                                0,
                                                (parseFloat(form.totalReturnQty) || 0) -
                                                (parseFloat(form.returnedQtyBefore) || 0)
                                            )}
                                            step="any"
                                            value={form.returnThisTime}
                                            onChange={(e) => handleChange("returnThisTime", e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                                            placeholder="e.g. 2.5"
                                        />
                                        {form.totalReturnQty && (
                                            <p className="mt-1 text-[11px] text-orange-600">
                                                Pending before this return: {Math.max(
                                                    0,
                                                    (parseFloat(form.totalReturnQty) || 0) -
                                                    (parseFloat(form.returnedQtyBefore) || 0)
                                                )}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Return Reason</label>
                                        <input type="text" value={form.returnReason} onChange={(e) => handleChange("returnReason", e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all" placeholder="Reason for return" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Bill Number</label>
                                        <input
                                            type="text"
                                            value={form.billNo}
                                            onChange={(e) => handleChange("billNo", e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all"
                                            placeholder="Bill No."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Bill Image</label>
                                        {form.billCopy ? (
                                            <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm flex items-center justify-between h-[46px]">
                                                <span className="text-gray-500 truncate max-w-[150px] font-medium">{form.billCopy.split('/').pop()}</span>
                                                <a href={form.billCopy} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:text-green-800 font-bold underline flex items-center text-xs">
                                                    <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                    View Image
                                                </a>
                                            </div>
                                        ) : (
                                            <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-400 italic h-[46px] flex items-center">
                                                No Bill Image available
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Transporter Name</label>
                                        <input type="text" value={form.transport} onChange={(e) => handleChange("transport", e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all" placeholder="Enter transporter" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Vehicle Number</label>
                                        <input type="text" value={form.vehicleNo} onChange={(e) => handleChange("vehicleNo", e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all" placeholder="e.g. WB 12 XX XXXX" />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                            Credit Note Image <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="file"
                                            accept="image/*,application/pdf,.pdf"
                                            onChange={(e) => setCreditNoteImageFile(e.target.files[0] || null)}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none cursor-pointer file:cursor-pointer file:bg-green-50 file:text-[#268a59] file:border-0 file:rounded-lg file:px-3 file:py-1.5 file:mr-3 file:text-xs hover:file:bg-green-100 transition-all"
                                        />
                                        {form.creditNoteUrl && !creditNoteImageFile && (
                                            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#2fa36b]">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                <a href={form.creditNoteUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-green-700">Previously uploaded — click to view</a>
                                            </div>
                                        )}
                                        {creditNoteImageFile && (
                                            <p className="mt-1 text-[11px] text-gray-500">Selected: {creditNoteImageFile.name}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4 mt-6 border-t border-gray-100">
                                    <Button onClick={() => setShowForm(false)} variant="outline" className="flex-1 h-12 rounded-xl text-gray-600 border-gray-200">Cancel</Button>
                                    <Button onClick={handleSubmit} disabled={submitting} className="flex-1 h-12 rounded-xl bg-[#268a59] hover:bg-[#5a7a27] text-white shadow-lg">
                                        {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                        Finalize Purchase Return
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* View Modal */}
            {viewRecord && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-100">
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Record View</h3>
                                    <p className="text-sm text-[#268a59] font-medium">{viewRecord["Purchase Return No."]}</p>
                                </div>
                                <button onClick={() => setViewRecord(null)} className="p-2 text-gray-400 hover:text-gray-600">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-medium">
                                {[
                                    ["Purchase Return No.", viewRecord["Purchase Return No."]],
                                    ["PO No.", viewRecord["Po No."]],
                                    ["Bill No.", viewRecord["Bill No"] || viewRecord["Bill No."]],
                                    ["Bill Image", viewRecord["Bill Image"] || viewRecord["Bill Copy"]],
                                    ["Party Name", viewRecord["Party Name"]],
                                    ["Product Name", viewRecord["Product Name"]],
                                    ["Total Qty", viewRecord["Total Qty"]],
                                    ["Qty", viewRecord["Qty"]],
                                    ["Action Type", viewRecord["Action Type"]],
                                    ["Return Reason", viewRecord["Return Reason"]],
                                    ["Transport", viewRecord["Transport"]],
                                    ["Vehicle No", viewRecord["Vehicle No"]],
                                    ["Lift No", viewRecord["Lift No"]],
                                    ["Date", formatDate(viewRecord["Time Stamp"])],
                                ].map(([label, value]) => (
                                    <div key={label} className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                                        <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-widest">{label}</p>
                                        {label === "Bill Image" && value ? (
                                            <a href={value} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:text-green-800 font-bold underline flex items-center text-xs">
                                                <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                View Bill Image
                                            </a>
                                        ) : (
                                            <p className="text-gray-900">{value || "—"}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end pt-8 mt-8 border-t border-gray-100">
                                <Button onClick={() => setViewRecord(null)} variant="outline" className="rounded-xl px-8 h-10 font-semibold">Close</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
