import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Camera, Sun, Moon } from 'lucide-react';
import { toast } from 'sonner';
import { useOutletContext } from 'react-router-dom';
import { API_URL, getToken, getStoredUser } from '@/lib/auth';

export default function ProfileTab() {
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
    <div className="space-y-6 w-full max-w-4xl">
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

