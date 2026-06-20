import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api, formatINR, resolveImg } from "@/lib/api";
import { Star, Plus, Minus, ShoppingCart, Truck, Shield, RotateCcw, Heart, Share2, CheckCircle2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { add } = useCart();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);

  useEffect(() => { api.get(`/products/${id}`).then((r) => setProduct(r.data)).catch(() => navigate("/shop")); }, [id, navigate]);

  if (!product) return <div className="max-w-7xl mx-auto px-6 py-20 text-neutral-500">Loading...</div>;
  const off = product.original_price ? Math.round(100 - (product.price / product.original_price) * 100) : 0;

  return (
    <div className="bg-white">
      <div className="bg-neutral-50 border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-3 text-xs text-neutral-500">
          <Link to="/" className="hover:text-red-600">Home</Link> / <Link to="/shop" className="hover:text-red-600">Shop</Link> / <Link to={`/shop?category=${product.category}`} className="hover:text-red-600">{product.category}</Link> / <span className="text-neutral-900">{product.name}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid md:grid-cols-2 gap-10">
          <div className="bg-neutral-50 border border-neutral-200 rounded-md overflow-hidden">
            <img src={resolveImg(product.image)} alt={product.name} className="w-full aspect-square object-cover"/>
          </div>
          <div className="space-y-5">
            {product.brand && <div className="text-xs uppercase tracking-[0.3em] text-red-600 font-bold">{product.brand}</div>}
            <h1 className="font-display text-2xl lg:text-4xl font-bold text-neutral-900 leading-tight">{product.name}</h1>
            <div className="flex items-center gap-3">
              <div className="flex text-yellow-500">
                {[...Array(5)].map((_, i) => <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.rating) ? "fill-current" : "text-neutral-300"}`}/>)}
              </div>
              <span className="text-sm text-neutral-600">{product.rating} · 142 reviews</span>
            </div>
            <div className="bg-red-50 border border-red-200 p-4 rounded-md">
              <div className="flex items-baseline gap-3">
                <span data-testid="product-price" className="font-display text-3xl lg:text-4xl font-bold text-red-600">{formatINR(product.price)}</span>
                {product.original_price && (
                  <>
                    <span className="text-neutral-400 line-through">{formatINR(product.original_price)}</span>
                    <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded font-bold">SAVE {off}%</span>
                  </>
                )}
              </div>
              <div className="text-xs text-green-700 font-bold mt-1">✓ Free delivery · Extra 5% off on prepaid</div>
            </div>
            <div className="text-sm">
              {product.stock > 0 ? (
                <span data-testid="stock-status" className="text-green-600 font-semibold flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> In Stock ({product.stock} available)</span>
              ) : (
                <span data-testid="stock-status" className="text-red-600 font-semibold">● Out of Stock</span>
              )}
            </div>
            <p className="text-neutral-600 leading-relaxed text-sm border-t border-neutral-200 pt-4">{product.description}</p>

            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center border border-neutral-300 rounded">
                <button data-testid="qty-decrease" onClick={() => setQty(Math.max(1, qty - 1))} className="p-2.5 hover:bg-neutral-100 text-neutral-700"><Minus className="w-4 h-4"/></button>
                <span data-testid="qty-value" className="w-12 text-center font-bold">{qty}</span>
                <button data-testid="qty-increase" onClick={() => setQty(qty + 1)} className="p-2.5 hover:bg-neutral-100 text-neutral-700"><Plus className="w-4 h-4"/></button>
              </div>
              <button
                data-testid="add-cart-detail"
                onClick={() => { add(product, qty); toast.success(`${qty} added to cart`); }}
                className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white font-bold uppercase tracking-wider text-sm py-3.5 rounded transition flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-4 h-4"/> Add to Cart
              </button>
            </div>
            <button
              data-testid="buy-now-btn"
              onClick={() => { add(product, qty); navigate("/checkout"); }}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wider text-sm py-3.5 rounded transition"
            >
              Buy Now →
            </button>

            <div className="flex gap-4 text-xs pt-2 text-neutral-600">
              <button className="flex items-center gap-1 hover:text-red-600"><Heart className="w-4 h-4"/> Wishlist</button>
              <button className="flex items-center gap-1 hover:text-red-600"><Share2 className="w-4 h-4"/> Share</button>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-5 border-t border-neutral-200">
              <div className="text-center">
                <Truck className="w-5 h-5 mx-auto text-red-600 mb-2"/>
                <div className="text-xs text-neutral-700 font-semibold">Free Delivery</div>
              </div>
              <div className="text-center">
                <Shield className="w-5 h-5 mx-auto text-red-600 mb-2"/>
                <div className="text-xs text-neutral-700 font-semibold">1Y Warranty</div>
              </div>
              <div className="text-center">
                <RotateCcw className="w-5 h-5 mx-auto text-red-600 mb-2"/>
                <div className="text-xs text-neutral-700 font-semibold">7-Day Return</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
