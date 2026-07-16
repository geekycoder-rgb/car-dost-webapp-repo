import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Star, Eye, EyeOff, Trash2, BadgeCheck } from "lucide-react";
import { toast } from "sonner";

export default function AdminReviews() {
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState("all");

  const load = () => api.get("/admin/reviews").then((r) => setList(r.data?.items || r.data || []));
  useEffect(() => { load(); }, []);

  const toggle = async (rid, is_approved) => {
    await api.patch(`/admin/reviews/${rid}?is_approved=${is_approved}`);
    toast.success(is_approved ? "Approved" : "Hidden"); load();
  };
  const del = async (rid) => { if (!window.confirm("Delete review?")) return; await api.delete(`/admin/reviews/${rid}`); toast.success("Deleted"); load(); };

  const filtered = filter === "all" ? list : filter === "approved" ? list.filter((r) => r.is_approved) : list.filter((r) => !r.is_approved);

  return (
    <div className="bg-white border border-stone-200 rounded-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-display text-base font-bold uppercase">Reviews Moderation ({list.length})</h2>
        <div className="flex gap-2">
          {["all", "approved", "hidden"].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`text-xs px-3 py-1.5 rounded-full uppercase tracking-wider font-bold ${filter === f ? "bg-indigo-600 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"}`}>
              {f} ({f === "all" ? list.length : f === "approved" ? list.filter((r) => r.is_approved).length : list.filter((r) => !r.is_approved).length})
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-10 text-stone-500">No reviews to show.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} data-testid={`adm-review-${r.id}`} className={`border rounded-xl p-4 ${r.is_approved ? "border-stone-200 bg-white" : "border-amber-200 bg-amber-50/40"}`}>
              <div className="flex justify-between items-start gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex text-amber-500">
                    {[...Array(5)].map((_, i) => <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? "fill-current" : "text-stone-300"}`}/>)}
                  </div>
                  <span className="font-semibold text-sm">{r.name}</span>
                  {r.is_approved && <BadgeCheck className="w-3.5 h-3.5 text-emerald-500"/>}
                </div>
                <div className="text-[10px] text-stone-500">{new Date(r.created_at).toLocaleDateString()}</div>
              </div>
              <div className="font-semibold text-sm text-stone-950">{r.title}</div>
              <p className="text-sm text-stone-600 mt-1 leading-relaxed">{r.comment}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-200">
                <div className="text-[10px] text-stone-500">Product: <span className="font-mono">{r.product_id.slice(0, 8)}</span> · Status: <span className={r.is_approved ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>{r.is_approved ? "VISIBLE" : "HIDDEN"}</span></div>
                <div className="flex gap-1">
                  <button data-testid={`toggle-${r.id}`} onClick={() => toggle(r.id, !r.is_approved)} className="p-2 hover:bg-stone-100 rounded" title={r.is_approved ? "Hide" : "Approve"}>
                    {r.is_approved ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4 text-emerald-600"/>}
                  </button>
                  <button onClick={() => del(r.id)} className="p-2 hover:bg-rose-50 hover:text-rose-600 rounded"><Trash2 className="w-4 h-4"/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
