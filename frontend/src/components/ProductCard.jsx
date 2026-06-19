import { Link } from "react-router-dom";
import { Star, ShoppingCart } from "lucide-react";
import { formatINR } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";

export default function ProductCard({ product, idx = 0 }) {
  const { add } = useCart();
  const off = product.original_price ? Math.round(100 - (product.price / product.original_price) * 100) : 0;

  return (
    <div data-testid={`product-card-${product.id}`} className="group bg-[#141414] border border-[#262626] rounded-xl overflow-hidden hover:-translate-y-1 hover:border-red-500/50 transition-all duration-300">
      <Link to={`/product/${product.id}`} className="block relative aspect-square overflow-hidden bg-black">
        <img src={product.image} alt={product.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
        {off > 0 && (
          <span className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded">
            -{off}%
          </span>
        )}
      </Link>
      <div className="p-4 space-y-2">
        {product.brand && <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">{product.brand}</div>}
        <Link to={`/product/${product.id}`} className="block">
          <h3 className="font-display text-base font-semibold line-clamp-2 group-hover:text-red-400 transition">{product.name}</h3>
        </Link>
        <div className="flex items-center gap-1 text-xs text-yellow-500">
          <Star className="w-3 h-3 fill-current"/> <span className="text-neutral-400">{product.rating}</span>
        </div>
        <div className="flex items-baseline gap-2 pt-1">
          <span className="font-display text-lg font-bold">{formatINR(product.price)}</span>
          {product.original_price && (
            <span className="text-xs text-neutral-500 line-through">{formatINR(product.original_price)}</span>
          )}
        </div>
        <button
          data-testid={`add-to-cart-${product.id}`}
          onClick={(e) => { e.preventDefault(); add(product); toast.success("Added to cart"); }}
          className="w-full mt-2 bg-white/5 hover:bg-red-500 hover:text-white border border-[#262626] hover:border-red-500 text-sm font-medium py-2 rounded-lg transition flex items-center justify-center gap-2"
        >
          <ShoppingCart className="w-4 h-4"/> Add to Cart
        </button>
      </div>
    </div>
  );
}
