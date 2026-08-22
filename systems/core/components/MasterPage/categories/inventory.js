import { Package } from 'lucide-react';

export const INVENTORY_CATEGORIES = [
  {
    id: "raw_material",
    title: "Raw Materials",
    description: "Manage raw material items per firm for Inventory.",
    icon: Package,
    btnLabel: "Raw Material",
    columnHeader: "Item Name",
    typeValue: "Raw Material",
    filter: (r) => r.__source === "raw",
    getName: (r) => r.itemName,
  },
  {
    id: "finished_goods",
    title: "Finished Goods",
    description: "Manage finished goods products per firm for Inventory.",
    icon: Package,
    btnLabel: "Finished Good",
    columnHeader: "Product Name",
    typeValue: "Finished Goods",
    filter: (r) => r.__source === "finish",
    getName: (r) => r.productName,
  },
  {
    id: "trading_material",
    title: "Trading Material",
    description: "Manage traded (bought-and-sold) products per firm for Inventory.",
    icon: Package,
    btnLabel: "Trading Material",
    columnHeader: "Product Name",
    typeValue: "Trading Material",
    filter: (r) => r.__source === "trading",
    getName: (r) => r.productName,
  },
];

// Generate system items dynamically from SYSTEM_REGISTRY
