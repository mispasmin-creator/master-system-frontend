import { SYSTEM_REGISTRY } from '../../../config/systemRegistry';
import { PURCHASE_CATEGORIES } from './purchase';
import { ORDER_CATEGORIES } from './order';
import { PRODUCTION_CATEGORIES } from './production';
import { STORE_CATEGORIES } from './store';
import { RMSALES_CATEGORIES } from './rmSales';
import { SERVICES_CATEGORIES } from './services';
import { CHECKLIST_CATEGORIES } from './checklist';
import { INVENTORY_CATEGORIES } from './inventory';

export {
  PURCHASE_CATEGORIES,
  ORDER_CATEGORIES,
  PRODUCTION_CATEGORIES,
  STORE_CATEGORIES,
  RMSALES_CATEGORIES,
  SERVICES_CATEGORIES,
  CHECKLIST_CATEGORIES,
  INVENTORY_CATEGORIES,
};

// Generate system items dynamically from SYSTEM_REGISTRY
export const SYSTEM_NAV_ITEMS = Object.entries(SYSTEM_REGISTRY).map(([id, sys]) => ({
  id,
  label: sys.label,
}));

// Systems whose master data renders as CategoryTabSection (a tab strip + single
// "Add Master Entry" button + one table, matching the Add-Firm reference design)
// instead of a stacked list of one Card per category.

export const CATEGORIES_BY_SYSTEM = {
  purchase: PURCHASE_CATEGORIES,
  order: ORDER_CATEGORIES,
  production: PRODUCTION_CATEGORIES,
  store: STORE_CATEGORIES,
  "rm-sales": RMSALES_CATEGORIES,
  services: SERVICES_CATEGORIES,
  checklist: CHECKLIST_CATEGORIES,
};

// Settings sub-sidebar structure
