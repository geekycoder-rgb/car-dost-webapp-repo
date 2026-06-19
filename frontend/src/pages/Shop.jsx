import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") || "all";
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    api.get("/products", { params: { category, q: q || undefined } })
      .then((r) => setProducts(r.data))
      .finally(() => setLoading(false));
  }, [category, q]);

  const setCat = (slug) => {
    if (slug === "all") setParams({});
    else setParams({ category: slug });
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-10 space-y-4">
        <div className="text-xs uppercase tracking-[0.3em] text-red-500">Shop</div>
        <h1 className="font-display text-4xl lg:text-6xl font-black tracking-tighter">
          {category === "all" ? "All Products" : categories.find((c) => c.slug === category)?.name || "Products"}
        </h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside className="lg:w-64 shrink-0 space-y-6">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"/>
            <Input
              data-testid="search-input"
              placeholder="Search products..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-10 bg-[#141414] border-[#262626] text-white placeholder:text-neutral-500"
            />
          </div>

          <div className="space-y-1">
            <div className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">Categories</div>
            <button
              data-testid="filter-all"
              onClick={() => setCat("all")}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                category === "all" ? "bg-red-500/10 text-red-400 border border-red-500/30" : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
            >
              All Products
            </button>
            {categories.map((c) => (
              <button
                key={c.slug}
                data-testid={`filter-${c.slug}`}
                onClick={() => setCat(c.slug)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                  category === c.slug ? "bg-red-500/10 text-red-400 border border-red-500/30" : "text-neutral-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </aside>

        {/* Grid */}
        <div className="flex-1">
          <div className="text-sm text-neutral-500 mb-6" data-testid="results-count">
            {loading ? "Loading..." : `${products.length} products`}
          </div>
          {!loading && products.length === 0 ? (
            <div className="text-center py-20 text-neutral-500">No products found.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
              {products.map((p) => <ProductCard key={p.id} product={p}/>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
