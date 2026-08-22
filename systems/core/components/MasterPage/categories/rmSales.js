import { Package, Truck, Warehouse } from 'lucide-react';

export const RMSALES_CATEGORIES = [
  {
    id: "party",
    title: "Customers & Parties",
    description: "Manage RM sales customers, buyers, and client parties.",
    icon: Warehouse,
    btnLabel: "Party",
    columnHeader: "Party Name",
    typeValue: "Party",
    filter: (r) => Boolean(r.partyName),
    getName: (r) => r.partyName,
  },
  {
    id: "product",
    title: "Products & Materials",
    description: "Manage raw materials and sellable inventory products.",
    icon: Package,
    btnLabel: "Product",
    columnHeader: "Product Name",
    typeValue: "Product",
    filter: (r) => Boolean(r.productName),
    getName: (r) => r.productName,
  },
  {
    id: "transport",
    title: "Transport Types",
    description: "Manage dispatch logistics methods and delivery freight types.",
    icon: Truck,
    btnLabel: "Transport Type",
    columnHeader: "Transport Type",
    typeValue: "Transport",
    filter: (r) => Boolean(r.transportType),
    getName: (r) => r.transportType,
  },
];

