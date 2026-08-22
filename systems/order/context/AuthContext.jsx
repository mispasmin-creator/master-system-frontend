"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { getStoredUser, getToken } from "@/lib/auth";
import { parseUserPermissions } from "@/systems/core/config/systemRegistry";

export const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [allowedSteps, setAllowedSteps] = useState([]);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [permissionParser, setPermissionParser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const rawUser = getStoredUser();
    const token = getToken();
    if (rawUser && token) {
      const parsed = parseUserPermissions(rawUser.page_access, rawUser.role);

      const mappedUser = {
        username: rawUser.username,
        firmName: rawUser.firm_name === "all" ? "all" : (rawUser.firm_name || "").split(",").map(f => f.trim()).filter(Boolean),
        globalFirms: rawUser.firm_name === "all" ? "all" : (rawUser.firm_name || "").split(",").map(f => f.trim()).filter(Boolean),
        isReadOnly: parsed.isViewOnly,
        // isSuperAdmin now reflects the real 3-tier role (was previously an
        // alias for isAdmin, i.e. plain Admins incorrectly got edit/revert
        // rights too).
        isSuperAdmin: parsed.isSuperAdmin
      };

      setUser(mappedUser);
      setAllowedSteps(parsed.isAdmin ? ["admin"] : parsed.allowedPages.map(p => p.toLowerCase()));
      setIsReadOnly(parsed.isViewOnly);
      setIsSuperAdmin(parsed.isSuperAdmin);
      setPermissionParser(() => parsed);
    }
    setIsLoading(false);
  }, []);

  const hasPageFirmAccess = (pageName, firmName) => {
    if (!user) return false;
    if (isSuperAdmin || allowedSteps.includes("admin")) return true;
    if (permissionParser) {
      return permissionParser.hasPageAccess(pageName, firmName);
    }
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
