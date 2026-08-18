"use client";
import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  User,
  Edit2,
  Trash2,
  Shield,
  Search,
  Key,
  Building2,
  ShieldCheck,
  AlertTriangle,
  Eye,
  ChevronDown,
  ChevronRight,
  Check,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

import { API_URL, getToken } from "@/lib/auth";
import {
  SYSTEM_REGISTRY,
  ALL_FIRMS,
  getVisiblePages,
  getPageKeys,
} from "@/systems/core/config/systemRegistry";

// List of all visible purchase pages/permissions based on systemRegistry
const ALL_PAGES = getVisiblePages("purchase").map((p) => p.key);

const FIRMS = [...ALL_FIRMS, "all"];

const parsePermissions = (pages) => {
  if (!pages) return [];
  if (Array.isArray(pages)) return pages;
  if (pages && typeof pages === "object") return Object.keys(pages);
  if (typeof pages !== "string") return [];

  const trimmed = pages.trim();
  if (trimmed === "") return [];
  if (trimmed.toLowerCase() === "all" || trimmed.toLowerCase() === "admin") return ["admin"];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object") {
      return Object.keys(parsed);
    }
  } catch (e) {
    // Fallback for older CSV-formatted records
    return trimmed.split(",").map((p) => p.trim()).filter(Boolean);
  }
  return [];
};

const parseFirms = (firmName) => {
  if (!firmName) return [];
  if (Array.isArray(firmName)) return firmName;
  if (typeof firmName !== "string") return [];

  const trimmed = firmName.trim();
  if (trimmed === "") return [];
  if (trimmed.toLowerCase() === "all") return ["all"];
  
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    // Fallback for older records or CSV
    if (trimmed.includes(",")) {
      return trimmed.split(",").map((f) => f.trim()).filter(Boolean);
    }
    return [trimmed];
  }
  return [];
};

const syncGlobalFirms = (pageFirmsObj) => {
  const uniqueFirms = new Set();
  Object.values(pageFirmsObj).forEach((val) => {
    const firms = Array.isArray(val) ? val : (val?.firms || []);
    if (Array.isArray(firms)) {
      firms.forEach((f) => uniqueFirms.add(f));
    }
  });
  return Array.from(uniqueFirms);
};

const getPagePermissionsWithFirms = (rawPages) => {
  if (!rawPages) return [];
  
  const processEntry = (page, val) => {
    let firms = [];
    let isReadOnly = false;
    if (Array.isArray(val)) {
      firms = val;
    } else if (val && typeof val === "object") {
      firms = val.firms || [];
      isReadOnly = !!val.readOnly;
    } else {
      firms = parseFirms(val);
    }
    const firmStr = firms.length > 0 ? ` (${firms.join(", ")})` : "";
    const accessStr = isReadOnly ? " [View Only]" : "";
    return `${page}${firmStr}${accessStr}`;
  };

  if (rawPages && typeof rawPages === "object" && !Array.isArray(rawPages)) {
    return Object.entries(rawPages).map(([page, val]) => processEntry(page, val));
  }

  const parsedPermissions = parsePermissions(rawPages);
  
  if (typeof rawPages === "string") {
    try {
      const parsed = JSON.parse(rawPages.trim());
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return Object.entries(parsed).map(([page, val]) => processEntry(page, val));
      }
    } catch (e) {
      // Fallback
    }
  }
  return parsedPermissions;
};


export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageSearch, setPageSearch] = useState("");
  const [expandedSystems, setExpandedSystems] = useState({});

  const toggleSystemExpand = (sysKey) => {
    setExpandedSystems((prev) => ({
      ...prev,
      [sysKey]: !prev[sysKey],
    }));
  };

  // Form State
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    name: "",
    firmName: [],
    permissions: [],
    pageFirms: {},
    isViewOnly: false,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/users/manage`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch users");
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddDialog = () => {
    setEditingUser(null);
    setPageSearch("");
    setFormData({
      username: "",
      password: "",
      confirmPassword: "",
      name: "",
      firmName: [],
      permissions: [],
      pageFirms: {},
      isViewOnly: false,
    });
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (user) => {
    setEditingUser(user);
    setPageSearch("");
    const rawPages = user["Pages"];
    const isLegacyViewOnly = rawPages === "viewonly" ||
      (typeof rawPages === "string" && rawPages.trim().toLowerCase() === "viewonly");
    
    let pageFirms = {};
    let userPermissions = [];

    const expandAll = (firms) => {
      return firms.includes("all") ? ["Pmmpl", "Purab", "Rkl"] : firms;
    };

    if (isLegacyViewOnly) {
      const { generatedPageFirms, generatedPermissions } = buildAllSystemPermissions(true);
      pageFirms = generatedPageFirms;
      userPermissions = generatedPermissions;
    } else if (typeof rawPages === "string" && (rawPages.trim().toLowerCase() === "all" || rawPages.trim().toLowerCase() === "super admin")) {
      const { generatedPageFirms, generatedPermissions } = buildAllSystemPermissions(false);
      pageFirms = generatedPageFirms;
      userPermissions = ["admin", ...generatedPermissions];
    } else if (rawPages) {
      if (Array.isArray(rawPages)) {
        const globalFirms = expandAll(parseFirms(user["Firm Name"]));
        rawPages.forEach((page) => {
          pageFirms[page] = { firms: globalFirms, readOnly: false };
        });
        userPermissions = rawPages;
      } else if (typeof rawPages === "object") {
        pageFirms = {};
        Object.entries(rawPages).forEach(([page, val]) => {
          let firms = [];
          let isReadOnly = false;
          if (Array.isArray(val)) {
            firms = val;
          } else if (val && typeof val === "object") {
            firms = val.firms || [];
            isReadOnly = !!val.readOnly;
          } else {
            firms = parseFirms(val);
          }
          pageFirms[page] = { firms: expandAll(firms), readOnly: isReadOnly };
        });
        userPermissions = Object.keys(rawPages);
      } else if (typeof rawPages === "string") {
        const trimmed = rawPages.trim();
        if (trimmed !== "") {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
              const globalFirms = expandAll(parseFirms(user["Firm Name"]));
              parsed.forEach((page) => {
                pageFirms[page] = { firms: globalFirms, readOnly: false };
              });
              userPermissions = parsed;
            } else if (parsed && typeof parsed === "object") {
              pageFirms = {};
              Object.entries(parsed).forEach(([page, val]) => {
                let firms = [];
                let isReadOnly = false;
                if (Array.isArray(val)) {
                  firms = val;
                } else if (val && typeof val === "object") {
                  firms = val.firms || [];
                  isReadOnly = !!val.readOnly;
                } else {
                  firms = parseFirms(val);
                }
                pageFirms[page] = { firms: expandAll(firms), readOnly: isReadOnly };
              });
              userPermissions = Object.keys(parsed);
            }
          } catch (e) {
            const globalFirms = expandAll(parseFirms(user["Firm Name"]));
            const pagesArray = trimmed.split(",").map((p) => p.trim()).filter(Boolean);
            pagesArray.forEach((page) => {
              pageFirms[page] = { firms: globalFirms, readOnly: false };
            });
            userPermissions = pagesArray;
          }
        }
      }
    }

    const allEntriesReadOnly = Object.values(pageFirms).length > 0 && Object.values(pageFirms).every((v) => v?.readOnly);
    const isMultiSystem = Object.keys(pageFirms).some((k) => !ALL_PAGES.includes(k));

    const isViewOnly = isLegacyViewOnly || (allEntriesReadOnly && (isMultiSystem || Object.keys(pageFirms).length > 10));
    const isAdmin = !isViewOnly && (
      (typeof rawPages === "string" && (rawPages.trim().toLowerCase() === "all" || rawPages.trim().toLowerCase() === "super admin")) ||
      userPermissions.includes("admin") ||
      (isMultiSystem && !allEntriesReadOnly)
    );

    if (isAdmin && !userPermissions.includes("admin")) {
      userPermissions = ["admin", ...userPermissions];
    }

    setFormData({
      username: user["User Name"] || "",
      password: "",
      confirmPassword: "",
      name: user["Name"] || "",
      firmName: (isViewOnly || isAdmin) ? (parseFirms(user["Firm Name"]).length > 0 ? parseFirms(user["Firm Name"]) : [...ALL_FIRMS]) : syncGlobalFirms(pageFirms),
      permissions: userPermissions,
      pageFirms,
      isViewOnly,
    });

    setIsDialogOpen(true);
  };

  /**
   * Helper to build full permissions across all 11 systems in SYSTEM_REGISTRY
   * across all 9 ALL_FIRMS.
   *
   * @param {boolean} isReadOnly - true for View Only, false for Full Admin
   */
  const buildAllSystemPermissions = (isReadOnly = false) => {
    const generatedPageFirms = {};
    const generatedPermissions = [];

    Object.entries(SYSTEM_REGISTRY).forEach(([sysKey, sysConfig]) => {
      const visiblePages = getVisiblePages(sysKey);

      visiblePages.forEach((page) => {
        generatedPermissions.push(page.key);

        if (sysKey === "inventory") {
          // Inventory's granular per-firm key handling:
          // Keys with firm suffixes (e.g., _Purab, _Pmmpl, _Rkl) map to their specific firm.
          // Global/cross-firm keys map to all 9 ALL_FIRMS.
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
  };

  const handleToggleViewOnly = () => {
    setFormData((prev) => {
      const nextViewOnly = !prev.isViewOnly;
      let nextState;
      if (nextViewOnly) {
        const { generatedPageFirms, generatedPermissions } = buildAllSystemPermissions(true);
        nextState = {
          ...prev,
          isViewOnly: true,
          permissions: generatedPermissions,
          pageFirms: generatedPageFirms,
          firmName: [...ALL_FIRMS],
        };
      } else {
        nextState = {
          ...prev,
          isViewOnly: false,
          permissions: [],
          pageFirms: {},
          firmName: [],
        };
      }
      console.log("ManageUsers: Form state after Toggle View Only:", nextState);
      return nextState;
    });
  };

  const handleTogglePermission = (permission) => {
    setFormData((prev) => {
      let nextState;
      if (permission === "admin") {
        const isAdmin = !prev.permissions.includes("admin");
        if (isAdmin) {
          const { generatedPageFirms, generatedPermissions } = buildAllSystemPermissions(false);
          nextState = {
            ...prev,
            isViewOnly: false,
            permissions: ["admin", ...generatedPermissions],
            pageFirms: generatedPageFirms,
            firmName: [...ALL_FIRMS],
          };
        } else {
          nextState = {
            ...prev,
            permissions: [],
            pageFirms: {},
            firmName: [],
          };
        }
        console.log("ManageUsers: Form state after Toggle Admin:", nextState);
        return nextState;
      } else {
        let newPermissions;
        let newPageFirms = { ...prev.pageFirms };
        const filtered = prev.permissions.filter((p) => p !== "admin");
        if (filtered.includes(permission)) {
          newPermissions = filtered.filter((p) => p !== permission);
          delete newPageFirms[permission];
        } else {
          newPermissions = [...filtered, permission];
          newPageFirms[permission] = {
            firms: prev.firmName.length > 0 ? prev.firmName : ["Pmmpl"],
            readOnly: false,
          };
        }
        const newGlobalFirms = syncGlobalFirms(newPageFirms);
        nextState = {
          ...prev,
          permissions: newPermissions,
          pageFirms: newPageFirms,
          firmName: newGlobalFirms,
        };
        console.log(`ManageUsers: Form state after Toggle Permission (${permission}):`, nextState);
        return nextState;
      }
    });
  };

  const handleToggleSystemPage = (sysKey, pageKey) => {
    setFormData((prev) => {
      const updatedPageFirms = { ...prev.pageFirms };
      let updatedPermissions = [...prev.permissions];
      const isCurrentlyChecked = !!updatedPageFirms[pageKey];

      if (isCurrentlyChecked) {
        delete updatedPageFirms[pageKey];
        updatedPermissions = updatedPermissions.filter((p) => p !== pageKey);
      } else {
        let assignedFirms = [...ALL_FIRMS];
        if (sysKey === "inventory") {
          if (pageKey.endsWith("_Purab")) {
            assignedFirms = ["Purab"];
          } else if (pageKey.endsWith("_Pmmpl")) {
            assignedFirms = ["Pmmpl"];
          } else if (pageKey.endsWith("_Rkl")) {
            assignedFirms = ["Rkl"];
          }
        }
        updatedPageFirms[pageKey] = {
          firms: assignedFirms,
          readOnly: !!prev.isViewOnly,
        };
        if (!updatedPermissions.includes(pageKey)) {
          updatedPermissions.push(pageKey);
        }
      }

      return {
        ...prev,
        pageFirms: updatedPageFirms,
        permissions: updatedPermissions,
      };
    });
  };

  const handleToggleAllPagesInSystem = (sysKey, checkAll) => {
    setFormData((prev) => {
      const updatedPageFirms = { ...prev.pageFirms };
      let updatedPermissions = [...prev.permissions];
      const visiblePages = getVisiblePages(sysKey);

      visiblePages.forEach((page) => {
        if (checkAll) {
          let assignedFirms = [...ALL_FIRMS];
          if (sysKey === "inventory") {
            if (page.key.endsWith("_Purab")) {
              assignedFirms = ["Purab"];
            } else if (page.key.endsWith("_Pmmpl")) {
              assignedFirms = ["Pmmpl"];
            } else if (page.key.endsWith("_Rkl")) {
              assignedFirms = ["Rkl"];
            }
          }
          updatedPageFirms[page.key] = {
            firms: assignedFirms,
            readOnly: !!prev.isViewOnly,
          };
          if (!updatedPermissions.includes(page.key)) {
            updatedPermissions.push(page.key);
          }
        } else {
          delete updatedPageFirms[page.key];
          updatedPermissions = updatedPermissions.filter((p) => p !== page.key);
        }
      });

      return {
        ...prev,
        pageFirms: updatedPageFirms,
        permissions: updatedPermissions,
      };
    });
  };

  const handleToggleFirm = (firm) => {
    setFormData((prev) => {
      let newFirms;
      if (firm === "all") {
        newFirms = prev.firmName.includes("all") ? [] : ["all"];
      } else {
        const filtered = prev.firmName.filter((f) => f !== "all");
        if (filtered.includes(firm)) {
          newFirms = filtered.filter((f) => f !== firm);
        } else {
          newFirms = [...filtered, firm];
        }
      }
      return { ...prev, firmName: newFirms };
    });
  };

  const handleTogglePageFirm = (page, firm) => {
    setFormData((prev) => {
      const currentPageObj = prev.pageFirms?.[page] || { firms: [], readOnly: false };
      const currentPageFirms = currentPageObj.firms || [];
      let newPageFirms;
      if (currentPageFirms.includes(firm)) {
        newPageFirms = currentPageFirms.filter((f) => f !== firm);
      } else {
        newPageFirms = [...currentPageFirms, firm];
      }

      const updatedPageFirms = {
        ...prev.pageFirms,
        [page]: {
          firms: newPageFirms,
          readOnly: currentPageObj.readOnly
        },
      };

      if (newPageFirms.length === 0) {
        delete updatedPageFirms[page];
      }

      const newPermissions = Object.keys(updatedPageFirms);
      const newGlobalFirms = syncGlobalFirms(updatedPageFirms);

      return {
        ...prev,
        pageFirms: updatedPageFirms,
        permissions: newPermissions,
        firmName: newGlobalFirms,
      };
    });
  };

  const handleToggleColumnFirm = (firm, checked) => {
    setFormData((prev) => {
      const updatedPageFirms = { ...prev.pageFirms };
      const activePages = ALL_PAGES.filter(p => p.toLowerCase().includes(pageSearch.toLowerCase()));
      
      activePages.forEach((page) => {
        const currentPageObj = updatedPageFirms[page] || { firms: [], readOnly: false };
        const currentPageFirms = currentPageObj.firms || [];
        if (checked) {
          if (!currentPageFirms.includes(firm)) {
            updatedPageFirms[page] = {
              firms: [...currentPageFirms, firm],
              readOnly: currentPageObj.readOnly
            };
          }
        } else {
          updatedPageFirms[page] = {
            firms: currentPageFirms.filter((f) => f !== firm),
            readOnly: currentPageObj.readOnly
          };
        }

        if (updatedPageFirms[page] && updatedPageFirms[page].firms.length === 0) {
          delete updatedPageFirms[page];
        }
      });

      const newPermissions = Object.keys(updatedPageFirms);
      const newGlobalFirms = syncGlobalFirms(updatedPageFirms);

      return {
        ...prev,
        pageFirms: updatedPageFirms,
        permissions: newPermissions,
        firmName: newGlobalFirms,
      };
    });
  };

  const handleToggleRowAll = (page, checked) => {
    setFormData((prev) => {
      const updatedPageFirms = { ...prev.pageFirms };
      if (checked) {
        const currentReadOnly = updatedPageFirms[page]?.readOnly || false;
        updatedPageFirms[page] = {
          firms: ["Pmmpl", "Purab", "Rkl"],
          readOnly: currentReadOnly
        };
      } else {
        delete updatedPageFirms[page];
      }

      const newPermissions = Object.keys(updatedPageFirms);
      const newGlobalFirms = syncGlobalFirms(updatedPageFirms);

      return {
        ...prev,
        pageFirms: updatedPageFirms,
        permissions: newPermissions,
        firmName: newGlobalFirms,
      };
    });
  };

  const handleTogglePageAccessLevel = (page, readOnly) => {
    setFormData((prev) => {
      if (!prev.pageFirms?.[page]) return prev;
      
      const updatedPageFirms = {
        ...prev.pageFirms,
        [page]: {
          ...prev.pageFirms[page],
          readOnly: readOnly
        }
      };
      
      return {
        ...prev,
        pageFirms: updatedPageFirms
      };
    });
  };

  const isFirmCheckedForAllPages = (firm) => {
    const activePages = ALL_PAGES.filter(p => p.toLowerCase().includes(pageSearch.toLowerCase()));
    if (activePages.length === 0) return false;
    return activePages.every((page) => {
      const pageObj = formData.pageFirms?.[page];
      const firms = pageObj ? (Array.isArray(pageObj) ? pageObj : (pageObj.firms || [])) : [];
      return firms.includes(firm);
    });
  };

  const isPageCheckedForAllFirms = (page) => {
    const pageObj = formData.pageFirms?.[page];
    const firms = pageObj ? (Array.isArray(pageObj) ? pageObj : (pageObj.firms || [])) : [];
    return ["Pmmpl", "Purab", "Rkl"].every((f) => firms.includes(f));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username) {
      toast.error("Username is required");
      return;
    }

    // On create a password is mandatory; on edit a blank field keeps the
    // existing password untouched.
    if (!editingUser && !formData.password) {
      toast.error("Password is required");
      return;
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error("Password and Confirm Password do not match");
      return;
    }

    if (!formData.isViewOnly && !formData.permissions.includes("admin") && Object.keys(formData.pageFirms || {}).length === 0) {
      toast.error("Please configure at least one page permission");
      return;
    }

    if ((formData.isViewOnly || formData.permissions.includes("admin")) && Object.keys(formData.pageFirms || {}).length === 0) {
      toast.error("Please select at least one page");
      return;
    }

    setIsSubmitting(true);
    try {
      const isSuperAdminFlag = editingUser && typeof editingUser["Pages"] === "string" && editingUser["Pages"].trim().toLowerCase() === "super admin";
      
      const pagesValue = JSON.stringify(formData.pageFirms || {});
      
      const firmsValue = formData.firmName.includes("all")
        ? "all"
        : formData.firmName;

      const payload = {
        "User Name": formData.username,
        "Firm Name": firmsValue,
        Pages: pagesValue,
        Name: formData.name || null,
      };

      // Only send a password when one was actually typed — the backend hashes
      // it and leaves the stored password alone when the field is omitted.
      if (formData.password) {
        payload.Password = formData.password;
      }


      if (editingUser) {
        const res = await fetch(`${API_URL}/users/manage/${editingUser.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to update user");
        toast.success("User updated successfully");
      } else {
        const res = await fetch(`${API_URL}/users/manage`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to add user");
        toast.success("User added successfully");
      }

      setIsDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Error saving user:", error);
      toast.error(error.message || "Failed to save user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (username) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) return;

    try {
      const target = users.find((u) => u["User Name"] === username);
      if (!target?.id) throw new Error("User not found");
      const res = await fetch(`${API_URL}/users/manage/${target.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete user");
      toast.success("User deleted successfully");
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    }
  };

  const filteredUsers = users.filter((u) => {
    const userName = (u["User Name"] || "").toLowerCase();
    const name = (u["Name"] || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    const parsedFirms = parseFirms(u["Firm Name"]);
    const firmsText = (parsedFirms.includes("all") ? "all firms" : parsedFirms.join(", ")).toLowerCase();
    return userName.includes(query) || name.includes(query) || firmsText.includes(query);
  });

  return (
    <div className="space-y-6">
      <Card className="border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-[#2fa36b]" />
            Manage Users
          </CardTitle>
          <CardDescription>
            Configure system access and firm assignments
          </CardDescription>
          <CardAction>
            <Button
              onClick={handleOpenAddDialog}
              className="bg-[#2fa36b] hover:bg-[#278f5d] dark:bg-[#5ec792] dark:hover:bg-[#4fb984] text-white dark:text-zinc-900 rounded-full px-6"
            >
              Add New User
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-3 bg-zinc-50/50 dark:bg-zinc-900/50 border-y border-zinc-100 dark:border-zinc-800">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-zinc-500" />
              <Input
                placeholder="Search users..."
                className="pl-10 bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 focus:ring-[#2fa36b] focus:border-[#2fa36b]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Badge variant="outline" className="bg-white dark:bg-zinc-900">
              Total: {users.length} Users
            </Badge>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-zinc-800">
                <TableRow>
                  <TableHead className="w-[200px] font-bold">
                    Name
                  </TableHead>
                  <TableHead className="w-[160px] font-bold">
                    User Name
                  </TableHead>
                  <TableHead className="w-[180px] font-bold">
                    Firm Name
                  </TableHead>
                  <TableHead className="font-bold">
                    Access Permissions
                  </TableHead>
                  <TableHead className="w-[150px] text-right font-bold">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="h-4 bg-gray-100 dark:bg-zinc-800 rounded w-24 animate-pulse"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-4 bg-gray-100 dark:bg-zinc-800 rounded w-20 animate-pulse"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-4 bg-gray-100 dark:bg-zinc-800 rounded w-32 animate-pulse"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-4 bg-gray-100 dark:bg-zinc-800 rounded w-full animate-pulse"></div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="h-8 bg-gray-100 dark:bg-zinc-800 rounded w-20 ml-auto animate-pulse"></div>
                        </TableCell>
                      </TableRow>
                    ))
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => {
                    const rawPages = user["Pages"];
                    const isViewOnly = rawPages === "viewonly" ||
                      (typeof rawPages === "string" && rawPages.trim().toLowerCase() === "viewonly");
                    const userPermsArray = isViewOnly ? [] : parsePermissions(rawPages);
                    const isAdmin = !isViewOnly && userPermsArray.includes("admin");
                    const perms = isAdmin ? [] : getPagePermissionsWithFirms(rawPages);

                    return (
                      <TableRow
                        key={user["User Name"]}
                        className="group hover:bg-[#2fa36b]/5 transition-colors"
                      >
                        <TableCell className="font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-[#2fa36b] font-bold">
                              {user["Name"]?.charAt(0).toUpperCase() || user["User Name"]?.charAt(0).toUpperCase()}
                            </div>
                            <div className="font-semibold text-gray-900">{user["Name"] || "—"}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600 font-medium">@{user["User Name"]}</span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none"
                          >
                            <Building2 className="h-3 w-3 mr-1" />
                            {(() => {
                              const parsed = parseFirms(user["Firm Name"]);
                              if (parsed.length === 0) return "N/A";
                              if (parsed.includes("all")) return "All Firms";
                              return parsed.join(", ");
                            })()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            {isViewOnly ? (
                              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none font-bold">
                                <Eye className="h-3 w-3 mr-1" />
                                View Only (All Pages, No Edits)
                              </Badge>
                            ) : isAdmin ? (
                              <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-none font-bold">
                                <ShieldCheck className="h-3 w-3 mr-1" />
                                Administrator (All Access)
                              </Badge>
                            ) : perms.length > 0 ? (
                              perms.map((p, idx) => (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className="text-[11px] font-medium border-[#2fa36b]/20 bg-[#2fa36b]/5 hover:bg-[#2fa36b]/10 text-[#2fa36b]"
                                >
                                  {p}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400 italic">
                                No specialized access
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-500 hover:text-[#2fa36b] hover:bg-[#2fa36b]/10"
                            onClick={() => handleOpenEditDialog(user)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteUser(user["User Name"])}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <Users className="h-12 w-12 text-gray-200 mb-2" />
                        <p>No users found matching your search</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit User Sheet */}
      <Sheet open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <SheetContent className="sm:max-w-3xl w-full p-0 overflow-hidden rounded-xl sm:rounded-2xl border-none shadow-2xl max-h-[90vh] flex flex-col">
          <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
            <SheetHeader className="bg-slate-50 p-6 border-b border-gray-100 shrink-0">
              <SheetTitle className="text-xl font-bold flex items-center gap-2">
                {editingUser ? (
                  <Edit2 className="h-5 w-5 text-[#2fa36b]" />
                ) : (
                  <UserPlus className="h-5 w-5 text-[#2fa36b]" />
                )}
                {editingUser ? "Edit User Access" : "Register New User"}
              </SheetTitle>
              <SheetDescription>
                Configure account credentials and module permissions
              </SheetDescription>
            </SheetHeader>

            <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-5 gap-6 bg-white overflow-y-auto flex-1 min-h-0">
              <div className="space-y-4 md:col-span-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="fullName"
                    className="text-sm font-semibold text-gray-700"
                  >
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="fullName"
                      placeholder="e.g. John Doe"
                      className="pl-10"
                      value={formData.name || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="username"
                    className="text-sm font-semibold text-gray-700"
                  >
                    User Identification (Username) <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="username"
                      placeholder="e.g. john_doe"
                      className="pl-10"
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                    />
                  </div>
                  {editingUser && (
                    <p className="text-[10px] text-gray-400 italic">
                      Changing this updates the user&apos;s login username
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-sm font-semibold text-gray-700"
                  >
                    {editingUser ? "New Password" : "Access Key (Password)"}{" "}
                    {!editingUser && <span className="text-red-500">*</span>}
                  </Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      autoComplete="new-password"
                      placeholder={
                        editingUser
                          ? "Leave blank to keep current password"
                          : "Set a secure password"
                      }
                      className="pl-10"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                    />
                  </div>
                  {editingUser && (
                    <p className="text-[10px] text-gray-400 italic">
                      Passwords are encrypted — the existing one cannot be shown
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-sm font-semibold text-gray-700"
                  >
                    Confirm Password{" "}
                    {!editingUser && <span className="text-red-500">*</span>}
                  </Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Re-enter the password"
                      className="pl-10"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          confirmPassword: e.target.value,
                        })
                      }
                      disabled={!!editingUser && !formData.password}
                    />
                  </div>
                  {formData.confirmPassword &&
                    formData.password !== formData.confirmPassword && (
                      <p className="text-[10px] text-red-500 font-medium">
                        Passwords do not match
                      </p>
                    )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center justify-between">
                    Assigned Firms <span className="text-red-500">*</span>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold">
                      {formData.firmName.includes("all") ? "All Firms" : `${formData.firmName.length} Selected`}
                    </Badge>
                  </Label>
                  
                  <div className="border border-gray-100 rounded-xl p-3 bg-slate-50/30 space-y-2">
                    {!(formData.isViewOnly || formData.permissions.includes("admin")) ? (
                      <div className="p-2 text-xs text-slate-500 bg-slate-100/50 rounded-lg border border-dashed border-slate-200">
                        <p className="font-semibold text-slate-600">Dynamic Firm Assignment</p>
                        <p className="mt-1 text-[11px]">Firms are automatically derived from the page permissions grid below:</p>
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {formData.firmName.length > 0 ? (
                            formData.firmName.map(f => (
                              <Badge key={f} variant="secondary" className="bg-[#2fa36b]/10 text-[#2fa36b] border-none text-[10px]">
                                {f}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-[10px] italic text-slate-400">No firms assigned yet (select in grid below)</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center space-x-3 p-2 bg-blue-50 rounded-lg border border-blue-100 group cursor-pointer">
                          <Checkbox
                            id="firm-all"
                            checked={formData.firmName.includes("all")}
                            onCheckedChange={() => handleToggleFirm("all")}
                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          />
                          <Label htmlFor="firm-all" className="text-sm font-bold text-blue-900 cursor-pointer flex items-center flex-1">
                            <Building2 className="h-3 w-3 mr-1.5" /> All Firms Access
                          </Label>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {ALL_FIRMS.map((firm) => (
                            <div key={firm} className="flex items-center space-x-2 p-1.5 hover:bg-white rounded-md transition-colors border border-transparent hover:border-gray-50 group">
                              <Checkbox
                                id={`firm-${firm}`}
                                checked={formData.firmName.includes(firm) || formData.firmName.includes("all")}
                                onCheckedChange={() => handleToggleFirm(firm)}
                                disabled={formData.firmName.includes("all")}
                                className="data-[state=checked]:bg-[#2fa36b] data-[state=checked]:border-[#2fa36b]"
                              />
                              <Label
                                htmlFor={`firm-${firm}`}
                                className={`text-xs cursor-pointer flex-1 ${formData.firmName.includes("all") ? "text-gray-400" : "text-gray-700"}`}
                              >
                                {firm}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                  <div className="flex gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-amber-900">
                        Security Note
                      </p>
                      <p className="text-[10px] text-amber-800 leading-relaxed mt-1">
                        Permissions are assigned immediately. Users will need to
                        refresh their browser to see module changes.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 md:col-span-3">
                <Label className="text-sm font-semibold text-gray-700 flex items-center justify-between">
                  Module Permissions
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase font-bold"
                  >
                    {`${Object.keys(formData.pageFirms || {}).length} Selected`}
                  </Badge>
                </Label>

                <div className="border border-gray-100 rounded-xl p-4 bg-slate-50/30">
                  {/* View Only Access */}
                  <div className="flex items-center space-x-3 p-2 bg-blue-50 rounded-lg border border-blue-100 mb-2 group cursor-pointer">
                    <Checkbox
                      id="viewonly"
                      checked={formData.isViewOnly}
                      onCheckedChange={handleToggleViewOnly}
                      className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                    <div className="flex-1">
                      <Label htmlFor="viewonly" className="text-sm font-bold text-blue-900 cursor-pointer flex items-center">
                        <Eye className="h-3 w-3 mr-1.5" /> View Only Access
                      </Label>
                      <p className="text-[10px] text-blue-700 font-medium">
                        Can see all pages but cannot make any changes
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-2 bg-purple-50 rounded-lg border border-purple-100 mb-3 group cursor-pointer">
                    <Checkbox
                      id="admin"
                      checked={formData.permissions.includes("admin")}
                      onCheckedChange={() => handleTogglePermission("admin")}
                      disabled={formData.isViewOnly}
                      className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor="admin"
                        className="text-sm font-bold text-purple-900 cursor-pointer flex items-center"
                      >
                        <Shield className="h-3 w-3 mr-1.5" /> Full Admin Access
                      </Label>
                      <p className="text-[10px] text-purple-700 font-medium">
                        Overwrites all specific module selections
                      </p>
                    </div>
                  </div>

                  {!(formData.isViewOnly || formData.permissions.includes("admin")) && (
                    <div className="mb-2">
                      <Input
                        placeholder="Search pages..."
                        value={pageSearch}
                        onChange={(e) => setPageSearch(e.target.value)}
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                  )}

                  <div className="h-[280px] overflow-y-auto overflow-x-auto border border-gray-100 rounded-lg bg-white relative custom-scrollbar">
                    {formData.isViewOnly || formData.permissions.includes("admin") ? (
                      <div className="p-3 space-y-2">
                        <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                          <span className="font-semibold">
                            {formData.isViewOnly
                              ? "View Only Mode: Read-only access to all systems across all 9 firms"
                              : "Full Admin Mode: Full access to all systems across all 9 firms"}
                          </span>
                          <Badge variant="outline" className="text-[10px] bg-white font-mono text-slate-600">
                            All 9 Firms Included
                          </Badge>
                        </div>

                        <div className="space-y-1.5">
                          {Object.entries(SYSTEM_REGISTRY).map(([sysKey, sysConfig]) => {
                            const isExpanded = !!expandedSystems[sysKey];
                            const visiblePages = getVisiblePages(sysKey);
                            const checkedCount = visiblePages.filter((p) => !!formData.pageFirms?.[p.key]).length;
                            const isAllSysChecked = visiblePages.length > 0 && checkedCount === visiblePages.length;

                            return (
                              <div
                                key={sysKey}
                                className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-xs"
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleSystemExpand(sysKey)}
                                  className="w-full flex items-center justify-between p-2.5 hover:bg-slate-50 transition-colors text-left"
                                >
                                  <div className="flex items-center gap-2">
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />
                                    )}
                                    <span className="text-xs font-semibold text-gray-800">
                                      {sysConfig.label}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-normal">
                                      ({checkedCount}/{visiblePages.length} {visiblePages.length === 1 ? "page" : "pages"})
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {isAllSysChecked ? (
                                      <Badge
                                        variant="secondary"
                                        className={`text-[10px] font-medium ${
                                          formData.isViewOnly
                                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                                            : "bg-purple-50 text-purple-700 border border-purple-200"
                                        }`}
                                      >
                                        <Check className="h-2.5 w-2.5 mr-1" />
                                        {formData.isViewOnly ? "All View" : "All Full"}
                                      </Badge>
                                    ) : checkedCount > 0 ? (
                                      <Badge
                                        variant="secondary"
                                        className="text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200"
                                      >
                                        {checkedCount} / {visiblePages.length} Selected
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] font-medium text-gray-400 border-gray-200"
                                      >
                                        None
                                      </Badge>
                                    )}
                                  </div>
                                </button>

                                {isExpanded && (
                                  <div className="px-3 pb-3 pt-1 border-t border-gray-100 bg-slate-50/60">
                                    <div className="text-[10px] text-slate-400 mb-2 flex items-center justify-between">
                                      <span>Granted Pages (Implied access - all 9 firms)</span>
                                      <div className="flex items-center gap-3">
                                        <span className="font-mono text-[9px] text-slate-400 hidden sm:inline">
                                          Firms: {ALL_FIRMS.join(", ")}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleAllPagesInSystem(sysKey, !isAllSysChecked);
                                          }}
                                          className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                                        >
                                          {isAllSysChecked ? "Deselect All" : "Select All"}
                                        </button>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                      {visiblePages.map((page) => {
                                        const isChecked = !!formData.pageFirms?.[page.key];
                                        const checkboxId = `all-sys-${sysKey}-${page.key}`;
                                        return (
                                          <div
                                            key={page.key}
                                            onClick={() => handleToggleSystemPage(sysKey, page.key)}
                                            className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer select-none ${
                                              isChecked
                                                ? formData.isViewOnly
                                                  ? "bg-blue-50/60 border-blue-200 text-blue-900"
                                                  : "bg-purple-50/60 border-purple-200 text-purple-900"
                                                : "bg-white border-gray-200 text-gray-400 hover:bg-slate-50"
                                            }`}
                                          >
                                            <Checkbox
                                              id={checkboxId}
                                              checked={isChecked}
                                              onCheckedChange={() => handleToggleSystemPage(sysKey, page.key)}
                                              onClick={(e) => e.stopPropagation()}
                                              className={
                                                formData.isViewOnly
                                                  ? "data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                                  : "data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                                              }
                                            />
                                            <Label
                                              htmlFor={checkboxId}
                                              className={`text-[11px] font-medium cursor-pointer flex-1 truncate ${
                                                isChecked
                                                  ? formData.isViewOnly
                                                    ? "text-blue-900 font-semibold"
                                                    : "text-purple-900 font-semibold"
                                                  : "text-gray-400"
                                              }`}
                                              title={page.label || page.key}
                                            >
                                              {page.label || page.key}
                                            </Label>
                                            {isChecked && (
                                              <span
                                                className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${
                                                  formData.isViewOnly
                                                    ? "bg-blue-100 text-blue-700"
                                                    : "bg-purple-100 text-purple-700"
                                                }`}
                                              >
                                                {formData.isViewOnly ? "View" : "Full"}
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <table className="w-full text-xs border-separate border-spacing-0 relative" style={{ minWidth: "500px" }}>
                        <thead>
                          <tr>
                            <th className="font-bold text-gray-700 bg-slate-50 py-2.5 px-3 text-left align-middle sticky top-0 z-20 shadow-[0_1px_0_0_#e2e8f0] w-[30%]">
                              Page Name
                            </th>
                            {["Pmmpl", "Purab", "Rkl"].map((firm) => (
                              <th key={firm} className="text-center font-bold text-gray-700 bg-slate-50 py-2.5 px-2 align-middle sticky top-0 z-20 shadow-[0_1px_0_0_#e2e8f0] w-[14%]">
                                <div className="flex flex-col items-center gap-1">
                                  <span>{firm}</span>
                                  <Checkbox
                                    checked={isFirmCheckedForAllPages(firm)}
                                    onCheckedChange={(checked) => handleToggleColumnFirm(firm, !!checked)}
                                    className="h-3 w-3 data-[state=checked]:bg-[#2fa36b] data-[state=checked]:border-[#2fa36b]"
                                  />
                                </div>
                              </th>
                            ))}
                            <th className="text-center font-bold text-gray-700 bg-slate-50 py-2.5 px-2 align-middle sticky top-0 z-20 shadow-[0_1px_0_0_#e2e8f0] w-[18%]">
                              Access Level
                            </th>
                            <th className="text-center font-bold text-gray-700 bg-slate-50 py-2.5 px-2 align-middle sticky top-0 z-20 shadow-[0_1px_0_0_#e2e8f0] w-[10%]">
                              Row Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {ALL_PAGES.filter(p => p.toLowerCase().includes(pageSearch.toLowerCase())).map((page) => {
                            const isAllRowChecked = isPageCheckedForAllFirms(page);
                            const pageObj = formData.pageFirms?.[page];
                            const currentFirms = pageObj ? (Array.isArray(pageObj) ? pageObj : (pageObj.firms || [])) : [];
                            const isPageReadOnly = pageObj && !Array.isArray(pageObj) ? !!pageObj.readOnly : false;
                            const hasAccess = currentFirms.length > 0;
                            return (
                              <tr key={page} className="hover:bg-slate-50/50 transition-colors">
                                <td className="font-medium text-gray-700 py-2 px-3 align-middle border-b border-gray-100">{page}</td>
                                {["Pmmpl", "Purab", "Rkl"].map((firm) => (
                                  <td key={firm} className="text-center py-2 px-2 align-middle border-b border-gray-100">
                                    <div className="flex justify-center">
                                      <Checkbox
                                        checked={currentFirms.includes(firm) || currentFirms.includes("all")}
                                        onCheckedChange={() => handleTogglePageFirm(page, firm)}
                                        className="h-4 w-4 data-[state=checked]:bg-[#2fa36b] data-[state=checked]:border-[#2fa36b]"
                                      />
                                    </div>
                                  </td>
                                ))}
                                <td className="py-2 px-2 align-middle border-b border-gray-100">
                                  <div className="flex justify-center">
                                    <Select
                                      disabled={!hasAccess}
                                      value={isPageReadOnly ? "view" : "edit"}
                                      onValueChange={(val) => handleTogglePageAccessLevel(page, val === "view")}
                                    >
                                      <SelectTrigger className="h-7 text-[10px] w-24 bg-white border-gray-200">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="edit">Full Access</SelectItem>
                                        <SelectItem value="view">View Only</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </td>
                                <td className="text-center py-2 px-2 align-middle border-b border-gray-100">
                                  <div className="flex justify-center">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleToggleRowAll(page, !isAllRowChecked)}
                                      className="h-6 px-2 text-[10px] border-[#2fa36b]/20 text-[#2fa36b] hover:bg-[#2fa36b] hover:text-white"
                                    >
                                      {isAllRowChecked ? "Clear" : "All"}
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <SheetFooter className="bg-slate-50 p-4 sm:p-6 border-t border-gray-100 flex flex-row items-center justify-between gap-4 shrink-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDialogOpen(false)}
                className="text-gray-500 font-semibold"
              >
                Discard Changes
              </Button>
              <Button
                type="submit"
                className="bg-[#2fa36b] hover:bg-[#268a59] text-white px-8 shadow-lg shadow-[#2fa36b]/20 font-bold"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Serializing..."
                  : editingUser
                    ? "Apply Updates"
                    : "Initialize Account"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
