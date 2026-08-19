import { storeApi } from '../lib/api';

/**
 * Indent Service
 * Handles all API operations for Indents
 */

// ==================== INTERFACES ====================

export interface IndentApproval {
    approved_quantity: number;
    vendor_type: string;
    created_at: string;
}

export interface VendorQuotation {
    vendor_type: string;
    po_required: string;
    vendor_name1: string;
    rate1: number;
    payment_term1: string;
    vendor_name2: string;
    rate2: number;
    payment_term2: string;
    vendor_name3: string;
    rate3: number;
    payment_term3: string;
    comparison_sheet: string;
    created_at: string;
}

export interface TechnicalApproval {
    vendor1_rank: string;
    vendor2_rank: string;
    vendor3_rank: string;
    created_at: string;
}

export interface ManagementApproval {
    approved_vendor_name: string;
    approved_rate: number;
    approved_payment_term: string;
    approved_date: string;
    created_at: string;
}

export interface IndentRecord {
    id: number;
    indent_number: string;
    indenter_name: string;
    department: string;
    product_name: string;
    quantity: number;
    uom: string;
    attachment: string;
    specifications: string;
    area_of_use: string;
    indent_status: string;
    indent_type: string;
    firm_name_match: string;
    timestamp: string;
    indent_approved_by: string;
    lifting_status?: string;
    pending_qty?: number;
    pending_po_qty?: number;
    total_qty?: number;
    received_qty?: number;
    pending_lift_qty?: number;
    expected_req_date: string;
    group_head: string;
    firm_name: string;
    // Per-page child records (Phase 1 backend redesign — one table per workflow page)
    indent_approval?: IndentApproval | null;
    vendor_quotation?: VendorQuotation | null;
    technical_approval?: TechnicalApproval | null;
    management_approval?: ManagementApproval | null;
}

// ==================== FETCH FUNCTIONS ====================

/**
 * Fetch all indent records, with each stage's child record nested
 * (indent_approval / vendor_quotation / technical_approval / management_approval)
 */
export async function fetchIndentRecords(): Promise<IndentRecord[]> {
    try {
        const response = await storeApi.get('indent');
        const data = response.data;

        return (data || []).map((r: any) => ({
            id: r.id,
            indent_number: r.indent_number || r.indentNumber || '',
            indenter_name: r.indenter_name || r.indenterName || '',
            department: r.department || r.category || '',
            product_name: r.product_name || r.productName || '',
            quantity: Number(r.quantity) || 0,
            uom: r.uom || '',
            attachment: r.attachment || '',
            specifications: r.specifications || '',
            area_of_use: r.area_of_use || r.areaOfUse || '',
            indent_status: r.indent_status || r.indentStatus || '',
            indent_type: r.indent_type || r.indentType || '',
            firm_name_match: r.firm_name_match || r.firmNameMatch || r.firm_name || r.firmName || '',
            timestamp: r.timestamp || '',
            indent_approved_by: r.indent_approved_by || r.indentApprovedBy || '',
            lifting_status: r.lifting_status || r.liftingStatus || '',
            pending_qty: Number(r.pending_qty) || 0,
            pending_po_qty: Number(r.pending_po_qty) || 0,
            total_qty: Number(r.total_qty) || 0,
            received_qty: Number(r.received_qty) || 0,
            pending_lift_qty: Number(r.pending_lift_qty) || 0,
            expected_req_date: r.expected_req_date || '',
            group_head: r.group_head || r.groupHead || r.group_name || '',
            firm_name: r.firm_name || r.firmName || r.firm_name_match || '',
            indent_approval: r.indent_approval
                ? {
                      approved_quantity: Number(r.indent_approval.approved_quantity) || 0,
                      vendor_type: r.indent_approval.vendor_type || '',
                      created_at: r.indent_approval.created_at || '',
                  }
                : null,
            vendor_quotation: r.vendor_quotation
                ? {
                      vendor_type: r.vendor_quotation.vendor_type || '',
                      po_required: r.vendor_quotation.po_required || '',
                      vendor_name1: r.vendor_quotation.vendor_name1 || '',
                      rate1: Number(r.vendor_quotation.rate1) || 0,
                      payment_term1: r.vendor_quotation.payment_term1 || '',
                      vendor_name2: r.vendor_quotation.vendor_name2 || '',
                      rate2: Number(r.vendor_quotation.rate2) || 0,
                      payment_term2: r.vendor_quotation.payment_term2 || '',
                      vendor_name3: r.vendor_quotation.vendor_name3 || '',
                      rate3: Number(r.vendor_quotation.rate3) || 0,
                      payment_term3: r.vendor_quotation.payment_term3 || '',
                      comparison_sheet: r.vendor_quotation.comparison_sheet || '',
                      created_at: r.vendor_quotation.created_at || '',
                  }
                : null,
            technical_approval: r.technical_approval
                ? {
                      vendor1_rank: r.technical_approval.vendor1_rank || '',
                      vendor2_rank: r.technical_approval.vendor2_rank || '',
                      vendor3_rank: r.technical_approval.vendor3_rank || '',
                      created_at: r.technical_approval.created_at || '',
                  }
                : null,
            management_approval: r.management_approval
                ? {
                      approved_vendor_name: r.management_approval.approved_vendor_name || '',
                      approved_rate: Number(r.management_approval.approved_rate) || 0,
                      approved_payment_term: r.management_approval.approved_payment_term || '',
                      approved_date: r.management_approval.approved_date || '',
                      created_at: r.management_approval.created_at || '',
                  }
                : null,
        }));
    } catch (error) {
        console.error('Error fetching indent records:', error);
        throw error;
    }
}

// ==================== UPDATE FUNCTIONS ====================

/**
 * Group Indent Approval — upserts the indent's StoreIndentApproval child record
 */
export async function updateIndentApproval(
    id: number,
    updateData: {
        vendor_type: string;
        approved_quantity: number;
    }
) {
    try {
        await storeApi.upsertByParent('indent_approval', id, {
            vendor_type: updateData.vendor_type,
            approved_quantity: updateData.approved_quantity,
        });
        return true;
    } catch (error) {
        console.error('Error updating indent approval:', error);
        throw error;
    }
}

/**
 * Update indent specifications
 */
export async function updateIndentSpecifications(id: number, specifications: string) {
    try {
        await storeApi.patch('indent', id, { specifications });
        return true;
    } catch (error) {
        console.error('Error updating indent specifications:', error);
        throw error;
    }
}

/**
 * Update indent fields from history edit — uom stays on the indent itself,
 * approved_quantity/vendor_type belong to its StoreIndentApproval child record
 */
export async function updateIndentHistoryFields(
    id: number,
    updateData: {
        approved_quantity?: number;
        uom?: string;
        vendor_type?: string;
    }
) {
    try {
        if (updateData.uom !== undefined) {
            await storeApi.patch('indent', id, { uom: updateData.uom });
        }
        if (updateData.approved_quantity !== undefined || updateData.vendor_type !== undefined) {
            await storeApi.upsertByParent('indent_approval', id, {
                ...(updateData.approved_quantity !== undefined ? { approved_quantity: updateData.approved_quantity } : {}),
                ...(updateData.vendor_type !== undefined ? { vendor_type: updateData.vendor_type } : {}),
            });
        }
        return true;
    } catch (error) {
        console.error('Error updating indent history fields:', error);
        throw error;
    }
}

/**
 * Vendor Rate Update — upserts the indent's StoreVendorQuotation child record
 * (covers both the Regular single-vendor path and the Three-Party triplicate path)
 */
export async function updateVendorQuotation(id: number, updateData: Partial<VendorQuotation>) {
    try {
        await storeApi.upsertByParent('vendor_quotation', id, updateData);
        return true;
    } catch (error) {
        console.error('Error updating vendor quotation:', error);
        throw error;
    }
}

/**
 * Technical Approval — upserts the indent's StoreTechnicalApproval child record (T1/T2/T3 ranking)
 */
export async function updateTechnicalApproval(id: number, updateData: Partial<TechnicalApproval>) {
    try {
        await storeApi.upsertByParent('technical_approval', id, updateData);
        return true;
    } catch (error) {
        console.error('Error updating technical approval:', error);
        throw error;
    }
}

/**
 * Mgmt Approval — upserts the indent's StoreManagementApproval child record (final vendor/rate pick)
 */
export async function updateManagementApproval(id: number, updateData: Partial<ManagementApproval>) {
    try {
        await storeApi.upsertByParent('management_approval', id, updateData);
        return true;
    } catch (error) {
        console.error('Error updating management approval:', error);
        throw error;
    }
}
