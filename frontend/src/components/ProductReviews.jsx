import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Send, BadgeCheck } from "lucide-react";
import { toast } from "sonner";

export default function ProductReviews({ productId }) {
  const [reviews, setReviews] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", rating: 5, title: "", comment: "" });

  const load = useCallback(() => {
    return api.get(`/products/${productId}/reviews`).then((r) => setReviews(r.data));
  }, [productId]);
  useEffect(() => {
    if (productId) load();
  }, [productId, load]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.title.trim() || !form.comment.trim()) {
      toast.error("Please fill all fields"); return;
    }
    setSubmitting(true);
    try {
      await api.post(`/products/${productId}/reviews`, form);
      toast.success("Thanks! Your review was posted.");
      setForm({ name: "", rating: 5, title: "", comment: "" });
      setShowForm(false);
      load();
    } catch (err) {
      const d = err.response?.data?.detail;
      toast.error(typeof d === "string" ? d : "Failed to post review");
    } finally {
      setSubmitting(false);
    }
  };

  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : 0;
  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    pct: reviews.length ? Math.round((reviews.filter((r) => r.rating === star).length / reviews.length) * 100) : 0,
  }));

  return (
    <section className="border-t border-stone-200 mt-12 pt-12" data-testid="product-reviews">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-indigo-600 font-bold mb-2">Customer Reviews</div>
          <h2 className="font-display text-2xl lg:text-3xl font-bold text-stone-950">What buyers say</h2>
        </div>
        <Button data-testid="write-review-btn" onClick={() => setShowForm(!showForm)} className="bg-stone-950 hover:bg-indigo-600 text-white font-bold uppercase tracking-wider text-xs px-5 py-2.5">
          {showForm ? "Close" : "Write a Review"}
        </Button>
      </div>

      {/* Summary */}
      {reviews.length > 0 && (
        <div className="grid sm:grid-cols-3 gap-5 bg-stone-50 border border-stone-200 rounded-2xl p-6 mb-6">
          <div className="text-center sm:border-r sm:border-stone-200 sm:pr-5">
            <div className="font-anton text-5xl text-stone-950 leading-none">{avg.toFixed(1)}</div>
            <div className="flex justify-center text-amber-500 mt-2">
              {[...Array(5)].map((_, i) => <Star key={i} className={`w-4 h-4 ${i < Math.round(avg) ? "fill-current" : "text-stone-300"}`}/>)}
            </div>
            <div className="text-xs text-stone-500 mt-1.5">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</div>
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            {dist.map((d) => (
              <div key={d.star} className="flex items-center gap-2 text-xs">
                <span className="text-stone-600 w-8">{d.star}★</span>
                <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${d.pct}%` }}/>
                </div>
                <span className="text-stone-500 w-12 text-right">{d.count} ({d.pct}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={submit} className="bg-white border-2 border-indigo-200 rounded-2xl p-6 mb-6 space-y-4" data-testid="review-form">
          <h3 className="font-display text-lg font-bold text-stone-950">Share your experience</h3>
          <div>
            <Label className="text-xs uppercase font-bold text-stone-700">Your Rating</Label>
            <div className="flex gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" data-testid={`star-${n}`} onClick={() => setForm({ ...form, rating: n })} className="p-1">
                  <Star className={`w-7 h-7 transition ${n <= form.rating ? "fill-amber-500 text-amber-500" : "text-stone-300 hover:text-amber-300"}`}/>
                </button>
              ))}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase font-bold text-stone-700">Your Name *</Label>
              <Input data-testid="review-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border-stone-300 mt-1.5" placeholder="e.g. Arjun M."/>
            </div>
            <div>
              <Label className="text-xs uppercase font-bold text-stone-700">Review Title *</Label>
              <Input data-testid="review-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="border-stone-300 mt-1.5" placeholder="Sum up in a few words"/>
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase font-bold text-stone-700">Your Review *</Label>
            <Textarea data-testid="review-comment" rows={4} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} className="border-stone-300 mt-1.5" placeholder="Tell other buyers what you loved (or didn't)"/>
          </div>
          <Button data-testid="submit-review" disabled={submitting} type="submit" className="bg-indigo-600 hover:bg-indigo-700 font-bold uppercase tracking-wider text-xs">
            <Send className="w-4 h-4 mr-2"/> {submitting ? "Posting..." : "Post Review"}
          </Button>
        </form>
      )}

      {/* List */}
      {reviews.length === 0 ? (
        <div className="text-center py-10 text-stone-500 bg-stone-50 rounded-2xl border border-stone-200">
          No reviews yet. Be the first to share your experience!
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} data-testid={`review-${r.id}`} className="bg-white border border-stone-200 rounded-2xl p-5 hover:border-indigo-200 transition">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-stone-950">{r.name}</span>
                    <BadgeCheck className="w-3.5 h-3.5 text-indigo-500"/>
                  </div>
                  <div className="flex text-amber-500 mt-1">
                    {[...Array(5)].map((_, i) => <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? "fill-current" : "text-stone-300"}`}/>)}
                  </div>
                </div>
                <div className="text-[10px] text-stone-500">{new Date(r.created_at).toLocaleDateString()}</div>
              </div>
              <h4 className="font-semibold text-sm text-stone-950 mt-2">{r.title}</h4>
              <p className="text-sm text-stone-600 leading-relaxed mt-1">{r.comment}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
