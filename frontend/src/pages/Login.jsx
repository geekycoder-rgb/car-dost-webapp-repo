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
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(form.email, form.password);
      toast.success(`Welcome back, ${u.name}`);
      navigate(u.role === "admin" ? "/admin" : "/");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-8">
        <h1 className="font-display text-3xl font-black tracking-tighter mb-2">Welcome Back</h1>
        <p className="text-neutral-400 text-sm mb-8">Sign in to your CarDost account</p>
        <form onSubmit={submit} className="space-y-4">
          <div><Label>Email</Label><Input data-testid="login-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-[#0A0A0A] border-[#262626] mt-1"/></div>
          <div><Label>Password</Label><Input data-testid="login-password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="bg-[#0A0A0A] border-[#262626] mt-1"/></div>
          <Button data-testid="login-submit" disabled={loading} type="submit" className="w-full bg-red-500 hover:bg-red-600 py-6">{loading ? "Signing in..." : "Sign In"}</Button>
        </form>
        <p className="text-sm text-neutral-400 text-center mt-6">
          New here? <Link to="/signup" data-testid="signup-link" className="text-red-400 hover:underline">Create account</Link>
        </p>
      </div>
    </div>
  );
}
