import { API_URL } from "@/lib/auth";

/**
 * Fetches all Master data from Supabase and returns organized dropdown options.
 * This replaces the previous Google Sheets Master data fetching.
 * 
 * @returns {Promise<Object>} Object containing arrays of dropdown options
 */
const EMPTY_MASTER_DATA = {
    firmNameMapping: {},
    generatedByOptions: [],
    vendorOptions: [],
    materialOptions: [],
    indentTypeOptions: [],
    rateTypeOptions: [],
    areaLiftingOptions: [],
    typeOptions: [],
    transporterOptions: [],
    transporterMasterOptions: [],
    transporterMasterMap: {},
    firmNameOptions: [],
    kycFormTypeOptions: [],
    vendorKycOptions: [],
    productNameOptions: [],
    transporter2Options: [],
    gstNumbers: [],
    bankAccountNumbers: [],
    ifscCodes: [],
    phoneNumbers: [],
    emails: [],
    uomOptions: [],
};

export async function fetchMasterData() {
    try {
        // Master options now come from the backend (pgAdmin) — the wide "Master"
        // supabase table read has moved server-side to
        // GET /api/purchase/master/all-options, which returns this exact shape.
        const res = await fetch(`${API_URL}/purchase/master/all-options`);
        const json = await res.json();
        if (!res.ok || !json.success) {
            throw new Error(json.message || "Failed to fetch Master data");
        }
        return { ...EMPTY_MASTER_DATA, ...(json.data || {}) };
    } catch (error) {
        console.error("Error fetching Master data:", error);
        throw new Error(`Failed to fetch Master data: ${error.message}`);
    }
}

/**
 * Fetches Master data and returns formatted options for Select components
 * @returns {Promise<Object>} Object containing arrays of {value, label} objects
 */
export async function fetchMasterDataForSelects() {
    try {
        const data = await fetchMasterData();

        const formatOptions = (values) => {
            return values.map(value => ({
                value: value,
                label: value
            }));
        };

        return {
            generatedByOptions: formatOptions(data.generatedByOptions),
            vendorOptions: formatOptions(data.vendorOptions),
            materialOptions: formatOptions(data.materialOptions),
            indentTypeOptions: formatOptions(data.indentTypeOptions),
            rateTypeOptions: formatOptions(data.rateTypeOptions),
            areaLiftingOptions: formatOptions(data.areaLiftingOptions),
            typeOptions: formatOptions(data.typeOptions),
            transporterOptions: formatOptions(data.transporterOptions || []),
            transporterMasterOptions: (data.transporterMasterOptions || []).map((item) => ({
                value: item.name,
                label: item.name,
                rateType: item.rateType || '',
                rate: item.rate || '',
                gstNumber: item.gstNumber || '',
                phoneNumber: item.phoneNumber || '',
                email: item.email || '',
                bankAccountNo: item.bankAccountNo || '',
                ifscCode: item.ifscCode || '',
                firmName: item.firmName || '',
            })),
            transporterMasterMap: data.transporterMasterMap || {},
            firmNameOptions: formatOptions(data.firmNameOptions),
            kycFormTypeOptions: formatOptions(data.kycFormTypeOptions),
            vendorKycOptions: formatOptions(data.vendorKycOptions),
            productNameOptions: formatOptions(data.productNameOptions),
            transporter2Options: formatOptions(data.transporter2Options),
            gstNumbers: formatOptions(data.gstNumbers),
            bankAccountNumbers: formatOptions(data.bankAccountNumbers),
            ifscCodes: formatOptions(data.ifscCodes),
            phoneNumbers: formatOptions(data.phoneNumbers),
            emails: formatOptions(data.emails)
        };
    } catch (error) {
        console.error("Error formatting Master data:", error);
        throw error;
    }
}
