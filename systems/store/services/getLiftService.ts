import { storeApi } from '../lib/api';

/**
 * GetLift Service
 * Handles all API operations for the GetLift component
 */

// ==================== INTERFACES ====================

export interface GetLiftIndentRecord {
    indentNumber: string;
    firmNameMatch: string;
    approvedVendorName: string;
    poNumber: string;
    actual4: string;
    deliveryDate: string;
    planned5: string;
    actual5: string;
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

        console.log('fetchIndentRecords', data);
        return (data || []).map((r: any) => ({
            indentNumber: r.indent_number || '',
            firmNameMatch: r.firm_name_match || r.firm_name || '',
            approvedVendorName: r.approved_vendor_name || '',
            poNumber: r.po_number || '',
            actual4: r.actual4 || '',
            deliveryDate: r.delivery_date || '',
            planned5: r.planned5 || '',
            actual5: r.actual5 || '',
            productName: r.product_name || '',
            totalQty: Number(r.total_qty) || 0,
            quantity: Number(r.quantity) || 0,
            pendingQty: Number(r.pending_qty) || 0,
            liftingStatus: r.lifting_status || '',
            cancelQty: Number(r.cancel_qty) || 0,
            approvedRate: r.approved_rate || '',
            taxValue: Number(r.tax_value4) || 0,
            withTax: r.with_tax_or_not4 || 'No',
            department: r.category || '',
            areaOfUse: r.area_of_use || '',
            timestamp: r.timestamp || '',
            expectedDate: r.expected_req_date || '',
            approvedQuantity: Number(r.approved_quantity) || 0,
            receivedQuantity: Number(r.received_quantity) || 0,
            uom: r.uom || '',
            approvedTransportType: (() => {
                if (r.vendor1_rank === 'T1') return r.transport_type1 || '';
                if (r.vendor2_rank === 'T1') return r.transport_type2 || '';
                if (r.vendor3_rank === 'T1') return r.transport_type3 || '';
                return r.transport_type1 || '';
            })(),
            poCopy: r.po_copy || '',
        }));
    } catch (error) {
        console.error('Error fetching indent records:', error);
        throw error;
    }
}

/**
 * Fetch all store-in records
 * Used for calculating received quantities and history
 */
export async function fetchStoreInRecords() {
    try {
        const response = await storeApi.get('store_in');
        const data = response.data;

        return (data || []).map((r: any) => ({
            liftNumber: r.lift_number || '',
            indentNo: r.indent_no || '',
            firmNameMatch: r.firm_name_match || '',
            vendorName: r.vendor_name || '',
            qty: Number(r.qty) || 0,
            receivedQuantity: Number(r.received_quantity) || 0,
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
            billRemark: r.bill_remark || '',
            billStatus: r.bill_status || '',
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
 * Insert a new store-in record
 */
export async function insertStoreInRecord(storeInData: StoreInInsertData) {
    try {
        const mappedData = {
            timestamp: storeInData.timestamp,
            indent_no: storeInData.indentNo,
            bill_no: storeInData.billNo,
            vendor_name: storeInData.vendorName,
            product_name: storeInData.productName,
            qty: storeInData.qty?.toString(),
            lead_time_to_lift_material: storeInData.leadTimeToLiftMaterial?.toString() || '0',
            discount_amount: storeInData.discountAmount?.toString() || '0',
            type_of_bill: storeInData.typeOfBill || '',
            bill_amount: storeInData.billAmount?.toString() || '0',
            payment_type: storeInData.paymentType || '',
            advance_amount_if_any: storeInData.advanceAmountIfAny?.toString() || '0',
            photo_of_bill: storeInData.photoOfBill || '',
            transportation_include: storeInData.transportationInclude || '',
            transporter_name: storeInData.transporterName || '',
            amount: storeInData.amount?.toString() || '0',
            bill_status: storeInData.billStatus || '',
            received_quantity: '0',
            quantity_as_per_bill: storeInData.quantityAsPerBill?.toString() || '0',
            po_number: storeInData.poNumber || '',
            vehicle_no: storeInData.vehicleNo || '',
            driver_name: storeInData.driverName || '',
            driver_mobile_no: storeInData.driverMobileNo || '',
            bill_remark: storeInData.billRemark || '',
            firm_name_match: storeInData.firmNameMatch || '',
            rate: storeInData.rate || '',
            indent_qty: storeInData.quantity?.toString() || '0',
            planned6: storeInData.timestamp,
            actual6: null,
            send_debit_note: '',
            receiving_status: storeInData.receivingStatus || '',
            photo_of_product: storeInData.photoOfProduct || '',
            damage_order: storeInData.damageOrder || '',
            bill_received2: storeInData.priceAsPerPoCheck || '',
            location: storeInData.location || '',
            remark: storeInData.remark || '',
            planned7: null,
            actual7: null,
            status: '',
            reason: '',
            planned9: null,
            actual9: null,
            debit_note_copy: '',
            debit_note_number: '',
            planned11: null,
            actual11: null,
            bill_status_new: '',
            bill_image_status: '',
        };

        console.log('📤 Inserting store-in record:', mappedData);

        const response = await storeApi.post('store_in', [mappedData]);
        const data = response.data;

        console.log('✅ Store-in record inserted:', data);
        return data;
    } catch (error) {
        console.error('Error inserting store-in record:', error);
        throw error;
    }
}

/**
 * Update actual5 timestamp for an indent (Material Receipt Date)
 */
export async function updateActual5Timestamp(indentNumber: string) {
    try {
        const currentDateTime = new Date().toISOString();
        await storeApi.patch('indent', indentNumber, { actual5: currentDateTime });
        console.log(`✅ Updated actual5 for indent ${indentNumber}: ${currentDateTime}`);
        return true;
    } catch (error) {
        console.error('Error updating actual5 timestamp:', error);
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
