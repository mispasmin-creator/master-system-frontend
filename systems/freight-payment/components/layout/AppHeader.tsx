import React, { useRef, useState } from "react";
import {
  Bell,
  Building2,
  ChevronRight,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sun,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthUser as LoginUser } from "@/lib/auth";

interface AppHeaderProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  pageTitle: string;
  pageDescription: string;
  isAdmin: boolean;
  userFirm: string;
  user?: LoginUser;
  onLogout?: () => void;
  delayedCount?: number;
  darkMode?: boolean;
  onToggleDark?: () => void;
}

export function AppHeader({
  sidebarCollapsed,
  onToggleSidebar,
  pageTitle,
  pageDescription,
  isAdmin,
  userFirm,
  user,
  onLogout,
  delayedCount = 0,
  darkMode = false,
  onToggleDark,
}: AppHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const toggleSearch = () => {
    setSearchOpen((v) => {
      if (!v) setTimeout(() => searchRef.current?.focus(), 50);
      return !v;
    });
  };

  const avatarLetter = user?.Username?.charAt(0)?.toUpperCase() ?? "U";
  const roleBadge = isAdmin ? "Admin" : user?.Role ?? "User";

  return (
    <header
      className={cn(
        "shrink-0 z-20 relative flex items-center justify-between px-4 gap-3 transition-colors duration-200",
        "bg-white dark:bg-[oklch(0.14_0.006_247)] border-b border-slate-200/80 dark:border-white/8"
      )}
      style={{ height: "var(--header-h, 56px)" }}
    >
      {/* Brand accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-brand-600/70 via-brand-400/30 to-transparent pointer-events-none" />

      {/* ── LEFT: toggle + breadcrumb ── */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          id="sidebar-toggle-btn"
          onClick={onToggleSidebar}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-white/8 dark:hover:text-slate-200 transition-colors shrink-0"
        >
          {sidebarCollapsed
            ? <PanelLeftOpen className="w-4 h-4" />
            : <PanelLeftClose className="w-4 h-4" />}
        </button>

        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate">
          <span className="text-slate-500 dark:text-slate-400 font-semibold">
            {isAdmin ? "All Firms" : userFirm}
          </span>
          <ChevronRight className="w-3 h-3 shrink-0" />
          <span className="text-slate-800 dark:text-slate-200 font-bold truncate">{pageTitle}</span>
        </div>

        {/* Mobile: just title */}
        <span className="sm:hidden text-[13px] font-bold text-slate-800 dark:text-slate-100 truncate">
          {pageTitle}
        </span>
      </div>

      {/* ── RIGHT: actions ── */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Search bar */}
        <div
          className={cn(
            "header-search flex items-center gap-2 rounded-lg border transition-all duration-250 overflow-hidden",
            searchOpen
              ? "w-[180px] sm:w-[240px] border-brand-200 bg-brand-50/40 dark:bg-brand-900/20 dark:border-brand-700/40 px-2.5 h-8"
              : "w-8 h-8 border-transparent bg-transparent justify-center"
          )}
        >
          <button
            onClick={toggleSearch}
            className="shrink-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
          {searchOpen && (
            <>
              <input
                ref={searchRef}
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder="Search records…"
                className="flex-1 bg-transparent text-[12px] text-slate-700 dark:text-slate-200 placeholder:text-slate-400 outline-none min-w-0"
              />
              {searchVal && (
                <button onClick={() => setSearchVal("")} className="text-slate-400 hover:text-slate-600 transition-colors shrink-0">
                  <X className="w-3 h-3" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Firm badge (non-admin only) */}
        {!isAdmin && userFirm && (
          <div className="hidden md:flex items-center gap-1.5 bg-brand-50 dark:bg-brand-900/30 border border-brand-200/80 dark:border-brand-700/40 px-2.5 py-1 rounded-lg">
            <Building2 className="w-3 h-3 text-brand-600 dark:text-brand-400" />
            <span className="text-[10px] font-bold text-brand-800 dark:text-brand-300 uppercase tracking-wider">
              {userFirm}
            </span>
          </div>
        )}

        {/* Dark mode toggle */}
        {onToggleDark && (
          <button
            id="dark-mode-toggle"
            onClick={onToggleDark}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-white/8 dark:hover:text-slate-200 transition-colors"
            title={darkMode ? "Light mode" : "Dark mode"}
          >
            {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Notification bell */}
        <button
          id="notif-bell-btn"
          className="relative w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-white/8 dark:hover:text-slate-200 transition-colors"
          title="Notifications"
        >
          <Bell className="w-3.5 h-3.5" />
          {delayedCount > 0 && (
            <span className="notif-badge">{delayedCount > 9 ? "9+" : delayedCount}</span>
          )}
        </button>

        {/* Vertical divider */}
        <div className="w-px h-5 bg-slate-200 dark:bg-white/10 mx-0.5" />

        {/* User avatar + dropdown */}
        <div className="relative">
          <button
            id="user-avatar-btn"
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-100 dark:hover:bg-white/8 transition-colors"
          >
            <div className="w-6 h-6 rounded-md bg-brand-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-sm">
              {avatarLetter}
            </div>
            <div className="hidden sm:flex flex-col items-start leading-tight">
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 capitalize">{user?.Username ?? "User"}</span>
              <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{roleBadge}</span>
            </div>
          </button>

          {userMenuOpen && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
              {/* Dropdown */}
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-[oklch(0.16_0.006_247)] border border-slate-200 dark:border-white/8 rounded-xl shadow-xl z-50 overflow-hidden animate-slide-in-up">
                <div className="p-3 border-b border-slate-100 dark:border-white/6">
                  <p className="text-[12px] font-bold text-slate-800 dark:text-slate-100 capitalize">{user?.Username}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{roleBadge} · {userFirm || "All Firms"}</p>
                </div>
                <div className="p-1.5">
                  <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/6 transition-colors">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Profile
                  </button>
                  {onLogout && (
                    <button
                      onClick={() => { setUserMenuOpen(false); onLogout(); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors mt-0.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
