import { Link } from "react-router-dom";
import { Heart, Trash2, ShoppingCart, ArrowRight } from "lucide-react";
import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";

const formatINR = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const resolveImg = (src) => {
  if (!src) return "https://via.placeholder.com/240";
  if (src.startsWith("http")) return src;
  const base = process.env.REACT_APP_BACKEND_URL || "";
  return `${base}${src}`;
};

export default function Wishlist() {
  const { items, remove, clear } = useWishlist();
  const { add } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex w-20 h-20 items-center justify-center rounded-full bg-stone-100 mb-6">
          <Heart className="w-9 h-9 text-stone-400"/>
        </div>
        <h1 className="font-display text-3xl font-bold uppercase">Your wishlist is empty</h1>
        <p className="text-stone-500 mt-2 mb-8">Tap the heart icon on any product to save it for later.</p>
        <Link to="/shop" data-testid="wl-shop-btn" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-wider text-sm px-7 py-3.5 rounded">
          Start Shopping <ArrowRight className="w-4 h-4"/>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase">Your Wishlist <span className="text-indigo-600">({items.length})</span></h1>
          <p className="text-stone-500 text-sm mt-1">Saved products — add them to cart whenever you&apos;re ready.</p>
        </div>
        <button data-testid="wl-clear" onClick={() => { clear(); toast.success("Wishlist cleared"); }} className="text-xs uppercase font-bold text-rose-600 hover:text-rose-800">Clear All</button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((p) => (
          <div key={p.id} data-testid={`wl-item-${p.id}`} className="bg-white border border-neutral-200 rounded-xl overflow-hidden hover:border-indigo-300 transition group">
            <Link to={`/product/${p.id}`} className="block aspect-square overflow-hidden bg-stone-50">
              <img src={resolveImg(p.image)} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
            </Link>
            <div className="p-4">
              <Link to={`/product/${p.id}`} className="font-semibold text-sm hover:text-indigo-600 line-clamp-2 block min-h-[40px]">{p.name}</Link>
              <div className="font-display text-xl font-bold text-indigo-600 mt-2">{formatINR(p.price)}</div>
              <div className="flex gap-2 mt-4">
                <button
                  data-testid={`wl-add-${p.id}`}
                  onClick={() => { add(p, 1); toast.success("Added to cart"); }}
                  className="flex-1 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider py-2.5 rounded inline-flex items-center justify-center gap-1.5"
                >
                  <ShoppingCart className="w-3.5 h-3.5"/> Add to Cart
                </button>
                <button
                  data-testid={`wl-remove-${p.id}`}
                  onClick={() => { remove(p.id); toast.success("Removed from wishlist"); }}
                  className="p-2.5 border border-stone-200 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 rounded transition"
                  aria-label="Remove from wishlist"
                >
                  <Trash2 className="w-4 h-4"/>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
