import { storeApi } from '../lib/api';
import { API_URL, getToken } from '@/lib/auth';

/**
 * Fullkitting Service
 * Handles all Supabase operations for the Fullkitting component
 */

export interface FullkittingRecord {
    id?: number;
    timestamp: string;
    indentNumber: string;
    vendorName: string;
    productName: string;
    qty: number;
    billNo: string;
    transportingInclude: string;
    transporterName: string;
    amount: number;
    vehicalNo: string;
    driverName: string;
    driverMobileNo: string;
    planned: string;
    actual: string;
    timeDelay: string;
    fmsName: string;
    status: string;
    vehicleNumber: string;
    from: string;
    to: string;
    materialLoadDetails: string;
    biltyNumber: string;
    rateType: string;
    amount1: number;
    biltyImage: string;
    firmNameMatch: string;
}

/**
 * Fetch all fullkitting records
 */
export async function fetchFullkittingRecords(): Promise<FullkittingRecord[]> {
    try {
        const response = await storeApi.get('fullkitting');
        const data = response.data;

        return (data || []).map((r: any) => ({
            id: r.id,
            timestamp: r.timestamp || '',
            indentNumber: r.indent_number || '',
            vendorName: r.vendor_name || '',
            productName: r.product_name || '',
            qty: Number(r.qty) || 0,
            billNo: r.bill_no || '',
            transportingInclude: r.transporting_include || '',
            transporterName: r.transporter_name || '',
            amount: Number(r.amount) || 0,
            vehicalNo: r.vehical_no || '',
            driverName: r.driver_name || '',
            driverMobileNo: r.driver_mobile_no || '',
            planned: r.planned || '',
            actual: r.actual || '',
            timeDelay: r.time_delay || '',
            fmsName: r.fms_name || '',
            status: r.status || '',
            vehicleNumber: r.vehicle_number || '',
            from: r.from || '',
            to: r.to || '',
            materialLoadDetails: r.material_load_details || '',
            biltyNumber: r.bilty_number || '',
            rateType: r.rate_type || '',
            amount1: Number(r.amount1) || 0,
            biltyImage: r.bilty_image || '',
            firmNameMatch: r.firm_name_match || '',
        }));
    } catch (error) {
        console.error('Error fetching fullkitting records:', error);
        throw error;
    }
}

/**
 * Update fullkitting record with form data
 */
export async function updateFullkittingRecord(
    indentNumber: string,
    updateData: {
        actual?: string;
        status?: string;
        vehicleNumber?: string;
        from?: string;
        to?: string;
        materialLoadDetails?: string;
        biltyNumber?: string;
        rateType?: string;
        amount1?: number;
        biltyImage?: string;
    }
) {
    try {
        const mappedData: any = {};

        if (updateData.actual) mappedData.actual = updateData.actual;
        if (updateData.status) mappedData.status = updateData.status;
        if (updateData.vehicleNumber) mappedData.vehicle_no = updateData.vehicleNumber;
        if (updateData.from) mappedData.from = updateData.from;
        if (updateData.to) mappedData.to = updateData.to;
        if (updateData.materialLoadDetails) mappedData.material_load_details = updateData.materialLoadDetails;
        if (updateData.biltyNumber) mappedData.bilty_number = updateData.biltyNumber;
        if (updateData.rateType) mappedData.rate_type = updateData.rateType;
        if (updateData.amount1 !== undefined) mappedData.amount1 = Number(updateData.amount1) || 0;
        if (updateData.biltyImage) mappedData.bilty_image = updateData.biltyImage;

        await storeApi.patch('fullkitting', indentNumber, mappedData);

        return true;
    } catch (error) {
        console.error('Error updating fullkitting record:', error);
        throw error;
    }
}

/**
 * Insert a new fullkitting record (triggered after HOD/Transporting Update approval)
 */
export async function insertFullkittingRecord(data: {
    indentNumber: string;
    vendorName: string;
    productName: string;
    qty: number;
    billNo: string;
    transportingInclude: string;
    transporterName: string;
    amount: number;
    vehicalNo: string;
    driverName: string;
    driverMobileNo: string;
    planned: string;
    firmNameMatch: string;
    timestamp: string;
}): Promise<void> {
    try {
        await storeApi.post('fullkitting', [{
            indent_number: data.indentNumber,
            vendor_name: data.vendorName,
            product_name: data.productName,
            qty: Number(data.qty) || 0,
            bill_no: data.billNo,
            transporting_include: data.transportingInclude,
            transporter_name: data.transporterName,
            amount: Number(data.amount) || 0,
            vehical_no: data.vehicalNo,
            driver_name: data.driverName,
            driver_mobile_no: data.driverMobileNo,
            planned: data.planned,
            firm_name_match: data.firmNameMatch,
            timestamp: data.timestamp,
        }]);
    } catch (error) {
        console.error('Error inserting fullkitting record:', error);
        throw error;
    }
}

/**
 * Upload bilty image
 */
export async function uploadBiltyImage(file: File, indentNumber: string): Promise<string> {
    try {
        return await storeApi.upload(file);
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
}

/**
 * Create a payment entry for freight payment in the payments table
 */
export async function createFreightPaymentEntry(data: {
    indentNumber: string;
    transporterName: string;
    poNumber?: string;
    freightAmount: number;
    biltyImage?: string;
    productName: string;
    firmNameMatch: string;
    biltyNumber: string;
    vehicleNumber: string;
}) {
    try {
        const nowIso = new Date().toISOString();

        // 1. Post to Freight Payment Entry API for the Freight Payment module
        const freightPayload = {
            uniqueNumber: `FRT-${Date.now()}`,
            paymentNumber: `FRT-${Date.now()}`,
            firmName: data.firmNameMatch || 'Refrasynth',
            transporterName: data.transporterName || 'Freight Transporter',
            vehicleNumber: data.vehicleNumber || '',
            biltyNumber: data.biltyNumber || '',
            amount: Number(data.freightAmount) || 0,
            biltyImageUrl: data.biltyImage || '',
            liftId: data.indentNumber || '',
            partyName: data.transporterName || 'Freight Transporter',
            materialLoadDetails: `${data.productName} (${data.poNumber || ''})`,
            fmsName: 'Account Checking',
        };

        try {
            await fetch(`${API_URL}/freightpayment/entry`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${getToken()}`,
                },
                body: JSON.stringify(freightPayload),
            });
        } catch (freightErr) {
            console.error('Error posting to freightpayment entry API:', freightErr);
        }

        // 2. Fetch all payments to find latest PAY-XXXX sequence number
        const response = await storeApi.get('payments');
        const allPayments: any[] = response.data || [];

        // Filter PAY- entries, sort descending, take the first one
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
            delivery_date: null,
            payment_terms: 'Freight Payment',
            payment_form: 'freight',
            number_of_days: 0,
            pdf: data.biltyImage || '',
            pay_amount: Number(data.freightAmount) || 0,
            file: data.biltyImage || '',
            remark: `Freight Payment | Bilty No: ${data.biltyNumber} | Vehicle: ${data.vehicleNumber}`,
            total_paid_amount: 0,
            outstanding_amount: Number(data.freightAmount) || 0,
            status: 'Pending',
            planned: null,
            actual: null,
            status1: 'pending',
            firm_name_match: data.firmNameMatch,
        };

        await storeApi.post('payments', [paymentEntry]);

        return true;
    } catch (error) {
        console.error('Error creating freight payment entry:', error);
        throw error;
    }
}
