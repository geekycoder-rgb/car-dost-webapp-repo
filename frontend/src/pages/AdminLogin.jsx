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
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(form.email, form.password);
      if (u.role !== "admin") { toast.error("Not an admin account"); return; }
      toast.success("Welcome, Admin");
      navigate("/admin");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-8">
        <Shield className="w-10 h-10 text-red-500 mb-4"/>
        <h1 className="font-display text-3xl font-black tracking-tighter mb-2">Admin Portal</h1>
        <p className="text-neutral-400 text-sm mb-8">Restricted access</p>
        <form onSubmit={submit} className="space-y-4">
          <div><Label>Email</Label><Input data-testid="admin-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-[#0A0A0A] border-[#262626] mt-1"/></div>
          <div><Label>Password</Label><Input data-testid="admin-password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="bg-[#0A0A0A] border-[#262626] mt-1"/></div>
          <Button data-testid="admin-submit" disabled={loading} type="submit" className="w-full bg-red-500 hover:bg-red-600 py-6">{loading ? "Signing in..." : "Sign In"}</Button>
        </form>
      </div>
    </div>
  );
}
