import { storeApi } from '../lib/api';

/**
 * Master Service
 * Handles fetching global options and master data
 */

export interface MasterData {
    vendors: {
        vendorName: string;
        gstin: string;
        address: string;
        email: string;
        paymentTerm: string;
    }[];
    vendorNames: string[];
    paymentTerms: string[];
    departments: string[];
    groupHeads: Record<string, string[]>;
    groupMasters: string[];
    products: Record<string, string[]>;
    companyName: string;
    companyAddress: string;
    companyGstin: string;
    companyPhone: string;
    billingAddress: string;
    companyPan: string;
    destinationAddress: string;
    defaultTerms: string[];
    uoms: string[];
    firms: string[];
    firmsnames: string[];
    fmsNames: string[];
    locations: string[];
    allGroupHeads: string[];
    areasOfUse: string[];
    firmCompanyMap: Record<string, { companyName: string; companyAddress: string; destinationAddress: string; }>;
}

/**
 * Fetch all master data options for dropdowns
 */
export async function fetchMasterOptions(): Promise<MasterData> {
    try {
        const response = await storeApi.get('master');
        const data = response.data;

        const records = data || [];

        const departments: string[] = Array.from(
            new Set<string>(
                records
                    .map((r: any) => String(r.category || r.department || ''))
                    .filter(Boolean)
            )
        ).sort();

        const uoms: string[] = Array.from(
            new Set<string>(
                records
                    .map((r: any) => String(r.uom || ''))
                    .filter(Boolean)
            )
        ).sort();

        const firms: string[] = Array.from(
            new Set<string>(
                records
                    .map((r: any) => String(r.firm_name || r.firmName || ''))
                    .filter(Boolean)
            )
        ).sort();

        const fmsNames: string[] = Array.from(
            new Set<string>(
                records
                    .map((r: any) => String(r.fms_name || r.fmsName || ''))
                    .filter(Boolean)
            )
        ).sort();

        const paymentTerms: string[] = Array.from(
            new Set<string>(
                records
                    .map((r: any) => String(r.payment_term || r.paymentTerm || ''))
                    .filter(Boolean)
            )
        ).sort();

        const defaultTerms: string[] = Array.from(
            new Set<string>(
                records
                    .map((r: any) => {
                        const term = r.default_terms ?? r.defaultTerms;
                        return typeof term === 'string' ? term.trim() : '';
                    })
                    .filter(Boolean)
            )
        );

        const locations: string[] = Array.from(
            new Set<string>(
                records
                    .map((r: any) => String(r.where || r.location || ''))
                    .filter(Boolean)
            )
        ).sort();

        const allGroupHeads: string[] = Array.from(
            new Set<string>(
                records
                    .map((r: any) => String(r.group_name || r.groupName || ''))
                    .filter(Boolean)
            )
        ).sort();

        const groupMasters: string[] = Array.from(
            new Set<string>(
                records
                    .map((r: any) => String(r.department || r.category || ''))
                    .filter(Boolean)
            )
        ).sort();

        const areasOfUse: string[] = Array.from(
            new Set<string>(
                records
                    .map((r: any) => String(r.area_of_use || r.areaOfUse || ''))
                    .filter(Boolean)
            )
        ).sort();

        // Aggregate vendors
        const vendors = records
            .filter((r: any) => (r.vendor_name || r.vendorName))
            .map((r: any) => ({
                vendorName: String(r.vendor_name || r.vendorName || ''),
                gstin: String(r.vendor_gstin || r.vendorGstin || ''),
                address: String(r.vendor_address || r.vendorAddress || ''),
                email: String(r.vendor_email || r.vendorEmail || ''),
                paymentTerm: String(r.payment_term || r.paymentTerm || ''),
            }));

        // Deduplicate vendors by name
        const uniqueVendors: MasterData['vendors'] = Array.from(new Map(vendors.map((v: any) => [v.vendorName, v])).values());
        const vendorNames: string[] = uniqueVendors.map((v) => v.vendorName);

        // Map group heads to departments and products to group heads
        const groupHeads: Record<string, string[]> = {};
        const products: Record<string, string[]> = {};
        records.forEach((r: any) => {
            const cat = String(r.category || r.department || '');
            const grp = String(r.group_name || r.groupName || '');
            const item = String(r.item_name || r.itemName || '');

            if (cat && grp) {
                if (!groupHeads[cat]) {
                    groupHeads[cat] = [];
                }
                if (!groupHeads[cat].includes(grp)) {
                    groupHeads[cat].push(grp);
                }
            }
            if (grp && item) {
                if (!products[grp]) {
                    products[grp] = [];
                }
                if (!products[grp].includes(item)) {
                    products[grp].push(item);
                }
            }
        });

        // Company info (usually the first record or common values)
        const firstWithCompany = records.find((r: any) => (r.company_name || r.companyName)) || {};

        // Firm to Company Mapping
        const firmCompanyMap: Record<string, { companyName: string; companyAddress: string; destinationAddress: string; }> = {};
        records.forEach((r: any) => {
            const fName = String(r.firm_name || r.firmName || '');
            const cName = String(r.company_name || r.companyName || '');
            if (fName && cName) {
                firmCompanyMap[fName] = {
                    companyName: cName,
                    companyAddress: String(r.company_address || r.companyAddress || ''),
                    destinationAddress: String(r.destination_address || r.destinationAddress || ''),
                };
            }
        });

        return {
            departments,
            groupHeads,
            allGroupHeads,
            areasOfUse,
            groupMasters,
            products,
            uoms,
            firms,
            firmsnames: firms,
            fmsNames,
            paymentTerms,
            locations,
            vendors: uniqueVendors,
            vendorNames,
            companyName: String(firstWithCompany.company_name || firstWithCompany.companyName || ''),
            companyAddress: String(firstWithCompany.company_address || firstWithCompany.companyAddress || ''),
            companyGstin: String(firstWithCompany.company_gstin || firstWithCompany.companyGstin || ''),
            companyPhone: String(firstWithCompany.company_phone || firstWithCompany.companyPhone || ''),
            billingAddress: String(firstWithCompany.billing_address || firstWithCompany.billingAddress || ''),
            companyPan: String(firstWithCompany.company_pan || firstWithCompany.companyPan || ''),
            destinationAddress: String(firstWithCompany.destination_address || firstWithCompany.destinationAddress || ''),
            defaultTerms,
            firmCompanyMap,
        };
    } catch (error) {
        console.error('Error fetching master options:', error);
        return {
            departments: [],
            groupHeads: {},
            allGroupHeads: [],
            areasOfUse: [],
            groupMasters: [],
            products: {},
            uoms: [],
            firms: [],
            firmsnames: [],
            fmsNames: [],
            paymentTerms: [],
            locations: [],
            vendors: [],
            vendorNames: [],
            companyName: '',
            companyAddress: '',
            companyGstin: '',
            companyPhone: '',
            billingAddress: '',
            companyPan: '',
            destinationAddress: '',
            defaultTerms: [],
            firmCompanyMap: {},
        };
    }
}
