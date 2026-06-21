import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Plus, Edit, Trash2, GripVertical, EyeOff, Eye as EyeIcon } from "lucide-react";
import { toast } from "sonner";

const EMPTY = { slug: "", name: "", description: "", image: "", icon: "Package", parent_slug: null, is_active: true, sort_order: 100 };

export default function AdminCategories() {
  const [cats, setCats] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const load = () => api.get("/admin/categories").then((r) => setCats(r.data));
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ ...EMPTY, sort_order: cats.length + 1 }); setOpen(true); };
  const openEdit = (c) => { setEditing(c); setForm({ ...EMPTY, ...c }); setOpen(true); };

  const save = async () => {
    if (!form.slug.trim() || !form.name.trim()) return toast.error("Slug and Name required");
    try {
      if (editing) await api.put(`/admin/categories/${editing.slug}`, form);
      else await api.post("/admin/categories", form);
      toast.success("Saved"); setOpen(false); load();
    } catch (e) {
      const d = e.response?.data?.detail;
      toast.error(typeof d === "string" ? d : "Save failed");
    }
  };

  const toggleActive = async (c) => {
    await api.put(`/admin/categories/${c.slug}`, { ...c, is_active: !c.is_active });
    load();
  };

  const del = async (slug) => {
    if (!window.confirm("Delete this category?")) return;
    try { await api.delete(`/admin/categories/${slug}`); toast.success("Deleted"); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Delete failed"); }
  };

  const move = async (idx, dir) => {
    const newCats = [...cats];
    const target = idx + dir;
    if (target < 0 || target >= newCats.length) return;
    [newCats[idx], newCats[target]] = [newCats[target], newCats[idx]];
    setCats(newCats);
    await api.patch("/admin/categories/reorder", newCats.map((c, i) => ({ slug: c.slug, sort_order: i + 1 })));
  };

  return (
    <div className="bg-white border border-stone-200 rounded-md overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b border-stone-200">
        <h2 className="font-display text-base font-bold uppercase">Categories ({cats.length})</h2>
        <Button data-testid="add-category-btn" onClick={openNew} className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold uppercase">
          <Plus className="w-4 h-4 mr-1"/> Add Category
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-8"></TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Active</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cats.map((c, i) => (
            <TableRow key={c.slug}>
              <TableCell>
                <div className="flex flex-col">
                  <button onClick={() => move(i, -1)} className="text-stone-400 hover:text-indigo-600 leading-none">▲</button>
                  <button onClick={() => move(i, 1)} className="text-stone-400 hover:text-indigo-600 leading-none">▼</button>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-2 items-center">
                  {c.image && <img src={c.image} alt="" className="w-8 h-8 rounded object-cover"/>}
                  <span className="font-medium">{c.name}</span>
                </div>
              </TableCell>
              <TableCell className="font-mono text-xs text-stone-500">{c.slug}</TableCell>
              <TableCell>{c.sort_order}</TableCell>
              <TableCell>
                <button data-testid={`toggle-${c.slug}`} onClick={() => toggleActive(c)} className={c.is_active ? "text-emerald-600" : "text-stone-400"}>
                  {c.is_active ? <EyeIcon className="w-4 h-4"/> : <EyeOff className="w-4 h-4"/>}
                </button>
              </TableCell>
              <TableCell className="text-right">
                <button data-testid={`edit-cat-${c.slug}`} onClick={() => openEdit(c)} className="p-2 hover:bg-stone-100 rounded"><Edit className="w-4 h-4"/></button>
                <button data-testid={`del-cat-${c.slug}`} onClick={() => del(c.slug)} className="p-2 hover:bg-rose-50 hover:text-rose-600 rounded"><Trash2 className="w-4 h-4"/></button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white">
          <DialogHeader><DialogTitle className="font-display">{editing ? "Edit" : "New"} Category</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs uppercase font-bold">Name *</Label><Input data-testid="cat-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1"/></div>
            <div><Label className="text-xs uppercase font-bold">Slug * (kebab-case, e.g. android-stereos)</Label><Input data-testid="cat-slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} className="mt-1"/></div>
            <div><Label className="text-xs uppercase font-bold">Description</Label><Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1"/></div>
            <div><Label className="text-xs uppercase font-bold">Image URL</Label><Input value={form.image || ""} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://..." className="mt-1"/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs uppercase font-bold">Parent Category</Label>
                <select value={form.parent_slug || ""} onChange={(e) => setForm({ ...form, parent_slug: e.target.value || null })} className="w-full border border-stone-300 rounded px-3 py-2 text-sm mt-1">
                  <option value="">— Top Level —</option>
                  {cats.filter((c) => c.slug !== form.slug).map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                </select>
              </div>
              <div><Label className="text-xs uppercase font-bold">Sort Order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} className="mt-1"/></div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })}/>
              <span className="text-sm">Active (visible on frontend)</span>
            </div>
          </div>
          <Button data-testid="save-cat" onClick={save} className="bg-indigo-600 hover:bg-indigo-700 font-bold uppercase text-xs">Save Category</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
