import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api, formatINR } from "@/lib/api";
import { Package, Search, MapPin, Phone, Mail, Receipt, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const STATUS_COLORS = {
  delivered: "bg-emerald-100 text-emerald-700",
  shipped: "bg-blue-100 text-blue-700",
  processing: "bg-indigo-100 text-indigo-700",
  paid: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-stone-200 text-stone-600",
  created: "bg-amber-100 text-amber-700",
  failed: "bg-rose-100 text-rose-700",
};

export default function TrackOrder() {
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    order_id: params.get("order_id") || "",
    email: params.get("email") || "",
    phone: params.get("phone") || "",
  });
  const [orders, setOrders] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.order_id && !form.email && !form.phone) {
      return toast.error("Please enter your order ID, email, or phone number");
    }
    setLoading(true);
    try {
      const { data } = await api.post("/orders/track", {
        order_id: form.order_id.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
      });
      setOrders(data);
      if (data.length === 0) toast.info("No orders found with those details");
    } catch (err) {
      setOrders([]);
      toast.error(err.response?.data?.detail || "Could not find your order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white">
      <div className="bg-stone-50 border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase">Track Your Order</h1>
          <p className="text-stone-500 text-sm mt-1">Enter <strong>any one</strong> — your Order ID, email, or phone — to look up your orders. No account required.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 grid lg:grid-cols-[400px_1fr] gap-8">
        {/* Lookup form */}
        <form onSubmit={submit} className="bg-white border border-stone-200 rounded-xl p-6 space-y-4 h-fit">
          <div>
            <Label className="text-xs uppercase font-bold tracking-wider">Order ID <span className="text-stone-400">(optional)</span></Label>
            <Input data-testid="track-order-id" value={form.order_id} onChange={(e) => setForm({ ...form, order_id: e.target.value })} placeholder="e.g. b0c2599e-..." className="mt-1.5"/>
            <p className="text-[10px] text-stone-500 mt-1">Found in your order confirmation email/SMS.</p>
          </div>
          <div className="text-center text-[10px] uppercase tracking-wider text-stone-400 font-bold">— OR —</div>
          <div>
            <Label className="text-xs uppercase font-bold tracking-wider">Email Address</Label>
            <Input data-testid="track-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" className="mt-1.5"/>
          </div>
          <div>
            <Label className="text-xs uppercase font-bold tracking-wider">Phone Number</Label>
            <Input data-testid="track-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="10-digit mobile" className="mt-1.5"/>
            <p className="text-[10px] text-stone-500 mt-1">Any one of these is enough. Email/phone is matched against the address you used at checkout.</p>
          </div>
          <Button data-testid="track-submit" type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-wider text-sm h-11">
            <Search className="w-4 h-4 mr-2"/>{loading ? "Searching…" : "Find My Order"}
          </Button>
          <p className="text-[10px] text-stone-500 text-center pt-2">Lost your order ID? <a href="mailto:support@cardost.in" className="text-indigo-600 hover:underline">Email Support</a></p>
        </form>

        {/* Results */}
        <div>
          {orders === null && (
            <div className="bg-stone-50 border border-stone-200 border-dashed rounded-xl py-20 px-6 text-center">
              <Package className="w-12 h-12 mx-auto mb-4 text-stone-300"/>
              <h3 className="font-display text-lg font-bold uppercase mb-1">Enter your details</h3>
              <p className="text-sm text-stone-500">We&apos;ll show your order details, status, and tracking info once we find a match.</p>
            </div>
          )}
          {orders !== null && orders.length === 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl py-12 px-6 text-center">
              <h3 className="font-display text-lg font-bold uppercase mb-1 text-rose-700">No orders found</h3>
              <p className="text-sm text-rose-600">Please double-check the details. Order IDs are usually in the email/SMS you received after checkout.</p>
            </div>
          )}
          {orders !== null && orders.length > 0 && (
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-wider font-bold text-stone-500">{orders.length} order{orders.length !== 1 ? "s" : ""} found</p>
              {orders.map((o) => (
                <div key={o.id} data-testid={`tracked-order-${o.id}`} className="bg-white border border-stone-200 rounded-xl overflow-hidden hover:border-indigo-400 transition">
                  <div className="px-5 py-4 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-stone-500"/>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider font-bold text-stone-500">Order #</div>
                        <div className="font-mono text-sm font-bold">{o.id.slice(0, 8).toUpperCase()}</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-bold text-stone-500">Placed on</div>
                      <div className="text-sm">{new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-bold text-stone-500">Total</div>
                      <div className="font-bold text-indigo-600">{formatINR(o.total)}</div>
                    </div>
                    <span data-testid={`tracked-status-${o.id}`} className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_COLORS[o.status] || "bg-stone-100 text-stone-600"}`}>{o.status}</span>
                  </div>

                  <div className="px-5 py-4 grid sm:grid-cols-2 gap-4 border-b border-stone-200">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-bold text-stone-500 mb-1.5">Shipping Address</div>
                      <div className="text-sm leading-relaxed flex gap-2">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5"/>
                        <div>
                          <div className="font-semibold">{o.address?.full_name}</div>
                          <div className="text-stone-600 text-xs">{o.address?.line1}{o.address?.line2 ? `, ${o.address.line2}` : ""}</div>
                          <div className="text-stone-600 text-xs">{o.address?.city}, {o.address?.state} {o.address?.pincode}</div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-xs text-stone-600">
                      <div className="flex items-center gap-1.5"><Phone className="w-3 h-3"/>{o.address?.phone}</div>
                      <div className="flex items-center gap-1.5"><Mail className="w-3 h-3"/>{o.address?.email}</div>
                      {o.shiprocket?.awb_code ? (
                        <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1">
                          <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-700">📦 Shipped</div>
                          <div>AWB: <span className="font-mono font-bold">{o.shiprocket.awb_code}</span></div>
                          {o.shiprocket.courier_name && <div>Courier: <strong>{o.shiprocket.courier_name}</strong></div>}
                          {o.shiprocket.sr_status && <div>Status: <strong className="text-emerald-700">{o.shiprocket.sr_status}</strong></div>}
                          {o.shiprocket.edd && <div>Expected by: {o.shiprocket.edd}</div>}
                          {o.shiprocket.latest_activity && (
                            <div className="pt-1 border-t border-emerald-200 mt-1">
                              <div className="text-[10px] uppercase text-stone-500">Latest update</div>
                              <div>{o.shiprocket.latest_activity}{o.shiprocket.latest_activity_date ? ` · ${o.shiprocket.latest_activity_date}` : ""}</div>
                            </div>
                          )}
                          {o.shiprocket.tracking_url && (
                            <a href={o.shiprocket.tracking_url} target="_blank" rel="noopener noreferrer"
                               className="inline-flex items-center gap-1 mt-1 text-emerald-700 hover:text-emerald-900 font-bold uppercase text-[10px] tracking-wider">
                              Track on courier site →
                            </a>
                          )}
                        </div>
                      ) : o.shiprocket && !o.shiprocket.error && !o.shiprocket.skipped && (
                        <div className="mt-2 text-[10px] text-stone-500 italic">AWB will be assigned by the courier soon. Refresh in a few hours.</div>
                      )}
                    </div>
                  </div>

                  <div className="px-5 py-4 space-y-2">
                    {o.items.map((i, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-sm">
                        <img src={i.image && (i.image.startsWith("http") ? i.image : `${process.env.REACT_APP_BACKEND_URL || ""}${i.image}`)} alt="" className="w-12 h-12 object-cover rounded border border-stone-200"/>
                        <div className="flex-1 min-w-0">
                          <div className="line-clamp-1 font-semibold">{i.name}</div>
                          {i.vehicle_label && <div className="text-[10px] text-emerald-700">🚗 {i.vehicle_label}</div>}
                          <div className="text-xs text-stone-500">Qty {i.quantity} × {formatINR(i.price)}</div>
                        </div>
                        <div className="font-bold">{formatINR(i.line_total)}</div>
                      </div>
                    ))}
                  </div>

                  <Link to={`/order/${o.id}`} className="block px-5 py-3 bg-indigo-50 border-t border-indigo-100 text-xs uppercase font-bold tracking-wider text-indigo-700 hover:bg-indigo-100 transition flex items-center justify-between">
                    View full order details <ChevronRight className="w-4 h-4"/>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
