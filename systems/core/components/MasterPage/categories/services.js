import { Building2, Sliders, UserCheck } from 'lucide-react';

export const SERVICES_CATEGORIES = [
  {
    id: "department",
    title: "Departments",
    description: "Manage operational service departments.",
    icon: Building2,
    btnLabel: "Department",
    columnHeader: "Department",
    typeValue: "Department",
    filter: (r) => Boolean(r.department),
    getName: (r) => r.department,
  },
  {
    id: "group_head",
    title: "Group Heads",
    description: "Manage group heads and designated department leads.",
    icon: UserCheck,
    btnLabel: "Group Head",
    columnHeader: "Group Head",
    typeValue: "Group Head",
    filter: (r) => Boolean(r.groupHead),
    getName: (r) => r.groupHead,
  },
  {
    id: "fms_name",
    title: "FMS Master",
    description: "Manage FMS process dropdown mappings for Services.",
    icon: Sliders,
    btnLabel: "FMS Name",
    columnHeader: "FMS Name",
    typeValue: "FMS Name",
    filter: (r) => Boolean(r.fmsName),
    getName: (r) => r.fmsName,
  },
];

