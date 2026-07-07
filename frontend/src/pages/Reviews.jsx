import { useState, useEffect } from "react";
import { Star, BadgeCheck, Quote, Filter } from "lucide-react";
import { REVIEWS, REVIEW_CATEGORIES, REVIEW_STATS } from "@/data/reviews";

export default function Reviews() {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? REVIEWS : REVIEWS.filter((r) => r.category === filter);

  useEffect(() => {
    const prev = document.title;
    document.title = "Customer Reviews — CarDost Car Audio India";
    return () => { document.title = prev; };
  }, []);

  return (
    <div className="bg-stone-50 min-h-screen">
      <meta name="description" content="Read verified customer reviews for CarDost car audio products. 4.8 ★ average from 10,000+ happy drivers across India." />
      <link rel="canonical" href="https://cardost.in/reviews" />
      <meta property="og:type" content="website" />
      <meta property="og:title" content="Customer Reviews — CarDost Car Audio India" />
      <meta property="og:description" content="Read verified customer reviews for CarDost car audio products. 4.8 ★ average from 10,000+ happy drivers across India." />
      <meta property="og:url" content="https://cardost.in/reviews" />
      <meta name="twitter:card" content="summary" />
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-6 py-10 text-center">
          <div className="text-xs uppercase tracking-[0.3em] text-indigo-600 font-bold mb-3">★ ★ ★ ★ ★</div>
          <h1 className="font-display text-3xl lg:text-5xl font-bold text-stone-950 mb-3">Customer Reviews</h1>
          <p className="text-sm text-stone-600 max-w-2xl mx-auto">Every review below is from a verified customer. Real feedback from real drivers across India.</p>
          <div className="flex items-center justify-center gap-6 mt-6 text-sm">
            <div>
              <div className="font-anton text-4xl text-stone-950 leading-none">{REVIEW_STATS.average}</div>
              <div className="flex text-amber-500 justify-center mt-1">{[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-current"/>)}</div>
            </div>
            <div className="text-left text-stone-600">
              <div className="font-bold text-stone-950">{REVIEW_STATS.total.toLocaleString()}+ reviews</div>
              <div className="text-xs">{REVIEW_STATS.distribution[5]}% are 5-star</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Filter tabs */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          <Filter className="w-4 h-4 text-stone-500 shrink-0"/>
          <span className="text-xs uppercase tracking-wider font-bold text-stone-700 mr-2 shrink-0">Filter:</span>
          {REVIEW_CATEGORIES.map((c) => {
            const count = c.slug === "all" ? REVIEWS.length : REVIEWS.filter((r) => r.category === c.slug).length;
            const active = filter === c.slug;
            return (
              <button
                key={c.slug}
                data-testid={`filter-${c.slug}`}
                onClick={() => setFilter(c.slug)}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition ${
                  active ? "bg-indigo-600 text-white" : "bg-white border border-stone-200 text-stone-700 hover:border-indigo-300"
                }`}
              >
                {c.label} <span className={active ? "text-indigo-200" : "text-stone-400"}>({count})</span>
              </button>
            );
          })}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((r) => (
            <div key={r.id} data-testid={`review-${r.id}`} className="relative bg-white border border-stone-200 hover:border-indigo-300 hover:shadow-lg transition rounded-2xl p-6 group">
              <Quote className="absolute top-4 right-4 w-8 h-8 text-indigo-100"/>
              <div className="flex text-amber-500 mb-3">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current"/>)}
              </div>
              <p className="text-sm text-stone-700 leading-relaxed mb-5">&ldquo;{r.review}&rdquo;</p>
              <div className="text-[10px] uppercase tracking-wider text-indigo-600 font-bold mb-3 line-clamp-1">
                {r.productName}
              </div>
              <div className="flex items-center gap-3 pt-4 border-t border-stone-100">
                <div className={`w-10 h-10 rounded-full grid place-items-center font-bold text-white text-sm ${r.color} shrink-0`}>{r.initials}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-stone-950 truncate">{r.name}</span>
                    {r.verified && <BadgeCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0"/>}
                  </div>
                  <div className="text-[10px] text-stone-500">{r.location} · {r.date}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-stone-500">No reviews found in this category.</div>
        )}
      </div>
    </div>
  );
}
