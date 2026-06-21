import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

const MESH = ["mesh-indigo", "mesh-stereo", "mesh-speakers", "mesh-amber", "mesh-emerald"];
const EMPTY = { title: "", subtitle: "", badge: "", cta_text: "Shop Now", cta_link: "/shop", mesh: "mesh-indigo", accent: "#A5B4FC", image: "", sort_order: 100, is_active: true };

export default function AdminBanners() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const load = () => api.get("/admin/banners").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.title.trim()) return toast.error("Title required");
    try {
      const payload = { ...form, sort_order: parseInt(form.sort_order || 0) };
      if (editing) await api.put(`/admin/banners/${editing.id}`, payload);
      else await api.post("/admin/banners", payload);
      toast.success("Saved"); setOpen(false); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Save failed"); }
  };

  const del = async (id) => { if (!window.confirm("Delete?")) return; await api.delete(`/admin/banners/${id}`); load(); };

  return (
    <div className="bg-white border border-stone-200 rounded-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-display text-base font-bold uppercase">Hero Banners ({list.length})</h2>
        <Button data-testid="add-banner" onClick={() => { setEditing(null); setForm({ ...EMPTY, sort_order: list.length + 1 }); setOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold uppercase">
          <Plus className="w-4 h-4 mr-1"/> Add Banner
        </Button>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {list.map((b) => (
          <div key={b.id} data-testid={`banner-${b.id}`} className={`relative rounded-2xl p-6 text-white overflow-hidden ${b.mesh}`}>
            <div className="absolute top-2 right-2 flex gap-1 z-10">
              <button onClick={() => { setEditing(b); setForm({ ...EMPTY, ...b }); setOpen(true); }} className="w-7 h-7 grid place-items-center bg-white/20 hover:bg-white/40 rounded"><Edit className="w-3.5 h-3.5"/></button>
              <button onClick={() => del(b.id)} className="w-7 h-7 grid place-items-center bg-white/20 hover:bg-rose-500 rounded"><Trash2 className="w-3.5 h-3.5"/></button>
            </div>
            <div className="font-anton text-2xl">{b.title}</div>
            <div className="text-xs opacity-90 mt-1">{b.subtitle}</div>
            <div className="text-[10px] uppercase tracking-wider mt-2 text-amber-300">{b.badge}</div>
            <div className="flex justify-between items-end mt-3 text-[10px]">
              <span>Order: {b.sort_order}</span>
              <span>{b.is_active ? "🟢 Active" : "⚫ Off"}</span>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{editing ? "Edit" : "New"} Banner</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs uppercase font-bold">Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1"/></div>
            <div><Label className="text-xs uppercase font-bold">Subtitle</Label><Input value={form.subtitle || ""} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className="mt-1"/></div>
            <div><Label className="text-xs uppercase font-bold">Badge / Promo Text</Label><Input value={form.badge || ""} onChange={(e) => setForm({ ...form, badge: e.target.value })} className="mt-1" placeholder="e.g. EXTRA 5% OFF · CODE SAVE5"/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs uppercase font-bold">CTA Text</Label><Input value={form.cta_text || ""} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} className="mt-1"/></div>
              <div><Label className="text-xs uppercase font-bold">CTA Link</Label><Input value={form.cta_link || ""} onChange={(e) => setForm({ ...form, cta_link: e.target.value })} className="mt-1" placeholder="/shop?category=…"/></div>
              <div><Label className="text-xs uppercase font-bold">Mesh Style</Label>
                <Select value={form.mesh} onValueChange={(v) => setForm({ ...form, mesh: v })}>
                  <SelectTrigger className="mt-1"><SelectValue/></SelectTrigger>
                  <SelectContent>{MESH.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs uppercase font-bold">Accent Color (hex)</Label><Input value={form.accent || ""} onChange={(e) => setForm({ ...form, accent: e.target.value })} className="mt-1" placeholder="#A5B4FC"/></div>
            </div>
            <div><Label className="text-xs uppercase font-bold">Background Image URL</Label><Input value={form.image || ""} onChange={(e) => setForm({ ...form, image: e.target.value })} className="mt-1"/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs uppercase font-bold">Sort Order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className="mt-1"/></div>
              <div className="flex items-end gap-2 pb-1.5"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })}/><span className="text-sm">Active</span></div>
            </div>
          </div>
          <Button onClick={save} className="bg-indigo-600 hover:bg-indigo-700 font-bold uppercase text-xs">Save Banner</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
