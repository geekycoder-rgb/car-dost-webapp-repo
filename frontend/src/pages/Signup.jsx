import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await signup(form); toast.success("Account created"); navigate("/"); }
    catch (err) { toast.error(err.response?.data?.detail || "Signup failed"); }
    finally { setLoading(false); }
  };
  const c = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="bg-white">
      <div className="bg-neutral-50 border-b border-neutral-200 py-8">
        <div className="max-w-md mx-auto px-6 text-center">
          <h1 className="font-display text-3xl font-bold uppercase">Create Account</h1>
          <div className="text-xs text-neutral-500 mt-1">Home / Sign Up</div>
        </div>
      </div>
      <div className="max-w-md mx-auto px-6 py-12">
        <div className="bg-white border border-neutral-200 rounded-md p-8">
          <h2 className="font-display text-xl font-bold uppercase mb-1">Sign Up</h2>
          <p className="text-neutral-500 text-xs mb-6">Join CarDost for exclusive offers</p>
          <form onSubmit={submit} className="space-y-4">
            <div><Label className="text-xs uppercase font-bold text-neutral-700">Name *</Label><Input data-testid="signup-name" required value={form.name} onChange={c("name")} className="border-neutral-300 mt-1.5"/></div>
            <div><Label className="text-xs uppercase font-bold text-neutral-700">Email *</Label><Input data-testid="signup-email" type="email" required value={form.email} onChange={c("email")} className="border-neutral-300 mt-1.5"/></div>
            <div><Label className="text-xs uppercase font-bold text-neutral-700">Phone</Label><Input data-testid="signup-phone" value={form.phone} onChange={c("phone")} className="border-neutral-300 mt-1.5"/></div>
            <div><Label className="text-xs uppercase font-bold text-neutral-700">Password *</Label><Input data-testid="signup-password" type="password" required minLength={6} value={form.password} onChange={c("password")} className="border-neutral-300 mt-1.5"/></div>
            <Button data-testid="signup-submit" disabled={loading} type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 py-6 font-bold uppercase tracking-wider text-xs">{loading ? "Creating..." : "Create Account"}</Button>
          </form>
          <p className="text-sm text-neutral-600 text-center mt-6">
            Have an account? <Link to="/login" className="text-indigo-600 font-bold hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
