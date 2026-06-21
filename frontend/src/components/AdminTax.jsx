import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Percent } from "lucide-react";
import { toast } from "sonner";

const EMPTY = { name: "", rate: 18, is_default: false, description: "" };

export default function AdminTax() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const load = () => api.get("/tax-rules").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name required");
    try {
      const payload = { ...form, rate: parseFloat(form.rate || 0) };
      if (editing) await api.put(`/admin/tax-rules/${editing.id}`, payload);
      else await api.post("/admin/tax-rules", payload);
      toast.success("Saved"); setOpen(false); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Save failed"); }
  };

  const del = async (rid) => { if (!window.confirm("Delete tax rule?")) return; await api.delete(`/admin/tax-rules/${rid}`); load(); };

  return (
    <div className="bg-white border border-stone-200 rounded-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-display text-base font-bold uppercase">Tax / GST Rules ({list.length})</h2>
        <Button data-testid="add-tax" onClick={() => { setEditing(null); setForm(EMPTY); setOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold uppercase">
          <Plus className="w-4 h-4 mr-1"/> Add Rule
        </Button>
      </div>
      <div className="space-y-2">
        {list.map((r) => (
          <div key={r.id} data-testid={`tax-${r.id}`} className="flex items-center justify-between bg-stone-50 border border-stone-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 grid place-items-center text-indigo-600"><Percent className="w-5 h-5"/></div>
              <div>
                <div className="font-semibold text-sm">{r.name} {r.is_default && <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded ml-1">DEFAULT</span>}</div>
                <div className="text-xs text-stone-500">{r.description || "—"}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="font-anton text-2xl text-indigo-600">{r.rate}%</div>
              <button onClick={() => { setEditing(r); setForm({ ...EMPTY, ...r }); setOpen(true); }} className="p-2 hover:bg-stone-200 rounded"><Edit className="w-4 h-4"/></button>
              <button onClick={() => del(r.id)} className="p-2 hover:bg-rose-50 hover:text-rose-600 rounded"><Trash2 className="w-4 h-4"/></button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white">
          <DialogHeader><DialogTitle className="font-display">{editing ? "Edit" : "New"} Tax Rule</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs uppercase font-bold">Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. GST 18%" className="mt-1"/></div>
            <div><Label className="text-xs uppercase font-bold">Rate %</Label><Input type="number" step="0.01" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} className="mt-1"/></div>
            <div><Label className="text-xs uppercase font-bold">Description</Label><Input value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1"/></div>
            <div className="flex items-center gap-2 pt-2"><Switch checked={form.is_default} onCheckedChange={(v) => setForm({ ...form, is_default: v })}/><span className="text-sm">Set as Default (applies to new products)</span></div>
          </div>
          <Button onClick={save} className="bg-indigo-600 hover:bg-indigo-700 font-bold uppercase text-xs">Save</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
