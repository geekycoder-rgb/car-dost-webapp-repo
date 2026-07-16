import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal, ChevronDown, ChevronUp, X } from "lucide-react";

function FilterSection({ id, title, open, toggle, children }) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
      <button onClick={() => toggle(id)} className="w-full flex items-center justify-between p-4 text-left">
        <span className="text-xs uppercase tracking-[0.15em] font-bold text-stone-900">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-stone-500"/> : <ChevronDown className="w-4 h-4 text-stone-500"/>}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") || "all";
  const initialQ = params.get("q") || "";
  const carBrand = params.get("car_brand") || "";
  const carModel = params.get("car_model") || "";
  const year = params.get("year") || "";

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [carBrands, setCarBrands] = useState([]);
  const [carModels, setCarModels] = useState([]);
  const [years, setYears] = useState([]);
  const [q, setQ] = useState(initialQ);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("featured");
  const [filterOpen, setFilterOpen] = useState({ category: true, vehicle: true });

  // Sync local search state when URL ?q= changes (e.g. user submits header search while already on /shop)
  useEffect(() => { setQ(params.get("q") || ""); }, [params]);

  // Push sidebar typing back to URL (debounced) so refresh & back-button preserve it
  useEffect(() => {
    const urlQ = params.get("q") || "";
    if (q === urlQ) return;
    const id = setTimeout(() => {
      const p = new URLSearchParams(params);
      if (q.trim()) p.set("q", q.trim()); else p.delete("q");
      setParams(p, { replace: true });
    }, 350);
    return () => clearTimeout(id);
  }, [q, params, setParams]);

  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data));
    api.get("/catalog/car-brands").then((r) => setCarBrands(r.data));
    api.get("/catalog/years").then((r) => setYears(r.data));
  }, []);

  useEffect(() => {
    if (carBrand) {
      api.get("/catalog/car-models", { params: { brand: carBrand } }).then((r) => setCarModels(r.data));
    } else {
      setCarModels([]);
    }
  }, [carBrand]);

  useEffect(() => {
    setLoading(true);
    const filterParams = { category, q: q || undefined, car_brand: carBrand || undefined, car_model: carModel || undefined, year: year || undefined };
    api.get("/products/filter", { params: filterParams })
      .then((r) => {
        // Handle both paginated and non-paginated responses
        let list = r.data.items || r.data;
        if (sort === "low") list.sort((a, b) => a.price - b.price);
        else if (sort === "high") list.sort((a, b) => b.price - a.price);
        else if (sort === "rating") list.sort((a, b) => b.rating - a.rating);
        setProducts(list);
      })
      .finally(() => setLoading(false));
  }, [category, q, sort, carBrand, carModel, year]);

  const updateParam = (key, val) => {
    const p = new URLSearchParams(params);
    if (!val || val === "all") p.delete(key); else p.set(key, val);
    if (key === "car_brand") p.delete("car_model");
    setParams(p);
  };

  const clearVehicle = () => {
    const p = new URLSearchParams(params);
    p.delete("car_brand"); p.delete("car_model"); p.delete("year");
    setParams(p);
  };

  const activeCat = category === "all" ? null : categories.find((c) => c.slug === category);
  const activeCatName = activeCat?.name || (category === "all" ? "All Products" : "Products");

  // SEO — category-aware <title> & description.
  // Uses category.meta_title / meta_description if admin has set them, else auto-generates.
  const origin = typeof window !== "undefined" ? window.location.origin : "https://cardost.in";
  const canonical = category === "all" ? `${origin}/shop` : `${origin}/shop?category=${category}`;
  const pageTitle = (() => {
    if (q) return `Search: ${q} — CarDost`;
    if (activeCat?.meta_title) return activeCat.meta_title;
    if (activeCat) return `Buy ${activeCat.name} Online India | CarDost`;
    return "Shop Car Stereos, Speakers & Accessories Online India | CarDost";
  })();
  const pageDesc = (() => {
    if (activeCat?.meta_description) return activeCat.meta_description;
    if (activeCat) return `Shop premium ${activeCat.name.toLowerCase()} online in India. ${activeCat.description || "Free shipping, GST invoice, 7-day return."} Pan-India delivery from CarDost.`;
    return "Shop premium car Android stereos, speakers, amplifiers, dash cams, LED lights and accessories. Free shipping all India. CarDost.";
  })();
  const hasVehicleFilter = carBrand || carModel || year;

  // Imperative document.title set — React 19's native hoist doesn't replace the static title in index.html
  useEffect(() => {
    const prev = document.title;
    document.title = pageTitle;
    return () => { document.title = prev; };
  }, [pageTitle]);

  const Section = ({ id, title, children }) => null; // moved out

  return (
    <div className="bg-stone-50">
      {/* React 19 auto-hoists <meta>/<link> to <head>. <title> is set via useEffect above. */}
      <meta name="description" content={pageDesc} />
      <link rel="canonical" href={canonical} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDesc} />
      <meta property="og:url" content={canonical} />
      {activeCat?.image && <meta property="og:image" content={activeCat.image} />}
      <meta name="twitter:card" content="summary_large_image" />
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-xs uppercase tracking-[0.2em] text-indigo-600 font-bold mb-2">Catalog</div>
          <h1 className="font-display text-3xl lg:text-4xl font-bold text-stone-950">{activeCatName}</h1>
          <div className="text-xs text-stone-500 mt-1">Home / Shop / {activeCatName}</div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-72 shrink-0 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"/>
            <Input data-testid="search-input" placeholder="Search products..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 h-10 border-stone-300 focus:border-indigo-600 text-sm"/>
          </div>

          <FilterSection id="category" title="Categories" open={filterOpen.category} toggle={(k) => setFilterOpen({ ...filterOpen, [k]: !filterOpen[k] })}>
            <div className="space-y-1">
              <button data-testid="filter-all" onClick={() => updateParam("category", "all")}
                      className={`w-full text-left px-3 py-2 rounded text-sm transition ${category === "all" ? "bg-indigo-50 text-indigo-700 font-bold" : "text-stone-700 hover:bg-stone-100"}`}>
                All Products
              </button>
              {categories.map((c) => (
                <button key={c.slug} data-testid={`filter-${c.slug}`} onClick={() => updateParam("category", c.slug)}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition ${category === c.slug ? "bg-indigo-50 text-indigo-700 font-bold" : "text-stone-700 hover:bg-stone-100"}`}>
                  {c.name}
                </button>
              ))}
            </div>
          </FilterSection>

          <FilterSection id="vehicle" title="My Car" open={filterOpen.vehicle} toggle={(k) => setFilterOpen({ ...filterOpen, [k]: !filterOpen[k] })}>
            {hasVehicleFilter && (
              <button onClick={clearVehicle} className="text-[11px] text-indigo-600 hover:underline mb-2 flex items-center gap-1">
                <X className="w-3 h-3"/> Clear vehicle filter
              </button>
            )}
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-stone-500 mb-1 block">Brand</label>
                <select data-testid="filter-car-brand" value={carBrand} onChange={(e) => updateParam("car_brand", e.target.value)}
                        className="w-full border border-stone-300 rounded px-3 py-2 text-sm bg-white">
                  <option value="">All Brands</option>
                  {carBrands.filter((b) => b.name !== "ALL").map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
                </select>
              </div>
              {carBrand && (
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-bold text-stone-500 mb-1 block">Model</label>
                  <select data-testid="filter-car-model" value={carModel} onChange={(e) => updateParam("car_model", e.target.value)}
                          className="w-full border border-stone-300 rounded px-3 py-2 text-sm bg-white">
                    <option value="">All {carBrand} Models</option>
                    {carModels.map((m) => <option key={m.model} value={m.model}>{m.model}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-stone-500 mb-1 block">Manufacturing Year</label>
                <select data-testid="filter-year" value={year} onChange={(e) => updateParam("year", e.target.value)}
                        className="w-full border border-stone-300 rounded px-3 py-2 text-sm bg-white">
                  <option value="">All Years</option>
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          </FilterSection>

          <div className="bg-stone-950 text-white p-5 rounded-2xl">
            <div className="font-anton text-2xl mb-2">NEED HELP?</div>
            <p className="text-xs text-stone-400 mb-3">Talk to our sound experts to choose the right setup.</p>
            <a href="tel:+919063278724" className="block text-center bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider py-2.5 rounded-full transition">Call Us</a>
          </div>
        </aside>

        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-stone-200">
            <div className="text-sm text-stone-600" data-testid="results-count">
              {loading ? "Loading..." : `${products.length} product${products.length === 1 ? "" : "s"} found`}
              {hasVehicleFilter && (
                <span className="ml-2 text-[10px] uppercase tracking-wider text-indigo-600 font-bold">
                  · {[carBrand, carModel, year].filter(Boolean).join(" · ")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <SlidersHorizontal className="w-4 h-4 text-stone-500"/>
              <label className="text-xs uppercase tracking-wider font-bold text-stone-700">Sort:</label>
              <select value={sort} onChange={(e) => setSort(e.target.value)} data-testid="sort-select" className="border border-stone-300 rounded px-3 py-1.5 text-sm bg-white">
                <option value="featured">Featured</option>
                <option value="low">Price: Low to High</option>
                <option value="high">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>
          </div>
          {!loading && products.length === 0 ? (
            <div className="text-center py-20 text-stone-500 bg-white rounded-2xl border border-stone-200">No products match these filters.</div>
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
