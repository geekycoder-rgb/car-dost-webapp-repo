import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, formatINR, resolveImg } from "@/lib/api";
import { ArrowLeft, Package, MapPin, CreditCard, CheckCircle2, Truck, Home as HomeIcon, XCircle } from "lucide-react";

const STATUS_FLOW = [
  { key: "paid", label: "Order Confirmed", icon: CheckCircle2 },
  { key: "processing", label: "Processing", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: HomeIcon },
];

const STATUS_COLORS = {
  paid: "bg-emerald-100 text-emerald-700 border-emerald-300",
  processing: "bg-purple-100 text-purple-700 border-purple-300",
  shipped: "bg-blue-100 text-blue-700 border-blue-300",
  delivered: "bg-green-100 text-green-700 border-green-300",
  cancelled: "bg-neutral-200 text-neutral-600 border-neutral-300",
  created: "bg-yellow-100 text-yellow-700 border-yellow-300",
  failed: "bg-indigo-100 text-indigo-700 border-indigo-300",
};

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => { api.get(`/orders/${id}`).then((r) => setOrder(r.data)).catch(() => setErr("Order not found")); }, [id]);

  if (err) return <div className="max-w-3xl mx-auto px-6 py-24 text-center text-neutral-500" data-testid="order-not-found">{err}</div>;
  if (!order) return <div className="max-w-3xl mx-auto px-6 py-24 text-neutral-500">Loading...</div>;

  const currentIdx = STATUS_FLOW.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === "cancelled";
  const subtotal = order.items.reduce((s, i) => s + i.line_total, 0);

  return (
    <div className="bg-white">
      <div className="bg-neutral-50 border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <Link to="/my-orders" data-testid="back-link" className="text-xs text-neutral-500 hover:text-indigo-600 inline-flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3 h-3"/> Back to orders
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl lg:text-3xl font-bold uppercase" data-testid="order-id-heading">Order #{order.id.slice(0, 8).toUpperCase()}</h1>
              <p className="text-xs text-neutral-500 mt-1">Placed on {new Date(order.created_at).toLocaleString()}</p>
            </div>
            <span data-testid="order-status-badge" className={`px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider ${STATUS_COLORS[order.status] || "bg-neutral-100 text-neutral-600 border-neutral-300"}`}>
              {order.status}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {!isCancelled && order.status !== "created" && order.status !== "failed" && (
          <div className="bg-white border border-neutral-200 rounded-md p-6">
            <div className="text-xs uppercase tracking-[0.15em] font-bold text-neutral-700 mb-6">Tracking</div>
            <div className="flex justify-between relative">
              <div className="absolute top-5 left-5 right-5 h-0.5 bg-neutral-200"/>
              <div className="absolute top-5 left-5 h-0.5 bg-indigo-600 transition-all" style={{ width: `${(currentIdx / (STATUS_FLOW.length - 1)) * (100 - 10)}%` }}/>
              {STATUS_FLOW.map((s, i) => {
                const Icon = s.icon; const done = i <= currentIdx;
                return (
                  <div key={s.key} className="relative z-10 flex flex-col items-center gap-2 w-1/4">
                    <div className={`w-10 h-10 rounded-full grid place-items-center border-2 ${done ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-neutral-300 text-neutral-400"}`}>
                      <Icon className="w-4 h-4"/>
                    </div>
                    <div className={`text-[10px] uppercase tracking-wider text-center font-bold ${done ? "text-neutral-900" : "text-neutral-400"}`}>{s.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="bg-neutral-100 border border-neutral-300 rounded-md p-4 flex gap-3 items-center text-neutral-700" data-testid="cancelled-notice">
            <XCircle className="w-5 h-5"/> This order was cancelled. Any payment will be refunded within 5-7 business days.
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-md p-6">
            <h2 className="font-display text-base font-bold uppercase mb-4 pb-3 border-b border-neutral-200 flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-600"/> Items ({order.items.length})
            </h2>
            <div className="space-y-4">
              {order.items.map((i, idx) => (
                <div key={idx} data-testid={`item-${idx}`} className="flex gap-4 pb-4 border-b border-neutral-100 last:border-0 last:pb-0">
                  <img src={resolveImg(i.image)} alt={i.name} className="w-20 h-20 object-cover rounded border border-neutral-100 shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <Link to={`/product/${i.product_id}`} className="font-semibold text-sm hover:text-indigo-600 line-clamp-2">{i.name}</Link>
                    {i.vehicle_label && (
                      <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5 mt-1 inline-block">
                        🚗 {i.vehicle_label}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2 text-sm">
                      <span className="text-neutral-500 text-xs">Qty {i.quantity} × {formatINR(i.price)}</span>
                      <span className="font-bold">{formatINR(i.line_total)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-neutral-200 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-neutral-600">Subtotal</span><span>{formatINR(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-neutral-600">Shipping</span><span className="text-green-600 font-bold">FREE</span></div>
              <div className="flex justify-between font-display font-bold text-lg pt-2 border-t border-neutral-200 mt-2">
                <span>Total Paid</span><span data-testid="order-total" className="text-indigo-600">{formatINR(order.total)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-neutral-200 rounded-md p-5">
              <h3 className="font-display text-xs uppercase tracking-[0.15em] font-bold text-neutral-700 mb-3 flex items-center gap-2 pb-2 border-b border-neutral-200">
                <MapPin className="w-3.5 h-3.5 text-indigo-600"/> Delivery Address
              </h3>
              <div className="text-sm space-y-1">
                <div className="font-bold">{order.address.full_name}</div>
                <div className="text-neutral-600">{order.address.line1}</div>
                {order.address.line2 && <div className="text-neutral-600">{order.address.line2}</div>}
                <div className="text-neutral-600">{order.address.city}, {order.address.state} - {order.address.pincode}</div>
                <div className="text-neutral-600 pt-2 text-xs">📞 {order.address.phone}</div>
                <div className="text-neutral-600 text-xs">✉️ {order.address.email}</div>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-md p-5">
              <h3 className="font-display text-xs uppercase tracking-[0.15em] font-bold text-neutral-700 mb-3 flex items-center gap-2 pb-2 border-b border-neutral-200">
                <CreditCard className="w-3.5 h-3.5 text-indigo-600"/> Payment
              </h3>
              <div className="text-sm space-y-2">
                <div className="flex justify-between"><span className="text-neutral-600">Method</span><span>Razorpay {order.mock && <span className="text-[10px] text-yellow-600 font-bold">(TEST)</span>}</span></div>
                {order.razorpay_payment_id && (
                  <div className="flex justify-between gap-2"><span className="text-neutral-600">Txn</span><span className="font-mono text-xs truncate" title={order.razorpay_payment_id}>{order.razorpay_payment_id.slice(0, 16)}</span></div>
                )}
                {order.paid_at && (
                  <div className="flex justify-between"><span className="text-neutral-600">Paid on</span><span className="text-xs">{new Date(order.paid_at).toLocaleDateString()}</span></div>
                )}
              </div>
            </div>

            <Link to="/contact" data-testid="need-help-link" className="block bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-600 rounded-md p-4 text-sm font-bold uppercase tracking-wider text-center transition">
              Need help with this order?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
