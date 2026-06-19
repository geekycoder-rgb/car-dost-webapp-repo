# CarDost — Car Audio E-commerce Website

## Original Problem Statement
"Create a website for my car stereo android system. I have attached the product image (car audio shop). Also integrate razor pay payment gateway."

## User Choices
- Brand: **CarDost** (Autobotscarstudio@gmail.com, +91 9063278724)
- Full product catalog (stereos, speakers, amps, dash cams, LEDs, perfumes, accessories)
- Razorpay TEST mode (MOCK_PAYMENT=true, real keys to be added later)
- Admin panel with simple login
- Both guest checkout AND account-based auth

## Architecture
- **Backend**: FastAPI + MongoDB + JWT auth + Razorpay SDK
- **Frontend**: React 19 + React Router + Tailwind + shadcn/ui + sonner toasts
- **Theme**: Dark luxury with red-500 accents (Outfit display + Manrope body)

## User Personas
1. **Guest customer** — browses catalog, adds to cart, checks out without account
2. **Registered customer** — has account, tracks orders via /my-orders
3. **Admin** — manages products, views all orders & revenue stats

## Implemented (Feb 2026)
- ✅ Landing page (hero, category bento, featured products, CTA)
- ✅ Shop with sidebar filters + search
- ✅ Product detail with qty selector, Add to Cart, Buy Now
- ✅ Cart (localStorage) with qty management
- ✅ Checkout — guest + authenticated, address form, simulated Razorpay flow
- ✅ Auth — signup, login, JWT, user dropdown
- ✅ My Orders page
- ✅ Admin login + dashboard (stats, products CRUD, orders table)
- ✅ Contact form
- ✅ 16 seed products across 7 categories
- ✅ Razorpay integration (MOCK toggle for demo, real flow ready when keys are added)

## Test Results (iteration_1)
- Backend: **100% (24/24 pytest)**
- Frontend: **~85%** — 2 minor UX bugs fixed in main agent (checkout prefill + admin 422 toast)

## Prioritized Backlog
- **P1**: Real Razorpay keys (currently MOCK) — set `MOCK_PAYMENT=false` and add real test keys
- **P2**: Stock decrement on order, order detail view, order status updates (shipped/delivered) by admin
- **P2**: Product image upload via object storage (currently URL-only)
- **P2**: Order tracking link via email + SMS notifications
- **P3**: Customer reviews & ratings
- **P3**: Wishlist, related products on detail page
- **P3**: Coupon codes / promotions

## Credentials
See `/app/memory/test_credentials.md`
