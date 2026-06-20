import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal } from "lucide-react";

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") || "all";
  const initialQ = params.get("q") || "";
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState(initialQ);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("featured");

  useEffect(() => { api.get("/categories").then((r) => setCategories(r.data)); }, []);

  useEffect(() => {
    setLoading(true);
    api.get("/products", { params: { category, q: q || undefined } })
      .then((r) => {
        let list = [...r.data];
        if (sort === "low") list.sort((a, b) => a.price - b.price);
        else if (sort === "high") list.sort((a, b) => b.price - a.price);
        else if (sort === "rating") list.sort((a, b) => b.rating - a.rating);
        setProducts(list);
      })
      .finally(() => setLoading(false));
  }, [category, q, sort]);

  const setCat = (slug) => {
    const p = new URLSearchParams(params);
    if (slug === "all") p.delete("category"); else p.set("category", slug);
    setParams(p);
  };

  const activeCatName = category === "all" ? "All Products" : (categories.find((c) => c.slug === category)?.name || "Products");

  return (
    <div className="bg-white">
      {/* Breadcrumb header */}
      <div className="bg-neutral-50 border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-xs uppercase tracking-[0.2em] text-indigo-600 font-bold mb-2">Catalog</div>
          <h1 className="font-display text-3xl lg:text-4xl font-bold uppercase text-neutral-900">{activeCatName}</h1>
          <div className="text-xs text-neutral-500 mt-1">Home / Shop / {activeCatName}</div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside className="lg:w-64 shrink-0 space-y-6">
          <div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"/>
              <Input
                data-testid="search-input"
                placeholder="Search products..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9 h-10 border border-neutral-300 focus:border-indigo-600 text-sm"
              />
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-md p-4">
            <div className="text-xs uppercase tracking-[0.15em] font-bold text-neutral-900 mb-3 flex items-center gap-2 pb-2 border-b border-neutral-200">
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600"/> Categories
            </div>
            <button
              data-testid="filter-all"
              onClick={() => setCat("all")}
              className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                category === "all" ? "bg-indigo-50 text-indigo-600 font-bold" : "text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              All Products
            </button>
            {categories.map((c) => (
              <button
                key={c.slug}
                data-testid={`filter-${c.slug}`}
                onClick={() => setCat(c.slug)}
                className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                  category === c.slug ? "bg-indigo-50 text-indigo-600 font-bold" : "text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="bg-[#0F172A] text-white p-5 rounded-md">
            <div className="font-anton text-2xl mb-2">NEED HELP?</div>
            <p className="text-xs text-neutral-400 mb-3">Talk to our sound experts to choose the right setup for your car.</p>
            <a href="tel:+919063278724" className="block text-center bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider py-2.5 rounded transition">Call +91 90632 78724</a>
          </div>
        </aside>

        {/* Grid */}
        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-neutral-200">
            <div className="text-sm text-neutral-600" data-testid="results-count">
              {loading ? "Loading..." : `${products.length} product${products.length === 1 ? "" : "s"} found`}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <label className="text-xs uppercase tracking-wider font-bold text-neutral-700">Sort:</label>
              <select value={sort} onChange={(e) => setSort(e.target.value)} data-testid="sort-select" className="border border-neutral-300 rounded px-3 py-1.5 text-sm bg-white">
                <option value="featured">Featured</option>
                <option value="low">Price: Low to High</option>
                <option value="high">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>
          </div>
          {!loading && products.length === 0 ? (
            <div className="text-center py-20 text-neutral-500 bg-neutral-50 rounded">No products found.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {products.map((p) => <ProductCard key={p.id} product={p}/>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
