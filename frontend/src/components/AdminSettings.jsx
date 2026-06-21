import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { CreditCard, Truck, Store, ShieldCheck, KeyRound, Eye, EyeOff } from "lucide-react";

function SecretInput({ name, label, maskedKey, placeholder, s, setS, showSecrets, setShowSecrets }) {
  const visible = showSecrets[name];
  const masked = s[maskedKey];
  return (
    <div>
      <Label className="text-xs uppercase font-bold text-stone-700">{label}</Label>
      <div className="relative mt-1.5">
        <Input
          data-testid={`set-${name}`}
          type={visible ? "text" : "password"}
          value={s[name] || ""}
          placeholder={masked || placeholder}
          onChange={(e) => setS({ ...s, [name]: e.target.value })}
          className="pr-10 border-stone-300"
        />
        <button type="button" onClick={() => setShowSecrets({ ...showSecrets, [name]: !visible })}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700">
          {visible ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
        </button>
      </div>
      {masked && <div className="text-[10px] text-stone-500 mt-1">Current: <span className="font-mono">{masked}</span></div>}
    </div>
  );
}

export default function AdminSettings() {
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState({});

  useEffect(() => { api.get("/admin/settings").then((r) => setS(r.data)); }, []);

  if (!s) return <div className="text-stone-500">Loading settings...</div>;

  const c = (k) => (e) => setS({ ...s, [k]: e.target.value });
  const t = (k) => (v) => setS({ ...s, [k]: v });

  // Auto-save for single toggle changes — no need to scroll & click Save
  const toggleAndSave = (k) => async (v) => {
    const next = { ...s, [k]: v };
    setS(next);
    try {
      await api.put("/admin/settings", { [k]: v });
      toast.success(`${v ? "Enabled" : "Disabled"} ${k === "shiprocket_enabled" ? "Shiprocket auto-sync" : "Mock payment mode"}`);
      const fresh = await api.get("/admin/settings");
      setS(fresh.data);
    } catch (err) {
      toast.error("Could not save toggle");
      setS({ ...s, [k]: !v }); // revert
    }
  };

  // Big ON/OFF pill toggle — clearer than the tiny switch
  // eslint-disable-next-line react/no-unstable-nested-components
  const TogglePill = ({ checked, onChange, testid, onLabel = "ON", offLabel = "OFF" }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-state={checked ? "checked" : "unchecked"}
      data-testid={testid}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex items-center h-9 w-[88px] rounded-full transition-colors duration-200 font-bold uppercase tracking-wider text-[11px] focus:outline-none focus:ring-2 focus:ring-offset-2 ${checked ? "bg-emerald-500 text-white ring-emerald-300" : "bg-stone-300 text-stone-600 ring-stone-300"}`}
    >
      <span className={`absolute h-7 w-7 rounded-full bg-white shadow-md transition-transform duration-200 ${checked ? "translate-x-[54px]" : "translate-x-1"}`}/>
      <span className={`absolute ${checked ? "left-3" : "right-3"}`}>
        {checked ? onLabel : offLabel}
      </span>
    </button>
  );

  const save = async () => {
    setSaving(true);
    try {
      const body = {};
      Object.entries(s).forEach(([k, v]) => {
        if (k.endsWith("_masked") || k === "id" || k === "_id") return;
        if (typeof v === "string" && v.startsWith("••••")) return; // skip unchanged masked
        body[k] = v;
      });
      await api.put("/admin/settings", body);
      toast.success("Settings saved");
      const fresh = await api.get("/admin/settings");
      setS(fresh.data);
    } catch (err) {
      const d = err.response?.data?.detail;
      toast.error(typeof d === "string" ? d : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // helper that returns SecretInput element with shared state bound
  const sec = (name, label, maskedKey, placeholder) =>
    <SecretInput name={name} label={label} maskedKey={maskedKey} placeholder={placeholder} s={s} setS={setS} showSecrets={showSecrets} setShowSecrets={setShowSecrets}/>;

  return (
    <div className="space-y-6">
      {/* Razorpay */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-stone-200">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 grid place-items-center text-indigo-600"><CreditCard className="w-5 h-5"/></div>
          <div>
            <h2 className="font-display text-lg font-bold text-stone-950">Razorpay Payment Gateway</h2>
            <p className="text-xs text-stone-500">Save your live or test keys from dashboard.razorpay.com</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs uppercase font-bold text-stone-700">Key ID</Label>
            <Input data-testid="set-rzp-kid" value={s.razorpay_key_id || ""} onChange={c("razorpay_key_id")} placeholder="rzp_test_xxxxx or rzp_live_xxxxx" className="border-stone-300 mt-1.5"/>
          </div>
          {sec("razorpay_key_secret","Key Secret","razorpay_key_secret_masked","••••••••")}
          {sec("razorpay_webhook_secret","Webhook Secret","razorpay_webhook_secret_masked","Set on Razorpay → Webhooks → Add")}
          <div className="flex items-center justify-between gap-3 px-3 py-3 bg-stone-50 rounded-xl border border-stone-200">
            <div>
              <Label className="text-xs uppercase font-bold text-stone-700">Mock Mode</Label>
              <p className="text-[10px] text-stone-500 mt-0.5">Simulate payments (no real Razorpay popup)</p>
            </div>
            <TogglePill testid="set-mock-toggle" checked={!!s.mock_payment} onChange={toggleAndSave("mock_payment")}/>
          </div>
        </div>
        <div className="mt-4 text-[10px] text-stone-500 flex gap-2 items-start">
          <ShieldCheck className="w-3.5 h-3.5 mt-0.5 text-emerald-500 shrink-0"/>
          <span>Webhook endpoint: <code className="font-mono text-indigo-600">POST /api/razorpay/webhook</code> — listens for <code>payment.captured</code>, <code>payment.authorized</code>, <code>order.paid</code>.</span>
        </div>
      </div>

      {/* Shiprocket */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-stone-200">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 grid place-items-center text-emerald-600"><Truck className="w-5 h-5"/></div>
          <div>
            <h2 className="font-display text-lg font-bold text-stone-950">Shiprocket Logistics</h2>
            <p className="text-xs text-stone-500">Auto-create shipment orders after successful payment</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3.5 bg-emerald-50/40 rounded-xl border border-emerald-200 mb-4">
          <div>
            <Label className="text-sm uppercase font-bold text-stone-800">Enable Shiprocket Auto-Sync</Label>
            <p className="text-[11px] text-stone-600 mt-0.5">When ON, every paid order will be forwarded to Shiprocket automatically.</p>
          </div>
          <TogglePill testid="set-ship-toggle" checked={!!s.shiprocket_enabled} onChange={toggleAndSave("shiprocket_enabled")}/>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs uppercase font-bold text-stone-700">Email / Username</Label>
            <Input data-testid="set-ship-email" value={s.shiprocket_email || ""} onChange={c("shiprocket_email")} placeholder="you@example.com" className="border-stone-300 mt-1.5"/>
          </div>
          {sec("shiprocket_password","Password","shiprocket_password_masked","••••••••")}
          <div>
            <Label className="text-xs uppercase font-bold text-stone-700">Channel ID</Label>
            <Input data-testid="set-ship-channel" value={s.shiprocket_channel_id || ""} onChange={c("shiprocket_channel_id")} placeholder="e.g. 1234567" className="border-stone-300 mt-1.5"/>
          </div>
          <div>
            <Label className="text-xs uppercase font-bold text-stone-700">Pickup Location</Label>
            <Input data-testid="set-ship-pickup" value={s.shiprocket_pickup_location || ""} onChange={c("shiprocket_pickup_location")} placeholder="Primary" className="border-stone-300 mt-1.5"/>
          </div>
        </div>
      </div>

      {/* Store */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-stone-200">
          <div className="w-10 h-10 rounded-xl bg-amber-50 grid place-items-center text-amber-600"><Store className="w-5 h-5"/></div>
          <div>
            <h2 className="font-display text-lg font-bold text-stone-950">Store Profile</h2>
            <p className="text-xs text-stone-500">Public-facing branding & contact info</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div><Label className="text-xs uppercase font-bold text-stone-700">Store Name</Label><Input value={s.store_name || ""} onChange={c("store_name")} className="border-stone-300 mt-1.5"/></div>
          <div><Label className="text-xs uppercase font-bold text-stone-700">Support Email</Label><Input value={s.support_email || ""} onChange={c("support_email")} className="border-stone-300 mt-1.5"/></div>
          <div><Label className="text-xs uppercase font-bold text-stone-700">Support Phone</Label><Input value={s.support_phone || ""} onChange={c("support_phone")} className="border-stone-300 mt-1.5"/></div>
        </div>
      </div>

      <div className="sticky bottom-0 bg-stone-50/90 backdrop-blur p-4 -mx-6 px-6 border-t border-stone-200 flex justify-end">
        <Button data-testid="save-settings" disabled={saving} onClick={save} className="bg-indigo-600 hover:bg-indigo-700 px-8 py-6 font-bold uppercase tracking-wider text-xs">
          <KeyRound className="w-4 h-4 mr-2"/> {saving ? "Saving..." : "Save All Settings"}
        </Button>
      </div>
    </div>
  );
}
