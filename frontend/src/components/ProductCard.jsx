import { Link } from "react-router-dom";
import { Star, ShoppingCart, Heart } from "lucide-react";
import { formatINR, resolveImg } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { toast } from "sonner";

export default function ProductCard({ product }) {
  const { add } = useCart();
  const { has, toggle } = useWishlist();
  const wished = has(product.id);
  const off = product.original_price ? Math.round(100 - (product.price / product.original_price) * 100) : 0;

  return (
    <div data-testid={`product-card-${product.id}`} className="group bg-white border border-neutral-200 hover:border-indigo-500 hover:shadow-xl transition-all duration-300 rounded-md overflow-hidden">
      <Link to={`/product/${product.id}`} className="block relative aspect-square overflow-hidden bg-neutral-50">
        <img src={resolveImg(product.image)} alt={product.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
        {off > 0 && (
          <span className="absolute top-3 left-3 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-sm">-{off}% OFF</span>
        )}
        <button
          data-testid={`wishlist-${product.id}`}
          aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
          onClick={(e) => {
            e.preventDefault();
            const wasIn = has(product.id);
            toggle(product);
            toast.success(wasIn ? "Removed from wishlist" : "Saved to wishlist");
          }}
          className={`absolute top-3 right-3 w-8 h-8 grid place-items-center rounded-full transition opacity-100 ${wished ? "bg-rose-500 text-white" : "bg-white/90 hover:bg-rose-500 hover:text-white text-neutral-700"}`}
        >
          <Heart className={`w-4 h-4 ${wished ? "fill-current" : ""}`}/>
        </button>
      </Link>
      <div className="p-3.5 space-y-1.5">
        {product.brand && <div className="text-[10px] uppercase tracking-[0.15em] text-indigo-600 font-semibold">{product.brand}</div>}
        <Link to={`/product/${product.id}`} className="block">
          <h3 className="text-sm font-semibold text-neutral-900 line-clamp-2 group-hover:text-indigo-600 transition leading-snug min-h-[2.5rem]">{product.name}</h3>
        </Link>
        <div className="flex items-center gap-1 text-xs h-4">
          {(product.review_count || 0) > 0 ? (
            <>
              <div className="flex text-yellow-500">
                {[...Array(5)].map((_, i) => <Star key={i} className={`w-3 h-3 ${i < Math.floor(product.rating) ? "fill-current" : "text-neutral-300"}`}/>)}
              </div>
              <span className="text-neutral-500 ml-1">({product.rating}) · {product.review_count}</span>
            </>
          ) : (
            <span className="text-stone-400 italic text-[10px]">No reviews yet</span>
          )}
        </div>
        <div className="flex items-baseline gap-2 pt-1">
          <span className="font-display text-lg font-bold text-indigo-600">{formatINR(product.price)}</span>
          {product.original_price && (
            <span className="text-xs text-neutral-400 line-through">{formatINR(product.original_price)}</span>
          )}
        </div>
        <button
          data-testid={`add-to-cart-${product.id}`}
          onClick={(e) => { e.preventDefault(); add(product); toast.success("Added to cart"); }}
          className="w-full mt-1.5 bg-neutral-900 hover:bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider py-2.5 rounded transition flex items-center justify-center gap-2"
        >
          <ShoppingCart className="w-3.5 h-3.5"/> Add to Cart
        </button>
      </div>
    </div>
  );
}
