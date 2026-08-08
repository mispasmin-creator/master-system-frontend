"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { getStoredUser, getToken } from "@/lib/auth";

export const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [allowedSteps, setAllowedSteps] = useState([]);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const rawUser = getStoredUser();
    const token = getToken();
    if (rawUser && token) {
      // Map properties to fit Purchase FMS requirements
      const mappedUser = {
        username: rawUser.username,
        firmName: rawUser.firm_name === "all" ? "all" : (rawUser.firm_name || "").split(",").map(f => f.trim()).filter(Boolean),
        globalFirms: rawUser.firm_name === "all" ? "all" : (rawUser.firm_name || "").split(",").map(f => f.trim()).filter(Boolean),
        isReadOnly: rawUser.page_access === "viewonly",
        isSuperAdmin: rawUser.role === "admin" || rawUser.page_access === "super admin"
      };

      let steps = [];
      if (rawUser.page_access === "all" || rawUser.page_access === "super admin" || rawUser.role === "admin") {
        steps = ["admin"];
      } else if (rawUser.page_access) {
        steps = rawUser.page_access.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
      }

      setUser(mappedUser);
      setAllowedSteps(steps);
      setIsReadOnly(rawUser.page_access === "viewonly");
      setIsSuperAdmin(rawUser.role === "admin" || rawUser.page_access === "super admin");
    }
    setIsLoading(false);
  }, []);

  const hasPageFirmAccess = (pageName, firmName) => {
    if (!user) return false;
    if (isSuperAdmin || allowedSteps.includes("admin")) return true;
    const searchFirm = String(firmName || "").toLowerCase().trim();
    const firms = Array.isArray(user.firmName) ? user.firmName : [user.firmName];
    return firms.some(f => String(f).toLowerCase().trim() === "all" || String(f).toLowerCase().trim() === searchFirm);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, allowedSteps, isReadOnly, isSuperAdmin, hasPageFirmAccess, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
