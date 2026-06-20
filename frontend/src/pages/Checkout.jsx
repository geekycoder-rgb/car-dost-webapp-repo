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
import { CheckCircle2, Lock, CreditCard } from "lucide-react";

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
  const [form, setForm] = useState({
    full_name: user?.name || "",
    email: user?.email || "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
  });

  useEffect(() => {
    if (items.length === 0 && !successOrder) navigate("/cart");
  }, [items.length, navigate, successOrder]);

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        full_name: f.full_name || user.name || "",
        email: f.email || user.email || "",
      }));
    }
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
      const payload = {
        items: items.map((i) => ({ product_id: i.id, quantity: i.qty })),
        address: form,
        is_guest: !user,
      };
      const { data } = await api.post("/orders/create", payload);

      if (data.mock) {
        setMockOrder(data);
        setProcessing(false);
        return;
      }

      const ok = await loadRazorpay();
      if (!ok) { toast.error("Failed to load payment gateway"); setProcessing(false); return; }

      const rzp = new window.Razorpay({
        key: data.razorpay_key_id,
        amount: data.amount,
        currency: data.currency,
        order_id: data.razorpay_order_id,
        name: "CarDost",
        description: "Order Payment",
        prefill: { name: form.full_name, email: form.email, contact: form.phone },
        theme: { color: "#EF4444" },
        handler: async (resp) => {
          try {
            await api.post("/orders/verify", {
              order_id: data.order_id,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            });
            setSuccessOrder({ order_id: data.order_id, total: data.total });
            clear();
          } catch {
            toast.error("Payment verification failed");
          }
        },
        modal: { ondismiss: () => setProcessing(false) },
      });
      rzp.open();
    } catch (e) {
      const d = e.response?.data?.detail;
      const msg = Array.isArray(d) ? d.map((x) => x.msg).join(", ") : (typeof d === "string" ? d : "Order failed");
      toast.error(msg);
      setProcessing(false);
    }
  };

  const confirmMockPayment = async () => {
    setProcessing(true);
    try {
      await api.post("/orders/verify", { order_id: mockOrder.order_id });
      setSuccessOrder({ order_id: mockOrder.order_id, total: mockOrder.total });
      setMockOrder(null);
      clear();
    } catch {
      toast.error("Verification failed");
    } finally {
      setProcessing(false);
    }
  };

  if (successOrder) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center" data-testid="order-success">
        <CheckCircle2 className="w-20 h-20 mx-auto text-green-500 mb-6"/>
        <h1 className="font-display text-4xl font-black mb-3">Order Placed!</h1>
        <p className="text-neutral-400 mb-2">Order ID: <span className="font-mono text-white">{successOrder.order_id.slice(0, 8)}</span></p>
        <p className="text-neutral-400 mb-8">Amount paid: <span className="text-white font-bold">{formatINR(successOrder.total)}</span></p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button data-testid="view-order-btn" onClick={() => navigate(`/order/${successOrder.order_id}`)} className="bg-red-500 hover:bg-red-600">View Order</Button>
          <Button data-testid="continue-shopping-btn" onClick={() => navigate("/shop")} variant="outline" className="border-[#262626]">Continue Shopping</Button>
          {user && <Button variant="outline" onClick={() => navigate("/my-orders")} className="border-[#262626]">My Orders</Button>}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <h1 className="font-display text-4xl lg:text-6xl font-black tracking-tighter mb-10">Checkout</h1>
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 space-y-4">
            <h2 className="font-display text-xl font-bold mb-2">Shipping Details</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Full Name</Label><Input data-testid="input-name" value={form.full_name} onChange={onChange("full_name")} className="bg-[#0A0A0A] border-[#262626] mt-1"/></div>
              <div><Label>Phone</Label><Input data-testid="input-phone" value={form.phone} onChange={onChange("phone")} placeholder="10-digit" className="bg-[#0A0A0A] border-[#262626] mt-1"/></div>
              <div className="sm:col-span-2"><Label>Email</Label><Input data-testid="input-email" type="email" value={form.email} onChange={onChange("email")} className="bg-[#0A0A0A] border-[#262626] mt-1"/></div>
              <div className="sm:col-span-2"><Label>Address Line 1</Label><Input data-testid="input-line1" value={form.line1} onChange={onChange("line1")} className="bg-[#0A0A0A] border-[#262626] mt-1"/></div>
              <div className="sm:col-span-2"><Label>Address Line 2 (Optional)</Label><Input data-testid="input-line2" value={form.line2} onChange={onChange("line2")} className="bg-[#0A0A0A] border-[#262626] mt-1"/></div>
              <div><Label>City</Label><Input data-testid="input-city" value={form.city} onChange={onChange("city")} className="bg-[#0A0A0A] border-[#262626] mt-1"/></div>
              <div><Label>State</Label><Input data-testid="input-state" value={form.state} onChange={onChange("state")} className="bg-[#0A0A0A] border-[#262626] mt-1"/></div>
              <div><Label>Pincode</Label><Input data-testid="input-pincode" value={form.pincode} onChange={onChange("pincode")} className="bg-[#0A0A0A] border-[#262626] mt-1"/></div>
            </div>
            {!user && (
              <p className="text-xs text-neutral-500 pt-2">
                Checking out as guest. <button onClick={() => navigate("/login")} className="text-red-400 hover:underline">Login</button> to track orders.
              </p>
            )}
          </div>
        </div>

        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 h-fit sticky top-24">
          <h2 className="font-display text-xl font-bold mb-4">Order</h2>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {items.map((i) => (
              <div key={i.id} className="flex gap-3 text-sm">
                <img src={resolveImg(i.image)} className="w-12 h-12 object-cover rounded" alt=""/>
                <div className="flex-1 min-w-0">
                  <div className="line-clamp-1 font-medium">{i.name}</div>
                  <div className="text-neutral-500 text-xs">Qty: {i.qty}</div>
                </div>
                <div className="text-right font-bold">{formatINR(i.price * i.qty)}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-[#262626] mt-4 pt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-neutral-400">Subtotal</span><span>{formatINR(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-neutral-400">Shipping</span><span className="text-green-500">FREE</span></div>
            <div className="flex justify-between font-display font-bold text-lg pt-2"><span>Total</span><span data-testid="checkout-total">{formatINR(subtotal)}</span></div>
          </div>
          <Button data-testid="place-order-btn" disabled={processing} onClick={placeOrder} className="w-full mt-6 bg-red-500 hover:bg-red-600 py-6 text-base font-medium">
            <Lock className="w-4 h-4 mr-2"/> {processing ? "Processing..." : `Pay ${formatINR(subtotal)}`}
          </Button>
          <p className="text-[10px] text-neutral-500 text-center mt-3">Secured by Razorpay • SSL Encrypted</p>
        </div>
      </div>

      {/* Mock payment dialog */}
      <Dialog open={!!mockOrder} onOpenChange={(o) => !o && setMockOrder(null)}>
        <DialogContent className="bg-[#141414] border-[#262626] text-white" data-testid="mock-payment-dialog">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2"><CreditCard className="w-5 h-5 text-red-500"/> Razorpay (Test Mode)</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Live Razorpay is disabled. This is a simulated payment for demo purposes. Replace TEST keys in backend/.env to enable real Razorpay checkout.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-[#0A0A0A] border border-[#262626] rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-neutral-400">Amount</span><span className="font-bold">{formatINR(mockOrder?.total || 0)}</span></div>
            <div className="flex justify-between"><span className="text-neutral-400">Order ID</span><span className="font-mono text-xs">{mockOrder?.order_id?.slice(0,8)}</span></div>
          </div>
          <Button data-testid="mock-pay-confirm" disabled={processing} onClick={confirmMockPayment} className="bg-red-500 hover:bg-red-600">
            {processing ? "Processing..." : "Simulate Successful Payment"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
