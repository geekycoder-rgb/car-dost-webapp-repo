import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { formatINR, resolveImg } from "@/lib/api";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Tag } from "lucide-react";

export default function Cart() {
  const { items, updateQty, remove, subtotal, cartKey } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="bg-white">
        <div className="bg-neutral-50 border-b border-neutral-200">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <h1 className="font-display text-3xl font-bold uppercase">Shopping Cart</h1>
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-6 py-24 text-center" data-testid="cart-empty">
          <ShoppingBag className="w-16 h-16 mx-auto text-neutral-300 mb-6"/>
          <h2 className="font-display text-2xl font-bold uppercase mb-3">Your cart is empty</h2>
          <p className="text-neutral-500 mb-8">Add some premium audio gear to get started</p>
          <Link to="/shop" data-testid="cart-shop-link" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-7 py-3.5 rounded-full font-bold uppercase text-xs tracking-wider transition">
            Browse Products <ArrowRight className="w-4 h-4"/>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="bg-neutral-50 border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="font-display text-3xl font-bold uppercase text-neutral-900">Shopping Cart <span className="text-indigo-600">({items.length})</span></h1>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-10 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {items.map((i) => {
            const ckey = cartKey(i);
            return (
            <div key={ckey} data-testid={`cart-item-${i.id}`} className="bg-white border border-neutral-200 rounded-md p-4 flex gap-4 hover:border-indigo-300 transition">
              <Link to={`/product/${i.id}`} className="shrink-0">
                <img src={resolveImg(i.image)} alt={i.name} className="w-24 h-24 object-cover rounded border border-neutral-100"/>
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={`/product/${i.id}`} className="font-semibold text-sm hover:text-indigo-600 line-clamp-2 block">{i.name}</Link>
                {i.vehicle_label && (
                  <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5 mt-1 inline-block">
                    🚗 {i.vehicle_label}
                  </div>
                )}
                <div className="font-display text-lg font-bold text-indigo-600 mt-1">{formatINR(i.price)}</div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center border border-neutral-300 rounded">
                    <button onClick={() => updateQty(ckey, i.qty - 1)} className="p-1.5 hover:bg-neutral-100"><Minus className="w-3 h-3"/></button>
                    <span className="w-10 text-center text-sm font-bold">{i.qty}</span>
                    <button onClick={() => updateQty(ckey, i.qty + 1)} className="p-1.5 hover:bg-neutral-100"><Plus className="w-3 h-3"/></button>
                  </div>
                  <button data-testid={`remove-${i.id}`} onClick={() => remove(ckey)} className="text-neutral-400 hover:text-indigo-600 p-2 transition">
                    <Trash2 className="w-4 h-4"/>
                  </button>
                </div>
              </div>
            </div>
          );})}
        </div>

        <div className="bg-white border border-neutral-200 rounded-md p-6 h-fit lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-bold uppercase mb-4 pb-3 border-b border-neutral-200">Order Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-neutral-600">Subtotal</span><span className="font-semibold">{formatINR(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-neutral-600">Shipping</span><span className="text-green-600 font-bold">FREE</span></div>
          </div>
          <div className="border-t border-neutral-200 mt-4 pt-4 flex justify-between font-display font-bold text-lg">
            <span>Total</span><span data-testid="cart-total" className="text-indigo-600">{formatINR(subtotal)}</span>
          </div>
          <button data-testid="checkout-btn" onClick={() => navigate("/checkout")} className="w-full mt-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-wider text-sm py-3.5 rounded transition flex items-center justify-center gap-2">
            Proceed to Checkout <ArrowRight className="w-4 h-4"/>
          </button>
          <div className="mt-4 p-3 bg-neutral-50 rounded text-xs text-neutral-600 flex gap-2 items-start">
            <Tag className="w-3.5 h-3.5 mt-0.5 text-indigo-600 shrink-0"/>
            <span>Use code <strong className="text-indigo-600">SAVE5</strong> at checkout for an extra 5% off prepaid orders.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
