# CarDost — Car Audio E-commerce PRD

## Original problem statement
Build a full-stack e-commerce site for CarDost (car stereo, Android systems, accessories).
Live integrations: Razorpay (payments), Shiprocket (logistics), Emergent Object Storage (images).
Admin Control Center with 12 distinct management modules.
DO NOT delete/modify Razorpay & Shiprocket live credentials saved in DB settings.

## Tech stack
- Frontend: React 18 + Tailwind + shadcn/ui + Lucide icons
- Backend: FastAPI + Motor (async MongoDB)
- Fonts: DM Sans (body) · Bricolage Grotesque (display)
- Theme: indigo/slate

## Architecture
```
/app/
├── backend/server.py     (single-file FastAPI; all routes /api/*)
├── backend/data/car_database.json  (seeded Make→Model→Variant hierarchy)
├── frontend/src/
│   ├── pages/    (Home, Shop, ProductDetail, Cart, Checkout, OrderDetail, AdminDashboard, ...)
│   ├── components/   (ui/, Layout, ProductCard, ProductReviews,
│   │                  AdminCategories, AdminCoupons, AdminBanners,
│   │                  AdminReviews, AdminTax, AdminVehicleCatalog,
│   │                  VehicleVariantPicker  — admin tree + CustomerVehicleSelector)
│   └── context/    (AuthContext, CartContext — cart line keyed by product+variant)
```

## Key Data Models
- products: { id, name, description, price, original_price, category, categories[], image, gallery[], stock, car_brands[], car_models[], years[], **compatible_variants[]** (variant IDs), meta_title, meta_description, seo_slug }
- **car_makes**: { id, name, slug }
- **car_models**: { id, make_id, name, slug }
- **car_variants**: { id, model_id, name, slug, start_year, end_year (None=Present), facelift_years, notes }
- orders: items include `vehicle_variant_id` and `vehicle_label` per line
- banners, tax_rules, coupons, reviews, settings, users, categories — as before

## Key API endpoints
**Vehicle Catalog v2 (hierarchical)**
- `GET /api/catalog/makes` — list
- `GET /api/catalog/models?make_id=` — filter
- `GET /api/catalog/variants?model_id=` — filter
- `GET /api/catalog/tree` — nested makes→models→variants
- `GET /api/catalog/variant/{vid}/label` — human label
- Admin CRUD: `POST/PUT/DELETE /api/admin/catalog/{makes|models|variants}` (DELETE on make cascades)

**Products (filter accepts both legacy & v2 params)**
- `GET /api/products/filter?make_id=&model_id=&variant_id=&car_brand=&car_model=&year=`
- Universal products (car_brands contains "ALL") are unioned into every brand/model/year/variant filter result

**Other**
- `/api/orders/create` accepts `items[].vehicle_variant_id` and `vehicle_label`; both preserved in stored order document
- `/api/admin/banners`, `/api/tax-rules`, `/api/admin/reviews` — moderation/admin UI
- `/api/orders/verify` (Razorpay HMAC signature verify), `/api/razorpay/webhook` → Shiprocket sync

## Completed Features
- Multi-category catalog with hero, FAQ, About, Reviews
- Razorpay live + webhook → Shiprocket auto-sync
- Object storage uploads, image gallery
- Coupons (dynamic), Banner CMS, Tax rules CMS, Reviews moderation
- Per-product SEO metadata (meta_title, meta_description, seo_slug) injected on ProductDetail
- **NEW: Vehicle Catalog v2 — hierarchical Make → Model → Year/Variant**
  - Seeded from /app/backend/data/car_database.json (9 makes / 28 models / 55 variants, Indian market 2008-2026)
  - Admin "Vehicles" tab with tree CRUD (cascade-delete)
  - Product form uses VehicleVariantPicker (search + collapsible tree with tri-state checkboxes)
  - Customer ProductDetail page: cascading Make→Model→Variant dropdowns enforce selection unless product is Universal
  - Cart lines keyed by (product_id, variant_id) — same product with two different vehicles = two cart lines
  - Vehicle label rendered on Cart, Checkout summary, OrderDetail line items
- Universal "ALL CARS" sentinel — products marked ALL appear for any brand/model/year/variant filter

## Roadmap / Backlog
**P1**
- Admin Inventory module (low stock alerts, bulk stock update)
- Admin Customers module (CRM view, order history)
- Admin Shipping module (Shiprocket dashboard within app)
- Refactor: split AdminDashboard.jsx into per-tab page components

**P2**
- Low-stock email alerts (background task)
- Shop sidebar — cascading Make→Model→Variant filter (UI exists in product form, port to shop)
- Phase 5 QA report
- Verified-purchase badge on reviews

## Test Coverage
- /app/backend/tests/test_cardost_api.py (24 tests)
- /app/backend/tests/test_cardost_universal.py (16 tests)
- /app/backend/tests/test_cardost_vehicles.py (18 tests, NEW)

## Run / Deploy
- Services managed by supervisor (backend:8001, frontend:3000)
- Frontend env: `REACT_APP_BACKEND_URL` from /app/frontend/.env
- Backend env: `MONGO_URL`, `DB_NAME` from /app/backend/.env
- Vehicle catalog seeds idempotently on first boot if car_makes collection is empty
