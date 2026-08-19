import type { PoMasterSheet } from '@/types';
import type { PcReportSheet, IndentSheet, StoreInSheet, IssueSheet, TallyEntrySheet, PaymentsSheet, PaymentHistory } from '@/types/sheets';

export const calculatePcReportCounts = (
    indentSheet: IndentSheet[],
    storeInSheet: StoreInSheet[],
    issueSheet: IssueSheet[],
    tallyEntrySheet: TallyEntrySheet[],
    paymentsSheet: PaymentsSheet[],
    poMasterSheet: PoMasterSheet[],
    paymentHistorySheet: PaymentHistory[] = []
): PcReportSheet[] => {
    const calculateCounts = (data: any[], pendingFilter: (item: any) => boolean, completeFilter: (item: any) => boolean, stageName: string): PcReportSheet => {
        const firms = ['PMPL', 'PURAB', 'PMMPL', 'REFRASYNTH'];
        const firmData: Record<string, number> = {};

        firms.forEach(firm => {
            firmData[firm] = data.filter(item =>
                (item.firmNameMatch || item.firm_name_match)?.toUpperCase() === firm && pendingFilter(item)
            ).length;
        });

        return {
            stage: stageName,
            totalPending: data.filter(pendingFilter).length,
            totalComplete: data.filter(completeFilter).length,
            pendingPmpl: firmData['PMPL'],
            pendingPurab: firmData['PURAB'],
            pendingPmmpl: firmData['PMMPL'],
            pendingRefrasynth: firmData['REFRASYNTH']
        };
    };

    return [
        calculateCounts(
            issueSheet || [],
            (item) => item.planned1 && !item.actual1,
            (item) => !!item.actual1,
            'Store Issue'
        ),
        calculateCounts(
            indentSheet || [],
            (item) => item.planned1 && !item.actual1,
            (item) => !!item.actual1,
            'Department Indent Approval'
        ),
        calculateCounts(
            indentSheet || [],
            (item) => item.planned2 && !item.actual2,
            (item) => !!item.actual2,
            'Vendor Rate Update'
        ),
        calculateCounts(
            indentSheet || [],
            (item) => item.planned3 && !item.actual3,
            (item) => !!item.actual3,
            'Department Approval'
        ),
        calculateCounts(
            indentSheet || [],
            (item) => item.planned4 && !item.actual4,
            (item) => !!item.actual4,
            'Department Approval'
        ),
        calculateCounts(
            indentSheet || [],
            (item) =>
                item.poRequred &&
                item.poRequred.toString().trim() === 'Yes' &&
                item.pendingPoQty &&
                item.pendingPoQty > 0 &&
                item.approvedVendorName &&
                item.approvedVendorName.toString().trim() !== '',
            (item) => !item.poRequred || item.poRequred !== 'Yes' || (item.pendingPoQty || 0) <= 0,
            'Pending PO'
        ),
        calculateCounts(
            indentSheet || [],
            (item) => (item.liftingStatus === 'Pending' || item.lifting_status === 'Pending') && item.planned5 && !item.actual5,
            (item) => !!item.actual5,
            'Lifting'
        ),
        calculateCounts(
            storeInSheet || [],
            (item) => (item.planned6 || item.planned_6) && !(item.actual6 || item.actual_6),
            (item) => !!(item.actual6 || item.actual_6),
            'Store Check'
        ),
        calculateCounts(
            storeInSheet || [],
            (item) => (item.plannedHod || item.hod_planned) && !(item.actualHod || item.hod_actual),
            (item) => !!(item.actualHod || item.hod_actual),
            'HOD Check'
        ),
        calculateCounts(
            paymentsSheet || [],
            (item) => String(item.status || '').toLowerCase() === 'pending' || !item.status,
            (item) => String(item.status || '').toLowerCase() === 'completed',
            'Make Payment'
        ),
        calculateCounts(
            storeInSheet || [],
            (item) => item.hodStatus === 'Rejected' && !item.hasRejectGrn,
            (item) => !!item.hasRejectGrn,
            'Reject For GRN'
        ),
        calculateCounts(
            storeInSheet || [],
            (item) => !!item.hasRejectGrn && !item.hasDebitNote,
            (item) => !!item.hasDebitNote,
            'Send Debit Note'
        ),
        calculateCounts(
            tallyEntrySheet || [],
            (item) => item.planned1 && !item.actual1,
            (item) => !!item.actual1,
            'Audit Data'
        ),
        calculateCounts(
            storeInSheet || [],
            (item) => !item.hasBillNotReceived && !item.billNo,
            (item) => !!item.hasBillNotReceived,
            'Bill Not Received'
        ),
    ];
};
