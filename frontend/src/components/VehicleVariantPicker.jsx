import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { ChevronDown, ChevronRight, Check, Search, X } from "lucide-react";

/**
 * Admin-side hierarchical multi-select tree for product compatibility.
 *
 * Props:
 *  - value: string[]  (selected variant IDs)
 *  - onChange: (next: string[]) => void
 *  - disabled?: boolean   (e.g. when product is marked universal)
 */
export default function VehicleVariantPicker({ value = [], onChange, disabled = false }) {
  const [tree, setTree] = useState([]);
  const [openMakes, setOpenMakes] = useState({});
  const [openModels, setOpenModels] = useState({});
  const [search, setSearch] = useState("");

  useEffect(() => { api.get("/catalog/tree").then((r) => setTree(r.data)); }, []);

  const selected = useMemo(() => new Set(value), [value]);

  const toggle = (vid) => {
    if (disabled) return;
    const next = new Set(selected);
    next.has(vid) ? next.delete(vid) : next.add(vid);
    onChange([...next]);
  };

  const toggleModel = (modelVariants) => {
    if (disabled) return;
    const ids = modelVariants.map((v) => v.id);
    const allSel = ids.every((i) => selected.has(i));
    const next = new Set(selected);
    ids.forEach((i) => allSel ? next.delete(i) : next.add(i));
    onChange([...next]);
  };

  const toggleMake = (mk) => {
    if (disabled) return;
    const ids = mk.models.flatMap((m) => m.variants.map((v) => v.id));
    const allSel = ids.every((i) => selected.has(i));
    const next = new Set(selected);
    ids.forEach((i) => allSel ? next.delete(i) : next.add(i));
    onChange([...next]);
  };

  const clearAll = () => onChange([]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return tree;
    return tree.map((mk) => ({
      ...mk,
      models: mk.models
        .map((m) => ({
          ...m,
          variants: m.variants.filter((v) =>
            mk.name.toLowerCase().includes(s) ||
            m.name.toLowerCase().includes(s) ||
            v.name.toLowerCase().includes(s)
          ),
        }))
        .filter((m) => m.variants.length > 0 || mk.name.toLowerCase().includes(s)),
    })).filter((mk) => mk.models.length > 0 || mk.name.toLowerCase().includes(s));
  }, [tree, search]);

  return (
    <div className={`border border-stone-200 rounded-xl bg-white ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-stone-200 bg-stone-50 rounded-t-xl">
        <Search className="w-4 h-4 text-stone-400"/>
        <input
          data-testid="vehicle-picker-search"
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search make / model / generation…"
          className="flex-1 bg-transparent text-sm focus:outline-none"
        />
        <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600">
          {selected.size} selected
        </span>
        {selected.size > 0 && (
          <button onClick={clearAll} className="text-[10px] uppercase font-bold text-rose-600 hover:text-rose-700">
            Clear
          </button>
        )}
      </div>
      <div className="max-h-72 overflow-y-auto p-2 space-y-1">
        {filtered.length === 0 ? (
          <div className="text-center text-xs text-stone-500 py-6">No vehicles match your search.</div>
        ) : filtered.map((mk) => {
          const mkIds = mk.models.flatMap((m) => m.variants.map((v) => v.id));
          const mkSel = mkIds.length > 0 && mkIds.every((i) => selected.has(i));
          const mkSome = !mkSel && mkIds.some((i) => selected.has(i));
          const open = openMakes[mk.id] !== false;
          return (
            <div key={mk.id} className="border border-stone-100 rounded-lg overflow-hidden">
              <div className="flex items-center bg-stone-50 hover:bg-stone-100 transition">
                <button type="button" onClick={() => setOpenMakes({ ...openMakes, [mk.id]: !open })} className="p-1.5">
                  {open ? <ChevronDown className="w-4 h-4 text-stone-500"/> : <ChevronRight className="w-4 h-4 text-stone-500"/>}
                </button>
                <button type="button" onClick={() => toggleMake(mk)}
                        data-testid={`vp-make-${mk.slug}`}
                        className="flex-1 flex items-center gap-2 px-1 py-1.5 text-left">
                  <span className={`w-4 h-4 grid place-items-center rounded border ${mkSel ? "bg-indigo-600 border-indigo-600" : mkSome ? "bg-indigo-200 border-indigo-400" : "border-stone-300 bg-white"}`}>
                    {mkSel && <Check className="w-3 h-3 text-white"/>}
                    {mkSome && <span className="w-2 h-2 bg-indigo-600 rounded-sm"/>}
                  </span>
                  <span className="text-sm font-bold text-stone-900">{mk.name}</span>
                  <span className="text-[10px] text-stone-500 ml-auto pr-2">{mk.models.length} models · {mkIds.length} variants</span>
                </button>
              </div>
              {open && (
                <div className="pl-6 py-1 space-y-0.5">
                  {mk.models.map((m) => {
                    const ids = m.variants.map((v) => v.id);
                    const mSel = ids.length > 0 && ids.every((i) => selected.has(i));
                    const mSome = !mSel && ids.some((i) => selected.has(i));
                    const mopen = openModels[m.id] !== false;
                    return (
                      <div key={m.id}>
                        <div className="flex items-center hover:bg-indigo-50/40 rounded">
                          <button type="button" onClick={() => setOpenModels({ ...openModels, [m.id]: !mopen })} className="p-1">
                            {mopen ? <ChevronDown className="w-3.5 h-3.5 text-stone-400"/> : <ChevronRight className="w-3.5 h-3.5 text-stone-400"/>}
                          </button>
                          <button type="button" onClick={() => toggleModel(m.variants)}
                                  data-testid={`vp-model-${m.slug}`}
                                  className="flex-1 flex items-center gap-2 py-1 text-left">
                            <span className={`w-3.5 h-3.5 grid place-items-center rounded border ${mSel ? "bg-indigo-600 border-indigo-600" : mSome ? "bg-indigo-200 border-indigo-400" : "border-stone-300 bg-white"}`}>
                              {mSel && <Check className="w-2.5 h-2.5 text-white"/>}
                            </span>
                            <span className="text-sm text-stone-800">{m.name}</span>
                            <span className="text-[10px] text-stone-400 ml-auto pr-2">{m.variants.length} gen</span>
                          </button>
                        </div>
                        {mopen && (
                          <div className="pl-7 pr-2 pb-1 flex flex-wrap gap-1.5">
                            {m.variants.map((v) => {
                              const vSel = selected.has(v.id);
                              return (
                                <button key={v.id} type="button" onClick={() => toggle(v.id)}
                                        data-testid={`vp-variant-${v.slug}`}
                                        title={v.notes || ""}
                                        className={`text-[11px] px-2 py-0.5 rounded-full border transition ${vSel ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-stone-300 text-stone-700 hover:border-indigo-400"}`}>
                                  {v.name} · {v.start_year}–{v.end_year || "Present"}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Customer-side cascading selector: Make → Model → Variant.
 * Only shows the variants in `allowedVariantIds`. Calls onSelect({id, label}).
 */
export function CustomerVehicleSelector({ allowedVariantIds = [], value, onSelect, isUniversal = false }) {
  const [tree, setTree] = useState([]);
  const [makeId, setMakeId] = useState("");
  const [modelId, setModelId] = useState("");
  const [variantId, setVariantId] = useState(value || "");
  const allowed = useMemo(() => new Set(allowedVariantIds), [allowedVariantIds]);

  useEffect(() => {
    api.get("/catalog/tree").then((r) => setTree(r.data));
  }, []);

  // Build available subtree restricted to allowed variants (or all if universal)
  const availableMakes = useMemo(() => {
    return tree.map((mk) => ({
      ...mk,
      models: mk.models
        .map((m) => ({ ...m, variants: isUniversal ? m.variants : m.variants.filter((v) => allowed.has(v.id)) }))
        .filter((m) => m.variants.length > 0),
    })).filter((mk) => mk.models.length > 0);
  }, [tree, allowed, isUniversal]);

  const currentMake = availableMakes.find((m) => m.id === makeId);
  const availableModels = currentMake?.models || [];
  const currentModel = availableModels.find((m) => m.id === modelId);
  const availableVariants = currentModel?.variants || [];

  const buildLabel = (vid) => {
    for (const mk of tree) {
      for (const m of mk.models) {
        const v = m.variants.find((x) => x.id === vid);
        if (v) return `${mk.name} ${m.name} · ${v.name} (${v.start_year}–${v.end_year || "Present"})`;
      }
    }
    return "";
  };

  const choose = (vid) => {
    setVariantId(vid);
    onSelect && onSelect({ id: vid, label: buildLabel(vid) });
  };

  const reset = () => { setMakeId(""); setModelId(""); setVariantId(""); onSelect && onSelect({ id: "", label: "" }); };

  if (availableMakes.length === 0 && !isUniversal) {
    return <div className="text-xs text-stone-500 italic">No vehicle compatibility set for this product.</div>;
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <select data-testid="cust-veh-make" value={makeId}
                onChange={(e) => { setMakeId(e.target.value); setModelId(""); setVariantId(""); }}
                className="border border-stone-300 rounded px-2.5 py-2 text-sm bg-white">
          <option value="">Select Make…</option>
          {availableMakes.map((mk) => <option key={mk.id} value={mk.id}>{mk.name}</option>)}
        </select>
        <select data-testid="cust-veh-model" value={modelId} disabled={!makeId}
                onChange={(e) => { setModelId(e.target.value); setVariantId(""); }}
                className="border border-stone-300 rounded px-2.5 py-2 text-sm bg-white disabled:bg-stone-100">
          <option value="">Select Model…</option>
          {availableModels.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select data-testid="cust-veh-variant" value={variantId} disabled={!modelId}
                onChange={(e) => choose(e.target.value)}
                className="border border-stone-300 rounded px-2.5 py-2 text-sm bg-white disabled:bg-stone-100">
          <option value="">Select Year / Variant…</option>
          {availableVariants.map((v) => <option key={v.id} value={v.id}>{v.name} ({v.start_year}–{v.end_year || "Present"})</option>)}
        </select>
      </div>
      {variantId && (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-800">
          <span><strong>Selected:</strong> {buildLabel(variantId)}</span>
          <button type="button" onClick={reset} className="text-emerald-600 hover:text-emerald-900"><X className="w-3.5 h-3.5"/></button>
        </div>
      )}
    </div>
  );
}
