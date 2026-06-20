import { Star, BadgeCheck, Quote } from "lucide-react";
import { REVIEWS, REVIEW_STATS } from "@/data/reviews";
import { Link } from "react-router-dom";

export default function ReviewsBanner() {
  // Show top 8 reviews (2 per category)
  const featured = ["key-chains", "body-covers", "speakers", "amplifiers"].flatMap((cat) =>
    REVIEWS.filter((r) => r.category === cat).slice(0, 2)
  );

  return (
    <section className="bg-gradient-to-b from-stone-50 to-white border-y border-stone-200">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex flex-col lg:flex-row gap-8 mb-10">
          <div className="lg:w-1/3">
            <div className="text-xs uppercase tracking-[0.3em] text-indigo-600 font-bold mb-3">★ ★ ★ ★ ★ Reviews</div>
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-stone-950 leading-tight mb-3">
              Trusted by <span className="text-indigo-600">{REVIEW_STATS.total.toLocaleString()}+</span> drivers across India
            </h2>
            <p className="text-stone-600 text-sm leading-relaxed mb-5">
              Every review you see is from a verified CarDost customer. We have nothing to hide — only 5-star stories from happy car owners.
            </p>
            <div className="bg-white border border-stone-200 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="font-anton text-5xl text-stone-950 leading-none">{REVIEW_STATS.average}</div>
                <div>
                  <div className="flex text-amber-500">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current"/>)}
                  </div>
                  <div className="text-xs text-stone-500 mt-1">{REVIEW_STATS.total.toLocaleString()} verified reviews</div>
                </div>
              </div>
              <div className="space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="text-stone-600 w-6">{star}★</span>
                    <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${REVIEW_STATS.distribution[star]}%` }}/>
                    </div>
                    <span className="text-stone-500 w-8 text-right">{REVIEW_STATS.distribution[star]}%</span>
                  </div>
                ))}
              </div>
              <Link to="/reviews" data-testid="all-reviews-link" className="block mt-5 text-center bg-stone-950 hover:bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider py-3 rounded-full transition">
                Read All Reviews →
              </Link>
            </div>
          </div>

          <div className="lg:w-2/3">
            <div className="grid sm:grid-cols-2 gap-4">
              {featured.map((r) => (
                <div key={r.id} data-testid={`review-card-${r.id}`} className="relative bg-white border border-stone-200 hover:border-indigo-300 hover:shadow-lg transition rounded-2xl p-5 group">
                  <Quote className="absolute top-4 right-4 w-8 h-8 text-indigo-100 group-hover:text-indigo-200 transition"/>
                  <div className="flex text-amber-500 mb-2">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-current"/>)}
                  </div>
                  <p className="text-sm text-stone-700 leading-relaxed mb-4 line-clamp-3">&ldquo;{r.review}&rdquo;</p>
                  <div className="flex items-center gap-3 pt-3 border-t border-stone-100">
                    <div className={`w-10 h-10 rounded-full grid place-items-center font-bold text-white text-sm ${r.color} shrink-0`}>
                      {r.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-stone-950 truncate">{r.name}</span>
                        {r.verified && <BadgeCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0"/>}
                      </div>
                      <div className="text-[10px] text-stone-500 truncate">{r.location} · {r.date}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-[10px] uppercase tracking-wider text-indigo-600 font-bold truncate">
                    {r.productName}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
