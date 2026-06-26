import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import { ArrowLeft } from "lucide-react";

const CATEGORY_ALIAS = {
  "car-key-covers": "key-chains",
  "key-covers": "key-chains",
  "car-covers": "body-covers",
  "car-audio": "android-stereos",
  "car-speakers": "speakers",
  "car-amplifiers": "amplifiers",
  "car-dash-cameras": "dash-cameras",
  "car-led-lights": "led-lights",
  "car-perfumes": "perfumes",
  "car-accessories": "accessories",
};

function slugify(value) {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CategoryModelPage() {
  const { category, model: modelSlug } = useParams();
  const [categories, setCategories] = useState([]);
  const [carModels, setCarModels] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const actualCategory = CATEGORY_ALIAS[category] || category;
  const categoryMeta = useMemo(
    () => categories.find((item) => item.slug === actualCategory),
    [categories, actualCategory]
  );

  const match = useMemo(() => {
    const slug = modelSlug || "";
    return carModels
      .map((entry) => ({
        ...entry,
        slug: `${slugify(entry.brand)}-${slugify(entry.model)}`,
      }))
      .find((entry) => entry.slug === slug);
  }, [carModels, modelSlug]);

  useEffect(() => {
    setLoading(true);
    setError("");
    Promise.all([api.get("/categories"), api.get("/catalog/car-models")])
      .then(([catRes, modelRes]) => {
        setCategories(catRes.data || []);
        setCarModels(modelRes.data || []);
      })
      .catch(() => {
        setError("Unable to load page data. Please try again later.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!match || !categoryMeta) {
      return;
    }
    setLoading(true);
    api
      .get("/products/filter", {
        params: {
          category: actualCategory,
          car_brand: match.brand,
          car_model: match.model,
        },
      })
      .then((res) => {
        setProducts(res.data || []);
        if (!res.data || res.data.length === 0) {
          setError(
            `No products found for ${match.brand} ${match.model} in ${categoryMeta.name}.`
          );
        }
      })
      .catch(() => {
        setError("Unable to fetch products for this vehicle right now.");
      })
      .finally(() => setLoading(false));
  }, [category, categoryMeta, match]);

  const pageTitle = match
    ? `${categoryMeta?.name || "Products"} for ${match.brand} ${match.model} | CarDost`
    : "CarDost";
  const pageDesc = match
    ? `Shop ${categoryMeta?.name?.toLowerCase()} for ${match.brand} ${match.model}. Filtered car accessories with guaranteed fit, quick delivery, and easy returns.`
    : "CarDost car accessories.";
  const origin = typeof window !== "undefined" ? window.location.origin : "https://cardost.in";
  const canonical = `${origin}/${category}/${modelSlug}`;

  if (loading && products.length === 0) {
    return (
      <div className="bg-stone-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-20 text-center text-stone-600">Loading...</div>
      </div>
    );
  }

  if (error || !categoryMeta || !match) {
    return (
      <div className="bg-stone-50 min-h-screen">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <div className="text-sm uppercase tracking-[0.2em] font-bold text-indigo-600 mb-3">Page not found</div>
          <h1 className="text-3xl font-bold text-stone-900 mb-4">Invalid car model landing page</h1>
          <p className="text-stone-600 mb-6">
            {error || "We could not find the requested category or car model."}
          </p>
          <Link to="/shop" className="inline-flex items-center gap-2 rounded-full bg-indigo-600 text-white px-5 py-3 text-sm font-bold hover:bg-indigo-700 transition">
            <ArrowLeft className="w-4 h-4" /> Back to shop
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-stone-50">
      <meta name="description" content={pageDesc} />
      <link rel="canonical" href={canonical} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDesc} />
      <meta property="og:url" content={canonical} />
      {categoryMeta?.image && <meta property="og:image" content={categoryMeta.image} />}
      <meta name="twitter:card" content="summary_large_image" />

      <div className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-xs uppercase tracking-[0.2em] text-indigo-600 font-bold mb-2">{categoryMeta.name}</div>
          <h1 className="font-display text-3xl lg:text-4xl font-bold text-stone-950">{categoryMeta.name} for {match.brand} {match.model}</h1>
          <div className="text-xs text-stone-500 mt-1">
            Home / Shop / <Link to="/shop" className="text-indigo-600 hover:underline">Shop</Link> / <Link to={`/shop?category=${category}`} className="text-indigo-600 hover:underline">{categoryMeta.name}</Link> / {match.brand} {match.model}
          </div>
          <p className="mt-4 text-stone-600 max-w-2xl">{pageDesc}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <div className="text-sm text-stone-500">{products.length} result{products.length === 1 ? "" : "s"} found</div>
            <h2 className="text-2xl font-bold text-stone-900">Brand-specific selections for {match.brand} {match.model}</h2>
          </div>
          <Link to={`/shop?category=${category}&car_brand=${encodeURIComponent(match.brand)}&car_model=${encodeURIComponent(match.model)}`} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">View filter page</Link>
        </div>

        {products.length === 0 ? (
          <div className="rounded-3xl bg-white border border-stone-200 p-12 text-center text-stone-500">No products are currently available for this model.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {products.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        )}
      </div>
    </div>
  );
}
