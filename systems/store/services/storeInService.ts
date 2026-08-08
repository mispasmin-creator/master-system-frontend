
import { storeApi } from '../lib/api';

/**
 * StoreIn Service
 * Handles all API operations for the StoreIn component
 * Manages receiving items and storing them in inventory
 */

// ==================== INTERFACES ====================

export interface StoreInRecord {
    id: number;
    liftNumber: string;
    indentNo: string;
    billNo: string;
    vendorName: string;
    productName: string;
    qty: number;
    typeOfBill: string;
    billAmount: number;
    paymentType: string;
    advanceAmountIfAny: number;
    photoOfBill: string;
    transportationInclude: string;
    transporterName: string;
    amount: number;
    planned6: string;
    actual6: string;
    receivingStatus: string;
    receivedQuantity: number;
    photoOfProduct: string;
    damageOrder: string;
    quantityAsPerBill: string;
    remark: string;
    location: string;
    poDate: string;
    poNumber: string;
    vendor: string;
    indentNumber: string;
    product: string;
    uom: string;
    poCopy: string;
    billStatus: string;
    leadTimeToLiftMaterial: number;
    discountAmount: number;
    firmNameMatch: string;
    timestamp: string;
    billNumber: string;
    unitOfMeasurement: string;
    priceAsPerPo: number;
    priceAsPerPoCheck: string;
    // Stage 7 fields
    planned7: string;
    actual7: string;
    status: string;
    billCopyAttached: string;
    reason: string;
    sendDebitNote: string;
    // HOD Approval fields
    plannedHod: string;
    actualHod: string;
    hodStatus: string;
    hodRemark: string;
    paymentTerms: string;
    // Stage 8 fields
    planned8: string;
    actual8: string;
    // Stage 9 fields
    planned9: string;
    actual9: string;
    debitNoteCopy: string;
    debitNoteNumber: string;
    statusPurchaser: string;
    billCopy: string;
    returnCopy: string;
    // Stage 10 fields
    planned10: string;
    actual10: string;
    // Stage 11 fields
    planned11: string;
    actual11: string;
    billStatusNew: string;
    billImageStatus: string;
    vehicleNo: string;
    driverName: string;
    driverMobileNo: string;
    billRemark: string;
    indentQty: number;
}

export interface LocationOption {
    location: string;
}

// ==================== FETCH FUNCTIONS ====================

/**
 * Fetch all store-in records
 */
export async function fetchStoreInRecords() {
    try {
        const response = await storeApi.get('store_in');
        const data = response.data;

        return (data || []).map((r: any) => ({
            id: r.id || 0,
            liftNumber: r.lift_number || '',
            indentNo: r.indent_no || '',
            billNo: r.bill_no || '',
            vendorName: r.vendor_name || '',
            productName: r.product_name || '',
            qty: Number(r.qty) || 0,
            typeOfBill: r.type_of_bill || '',
            billAmount: Number(r.bill_amount) || 0,
            paymentType: r.payment_type || '',
            advanceAmountIfAny: Number(r.advance_amount_if_any) || 0,
            photoOfBill: r.photo_of_bill || '',
            transportationInclude: r.transportation_include || '',
            transporterName: r.transporter_name || '',
            amount: Number(r.amount) || 0,
            planned6: r.planned6 || '',
            actual6: r.actual6 || '',
            receivingStatus: r.receiving_status || '',
            receivedQuantity: Number(r.received_quantity) || 0,
            photoOfProduct: r.photo_of_product || '',
            damageOrder: r.damage_order || '',
            quantityAsPerBill: r.quantity_as_per_bill || '',
            remark: r.remark || '',
            location: r.location || '',
            poDate: r.po_date || '',
            poNumber: r.po_number || '',
            vendor: r.vendor || '',
            indentNumber: r.indent_number || '',
            product: r.product || '',
            uom: r.uom || '',
            poCopy: r.po_copy || '',
            billStatus: r.bill_status || '',
            leadTimeToLiftMaterial: Number(r.lead_time_to_lift_material) || 0,
            discountAmount: Number(r.discount_amount) || 0,
            firmNameMatch: r.firm_name_match || '',
            timestamp: r.timestamp || '',
            billNumber: r.bill_number || '',
            unitOfMeasurement: r.unit_of_measurement || '',
            priceAsPerPo: Number(r.rate) || 0,
            priceAsPerPoCheck: r.bill_received2 || '',
            vehicleNo: r.vehicle_no || '',
            driverName: r.driver_name || '',
            driverMobileNo: r.driver_mobile_no || '',
            billRemark: r.bill_remark || '',
            // Stage 7 fields
            planned7: r.planned7 || '',
            actual7: r.actual7 || '',
            status: r.status || '',
            billCopyAttached: r.bill_copy_attached || '',
            reason: r.reason || '',
            sendDebitNote: r.send_debit_note || '',
            // HOD Approval fields
            plannedHod: r.hod_planned || '',
            actualHod: r.hod_actual || '',
            hodStatus: r.hod_status || 'Pending',
            hodRemark: r.hod_remark || '',
            paymentTerms: r.payment_terms || '',
            // Stage 8 fields
            planned8: r.planned8 || '',
            actual8: r.actual8 || '',
            // Stage 9 fields
            planned9: r.planned9 || '',
            actual9: r.actual9 || '',
            debitNoteCopy: r.debit_note_copy || '',
            debitNoteNumber: r.debit_note_number || '',
            statusPurchaser: r.status_purchaser || '',
            billCopy: r.bill_copy || '',
            returnCopy: r.return_copy || '',
            // Stage 10 fields
            planned10: r.planned10 || '',
            actual10: r.actual10 || '',
            // Stage 11 fields
            planned11: r.planned11 || '',
            actual11: r.actual11 || '',
            billStatusNew: r.bill_status_new || '',
            billImageStatus: r.bill_image_status || '',
            indentQty: Number(r.indent_qty) || 0,
        }));
    } catch (error) {
        console.error('Error fetching store-in records:', error);
        throw error;
    }
}

/**
 * Fetch location options from master table
 */
export async function fetchLocationOptions(): Promise<string[]> {
    try {
        const response = await storeApi.get('master');
        const data = response.data;

        const locations = Array.from(new Set(
            (data || [])
                .map((r: any) => r.where)
                .filter(Boolean)
        )).sort() as string[];

        return locations;
    } catch (error) {
        console.error('Error fetching location options:', error);
        return [];
    }
}

// ==================== UPDATE FUNCTIONS ====================

/**
 * Update store-in record with receiving details
 */
export async function updateStoreInReceiving(
    liftNumber: string,
    updateData: {
        actual6: string;
        receivingStatus: string;
        receivedQuantity: number;
        photoOfProduct: string;
        damageOrder: string;
        quantityAsPerBill: string;
        remark: string;
        location: string;
        priceAsPerPoCheck: string;
        billNo: string;
        billRemark: string;
        billAmount: number;
        photoOfBill: string;
    }
) {
    try {
        await storeApi.patch('store_in', liftNumber, {
            actual6: updateData.actual6,
            receiving_status: updateData.receivingStatus,
            received_quantity: updateData.receivedQuantity,
            photo_of_product: updateData.photoOfProduct,
            damage_order: updateData.damageOrder,
            quantity_as_per_bill: updateData.quantityAsPerBill,
            remark: updateData.remark,
            location: updateData.location,
            bill_received2: updateData.priceAsPerPoCheck,
            bill_status: 'Bill Received',
            bill_no: updateData.billNo,
            bill_remark: updateData.billRemark,
            bill_amount: updateData.billAmount,
            photo_of_bill: updateData.photoOfBill,
        });

        // Trigger HOD Check stage always after Store Check (Stage 6)
        console.log('📝 Triggering HOD Check stage...');
        await storeApi.patch('store_in', liftNumber, {
            hod_planned: updateData.actual6,
            hod_status: 'Pending',
        });

        return true;
    } catch (error) {
        console.error('Error updating store-in record:', error);
        throw error;
    }
}

/**
 * Update store-in record for HOD Approval
 */
export async function updateStoreInHodApproval(
    liftNumber: string,
    updateData: {
        actualHod: string;
        hodStatus: string;
        hodRemark: string;
        triggerStage7: boolean;
        transportationInclude?: string;
        transporterName?: string;
        vehicleNo?: string;
        driverName?: string;
        driverMobileNo?: string;
        amount?: number;
    }
) {
    try {
        const updatePayload: Record<string, any> = {
            hod_actual: updateData.actualHod,
            hod_status: updateData.hodStatus,
            hod_remark: updateData.hodRemark,
            transportation_include: updateData.transportationInclude || '',
            transporter_name: updateData.transporterName || '',
            vehicle_no: updateData.vehicleNo || '',
            driver_name: updateData.driverName || '',
            driver_mobile_no: updateData.driverMobileNo || '',
            amount: String(updateData.amount || 0),
        };

        await storeApi.patch('store_in', liftNumber, updatePayload);

        // Trigger Stage 7 if HOD rejects or if HOD approves a record that has faults
        if (updateData.triggerStage7) {
            console.log('⚠️ Triggering Stage 7 (Reject for GRN)...');
            await storeApi.patch('store_in', liftNumber, {
                planned7: updateData.actualHod,
            });
        }

        return true;
    } catch (error) {
        console.error('Error updating HOD approval:', error);
        throw error;
    }
}

/**
 * Update store-in record for Stage 7: Quantity Check In
 */
export async function updateStoreInQuantityCheck(
    liftNumber: string,
    updateData: {
        actual7: string;
        status: string;
        billCopyAttached: string;
        sendDebitNote: string;
        reason: string;
    }
) {
    try {
        const updatePayload: any = {
            actual7: updateData.actual7,
            status: updateData.status,
            bill_copy_attached: updateData.billCopyAttached,
            send_debit_note: updateData.sendDebitNote,
            reason: updateData.reason,
        };

        if (updateData.sendDebitNote === 'Yes') {
            updatePayload.planned9 = updateData.actual7;
        }

        await storeApi.patch('store_in', liftNumber, updatePayload);
        return true;
    } catch (error) {
        console.error('Error updating store-in quantity check:', error);
        throw error;
    }
}

/**
 * Update store-in record for Stage 9: Send Debit Note
 */
export async function updateStoreInDebitNote(
    liftNumber: string,
    updateData: {
        actual9: string;
        debitNoteCopy: string;
        debitNoteNumber: string;
    }
) {
    try {
        await storeApi.patch('store_in', liftNumber, {
            actual9: updateData.actual9,
            debit_note_copy: updateData.debitNoteCopy,
            debit_note_number: updateData.debitNoteNumber,
        });
        return true;
    } catch (error) {
        console.error('Error updating store-in debit note:', error);
        throw error;
    }
}

/**
 * Update store-in record for Stage 10: Exchange Materials
 */
export async function updateStoreInExchange(
    liftNumber: string,
    updateData: {
        actual10: string;
        status: string;
    }
) {
    try {
        await storeApi.patch('store_in', liftNumber, {
            actual10: updateData.actual10,
            status: updateData.status,
        });
        return true;
    } catch (error) {
        console.error('Error updating store-in exchange:', error);
        throw error;
    }
}

/**
 * Update store-in record for Stage 11: Bill Status
 */
export async function updateStoreInBillStatus(
    liftNumber: string,
    updateData: {
        actual11: string;
        billStatusNew: string;
        billImageStatus: string;
    }
) {
    try {
        await storeApi.patch('store_in', liftNumber, {
            actual11: updateData.actual11,
            bill_status: 'Bill Received',
            bill_status_new: updateData.billStatusNew,
            bill_image_status: updateData.billImageStatus,
        });
        return true;
    } catch (error) {
        console.error('Error updating store-in bill status:', error);
        throw error;
    }
}

/**
 * Update store-in record for Stage 8: Return Material To Party
 */
export async function updateStoreInReturnToParty(
    liftNumber: string,
    updateData: {
        actual8: string;
        statusPurchaser: string;
    }
) {
    try {
        await storeApi.patch('store_in', liftNumber, {
            actual8: updateData.actual8,
            status_purchaser: updateData.statusPurchaser,
        });
        return true;
    } catch (error) {
        console.error('Error updating store-in return to party:', error);
        throw error;
    }
}

// ==================== FILE UPLOAD ====================

/**
 * Upload product photo
 */
export async function uploadProductPhoto(file: File, indentNumber: string): Promise<string> {
    try {
        return await storeApi.upload(file);
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
}

/**
 * Upload bill copy
 */
export async function uploadBillCopy(file: File, liftNumber: string): Promise<string> {
    try {
        return await storeApi.upload(file);
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
}

/**
 * Upload debit note copy
 */
export async function uploadDebitNoteCopy(file: File, liftNumber: string): Promise<string> {
    try {
        return await storeApi.upload(file);
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
}

// ==================== PAYMENT ENTRY ====================

/**
 * Create payment entry when transportation is not included.
 * Generates next PAY-XXXX sequence number from existing payments table.
 */
export async function createPaymentEntry(storeInData: {
    indent_number: string;
    vendor_name: string;
    po_number: string;
    bill_amount: number;
    photo_of_bill?: string;
    product_name: string;
    firm_name_match: string;
    payment_form?: string;
    prefix?: string;
    remark?: string;
    payment_terms?: string;
}, billPhotoUrl: string = '') {
    try {
        const nowIso = new Date().toISOString();

        // Fetch all payments to compute next PAY-XXXX sequence number
        const paymentsResponse = await storeApi.get('payments');
        const allPayments: any[] = paymentsResponse.data || [];

        // Client-side equivalent of .like('unique_no','PAY-%').order('unique_no',{asc:false}).limit(1).maybeSingle()
        const payPayments = allPayments
            .filter(p => typeof p.unique_no === 'string' && p.unique_no.startsWith('PAY-'))
            .sort((a, b) => b.unique_no.localeCompare(a.unique_no));
        const latestPayment = payPayments[0] ?? null;

        let uniqueNo = 'PAY-0001';
        if (latestPayment && latestPayment.unique_no) {
            const matches = latestPayment.unique_no.match(/PAY-(\d+)/);
            if (matches && matches[1]) {
                const nextNum = parseInt(matches[1], 10) + 1;
                uniqueNo = `PAY-${nextNum.toString().padStart(4, '0')}`;
            }
        }

        const paymentEntry = {
            timestamp: nowIso,
            unique_no: uniqueNo,
            party_name: storeInData.vendor_name,
            po_number: storeInData.po_number,
            total_po_amount: String(storeInData.bill_amount),
            internal_code: storeInData.indent_number,
            product: storeInData.product_name,
            delivery_date: null,
            payment_terms: storeInData.payment_terms || null,
            number_of_days: '0',
            pdf: billPhotoUrl || storeInData.photo_of_bill || '',
            pay_amount: String(storeInData.bill_amount),
            file: billPhotoUrl || storeInData.photo_of_bill || '',
            remark: storeInData.remark || `Payment for Store In - Indent ${storeInData.indent_number}`,
            total_paid_amount: '0',
            outstanding_amount: String(storeInData.bill_amount),
            status: 'Pending',
            planned: null,
            actual: null,
            status1: 'hod_approval_pending',
            firm_name: storeInData.firm_name_match,
        };

        const insertResponse = await storeApi.post('payments', [paymentEntry]);
        return insertResponse.data;
    } catch (error) {
        console.error('Error creating payment entry:', error);
        throw error;
    }
}
