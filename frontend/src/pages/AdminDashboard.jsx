import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api, formatINR } from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Plus, Edit, Trash2, ShoppingCart, Package, DollarSign, Users } from "lucide-react";
import { toast } from "sonner";

const EMPTY_P = { name: "", description: "", price: "", original_price: "", category: "android-stereos", brand: "", image: "", stock: 50, rating: 4.5, featured: false };

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cats, setCats] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_P);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadAll = () => {
    api.get("/admin/stats").then((r) => setStats(r.data)).catch(() => {});
    api.get("/products").then((r) => setProducts(r.data));
    api.get("/admin/orders").then((r) => setOrders(r.data)).catch(() => {});
    api.get("/categories").then((r) => setCats(r.data));
  };

  useEffect(() => { if (user?.role === "admin") loadAll(); }, [user]);

  if (loading) return <div className="p-12 text-neutral-500">Loading...</div>;
  if (!user || user.role !== "admin") return <Navigate to="/admin/login"/>;

  const openCreate = () => { setEditing(null); setForm(EMPTY_P); setDialogOpen(true); };
  const openEdit = (p) => { setEditing(p); setForm({ ...p, original_price: p.original_price || "" }); setDialogOpen(true); };

  const save = async () => {
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        original_price: form.original_price ? parseFloat(form.original_price) : null,
        stock: parseInt(form.stock),
        rating: parseFloat(form.rating),
      };
      if (editing) {
        await api.put(`/admin/products/${editing.id}`, payload);
        toast.success("Product updated");
      } else {
        await api.post("/admin/products", payload);
        toast.success("Product created");
      }
      setDialogOpen(false);
      loadAll();
    } catch (e) {
      const d = e.response?.data?.detail;
      const msg = Array.isArray(d) ? d.map((x) => x.msg).join(", ") : (typeof d === "string" ? d : "Save failed");
      toast.error(msg);
    }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    await api.delete(`/admin/products/${id}`);
    toast.success("Deleted");
    loadAll();
  };

  const c = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <h1 className="font-display text-4xl lg:text-5xl font-black tracking-tighter mb-10">Admin Dashboard</h1>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { icon: ShoppingCart, label: "Total Orders", val: stats.total_orders, color: "text-blue-400" },
            { icon: DollarSign, label: "Revenue", val: formatINR(stats.revenue), color: "text-green-400" },
            { icon: Package, label: "Products", val: stats.products, color: "text-yellow-400" },
            { icon: Users, label: "Customers", val: stats.users, color: "text-red-400" },
          ].map((s, i) => (
            <div key={i} className="bg-[#141414] border border-[#262626] rounded-lg p-6">
              <s.icon className={`w-6 h-6 mb-3 ${s.color}`}/>
              <div className="text-xs uppercase tracking-wider text-neutral-500">{s.label}</div>
              <div className="font-display text-2xl font-black mt-1">{s.val}</div>
            </div>
          ))}
        </div>
      )}

      <Tabs defaultValue="products">
        <TabsList className="bg-[#141414] border border-[#262626]">
          <TabsTrigger value="products" data-testid="tab-products">Products</TabsTrigger>
          <TabsTrigger value="orders" data-testid="tab-orders">Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <div className="bg-[#141414] border border-[#262626] rounded-lg overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-[#262626]">
              <h2 className="font-bold">Products ({products.length})</h2>
              <Button data-testid="add-product-btn" onClick={openCreate} className="bg-red-500 hover:bg-red-600">
                <Plus className="w-4 h-4 mr-1"/> Add Product
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-[#262626] hover:bg-transparent">
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id} className="border-[#262626]">
                    <TableCell>
                      <div className="flex gap-3 items-center">
                        <img src={p.image} className="w-10 h-10 rounded object-cover" alt=""/>
                        <span className="font-medium line-clamp-1 max-w-xs">{p.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-neutral-400 text-sm">{p.category}</TableCell>
                    <TableCell>{formatINR(p.price)}</TableCell>
                    <TableCell>{p.stock}</TableCell>
                    <TableCell className="text-right">
                      <button data-testid={`edit-${p.id}`} onClick={() => openEdit(p)} className="p-2 hover:bg-white/5 rounded"><Edit className="w-4 h-4"/></button>
                      <button data-testid={`del-${p.id}`} onClick={() => del(p.id)} className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded"><Trash2 className="w-4 h-4"/></button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="orders">
          <div className="bg-[#141414] border border-[#262626] rounded-lg overflow-hidden">
            <div className="p-4 border-b border-[#262626]"><h2 className="font-bold">Orders ({orders.length})</h2></div>
            <Table>
              <TableHeader>
                <TableRow className="border-[#262626] hover:bg-transparent">
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id} className="border-[#262626]">
                    <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <div className="text-sm">{o.address.full_name}</div>
                      <div className="text-xs text-neutral-500">{o.address.phone}</div>
                    </TableCell>
                    <TableCell>{o.items.length}</TableCell>
                    <TableCell>{formatINR(o.total)}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded ${o.status === "paid" ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>{o.status}</span>
                    </TableCell>
                    <TableCell className="text-xs text-neutral-500">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#141414] border-[#262626] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Product</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Name</Label><Input data-testid="p-name" value={form.name} onChange={c("name")} className="bg-[#0A0A0A] border-[#262626] mt-1"/></div>
            <div className="col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={c("description")} className="bg-[#0A0A0A] border-[#262626] mt-1"/></div>
            <div><Label>Price (₹)</Label><Input type="number" value={form.price} onChange={c("price")} className="bg-[#0A0A0A] border-[#262626] mt-1"/></div>
            <div><Label>Original Price (₹)</Label><Input type="number" value={form.original_price} onChange={c("original_price")} className="bg-[#0A0A0A] border-[#262626] mt-1"/></div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="bg-[#0A0A0A] border-[#262626] mt-1"><SelectValue/></SelectTrigger>
                <SelectContent className="bg-[#141414] border-[#262626] text-white">
                  {cats.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Brand</Label><Input value={form.brand} onChange={c("brand")} className="bg-[#0A0A0A] border-[#262626] mt-1"/></div>
            <div className="col-span-2"><Label>Image URL</Label><Input value={form.image} onChange={c("image")} className="bg-[#0A0A0A] border-[#262626] mt-1"/></div>
            <div><Label>Stock</Label><Input type="number" value={form.stock} onChange={c("stock")} className="bg-[#0A0A0A] border-[#262626] mt-1"/></div>
            <div><Label>Rating</Label><Input type="number" step="0.1" max="5" value={form.rating} onChange={c("rating")} className="bg-[#0A0A0A] border-[#262626] mt-1"/></div>
          </div>
          <Button data-testid="save-product" onClick={save} className="bg-red-500 hover:bg-red-600">Save</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
