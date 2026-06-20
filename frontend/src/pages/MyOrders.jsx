import { useEffect, useState } from "react";
import { api, formatINR } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { Package } from "lucide-react";

export default function MyOrders() {
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (user) api.get("/my/orders").then((r) => setOrders(r.data));
  }, [user]);

  if (loading) return <div className="p-12 text-neutral-500">Loading...</div>;
  if (!user) return <Navigate to="/login"/>;

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="font-display text-4xl lg:text-5xl font-black tracking-tighter mb-10">My Orders</h1>
      {orders.length === 0 ? (
        <div className="text-center py-16 text-neutral-500">
          <Package className="w-16 h-16 mx-auto mb-4 text-neutral-700"/>
          No orders yet.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} data-testid={`order-${o.id}`} className="bg-[#141414] border border-[#262626] rounded-xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <div className="text-xs text-neutral-500">Order ID</div>
                  <div className="font-mono text-sm">{o.id.slice(0, 8)}</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500">Date</div>
                  <div className="text-sm">{new Date(o.created_at).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500">Total</div>
                  <div className="font-bold">{formatINR(o.total)}</div>
                </div>
                <div>
                  <span data-testid={`order-status-${o.id}`} className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    o.status === "delivered" ? "bg-green-500/10 text-green-400" :
                    o.status === "shipped" ? "bg-blue-500/10 text-blue-400" :
                    o.status === "processing" ? "bg-purple-500/10 text-purple-400" :
                    o.status === "paid" ? "bg-emerald-500/10 text-emerald-400" :
                    o.status === "cancelled" ? "bg-neutral-500/10 text-neutral-400" :
                    "bg-yellow-500/10 text-yellow-400"
                  }`}>{o.status}</span>
                </div>
              </div>
              <div className="border-t border-[#262626] pt-3 space-y-2">
                {o.items.map((i, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-neutral-300">{i.name} × {i.quantity}</span>
                    <span>{formatINR(i.line_total)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
