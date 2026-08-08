/**
 * Firm-based filtering utilities
 * Used to filter data based on user's firm from the shared Login table.
 * Identical to systems/purchase/utils/firmFilter.js — zero system-specific logic.
 */

/**
 * Check if user can view data for a specific firm
 * @param {string|string[]} userFirmName - User's firm(s) from Login table (stored in user.firmName)
 * @param {string} dataFirmName - Firm name in the data record
 * @param {string} [pageName] - Active page name to look up page-specific permissions
 * @param {object} [userPageFirms] - Page-to-firms mapping (stored in user.pageFirms)
 * @returns {boolean} - True if user can view this data
 */
export function canViewFirm(userFirmName, dataFirmName, pageName = null, userPageFirms = null) {
    let activeUserFirm = userFirmName;

    if (pageName && userPageFirms) {
        const pageFirmsList = userPageFirms[pageName];
        if (pageFirmsList) {
            if (Array.isArray(pageFirmsList)) {
                activeUserFirm = pageFirmsList;
            } else if (typeof pageFirmsList === "object" && Array.isArray(pageFirmsList.firms)) {
                activeUserFirm = pageFirmsList.firms;
            }
        }
    }

    if (!activeUserFirm) return true;

    const normalizedUserFirm = Array.isArray(activeUserFirm)
        ? activeUserFirm.map(f => String(f || "").toLowerCase().trim())
        : String(activeUserFirm || "").toLowerCase().trim();

    if (normalizedUserFirm === "all" || (Array.isArray(normalizedUserFirm) && normalizedUserFirm.includes("all"))) {
        return true;
    }

    if (!dataFirmName) {
        return true;
    }

    const normalizedDataFirm = String(dataFirmName || "").toLowerCase().trim();

    if (Array.isArray(normalizedUserFirm)) {
        return normalizedUserFirm.includes(normalizedDataFirm);
    }

    return normalizedUserFirm === normalizedDataFirm;
}

/**
 * Filter array data client-side based on firm
 * @param {Array} data - Array of data objects
 * @param {string|string[]} userFirmName - User's firm name(s)
 * @param {string} firmFieldName - Field name containing firm (default: "Firm Name")
 * @param {string} [pageName] - Active page name to look up page-specific permissions
 * @param {object} [userPageFirms] - Page-to-firms mapping (stored in user.pageFirms)
 * @returns {Array} - Filtered data
 */
export function filterByFirm(data, userFirmName, firmFieldName = "Firm Name", pageName = null, userPageFirms = null) {
    if (!data || !Array.isArray(data)) return [];
    if (!userFirmName && !(pageName && userPageFirms)) return data;

    return data.filter(item => canViewFirm(userFirmName, item[firmFieldName], pageName, userPageFirms));
}
