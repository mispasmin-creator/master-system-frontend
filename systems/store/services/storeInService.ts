
import { storeApi } from '../lib/api';

/**
 * StoreIn Service
 * Handles all API operations for the Lift / Store Check / HOD Approval / Reject-GRN /
 * Debit Note / Bill-Not-Received pages (Phase 1 backend redesign — one table per page,
 * nested under the parent "lift" record).
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
    // Workflow stage planned/actual timestamps
    planned6?: string;
    actual6?: string;
    plannedHod?: string;
    actualHod?: string;
    planned7?: string;
    actual7?: string;
    planned9?: string;
    actual9?: string;
    planned11?: string;
    actual11?: string;
    // Store Check stage
    hasCheck: boolean;
    // Reject For GRN stage
    hasRejectGrn: boolean;
    status: string;
    billCopyAttached: string;
    reason: string;
    sendDebitNote: string;
    // HOD Approval stage
    hasHodApproval: boolean;
    hodStatus: string;
    hodRemark: string;
    paymentTerms: string;
    // Send Debit Note stage
    hasDebitNote: boolean;
    debitNoteCopy: string;
    debitNoteNumber: string;
    statusPurchaser: string;
    billCopy: string;
    returnCopy: string;
    // Bill Not Received stage
    hasBillNotReceived: boolean;
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
 * Fetch all lift records, with each stage's child record nested
 * (check / lift_hod_approval / reject_grn / debit_note / bill_not_received)
 */
export async function fetchStoreInRecords() {
    try {
        const response = await storeApi.get('lift');
        const data = response.data;

        return (data || []).map((r: any) => {
            const check = r.check || null;
            const hod = r.hodApproval || r.hod_approval || null;
            const rejectGrn = r.rejectGrn || r.reject_grn || null;
            const debitNote = r.debitNote || r.debit_note || null;
            const billNotReceived = r.billNotReceived || r.bill_not_received || null;

            return {
                id: r.id || 0,
                liftNumber: r.lift_number || r.liftNumber || (r.id ? `LIFT-${String(r.id).padStart(4, '0')}` : ''),
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
                transportationInclude: hod?.transportation_include || r.transportation_include || '',
                transporterName: hod?.transporter_name || r.transporter_name || '',
                amount: Number(hod?.amount ?? r.amount) || 0,
                receivingStatus: check?.material_status || '',
                receivedQuantity: Number(check?.received_quantity) || 0,
                photoOfProduct: check?.photo_of_product || '',
                damageOrder: check?.damage_order || '',
                quantityAsPerBill: check?.quantity_as_per_bill?.toString() || '',
                remark: check?.remark || '',
                location: check?.location || '',
                poDate: r.po_date || '',
                poNumber: r.po_number || '',
                vendor: r.vendor_name || '',
                indentNumber: r.indent_no || '',
                product: r.product_name || '',
                uom: r.uom || '',
                poCopy: r.po_copy || '',
                billStatus: check?.bill_status || '',
                leadTimeToLiftMaterial: Number(r.lead_time_to_lift_material) || 0,
                discountAmount: Number(r.discount_amount) || 0,
                firmNameMatch: r.firm_name_match || '',
                timestamp: r.timestamp || '',
                billNumber: r.bill_no || '',
                unitOfMeasurement: r.uom || '',
                priceAsPerPo: Number(check?.price_as_per_po) || 0,
                priceAsPerPoCheck: check?.bill_status || '',
                vehicleNo: hod?.vehicle_no || r.vehicle_no || '',
                driverName: hod?.driver_name || r.driver_name || '',
                driverMobileNo: hod?.driver_mobile_no || r.driver_mobile_no || '',
                billRemark: check?.bill_remark || '',
                // Workflow stage timestamps
                planned6: r.timestamp ? new Date(r.timestamp).toISOString() : (r.created_at ? new Date(r.created_at).toISOString() : 'planned'),
                actual6: check ? (check.created_at ? new Date(check.created_at).toISOString() : 'actual') : '',
                plannedHod: check ? (check.created_at ? new Date(check.created_at).toISOString() : 'planned') : '',
                actualHod: hod ? (hod.created_at ? new Date(hod.created_at).toISOString() : 'actual') : '',
                planned11: (r.type_of_bill === 'Not Received' || check?.bill_status === 'Not Received') ? (r.timestamp || 'planned') : '',
                actual11: billNotReceived ? (billNotReceived.created_at ? new Date(billNotReceived.created_at).toISOString() : 'actual') : '',
                planned7: (check?.material_status === 'Not Received' || hod?.hod_status === 'Rejected') ? (hod?.created_at || check?.created_at || 'planned') : '',
                actual7: rejectGrn ? (rejectGrn.created_at ? new Date(rejectGrn.created_at).toISOString() : 'actual') : '',
                planned9: (rejectGrn?.send_debit_note === 'Yes' || rejectGrn?.status === 'Send Debit Note') ? (rejectGrn.created_at || 'planned') : '',
                actual9: debitNote ? (debitNote.created_at ? new Date(debitNote.created_at).toISOString() : 'actual') : '',
                // Store Check
                hasCheck: !!check,
                // Reject For GRN
                hasRejectGrn: !!rejectGrn,
                status: rejectGrn?.status || '',
                billCopyAttached: rejectGrn?.bill_copy_attached || '',
                reason: rejectGrn?.reason || '',
                sendDebitNote: rejectGrn?.send_debit_note || '',
                // HOD Approval
                hasHodApproval: !!hod,
                hodStatus: hod?.hodStatus || hod?.hod_status || (check ? 'Pending' : ''),
                hodRemark: hod?.hodRemark || hod?.hod_remark || '',
                paymentTerms: '',
                // Send Debit Note
                hasDebitNote: !!debitNote,
                debitNoteCopy: debitNote?.debit_note_copy || '',
                debitNoteNumber: debitNote?.debit_note_number || '',
                statusPurchaser: '',
                billCopy: debitNote?.bill_copy || '',
                returnCopy: debitNote?.return_copy || '',
                // Bill Not Received
                hasBillNotReceived: !!billNotReceived,
                billStatusNew: billNotReceived?.bill_status_new || '',
                billImageStatus: billNotReceived?.bill_image_status || '',
                indentQty: Number(r.qty) || 0,
            };
        });
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
 * Store Check page — upserts the lift's StoreCheck child record.
 * (The old "trigger HOD Check stage" side-effect is now implicit: HOD Approval's
 * pending queue is simply "lift has a check but no lift_hod_approval yet".)
 */
export async function updateStoreInReceiving(
    liftNumber: string,
    updateData: {
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
        await storeApi.upsertByParent('check', liftNumber, {
            material_status: updateData.receivingStatus,
            received_quantity: updateData.receivedQuantity,
            photo_of_product: updateData.photoOfProduct,
            damage_order: updateData.damageOrder,
            quantity_as_per_bill: updateData.quantityAsPerBill,
            remark: updateData.remark,
            location: updateData.location,
            bill_status: 'Bill Received',
            bill_no: updateData.billNo,
            bill_remark: updateData.billRemark,
            bill_amount: updateData.billAmount,
            photo_of_bill: updateData.photoOfBill,
        });

        return true;
    } catch (error) {
        console.error('Error updating store-in record:', error);
        throw error;
    }
}

/**
 * HOD Approval page — upserts the lift's StoreLiftHodApproval child record.
 * (The old "trigger Stage 7" side-effect is now implicit: Reject-For-GRN's pending
 * queue is simply "lift was rejected by HOD but has no reject_grn record yet".)
 */
export async function updateStoreInHodApproval(
    idOrLiftNumber: number | string,
    updateData: {
        hodStatus: string;
        hodRemark: string;
        transportationInclude?: string;
        transporterName?: string;
        vehicleNo?: string;
        driverName?: string;
        driverMobileNo?: string;
        amount?: number;
    }
) {
    try {
        await storeApi.upsertByParent('lift_hod_approval', idOrLiftNumber, {
            hod_status: updateData.hodStatus,
            hod_remark: updateData.hodRemark,
            transportation_include: updateData.transportationInclude || '',
            transporter_name: updateData.transporterName || '',
            vehicle_no: updateData.vehicleNo || '',
            driver_name: updateData.driverName || '',
            driver_mobile_no: updateData.driverMobileNo || '',
            amount: Number(updateData.amount) || 0,
        });

        return true;
    } catch (error) {
        console.error('Error updating HOD approval:', error);
        throw error;
    }
}

/**
 * Reject For GRN page — upserts the lift's StoreRejectGrn child record.
 * (The old "always populate planned9" side-effect is now implicit: Send Debit Note's
 * pending queue is simply "reject_grn.send_debit_note === 'Yes' but no debit_note yet".)
 */
export async function updateStoreInQuantityCheck(
    liftNumber: string,
    updateData: {
        status: string;
        billCopyAttached: string;
        sendDebitNote: string;
        reason: string;
    }
) {
    try {
        await storeApi.upsertByParent('reject_grn', liftNumber, {
            status: updateData.status,
            bill_copy_attached: updateData.billCopyAttached,
            send_debit_note: updateData.sendDebitNote,
            reason: updateData.reason,
        });
        return true;
    } catch (error) {
        console.error('Error updating store-in quantity check:', error);
        throw error;
    }
}

/**
 * Send Debit Note page — upserts the lift's StoreDebitNote child record, and (matching
 * the reference app) also pushes completion into the Audit chain's final "Again Audit" stage.
 */
export async function updateStoreInDebitNote(
    liftNumber: string,
    updateData: {
        debitNoteCopy: string;
        debitNoteNumber: string;
    }
) {
    try {
        await storeApi.upsertByParent('debit_note', liftNumber, {
            debit_note_copy: updateData.debitNoteCopy,
            debit_note_number: updateData.debitNoteNumber,
        });

        // Sync with Audit Data's final stage (Again Audit)
        try {
            await storeApi.upsertByParent('again_audit', liftNumber, {
                remarks: `Debit Note: ${updateData.debitNoteNumber}`,
                status: 'Debit Note Sent',
            });
        } catch (tallyErr) {
            console.error('Error syncing debit note to audit data:', tallyErr);
        }

        return true;
    } catch (error) {
        console.error('Error updating store-in debit note:', error);
        throw error;
    }
}

/**
 * Bill Not Received page — upserts the lift's StoreBillNotReceived child record, and
 * also marks the Store Check's bill status as received (billStatus's primary owner).
 */
export async function updateStoreInBillStatus(
    liftNumber: string,
    updateData: {
        billStatusNew: string;
        billImageStatus: string;
    }
) {
    try {
        await storeApi.upsertByParent('bill_not_received', liftNumber, {
            bill_status_new: updateData.billStatusNew,
            bill_image_status: updateData.billImageStatus,
        });
        await storeApi.upsertByParent('check', liftNumber, {
            bill_status: 'Bill Received',
        });
        return true;
    } catch (error) {
        console.error('Error updating store-in bill status:', error);
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
    liftId: number;
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
            total_po_amount: storeInData.bill_amount,
            internal_code: storeInData.indent_number,
            product: storeInData.product_name,
            delivery_date: null,
            payment_terms: storeInData.payment_terms || null,
            number_of_days: 0,
            pdf: billPhotoUrl || storeInData.photo_of_bill || '',
            pay_amount: storeInData.bill_amount,
            file: billPhotoUrl || storeInData.photo_of_bill || '',
            remark: storeInData.remark || `Payment for Store In - Indent ${storeInData.indent_number}`,
            total_paid_amount: 0,
            outstanding_amount: storeInData.bill_amount,
            status: 'Pending',
            lift_id: storeInData.liftId,
            firm_name_match: storeInData.firm_name_match,
        };

        const insertResponse = await storeApi.post('payments', [paymentEntry]);
        return insertResponse.data;
    } catch (error) {
        console.error('Error creating payment entry:', error);
        throw error;
    }
}

/**
 * Create payment entry for freight/transportation when transportation is included
 * (HOD/Transporting Update). Goes straight to Make Payment — status: 'Pending'.
 * Generates the next PAY-XXXX sequence number from the existing payments table.
 */
export async function createTransportPaymentEntry(data: {
    liftId: number;
    indentNumber: string;
    transporterName: string;
    poNumber?: string;
    freightAmount: number;
    productName: string;
    firmNameMatch: string;
    vehicleNo: string;
}) {
    try {
        const nowIso = new Date().toISOString();

        const paymentsResponse = await storeApi.get('payments');
        const allPayments: any[] = paymentsResponse.data || [];

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
            party_name: data.transporterName || 'Freight Transporter',
            po_number: data.poNumber || '',
            total_po_amount: Number(data.freightAmount) || 0,
            internal_code: data.indentNumber,
            product: data.productName,
            payment_terms: 'Freight Payment',
            payment_form: 'freight',
            number_of_days: 0,
            pay_amount: Number(data.freightAmount) || 0,
            remark: `Freight Payment | Transporter: ${data.transporterName} | Vehicle: ${data.vehicleNo}`,
            total_paid_amount: 0,
            outstanding_amount: Number(data.freightAmount) || 0,
            status: 'Pending',
            lift_id: data.liftId,
            firm_name_match: data.firmNameMatch,
        };

        const insertResponse = await storeApi.post('payments', [paymentEntry]);
        return insertResponse.data;
    } catch (error) {
        console.error('Error creating transport payment entry:', error);
        throw error;
    }
}
