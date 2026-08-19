import { storeApi } from '../lib/api';
import type { PaymentsSheet, PaymentHistory } from '@/types/sheets';

/**
 * Payment Service
 * Handles all API operations for Payments and Payment History
 */

/**
 * Fetch all payment records
 */
export async function fetchPayments(): Promise<PaymentsSheet[]> {
    try {
        const response = await storeApi.get('payments');
        const data = response.data || [];

        return data.map((p: any) => ({
            timestamp: p.timestamp || '',
            uniqueNo: p.unique_no || '',
            partyName: p.party_name || '',
            poNumber: p.po_number || '',
            totalPoAmount: Number(p.total_po_amount) || 0,
            internalCode: p.internal_code || '',
            product: p.product || '',
            deliveryDate: p.delivery_date || '',
            paymentTerms: p.payment_terms || '',
            numberOfDays: Number(p.number_of_days) || 0,
            pdf: p.pdf || '',
            payAmount: Number(p.pay_amount) || 0,
            file: p.file || '',
            remark: p.remark || '',
            totalPaidAmount: Number(p.total_paid_amount) || 0,
            outstandingAmount: Number(p.outstanding_amount) || 0,
            status: p.status || '',
            paymentForm: p.payment_form || '',
            paymentDone: p.payment_done || false,
            firmNameMatch: p.firm_name_match || '',
            liftId: p.lift_id || 0,
            poId: p.po_id || 0,
            id: p.id,
        })) as unknown as PaymentsSheet[];
    } catch (error) {
        console.error('Error fetching payments:', error);
        throw error;
    }
}

/**
 * Fetch payment history records from the dedicated payment-history table
 * (StorePaymentHistory — /api/store/payment-history)
 */
export async function fetchPaymentHistory(): Promise<PaymentHistory[]> {
    try {
        const response = await storeApi.get('payment_history');
        const data = response.data || [];

        return data.map((h: any) => ({
            timestamp: h.timestamp || '',
            appaymentNumber: h.ap_payment_number || '',
            status: h.status || '',
            uniquenumber: h.unique_number || '',
            fmsName: h.fms_name || '',
            payTo: h.pay_to || '',
            amountToBepaid: h.amount_to_be_paid ? Number(h.amount_to_be_paid) : 0,
            remarks: h.remarks || '',
            anyAttachments: h.any_attachments || '',
            indent_no: h.indent_no || '',
            po_number: h.po_number || '',
            bill_no: h.bill_no || '',
            vendor_name: h.vendor_name || '',
            product_name: h.product_name || '',
            firmNameMatch: h.fms_name || '',
        })) as unknown as PaymentHistory[];
    } catch (error) {
        console.error('Error fetching payment history:', error);
        throw error;
    }
}
