import { storeApi } from '../lib/api';

/**
 * GetLift Service
 * Handles all API operations for the GetLift component
 */

// ==================== INTERFACES ====================

export interface GetLiftIndentRecord {
    id: number;
    indentNumber: string;
    firmNameMatch: string;
    approvedVendorName: string;
    poNumber: string;
    poTimestamp: string;
    deliveryDate: string;
    productName: string;
    totalQty: number;
    quantity: number;
    pendingQty: number;
    liftingStatus: string;
    cancelQty: number;
    approvedRate: string;
    taxValue: number;
    withTax: string;
    timestamp: string;
    expectedDate: string;
    department?: string;
    areaOfUse?: string;
    approvedQuantity: number;
    receivedQuantity: number;
    uom: string;
    approvedTransportType: string;
    poCopy?: string;
}

export interface GetLiftStoreInRecord {
    liftNumber: string;
    indentNo: string;
    firmNameMatch: string;
    vendorName: string;
    receivedQuantity: number;
    qty: number;
    photoOfBill: string;
    timestamp: string;
    billNo?: string;
    typeOfBill?: string;
    billAmount?: number;
    transportationInclude?: string;
    transporterName?: string;
    vehicleNo?: string;
    driverName?: string;
    driverMobileNo?: string;
    amount?: number;
    billRemark?: string;
    billStatus?: string;
}

export interface VendorOption {
    vendorName: string;
}

export interface StoreInInsertData {
    timestamp: string;
    liftNumber?: string;
    indentNo: string;
    billNo: string;
    vendorName: string;
    productName: string;
    qty: number;
    leadTimeToLiftMaterial?: number;
    discountAmount: number;
    typeOfBill: string;
    billAmount: number;
    paymentType: string;
    advanceAmountIfAny: number;
    photoOfBill: string;
    transportationInclude: string;
    transporterName: string;
    amount: number;
    billStatus: string;
    quantityAsPerBill: number | string;
    poDate: string;
    poNumber: string;
    vendor: string;
    indentNumber: string;
    product: string;
    quantity: number;
    vehicleNo: string;
    driverName: string;
    driverMobileNo: string;
    billRemark: string;
    firmNameMatch: string;
    rate: string;
    department?: string;
    areaOfUse?: string;
    approvedVendorName?: string;
    liftingStatus?: string;
    notBillReceivedNo?: string;
    receivingStatus?: string;
    location?: string;
    photoOfProduct?: string;
    damageOrder?: string;
    priceAsPerPoCheck?: string;
    remark?: string;
}

// ==================== FETCH FUNCTIONS ====================

/**
 * Fetch all indent records
 * Used for displaying pending and completed lift records
 */
export async function fetchIndentRecords() {
    try {
        const response = await storeApi.get('indent');
        const data = response.data;

        return (data || []).map((r: any) => {
            const poLine = Array.isArray(r.po_lines) && r.po_lines.length > 0 ? r.po_lines[0] : null;
            return {
                id: r.id,
                indentNumber: r.indent_number || '',
                firmNameMatch: r.firm_name_match || r.firm_name || '',
                approvedVendorName: r.management_approval?.approved_vendor_name || r.vendor_quotation?.vendor_name1 || '',
                poNumber: poLine?.po_number || '',
                poTimestamp: poLine?.timestamp || '',
                deliveryDate: poLine?.delivery_date || '',
                productName: r.product_name || '',
                totalQty: Number(r.total_qty) || 0,
                quantity: Number(r.quantity) || 0,
                pendingQty: Number(r.pending_qty) || 0,
                liftingStatus: r.lifting_status || '',
                cancelQty: 0,
                approvedRate: r.management_approval?.approved_rate || '',
                taxValue: 0,
                withTax: 'No',
                department: r.category || '',
                areaOfUse: r.area_of_use || '',
                timestamp: r.timestamp || '',
                expectedDate: r.expected_req_date || '',
                approvedQuantity: Number(r.indent_approval?.approved_quantity) || 0,
                receivedQuantity: Number(r.received_qty) || 0,
                uom: r.uom || '',
                approvedTransportType: '',
                poCopy: poLine?.pdf || '',
            };
        });
    } catch (error) {
        console.error('Error fetching indent records:', error);
        throw error;
    }
}

/**
 * Fetch all lift records
 * Used for calculating received quantities and history
 */
export async function fetchStoreInRecords() {
    try {
        const response = await storeApi.get('lift');
        const data = response.data;

        return (data || []).map((r: any) => ({
            liftNumber: r.lift_number || r.liftNumber || (r.id ? `LIFT-${String(r.id).padStart(4, '0')}` : ''),
            indentNo: r.indent_no || '',
            firmNameMatch: r.firm_name_match || '',
            vendorName: r.vendor_name || '',
            qty: Number(r.qty) || 0,
            receivedQuantity: Number(r.check?.received_quantity) || 0,
            photoOfBill: r.photo_of_bill || '',
            timestamp: r.timestamp || '',
            billNo: r.bill_no || '',
            typeOfBill: r.type_of_bill || '',
            billAmount: Number(r.bill_amount) || 0,
            transportationInclude: r.transportation_include || '',
            transporterName: r.transporter_name || '',
            vehicleNo: r.vehicle_no || '',
            driverName: r.driver_name || '',
            driverMobileNo: r.driver_mobile_no || '',
            amount: Number(r.amount) || 0,
            billRemark: r.check?.bill_remark || '',
            billStatus: r.check?.bill_status || '',
        }));
    } catch (error) {
        console.error('Error fetching store-in records:', error);
        throw error;
    }
}

/**
 * Fetch vendor options from master table
 * Used for populating vendor dropdown
 */
export const fetchVendorOptions = async (): Promise<string[]> => {
    try {
        const response = await storeApi.get('master');
        const data = response.data || [];

        // Filter null/empty, deduplicate, sort alphabetically
        const vendorNames = data
            .filter((item: any) => item.vendor_name != null && String(item.vendor_name).trim().length > 0)
            .map((item: any) => String(item.vendor_name).trim())
            .sort((a: string, b: string) => a.localeCompare(b));

        return [...new Set(vendorNames)] as string[];
    } catch (error) {
        console.error('Error fetching vendors:', error);
        throw error;
    }
};

// ==================== INSERT/UPDATE FUNCTIONS ====================

/**
 * Insert a new lift record. Resolves the indent number to its real numeric id
 * so the lift's indentId FK is populated for real (fixes the pre-Phase-1 gap
 * where cross-model links were only ever done by string-matching).
 */
export async function insertStoreInRecord(storeInData: StoreInInsertData) {
    try {
        let indentId: number | null = null;
        if (storeInData.indentNo) {
            try {
                const indentRes = await storeApi.getOne('indent', storeInData.indentNo);
                indentId = indentRes?.data?.id ?? null;
            } catch (lookupErr) {
                console.warn('Could not resolve indent id for lift record:', lookupErr);
            }
        }

        const mappedData: any = {
            timestamp: storeInData.timestamp ? new Date(storeInData.timestamp).toISOString() : new Date().toISOString(),
            indent_id: indentId,
            indent_no: storeInData.indentNo || '',
            bill_no: storeInData.billNo || '',
            vendor_name: storeInData.vendorName || '',
            product_name: storeInData.productName || '',
            qty: Number(storeInData.qty) || 0,
            lead_time_to_lift_material: Number(storeInData.leadTimeToLiftMaterial) || 0,
            discount_amount: Number(storeInData.discountAmount) || 0,
            type_of_bill: storeInData.typeOfBill || '',
            bill_amount: Number(storeInData.billAmount) || 0,
            payment_type: storeInData.paymentType || '',
            advance_amount_if_any: storeInData.advanceAmountIfAny?.toString() || '0',
            photo_of_bill: storeInData.photoOfBill || '',
            transportation_include: storeInData.transportationInclude || '',
            transporter_name: storeInData.transporterName || '',
            amount: Number(storeInData.amount) || 0,
            po_number: storeInData.poNumber || '',
            vehicle_no: storeInData.vehicleNo || '',
            driver_name: storeInData.driverName || '',
            driver_mobile_no: storeInData.driverMobileNo || '',
            firm_name_match: storeInData.firmNameMatch || '',
        };

        console.log('📤 Inserting lift record:', mappedData);

        const response = await storeApi.post('lift', [mappedData]);
        const data = response.data;

        console.log('✅ Lift record inserted:', data);
        return data;
    } catch (error) {
        console.error('Error inserting store-in record:', error);
        throw error;
    }
}

/**
 * Update cancel quantity for an indent
 */
export async function updateCancelQuantity(indentNumber: string, cancelQty: number) {
    try {
        await storeApi.patch('indent', indentNumber, { cancel_qty: cancelQty });
        return true;
    } catch (error) {
        console.error('Error updating cancel quantity:', error);
        throw error;
    }
}

export async function updateLiftingStatus(indentNumber: string, status: string) {
    try {
        await storeApi.patch('indent', indentNumber, { lifting_status: status });
        return true;
    } catch (error) {
        console.error('Error updating lifting status:', error);
        throw error;
    }
}

// ==================== FILE UPLOAD ====================

/**
 * Upload bill photo/document
 */
export async function uploadBillPhoto(file: File, indentNumber: string): Promise<string> {
    try {
        return await storeApi.upload(file);
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
}
