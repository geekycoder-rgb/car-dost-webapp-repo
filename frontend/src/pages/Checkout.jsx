import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { api, formatINR, resolveImg } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, Lock, CreditCard, ShieldCheck } from "lucide-react";

const loadRazorpay = () => new Promise((resolve) => {
  if (window.Razorpay) return resolve(true);
  const s = document.createElement("script");
  s.src = "https://checkout.razorpay.com/v1/checkout.js";
  s.onload = () => resolve(true);
  s.onerror = () => resolve(false);
  document.body.appendChild(s);
});

export default function Checkout() {
  const { items, subtotal, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [mockOrder, setMockOrder] = useState(null);
  const [successOrder, setSuccessOrder] = useState(null);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: user?.name || "", email: user?.email || "", phone: "",
    line1: "", line2: "", city: "", state: "", pincode: "",
  });

  const discount = appliedCoupon?.discount || 0;
  const total = Math.max(0, subtotal - discount);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const { data } = await api.post("/coupons/validate", { code: couponCode.trim(), subtotal, email: form.email });
      setAppliedCoupon(data);
      toast.success(`Coupon ${data.code} applied · You saved ${formatINR(data.discount)}`);
    } catch (e) {
      const d = e.response?.data?.detail;
      toast.error(typeof d === "string" ? d : "Invalid coupon");
      setAppliedCoupon(null);
    } finally { setCouponLoading(false); }
  };

  const removeCoupon = () => { setAppliedCoupon(null); setCouponCode(""); };

  useEffect(() => { if (items.length === 0 && !successOrder) navigate("/cart"); }, [items.length, navigate, successOrder]);

  useEffect(() => {
    if (user) setForm((f) => ({ ...f, full_name: f.full_name || user.name || "", email: f.email || user.email || "" }));
  }, [user]);

  const onChange = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const required = ["full_name", "email", "phone", "line1", "city", "state", "pincode"];
    for (const k of required) if (!form[k]) { toast.error(`Please fill ${k.replace("_", " ")}`); return false; }
    if (!/^\d{6}$/.test(form.pincode)) { toast.error("Pincode must be 6 digits"); return false; }
    if (!/^\d{10}$/.test(form.phone)) { toast.error("Phone must be 10 digits"); return false; }
    return true;
  };

  const placeOrder = async () => {
    if (!validate()) return;
    setProcessing(true);
    try {
      const payload = { items: items.map((i) => ({ product_id: i.id, quantity: i.qty })), address: form, is_guest: !user, coupon_code: appliedCoupon?.code || null };
      const { data } = await api.post("/orders/create", payload);
      if (data.mock) { setMockOrder(data); setProcessing(false); return; }
      const ok = await loadRazorpay();
      if (!ok) { toast.error("Failed to load payment gateway"); setProcessing(false); return; }
      const rzp = new window.Razorpay({
        key: data.razorpay_key_id, amount: data.amount, currency: data.currency, order_id: data.razorpay_order_id,
        name: "CarDost", description: "Order Payment",
        prefill: { name: form.full_name, email: form.email, contact: form.phone },
        theme: { color: "#4F46E5" },
        handler: async (resp) => {
          try {
            await api.post("/orders/verify", { order_id: data.order_id, razorpay_order_id: resp.razorpay_order_id, razorpay_payment_id: resp.razorpay_payment_id, razorpay_signature: resp.razorpay_signature });
            setSuccessOrder({ order_id: data.order_id, total: data.total }); clear();
          } catch { toast.error("Payment verification failed"); }
        },
        modal: { ondismiss: () => setProcessing(false) },
      });
      rzp.open();
    } catch (e) {
      const d = e.response?.data?.detail;
      const msg = Array.isArray(d) ? d.map((x) => x.msg).join(", ") : (typeof d === "string" ? d : "Order failed");
      toast.error(msg); setProcessing(false);
    }
  };

  const confirmMockPayment = async () => {
    setProcessing(true);
    try {
      await api.post("/orders/verify", { order_id: mockOrder.order_id });
      setSuccessOrder({ order_id: mockOrder.order_id, total: mockOrder.total }); setMockOrder(null); clear();
    } catch { toast.error("Verification failed"); } finally { setProcessing(false); }
  };

  if (successOrder) {
    return (
      <div className="bg-white">
        <div className="max-w-2xl mx-auto px-6 py-20 text-center" data-testid="order-success">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 grid place-items-center">
            <CheckCircle2 className="w-10 h-10 text-green-600"/>
          </div>
          <h1 className="font-display text-3xl font-bold uppercase mb-3">Order Placed!</h1>
          <p className="text-neutral-600 mb-2">Order ID: <span className="font-mono text-neutral-900 font-bold">{successOrder.order_id.slice(0, 8).toUpperCase()}</span></p>
          <p className="text-neutral-600 mb-8">Amount paid: <span className="text-indigo-600 font-bold text-lg">{formatINR(successOrder.total)}</span></p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button data-testid="view-order-btn" onClick={() => navigate(`/order/${successOrder.order_id}`)} className="bg-indigo-600 hover:bg-indigo-700 font-bold uppercase tracking-wider text-xs">View Order</Button>
            <Button data-testid="continue-shopping-btn" onClick={() => navigate("/shop")} variant="outline" className="border-neutral-300 font-bold uppercase tracking-wider text-xs">Continue Shopping</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="bg-neutral-50 border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="font-display text-3xl font-bold uppercase">Checkout</h1>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-10 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white border border-neutral-200 rounded-md p-6">
            <h2 className="font-display text-lg font-bold uppercase mb-5 pb-3 border-b border-neutral-200">Shipping Details</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label className="text-xs uppercase font-bold text-neutral-700">Full Name *</Label><Input data-testid="input-name" value={form.full_name} onChange={onChange("full_name")} className="border-neutral-300 mt-1.5"/></div>
              <div><Label className="text-xs uppercase font-bold text-neutral-700">Phone *</Label><Input data-testid="input-phone" value={form.phone} onChange={onChange("phone")} placeholder="10-digit" className="border-neutral-300 mt-1.5"/></div>
              <div className="sm:col-span-2"><Label className="text-xs uppercase font-bold text-neutral-700">Email *</Label><Input data-testid="input-email" type="email" value={form.email} onChange={onChange("email")} className="border-neutral-300 mt-1.5"/></div>
              <div className="sm:col-span-2"><Label className="text-xs uppercase font-bold text-neutral-700">Address Line 1 *</Label><Input data-testid="input-line1" value={form.line1} onChange={onChange("line1")} className="border-neutral-300 mt-1.5"/></div>
              <div className="sm:col-span-2"><Label className="text-xs uppercase font-bold text-neutral-700">Address Line 2</Label><Input data-testid="input-line2" value={form.line2} onChange={onChange("line2")} className="border-neutral-300 mt-1.5"/></div>
              <div><Label className="text-xs uppercase font-bold text-neutral-700">City *</Label><Input data-testid="input-city" value={form.city} onChange={onChange("city")} className="border-neutral-300 mt-1.5"/></div>
              <div><Label className="text-xs uppercase font-bold text-neutral-700">State *</Label><Input data-testid="input-state" value={form.state} onChange={onChange("state")} className="border-neutral-300 mt-1.5"/></div>
              <div><Label className="text-xs uppercase font-bold text-neutral-700">Pincode *</Label><Input data-testid="input-pincode" value={form.pincode} onChange={onChange("pincode")} className="border-neutral-300 mt-1.5"/></div>
            </div>
            {!user && (
              <p className="text-xs text-neutral-500 pt-4 border-t border-neutral-200 mt-4">
                Checking out as guest. <button onClick={() => navigate("/login")} className="text-indigo-600 font-bold hover:underline">Login</button> to track orders & earn loyalty points.
              </p>
            )}
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-md p-6 h-fit lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-bold uppercase mb-4 pb-3 border-b border-neutral-200">Your Order</h2>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {items.map((i) => (
              <div key={i.id} className="flex gap-3 text-sm">
                <img src={resolveImg(i.image)} className="w-14 h-14 object-cover rounded border border-neutral-100" alt=""/>
                <div className="flex-1 min-w-0">
                  <div className="line-clamp-1 font-semibold text-xs">{i.name}</div>
                  <div className="text-neutral-500 text-xs mt-0.5">Qty: {i.qty}</div>
                </div>
                <div className="text-right font-bold text-sm">{formatINR(i.price * i.qty)}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-neutral-200 mt-4 pt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-neutral-600">Subtotal</span><span>{formatINR(subtotal)}</span></div>
            {appliedCoupon && (
              <div className="flex justify-between text-emerald-700">
                <span className="flex items-center gap-1">Coupon <span className="font-mono text-xs">({appliedCoupon.code})</span> <button onClick={removeCoupon} className="text-rose-500 text-[10px] underline">remove</button></span>
                <span>− {formatINR(discount)}</span>
              </div>
            )}
            <div className="flex justify-between"><span className="text-neutral-600">Shipping</span><span className="text-green-600 font-bold">FREE</span></div>
            <div className="flex justify-between font-display font-bold text-lg pt-3 border-t border-neutral-200"><span>Total</span><span data-testid="checkout-total" className="text-indigo-600">{formatINR(total)}</span></div>
          </div>

          {!appliedCoupon && (
            <div className="mt-4 pt-4 border-t border-stone-200">
              <Label className="text-xs uppercase font-bold text-neutral-700">Have a Coupon?</Label>
              <div className="flex gap-2 mt-1.5">
                <Input data-testid="coupon-input" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="Enter code (e.g. SAVE5)" className="border-neutral-300 font-mono text-sm"/>
                <Button data-testid="apply-coupon-btn" type="button" disabled={couponLoading} onClick={applyCoupon} className="bg-stone-950 hover:bg-indigo-600 text-xs font-bold uppercase">
                  {couponLoading ? "..." : "Apply"}
                </Button>
              </div>
              <div className="text-[10px] text-stone-500 mt-1.5">Try <button onClick={() => setCouponCode("SAVE5")} className="text-indigo-600 font-mono hover:underline">SAVE5</button> for 5% off ₹500+</div>
            </div>
          )}

          <Button data-testid="place-order-btn" disabled={processing} onClick={placeOrder} className="w-full mt-5 bg-indigo-600 hover:bg-indigo-700 font-bold uppercase tracking-wider text-sm py-6">
            <Lock className="w-4 h-4 mr-2"/> {processing ? "Processing..." : `Pay ${formatINR(total)}`}
          </Button>
          <div className="text-[10px] text-neutral-500 text-center mt-3 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3 h-3"/> Secured by Razorpay · SSL Encrypted
          </div>
        </div>
      </div>

      <Dialog open={!!mockOrder} onOpenChange={(o) => !o && setMockOrder(null)}>
        <DialogContent className="bg-white" data-testid="mock-payment-dialog">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2 uppercase"><CreditCard className="w-5 h-5 text-indigo-600"/> Razorpay (Test Mode)</DialogTitle>
            <DialogDescription>
              Live Razorpay is disabled. This is a simulated payment for demo purposes. Replace TEST keys in backend/.env to enable real Razorpay checkout.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-neutral-50 border border-neutral-200 rounded p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-neutral-600">Amount</span><span className="font-bold">{formatINR(mockOrder?.total || 0)}</span></div>
            <div className="flex justify-between"><span className="text-neutral-600">Order ID</span><span className="font-mono text-xs">{mockOrder?.order_id?.slice(0,8)}</span></div>
          </div>
          <Button data-testid="mock-pay-confirm" disabled={processing} onClick={confirmMockPayment} className="bg-indigo-600 hover:bg-indigo-700 font-bold uppercase tracking-wider text-xs">
            {processing ? "Processing..." : "Simulate Successful Payment"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
