import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api, formatINR } from "@/lib/api";
import { Star, Plus, Minus, ShoppingCart, Truck, Shield, RotateCcw, ArrowRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { add } = useCart();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    api.get(`/products/${id}`).then((r) => setProduct(r.data)).catch(() => navigate("/shop"));
  }, [id, navigate]);

  if (!product) return <div className="max-w-7xl mx-auto px-6 py-20 text-neutral-500">Loading...</div>;

  const off = product.original_price ? Math.round(100 - (product.price / product.original_price) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <Link to="/shop" className="text-sm text-neutral-500 hover:text-red-400 mb-6 inline-block">← Back to shop</Link>
      <div className="grid md:grid-cols-2 gap-12">
        <div className="bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden">
          <img src={product.image} alt={product.name} className="w-full aspect-square object-cover"/>
        </div>
        <div className="space-y-6">
          {product.brand && <div className="text-xs uppercase tracking-[0.3em] text-red-500">{product.brand}</div>}
          <h1 className="font-display text-3xl lg:text-5xl font-black tracking-tighter">{product.name}</h1>
          <div className="flex items-center gap-2">
            <div className="flex text-yellow-500">
              {[...Array(5)].map((_, i) => <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.rating) ? "fill-current" : ""}`}/>)}
            </div>
            <span className="text-sm text-neutral-400">{product.rating} rating</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span data-testid="product-price" className="font-display text-4xl font-black">{formatINR(product.price)}</span>
            {product.original_price && (
              <>
                <span className="text-neutral-500 line-through">{formatINR(product.original_price)}</span>
                <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded font-bold">-{off}%</span>
              </>
            )}
          </div>
          <p className="text-neutral-400 leading-relaxed">{product.description}</p>

          <div className="flex items-center gap-4">
            <div className="flex items-center border border-[#262626] rounded-lg">
              <button data-testid="qty-decrease" onClick={() => setQty(Math.max(1, qty - 1))} className="p-3 hover:bg-white/5"><Minus className="w-4 h-4"/></button>
              <span data-testid="qty-value" className="w-12 text-center font-bold">{qty}</span>
              <button data-testid="qty-increase" onClick={() => setQty(qty + 1)} className="p-3 hover:bg-white/5"><Plus className="w-4 h-4"/></button>
            </div>
            <button
              data-testid="add-cart-detail"
              onClick={() => { add(product, qty); toast.success(`${qty} added to cart`); }}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3.5 rounded-lg font-medium flex items-center justify-center gap-2 transition"
            >
              <ShoppingCart className="w-4 h-4"/> Add to Cart
            </button>
          </div>

          <button
            data-testid="buy-now-btn"
            onClick={() => { add(product, qty); navigate("/checkout"); }}
            className="w-full border border-[#262626] hover:border-white py-3.5 rounded-lg font-medium flex items-center justify-center gap-2 transition"
          >
            Buy Now <ArrowRight className="w-4 h-4"/>
          </button>

          <div className="grid grid-cols-3 gap-3 pt-6 border-t border-[#262626]">
            <div className="text-center">
              <Truck className="w-5 h-5 mx-auto text-red-500 mb-2"/>
              <div className="text-xs text-neutral-400">Free Delivery</div>
            </div>
            <div className="text-center">
              <Shield className="w-5 h-5 mx-auto text-red-500 mb-2"/>
              <div className="text-xs text-neutral-400">1Y Warranty</div>
            </div>
            <div className="text-center">
              <RotateCcw className="w-5 h-5 mx-auto text-red-500 mb-2"/>
              <div className="text-xs text-neutral-400">7-Day Return</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
