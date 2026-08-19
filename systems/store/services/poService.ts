import { storeApi } from '../lib/api';

/**
 * Fetch all indent data
 * Used for populating PO creation form with indent details
 */
export async function fetchIndents() {
    try {
        const response = await storeApi.get('indent');
        const data = response.data;

        // Fetch po_master to know which indents already have POs generated
        let existingPoCodes = new Set<string>();
        try {
            const poRes = await storeApi.get('po_master');
            const poData = poRes.data || [];
            existingPoCodes = new Set(
                poData
                    .map((p: any) => String(p.internal_code || '').trim())
                    .filter(Boolean)
            );
        } catch (poErr) {
            console.warn('⚠️ Could not fetch po_master for indent PO status check:', poErr);
        }

        return (data || []).map((r: any) => {
            // Priority: pending_po_qty > approved_quantity > quantity
            const rawPending = Number(r.pending_po_qty) || 0;
            const rawApproved = Number(r.indent_approval?.approved_quantity) || 0;
            const rawQuantity = Number(r.quantity) || 0;
            const finalApprovedQty = rawPending > 0 ? rawPending : (rawApproved > 0 ? rawApproved : rawQuantity);

            const approvedVendor = r.management_approval?.approved_vendor_name || r.vendor_quotation?.vendor_name1 || '';
            const approvedRate = Number(r.management_approval?.approved_rate ?? r.vendor_quotation?.rate1 ?? 0);
            const approvedPaymentTerm = r.management_approval?.approved_payment_term || r.vendor_quotation?.payment_term1 || '';

            const indentNo = String(r.indent_number || '').trim();
            const hasPo = Boolean(
                (r.po_lines && r.po_lines.length > 0) ||
                (indentNo && existingPoCodes.has(indentNo)) ||
                r.po_number
            );
            const isApproved = Boolean(
                r.management_approval?.approved_vendor_name ||
                r.vendor_quotation?.po_required === 'Yes'
            );

            let quotationNumber = r.management_approval?.approved_quotation_no ||
                r.management_approval?.approvedQuotationNo || '';
            let quotationDate = r.management_approval?.approved_quotation_date ||
                r.management_approval?.approvedQuotationDate || '';

            if (!quotationNumber && r.vendor_quotation) {
                const vq = r.vendor_quotation;
                if (approvedVendor && vq.vendor_name2 && vq.vendor_name2.trim() === approvedVendor.trim()) {
                    quotationNumber = vq.quotation_no2 || vq.quotationNo2 || '';
                    quotationDate = vq.quotation_date2 || vq.quotationDate2 || '';
                } else if (approvedVendor && vq.vendor_name3 && vq.vendor_name3.trim() === approvedVendor.trim()) {
                    quotationNumber = vq.quotation_no3 || vq.quotationNo3 || '';
                    quotationDate = vq.quotation_date3 || vq.quotationDate3 || '';
                } else {
                    quotationNumber = vq.quotation_no1 || vq.quotationNo1 || '';
                    quotationDate = vq.quotation_date1 || vq.quotationDate1 || '';
                }
            }

            return {
                id: r.id,
                planned4: isApproved ? (r.management_approval?.created_at || r.management_approval?.approved_date || r.timestamp || 'planned') : '',
                actual4: hasPo ? (r.po_lines?.[0]?.timestamp || 'actual') : '',
                approvedVendorName: approvedVendor,
                firmName: r.firm_name || '',
                firmNameMatch: r.firm_name_match || '',
                indentNumber: r.indent_number || '',
                productName: r.product_name || '',
                specifications: r.specifications || '',
                taxValue1: 0,
                taxValue4: 0,
                approvedQuantity: finalApprovedQty,
                pendingPoQty: rawPending,
                uom: r.uom || '',
                approvedRate: approvedRate,
                quotationNumber: quotationNumber || '',
                quotationDate: quotationDate || '',
                approvedPaymentTerm: approvedPaymentTerm,
                approvedAdvancePercent: '',
            };
        });
    } catch (error) {
        console.error('Error fetching indents:', error);
        throw error;
    }
}

/**
 * Update indent records after PO creation
 */
export async function updateIndentsAfterPoCreation(ids: number[], deliveryDate?: string, poNumber?: string, poCopy?: string) {
    try {
        await Promise.all(ids.map(async (id) => {
            const updates: Record<string, any> = {};
            if (poNumber) updates.po_number = poNumber;
            if (deliveryDate) updates.delivery_date = deliveryDate;
            if (poCopy) updates.attachment = poCopy;
            try {
                await storeApi.patch('indent', id, updates);
            } catch (err) {
                console.warn(`Could not update indent ${id} after PO creation:`, err);
            }
        }));
    } catch (error) {
        console.error('Error updating indents after PO creation:', error);
    }
}

/**
 * Fetch all PO Master records
 * Used for generating PO numbers and revising existing POs
 */
export async function fetchPoMaster() {
    try {
        const response = await storeApi.get('po_master');
        const data = response.data;

        return (data || []).map((r: any) => ({
            timestamp: r.timestamp,
            partyName: r.party_name || '',
            poNumber: r.po_number || '',
            internalCode: r.internal_code || '',
            product: r.product || '',
            description: r.description || '',
            quantity: Number(r.quantity) || 0,
            unit: r.unit || '',
            rate: Number(r.rate) || 0,
            gst: Number(r.gst) || 0,
            gstPercent: Number(r.gst) || 0,
            companyEmail: r.company_email || '',
            discount: Number(r.discount) || 0,
            discountPercent: Number(r.discount) || 0,
            amount: Number(r.amount) || 0,
            totalPoAmount: Number(r.total_po_amount) || 0,
            packaging: Number(r.packaging) || 0,
            forwarding: Number(r.forwarding) || 0,
            packagingAndForwarding: Number(r.packaging_and_forwarding) || ((Number(r.packaging) || 0) + (Number(r.forwarding) || 0)),
            pdf: r.pdf || '',
            quotationNumber: r.quotation_number || '',
            quotationDate: r.quotation_date || '',
            enquiryNumber: r.enquiry_number || '',
            enquiryDate: r.enquiry_date || '',
            term1: r.term1 || '',
            term2: r.term2 || '',
            term3: r.term3 || '',
            term4: r.term4 || '',
            term5: r.term5 || '',
            term6: r.term6 || '',
            term7: r.term7 || '',
            term8: r.term8 || '',
            term9: r.term9 || '',
            term10: r.term10 || '',
            deliveryDate: r.delivery_date || '',
            paymentTerms: r.payment_terms || '',
            numberOfDays: Number(r.number_of_days) || 0,
            deliveryDays: Number(r.delivery_days) || 0,
            deliveryType: r.delivery_type || '',
            firmNameMatch: r.firm_name_match || '',
            emailSendStatus: r.email_send_status || '',
            preparedBy: r.prepared_by || '',
            approvedBy: r.approved_by || '',
        }));
    } catch (error) {
        console.error('Error fetching PO master:', error);
        throw error;
    }
}

export interface MasterDetails {
    destinationAddress?: string;
    defaultTerms?: string[];
    vendors?: Array<{
        vendorName?: string;
        address?: string;
        gstin?: string;
        vendorEmail?: string;
        email?: string;
    }>;
    firmCompanyMap?: Record<string, {
        companyName?: string;
        companyAddress?: string;
        destinationAddress?: string;
        companyEmail?: string;
        companyPhone?: string;
        companyGstin?: string;
        companyPan?: string;
    }>;
    companyName?: string;
    paymentTerms?: string[];
    companyPhone?: string;
    companyGstin?: string;
    companyPan?: string;
    companyAddress?: string;
    billingAddress?: string;
}

/**
 * Fetch master data (vendors, company info, terms, etc.)
 * Used for populating vendor details and default terms
 */
export async function fetchMasterData(): Promise<MasterDetails> {
    try {
        const response = await storeApi.get('master');
        const records = response.data;

        if (!records || records.length === 0) {
            return {
                destinationAddress: '',
                defaultTerms: [],
                vendors: [],
                firmCompanyMap: {},
                companyName: '',
                companyPhone: '',
                companyGstin: '',
                companyPan: '',
                companyAddress: '',
                billingAddress: '',
                paymentTerms: [],
            };
        }

        // Aggregate vendors
        const vendors = records
            .filter((r: any) => r.vendor_name)
            .map((r: any) => ({
                vendorName: r.vendor_name,
                gstin: r.vendor_gstin || '',
                address: r.vendor_address || '',
                email: r.vendor_email || '',
            }));

        // Deduplicate vendors by name
        const uniqueVendors = Array.from(new Map<string, any>(vendors.map((v: any) => [v.vendorName, v])).values());

        // Extract payment terms
        const paymentTerms: string[] = Array.from(
            new Set<string>(
                records
                    .map((r: any) => (typeof r.payment_term === 'string' ? r.payment_term.trim() : ''))
                    .filter(Boolean)
            )
        );

        // Extract default terms
        const defaultTerms: string[] = Array.from(
            new Set<string>(
                records
                    .map((r: any) => (typeof r.default_terms === 'string' ? r.default_terms.trim() : ''))
                    .filter(Boolean)
            )
        );

        // Firm to Company Mapping
        const firmCompanyMap: Record<string, any> = {};
        records.forEach((r: any) => {
            if (r.firm_name && r.company_name) {
                firmCompanyMap[r.firm_name] = {
                    companyName: r.company_name,
                    companyAddress: r.company_address || '',
                    destinationAddress: r.destination_address || '',
                    companyEmail: r.company_email || '',
                    companyPhone: r.company_phone || '',
                    companyGstin: r.company_gstin || '',
                    companyPan: r.company_pan || '',
                };
            }
        });

        const firstWithCompany = records.find((r: any) => r.company_name) || {};

        return {
            destinationAddress: firstWithCompany.destination_address || '',
            defaultTerms,
            vendors: uniqueVendors,
            firmCompanyMap,
            companyName: firstWithCompany.company_name || '',
            companyPhone: firstWithCompany.company_phone || '',
            companyGstin: firstWithCompany.company_gstin || '',
            companyPan: firstWithCompany.company_pan || '',
            companyAddress: firstWithCompany.company_address || '',
            billingAddress: firstWithCompany.billing_address || '',
            paymentTerms,
        };
    } catch (error) {
        console.error('Error fetching master data:', error);
        return {
            destinationAddress: '',
            defaultTerms: [],
            vendors: [],
            firmCompanyMap: {},
            companyName: '',
            companyPhone: '',
            companyGstin: '',
            companyPan: '',
            companyAddress: '',
            billingAddress: '',
            paymentTerms: [],
        };
    }
}

function toSafeIsoString(val: any): string | null {
    if (!val) return null;
    if (val instanceof Date) {
        return isNaN(val.getTime()) ? null : val.toISOString();
    }
    if (typeof val === 'string') {
        const trimmed = val.trim();
        if (!trimmed) return null;

        // Try direct Date parse
        const d = new Date(trimmed);
        if (!isNaN(d.getTime())) return d.toISOString();

        // Try "DD-MM-YYYY HH:mm:ss A" or "DD-MM-YYYY"
        const match = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\s*(AM|PM))?)?$/i);
        if (match) {
            const day = parseInt(match[1], 10);
            const month = parseInt(match[2], 10) - 1;
            const year = parseInt(match[3], 10);
            let hour = match[4] ? parseInt(match[4], 10) : 0;
            const min = match[5] ? parseInt(match[5], 10) : 0;
            const sec = match[6] ? parseInt(match[6], 10) : 0;
            const ampm = match[7] ? match[7].toUpperCase() : null;

            if (ampm === 'PM' && hour < 12) hour += 12;
            if (ampm === 'AM' && hour === 12) hour = 0;

            const parsed = new Date(Date.UTC(year, month, day, hour, min, sec));
            if (!isNaN(parsed.getTime())) return parsed.toISOString();
        }
    }
    return null;
}

/**
 * Insert new PO records
 */
export async function insertPoRecords(poRecords: any[]) {
    try {
        const mappedRecords = poRecords.map((record) => ({
            indent_id: record.indentId || undefined,
            party_name: record.partyName || '',
            po_number: record.poNumber || '',
            internal_code: record.internalCode || '',
            product: record.product || '',
            description: record.description || '',
            quantity: Number(record.quantity) || 0,
            unit: record.unit || '',
            rate: Number(record.rate) || 0,
            gst: Number(record.gstPercent ?? record.gst) || 0,
            gst_percent: Number(record.gstPercent ?? record.gst) || 0,
            discount: Number(record.discountPercent ?? record.discount) || 0,
            discount_percent: Number(record.discountPercent ?? record.discount) || 0,
            amount: Number(record.amount) || 0,
            total_po_amount: Number(record.totalPoAmount) || 0,
            pdf: record.pdf || '',
            quotation_number: record.quotationNumber || '',
            quotation_date: toSafeIsoString(record.quotationDate),
            enquiry_number: record.enquiryNumber || '',
            enquiry_date: toSafeIsoString(record.enquiryDate),
            term1: record.term1 || '',
            term2: record.term2 || '',
            term3: record.term3 || '',
            term4: record.term4 || '',
            term5: record.term5 || '',
            term6: record.term6 || '',
            term7: record.term7 || '',
            term8: record.term8 || '',
            term9: record.term9 || '',
            term10: record.term10 || '',
            delivery_date: toSafeIsoString(record.deliveryDate),
            payment_terms: record.paymentTerms || '',
            delivery_days: Number(record.deliveryDays) || 0,
            delivery_type: record.deliveryType || '',
            firm_name_match: record.firmNameMatch || '',
            packaging: Number(record.packaging) || 0,
            forwarding: Number(record.forwarding) || 0,
            packaging_and_forwarding: (Number(record.packaging) || 0) + (Number(record.forwarding) || 0),
        }));

        const response = await storeApi.post('po_master', mappedRecords);
        return response.data;
    } catch (error) {
        console.error('Error inserting PO records:', error);
        throw error;
    }
}

