import { storeApi } from '../lib/api';

/**
 * Audit Data wizard service (component: AuditData.tsx, sidebar label "Audit Data").
 *
 * The reference app stored this 5-stage wizard (Audit -> Rectify -> Reaudit -> Tally Entry
 * -> Again Audit) as five planned/actual/status/remarks column-quintets on one flat row.
 * The new schema splits each stage into its own 1:1 child table off "lift"
 * (StoreAudit / StoreRectify / StoreReaudit / StoreTallyEntry / StoreAgainAudit).
 *
 * To avoid rewriting AuditData.tsx's stage-progression logic (which keys everything off
 * flat planned1-5/actual1-5/status1-5/remarks1-5 fields), this service keeps that same flat
 * shape at the boundary and translates to/from the five real tables underneath:
 *  - actualN is synthesized as "truthy" once that stage's row exists AND has a status set
 *    (an audit/rectify/... row can exist as an empty placeholder before it's processed).
 *  - plannedN is cosmetic-only (row creation time), matching the reference's display-only use.
 *  - id on each record is the lift's id, so writes route straight back to the right table.
 */

export interface TallyEntryRecord {
    id: number;
    timestamp: string;
    liftNumber: string;
    indentNumber: string;
    poNumber: string;
    materialInDate: string;
    productName: string;
    billStatus: string;
    qty: number;
    partyName: string;
    billAmt: number;
    billImage: string;
    billNo: string;
    location: string;
    typeOfBills: string;
    productImage: string;
    area: string;
    indentedFor: string;
    approvedPartyName: string;
    rate: number;
    indentQty: number;
    totalRate: number;
    billReceivedLater: string;
    notReceivedBillNo: string;
    planned1: string;
    actual1: string;
    status1: string;
    remarks1: string;
    planned2: string;
    actual2: string;
    status2: string;
    remarks2: string;
    planned3: string;
    actual3: string;
    status3: string;
    remarks3: string;
    planned4: string;
    actual4: string;
    status4: string;
    remarks4: string;
    planned5: string;
    actual5: string;
    status5: string;
    remarks5: string;
    firmNameMatch: string;
    damageOrder?: string;
    quantityAsPerBill?: string;
    priceAsPerPoCheck?: string;
    hodStatus?: string;
    hodRemark?: string;
    receivingStatus?: string;
    receivedQuantity?: number;
}

const STAGE_TABLE: Record<number, string> = {
    1: 'audit',
    2: 'rectify',
    3: 'reaudit',
    4: 'tally_entry',
    5: 'again_audit',
};

// ==================== FETCH FUNCTIONS ====================

/**
 * Fetch all audit-wizard records — one per lift that has entered the wizard
 * (i.e. HOD Approval has fired and created its StoreAudit row).
 */
export async function fetchTallyEntryRecords(): Promise<TallyEntryRecord[]> {
    try {
        const response = await storeApi.get('lift');
        const data = response.data || [];

        return (data || [])
            .filter((r: any) => {
                const hod = r.hodApproval || r.hod_approval;
                // An item enters the Audit Data wizard only if HOD has approved it and audit entry exists
                const isHodApproved = hod?.hodStatus === 'Approved' || hod?.hod_status === 'Approved';
                return !!r.audit && isHodApproved;
            })
            .map((r: any): TallyEntryRecord => {
                const audit = r.audit || {};
                const rectify = r.rectify;
                const reaudit = r.reaudit;
                const tally = r.tallyEntry || r.tally_entry;
                const again = r.againAudit || r.again_audit;
                const check = r.check || {};
                const hod = r.hodApproval || r.hod_approval || {};

                return {
                    id: r.id,
                    timestamp: audit.timestamp || r.timestamp || '',
                    liftNumber: audit.lift_number || r.lift_number || '',
                    indentNumber: audit.indent_number || r.indent_no || '',
                    poNumber: audit.po_number || r.po_number || '',
                    materialInDate: audit.material_in_date || '',
                    productName: audit.product_name || r.product_name || '',
                    billStatus: check.bill_status || audit.price_as_per_po_check || '',
                    qty: Number(audit.qty) || 0,
                    partyName: audit.party_name || '',
                    billAmt: Number(audit.bill_amt) || 0,
                    billImage: audit.bill_image || '',
                    billNo: audit.bill_no || '',
                    location: audit.location || '',
                    typeOfBills: audit.type_of_bills || '',
                    productImage: audit.product_image || '',
                    area: audit.area || '',
                    indentedFor: audit.indented_for || '',
                    approvedPartyName: audit.approved_party_name || '',
                    rate: Number(audit.rate) || 0,
                    indentQty: Number(audit.indent_qty) || 0,
                    totalRate: Number(audit.total_rate) || 0,
                    billReceivedLater: audit.bill_received_later || '',
                    notReceivedBillNo: audit.not_received_bill_no || '',
                    planned1: audit.timestamp || '',
                    actual1: audit.status ? (audit.updated_at || audit.created_at || '') : '',
                    status1: audit.status || '',
                    remarks1: audit.remarks || '',
                    planned2: rectify ? (rectify.created_at || '') : '',
                    actual2: rectify?.status ? (rectify.updated_at || rectify.created_at || '') : '',
                    status2: rectify?.status || '',
                    remarks2: rectify?.remarks || '',
                    planned3: reaudit ? (reaudit.created_at || '') : '',
                    actual3: reaudit?.status ? (reaudit.updated_at || reaudit.created_at || '') : '',
                    status3: reaudit?.status || '',
                    remarks3: reaudit?.remarks || '',
                    planned4: tally ? (tally.created_at || '') : '',
                    actual4: tally?.status ? (tally.updated_at || tally.created_at || '') : '',
                    status4: tally?.status || '',
                    remarks4: tally?.remarks || '',
                    planned5: again ? (again.created_at || '') : '',
                    actual5: again?.status ? (again.updated_at || again.created_at || '') : '',
                    status5: again?.status || '',
                    remarks5: again?.remarks || '',
                    firmNameMatch: audit.firm_name_match || r.firm_name_match || '',
                    damageOrder: check.damage_order || audit.damage_order || '',
                    quantityAsPerBill: check.quantity_as_per_bill?.toString() || audit.quantity_as_per_bill || '',
                    priceAsPerPoCheck: check.bill_status || audit.price_as_per_po_check || '',
                    hodStatus: hod.hodStatus || hod.hod_status || audit.hod_status || 'Pending',
                    hodRemark: hod.hodRemark || hod.hod_remark || audit.hod_remark || '',
                    receivingStatus: check.material_status || audit.receiving_status || '',
                    receivedQuantity: Number(check.received_quantity) || Number(audit.received_quantity) || 0,
                };
            });
    } catch (error) {
        console.error('Error fetching audit wizard records:', error);
        throw error;
    }
}

// ==================== UPDATE FUNCTIONS ====================

/**
 * Update one stage of the audit wizard for a lift. `updates` carries the flat
 * statusN/remarksN keys AuditData.tsx builds dynamically per stage — this routes
 * them to whichever of the five per-stage tables that N corresponds to.
 */
export async function updateTallyEntryRecord(liftId: number, updates: Record<string, any>) {
    try {
        for (let stage = 1; stage <= 5; stage++) {
            const statusKey = `status${stage}`;
            const remarksKey = `remarks${stage}`;
            if (updates[statusKey] === undefined && updates[remarksKey] === undefined) continue;

            await storeApi.upsertByParent(STAGE_TABLE[stage], liftId, {
                status: updates[statusKey],
                remarks: updates[remarksKey],
            });
        }
        return true;
    } catch (error) {
        console.error(`Error updating audit wizard stage for lift ${liftId}:`, error);
        throw error;
    }
}

/**
 * Create/refresh the wizard's first stage (StoreAudit) — called from HOD Approval,
 * which always populates this regardless of transportation/payment branching.
 */
export async function createAuditRecord(liftId: number, data: {
    timestamp?: string;
    liftNumber?: string;
    indentNumber?: string;
    poNumber?: string;
    materialInDate?: string;
    productName?: string;
    billNo?: string;
    qty?: number;
    partyName?: string;
    billAmt?: number;
    billImage?: string;
    indentQty?: number;
    hodStatus?: string;
    firmNameMatch?: string;
}) {
    try {
        await storeApi.upsertByParent('audit', liftId, {
            timestamp: data.timestamp,
            lift_number: data.liftNumber,
            indent_number: data.indentNumber,
            indent_no: data.indentNumber,
            po_number: data.poNumber,
            material_in_date: data.materialInDate,
            product_name: data.productName,
            bill_no: data.billNo,
            qty: data.qty,
            party_name: data.partyName,
            bill_amt: data.billAmt,
            bill_image: data.billImage,
            indent_qty: data.indentQty,
            hod_status: data.hodStatus,
            firm_name_match: data.firmNameMatch,
        });
        return true;
    } catch (error) {
        console.error('Error creating audit record:', error);
        throw error;
    }
}
