import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { toast } from "sonner";

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "admin@cardost.com", password: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const u = await login(form.email, form.password);
      if (u.role !== "admin") { toast.error("Not an admin account"); return; }
      toast.success("Welcome, Admin"); navigate("/admin");
    } catch (err) { toast.error(err.response?.data?.detail || "Login failed"); } finally { setLoading(false); }
  };

  return (
    <div className="bg-white min-h-[80vh]">
      <div className="max-w-md mx-auto px-6 py-14">
        <div className="bg-white border-2 border-indigo-600 rounded-md p-8 shadow-lg">
          <Shield className="w-10 h-10 text-indigo-600 mb-4"/>
          <h1 className="font-display text-2xl font-bold uppercase mb-1">Admin Portal</h1>
          <p className="text-xs text-neutral-500 mb-6">Restricted access · Authorized personnel only</p>
          <form onSubmit={submit} className="space-y-4">
            <div><Label className="text-xs uppercase font-bold text-neutral-700">Email *</Label><Input data-testid="admin-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border-neutral-300 mt-1.5"/></div>
            <div><Label className="text-xs uppercase font-bold text-neutral-700">Password *</Label><Input data-testid="admin-password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="border-neutral-300 mt-1.5"/></div>
            <Button data-testid="admin-submit" disabled={loading} type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 py-6 font-bold uppercase tracking-wider text-xs">{loading ? "Signing in..." : "Sign In"}</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
