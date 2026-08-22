"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { getStoredUser, getToken } from "@/lib/auth";
import { parseUserPermissions } from "@/systems/core/config/systemRegistry";

export const FIRM_MAP: Record<string, string> = {
  "Purab": "PURAB ORDER",
  "Pmmpl": "PMMPL ORDER",
  "Rkl": "RKL ORDER"
};

// Create context
const AuthContext = createContext<any>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [allowedSteps, setAllowedSteps] = useState<string[]>([]);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [permissionParser, setPermissionParser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const rawUser = getStoredUser();
    const token = getToken();

    if (rawUser && token) {
      const parsed = parseUserPermissions(rawUser.page_access, rawUser.role);
      const steps = parsed.isAdmin ? ["admin"] : parsed.allowedPages.map((p) => p.toLowerCase());
      
      // Construct pageAccess object for Production components that still expect it
      const pageAccessObj: Record<string, "view" | "full"> = {};
      steps.forEach(step => {
        pageAccessObj[step] = parsed.isViewOnly ? "view" : "full";
      });

      const mappedUser = {
        id: rawUser.id?.toString() || "",
        username: rawUser.username || "",
        role: rawUser.role || "user",
        permissions: steps,
        pageAccess: pageAccessObj,
        firm: rawUser.firm_name || "",
        firmName: rawUser.firm_name === "all" ? "all" : (rawUser.firm_name || "").split(",").map((f: string) => f.trim()).filter(Boolean),
      };

      setUser(mappedUser);
      setAllowedSteps(steps);
      setIsReadOnly(parsed.isViewOnly);
      // isSuperAdmin now reflects the real 3-tier role (was previously an
      // alias for isAdmin, i.e. plain Admins incorrectly got edit/revert
      // rights too).
      setIsSuperAdmin(parsed.isSuperAdmin);
      setPermissionParser(() => parsed);
    }
    setIsLoading(false);
  }, []);

  const hasPageFirmAccess = (pageName: string, firmName: string) => {
    if (!user) return false;
    if (isSuperAdmin || allowedSteps.includes("admin")) return true;
    if (permissionParser) {
      return permissionParser.hasPageAccess(pageName, firmName);
    }
    const searchFirm = String(firmName || "").toLowerCase().trim();
    const firms = Array.isArray(user.firmName) ? user.firmName : [user.firmName];
    return firms.some((f: string) => String(f).toLowerCase().trim() === "all" || String(f).toLowerCase().trim() === searchFirm);
  };

  // Provide dummy methods for addUser, updateUser, deleteUser to prevent crashes
  // in the Settings component if it still exists. The actual user management
  // should happen in the shared /users endpoint.
  const addUser = async () => ({ success: false, error: "User management is handled in the main FMS admin panel." });
  const updateUser = async () => ({ success: false, error: "User management is handled in the main FMS admin panel." });
  const deleteUser = async () => ({ success: false, error: "User management is handled in the main FMS admin panel." });

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      allowedSteps,
      isReadOnly,
      isSuperAdmin,
      isLoading,
      isAuthLoading: isLoading, // backwards compatibility
      hasPageFirmAccess,
      addUser,
      updateUser,
      deleteUser,
      allUsers: [], // backwards compatibility
      roles: ["admin", "user"],
      pages: [],
    }),
    [user, allowedSteps, isReadOnly, isSuperAdmin, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
