import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      toast.success("Password reset successfully. You can now sign in.");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white">
      <div className="bg-neutral-50 border-b border-neutral-200 py-8">
        <div className="max-w-md mx-auto px-6 text-center">
          <h1 className="font-display text-3xl font-bold uppercase">Reset Password</h1>
          <div className="text-xs text-neutral-500 mt-1">Home / Login / Reset Password</div>
        </div>
      </div>
      <div className="max-w-md mx-auto px-6 py-12">
        <div className="bg-white border border-neutral-200 rounded-md p-8">
          <h2 className="font-display text-xl font-bold uppercase mb-1">Choose a new password</h2>
          <p className="text-neutral-500 text-xs mb-6">Enter the password you want to use for your CarDost account.</p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label className="text-xs uppercase font-bold text-neutral-700">New Password *</Label>
              <Input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-neutral-300 mt-1.5"
              />
            </div>
            <div>
              <Label className="text-xs uppercase font-bold text-neutral-700">Confirm Password *</Label>
              <Input
                type="password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="border-neutral-300 mt-1.5"
              />
            </div>
            <Button
              disabled={loading || !token}
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 py-6 font-bold uppercase tracking-wider text-xs"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
          <p className="text-sm text-neutral-600 text-center mt-6">
            <Link to="/login" className="text-indigo-600 font-bold hover:underline">Back to Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
