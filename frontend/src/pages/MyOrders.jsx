import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api, formatINR } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Package, ChevronRight } from "lucide-react";

const STATUS_COLORS = {
  delivered: "bg-green-100 text-green-700",
  shipped: "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700",
  paid: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-neutral-200 text-neutral-600",
  created: "bg-yellow-100 text-yellow-700",
  failed: "bg-indigo-100 text-indigo-700",
};

export default function MyOrders() {
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState([]);

  useEffect(() => { if (user) api.get("/my/orders").then((r) => setOrders(r.data)); }, [user]);

  if (loading) return <div className="p-12 text-neutral-500">Loading...</div>;
  if (!user) return <Navigate to="/login"/>;

  return (
    <div className="bg-white">
      <div className="bg-neutral-50 border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <h1 className="font-display text-3xl font-bold uppercase">My Orders</h1>
          <div className="text-xs text-neutral-500 mt-1">Home / My Account / Orders</div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-6 py-10">
        {orders.length === 0 ? (
          <div className="text-center py-16 text-neutral-500 bg-neutral-50 rounded">
            <Package className="w-12 h-12 mx-auto mb-4 text-neutral-300"/>
            No orders yet.
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <Link key={o.id} to={`/order/${o.id}`} data-testid={`order-${o.id}`} className="block bg-white border border-neutral-200 hover:border-indigo-500 hover:shadow-md transition rounded-md p-5 group">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Order ID</div>
                    <div className="font-mono text-sm font-bold">#{o.id.slice(0, 8).toUpperCase()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Date</div>
                    <div className="text-sm">{new Date(o.created_at).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Total</div>
                    <div className="font-bold text-indigo-600">{formatINR(o.total)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span data-testid={`order-status-${o.id}`} className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_COLORS[o.status] || "bg-neutral-100 text-neutral-600"}`}>{o.status}</span>
                    <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition"/>
                  </div>
                </div>
                <div className="border-t border-neutral-200 pt-3 space-y-1">
                  {o.items.slice(0, 3).map((i, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-neutral-700 line-clamp-1 pr-2">{i.name} × {i.quantity}</span>
                      <span className="shrink-0 font-semibold">{formatINR(i.line_total)}</span>
                    </div>
                  ))}
                  {o.items.length > 3 && <div className="text-xs text-neutral-500">+ {o.items.length - 3} more item(s)</div>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
