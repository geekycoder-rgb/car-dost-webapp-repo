import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { formatINR, resolveImg } from "@/lib/api";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from "lucide-react";

export default function Cart() {
  const { items, updateQty, remove, subtotal } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center" data-testid="cart-empty">
        <ShoppingBag className="w-16 h-16 mx-auto text-neutral-700 mb-6"/>
        <h1 className="font-display text-4xl font-black mb-3">Your cart is empty</h1>
        <p className="text-neutral-400 mb-8">Add some premium audio gear to get started</p>
        <Link to="/shop" data-testid="cart-shop-link" className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-medium">
          Browse Products <ArrowRight className="w-4 h-4"/>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <h1 className="font-display text-4xl lg:text-6xl font-black tracking-tighter mb-10">Cart</h1>
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-3">
          {items.map((i) => (
            <div key={i.id} data-testid={`cart-item-${i.id}`} className="bg-[#141414] border border-[#262626] rounded-xl p-4 flex gap-4">
              <img src={resolveImg(i.image)} alt={i.name} className="w-24 h-24 object-cover rounded-lg"/>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-semibold line-clamp-2">{i.name}</h3>
                <div className="text-red-500 font-bold mt-1">{formatINR(i.price)}</div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center border border-[#262626] rounded-lg">
                    <button onClick={() => updateQty(i.id, i.qty - 1)} className="p-1.5 hover:bg-white/5"><Minus className="w-3 h-3"/></button>
                    <span className="w-8 text-center text-sm font-bold">{i.qty}</span>
                    <button onClick={() => updateQty(i.id, i.qty + 1)} className="p-1.5 hover:bg-white/5"><Plus className="w-3 h-3"/></button>
                  </div>
                  <button data-testid={`remove-${i.id}`} onClick={() => remove(i.id)} className="text-neutral-500 hover:text-red-500 p-2">
                    <Trash2 className="w-4 h-4"/>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 h-fit sticky top-24">
          <h2 className="font-display text-xl font-bold mb-4">Order Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-neutral-400">Subtotal</span><span>{formatINR(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-neutral-400">Shipping</span><span className="text-green-500">FREE</span></div>
          </div>
          <div className="border-t border-[#262626] mt-4 pt-4 flex justify-between font-display font-bold text-lg">
            <span>Total</span><span data-testid="cart-total">{formatINR(subtotal)}</span>
          </div>
          <button data-testid="checkout-btn" onClick={() => navigate("/checkout")} className="w-full mt-6 bg-red-500 hover:bg-red-600 text-white py-3.5 rounded-lg font-medium flex items-center justify-center gap-2">
            Checkout <ArrowRight className="w-4 h-4"/>
          </button>
        </div>
      </div>
    </div>
  );
}
