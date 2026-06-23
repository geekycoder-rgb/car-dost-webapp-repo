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
import { Plus, Edit, Trash2, ShoppingCart, Package, DollarSign, Users, Upload, Loader2, FileText, ExternalLink, X, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";
import AdminSettings from "@/components/AdminSettings";
import AdminCategories from "@/components/AdminCategories";
import AdminCoupons from "@/components/AdminCoupons";
import AdminBanners from "@/components/AdminBanners";
import AdminReviews from "@/components/AdminReviews";
import AdminTax from "@/components/AdminTax";
import AdminMessages from "@/components/AdminMessages";
import AdminVehicleCatalog from "@/components/AdminVehicleCatalog";
import VehicleVariantPicker from "@/components/VehicleVariantPicker";

const EMPTY_P = { name: "", description: "", price: "", original_price: "", category: "android-stereos", brand: "", image: "", gallery: [], stock: 50, rating: 4.5, featured: false, discount_percent: 0, discount_flat: 0, gst_percent: 18, tags: [], car_brands: [], car_models: [], years: [], compatible_variants: [], meta_title: "", meta_description: "", seo_slug: "" };

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
  const [carBrands, setCarBrands] = useState([]);
  const [carModelsByBrand, setCarModelsByBrand] = useState({});
  const [yearList, setYearList] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const galleryRef = useRef(null);

  const loadAll = () => {
    api.get("/admin/stats").then((r) => setStats(r.data)).catch(() => {});
    api.get("/products").then((r) => setProducts(r.data));
    api.get("/admin/orders").then((r) => setOrders(r.data)).catch(() => {});
    api.get("/categories").then((r) => setCats(r.data));
    api.get("/catalog/car-brands").then((r) => setCarBrands(r.data));
    api.get("/catalog/years").then((r) => setYearList(r.data));
  };

  // Load models when car_brands change in form
  useEffect(() => {
    if (form.car_brands?.length > 0) {
      api.get("/catalog/car-models", { params: { brand: form.car_brands.join(",") } })
        .then((r) => {
          const byBrand = {};
          r.data.forEach((m) => { (byBrand[m.brand] = byBrand[m.brand] || []).push(m.model); });
          setCarModelsByBrand(byBrand);
        });
    } else {
      setCarModelsByBrand({});
    }
  }, [form.car_brands]);

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
        discount_percent: parseFloat(form.discount_percent || 0),
        discount_flat: parseFloat(form.discount_flat || 0),
        gst_percent: parseInt(form.gst_percent || 18),
        gallery: form.gallery || [],
        tags: form.tags || [],
        car_brands: form.car_brands || [],
        car_models: form.car_models || [],
        years: (form.years || []).map((y) => parseInt(y)),
        compatible_variants: form.compatible_variants || [],
        meta_title: form.meta_title || "",
        meta_description: form.meta_description || "",
        seo_slug: form.seo_slug || "",
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

  const uploadImage = async (e, targetField = "image") => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name}: max 5MB`); continue; }
        const fd = new FormData(); fd.append("file", file);
        const { data } = await api.post("/admin/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
        uploaded.push(data.url);
      }
      if (targetField === "image" && uploaded.length > 0) {
        setForm((f) => ({ ...f, image: uploaded[0], gallery: [...(f.gallery || []), ...uploaded.slice(1)] }));
      } else if (targetField === "gallery") {
        setForm((f) => ({ ...f, gallery: [...(f.gallery || []), ...uploaded] }));
      }
      toast.success(`${uploaded.length} image(s) uploaded`);
    } catch (err) {
      const d = err.response?.data?.detail;
      toast.error(typeof d === "string" ? d : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (galleryRef.current) galleryRef.current.value = "";
    }
  };

  const toggleArrItem = (key, val) => setForm((f) => {
    const arr = f[key] || [];
    // Universal "ALL" car_brands behaviour: when ALL is toggled on, clear other brand/model/year selections
    if (key === "car_brands") {
      if (val === "ALL") {
        const has = arr.includes("ALL");
        return has
          ? { ...f, car_brands: arr.filter((x) => x !== "ALL") }
          : { ...f, car_brands: ["ALL"], car_models: [], years: [] };
      }
      // selecting a regular brand removes ALL
      const next = arr.filter((x) => x !== "ALL");
      return { ...f, car_brands: next.includes(val) ? next.filter((x) => x !== val) : [...next, val] };
    }
    return { ...f, [key]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val] };
  });

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (!(form.tags || []).includes(t)) setForm({ ...form, tags: [...(form.tags || []), t] });
    setTagInput("");
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
      setImportResult(data);
      const parts = [];
      if (data.created) parts.push(`${data.created} created`);
      if (data.updated) parts.push(`${data.updated} updated`);
      if (data.error_count) parts.push(`${data.error_count} error${data.error_count === 1 ? "" : "s"}`);
      toast.success(`Import done — ${parts.join(", ") || "no rows processed"}`);
      loadAll();
    } catch (err) { const d = err.response?.data?.detail; toast.error(typeof d === "string" ? d : "Import failed"); }
    finally { setImporting(false); if (csvInputRef.current) csvInputRef.current.value = ""; }
  };

  const downloadSampleCSV = () => {
    // Quote helper for CSV cells that may contain commas/quotes/newlines
    const q = (v) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const headers = [
      "id", "name", "description", "price", "original_price", "category", "categories",
      "brand", "image", "gallery", "stock", "rating", "featured", "is_published",
      "is_best_seller", "is_new_arrival", "discount_percent", "discount_flat", "gst_percent",
      "tags", "car_brands", "car_models", "years", "compatible_variants",
      "meta_title", "meta_description", "seo_slug",
    ];
    const rows = [
      // New product example (id blank → CREATE)
      [
        "",
        "CarDost X9 Pro 10\" Android Stereo",
        "10.1-inch Full HD IPS touchscreen Android 13 head unit with 4GB RAM, 64GB storage, Wireless CarPlay & Android Auto, GPS, Bluetooth 5.0.",
        18999, 24999,
        "android-stereos", "android-stereos|stereos",
        "CarDost",
        "https://images.pexels.com/photos/4141878/pexels-photo-4141878.jpeg",
        "https://example.com/gallery1.jpg|https://example.com/gallery2.jpg",
        25, 4.8,
        "true", "true", "false", "true",
        24, 0, 18,
        "android|carplay|10inch",
        "Hyundai|Maruti Suzuki", "Creta|Swift", "2020|2021|2022|2023|2024",
        "",  // compatible_variants (variant IDs from /api/catalog/tree)
        "CarDost X9 Pro 10-inch Android Stereo | Wireless CarPlay & Android Auto",
        "Premium 10-inch Android 13 head unit with CarPlay, Android Auto, GPS & Bluetooth 5.0. Fits Creta, Swift & more.",
        "cardost-x9-pro-10-android-stereo",
      ],
      // Universal accessory example
      [
        "",
        "Premium LED Headlight H4 200W",
        "Ultra-bright H4 LED headlights, 20000LM, 6000K cool white, plug-and-play. Pair.",
        1899, 2999,
        "led-lights", "led-lights",
        "Generic",
        "https://images.pexels.com/photos/9754665/pexels-photo-9754665.jpeg",
        "",
        100, 4.5,
        "false", "true", "false", "false",
        0, 0, 18,
        "led|headlight|h4",
        "ALL", "ALL", "",
        "",
        "Premium LED Headlight H4 200W (Pair) | Universal Fit",
        "20000LM 6000K cool-white H4 LED headlights, plug-and-play, universal fit. Sold as a pair.",
        "led-headlight-h4-200w",
      ],
      // Update-by-slug example (id blank but seo_slug matches an existing product → UPDATE)
      [
        "",
        "Sony XS-FB1620E 6.5\" Coaxial Speakers (Restock)",
        "260W peak power, 6.5-inch 2-way coaxial speakers. Restocked Feb 2026.",
        2399, 3499,
        "speakers", "speakers",
        "Sony",
        "https://images.unsplash.com/photo-1608538770329-65941f62f9f8",
        "",
        80, 4.7,
        "true", "true", "true", "false",
        31, 0, 18,
        "speakers|sony|coaxial",
        "ALL", "ALL", "",
        "",
        "Sony XS-FB1620E 6.5-inch Coaxial Car Speakers | 260W",
        "Genuine Sony 6.5-inch 2-way coaxial speakers with mica reinforced cones. Universal fit.",
        "sony-xs-fb1620e-6-5-coaxial-speakers",
      ],
    ];
    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map(q).join(",")),
    ].join("\n") + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cardost-products-sample.csv";
    a.click();
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
              { icon: Users, label: "Customers", val: stats.users, color: "text-indigo-600 bg-indigo-50" },
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
          <TabsList className="bg-white border border-stone-200 flex-wrap h-auto">
            <TabsTrigger value="products" data-testid="tab-products">Products</TabsTrigger>
            <TabsTrigger value="categories" data-testid="tab-categories">Categories</TabsTrigger>
            <TabsTrigger value="vehicles" data-testid="tab-vehicles">Vehicles</TabsTrigger>
            <TabsTrigger value="coupons" data-testid="tab-coupons">Coupons</TabsTrigger>
            <TabsTrigger value="banners" data-testid="tab-banners">Banners</TabsTrigger>
            <TabsTrigger value="reviews" data-testid="tab-reviews">Reviews</TabsTrigger>
            <TabsTrigger value="tax" data-testid="tab-tax">Tax Rules</TabsTrigger>
            <TabsTrigger value="messages" data-testid="tab-messages">Messages</TabsTrigger>
            <TabsTrigger value="orders" data-testid="tab-orders">Orders</TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings"><SettingsIcon className="w-4 h-4 mr-1.5"/> Integrations</TabsTrigger>
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
                  <Button data-testid="add-product-btn" onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold uppercase">
                    <Plus className="w-4 h-4 mr-1"/> Add Product
                  </Button>
                </div>
              </div>
              {importResult && (
                <div data-testid="import-result" className="px-4 py-3 bg-emerald-50 border-b border-emerald-200 text-sm flex items-center justify-between">
                  <span>
                    <span className="text-emerald-700 font-bold">{importResult.created || 0}</span> created
                    {" · "}
                    <span className="text-indigo-700 font-bold">{importResult.updated || 0}</span> updated
                    {importResult.error_count > 0 && <span className="text-yellow-700"> · {importResult.error_count} row(s) failed</span>}
                  </span>
                  <button onClick={() => setImportResult(null)} className="text-neutral-500 hover:text-neutral-900 text-xs">Dismiss</button>
                </div>
              )}
              {importResult && importResult.errors && importResult.errors.length > 0 && (
                <div data-testid="import-errors" className="px-4 py-3 bg-amber-50 border-b border-amber-200 text-[11px]">
                  <div className="font-bold text-amber-800 mb-1">Row errors (first {importResult.errors.length}):</div>
                  <ul className="space-y-0.5 text-amber-900">
                    {importResult.errors.map((e, i) => (
                      <li key={i}>Row {e.row}: {e.error}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="px-4 py-2.5 bg-stone-50 border-b border-stone-200 text-[11px] text-stone-600 leading-relaxed">
                <span className="font-bold text-stone-800">CSV format:</span> Required → <code className="bg-white px-1 rounded">name, description, price, category, image</code>.
                List columns (<code className="bg-white px-1 rounded">categories, gallery, tags, car_brands, car_models, years, compatible_variants</code>) use <code className="bg-white px-1 rounded">|</code> as separator.
                To <span className="font-bold">update</span> an existing product fill <code className="bg-white px-1 rounded">id</code> or <code className="bg-white px-1 rounded">seo_slug</code> matching an existing one. Use <code className="bg-white px-1 rounded">ALL</code> in car_brands/car_models for universal-fit.
              </div>
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
                        <button data-testid={`del-${p.id}`} onClick={() => del(p.id)} className="p-2 hover:bg-indigo-50 hover:text-indigo-600 rounded text-neutral-700"><Trash2 className="w-4 h-4"/></button>
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
                        <Link to={`/order/${o.id}`} data-testid={`admin-order-link-${o.id}`} className="text-indigo-600 hover:underline inline-flex items-center gap-1">
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

          <TabsContent value="settings">
            <AdminSettings/>
          </TabsContent>

          <TabsContent value="categories">
            <AdminCategories/>
          </TabsContent>

          <TabsContent value="vehicles">
            <AdminVehicleCatalog/>
          </TabsContent>

          <TabsContent value="coupons">
            <AdminCoupons/>
          </TabsContent>

          <TabsContent value="banners">
            <AdminBanners/>
          </TabsContent>

          <TabsContent value="reviews">
            <AdminReviews/>
          </TabsContent>

          <TabsContent value="tax">
            <AdminTax/>
          </TabsContent>

          <TabsContent value="messages">
            <AdminMessages/>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-xl">{editing ? "Edit" : "New"} Product</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label className="text-xs uppercase font-bold">Name *</Label><Input data-testid="p-name" value={form.name} onChange={c("name")} className="mt-1"/></div>
            <div className="col-span-2"><Label className="text-xs uppercase font-bold">Description *</Label><Textarea rows={5} value={form.description} onChange={c("description")} className="mt-1" placeholder="Markdown allowed. Use **bold**, line breaks, lists, etc."/></div>
            <div><Label className="text-xs uppercase font-bold">Price (₹) *</Label><Input type="number" value={form.price} onChange={c("price")} className="mt-1"/></div>
            <div><Label className="text-xs uppercase font-bold">Original / MRP (₹)</Label><Input type="number" value={form.original_price} onChange={c("original_price")} className="mt-1"/></div>
            <div><Label className="text-xs uppercase font-bold">Discount %</Label><Input type="number" step="0.1" max="100" value={form.discount_percent} onChange={c("discount_percent")} className="mt-1"/></div>
            <div><Label className="text-xs uppercase font-bold">Discount Flat (₹)</Label><Input type="number" value={form.discount_flat} onChange={c("discount_flat")} className="mt-1"/></div>
            <div>
              <Label className="text-xs uppercase font-bold">GST / Tax %</Label>
              <Select value={String(form.gst_percent)} onValueChange={(v) => setForm({ ...form, gst_percent: parseInt(v) })}>
                <SelectTrigger className="mt-1"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0% (Exempt)</SelectItem>
                  <SelectItem value="5">5%</SelectItem>
                  <SelectItem value="12">12%</SelectItem>
                  <SelectItem value="18">18%</SelectItem>
                  <SelectItem value="28">28%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase font-bold">Primary Category *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v, categories: [...new Set([v, ...(form.categories || [])])] })}>
                <SelectTrigger className="mt-1"><SelectValue/></SelectTrigger>
                <SelectContent>{cats.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs uppercase font-bold">Brand</Label><Input value={form.brand || ""} onChange={c("brand")} className="mt-1" placeholder="Sony, JBL, Pioneer..."/></div>
            <div><Label className="text-xs uppercase font-bold">Stock</Label><Input type="number" value={form.stock} onChange={c("stock")} className="mt-1"/></div>

            {/* Multi-category assignment */}
            <div className="col-span-2">
              <Label className="text-xs uppercase font-bold">Additional Categories (multi-select)</Label>
              <div className="flex flex-wrap gap-1.5 mt-2 max-h-32 overflow-y-auto p-2 bg-stone-50 rounded border border-stone-200">
                {cats.map((cat) => {
                  const sel = (form.categories || []).includes(cat.slug);
                  return (
                    <button key={cat.slug} type="button" data-testid={`mcat-${cat.slug}`}
                            onClick={() => toggleArrItem("categories", cat.slug)}
                            className={`text-xs px-3 py-1.5 rounded-full transition ${sel ? "bg-indigo-600 text-white" : "bg-white border border-stone-300 text-stone-700 hover:border-indigo-400"}`}>
                      {cat.name}
                    </button>
                  );
                })}
              </div>
              <div className="text-[10px] text-stone-500 mt-1">Product will appear in all selected categories.</div>
            </div>

            {/* Visibility flags */}
            <div className="col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-stone-200">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_published !== false} onChange={(e) => setForm({ ...form, is_published: e.target.checked })}/>
                Published
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })}/>
                Featured
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.is_best_seller} onChange={(e) => setForm({ ...form, is_best_seller: e.target.checked })}/>
                Best Seller
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.is_new_arrival} onChange={(e) => setForm({ ...form, is_new_arrival: e.target.checked })}/>
                New Arrival
              </label>
            </div>

            {/* Tags */}
            <div className="col-span-2">
              <Label className="text-xs uppercase font-bold">Tags / Custom Categories</Label>
              <div className="flex gap-2 mt-1">
                <Input data-testid="tag-input" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} placeholder="Type and press Enter (e.g. 'bestseller', 'new-arrival')" className="flex-1"/>
                <Button type="button" onClick={addTag} variant="outline" className="border-stone-300">Add</Button>
              </div>
              {(form.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.tags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded-full border border-indigo-200">
                      {t}
                      <button onClick={() => setForm({ ...form, tags: form.tags.filter((x) => x !== t) })} className="hover:text-indigo-900"><X className="w-3 h-3"/></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Main image */}
            <div className="col-span-2">
              <Label className="text-xs uppercase font-bold">Main Product Image *</Label>
              <div className="mt-1 flex gap-2">
                <Input data-testid="p-image-url" placeholder="Paste URL or upload" value={form.image} onChange={c("image")} className="flex-1"/>
                <input ref={fileInputRef} data-testid="p-image-file" type="file" accept="image/*" onChange={(e) => uploadImage(e, "image")} className="hidden"/>
                <Button type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()} variant="outline">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Upload className="w-4 h-4 mr-1"/>Upload</>}
                </Button>
              </div>
              {form.image && <img src={resolveImg(form.image)} alt="" className="mt-3 w-28 h-28 object-cover rounded-lg border border-stone-200"/>}
            </div>

            {/* Gallery (multi) */}
            <div className="col-span-2">
              <Label className="text-xs uppercase font-bold">Gallery (Additional Photos)</Label>
              <div className="mt-1">
                <input ref={galleryRef} type="file" accept="image/*" multiple onChange={(e) => uploadImage(e, "gallery")} className="hidden"/>
                <Button type="button" disabled={uploading} onClick={() => galleryRef.current?.click()} variant="outline" className="w-full border-dashed border-stone-300 py-6 text-stone-500 hover:text-stone-900">
                  <Upload className="w-4 h-4 mr-2"/> Upload multiple gallery images
                </Button>
              </div>
              {(form.gallery || []).length > 0 && (
                <div className="grid grid-cols-5 gap-2 mt-3">
                  {form.gallery.map((g, i) => (
                    <div key={i} className="relative aspect-square">
                      <img src={resolveImg(g)} alt="" className="w-full h-full object-cover rounded-lg border border-stone-200"/>
                      <button onClick={() => setForm({ ...form, gallery: form.gallery.filter((_, idx) => idx !== i) })} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-stone-900 text-white rounded-full grid place-items-center hover:bg-rose-600">
                        <X className="w-3 h-3"/>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Vehicle Compatibility (NEW: hierarchical Make → Model → Year/Variant) */}
            <div className="col-span-2 border-t border-stone-200 pt-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <Label className="text-xs uppercase font-bold">Vehicle Compatibility</Label>
                  <div className="text-[10px] text-stone-500">Pick exact <strong>Make → Model → Year/Variant</strong> the product fits — or mark Universal.</div>
                </div>
                <button type="button" data-testid="cb-ALL" onClick={() => toggleArrItem("car_brands", "ALL")}
                        className={`text-xs px-3 py-1.5 rounded-full transition font-bold uppercase tracking-wider ${(form.car_brands || []).includes("ALL") ? "bg-emerald-600 text-white shadow ring-2 ring-emerald-300" : "bg-emerald-50 border border-emerald-300 text-emerald-700 hover:bg-emerald-100"}`}>
                  🌐 ALL CARS (Universal)
                </button>
              </div>
              {!(form.car_brands || []).includes("ALL") && (
                <VehicleVariantPicker
                  value={form.compatible_variants || []}
                  onChange={(vids) => setForm({ ...form, compatible_variants: vids })}
                />
              )}
            </div>

            {(form.car_brands || []).includes("ALL") && (
              <div className="col-span-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-800">
                <strong>Universal product:</strong> This product will appear for every Make / Model / Year filter in the shop.
              </div>
            )}

            {/* SEO Metadata */}
            <div className="col-span-2 border-t border-stone-200 pt-4">
              <Label className="text-xs uppercase font-bold">SEO Metadata</Label>
              <div className="grid sm:grid-cols-2 gap-3 mt-2">
                <div>
                  <Label className="text-[10px] uppercase text-stone-500">Meta Title</Label>
                  <Input data-testid="p-meta-title" value={form.meta_title || ""} onChange={c("meta_title")} className="mt-1" placeholder="Best 9-inch Android Stereo for Maruti Swift — CarDost"/>
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-stone-500">SEO Slug</Label>
                  <Input data-testid="p-seo-slug" value={form.seo_slug || ""} onChange={c("seo_slug")} className="mt-1" placeholder="9-inch-android-stereo-maruti-swift"/>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-[10px] uppercase text-stone-500">Meta Description (max ~160 chars)</Label>
                  <Textarea data-testid="p-meta-desc" rows={2} value={form.meta_description || ""} onChange={c("meta_description")} className="mt-1" placeholder="Premium 9-inch Android car stereo with 4GB RAM, GPS, CarPlay. Perfect fit for Maruti Swift…"/>
                  <div className="text-[10px] text-stone-500 mt-1">{(form.meta_description || "").length} / 160 characters</div>
                </div>
              </div>
            </div>

            <div className="col-span-2 flex items-center gap-3 pt-2 border-t border-stone-200">
              <span className="text-[10px] text-stone-500">Tip: Use the multi-select above to assign this product to multiple categories.</span>
            </div>
          </div>
          <Button data-testid="save-product" onClick={save} className="bg-indigo-600 hover:bg-indigo-700 font-bold uppercase tracking-wider text-xs">Save Product</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
