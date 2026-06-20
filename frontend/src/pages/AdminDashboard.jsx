import { useEffect, useState, useRef } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api, formatINR, resolveImg } from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Plus, Edit, Trash2, ShoppingCart, Package, DollarSign, Users, Upload, Loader2, FileText, ExternalLink } from "lucide-react";
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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const csvInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

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
      if (editing) { await api.put(`/admin/products/${editing.id}`, payload); toast.success("Product updated"); }
      else { await api.post("/admin/products", payload); toast.success("Product created"); }
      setDialogOpen(false); loadAll();
    } catch (e) {
      const d = e.response?.data?.detail;
      toast.error(Array.isArray(d) ? d.map((x) => x.msg).join(", ") : (typeof d === "string" ? d : "Save failed"));
    }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    await api.delete(`/admin/products/${id}`); toast.success("Deleted"); loadAll();
  };

  const uploadImage = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const { data } = await api.post("/admin/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setForm((f) => ({ ...f, image: data.url })); toast.success("Image uploaded");
    } catch (err) { const d = err.response?.data?.detail; toast.error(typeof d === "string" ? d : "Upload failed"); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const updateOrderStatus = async (oid, status) => {
    try { await api.patch(`/admin/orders/${oid}/status`, { status }); toast.success(`Order marked ${status}`); loadAll(); }
    catch (err) { const d = err.response?.data?.detail; toast.error(typeof d === "string" ? d : "Update failed"); }
  };

  const importCSV = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setImporting(true); setImportResult(null);
    try {
      const fd = new FormData(); fd.append("file", file);
      const { data } = await api.post("/admin/products/bulk", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setImportResult(data); toast.success(`Imported ${data.created} product${data.created === 1 ? "" : "s"}`); loadAll();
    } catch (err) { const d = err.response?.data?.detail; toast.error(typeof d === "string" ? d : "Import failed"); }
    finally { setImporting(false); if (csvInputRef.current) csvInputRef.current.value = ""; }
  };

  const downloadSampleCSV = () => {
    const sample = "name,description,price,original_price,category,brand,image,stock,rating,featured\n" +
      "Sample Speaker,High quality 6-inch speaker,1999,2499,speakers,Generic,https://example.com/img.jpg,50,4.5,false\n" +
      "Demo Stereo,9-inch Android stereo,9999,12999,android-stereos,Demo,https://example.com/stereo.jpg,20,4.7,true";
    const blob = new Blob([sample], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "cardost-products-sample.csv"; a.click();
  };

  const c = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="bg-neutral-50 min-h-screen">
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="font-display text-2xl lg:text-3xl font-bold uppercase">Admin Dashboard</h1>
          <div className="text-xs text-neutral-500 mt-1">Manage your store</div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { icon: ShoppingCart, label: "Total Orders", val: stats.total_orders, color: "text-blue-600 bg-blue-50" },
              { icon: DollarSign, label: "Revenue", val: formatINR(stats.revenue), color: "text-green-600 bg-green-50" },
              { icon: Package, label: "Products", val: stats.products, color: "text-yellow-600 bg-yellow-50" },
              { icon: Users, label: "Customers", val: stats.users, color: "text-red-600 bg-red-50" },
            ].map((s, i) => (
              <div key={i} className="bg-white border border-neutral-200 rounded-md p-5">
                <div className={`w-10 h-10 rounded-full grid place-items-center mb-3 ${s.color}`}><s.icon className="w-5 h-5"/></div>
                <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">{s.label}</div>
                <div className="font-display text-2xl font-bold mt-1">{s.val}</div>
              </div>
            ))}
          </div>
        )}

        <Tabs defaultValue="products">
          <TabsList className="bg-white border border-neutral-200">
            <TabsTrigger value="products" data-testid="tab-products">Products</TabsTrigger>
            <TabsTrigger value="orders" data-testid="tab-orders">Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <div className="bg-white border border-neutral-200 rounded-md overflow-hidden">
              <div className="flex flex-wrap justify-between items-center gap-3 p-4 border-b border-neutral-200">
                <h2 className="font-display text-base font-bold uppercase">Products ({products.length})</h2>
                <div className="flex gap-2 flex-wrap">
                  <input ref={csvInputRef} data-testid="csv-input" type="file" accept=".csv" onChange={importCSV} className="hidden"/>
                  <Button data-testid="sample-csv-btn" onClick={downloadSampleCSV} variant="outline" className="border-neutral-300 text-xs font-bold uppercase">
                    <FileText className="w-4 h-4 mr-1"/> Sample CSV
                  </Button>
                  <Button data-testid="import-csv-btn" disabled={importing} onClick={() => csvInputRef.current?.click()} variant="outline" className="border-neutral-300 text-xs font-bold uppercase">
                    {importing ? <Loader2 className="w-4 h-4 mr-1 animate-spin"/> : <Upload className="w-4 h-4 mr-1"/>} Import CSV
                  </Button>
                  <Button data-testid="add-product-btn" onClick={openCreate} className="bg-red-600 hover:bg-red-700 text-xs font-bold uppercase">
                    <Plus className="w-4 h-4 mr-1"/> Add Product
                  </Button>
                </div>
              </div>
              {importResult && (
                <div data-testid="import-result" className="px-4 py-3 bg-emerald-50 border-b border-emerald-200 text-sm flex items-center justify-between">
                  <span><span className="text-emerald-700 font-bold">{importResult.created}</span> products imported{importResult.error_count > 0 && <span className="text-yellow-700"> · {importResult.error_count} row(s) failed</span>}</span>
                  <button onClick={() => setImportResult(null)} className="text-neutral-500 hover:text-neutral-900 text-xs">Dismiss</button>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex gap-3 items-center">
                          <img src={resolveImg(p.image)} className="w-10 h-10 rounded object-cover" alt=""/>
                          <span className="font-medium line-clamp-1 max-w-xs">{p.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-neutral-600 text-sm">{p.category}</TableCell>
                      <TableCell className="font-semibold">{formatINR(p.price)}</TableCell>
                      <TableCell>{p.stock}</TableCell>
                      <TableCell className="text-right">
                        <button data-testid={`edit-${p.id}`} onClick={() => openEdit(p)} className="p-2 hover:bg-neutral-100 rounded text-neutral-700"><Edit className="w-4 h-4"/></button>
                        <button data-testid={`del-${p.id}`} onClick={() => del(p.id)} className="p-2 hover:bg-red-50 hover:text-red-600 rounded text-neutral-700"><Trash2 className="w-4 h-4"/></button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <div className="bg-white border border-neutral-200 rounded-md overflow-hidden">
              <div className="p-4 border-b border-neutral-200"><h2 className="font-display text-base font-bold uppercase">Orders ({orders.length})</h2></div>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
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
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">
                        <Link to={`/order/${o.id}`} data-testid={`admin-order-link-${o.id}`} className="text-red-600 hover:underline inline-flex items-center gap-1">
                          {o.id.slice(0, 8)} <ExternalLink className="w-3 h-3"/>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{o.address.full_name}</div>
                        <div className="text-xs text-neutral-500">{o.address.phone}</div>
                      </TableCell>
                      <TableCell>{o.items.length}</TableCell>
                      <TableCell className="font-semibold">{formatINR(o.total)}</TableCell>
                      <TableCell>
                        <Select value={o.status} onValueChange={(v) => updateOrderStatus(o.id, v)}>
                          <SelectTrigger data-testid={`status-${o.id}`} className="h-8 text-xs w-32">
                            <SelectValue/>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-xs text-neutral-500">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display uppercase">{editing ? "Edit" : "New"} Product</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Name</Label><Input data-testid="p-name" value={form.name} onChange={c("name")} className="mt-1"/></div>
            <div className="col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={c("description")} className="mt-1"/></div>
            <div><Label>Price (₹)</Label><Input type="number" value={form.price} onChange={c("price")} className="mt-1"/></div>
            <div><Label>Original Price (₹)</Label><Input type="number" value={form.original_price} onChange={c("original_price")} className="mt-1"/></div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="mt-1"><SelectValue/></SelectTrigger>
                <SelectContent>{cats.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Brand</Label><Input value={form.brand} onChange={c("brand")} className="mt-1"/></div>
            <div className="col-span-2">
              <Label>Product Image</Label>
              <div className="mt-1 flex gap-3">
                <Input data-testid="p-image-url" placeholder="Paste URL or upload below" value={form.image} onChange={c("image")} className="flex-1"/>
                <input ref={fileInputRef} data-testid="p-image-file" type="file" accept="image/*" onChange={uploadImage} className="hidden"/>
                <Button type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()} variant="outline">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Upload className="w-4 h-4 mr-1"/>Upload</>}
                </Button>
              </div>
              {form.image && <img src={resolveImg(form.image)} alt="" className="mt-3 w-32 h-32 object-cover rounded border"/>}
            </div>
            <div><Label>Stock</Label><Input type="number" value={form.stock} onChange={c("stock")} className="mt-1"/></div>
            <div><Label>Rating</Label><Input type="number" step="0.1" max="5" value={form.rating} onChange={c("rating")} className="mt-1"/></div>
          </div>
          <Button data-testid="save-product" onClick={save} className="bg-red-600 hover:bg-red-700 font-bold uppercase tracking-wider text-xs">Save</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
