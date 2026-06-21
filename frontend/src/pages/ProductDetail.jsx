import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api, formatINR, resolveImg } from "@/lib/api";
import { Star, Plus, Minus, ShoppingCart, Truck, Shield, RotateCcw, Heart, Share2, CheckCircle2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import ProductReviews from "@/components/ProductReviews";
import { CustomerVehicleSelector } from "@/components/VehicleVariantPicker";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { add } = useCart();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(null);
  const [vehicle, setVehicle] = useState(null); // { id, label }

  useEffect(() => {
    api.get(`/products/${id}`).then((r) => { setProduct(r.data); setActiveImg(r.data.image); }).catch(() => navigate("/shop"));
  }, [id, navigate]);

  // Per-product SEO meta tags
  useEffect(() => {
    if (!product) return;
    const prevTitle = document.title;
    document.title = product.meta_title || `${product.name} — CarDost`;
    const setMeta = (name, content) => {
      if (!content) return null;
      let el = document.querySelector(`meta[name="${name}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
      el.setAttribute("content", content);
      return el;
    };
    const desc = setMeta("description", product.meta_description || product.description?.slice(0, 160));
    return () => { document.title = prevTitle; if (desc) desc.setAttribute("content", ""); };
  }, [product]);

  if (!product) return <div className="max-w-7xl mx-auto px-6 py-20 text-stone-500">Loading...</div>;
  const off = product.original_price ? Math.round(100 - (product.price / product.original_price) * 100) : 0;
  const gallery = [product.image, ...(product.gallery || [])].filter(Boolean);

  return (
    <div className="bg-white">
      <div className="bg-neutral-50 border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-3 text-xs text-neutral-500">
          <Link to="/" className="hover:text-indigo-600">Home</Link> / <Link to="/shop" className="hover:text-indigo-600">Shop</Link> / <Link to={`/shop?category=${product.category}`} className="hover:text-indigo-600">{product.category}</Link> / <span className="text-neutral-900">{product.name}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid md:grid-cols-2 gap-10">
          <div className="space-y-3">
            <div className="bg-stone-50 border border-stone-200 rounded-2xl overflow-hidden">
              <img src={resolveImg(activeImg || product.image)} alt={product.name} className="w-full aspect-square object-cover"/>
            </div>
            {gallery.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {gallery.map((img, i) => (
                  <button key={i} onClick={() => setActiveImg(img)} data-testid={`gallery-${i}`}
                          className={`aspect-square rounded-lg overflow-hidden border-2 transition ${activeImg === img ? "border-indigo-600" : "border-stone-200 hover:border-stone-400"}`}>
                    <img src={resolveImg(img)} alt="" className="w-full h-full object-cover"/>
                  </button>
                ))}
              </div>
            )}
            {(product.car_brands?.length > 0 || product.years?.length > 0) && (
              product.car_brands?.includes("ALL") ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 mb-2">Universal Fit</div>
                  <div className="text-sm text-emerald-800">🌐 Fits <strong>all cars</strong>, brands, models &amp; years.</div>
                </div>
              ) : (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <div className="text-[10px] uppercase tracking-wider font-bold text-indigo-700 mb-2">Compatible With</div>
                {product.car_brands?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {product.car_brands.map((b) => <span key={b} className="text-[11px] bg-white border border-indigo-200 px-2 py-0.5 rounded font-medium">{b}</span>)}
                  </div>
                )}
                {product.car_models?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {product.car_models.map((m) => <span key={m} className="text-[11px] bg-white border border-stone-200 px-2 py-0.5 rounded text-stone-700">{m}</span>)}
                  </div>
                )}
                {product.years?.length > 0 && (
                  <div className="text-[11px] text-stone-600">Years: {[...product.years].sort().join(", ")}</div>
                )}
              </div>
              )
            )}
          </div>
          <div className="space-y-5">
            {product.brand && <div className="text-xs uppercase tracking-[0.3em] text-indigo-600 font-bold">{product.brand}</div>}
            <h1 className="font-display text-2xl lg:text-4xl font-bold text-neutral-900 leading-tight">{product.name}</h1>
            <div className="flex items-center gap-3">
              <div className="flex text-yellow-500">
                {[...Array(5)].map((_, i) => <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.rating) ? "fill-current" : "text-neutral-300"}`}/>)}
              </div>
              <span className="text-sm text-neutral-600">{product.rating} · 142 reviews</span>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-md">
              <div className="flex items-baseline gap-3">
                <span data-testid="product-price" className="font-display text-3xl lg:text-4xl font-bold text-indigo-600">{formatINR(product.price)}</span>
                {product.original_price && (
                  <>
                    <span className="text-neutral-400 line-through">{formatINR(product.original_price)}</span>
                    <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded font-bold">SAVE {off}%</span>
                  </>
                )}
              </div>
              <div className="text-xs text-green-700 font-bold mt-1">✓ Free delivery · Extra 5% off on prepaid</div>
            </div>
            <div className="text-sm">
              {product.stock > 0 ? (
                <span data-testid="stock-status" className="text-green-600 font-semibold flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> In Stock ({product.stock} available)</span>
              ) : (
                <span data-testid="stock-status" className="text-indigo-600 font-semibold">● Out of Stock</span>
              )}
            </div>
            <p className="text-neutral-600 leading-relaxed text-sm border-t border-neutral-200 pt-4">{product.description}</p>

            {/* Vehicle Selector — required when product has compatible_variants */}
            {((product.compatible_variants?.length > 0) || product.car_brands?.includes("ALL")) && (
              <div className="border-t border-neutral-200 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs uppercase tracking-wider font-bold text-stone-700">
                    Select Your Vehicle {product.car_brands?.includes("ALL") ? <span className="text-emerald-600">(optional · universal fit)</span> : <span className="text-rose-600">*</span>}
                  </div>
                </div>
                <CustomerVehicleSelector
                  allowedVariantIds={product.compatible_variants || []}
                  value={vehicle?.id}
                  onSelect={setVehicle}
                  isUniversal={product.car_brands?.includes("ALL")}
                />
              </div>
            )}

            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center border border-neutral-300 rounded">
                <button data-testid="qty-decrease" onClick={() => setQty(Math.max(1, qty - 1))} className="p-2.5 hover:bg-neutral-100 text-neutral-700"><Minus className="w-4 h-4"/></button>
                <span data-testid="qty-value" className="w-12 text-center font-bold">{qty}</span>
                <button data-testid="qty-increase" onClick={() => setQty(qty + 1)} className="p-2.5 hover:bg-neutral-100 text-neutral-700"><Plus className="w-4 h-4"/></button>
              </div>
              <button
                data-testid="add-cart-detail"
                onClick={() => {
                  const needsVehicle = (product.compatible_variants?.length > 0) && !product.car_brands?.includes("ALL");
                  if (needsVehicle && !vehicle?.id) { toast.error("Please select your vehicle first"); return; }
                  add(product, qty, vehicle);
                  toast.success(`${qty} added to cart${vehicle?.label ? ` · ${vehicle.label}` : ""}`);
                }}
                className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white font-bold uppercase tracking-wider text-sm py-3.5 rounded transition flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-4 h-4"/> Add to Cart
              </button>
            </div>
            <button
              data-testid="buy-now-btn"
              onClick={() => {
                const needsVehicle = (product.compatible_variants?.length > 0) && !product.car_brands?.includes("ALL");
                if (needsVehicle && !vehicle?.id) { toast.error("Please select your vehicle first"); return; }
                add(product, qty, vehicle); navigate("/checkout");
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-wider text-sm py-3.5 rounded transition"
            >
              Buy Now →
            </button>

            <div className="flex gap-4 text-xs pt-2 text-neutral-600">
              <button className="flex items-center gap-1 hover:text-indigo-600"><Heart className="w-4 h-4"/> Wishlist</button>
              <button className="flex items-center gap-1 hover:text-indigo-600"><Share2 className="w-4 h-4"/> Share</button>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-5 border-t border-neutral-200">
              <div className="text-center">
                <Truck className="w-5 h-5 mx-auto text-indigo-600 mb-2"/>
                <div className="text-xs text-neutral-700 font-semibold">Free Delivery</div>
              </div>
              <div className="text-center">
                <Shield className="w-5 h-5 mx-auto text-indigo-600 mb-2"/>
                <div className="text-xs text-neutral-700 font-semibold">1Y Warranty</div>
              </div>
              <div className="text-center">
                <RotateCcw className="w-5 h-5 mx-auto text-indigo-600 mb-2"/>
                <div className="text-xs text-neutral-700 font-semibold">7-Day Return</div>
              </div>
            </div>
          </div>
        </div>

        <ProductReviews productId={product.id}/>
      </div>
    </div>
  );
}
