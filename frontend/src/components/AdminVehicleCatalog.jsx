import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, ChevronDown, ChevronRight, Car } from "lucide-react";
import { toast } from "sonner";

export default function AdminVehicleCatalog() {
  const [tree, setTree] = useState([]);
  const [open, setOpen] = useState({}); // makeId -> bool
  const [modelOpen, setModelOpen] = useState({}); // modelId -> bool

  // Dialog states
  const [makeDlg, setMakeDlg] = useState({ open: false, editing: null, form: { name: "" } });
  const [modelDlg, setModelDlg] = useState({ open: false, editing: null, make_id: "", form: { name: "" } });
  const [variantDlg, setVariantDlg] = useState({ open: false, editing: null, model_id: "", form: { name: "", start_year: 2020, end_year: "", facelift_years: "", notes: "" } });

  const load = () => api.get("/catalog/tree").then((r) => setTree(r.data));
  useEffect(() => { load(); }, []);

  // --- Make ---
  const saveMake = async () => {
    if (!makeDlg.form.name.trim()) return toast.error("Name required");
    try {
      if (makeDlg.editing) await api.put(`/admin/catalog/makes/${makeDlg.editing.id}`, { name: makeDlg.form.name });
      else await api.post("/admin/catalog/makes", { name: makeDlg.form.name });
      toast.success("Saved"); setMakeDlg({ open: false, editing: null, form: { name: "" } }); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Save failed"); }
  };
  const delMake = async (id) => {
    if (!window.confirm("Delete make AND all its models/variants?")) return;
    await api.delete(`/admin/catalog/makes/${id}`); toast.success("Deleted"); load();
  };

  // --- Model ---
  const saveModel = async () => {
    if (!modelDlg.form.name.trim()) return toast.error("Name required");
    try {
      const payload = { make_id: modelDlg.editing?.make_id || modelDlg.make_id, name: modelDlg.form.name };
      if (modelDlg.editing) await api.put(`/admin/catalog/models/${modelDlg.editing.id}`, payload);
      else await api.post("/admin/catalog/models", payload);
      toast.success("Saved"); setModelDlg({ open: false, editing: null, make_id: "", form: { name: "" } }); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Save failed"); }
  };
  const delModel = async (id) => {
    if (!window.confirm("Delete model AND its variants?")) return;
    await api.delete(`/admin/catalog/models/${id}`); load();
  };

  // --- Variant ---
  const saveVariant = async () => {
    const f = variantDlg.form;
    if (!f.name.trim()) return toast.error("Name required");
    try {
      const payload = {
        model_id: variantDlg.editing?.model_id || variantDlg.model_id,
        name: f.name,
        start_year: parseInt(f.start_year),
        end_year: f.end_year === "" || f.end_year === null ? null : parseInt(f.end_year),
        facelift_years: f.facelift_years || "",
        notes: f.notes || "",
      };
      if (variantDlg.editing) await api.put(`/admin/catalog/variants/${variantDlg.editing.id}`, payload);
      else await api.post("/admin/catalog/variants", payload);
      toast.success("Saved");
      setVariantDlg({ open: false, editing: null, model_id: "", form: { name: "", start_year: 2020, end_year: "", facelift_years: "", notes: "" } });
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Save failed"); }
  };
  const delVariant = async (id) => {
    if (!window.confirm("Delete this variant?")) return;
    await api.delete(`/admin/catalog/variants/${id}`); load();
  };

  return (
    <div className="bg-white border border-stone-200 rounded-md p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="font-display text-base font-bold uppercase flex items-center gap-2"><Car className="w-5 h-5 text-indigo-600"/>Vehicle Catalog</h2>
          <div className="text-[10px] text-stone-500">Manage Make → Model → Year/Variant hierarchy</div>
        </div>
        <Button data-testid="add-make-btn" onClick={() => setMakeDlg({ open: true, editing: null, form: { name: "" } })} className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold uppercase">
          <Plus className="w-4 h-4 mr-1"/> Add Make
        </Button>
      </div>

      <div className="space-y-2">
        {tree.length === 0 && <div className="text-stone-500 text-sm italic">No vehicles yet. Add a make to begin.</div>}
        {tree.map((mk) => {
          const isOpen = open[mk.id] !== false;
          return (
            <div key={mk.id} data-testid={`make-${mk.slug}`} className="border border-stone-200 rounded-lg overflow-hidden">
              <div className="flex items-center bg-stone-50 hover:bg-stone-100 transition px-2 py-1.5">
                <button onClick={() => setOpen({ ...open, [mk.id]: !isOpen })} className="p-1">
                  {isOpen ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
                </button>
                <span className="font-bold text-sm flex-1">{mk.name}</span>
                <span className="text-[10px] text-stone-500 mr-3">{mk.models.length} models</span>
                <button onClick={() => setMakeDlg({ open: true, editing: mk, form: { name: mk.name } })} className="p-1.5 hover:bg-stone-200 rounded"><Edit className="w-3.5 h-3.5"/></button>
                <button onClick={() => delMake(mk.id)} className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded"><Trash2 className="w-3.5 h-3.5"/></button>
                <button onClick={() => setModelDlg({ open: true, editing: null, make_id: mk.id, form: { name: "" } })} className="ml-1 text-[10px] uppercase font-bold text-indigo-600 hover:text-indigo-800 px-2">+ Model</button>
              </div>
              {isOpen && (
                <div className="pl-7 py-1">
                  {mk.models.map((m) => {
                    const mOpen = modelOpen[m.id] !== false;
                    return (
                      <div key={m.id} data-testid={`model-${m.slug}`} className="border-l-2 border-stone-200 pl-2 py-1">
                        <div className="flex items-center hover:bg-indigo-50/30 rounded">
                          <button onClick={() => setModelOpen({ ...modelOpen, [m.id]: !mOpen })} className="p-1">
                            {mOpen ? <ChevronDown className="w-3.5 h-3.5"/> : <ChevronRight className="w-3.5 h-3.5"/>}
                          </button>
                          <span className="text-sm flex-1">{m.name}</span>
                          <span className="text-[10px] text-stone-400 mr-3">{m.variants.length} variants</span>
                          <button onClick={() => setModelDlg({ open: true, editing: m, make_id: mk.id, form: { name: m.name } })} className="p-1 hover:bg-stone-200 rounded"><Edit className="w-3 h-3"/></button>
                          <button onClick={() => delModel(m.id)} className="p-1 hover:bg-rose-50 hover:text-rose-600 rounded"><Trash2 className="w-3 h-3"/></button>
                          <button onClick={() => setVariantDlg({ open: true, editing: null, model_id: m.id, form: { name: "", start_year: 2024, end_year: "", facelift_years: "", notes: "" } })} className="ml-1 text-[10px] uppercase font-bold text-indigo-600 hover:text-indigo-800 px-2">+ Variant</button>
                        </div>
                        {mOpen && (
                          <div className="pl-6 py-1 flex flex-wrap gap-1.5">
                            {m.variants.map((v) => (
                              <div key={v.id} data-testid={`variant-${v.slug}`} className="group inline-flex items-center gap-1 bg-white border border-stone-200 rounded-full pl-2.5 pr-1 py-0.5 text-[11px]">
                                <span className="font-medium">{v.name}</span>
                                <span className="text-stone-500">· {v.start_year}–{v.end_year || "Present"}</span>
                                <button onClick={() => setVariantDlg({ open: true, editing: v, model_id: m.id, form: { name: v.name, start_year: v.start_year, end_year: v.end_year ?? "", facelift_years: v.facelift_years || "", notes: v.notes || "" } })} className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-stone-100 rounded-full"><Edit className="w-2.5 h-2.5"/></button>
                                <button onClick={() => delVariant(v.id)} className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-rose-100 hover:text-rose-600 rounded-full"><Trash2 className="w-2.5 h-2.5"/></button>
                              </div>
                            ))}
                            {m.variants.length === 0 && <span className="text-[10px] text-stone-400 italic">No variants yet</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {mk.models.length === 0 && <div className="text-[10px] text-stone-400 italic py-1">No models yet</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MAKE DIALOG */}
      <Dialog open={makeDlg.open} onOpenChange={(o) => setMakeDlg({ ...makeDlg, open: o })}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader><DialogTitle className="font-display">{makeDlg.editing ? "Edit" : "New"} Make</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs uppercase font-bold">Name *</Label>
              <Input data-testid="make-name" value={makeDlg.form.name} onChange={(e) => setMakeDlg({ ...makeDlg, form: { name: e.target.value } })} placeholder="e.g. Hyundai" className="mt-1"/>
            </div>
          </div>
          <Button data-testid="save-make" onClick={saveMake} className="bg-indigo-600 hover:bg-indigo-700 font-bold uppercase text-xs">Save</Button>
        </DialogContent>
      </Dialog>

      {/* MODEL DIALOG */}
      <Dialog open={modelDlg.open} onOpenChange={(o) => setModelDlg({ ...modelDlg, open: o })}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader><DialogTitle className="font-display">{modelDlg.editing ? "Edit" : "New"} Model</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs uppercase font-bold">Name *</Label>
              <Input data-testid="model-name" value={modelDlg.form.name} onChange={(e) => setModelDlg({ ...modelDlg, form: { name: e.target.value } })} placeholder="e.g. Creta" className="mt-1"/>
            </div>
          </div>
          <Button data-testid="save-model" onClick={saveModel} className="bg-indigo-600 hover:bg-indigo-700 font-bold uppercase text-xs">Save</Button>
        </DialogContent>
      </Dialog>

      {/* VARIANT DIALOG */}
      <Dialog open={variantDlg.open} onOpenChange={(o) => setVariantDlg({ ...variantDlg, open: o })}>
        <DialogContent className="bg-white max-w-lg">
          <DialogHeader><DialogTitle className="font-display">{variantDlg.editing ? "Edit" : "New"} Variant / Generation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs uppercase font-bold">Name *</Label>
              <Input data-testid="variant-name" value={variantDlg.form.name} onChange={(e) => setVariantDlg({ ...variantDlg, form: { ...variantDlg.form, name: e.target.value } })} placeholder="e.g. 2nd Generation" className="mt-1"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs uppercase font-bold">Start Year *</Label>
                <Input type="number" data-testid="variant-start" value={variantDlg.form.start_year} onChange={(e) => setVariantDlg({ ...variantDlg, form: { ...variantDlg.form, start_year: e.target.value } })} className="mt-1"/>
              </div>
              <div><Label className="text-xs uppercase font-bold">End Year (blank = Present)</Label>
                <Input type="number" data-testid="variant-end" value={variantDlg.form.end_year} onChange={(e) => setVariantDlg({ ...variantDlg, form: { ...variantDlg.form, end_year: e.target.value } })} placeholder="2024" className="mt-1"/>
              </div>
            </div>
            <div><Label className="text-xs uppercase font-bold">Facelift Years</Label>
              <Input value={variantDlg.form.facelift_years} onChange={(e) => setVariantDlg({ ...variantDlg, form: { ...variantDlg.form, facelift_years: e.target.value } })} placeholder="2021" className="mt-1"/>
            </div>
            <div><Label className="text-xs uppercase font-bold">Fitment Notes</Label>
              <Textarea rows={3} value={variantDlg.form.notes} onChange={(e) => setVariantDlg({ ...variantDlg, form: { ...variantDlg.form, notes: e.target.value } })} placeholder="Specific compatibility notes…" className="mt-1"/>
            </div>
          </div>
          <Button data-testid="save-variant" onClick={saveVariant} className="bg-indigo-600 hover:bg-indigo-700 font-bold uppercase text-xs">Save</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
