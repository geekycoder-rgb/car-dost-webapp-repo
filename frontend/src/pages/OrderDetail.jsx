import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, formatINR, resolveImg } from "@/lib/api";
import { ArrowLeft, Package, MapPin, CreditCard, CheckCircle2, Truck, Home as HomeIcon, Clock, XCircle } from "lucide-react";

const STATUS_FLOW = [
  { key: "paid", label: "Order Confirmed", icon: CheckCircle2 },
  { key: "processing", label: "Processing", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: HomeIcon },
];

const STATUS_COLORS = {
  paid: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  processing: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  shipped: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  delivered: "text-green-400 bg-green-500/10 border-green-500/30",
  cancelled: "text-neutral-400 bg-neutral-500/10 border-neutral-500/30",
  created: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  failed: "text-red-400 bg-red-500/10 border-red-500/30",
};

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.get(`/orders/${id}`).then((r) => setOrder(r.data)).catch(() => setErr("Order not found"));
  }, [id]);

  if (err) return <div className="max-w-3xl mx-auto px-6 py-24 text-center text-neutral-400" data-testid="order-not-found">{err}</div>;
  if (!order) return <div className="max-w-3xl mx-auto px-6 py-24 text-neutral-500">Loading...</div>;

  const currentIdx = STATUS_FLOW.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === "cancelled";
  const subtotal = order.items.reduce((s, i) => s + i.line_total, 0);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <Link to="/my-orders" data-testid="back-link" className="text-sm text-neutral-500 hover:text-red-400 inline-flex items-center gap-2 mb-6">
        <ArrowLeft className="w-4 h-4"/> Back to orders
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-red-500 mb-2">Order Detail</div>
          <h1 className="font-display text-3xl lg:text-5xl font-black tracking-tighter" data-testid="order-id-heading">
            #{order.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-sm text-neutral-500 mt-2">Placed on {new Date(order.created_at).toLocaleString()}</p>
        </div>
        <span data-testid="order-status-badge" className={`px-4 py-2 rounded-full border text-xs font-bold uppercase tracking-wider ${STATUS_COLORS[order.status] || "text-neutral-400 bg-neutral-500/10 border-neutral-500/30"}`}>
          {order.status}
        </span>
      </div>

      {/* Timeline */}
      {!isCancelled && order.status !== "created" && order.status !== "failed" && (
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 mb-8">
          <div className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-6">Tracking</div>
          <div className="flex justify-between relative">
            <div className="absolute top-5 left-5 right-5 h-0.5 bg-[#262626]"/>
            <div className="absolute top-5 left-5 h-0.5 bg-red-500 transition-all" style={{ width: `${(currentIdx / (STATUS_FLOW.length - 1)) * (100 - 10)}%` }}/>
            {STATUS_FLOW.map((s, i) => {
              const Icon = s.icon;
              const done = i <= currentIdx;
              return (
                <div key={s.key} className="relative z-10 flex flex-col items-center gap-2 w-1/4">
                  <div className={`w-10 h-10 rounded-full grid place-items-center border-2 ${done ? "bg-red-500 border-red-500 text-white" : "bg-[#0A0A0A] border-[#262626] text-neutral-600"}`}>
                    <Icon className="w-4 h-4"/>
                  </div>
                  <div className={`text-[10px] uppercase tracking-wider text-center ${done ? "text-white" : "text-neutral-600"}`}>{s.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isCancelled && (
        <div className="bg-neutral-500/5 border border-neutral-500/20 rounded-xl p-4 mb-8 flex gap-3 items-center text-neutral-400" data-testid="cancelled-notice">
          <XCircle className="w-5 h-5"/> This order was cancelled. Any payment will be refunded within 5-7 business days.
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 bg-[#141414] border border-[#262626] rounded-xl p-6">
          <h2 className="font-display text-lg font-bold mb-5 flex items-center gap-2"><Package className="w-5 h-5 text-red-500"/> Items ({order.items.length})</h2>
          <div className="space-y-4">
            {order.items.map((i, idx) => (
              <div key={idx} data-testid={`item-${idx}`} className="flex gap-4 pb-4 border-b border-[#262626] last:border-b-0 last:pb-0">
                <img src={resolveImg(i.image)} alt={i.name} className="w-20 h-20 object-cover rounded-lg shrink-0"/>
                <div className="flex-1 min-w-0">
                  <Link to={`/product/${i.product_id}`} className="font-medium hover:text-red-400 line-clamp-2">{i.name}</Link>
                  <div className="flex items-center justify-between mt-2 text-sm">
                    <span className="text-neutral-500">Qty {i.quantity} × {formatINR(i.price)}</span>
                    <span className="font-bold">{formatINR(i.line_total)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-[#262626] space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-neutral-400">Subtotal</span><span>{formatINR(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-neutral-400">Shipping</span><span className="text-green-500">FREE</span></div>
            <div className="flex justify-between font-display font-bold text-lg pt-2 border-t border-[#262626] mt-2">
              <span>Total Paid</span><span data-testid="order-total">{formatINR(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Sidebar — Address + Payment */}
        <div className="space-y-4">
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
            <h3 className="font-display text-sm uppercase tracking-[0.2em] text-neutral-500 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-500"/> Delivery Address
            </h3>
            <div className="text-sm space-y-1">
              <div className="font-bold">{order.address.full_name}</div>
              <div className="text-neutral-400">{order.address.line1}</div>
              {order.address.line2 && <div className="text-neutral-400">{order.address.line2}</div>}
              <div className="text-neutral-400">{order.address.city}, {order.address.state} - {order.address.pincode}</div>
              <div className="text-neutral-400 pt-2">📞 {order.address.phone}</div>
              <div className="text-neutral-400">✉️ {order.address.email}</div>
            </div>
          </div>

          <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
            <h3 className="font-display text-sm uppercase tracking-[0.2em] text-neutral-500 mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-red-500"/> Payment
            </h3>
            <div className="text-sm space-y-2">
              <div className="flex justify-between"><span className="text-neutral-400">Method</span><span>Razorpay {order.mock && <span className="text-[10px] text-yellow-500">(TEST)</span>}</span></div>
              {order.razorpay_payment_id && (
                <div className="flex justify-between gap-2"><span className="text-neutral-400">Txn</span><span className="font-mono text-xs truncate" title={order.razorpay_payment_id}>{order.razorpay_payment_id.slice(0, 16)}</span></div>
              )}
              {order.paid_at && (
                <div className="flex justify-between"><span className="text-neutral-400">Paid on</span><span className="text-xs">{new Date(order.paid_at).toLocaleDateString()}</span></div>
              )}
            </div>
          </div>

          <Link to="/contact" data-testid="need-help-link" className="block bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl p-4 text-sm text-center transition">
            Need help with this order?
          </Link>
        </div>
      </div>
    </div>
  );
}
