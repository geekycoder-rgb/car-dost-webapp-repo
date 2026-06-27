import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { LOGIN } from "@/constants/testIds/auth";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      toast.success("If an account exists, reset instructions have been sent to your email.");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Unable to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white">
      <div className="bg-neutral-50 border-b border-neutral-200 py-8">
        <div className="max-w-md mx-auto px-6 text-center">
          <h1 className="font-display text-3xl font-bold uppercase">Forgot Password</h1>
          <div className="text-xs text-neutral-500 mt-1">Home / Login / Forgot Password</div>
        </div>
      </div>
      <div className="max-w-md mx-auto px-6 py-12">
        <div className="bg-white border border-neutral-200 rounded-md p-8">
          <h2 className="font-display text-xl font-bold uppercase mb-1">Reset your password</h2>
          <p className="text-neutral-500 text-xs mb-6">Enter your account email and we’ll send a secure reset link.</p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label className="text-xs uppercase font-bold text-neutral-700">Email *</Label>
              <Input
                data-testid="forgot-password-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-neutral-300 mt-1.5"
              />
            </div>
            <Button
              data-testid="forgot-password-submit-button"
              disabled={loading}
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 py-6 font-bold uppercase tracking-wider text-xs"
            >
              {loading ? "Sending..." : "Send reset link"}
            </Button>
          </form>
          <p className="text-sm text-neutral-600 text-center mt-6">
            Remembered it? <Link to="/login" className="text-indigo-600 font-bold hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
