import React, { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_URL, getToken, AuthUser as LoginUser } from "@/lib/auth";

/* ─── Constants ─── */
const FIRM_OPTIONS = ["Pmmpl", "Rkl", "Purab", "Refrasynth", "Refratech"];
const ROLE_OPTIONS = ["Admin", "User", "Viewer"];

const ALL_PAGES = [
  { key: "Dashboard", label: "Dashboard", icon: "📊" },
  { key: "Account Checking", label: "Account Checking", icon: "📦" },
  { key: "Account Audit", label: "Account Audit", icon: "📄" },
  { key: "Posting", label: "Posting", icon: "💰" },
  { key: "Freight", label: "Freight Payments", icon: "🚚" },
  { key: "Users", label: "User Management", icon: "👥" },
];

/* ─── Helper ─── */
const getRoleBadgeClass = (role: string) => {
  const r = role?.toLowerCase();
  if (r === "admin") return "bg-amber-50 text-amber-700 border-amber-200/50";
  if (r === "viewer") return "bg-slate-50 text-slate-600 border-slate-200/50";
  return "bg-blue-50 text-blue-700 border-blue-200/50";
};

/* ─── Main Component ─── */
export function UserManagement() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [firmFilter, setFirmFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const { data: users = [], isLoading, error, refetch } = useQuery({
    queryKey: ["login-users"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/users/manage`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      return (data.data || []).map((u: any) => ({
        id: u.id,
        Username: u.username,
        Role: u.role || 'User',
        "Firm Name": u.firm_name || '',
        "Page Access": u.page_access || '',
      }));
    },
    retry: 1,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API_URL}/users/manage/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete user');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["login-users"] });
      setDeleteConfirm(null);
      flashSuccess("User deleted successfully");
    },
    onError: (err: any) => {
      flashSuccess(err?.message || "Failed to delete user", "error");
    },
  });

  const flashSuccess = (msg: string, type: "success" | "error" = "success") => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const filteredUsers = useMemo(() => {
    let filtered = users;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.Username?.toLowerCase().includes(term) ||
          u["Firm Name"]?.toLowerCase().includes(term)
      );
    }
    if (roleFilter !== "all") {
      filtered = filtered.filter((u) => u.Role?.toLowerCase() === roleFilter.toLowerCase());
    }
    if (firmFilter !== "all") {
      filtered = filtered.filter((u) => u["Firm Name"] === firmFilter);
    }
    return filtered;
  }, [users, searchTerm, roleFilter, firmFilter]);

  const handleCreate = () => {
    setEditingUser(null);
    setIsFormOpen(true);
  };

  const handleEdit = (user: LoginUser) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (user: LoginUser) => {
    setDeleteConfirm(user);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setRoleFilter("all");
    setFirmFilter("all");
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-50 rounded-xl">
            <Users className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">User Management</h2>
            <p className="text-[11px] text-slate-400 font-medium">
              {filteredUsers.length} of {users.length} users
            </p>
          </div>
        </div>
        <Button
          onClick={handleCreate}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-violet-600/20 h-9 px-5 font-bold text-xs transition-all active:scale-[0.97]"
        >
          <UserPlus className="w-4 h-4 mr-1.5" />
          Add User
        </Button>
      </div>

      {/* Success/Error Message */}
      {successMsg && (
        <div
          className={cn(
            "flex items-center gap-2.5 px-4 py-3 rounded-xl animate-slide-in-up",
            successMsg.includes("successfully")
              ? "bg-emerald-50 border border-emerald-200/60"
              : "bg-rose-50 border border-rose-200/60"
          )}
        >
          {successMsg.includes("successfully") ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          )}
          <span
            className={cn(
              "text-xs font-semibold",
              successMsg.includes("successfully") ? "text-emerald-700" : "text-rose-700"
            )}
          >
            {successMsg}
          </span>
        </div>
      )}

      {/* Search & Filters Bar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by username or firm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 bg-white border-slate-200 rounded-xl text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2 border-slate-200 text-slate-600 h-10 px-4 rounded-xl"
          >
            <Filter className="w-4 h-4" />
            Filters
            {(roleFilter !== "all" || firmFilter !== "all") && (
              <span className="ml-1 w-2 h-2 bg-blue-500 rounded-full" />
            )}
            <ChevronDown className={cn("w-3 h-3 transition-transform", showFilters && "rotate-180")} />
          </Button>
          {(roleFilter !== "all" || firmFilter !== "all" || searchTerm) && (
            <Button
              variant="ghost"
              onClick={resetFilters}
              className="text-slate-400 hover:text-slate-600 h-10 px-3"
            >
              Clear
            </Button>
          )}
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 p-4 bg-white border border-slate-200/60 rounded-xl animate-fade-in">
            <div className="flex-1 min-w-[150px]">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                Role
              </Label>
              <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value || "all")}>
                <SelectTrigger className="h-9 bg-slate-50 border-slate-200 rounded-lg text-sm">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r.toLowerCase()}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                Firm
              </Label>
              <Select value={firmFilter} onValueChange={(value) => setFirmFilter(value || "all")}>
                <SelectTrigger className="h-9 bg-slate-50 border-slate-200 rounded-lg text-sm">
                  <SelectValue placeholder="All firms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All firms</SelectItem>
                  {FIRM_OPTIONS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-12 gap-3">
            <AlertCircle className="w-10 h-10 text-rose-400" />
            <p className="text-sm text-slate-500">Failed to load users</p>
            <Button variant="outline" onClick={() => refetch()} className="rounded-lg text-xs">
              Try Again
            </Button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-3">
            <Users className="w-12 h-12 text-slate-200" />
            <p className="text-sm font-medium text-slate-500">No users found</p>
            {searchTerm || roleFilter !== "all" || firmFilter !== "all" ? (
              <Button variant="ghost" onClick={resetFilters} className="text-xs">
                Clear filters
              </Button>
            ) : (
              <Button onClick={handleCreate} variant="outline" className="rounded-lg text-xs">
                Add your first user
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-100 hover:bg-transparent">
                  <TableHead className="text-slate-400 font-bold text-[10px] tracking-[0.1em] uppercase py-3 pl-6">
                    User
                  </TableHead>
                  <TableHead className="text-slate-400 font-bold text-[10px] tracking-[0.1em] uppercase py-3">
                    Role
                  </TableHead>
                  <TableHead className="text-slate-400 font-bold text-[10px] tracking-[0.1em] uppercase py-3">
                    Firm
                  </TableHead>
                  <TableHead className="text-slate-400 font-bold text-[10px] tracking-[0.1em] uppercase py-3">
                    Page Access
                  </TableHead>
                  <TableHead className="text-slate-400 font-bold text-[10px] tracking-[0.1em] uppercase py-3 text-right pr-6 w-[100px]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.id} className="border-b border-slate-50 table-row-hover group">
                    <TableCell className="py-3.5 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {u.Username?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <div className="font-bold text-[13px] text-slate-900">
                            {u.Username}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">ID: {u.id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border",
                          getRoleBadgeClass(u.Role)
                        )}
                      >
                        <Shield className="w-3 h-3" />
                        {u.Role}
                      </span>
                    </TableCell>
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-700">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {u["Firm Name"] || "—"}
                      </div>
                    </TableCell>
                    <TableCell className="py-3.5">
                      <div className="flex flex-wrap gap-1 max-w-[300px]">
                        {(u.Page || "")
                          .split(",")
                          .filter(Boolean)
                          .map((page, i) => (
                            <span
                              key={i}
                              className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md"
                            >
                              {page.trim()}
                            </span>
                          ))}
                        {!u.Page && <span className="text-[10px] text-slate-300">No access</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-3.5 pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(u)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(u)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <UserFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        user={editingUser}
        onSuccess={(msg) => {
          queryClient.invalidateQueries({ queryKey: ["login-users"] });
          setIsFormOpen(false);
          flashSuccess(msg);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden border border-white shadow-2xl shadow-slate-950/20">
          <DialogHeader className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <DialogTitle className="text-base font-bold text-slate-900">Delete User</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              Are you sure you want to delete <span className="font-bold text-slate-700">{deleteConfirm?.Username}</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-4">
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200/60 rounded-xl">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-[11px] text-amber-700">
                All associated data will be permanently removed.
              </span>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-slate-50/30 flex gap-2">
            <Button
              variant="outline"
              className="rounded-lg text-xs h-9 flex-1 border-slate-200"
              onClick={() => setDeleteConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-lg text-xs h-9 flex-1 bg-rose-600 hover:bg-rose-700 text-white"
              disabled={deleteMutation.isPending}
              onClick={() => deleteConfirm !== null && deleteMutation.mutate(deleteConfirm.id!)}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/*            USER FORM DIALOG                */
/* ═══════════════════════════════════════════ */

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: LoginUser | null;
  onSuccess: (msg: string) => void;
}

function UserFormDialog({ open, onOpenChange, user, onSuccess }: UserFormDialogProps) {
  const [formData, setFormData] = useState<Partial<LoginUser>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (open) {
      if (user) {
        setFormData(user);
        setSelectedPages((user.Page || "").split(",").map((s) => s.trim()).filter(Boolean));
      } else {
        setFormData({ Role: "User" });
        setSelectedPages([]);
      }
      setShowPassword(false);
      setErrors({});
      setTouched({});
    }
  }, [open, user]);

  const createMutation = useMutation({
    mutationFn: (data: Partial<LoginUser>) => api.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["login-users"] });
      onSuccess("User created successfully");
    },
    onError: (err: any) => {
      setErrors({ submit: err?.message || "Failed to create user" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<LoginUser>) => api.updateUser(user!.id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["login-users"] });
      onSuccess("User updated successfully");
    },
    onError: (err: any) => {
      setErrors({ submit: err?.message || "Failed to update user" });
    },
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.Username?.trim()) newErrors.username = "Username is required";
    if (!formData.Password?.trim()) newErrors.password = "Password is required";
    else if (formData.Password.length < 4) newErrors.password = "Password must be at least 4 characters";
    if (!formData.Role) newErrors.role = "Role is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const togglePage = (pageKey: string) => {
    setSelectedPages((prev) =>
      prev.includes(pageKey) ? prev.filter((p) => p !== pageKey) : [...prev, pageKey]
    );
  };

  const selectAllPages = () => {
    if (selectedPages.length === ALL_PAGES.length) {
      setSelectedPages([]);
    } else {
      setSelectedPages(ALL_PAGES.map((p) => p.key));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const submitData: Partial<LoginUser> = {
      ...formData,
      Page: selectedPages.join(","),
    };

    if (user) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-lg w-[92vw] bg-white text-slate-900 border border-white shadow-2xl shadow-slate-950/20 p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <DialogTitle className="text-base font-bold text-slate-900 tracking-tight">
            {user ? "Edit User" : "Add New User"}
          </DialogTitle>
          <DialogDescription className="text-slate-400 font-medium text-xs mt-0.5">
            {user
              ? "Update user details and page access permissions."
              : "Create a new user account with page access."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {errors.submit && (
              <div className="flex items-center gap-2.5 px-4 py-3 bg-rose-50 border border-rose-200/60 rounded-xl">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="text-xs font-semibold text-rose-600">{errors.submit}</span>
              </div>
            )}

            {/* Username */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Username <span className="text-rose-500">*</span>
              </Label>
              <Input
                className={cn(
                  "h-10 bg-white border-slate-200 rounded-lg text-sm",
                  touched.username && errors.username && "border-rose-300 focus:ring-rose-500"
                )}
                value={formData.Username || ""}
                onChange={(e) => setFormData({ ...formData, Username: e.target.value })}
                onBlur={() => handleBlur("username")}
                placeholder="Enter username"
              />
              {touched.username && errors.username && (
                <p className="text-[10px] font-medium text-rose-500 mt-0.5">{errors.username}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Password <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  className={cn(
                    "h-10 bg-white border-slate-200 rounded-lg text-sm pr-10",
                    touched.password && errors.password && "border-rose-300 focus:ring-rose-500"
                  )}
                  value={formData.Password || ""}
                  onChange={(e) => setFormData({ ...formData, Password: e.target.value })}
                  onBlur={() => handleBlur("password")}
                  placeholder={user ? "Leave blank to keep current" : "Enter password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {touched.password && errors.password && (
                <p className="text-[10px] font-medium text-rose-500 mt-0.5">{errors.password}</p>
              )}
              {user && (
                <p className="text-[10px] text-slate-400 italic">Leave blank to keep existing password</p>
              )}
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Role <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={formData.Role || "User"}
                onValueChange={(v) => {
                  setFormData({ ...formData, Role: String(v) });
                  setErrors((prev) => ({ ...prev, role: "" }));
                }}
              >
                <SelectTrigger
                  className={cn(
                    "h-10 bg-white border-slate-200 rounded-lg text-sm",
                    errors.role && "border-rose-300"
                  )}
                >
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.role && <p className="text-[10px] font-medium text-rose-500 mt-0.5">{errors.role}</p>}
            </div>

            {/* Firm Name */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Firm Name
              </Label>
              <Select
                value={formData["Firm Name"] || "none"}
                onValueChange={(v) => {
                  const firm = String(v);
                  setFormData({ ...formData, "Firm Name": firm === "none" ? "" : firm });
                }}
              >
                <SelectTrigger className="h-10 bg-white border-slate-200 rounded-lg text-sm">
                  <SelectValue placeholder="Select firm (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {FIRM_OPTIONS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Page Access */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Page Access
                </Label>
                <button
                  type="button"
                  onClick={selectAllPages}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider"
                >
                  {selectedPages.length === ALL_PAGES.length ? "Deselect All" : "Select All"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ALL_PAGES.map((page) => {
                  const isSelected = selectedPages.includes(page.key);
                  return (
                    <button
                      key={page.key}
                      type="button"
                      onClick={() => togglePage(page.key)}
                      className={cn(
                        "flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all",
                        isSelected
                          ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm"
                          : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      <div
                        className={cn(
                          "w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all",
                          isSelected ? "bg-blue-600 border-blue-600" : "border-slate-300"
                        )}
                      >
                        {isSelected && (
                          <svg
                            className="w-2.5 h-2.5 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="truncate">{page.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-lg px-6 h-10 border-slate-200 text-slate-500 font-semibold text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="rounded-lg px-8 h-10 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-violet-600/20 transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : user ? (
                "Save Changes"
              ) : (
                "Create User"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
