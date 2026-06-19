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
    e.preventDefault();
    setLoading(true);
    try {
      await signup(form);
      toast.success("Account created");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const c = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-8">
        <h1 className="font-display text-3xl font-black tracking-tighter mb-2">Create Account</h1>
        <p className="text-neutral-400 text-sm mb-8">Join CarDost for exclusive deals</p>
        <form onSubmit={submit} className="space-y-4">
          <div><Label>Name</Label><Input data-testid="signup-name" required value={form.name} onChange={c("name")} className="bg-[#0A0A0A] border-[#262626] mt-1"/></div>
          <div><Label>Email</Label><Input data-testid="signup-email" type="email" required value={form.email} onChange={c("email")} className="bg-[#0A0A0A] border-[#262626] mt-1"/></div>
          <div><Label>Phone</Label><Input data-testid="signup-phone" value={form.phone} onChange={c("phone")} className="bg-[#0A0A0A] border-[#262626] mt-1"/></div>
          <div><Label>Password</Label><Input data-testid="signup-password" type="password" required minLength={6} value={form.password} onChange={c("password")} className="bg-[#0A0A0A] border-[#262626] mt-1"/></div>
          <Button data-testid="signup-submit" disabled={loading} type="submit" className="w-full bg-red-500 hover:bg-red-600 py-6">{loading ? "Creating..." : "Create Account"}</Button>
        </form>
        <p className="text-sm text-neutral-400 text-center mt-6">
          Have an account? <Link to="/login" className="text-red-400 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
