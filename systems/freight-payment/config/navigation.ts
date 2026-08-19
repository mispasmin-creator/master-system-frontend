import { AuthUser as LoginUser } from "@/lib/auth";

export const PAGE_KEY_MAP: Record<string, string> = {
  dashboard: "Dashboard",
  checkkitting: "Account Checking",
  posting: "Account Audit",
  makepayment: "Posting",
  freight: "Freight",
};

export function getUserAllowedTabs(user: LoginUser): string[] {
  const isAdmin = user.role?.toLowerCase() === "admin";
  if (isAdmin) return Object.keys(PAGE_KEY_MAP);
  const userPages = (user.page_access || "")
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  return Object.entries(PAGE_KEY_MAP)
    .filter(([_, pageKey]) => userPages.includes(pageKey.toLowerCase()))
    .map(([tabKey]) => tabKey);
}

export function hasAccess(user: LoginUser, tabKey: string): boolean {
  if (user.role?.toLowerCase() === "admin") return true;
  const userPages = (user.page_access || "")
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  const pageKey = PAGE_KEY_MAP[tabKey];
  return pageKey ? userPages.includes(pageKey.toLowerCase()) : false;
}
