import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { toast } from "sonner";

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "admin@cardost.in", password: "" });
  const [loading, setLoading] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [changeForm, setChangeForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const u = await login(form.email, form.password);
      if (u.role !== "admin") { toast.error("Not an admin account"); return; }
      toast.success("Welcome, Admin"); navigate("/admin");
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (err.response?.status === 403 && detail?.code === "PASSWORD_CHANGE_REQUIRED") {
        setMustChangePassword(true);
        setChangeForm((f) => ({ ...f, current_password: form.password }));
        toast.error("Password change required before admin login.");
      } else {
        toast.error(typeof detail === "string" ? detail : "Login failed");
      }
    } finally { setLoading(false); }
  };

  const submitPasswordChange = async (e) => {
    e.preventDefault();
    if (changeForm.new_password.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (changeForm.new_password !== changeForm.confirm_password) {
      toast.error("New password and confirmation do not match");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/admin/first-login-password-change", {
          email: form.email,
          current_password: changeForm.current_password,
          new_password: changeForm.new_password,
      });

      const u = await login(form.email, changeForm.new_password);
      if (u.role !== "admin") {
        toast.error("Not an admin account");
        return;
      }
      setForm((f) => ({ ...f, password: "" }));
      setMustChangePassword(false);
      setChangeForm({ current_password: "", new_password: "", confirm_password: "" });
      toast.success("Password updated. Welcome, Admin");
      navigate("/admin");
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Password change failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white min-h-[80vh]">
      <div className="max-w-md mx-auto px-6 py-14">
        <div className="bg-white border-2 border-indigo-600 rounded-md p-8 shadow-lg">
          <Shield className="w-10 h-10 text-indigo-600 mb-4"/>
          <h1 className="font-display text-2xl font-bold uppercase mb-1">Admin Portal</h1>
          <p className="text-xs text-neutral-500 mb-6">Restricted access · Authorized personnel only</p>
          {!mustChangePassword ? (
            <form onSubmit={submit} className="space-y-4">
              <div><Label className="text-xs uppercase font-bold text-neutral-700">Email *</Label><Input data-testid="admin-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border-neutral-300 mt-1.5"/></div>
              <div><Label className="text-xs uppercase font-bold text-neutral-700">Password *</Label><Input data-testid="admin-password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="border-neutral-300 mt-1.5"/></div>
              <Button data-testid="admin-submit" disabled={loading} type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 py-6 font-bold uppercase tracking-wider text-xs">{loading ? "Signing in..." : "Sign In"}</Button>
            </form>
          ) : (
            <form onSubmit={submitPasswordChange} className="space-y-4" data-testid="admin-first-password-change-form">
              <div className="rounded-md border border-amber-300 bg-amber-50 text-amber-900 text-xs p-3">
                First-time admin password rotation is required.
              </div>
              <div><Label className="text-xs uppercase font-bold text-neutral-700">Admin Email *</Label><Input data-testid="admin-change-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border-neutral-300 mt-1.5"/></div>
              <div><Label className="text-xs uppercase font-bold text-neutral-700">Current Password *</Label><Input data-testid="admin-current-password" type="password" required value={changeForm.current_password} onChange={(e) => setChangeForm({ ...changeForm, current_password: e.target.value })} className="border-neutral-300 mt-1.5"/></div>
              <div><Label className="text-xs uppercase font-bold text-neutral-700">New Password *</Label><Input data-testid="admin-new-password" type="password" required value={changeForm.new_password} onChange={(e) => setChangeForm({ ...changeForm, new_password: e.target.value })} className="border-neutral-300 mt-1.5"/></div>
              <div><Label className="text-xs uppercase font-bold text-neutral-700">Confirm New Password *</Label><Input data-testid="admin-confirm-password" type="password" required value={changeForm.confirm_password} onChange={(e) => setChangeForm({ ...changeForm, confirm_password: e.target.value })} className="border-neutral-300 mt-1.5"/></div>
              <Button data-testid="admin-change-password-submit" disabled={loading} type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 py-6 font-bold uppercase tracking-wider text-xs">{loading ? "Updating password..." : "Update Password & Continue"}</Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
