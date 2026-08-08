import { storeApi } from '../lib/api';
import type { PcReportSheet } from '@/types/sheets';

/**
 * PC Report Service
 * Handles all Supabase operations for the PC Report component.
 */

/**
 * Fetch all PC report records from Supabase
 */
export async function fetchPcReportRecords(): Promise<PcReportSheet[]> {
    try {
        const response = await storeApi.get('pc_report');
        const data = response.data;

        

        // Deduplicate by stage – keep only the most recent record for each stage
        const uniqueStages = new Map<string, any>();
        
        (data || []).forEach((r: any) => {
            if (r.stage && !uniqueStages.has(r.stage)) {
                uniqueStages.set(r.stage, {
                    stage: r.stage || '',
                    totalPending: Number(r.total_pending) || 0,
                    totalComplete: Number(r.total_complete) || 0,
                    pendingPmpl: Number(r.pending_pmpl) || 0,
                    pendingPurab: Number(r.pending_purab) || 0,
                    pendingPmmpl: Number(r.pending_pmmpl) || 0,
                    pendingRefrasynth: Number(r.pending_refrasynth) || 0,
                });
            }
        });

        return Array.from(uniqueStages.values());
    } catch (error) {
        console.error('Error fetching PC report records:', error);
        throw error;
    }
}