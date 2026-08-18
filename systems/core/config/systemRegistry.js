/**
 * systemRegistry.js
 *
 * Single source of truth for:
 *   - Every system's human-readable label and its page list
 *   - The master firm list used across all systems
 *
 * HOW TO READ:
 *   Each entry under SYSTEM_REGISTRY uses the same key as the Next.js
 *   basePath (e.g. "purchase" -> /purchase, "rm-sales" -> /rm-sales).
 *
 *   pages[] items each have:
 *     key   - the stepName / page_access token stored in the DB
 *     label - human-readable name shown in the UI
 *     path  - hash-router path segment (informational, not enforced here)
 *     hidden - true if the tab is not shown in the main nav (optional)
 *
 *   Source of truth for each system's pages was cross-checked against:
 *     - The *Tabs array in the corresponding app/<system>/page.tsx
 *     - The ALL_PAGES / PAGE_OPTIONS constants in each system's UserManagement
 *       / Settings component
 *
 * ALL_FIRMS:
 *   Consolidated from every FIRM_OPTIONS array found across systems.
 *   The DB login table only stores "all" for super-admin users,
 *   so this list is the frontend-canonical set.
 *
 * ADDITIVE ONLY:
 *  DO NOT modify any existing component to import from here yet.
 *  Wire up imports only after this file is reviewed and approved.
 */

// ---------------------------------------------------------------------------
// Master Firm List
// ---------------------------------------------------------------------------
export const ALL_FIRMS = [
  "Pmmpl",
  "Purab",
  "Rkl",
  "Refrasynth",
  "Refratech",
  "PMM Logisol",
  "PMM Retail",
  "PMM Infra",
  "PMM Ventures",
];

// ---------------------------------------------------------------------------
// System Registry
// ---------------------------------------------------------------------------
export const SYSTEM_REGISTRY = {

  // PURCHASE
  // Source: app/purchase/page.tsx + systems/purchase/components/ManageUsers.jsx
  purchase: {
    label: "Purchase",
    basePath: "/purchase",
    pages: [
      { key: "Dashboard",            label: "Dashboard",            path: "/dashboard",          hidden: true },
      { key: "Indent",               label: "Indent",               path: "/indent" },
      { key: "HOD Approval",         label: "HOD Approval",         path: "/stock-approval" },
      { key: "Three Party",          label: "Three Party",          path: "/three-party" },
      { key: "Factory App.",         label: "Factory App.",          path: "/factory-approval" },
      { key: "Mgmt App.",            label: "Mgmt App.",             path: "/management-approval" },
      { key: "Make PO",              label: "Make PO",              path: "/make-po" },
      { key: "PO History",           label: "PO History",           path: "/po-history" },
      { key: "Arrange Logistics",    label: "Arrange Logistics",    path: "/arrange-logistics" },
      { key: "Logistics App.",       label: "Logistics App.",       path: "/logistics-approval" },
      { key: "PO Entry",             label: "PO Entry",             path: "/po-entry" },
      { key: "Advance Payement",     label: "Advance Payment",      path: "/advance-payement" },
      { key: "Lift",                 label: "Lift",                 path: "/lift" },
      { key: "Receipt",              label: "Receipt",              path: "/receipt" },
      { key: "Lab",                  label: "Lab",                  path: "/lab" },
      { key: "Lab Report",           label: "Lab Report",           path: "/lab-report" },
      { key: "Bilty",                label: "Bilty",                path: "/bilty" },
      { key: "Mismatch",             label: "Mismatch",             path: "/mismatch" },
      { key: "Purchaser Coord.",     label: "Purchaser Coord.",     path: "/purchaser-coordinate" },
      { key: "Debit Note",           label: "Debit Note",           path: "/debit-note" },
      { key: "Fullkitting",          label: "Fullkitting",          path: "/fullkitting" },
      { key: "Accounts Audit",       label: "Accounts Audit",       path: "/accounts-audit" },
      { key: "Sale Of Raw Material", label: "Sale Of Raw Material", path: "/sale-raw-material",  hidden: true },
      { key: "Purchase Return",      label: "Purchase Return",      path: "/purchase-return",    hidden: true },
      { key: "Rectify Mistake",      label: "Rectify Mistake",      path: "/rectify-mistake",    hidden: true },
      { key: "Final Tally Entry",    label: "Final Tally Entry",    path: "/final-tally-entry",  hidden: true },
      { key: "Rectify Mistake 2",    label: "Rectify Mistake 2",    path: "/rectify-mistake-2",  hidden: true },
      { key: "Take Entry Tally",     label: "Take Entry Tally",     path: "/take-entry-tally",   hidden: true },
      { key: "Again Auditing",       label: "Again Auditing",       path: "/again-auditing",     hidden: true },
      { key: "Tolerance",            label: "Tolerance",            path: "/tolrance",            hidden: true },
      { key: "KYC",                  label: "KYC",                  path: "/kyc",                 hidden: true },
      { key: "Vendor Payment",       label: "Vendor Payment",       path: "/vendor-payment",      hidden: true },
    ],
  },

  // ORDER
  // Source: app/order/page.tsx
  order: {
    label: "Order",
    basePath: "/order",
    pages: [
      { key: "dashboard",           label: "Dashboard",           path: "/dashboard" },
      { key: "New Order",           label: "Order",               path: "/order" },
      { key: "Check PO",            label: "Check PO",            path: "/check-po" },
      { key: "received accounts",   label: "Received Accounts",   path: "/received-accounts" },
      { key: "check delivery",      label: "Check Delivery",      path: "/check-delivery" },
      { key: "arrange logistics",   label: "Arrange Logistics",   path: "/arrange-logistics" },
      { key: "logistics approval",  label: "Logistics App.",      path: "/logistics-approval" },
      { key: "dispatch planning",   label: "Dispatch Planning",   path: "/dispatch-planning" },
      { key: "accounts approval",   label: "Accounts App.",       path: "/accounts-approval" },
      { key: "logistic",            label: "Logistic",            path: "/logistic" },
      { key: "load material",       label: "Load Material",       path: "/load-material" },
      { key: "wetman entry",        label: "Wetman Entry",        path: "/wetman-entry" },
      { key: "invoice",             label: "Invoice",             path: "/invoice" },
      { key: "fullkitting",         label: "Fullkitting",         path: "/fullkitting" },
      { key: "tc",                  label: "TC",                  path: "/tc" },
      { key: "bilty update",        label: "Bilty Update",        path: "/bilty-update" },
      { key: "crm",                 label: "CRM",                 path: "/crm" },
      { key: "make pi",             label: "Make PI",             path: "/make-pi" },
      { key: "received pi payment", label: "Received PI Payment", path: "/received-pi-payment" },
      { key: "retention",           label: "Retention",           path: "/retention" },
      { key: "material return",     label: "Material Return",     path: "/material-return" },
      { key: "management approval", label: "Mgmt Approval",       path: "/mgmt-approval" },
      { key: "debit note",          label: "Debit Note",          path: "/debit-note" },
      { key: "return of material",  label: "Return of Material",  path: "/return-of-material" },
      { key: "admin",               label: "Manage Users",        path: "/manage-users",        hidden: true },
    ],
  },

  // PRODUCTION
  // Source: app/production/page.tsx
  production: {
    label: "Production",
    basePath: "/production",
    pages: [
      { key: "Overview",            label: "Dashboard",            path: "/dashboard" },
      { key: "Orders",              label: "Orders",               path: "/orders" },
      { key: "Full Kitting",        label: "Composition By Lab",   path: "/full-kitting" },
      { key: "PI Approval",         label: "PI Approval",          path: "/pi-approval" },
      { key: "Management App",      label: "Management App",       path: "/management-app" },
      { key: "Sample Test",         label: "Sample Test",          path: "/sample-test" },
      { key: "Job Cards",           label: "Job Cards",            path: "/job-cards" },
      { key: "Production",          label: "Production",           path: "/production-tracking" },
      { key: "Composition QC",      label: "Composition QC",       path: "/composition-qc" },
      { key: "Lab Testing 1",       label: "Lab Testing 1",        path: "/lab-testing1" },
      { key: "Lab Testing 2",       label: "Lab Testing 2",        path: "/lab-testing2" },
      { key: "Costing",             label: "Costing",              path: "/costing" },
      { key: "Tally",               label: "Tally",                path: "/tally" },
      { key: "KYC",                 label: "KYC",                  path: "/kyc" },
      { key: "SF Production",       label: "SF Production",        path: "/sf-production" },
      { key: "SF Job Card",         label: "Job Card Planning",    path: "/sfjob-card" },
      { key: "SF Production Entry", label: "Production Entry",     path: "/sfproduction-entry" },
      { key: "Crushing",            label: "Crushing",             path: "/crushing" },
      { key: "Tally Entry",         label: "Tally Entry",          path: "/tally-entry" },
      { key: "Settings",            label: "Settings",             path: "/settings" },
      { key: "Chemical Test",       label: "Chemical Test",        path: "/chemical-test",       hidden: true },
      { key: "Management",          label: "Management Approval",  path: "/management",          hidden: true },
      { key: "Check",               label: "Check",                path: "/check",               hidden: true },
    ],
  },

  // STORE
  // Source: app/store/page.tsx + systems/store/types/sheets.ts
  store: {
    label: "Store",
    basePath: "/store",
    pages: [
      { key: "dashboard",           label: "Dashboard",                         path: "/" },
      { key: "procurement-tracker", label: "Procurement Tracker",               path: "/procurement-tracker" },
      { key: "store-issue",         label: "Store Issue",                       path: "/store-issue" },
      { key: "issue-data",          label: "Issue Data",                        path: "/Issue-data" },
      { key: "inventory",           label: "Inventory",                         path: "/inventory" },
      { key: "master",              label: "Master",                            path: "/master" },
      { key: "received",            label: "Received",                          path: "/received" },
      { key: "stock",               label: "Stock",                             path: "/stock" },
      { key: "create-indent",       label: "Create Indent",                     path: "/create-indent" },
      { key: "approve-indent",      label: "Group Indent Approval",             path: "/approve-indent" },
      { key: "vendor-rate-update",  label: "Vendor Rate Update",                path: "/vendor-rate-update" },
      { key: "technical-approval",  label: "Technical Approval",                path: "/technical-approval" },
      { key: "management-approval", label: "Mgmt Approval",                     path: "/management-approval" },
      { key: "pending-poss",        label: "Pending PO to be Created",          path: "/pending-poss" },
      { key: "create-po",           label: "Create PO",                         path: "/create-po" },
      { key: "po-history",          label: "PO History",                        path: "/po-history" },
      { key: "get-lift",            label: "Material Receipt / Store In",       path: "/get-lift" },
      { key: "store-in",            label: "HOD Check",                         path: "/store-in" },
      { key: "hod-store-check",     label: "Transporting Update",               path: "/hod-store-check" },
      { key: "full-kitting",        label: "Freight Payment",                   path: "/Full-Kiting" },
      { key: "payment-status",      label: "Process for Payment / Debit Note",  path: "/Payment-Status" },
      { key: "make-payment",        label: "Make Payment",                      path: "/Make-Payment" },
      { key: "quality-check",       label: "Reject For GRN",                    path: "/Quality-Check-In-Received-Item" },
      { key: "send-debit-note",     label: "Send Debit Note",                   path: "/Send-Debit-Note" },
      { key: "audit-data",          label: "Audit Data",                        path: "/audit-data" },
      { key: "bill-not-received",   label: "Bill Not Received",                 path: "/Bill-Not-Received" },
      { key: "administration",      label: "Administration",                    path: "/administration" },
    ],
  },

  // RM SALES
  // Source: app/rm-sales/page.tsx + systems/rm-sales/lib/utils.js +
  //         systems/rm-sales/components/modules/Settings.jsx
  "rm-sales": {
    label: "RM Sales",
    basePath: "/rm-sales",
    pages: [
      { key: "Admin",     label: "Dashboard",       path: "/" },
      { key: "Sales",     label: "Sale Orders",     path: "/sale-orders" },
      { key: "Logistics", label: "Logistics",       path: "/logistics" },
      { key: "Accounts",  label: "Invoices",        path: "/invoices" },
      { key: "settings",  label: "User Management", path: "/settings",  hidden: true },
      { key: "inventory", label: "Inventory",       path: "/inventory", hidden: true },
      { key: "masters",   label: "Masters",          path: "/masters",   hidden: true },
      { key: "tracking",  label: "Tracking",        path: "/tracking",  hidden: true },
      { key: "reports",   label: "Reports",          path: "/reports",   hidden: true },
    ],
  },

  // CHECKLIST
  // Source: app/checklist/page.tsx
  checklist: {
    label: "Checklist",
    basePath: "/checklist",
    pages: [
      { key: "Dashboard",        label: "Dashboard",        path: "/dashboard" },
      { key: "Assign Task",      label: "Assign Task",      path: "/assign-task" },
      { key: "PC Dashboard",     label: "PC Dashboard",     path: "/pc-dashboard" },
      { key: "Delegation",       label: "Delegation",       path: "/delegation" },
      { key: "Verification",     label: "Verification",     path: "/verification" },
      { key: "Companies",        label: "Companies",        path: "/companies" },
      { key: "License",          label: "License",          path: "/license" },
      { key: "Training Video",   label: "Training Video",   path: "/training-video" },
      { key: "Checklist Master", label: "Checklist Master", path: "/checklist-master" },
    ],
  },

  // FREIGHT PAYMENT
  // Source: app/freight-payment/page.tsx +
  //         systems/freight-payment/components/UserManagement.tsx
  "freight-payment": {
    label: "Freight Payment",
    basePath: "/freight-payment",
    pages: [
      { key: "Dashboard",        label: "Dashboard",        path: "/" },
      { key: "Account Checking", label: "Account Checking", path: "/checkkitting" },
      { key: "Account Audit",    label: "Account Audit",    path: "/account-audit" },
      { key: "Posting",          label: "Posting",          path: "/posting" },
      { key: "Freight",          label: "Freight Payments", path: "/freight-release" },
      { key: "Users",            label: "User Management",  path: "/users" },
    ],
  },

  // INVENTORY
  // Source: app/inventory/page.tsx +
  //         systems/inventory/components/modules/Settings.jsx
  inventory: {
    label: "Inventory",
    basePath: "/inventory",
    pages: [
      { key: "Inventory_Dashboard",                      label: "Dashboard",                            path: "/" },
      { key: "Inventory_RawMaterial_Purab",              label: "Purab Raw Material",                   path: "/raw-material" },
      { key: "Inventory_RawMaterial_Pmmpl",              label: "PMMPL Raw Material",                   path: "/raw-material" },
      { key: "Inventory_RawMaterial_Rkl",                label: "RKL Raw Material",                     path: "/raw-material" },
      { key: "Inventory_FinishGood_Purab",               label: "Purab Finished Goods",                 path: "/finished-good" },
      { key: "Inventory_FinishGood_Pmmpl",               label: "PMMPL Finished Goods",                 path: "/finished-good" },
      { key: "Inventory_FinishGood_Rkl",                 label: "RKL Finished Goods",                   path: "/finished-good" },
      { key: "Inventory_TradingMaterial",                label: "Trading Material",                     path: "/trading-material" },
      { key: "Inventory_StockAdjustment_Purab",          label: "Stock Adjustment (Purab)",             path: "/stock-adjustment" },
      { key: "Inventory_StockAdjustment_Pmmpl",          label: "Stock Adjustment (PMMPL)",             path: "/stock-adjustment" },
      { key: "Inventory_StockAdjustment_Rkl",            label: "Stock Adjustment (RKL)",               path: "/stock-adjustment" },
      { key: "Inventory_StockAdjustmentTab_Adjustments", label: "Stock Adjustment - Adjustments Log",   path: "/stock-adjustment" },
      { key: "Inventory_StockAdjustmentTab_OpStock",     label: "Stock Adjustment - Op Stock Setup",    path: "/stock-adjustment" },
      { key: "Inventory_StockAdjustmentTab_Products",    label: "Stock Adjustment - Product Directory", path: "/stock-adjustment" },
      { key: "Inventory_History",                        label: "Daily History Snapshots",              path: "/history" },
      { key: "Inventory_Settings",                       label: "Settings and Page Access",             path: "/settings" },
    ],
  },

  // PAYMENT
  // Source: app/payment/page.tsx +
  //         systems/payment/components/modules/UserManagement.jsx
  payment: {
    label: "Payment",
    basePath: "/payment",
    pages: [
      { key: "Dashboard",        label: "Dashboard",        path: "/" },
      { key: "Payment Creation", label: "Payment Creation", path: "/payment-creation" },
      { key: "Channel Funding",  label: "Channel Funding",  path: "/channel-funding" },
      { key: "Payment Approval", label: "Payment Approval", path: "/payment-approval" },
      { key: "Posting",          label: "Posting",          path: "/posting" },
      { key: "Make Payment",     label: "Make Payment",     path: "/make-payment" },
      { key: "User Management",  label: "User Management",  path: "/user-management" },
    ],
  },

  // REPAIR
  // Source: app/repair/page.tsx +
  //         systems/repair/components/modules/Users.jsx
  repair: {
    label: "Repair",
    basePath: "/repair",
    pages: [
      { key: "Repair_Dashboard",    label: "Dashboard",       path: "/" },
      { key: "Repair_Indent",       label: "Indent",          path: "/indent" },
      { key: "Repair_SentToVendor", label: "Sent to Vendor",  path: "/sent-to-vendor" },
      { key: "Repair_CheckMachine", label: "Check Machine",   path: "/check-machine" },
      { key: "Repair_StoreIn",      label: "Store In",        path: "/store-in" },
      { key: "Repair_MakePayment",  label: "Make Payment",    path: "/make-payment" },
      { key: "Repair_Accounts",     label: "Accounts",        path: "/accounts" },
      { key: "Repair_Users",        label: "User Management", path: "/users" },
    ],
  },

  // SERVICES
  // Source: app/services/page.tsx +
  //         systems/services/components/modules/Users.jsx
  services: {
    label: "Services",
    basePath: "/services",
    pages: [
      { key: "Services_Dashboard", label: "Dashboard",        path: "/" },
      { key: "Services_Offers",    label: "Offers",           path: "/offers" },
      { key: "Services_Services",  label: "Services",         path: "/services" },
      { key: "Services_Bills",     label: "Bills",            path: "/bills" },
      { key: "Services_Tally",     label: "Tally Entry",      path: "/tally" },
      { key: "Services_Utility",   label: "Utility Payments", path: "/utility" },
      { key: "Services_Reports",   label: "Reports",          path: "/reports" },
      { key: "Services_Users",     label: "User Management",  path: "/users" },
    ],
  },
};

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

/**
 * Returns all page keys for a given system (including hidden pages).
 * Useful for seeding page_access dropdowns.
 * @param {string} systemKey  e.g. "purchase", "rm-sales"
 * @returns {string[]}
 */
export function getPageKeys(systemKey) {
  return (SYSTEM_REGISTRY[systemKey]?.pages ?? []).map((p) => p.key);
}

/**
 * Returns only the visible (non-hidden) page objects for a system.
 * @param {string} systemKey
 * @returns {{ key: string, label: string, path: string }[]}
 */
export function getVisiblePages(systemKey) {
  return (SYSTEM_REGISTRY[systemKey]?.pages ?? []).filter((p) => !p.hidden);
}

/**
 * Returns the system entry matching a given basePath (e.g. "/purchase").
 * @param {string} basePath
 * @returns {{ label: string, basePath: string, pages: object[] } | undefined}
 */
export function getSystemByPath(basePath) {
  return Object.values(SYSTEM_REGISTRY).find((s) => s.basePath === basePath);
}

/**
 * Universal parser for a user's page_access field.
 * Handles:
 *  - "all", "super admin", "admin" -> full admin access across all systems
 *  - "viewonly" -> read-only access across all systems
 *  - JSON object (structured permissions: { [pageKey]: { firms, readOnly } })
 *  - JSON array of page keys
 *  - Comma-separated string of page keys
 *
 * @param {string|object|array|null} rawAccess - The raw page_access value from the DB or user object
 * @param {string|null} [userRole] - The user's role if present
 * @returns {{
 *   isAdmin: boolean,
 *   isViewOnly: boolean,
 *   allowedPages: string[],
 *   pageFirmsMap: Record<string, { firms: string[], readOnly: boolean }>,
 *   hasPageAccess: (pageKeyOrLabel: string, firmName?: string) => boolean,
 *   isPageReadOnly: (pageKeyOrLabel: string) => boolean,
 * }}
 */
export function parseUserPermissions(rawAccess, userRole = "") {
  let isAdmin = false;
  let isViewOnly = false;
  const pageFirmsMap = {};
  const allowedPages = [];

  const roleStr = String(userRole || "").trim().toLowerCase();
  if (roleStr === "admin" || roleStr === "super admin") {
    isAdmin = true;
  }

  if (rawAccess != null) {
    if (typeof rawAccess === "string") {
      const trimmed = rawAccess.trim();
      const lower = trimmed.toLowerCase();
      if (lower === "all" || lower === "super admin" || lower === "admin") {
        isAdmin = true;
      } else if (lower === "viewonly") {
        isViewOnly = true;
      } else if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            parsed.forEach((p) => {
              if (typeof p === "string") {
                allowedPages.push(p);
                pageFirmsMap[p] = { firms: [...ALL_FIRMS], readOnly: false };
              }
            });
          } else if (parsed && typeof parsed === "object") {
            Object.entries(parsed).forEach(([key, val]) => {
              let firms = [...ALL_FIRMS];
              let readOnly = false;
              if (Array.isArray(val)) {
                firms = val;
              } else if (val && typeof val === "object") {
                firms = val.firms || [...ALL_FIRMS];
                readOnly = !!val.readOnly;
              }
              allowedPages.push(key);
              pageFirmsMap[key] = { firms, readOnly };
            });
          }
        } catch {
          trimmed.split(",").map((p) => p.trim()).filter(Boolean).forEach((p) => {
            allowedPages.push(p);
            pageFirmsMap[p] = { firms: [...ALL_FIRMS], readOnly: false };
          });
        }
      } else {
        trimmed.split(",").map((p) => p.trim()).filter(Boolean).forEach((p) => {
          allowedPages.push(p);
          pageFirmsMap[p] = { firms: [...ALL_FIRMS], readOnly: false };
        });
      }
    } else if (Array.isArray(rawAccess)) {
      rawAccess.forEach((p) => {
        if (typeof p === "string") {
          allowedPages.push(p);
          pageFirmsMap[p] = { firms: [...ALL_FIRMS], readOnly: false };
        }
      });
    } else if (typeof rawAccess === "object") {
      Object.entries(rawAccess).forEach(([key, val]) => {
        let firms = [...ALL_FIRMS];
        let readOnly = false;
        if (Array.isArray(val)) {
          firms = val;
        } else if (val && typeof val === "object") {
          firms = val.firms || [...ALL_FIRMS];
          readOnly = !!val.readOnly;
        }
        allowedPages.push(key);
        pageFirmsMap[key] = { firms, readOnly };
      });
    }
  }

  const findPageEntry = (pageKeyOrLabel) => {
    if (!pageKeyOrLabel) return null;
    if (pageFirmsMap[pageKeyOrLabel]) return pageFirmsMap[pageKeyOrLabel];
    const target = String(pageKeyOrLabel).toLowerCase().trim();
    const entry = Object.entries(pageFirmsMap).find(
      ([k]) => k.toLowerCase().trim() === target
    );
    return entry ? entry[1] : null;
  };

  const hasPageAccess = (pageKeyOrLabel, firmName = "") => {
    if (isAdmin || isViewOnly) return true;
    const entry = findPageEntry(pageKeyOrLabel);
    if (!entry) {
      const target = String(pageKeyOrLabel).toLowerCase().trim();
      return allowedPages.some((p) => p.toLowerCase().trim() === target);
    }
    if (!firmName || firmName.toLowerCase() === "all") return true;
    const searchFirm = firmName.toLowerCase().trim();
    return (entry.firms || []).some(
      (f) => String(f).toLowerCase().trim() === "all" || String(f).toLowerCase().trim() === searchFirm
    );
  };

  const isPageReadOnly = (pageKeyOrLabel) => {
    if (isViewOnly) return true;
    if (isAdmin) return false;
    const entry = findPageEntry(pageKeyOrLabel);
    return entry ? !!entry.readOnly : false;
  };

  return {
    isAdmin,
    isViewOnly,
    allowedPages,
    pageFirmsMap,
    hasPageAccess,
    isPageReadOnly,
  };
}

/**
 * Builds a structured permissions map across all 11 systems in SYSTEM_REGISTRY and 9 ALL_FIRMS.
 *
 * @param {boolean} isReadOnly
 * @returns {{ generatedPageFirms: Record<string, { firms: string[], readOnly: boolean }>, generatedPermissions: string[] }}
 */
export function buildAllSystemPermissions(isReadOnly = false) {
  const generatedPageFirms = {};
  const generatedPermissions = [];

  Object.entries(SYSTEM_REGISTRY).forEach(([sysKey, sysConfig]) => {
    const visiblePages = getVisiblePages(sysKey);

    visiblePages.forEach((page) => {
      generatedPermissions.push(page.key);

      if (sysKey === "inventory") {
        let assignedFirms = [...ALL_FIRMS];
        if (page.key.endsWith("_Purab")) {
          assignedFirms = ["Purab"];
        } else if (page.key.endsWith("_Pmmpl")) {
          assignedFirms = ["Pmmpl"];
        } else if (page.key.endsWith("_Rkl")) {
          assignedFirms = ["Rkl"];
        }
        generatedPageFirms[page.key] = {
          firms: assignedFirms,
          readOnly: isReadOnly,
        };
      } else {
        generatedPageFirms[page.key] = {
          firms: [...ALL_FIRMS],
          readOnly: isReadOnly,
        };
      }
    });
  });

  return { generatedPageFirms, generatedPermissions };
}
