# CarDost — Car Audio E-commerce Website

## Original Problem Statement
Premium car-audio store with Razorpay + Shiprocket integration, reviews engine, advanced automotive catalog.

## Architecture (Data-Driven)
- **Backend**: FastAPI + MongoDB + JWT + Razorpay SDK + Shiprocket API + Emergent Object Storage
- **Frontend**: React 19 + Tailwind + shadcn/ui + sonner — **all config flows from `settings` collection** (admin can edit any integration credential at runtime; no hardcoded keys for any third-party service)
- **Theme**: Indigo + warm off-white + slate-900 dark accents, DM Sans / Bricolage / Bebas Neue fonts

## Implemented Features (latest)

### Integrations Tab (Admin → Integrations)
- **Razorpay**: Key ID, Key Secret (masked w/ eye toggle), Webhook Secret, Mock Mode toggle
- **Shiprocket**: Enable toggle, Email, Password (masked), Channel ID, Pickup Location
- **Store Profile**: Store Name, Support Email, Support Phone (public-readable)
- All settings persist to MongoDB; Razorpay client + webhook secret + Shiprocket creds are now read **dynamically** from settings on every order/webhook
- Endpoints: `GET/PUT /api/admin/settings`, `GET /api/settings/public`

### Razorpay → Shiprocket Pipeline
- Order is created in Razorpay using dynamic settings
- On `payment.captured`, `payment.authorized`, or `order.paid` webhook → stock decrement + auto-fire Shiprocket order create
- Shiprocket order payload: customer name/phone/email/full address extracted from checkout; mapped to `/orders/create/adhoc`
- Shiprocket response saved to `orders.shiprocket` field for admin debugging
- Idempotent (no double-decrement of stock)

### Review Engine
- DB: `reviews` collection with `id`, `product_id`, `name`, `rating`, `title`, `comment`, `is_approved` (default true), `created_at`
- `POST /api/products/{pid}/reviews` — public write
- `GET /api/products/{pid}/reviews` — public read (approved only)
- `GET/PATCH/DELETE /api/admin/reviews` — admin moderation
- On every review change → recalculate product avg rating + review count via Mongo aggregation
- **Product Detail page** now shows: review summary (avg, distribution bars), "Write a Review" form (5-star widget, name, title, comment), list of approved reviews

### Advanced Automotive Catalog
- Extended Product model: `gallery[]`, `discount_percent`, `discount_flat`, `gst_percent` (5/12/18/28), `tags[]`, `car_brands[]`, `car_models[]`, `years[]`, `review_count`
- Admin product form now has:
  - Multi-image gallery upload (drag/drop UI)
  - GST tax dropdown
  - Discount % + Flat ₹
  - Tag chips
  - **Car Brands** multi-select pills (16 Indian brands seeded)
  - **Car Models** dependent multi-select (filtered by selected brands)
  - **Manufacturing Years** multi-select (2000–current year)
- Endpoints:
  - `GET /api/catalog/car-brands` (16 brands)
  - `GET /api/catalog/car-models?brand=A,B` (dependent)
  - `GET /api/catalog/years` (2000 → current)
  - `GET /api/products/filter?category=&car_brand=&car_model=&year=&tag=&min_price=&max_price=&q=`

### Shop Page Vehicle Filter
- Sidebar now has collapsible "Categories" + "My Car" sections
- Car brand → Model (dependent dropdown) → Year filters wire to `/api/products/filter`
- Active filters displayed; clear-vehicle button
- Product detail shows "Compatible With" badge box (brands, models, years)

## Credentials
See `/app/memory/test_credentials.md`

## Test Endpoints Verified
✅ `/api/admin/settings` GET/PUT
✅ `/api/products/{id}/reviews` POST + GET
✅ `/api/catalog/car-brands` (16) and `/api/catalog/car-models?brand=Maruti+Suzuki,Tata` (26 models)
✅ `/api/products/filter` with car_brand / car_model / year params

## Backlog
- **P1**: Webhook test in production with real Razorpay payload
- **P2**: Display gallery images on shop card thumbnails
- **P2**: Admin Reviews moderation UI (data already in `/api/admin/reviews`)
- **P3**: Customer-facing "verified purchase" badge on reviews
- **P3**: Tax breakdown on checkout (currently flat GST in product, but not itemized in order)
