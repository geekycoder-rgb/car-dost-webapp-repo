import { useEffect, useState } from "react";
import { api, formatINR } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Plus, Edit, Trash2, Tag, Percent, Truck } from "lucide-react";
import { toast } from "sonner";

const EMPTY = { code: "", type: "percent", value: 10, min_order: 0, max_discount: 0, usage_limit: 0, expires_at: "", is_active: true, description: "", customer_emails: [] };

export default function AdminCoupons() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [emailsRaw, setEmailsRaw] = useState("");

  const load = () => api.get("/admin/coupons").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(EMPTY); setEmailsRaw(""); setOpen(true); };
  const openEdit = (c) => {
    setEditing(c);
    setForm({ ...EMPTY, ...c, expires_at: c.expires_at ? c.expires_at.split("T")[0] : "" });
    setEmailsRaw((c.customer_emails || []).join(", "));
    setOpen(true);
  };

  const save = async () => {
    if (!form.code.trim()) return toast.error("Code required");
    try {
      const emails = emailsRaw.split(",").map((e) => e.trim()).filter(Boolean);
      const payload = { ...form, customer_emails: emails, value: parseFloat(form.value || 0), min_order: parseFloat(form.min_order || 0), max_discount: parseFloat(form.max_discount || 0), usage_limit: parseInt(form.usage_limit || 0), expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null };
      if (editing) await api.put(`/admin/coupons/${editing.code}`, payload);
      else await api.post("/admin/coupons", payload);
      toast.success("Coupon saved"); setOpen(false); load();
    } catch (e) {
      const d = e.response?.data?.detail;
      toast.error(typeof d === "string" ? d : "Save failed");
    }
  };

  const del = async (code) => {
    if (!window.confirm(`Delete coupon ${code}?`)) return;
    await api.delete(`/admin/coupons/${code}`); toast.success("Deleted"); load();
  };

  const TYPE_ICONS = { percent: Percent, flat: Tag, free_shipping: Truck };

  return (
    <div className="bg-white border border-stone-200 rounded-md overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b border-stone-200">
        <h2 className="font-display text-base font-bold uppercase">Coupons ({list.length})</h2>
        <Button data-testid="add-coupon-btn" onClick={openNew} className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold uppercase">
          <Plus className="w-4 h-4 mr-1"/> Add Coupon
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Code</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Min Order</TableHead>
            <TableHead>Used / Limit</TableHead>
            <TableHead>Active</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((c) => {
            const Icon = TYPE_ICONS[c.type] || Tag;
            return (
              <TableRow key={c.code}>
                <TableCell><span className="font-mono font-bold text-indigo-600">{c.code}</span></TableCell>
                <TableCell><span className="inline-flex items-center gap-1 text-xs"><Icon className="w-3.5 h-3.5"/> {c.type}</span></TableCell>
                <TableCell>{c.type === "percent" ? `${c.value}%` : c.type === "flat" ? formatINR(c.value) : "Free Ship"}</TableCell>
                <TableCell>{formatINR(c.min_order || 0)}</TableCell>
                <TableCell className="text-xs">{c.used_count || 0} / {c.usage_limit > 0 ? c.usage_limit : "∞"}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-0.5 rounded ${c.is_active ? "bg-emerald-100 text-emerald-700" : "bg-stone-200 text-stone-600"}`}>{c.is_active ? "Active" : "Off"}</span>
                </TableCell>
                <TableCell className="text-right">
                  <button onClick={() => openEdit(c)} className="p-2 hover:bg-stone-100 rounded"><Edit className="w-4 h-4"/></button>
                  <button onClick={() => del(c.code)} className="p-2 hover:bg-rose-50 hover:text-rose-600 rounded"><Trash2 className="w-4 h-4"/></button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{editing ? "Edit" : "New"} Coupon</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label className="text-xs uppercase font-bold">Code *</Label><Input data-testid="coupon-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. SAVE10" className="mt-1 font-mono"/></div>
            <div><Label className="text-xs uppercase font-bold">Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger className="mt-1"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percent off</SelectItem>
                  <SelectItem value="flat">Flat ₹ off</SelectItem>
                  <SelectItem value="free_shipping">Free shipping</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs uppercase font-bold">Value ({form.type === "percent" ? "%" : "₹"})</Label><Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="mt-1"/></div>
            <div><Label className="text-xs uppercase font-bold">Min Order ₹</Label><Input type="number" value={form.min_order} onChange={(e) => setForm({ ...form, min_order: e.target.value })} className="mt-1"/></div>
            <div><Label className="text-xs uppercase font-bold">Max Discount ₹ (0 = no cap)</Label><Input type="number" value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: e.target.value })} className="mt-1"/></div>
            <div><Label className="text-xs uppercase font-bold">Usage Limit (0 = unlimited)</Label><Input type="number" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} className="mt-1"/></div>
            <div><Label className="text-xs uppercase font-bold">Expires On</Label><Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className="mt-1"/></div>
            <div className="col-span-2"><Label className="text-xs uppercase font-bold">Description (shown to customer)</Label><Input value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1"/></div>
            <div className="col-span-2"><Label className="text-xs uppercase font-bold">Restrict to Emails (comma-separated, blank = all)</Label><Input value={emailsRaw} onChange={(e) => setEmailsRaw(e.target.value)} placeholder="a@x.com, b@y.com" className="mt-1"/></div>
            <div className="col-span-2 flex items-center gap-2 pt-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })}/>
              <span className="text-sm">Active (customers can use)</span>
            </div>
          </div>
          <Button data-testid="save-coupon" onClick={save} className="bg-indigo-600 hover:bg-indigo-700 font-bold uppercase text-xs">Save Coupon</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
