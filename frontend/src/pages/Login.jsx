import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const u = await login(form.email, form.password);
      toast.success(`Welcome back, ${u.name}`);
      navigate(u.role === "admin" ? "/admin" : "/");
    } catch (err) { toast.error(err.response?.data?.detail || "Login failed"); } finally { setLoading(false); }
  };

  return (
    <div className="bg-white">
      <div className="bg-neutral-50 border-b border-neutral-200 py-8">
        <div className="max-w-md mx-auto px-6 text-center">
          <h1 className="font-display text-3xl font-bold uppercase">My Account</h1>
          <div className="text-xs text-neutral-500 mt-1">Home / Login</div>
        </div>
      </div>
      <div className="max-w-md mx-auto px-6 py-12">
        <div className="bg-white border border-neutral-200 rounded-md p-8">
          <h2 className="font-display text-xl font-bold uppercase mb-1">Sign In</h2>
          <p className="text-neutral-500 text-xs mb-6">Welcome back to CarDost</p>
          <form onSubmit={submit} className="space-y-4">
            <div><Label className="text-xs uppercase font-bold text-neutral-700">Email *</Label><Input data-testid="login-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border-neutral-300 mt-1.5"/></div>
            <div><Label className="text-xs uppercase font-bold text-neutral-700">Password *</Label><Input data-testid="login-password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="border-neutral-300 mt-1.5"/></div>
            <Button data-testid="login-submit" disabled={loading} type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 py-6 font-bold uppercase tracking-wider text-xs">{loading ? "Signing in..." : "Sign In"}</Button>
          </form>
          <p className="text-sm text-neutral-600 text-center mt-6">
            New here? <Link to="/signup" data-testid="signup-link" className="text-indigo-600 font-bold hover:underline">Create Account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
