'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserCog, Building2, Warehouse, Truck, Package, Users as UsersIcon, Camera, Sun, Moon } from 'lucide-react';
import { toast } from 'sonner';
import { useOutletContext } from 'react-router-dom';
import { API_URL, getToken, getStoredUser } from '@/lib/auth';
import { AuthProvider } from '../../purchase/context/AuthContext';
import ManageUsers from '../../purchase/components/ManageUsers';

const EMPTY_FIRM_FORM = {
  firmName: "",
  dataName: "",
  address: "",
  billingAddress: "",
  phone: "",
  email: "",
  gstin: "",
  pan: "",
  poPrefix: "",
};

const EMPTY_MASTER_FORM = {
  type: "",
  vendorName: "",
  rawMaterialName: "",
  transporterName: "",
  aluminaRange: "",
  ironRange: "",
  apRange: "",
  bdRange: "",
};

// Settings sub-sidebar structure: each top-level section owns a set of
// sub-items rendered beneath it, mirroring the dashboard's nav styling.
const NAV_SECTIONS = [
  {
    id: "profile",
    label: "Profile",
    icon: UserCog,
    items: [{ id: "my-profile", label: "My Profile" }],
  },
  {
    id: "user-management",
    label: "User Management",
    icon: UsersIcon,
    items: [{ id: "manage-users", label: "Manage Users" }],
  },
  {
    id: "systems",
    label: "Systems",
    icon: Building2,
    items: [
      { id: "purchase-firms", label: "Purchase - Firm Data Entry" },
      { id: "purchase-master", label: "Purchase - Master Table Entry" },
    ],
  },
];

function EmptyRow({ colSpan, label }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-32 text-center text-sm text-zinc-500 dark:text-zinc-400">
        {label}
      </TableCell>
    </TableRow>
  );
}

function LoadingRows({ colSpan, rows = 3 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          <TableCell colSpan={colSpan}>
            <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-full animate-pulse" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

// "My Profile" tab — Profile Information + Change Password cards.
// Kept self-contained (own local state only): the Login model doesn't yet
// expose email/phone/photo, and there's no change-password endpoint, so
// Save/Update here are local-only until that backend support exists.
function ProfileTab() {
  const { theme, toggleTheme } = useOutletContext();
  const storedUser = getStoredUser();
  const initial = (storedUser?.username || "?").charAt(0).toUpperCase();

  const [form, setForm] = useState({
    name: storedUser?.username || "",
    surname: "",
    email: "",
    phone: "",
  });
  const [saving, setSaving] = useState(false);

  const [pwForm, setPwForm] = useState({ next: "", confirm: "" });
  const [changingPw, setChangingPw] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Profile updated");
    }, 300);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!pwForm.next || !pwForm.confirm) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (pwForm.next.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      toast.error("New password and confirmation do not match");
      return;
    }
    setChangingPw(true);
    try {
      const res = await fetch(`${API_URL}/users/profile/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ password: pwForm.next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update password");
      
      setPwForm({ next: "", confirm: "" });
      toast.success("Password updated successfully");
    } catch (err) {
      toast.error("Error updating password", { description: err.message });
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <form onSubmit={handleSave}>
          <CardHeader>
            <CardTitle className="text-base">Profile Information</CardTitle>
            <CardDescription>Update your personal details and photo</CardDescription>
            <CardAction>
              <Button
                type="submit"
                disabled={saving}
                className="bg-[#2fa36b] hover:bg-[#278f5d] dark:bg-[#5ec792] dark:hover:bg-[#4fb984] text-white dark:text-zinc-900 rounded-full px-6"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </CardAction>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center bg-[#2fa36b] dark:bg-[#5ec792] text-white dark:text-zinc-900 text-xl font-bold shrink-0">
                {initial}
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">{storedUser?.username || "—"}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 capitalize mt-0.5">{storedUser?.role || "User"}</p>
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-xs font-medium text-[#2fa36b] dark:text-[#5ec792] hover:underline mt-2"
                >
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#2fa36b] dark:bg-[#5ec792] text-white dark:text-zinc-900">
                    <Camera className="w-3 h-3" />
                  </div>
                  Change photo
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="profileName">Name</Label>
                <Input
                  id="profileName"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profileSurname">Surname</Label>
                <Input
                  id="profileSurname"
                  placeholder="—"
                  value={form.surname}
                  onChange={(e) => setForm((f) => ({ ...f, surname: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profileEmail">Email address</Label>
              <Input
                id="profileEmail"
                type="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="profilePhone">Phone number</Label>
                <Input
                  id="profilePhone"
                  placeholder="+91 00000 00000"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profileRole">Role</Label>
                <Input id="profileRole" value={storedUser?.role || ""} disabled className="capitalize disabled:opacity-70" />
              </div>
            </div>
            
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold">Appearance</Label>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Toggle between light and dark mode.</p>
                </div>
                <Button
                  type="button"
                  onClick={toggleTheme}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {theme === 'light' ? (
                    <><Sun className="w-4 h-4" /> Light Mode</>
                  ) : (
                    <><Moon className="w-4 h-4" /> Dark Mode</>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </form>
      </Card>

      <Card>
        <form onSubmit={handlePasswordChange}>
          <CardHeader>
            <CardTitle className="text-base">Change Password</CardTitle>
            <CardDescription>Set a new password for your account</CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Enter new password"
                value={pwForm.next}
                onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={pwForm.confirm}
                onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
              />
            </div>
          </CardContent>

          <CardFooter className="border-t border-zinc-100 dark:border-zinc-800 pt-6 justify-end">
            <Button type="submit" disabled={changingPw} variant="outline">
              {changingPw && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update password
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function MasterPage() {
  const [activeSection, setActiveSection] = useState("systems");
  const [activeItem, setActiveItem] = useState("purchase-firms");

  const selectSection = (section) => {
    setActiveSection(section.id);
    setActiveItem(section.items[0].id);
  };

  // Add Firm modal state
  const [isFirmModalOpen, setIsFirmModalOpen] = useState(false);
  const [firmFormData, setFirmFormData] = useState(EMPTY_FIRM_FORM);
  const [firmSubmitLoading, setFirmSubmitLoading] = useState(false);
  const [firms, setFirms] = useState([]);
  const [firmsLoading, setFirmsLoading] = useState(true);

  // Add Master Entry modal state — moved here from the Purchase Dashboard's
  // "Add Data" button (same Master/TL insert logic, unchanged).
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);
  const [masterFormData, setMasterFormData] = useState(EMPTY_MASTER_FORM);
  const [masterSubmitLoading, setMasterSubmitLoading] = useState(false);
  const [masterRows, setMasterRows] = useState([]);
  const [tlRows, setTlRows] = useState([]);
  const [masterDataLoading, setMasterDataLoading] = useState(true);

  const fetchFirms = useCallback(async () => {
    setFirmsLoading(true);
    try {
      const res = await fetch(`${API_URL}/purchase/firms`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to load firms");
      setFirms(json.data || []);
    } catch (err) {
      toast.error("Failed to load firms", { description: err.message });
    } finally {
      setFirmsLoading(false);
    }
  }, []);

  const fetchMasterData = useCallback(async () => {
    setMasterDataLoading(true);
    try {
      const [masterRes, tlRes] = await Promise.all([
        fetch(`${API_URL}/purchase/master`),
        fetch(`${API_URL}/purchase/master/tolerance`),
      ]);
      const masterJson = await masterRes.json();
      const tlJson = await tlRes.json();
      if (!masterRes.ok) throw new Error(masterJson.message || "Failed to load master data");
      if (!tlRes.ok) throw new Error(tlJson.message || "Failed to load tolerance data");
      setMasterRows(masterJson.data || []);
      setTlRows(tlJson.data || []);
    } catch (err) {
      toast.error("Failed to load master data", { description: err.message });
    } finally {
      setMasterDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeSection === "systems" && activeItem === "purchase-firms") fetchFirms();
  }, [activeSection, activeItem, fetchFirms]);

  useEffect(() => {
    if (activeSection === "systems" && activeItem === "purchase-master") fetchMasterData();
  }, [activeSection, activeItem, fetchMasterData]);

  const handleFirmSubmit = async (e) => {
    e.preventDefault();
    if (!firmFormData.firmName.trim()) {
      toast.error("Firm name is required");
      return;
    }
    setFirmSubmitLoading(true);
    try {
      const res = await fetch(`${API_URL}/purchase/firms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          firmName: firmFormData.firmName.trim() || null,
          dataName: firmFormData.dataName.trim() || null,
          address: firmFormData.address.trim() || null,
          billingAddress: firmFormData.billingAddress.trim() || null,
          phone: firmFormData.phone.trim() || null,
          email: firmFormData.email.trim() || null,
          gstin: firmFormData.gstin.trim() || null,
          pan: firmFormData.pan.trim() || null,
          poPrefix: firmFormData.poPrefix.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to add firm");
      toast.success("Firm added successfully");
      setIsFirmModalOpen(false);
      setFirmFormData(EMPTY_FIRM_FORM);
      fetchFirms();
    } catch (err) {
      toast.error("Error adding firm", { description: err.message });
    } finally {
      setFirmSubmitLoading(false);
    }
  };

  const handleMasterSubmit = async (e) => {
    e.preventDefault();
    setMasterSubmitLoading(true);
    try {
      if (!masterFormData.type) {
        throw new Error("Please select a valid type.");
      }

      const res = await fetch(`${API_URL}/purchase/master`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          type: masterFormData.type,
          vendorName: masterFormData.vendorName.trim() || null,
          transporterName: masterFormData.transporterName.trim() || null,
          rawMaterialName: masterFormData.rawMaterialName.trim() || null,
          aluminaRange: masterFormData.aluminaRange || null,
          ironRange: masterFormData.ironRange || null,
          apRange: masterFormData.apRange || null,
          bdRange: masterFormData.bdRange || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to add dropdown data");
      toast.success("Dropdown Data Added Successfully");
      setIsMasterModalOpen(false);
      setMasterFormData(EMPTY_MASTER_FORM);
      fetchMasterData();
    } catch (err) {
      toast.error("Error adding dropdown data", { description: err.message });
    } finally {
      setMasterSubmitLoading(false);
    }
  };

  const vendors = masterRows.filter((r) => r.vendorName);
  const transporters = masterRows.filter((r) => r.transporterName);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Settings</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Manage your profile and configure the purchase system.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Settings sub-sidebar */}
        <aside className="md:w-60 shrink-0">
          <nav className="space-y-1">
            {NAV_SECTIONS.map((section) => {
              const SectionIcon = section.icon;
              const isSectionActive = activeSection === section.id;
              return (
                <div key={section.id}>
                  <button
                    type="button"
                    onClick={() => selectSection(section)}
                    className={`w-full flex items-center gap-2.5 h-10 px-3 rounded-lg text-sm font-medium transition-colors ${
                      isSectionActive
                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                        : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    <SectionIcon className="w-4 h-4 shrink-0" />
                    {section.label}
                  </button>

                  {isSectionActive && (
                    <div className="mt-1 mb-2 ml-[18px] pl-4 border-l border-zinc-200 dark:border-zinc-800 space-y-0.5">
                      {section.items.map((item) => {
                        const isItemActive = activeItem === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setActiveItem(item.id)}
                            className={`w-full text-left flex items-center h-9 px-3 rounded-md text-sm transition-colors ${
                              isItemActive
                                ? "bg-[#2fa36b]/10 dark:bg-[#5ec792]/10 text-[#1b5e41] dark:text-[#a7e3c4] font-medium"
                                : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Content area */}
        <main className="flex-1 min-w-0">
          {activeSection === "profile" && activeItem === "my-profile" && <ProfileTab />}

          {activeSection === "user-management" && activeItem === "manage-users" && (
            <AuthProvider>
              <ManageUsers />
            </AuthProvider>
          )}

          {activeSection === "systems" && activeItem === "purchase-firms" && (
            <div className="space-y-6">
              <Card className="border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[#2fa36b]" />
                    Firm Data Entry
                  </CardTitle>
                  <CardDescription>
                    Manage and add new purchase firms here. These firms will appear as options when generating POs.
                  </CardDescription>
                  <CardAction>
                    <Button
                      onClick={() => setIsFirmModalOpen(true)}
                      className="bg-[#2fa36b] hover:bg-[#278f5d] dark:bg-[#5ec792] dark:hover:bg-[#4fb984] text-white dark:text-zinc-900 rounded-full px-6"
                    >
                      Add Firm
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="flex items-center justify-end px-6 py-3 bg-zinc-50/50 dark:bg-zinc-900/50">
                    <Badge variant="outline" className="bg-white dark:bg-zinc-900">
                      Total: {firms.length}
                    </Badge>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                        <TableRow>
                          <TableHead>Firm Name</TableHead>
                          <TableHead>Short Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>GSTIN</TableHead>
                          <TableHead>PAN</TableHead>
                          <TableHead>PO Prefix</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {firmsLoading ? (
                          <LoadingRows colSpan={7} />
                        ) : firms.length > 0 ? (
                          firms.map((firm, idx) => (
                            <TableRow key={firm.id ?? idx}>
                              <TableCell className="font-medium text-zinc-900 dark:text-white">
                                {firm.firmName || "—"}
                              </TableCell>
                              <TableCell>{firm.dataName || "—"}</TableCell>
                              <TableCell>{firm.phone || "—"}</TableCell>
                              <TableCell>{firm.email || "—"}</TableCell>
                              <TableCell>{firm.gstin || "—"}</TableCell>
                              <TableCell>{firm.pan || "—"}</TableCell>
                              <TableCell>{firm.poPrefix || "—"}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <EmptyRow colSpan={7} label="No firms added yet" />
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === "systems" && activeItem === "purchase-master" && (
            <div className="space-y-6">
              <Card className="border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Warehouse className="h-4 w-4 text-[#2fa36b]" />
                    Master Table Entry
                  </CardTitle>
                  <CardDescription>
                    Manage master table data for materials, logistics, and other core configuration options.
                  </CardDescription>
                  <CardAction>
                    <Button
                      onClick={() => setIsMasterModalOpen(true)}
                      className="bg-[#2fa36b] hover:bg-[#278f5d] dark:bg-[#5ec792] dark:hover:bg-[#4fb984] text-white dark:text-zinc-900 rounded-full px-6"
                    >
                      Add Master Entry
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="flex items-center justify-between px-6 py-3 bg-zinc-50/50 dark:bg-zinc-900/50 border-y border-zinc-100 dark:border-zinc-800">
                    <span className="text-sm font-medium">Vendors</span>
                    <Badge variant="outline" className="bg-white dark:bg-zinc-900">
                      Total: {vendors.length}
                    </Badge>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                        <TableRow>
                          <TableHead>Vendor Name</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {masterDataLoading ? (
                          <LoadingRows colSpan={1} />
                        ) : vendors.length > 0 ? (
                          vendors.map((row, idx) => (
                            <TableRow key={row.id ?? idx}>
                              <TableCell className="font-medium text-zinc-900 dark:text-white">
                                {row.vendorName}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <EmptyRow colSpan={1} label="No vendors added yet" />
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Truck className="h-4 w-4 text-[#2fa36b]" />
                    Transporters
                  </CardTitle>
                  <CardDescription>
                    Manage transporter records for logistics planning.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="flex items-center justify-end px-6 py-3 bg-zinc-50/50 dark:bg-zinc-900/50 border-y border-zinc-100 dark:border-zinc-800">
                    <Badge variant="outline" className="bg-white dark:bg-zinc-900">
                      Total: {transporters.length}
                    </Badge>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                        <TableRow>
                          <TableHead>Transporter Name</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {masterDataLoading ? (
                          <LoadingRows colSpan={1} />
                        ) : transporters.length > 0 ? (
                          transporters.map((row, idx) => (
                            <TableRow key={row.id ?? idx}>
                              <TableCell className="font-medium text-zinc-900 dark:text-white">
                                {row.transporterName}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <EmptyRow colSpan={1} label="No transporters added yet" />
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4 text-[#2fa36b]" />
                    Raw Materials & Tolerance
                  </CardTitle>
                  <CardDescription>
                    Configure acceptable tolerance parameters for raw materials.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="flex items-center justify-end px-6 py-3 bg-zinc-50/50 dark:bg-zinc-900/50 border-y border-zinc-100 dark:border-zinc-800">
                    <Badge variant="outline" className="bg-white dark:bg-zinc-900">
                      Total: {tlRows.length}
                    </Badge>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                        <TableRow>
                          <TableHead>Product Name</TableHead>
                          <TableHead>Alumina Range</TableHead>
                          <TableHead>Iron Range</TableHead>
                          <TableHead>AP%</TableHead>
                          <TableHead>BD%</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {masterDataLoading ? (
                          <LoadingRows colSpan={5} />
                        ) : tlRows.length > 0 ? (
                          tlRows.map((row, idx) => (
                            <TableRow key={row.id ?? idx}>
                              <TableCell className="font-medium text-zinc-900 dark:text-white">
                                {row.name || "—"}
                              </TableCell>
                              <TableCell>{row.tlAlumina ?? "—"}</TableCell>
                              <TableCell>{row.tlIron ?? "—"}</TableCell>
                              <TableCell>{row.apPercent ?? "—"}</TableCell>
                              <TableCell>{row.bdPercent ?? "—"}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <EmptyRow colSpan={5} label="No raw materials added yet" />
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Add Firm Sheet */}
      <Sheet open={isFirmModalOpen} onOpenChange={setIsFirmModalOpen}>
        <SheetContent className="sm:max-w-[480px]">
          <form onSubmit={handleFirmSubmit} className="flex flex-col h-full min-h-0">
            <SheetHeader>
              <SheetTitle>Add Firm</SheetTitle>
              <SheetDescription>
                Add a new firm to the Firms table. It will appear as an option when generating POs.
              </SheetDescription>
            </SheetHeader>

            <SheetBody className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="firmName">Firm Name *</Label>
                  <Input
                    id="firmName"
                    placeholder="Enter firm name"
                    value={firmFormData.firmName}
                    onChange={(e) => setFirmFormData((prev) => ({ ...prev, firmName: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dataName">Short Name</Label>
                  <Input
                    id="dataName"
                    placeholder="e.g. Rkl"
                    value={firmFormData.dataName}
                    onChange={(e) => setFirmFormData((prev) => ({ ...prev, dataName: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="Enter address"
                  value={firmFormData.address}
                  onChange={(e) => setFirmFormData((prev) => ({ ...prev, address: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="billingAddress">Billing Address</Label>
                <Input
                  id="billingAddress"
                  placeholder="Enter billing address"
                  value={firmFormData.billingAddress}
                  onChange={(e) => setFirmFormData((prev) => ({ ...prev, billingAddress: e.target.value }))}
                />
              </div>

              <div className="h-px bg-border" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="gstin">GSTIN</Label>
                  <Input
                    id="gstin"
                    placeholder="Enter GSTIN"
                    value={firmFormData.gstin}
                    onChange={(e) => setFirmFormData((prev) => ({ ...prev, gstin: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pan">PAN</Label>
                  <Input
                    id="pan"
                    placeholder="Enter PAN"
                    value={firmFormData.pan}
                    onChange={(e) => setFirmFormData((prev) => ({ ...prev, pan: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="Enter phone number"
                    value={firmFormData.phone}
                    onChange={(e) => setFirmFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email"
                    value={firmFormData.email}
                    onChange={(e) => setFirmFormData((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="poPrefix">PO Prefix</Label>
                <Input
                  id="poPrefix"
                  placeholder="e.g. RKL-PO-"
                  value={firmFormData.poPrefix}
                  onChange={(e) => setFirmFormData((prev) => ({ ...prev, poPrefix: e.target.value }))}
                />
              </div>
            </SheetBody>

            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => setIsFirmModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={firmSubmitLoading}>
                {firmSubmitLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Firm
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Add Master Entry Sheet */}
      <Sheet open={isMasterModalOpen} onOpenChange={setIsMasterModalOpen}>
        <SheetContent className="sm:max-w-[425px]">
          <form onSubmit={handleMasterSubmit} className="flex flex-col h-full min-h-0">
            <SheetHeader>
              <SheetTitle>Add Master Entry</SheetTitle>
              <SheetDescription>
                Add new entries to the Master table for dropdowns across the application.
              </SheetDescription>
            </SheetHeader>

            <SheetBody className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="masterType">Type</Label>
                <Select
                  value={masterFormData.type || undefined}
                  onValueChange={(val) =>
                    setMasterFormData((prev) => ({ ...prev, type: val }))
                  }
                >
                  <SelectTrigger id="masterType" className="w-full">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Vendor Name">Vendor Name</SelectItem>
                    <SelectItem value="Transporter">Transporter</SelectItem>
                    <SelectItem value="Raw Material">Raw Material</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {masterFormData.type === "Vendor Name" && (
                <div className="space-y-1.5">
                  <Label htmlFor="vendorName">Vendor Name</Label>
                  <Input
                    id="vendorName"
                    placeholder="Enter vendor name"
                    value={masterFormData.vendorName}
                    onChange={(e) =>
                      setMasterFormData((prev) => ({
                        ...prev,
                        vendorName: e.target.value,
                      }))
                    }
                  />
                </div>
              )}

              {masterFormData.type === "Transporter" && (
                <div className="space-y-1.5">
                  <Label htmlFor="transporterName">Transporter Name</Label>
                  <Input
                    id="transporterName"
                    placeholder="Enter transporter name"
                    value={masterFormData.transporterName}
                    onChange={(e) =>
                      setMasterFormData((prev) => ({
                        ...prev,
                        transporterName: e.target.value,
                      }))
                    }
                  />
                </div>
              )}

              {masterFormData.type === "Raw Material" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="rawMaterialName">Product Name</Label>
                    <Input
                      id="rawMaterialName"
                      placeholder="Enter product name"
                      value={masterFormData.rawMaterialName}
                      onChange={(e) =>
                        setMasterFormData((prev) => ({
                          ...prev,
                          rawMaterialName: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="aluminaRange">Alumina Range</Label>
                      <Input
                        id="aluminaRange"
                        placeholder="Enter alumina range"
                        value={masterFormData.aluminaRange}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({
                            ...prev,
                            aluminaRange: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ironRange">Iron Range</Label>
                      <Input
                        id="ironRange"
                        placeholder="Enter iron range"
                        value={masterFormData.ironRange}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({
                            ...prev,
                            ironRange: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="apRange">AP Range</Label>
                      <Input
                        id="apRange"
                        placeholder="Enter AP range"
                        value={masterFormData.apRange}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({
                            ...prev,
                            apRange: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bdRange">BD Range</Label>
                      <Input
                        id="bdRange"
                        placeholder="Enter BD range"
                        value={masterFormData.bdRange}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({
                            ...prev,
                            bdRange: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </>
              )}
            </SheetBody>

            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsMasterModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={masterSubmitLoading}>
                {masterSubmitLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
