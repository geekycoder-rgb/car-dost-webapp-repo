import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CreditCard, Truck, Store, ShieldCheck, KeyRound, Eye, EyeOff, Mail, Send } from "lucide-react";

function TestEmailButton({ settings }) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");
  const [sending, setSending] = useState(false);
  const submit = async () => {
    if (!to.trim()) return toast.error("Enter an email to test send");
    setSending(true);
    try {
      await api.post("/admin/test-email", { to: to.trim() });
      toast.success(`Test email sent to ${to.trim()}`);
      setOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Send failed — check logs");
    } finally {
      setSending(false);
    }
  };
  if (!open) {
    return (
      <Button data-testid="smtp-test-open" type="button" onClick={() => { setOpen(true); setTo(settings?.smtp_admin_email || settings?.smtp_from || ""); }}
              className="bg-rose-600 hover:bg-rose-700 text-xs font-bold uppercase tracking-wider">
        <Send className="w-3.5 h-3.5 mr-1.5"/> Send Test Email
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Input data-testid="smtp-test-to" value={to} onChange={(e) => setTo(e.target.value)} placeholder="you@example.com" className="h-9 text-sm w-56"/>
      <Button data-testid="smtp-test-send" disabled={sending} onClick={submit} className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold uppercase">{sending ? "Sending…" : "Send"}</Button>
      <Button onClick={() => setOpen(false)} variant="outline" className="text-xs">×</Button>
    </div>
  );
}

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

const MESH_OPTIONS = [
  { value: "mesh-indigo", label: "Indigo Wave" },
  { value: "mesh-stereo", label: "Stereo Pulse" },
  { value: "mesh-speakers", label: "Speaker Glow" },
  { value: "mesh-amber", label: "Amber Flame" },
  { value: "mesh-emerald", label: "Emerald Rush" },
  { value: "mesh-rose", label: "Rose Neon" },
  { value: "mesh-cyan", label: "Cyan Surge" },
  { value: "mesh-violet", label: "Violet Dream" },
  { value: "mesh-slate", label: "Slate Fusion" },
];

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
      className={`relative inline-flex items-center h-9 w-[88px] rounded-full transition-colors duration-200 font-bold uppercase tracking-wider text-[11px] focus:outline-none focus:ring-2 focus:ring-offset-2 shrink-0 ${checked ? "bg-emerald-500 text-white ring-emerald-300" : "bg-stone-300 text-stone-600 ring-stone-300"}`}
    >
      <span className={`absolute h-7 w-7 rounded-full bg-white shadow-md transition-transform duration-200 ${checked ? "translate-x-[54px]" : "translate-x-1"}`}/>
      <span className={`absolute ${checked ? "left-3" : "right-3"} pointer-events-none`}>
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

  const regenerateSitemap = async () => {
    try {
      const { data } = await api.post("/admin/sitemap/regenerate");
      toast.success(`Sitemap regenerated — ${data.url_count} URL${data.url_count === 1 ? "" : "s"} (wrote ${data.written.length} file${data.written.length === 1 ? "" : "s"})`);
    } catch (err) {
      const d = err.response?.data?.detail;
      toast.error(typeof d === "string" ? d : "Regenerate failed");
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
          <div className="flex items-center justify-between gap-4 px-4 py-3.5 bg-stone-50 rounded-xl border border-stone-200">
            <div className="min-w-0">
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
        <div className="flex items-center justify-between gap-4 px-4 py-3.5 bg-emerald-50/40 rounded-xl border border-emerald-200 mb-4">
          <div className="min-w-0">
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

      {/* Homepage Promo Cards */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-stone-200">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 grid place-items-center text-indigo-600"><Store className="w-5 h-5"/></div>
          <div>
            <h2 className="font-display text-lg font-bold text-stone-950">Homepage Promo Cards</h2>
            <p className="text-xs text-stone-500">Edit the stereo and speaker promo blocks shown below New Arrivals.</p>
          </div>
        </div>
        <div className="grid gap-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase font-bold text-stone-700">Card A Title</Label>
              <Input value={s.home_card_a_title || ""} onChange={c("home_card_a_title")} className="mt-1"/>
            </div>
            <div>
              <Label className="text-xs uppercase font-bold text-stone-700">Card B Title</Label>
              <Input value={s.home_card_b_title || ""} onChange={c("home_card_b_title")} className="mt-1"/>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase font-bold text-stone-700">Card A Subtitle</Label>
              <Input value={s.home_card_a_subtitle || ""} onChange={c("home_card_a_subtitle")} className="mt-1"/>
            </div>
            <div>
              <Label className="text-xs uppercase font-bold text-stone-700">Card B Subtitle</Label>
              <Input value={s.home_card_b_subtitle || ""} onChange={c("home_card_b_subtitle")} className="mt-1"/>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase font-bold text-stone-700">Card A Badge</Label>
              <Input value={s.home_card_a_badge || ""} onChange={c("home_card_a_badge")} className="mt-1"/>
            </div>
            <div>
              <Label className="text-xs uppercase font-bold text-stone-700">Card B Badge</Label>
              <Input value={s.home_card_b_badge || ""} onChange={c("home_card_b_badge")} className="mt-1"/>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase font-bold text-stone-700">Card A CTA Text</Label>
              <Input value={s.home_card_a_cta_text || ""} onChange={c("home_card_a_cta_text")} className="mt-1" placeholder="Shop Now"/>
            </div>
            <div>
              <Label className="text-xs uppercase font-bold text-stone-700">Card B CTA Text</Label>
              <Input value={s.home_card_b_cta_text || ""} onChange={c("home_card_b_cta_text")} className="mt-1" placeholder="Shop Now"/>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase font-bold text-stone-700">Card A Link</Label>
              <Input value={s.home_card_a_cta_link || ""} onChange={c("home_card_a_cta_link")} className="mt-1" placeholder="/shop?category=android-stereos"/>
            </div>
            <div>
              <Label className="text-xs uppercase font-bold text-stone-700">Card B Link</Label>
              <Input value={s.home_card_b_cta_link || ""} onChange={c("home_card_b_cta_link")} className="mt-1" placeholder="/shop?category=speakers"/>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase font-bold text-stone-700">Card A Image URL</Label>
              <Input value={s.home_card_a_image || ""} onChange={c("home_card_a_image")} className="mt-1" placeholder="https://..."/>
            </div>
            <div>
              <Label className="text-xs uppercase font-bold text-stone-700">Card B Image URL</Label>
              <Input value={s.home_card_b_image || ""} onChange={c("home_card_b_image")} className="mt-1" placeholder="https://..."/>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase font-bold text-stone-700">Card A Mesh Style</Label>
              <Select value={s.home_card_a_mesh || "mesh-stereo"} onValueChange={(v) => setS({ ...s, home_card_a_mesh: v })}>
                <SelectTrigger className="mt-1"><SelectValue/></SelectTrigger>
                <SelectContent>{MESH_OPTIONS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase font-bold text-stone-700">Card B Mesh Style</Label>
              <Select value={s.home_card_b_mesh || "mesh-speakers"} onValueChange={(v) => setS({ ...s, home_card_b_mesh: v })}>
                <SelectTrigger className="mt-1"><SelectValue/></SelectTrigger>
                <SelectContent>{MESH_OPTIONS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* SMTP Email */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-stone-200">
          <div className="w-10 h-10 rounded-xl bg-rose-50 grid place-items-center text-rose-600"><Mail className="w-5 h-5"/></div>
          <div>
            <h2 className="font-display text-lg font-bold text-stone-950">Order &amp; Notification Emails</h2>
            <p className="text-xs text-stone-500">Send order confirmations to customers and alerts to admin via SMTP (GoDaddy, Gmail, Office 365, etc.)</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 px-4 py-3.5 bg-emerald-50/40 rounded-xl border border-emerald-200 mb-4">
          <div className="min-w-0">
            <Label className="text-sm uppercase font-bold text-stone-800">Enable Email Notifications</Label>
            <p className="text-[11px] text-stone-600 mt-0.5">When ON, customers get order confirmations and you get a copy + new-contact alerts.</p>
          </div>
          <TogglePill testid="set-smtp-toggle" checked={!!s.smtp_enabled} onChange={toggleAndSave("smtp_enabled")}/>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs uppercase font-bold text-stone-700">SMTP Host</Label>
            <Input data-testid="set-smtp-host" value={s.smtp_host || ""} onChange={c("smtp_host")} placeholder="smtpout.secureserver.net" className="border-stone-300 mt-1.5"/>
            <p className="text-[10px] text-stone-500 mt-1">GoDaddy: <code>smtpout.secureserver.net</code> · Gmail: <code>smtp.gmail.com</code></p>
          </div>
          <div>
            <Label className="text-xs uppercase font-bold text-stone-700">Port</Label>
            <Input data-testid="set-smtp-port" type="number" value={s.smtp_port || 587} onChange={c("smtp_port")} placeholder="587" className="border-stone-300 mt-1.5"/>
            <p className="text-[10px] text-stone-500 mt-1">587 (TLS · default) or 465 (SSL)</p>
          </div>
          <div>
            <Label className="text-xs uppercase font-bold text-stone-700">Username / Email</Label>
            <Input data-testid="set-smtp-user" value={s.smtp_username || ""} onChange={c("smtp_username")} placeholder="customercare@cardost.in" className="border-stone-300 mt-1.5"/>
          </div>
          {sec("smtp_password","Password","smtp_password_masked","Mailbox password")}
          <div>
            <Label className="text-xs uppercase font-bold text-stone-700">&quot;From&quot; Display Email</Label>
            <Input data-testid="set-smtp-from" value={s.smtp_from || ""} onChange={c("smtp_from")} placeholder="customercare@cardost.in" className="border-stone-300 mt-1.5"/>
            <p className="text-[10px] text-stone-500 mt-1">Usually same as username</p>
          </div>
          <div>
            <Label className="text-xs uppercase font-bold text-stone-700">Admin Notification Email</Label>
            <Input data-testid="set-smtp-admin" value={s.smtp_admin_email || ""} onChange={c("smtp_admin_email")} placeholder="customercare@cardost.in" className="border-stone-300 mt-1.5"/>
            <p className="text-[10px] text-stone-500 mt-1">Fallback if specific alias inboxes below are empty</p>
          </div>
        </div>

        {/* Purpose-specific sender aliases */}
        <div className="mt-6 border-t border-stone-200 pt-5">
          <h3 className="text-xs uppercase font-bold tracking-wider text-stone-700 mb-1">Sender Aliases by Purpose</h3>
          <p className="text-[10px] text-stone-500 mb-4">All emails authenticate through the master mailbox above, but are sent <strong>FROM</strong> these aliases so customers know which inbox to reply to.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-[10px] uppercase font-bold text-stone-600">📦 Orders (From)</Label>
              <Input data-testid="set-email-order-from" value={s.email_order_from || ""} onChange={c("email_order_from")} placeholder="order@cardost.in" className="border-stone-300 mt-1"/>
              <p className="text-[10px] text-stone-500 mt-1">Order confirmation, cancellation, delivery</p>
            </div>
            <div>
              <Label className="text-[10px] uppercase font-bold text-stone-600">🔄 Updates (From)</Label>
              <Input data-testid="set-email-update-from" value={s.email_update_from || ""} onChange={c("email_update_from")} placeholder="update@cardost.in" className="border-stone-300 mt-1"/>
              <p className="text-[10px] text-stone-500 mt-1">Order status / shipping updates</p>
            </div>
            <div>
              <Label className="text-[10px] uppercase font-bold text-stone-600">💬 Support (From / Reply-To)</Label>
              <Input data-testid="set-email-support-from" value={s.email_support_from || ""} onChange={c("email_support_from")} placeholder="support@cardost.in" className="border-stone-300 mt-1"/>
              <p className="text-[10px] text-stone-500 mt-1">Used as Reply-To on customer emails</p>
            </div>
            <div>
              <Label className="text-[10px] uppercase font-bold text-stone-600">📢 Info / Promotional (From)</Label>
              <Input data-testid="set-email-info-from" value={s.email_info_from || ""} onChange={c("email_info_from")} placeholder="info@cardost.in" className="border-stone-300 mt-1"/>
              <p className="text-[10px] text-stone-500 mt-1">Newsletters &amp; marketing campaigns</p>
            </div>
          </div>
        </div>

        {/* Purpose-specific admin inboxes */}
        <div className="mt-6 border-t border-stone-200 pt-5">
          <h3 className="text-xs uppercase font-bold tracking-wider text-stone-700 mb-1">Admin Recipient Inboxes</h3>
          <p className="text-[10px] text-stone-500 mb-4">Where each type of alert lands.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-[10px] uppercase font-bold text-stone-600">🛒 New Order Alerts → To</Label>
              <Input data-testid="set-email-admin-to" value={s.email_admin_to || ""} onChange={c("email_admin_to")} placeholder="admin@cardost.in" className="border-stone-300 mt-1"/>
            </div>
            <div>
              <Label className="text-[10px] uppercase font-bold text-stone-600">📨 Contact / Sales Enquiries → To</Label>
              <Input data-testid="set-email-sales-to" value={s.email_sales_to || ""} onChange={c("email_sales_to")} placeholder="sales@cardost.in" className="border-stone-300 mt-1"/>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-[10px] uppercase font-bold text-stone-600">🧑‍🔧 Support Inbox → To</Label>
              <Input data-testid="set-email-support-to" value={s.email_support_to || ""} onChange={c("email_support_to")} placeholder="support@cardost.in" className="border-stone-300 mt-1"/>
            </div>
          </div>
        </div>
        <div className="mt-5 pt-5 border-t border-stone-200">
          <p className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">⚠️ Low-Stock Alerts</p>
          <p className="text-[10px] text-stone-500 mb-4">Email admin when product stock falls to/below the threshold (debounced 24h per product).</p>
          <div className="grid sm:grid-cols-3 gap-4 items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                data-testid="set-low-stock-enabled"
                type="checkbox"
                checked={s.low_stock_alerts_enabled !== false}
                onChange={(e) => setS({ ...s, low_stock_alerts_enabled: e.target.checked })}
                className="w-4 h-4"
              />
              <Label className="text-xs uppercase font-bold text-stone-700 cursor-pointer">Enable alerts</Label>
            </label>
            <div>
              <Label className="text-[10px] uppercase font-bold text-stone-600">Threshold (units)</Label>
              <Input
                data-testid="set-low-stock-threshold"
                type="number"
                min="1"
                value={s.low_stock_threshold ?? 5}
                onChange={(e) => setS({ ...s, low_stock_threshold: parseInt(e.target.value || "5", 10) })}
                className="border-stone-300 mt-1"
              />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 px-4 py-3 bg-stone-50 rounded-lg border border-stone-200">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              data-testid="set-smtp-ssl"
              type="checkbox"
              checked={!!s.smtp_use_ssl}
              onChange={(e) => setS({ ...s, smtp_use_ssl: e.target.checked })}
              className="w-4 h-4"
            />
            <Label className="text-xs uppercase font-bold text-stone-700 cursor-pointer">Use SSL (port 465)</Label>
          </label>
          <TestEmailButton settings={s} />
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

      {/* SEO / Sitemap */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-stone-200">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 grid place-items-center text-emerald-600 font-bold">🗺️</div>
          <div>
            <h2 className="font-display text-lg font-bold text-stone-950">SEO / Sitemap</h2>
            <p className="text-xs text-stone-500">Auto-regenerates whenever you add, edit, or delete a product/category. Click below to refresh on demand.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button data-testid="regen-sitemap-btn" onClick={regenerateSitemap} className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold uppercase">
            Regenerate Sitemap Now
          </Button>
          <a data-testid="view-sitemap-link" href="/sitemap.xml" target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline font-semibold">View /sitemap.xml →</a>
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
