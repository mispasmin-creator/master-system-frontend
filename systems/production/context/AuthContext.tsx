"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { getStoredUser, getToken } from "@/lib/auth";

export const FIRM_MAP: Record<string, string> = {
  "Purab": "PURAB ORDER",
  "Pmmpl": "PMMPL ORDER",
  "Rkl": "RKL ORDER"
};

// Map rawUser.page_access string (e.g. "orders, job-cards") into an array of allowed steps
const parsePagePermissions = (pageAccess: string | undefined | null) => {
  if (!pageAccess) return [];
  if (pageAccess === "all" || pageAccess === "super admin") return ["admin"];
  return String(pageAccess)
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
};

// Create context
const AuthContext = createContext<any>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [allowedSteps, setAllowedSteps] = useState<string[]>([]);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const rawUser = getStoredUser();
    const token = getToken();

    if (rawUser && token) {
      const steps = parsePagePermissions(rawUser.page_access);
      
      // Construct pageAccess object for Production components that still expect it
      const pageAccessObj: Record<string, "view" | "full"> = {};
      steps.forEach(step => {
        pageAccessObj[step] = "full"; // Defaulting to full, can enhance later
      });

      const mappedUser = {
        id: rawUser.id?.toString() || "",
        username: rawUser.username || "",
        role: rawUser.role || "user",
        permissions: steps,
        pageAccess: pageAccessObj,
        firm: rawUser.firm_name || "",
        // Adding Purchase-like properties just in case
        firmName: rawUser.firm_name === "all" ? "all" : (rawUser.firm_name || "").split(",").map((f: string) => f.trim()).filter(Boolean),
      };

      setUser(mappedUser);
      setAllowedSteps(steps);
      setIsReadOnly(rawUser.page_access === "viewonly");
      setIsSuperAdmin(rawUser.role === "admin" || rawUser.page_access === "super admin");
    }
    setIsLoading(false);
  }, []);

  const hasPageFirmAccess = (pageName: string, firmName: string) => {
    if (!user) return false;
    if (isSuperAdmin || allowedSteps.includes("admin")) return true;
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
