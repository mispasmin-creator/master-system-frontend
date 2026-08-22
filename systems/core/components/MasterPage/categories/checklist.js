import { UserCheck, Users as UsersIcon } from 'lucide-react';

export const CHECKLIST_CATEGORIES = [
  {
    id: "doer",
    title: "Doers / Assignees",
    description: "Manage doers and assignees responsible for checklist tasks.",
    icon: UsersIcon,
    btnLabel: "Doer",
    columnHeader: "Doer Name",
    typeValue: "Doer",
    filter: (r) => Boolean(r.doerName),
    getName: (r) => r.doerName,
  },
  {
    id: "given_by",
    title: "Assigners (Given By)",
    description: "Manage assigners who delegate and assign checklist tasks.",
    icon: UserCheck,
    btnLabel: "Assigner",
    columnHeader: "Assigner Name",
    typeValue: "Assigner",
    filter: (r) => Boolean(r.givenBy),
    getName: (r) => r.givenBy,
  },
];

// Inventory has its own 3 dedicated tables (InventoryRawMaterial / InventoryFinishGoods /
// InventoryTradingMaterial, one row per firm+item) with full CRUD already built at
// /api/inventory/raw-material, /finished-goods, /trading-material — these categories drive
// both the read (masterRows tagged with __source in fetchMasterData) and the write (see the
// dedicated "inventory" branch in handleMasterSubmit / handleDeleteConfirm, which posts to
// those three endpoints instead of the generic, add-only, raw-material-only /inventory/master
// stub other systems fall back to).
