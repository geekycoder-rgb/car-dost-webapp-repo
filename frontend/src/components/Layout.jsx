import { Link, NavLink, useNavigate } from "react-router-dom";
import { ShoppingCart, User, LogOut, Menu, X, Phone, Mail, Search, Heart, Home as HomeIcon, Grid, MessageCircle, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useWishlist } from "@/context/WishlistContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from "@/components/ui/dropdown-menu";

const PROMO_ITEMS = [
  "🎉 Extra 5% on Prepaid Orders",
  "🚚 Cash On Delivery Available Now",
  "🔥 Buy one get 5% off — Use code SAVE5",
  "🛠️ FREE Pro Installation Booking",
  "⚡ Same-day shipping across India",
];

export default function Layout({ children }) {
  const { count } = useCart();
  const { user, logout } = useAuth();
  const { count: wlCount } = useWishlist();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchCat, setSearchCat] = useState("all");
  const [categories, setCategories] = useState([]);
  const [siteTheme, setSiteTheme] = useState("professional-light");

  useEffect(() => {
    api.get("/categories")
      .then((r) => setCategories((r.data || []).filter((c) => c.is_active !== false).sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99))))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    api.get("/settings/public")
      .then((r) => setSiteTheme(r.data?.site_theme || "professional-light"))
      .catch(() => setSiteTheme("professional-light"));
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = siteTheme;
    }
  }, [siteTheme]);

  // Static (non-category) routes — pre + post category list
  const staticLinks = [
    { to: "/", label: "Home" },
  ];
  const tailLinks = [
    { to: "/track-order", label: "Track Order" },
    { to: "/reviews", label: "Reviews" },
    { to: "/about", label: "About" },
    { to: "/faq", label: "FAQ" },
    { to: "/contact", label: "Contact" },
  ];

  const categoryLinks = categories.map((c) => ({
    to: `/shop?category=${c.slug}`,
    label: c.name,
  }));

  const navLinks = [...staticLinks, ...categoryLinks, ...tailLinks];

  const submitSearch = (e) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (searchQ.trim()) p.set("q", searchQ.trim());
    if (searchCat && searchCat !== "all") p.set("category", searchCat);
    navigate(`/shop${p.toString() ? `?${p.toString()}` : ""}`);
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {/* Promo marquee */}
      <div className="bg-[#0F172A] text-white overflow-hidden border-b border-indigo-600">
        <div className="flex animate-marquee whitespace-nowrap py-2">
          {[...PROMO_ITEMS, ...PROMO_ITEMS, ...PROMO_ITEMS].map((p, i) => (
            <span key={i} className="text-xs font-medium px-8 inline-flex items-center">{p}</span>
          ))}
        </div>
      </div>

      {/* Utility bar */}
      <div className="hidden md:block bg-[#0F172A] text-white border-t border-neutral-800">
        <div className="max-w-7xl mx-auto px-6 py-2 flex justify-between text-xs">
          <div className="flex gap-6">
            <a href="tel:+919063278724" className="flex items-center gap-2 hover:text-indigo-400 transition"><Phone className="w-3.5 h-3.5"/>+91 90632 78724</a>
            <a href="mailto:support@cardost.in" className="flex items-center gap-2 hover:text-indigo-400 transition"><Mail className="w-3.5 h-3.5"/>support@cardost.in</a>
          </div>
          <div className="flex gap-5">
            {user ? (
              <button data-testid="utility-logout" onClick={() => { logout(); navigate("/"); }} className="flex items-center gap-1.5 hover:text-indigo-400 transition">
                <User className="w-3.5 h-3.5"/> Hi, {user.name.split(" ")[0]} · Logout
              </button>
            ) : (
              <Link to="/login" data-testid="utility-login" className="flex items-center gap-1.5 hover:text-indigo-400 transition">
                <User className="w-3.5 h-3.5"/> Login / Sign Up
              </Link>
            )}
            {user?.role === "admin" && (
              <Link to="/admin" className="text-indigo-400 hover:text-indigo-300">Admin</Link>
            )}
          </div>
        </div>
      </div>

      {/* Main header — white with logo + search */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4 flex items-center justify-between gap-4 lg:gap-8">
          <Link to="/" className="flex items-center gap-3 shrink-0" data-testid="logo-link">
            <img src="/cardostlogo.png" alt="CarDost" className="h-12 w-12 rounded-xl border-2 border-indigo-600 bg-white object-contain p-1" />
            <div className="leading-none">
              <div className="font-anton text-2xl lg:text-3xl tracking-wide text-neutral-900">
                CAR<span className="text-indigo-600">DOST</span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-neutral-500 mt-0.5">Accessories & More</div>
            </div>
          </Link>

          <div className="hidden md:flex flex-1 max-w-2xl items-center gap-3">
            <span className="text-indigo-600 font-bold text-sm uppercase tracking-wide whitespace-nowrap hidden lg:inline">What are you looking for?</span>
            <form onSubmit={submitSearch} className="flex-1 flex items-stretch border-2 border-neutral-300 rounded-md focus-within:border-indigo-600 overflow-hidden bg-white">
              <select
                data-testid="header-search-cat"
                value={searchCat}
                onChange={(e) => setSearchCat(e.target.value)}
                className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-xs font-bold uppercase tracking-wider text-stone-700 border-r border-stone-300 focus:outline-none cursor-pointer max-w-[140px] truncate"
                aria-label="Search category"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
              <Input
                data-testid="header-search"
                placeholder="Search for stereos, speakers, accessories..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                className="h-11 flex-1 border-0 focus:ring-0 focus-visible:ring-0 text-sm rounded-none px-3"
              />
              <button type="submit" data-testid="header-search-submit" className="h-11 w-12 grid place-items-center bg-indigo-600 hover:bg-indigo-700 text-white transition shrink-0">
                <Search className="w-4 h-4"/>
              </button>
            </form>
          </div>

          <div className="flex items-center gap-2 lg:gap-4 shrink-0">
            <Link to="/wishlist" data-testid="wishlist-btn" className="relative hidden md:grid place-items-center p-2 text-neutral-700 hover:text-indigo-600 transition">
              <Heart className="w-5 h-5"/>
              {wlCount > 0 && (
                <span data-testid="wishlist-count" className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 rounded-full grid place-items-center">{wlCount}</span>
              )}
            </Link>
            <Link to="/cart" data-testid="cart-btn" className="relative p-2 text-neutral-700 hover:text-indigo-600 transition">
              <ShoppingCart className="w-5 h-5"/>
              {count > 0 && (
                <span data-testid="cart-count" className="absolute -top-0.5 -right-0.5 bg-indigo-600 text-white text-[10px] font-bold w-5 h-5 rounded-full grid place-items-center">{count}</span>
              )}
            </Link>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button data-testid="user-menu-trigger" className="hidden md:grid place-items-center p-2 text-neutral-700 hover:text-indigo-600">
                    <User className="w-5 h-5"/>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Hi, {user.name}</DropdownMenuLabel>
                  <DropdownMenuSeparator/>
                  {user.role === "admin" ? (
                    <DropdownMenuItem data-testid="menu-admin" onClick={() => navigate("/admin")}>Admin Dashboard</DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem data-testid="menu-orders" onClick={() => navigate("/my-orders")}>My Orders</DropdownMenuItem>
                  )}
                  <DropdownMenuItem data-testid="menu-logout" onClick={() => { logout(); navigate("/"); }}><LogOut className="w-4 h-4 mr-2"/> Logout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            <button className="lg:hidden p-2 text-neutral-700" onClick={() => setMobileOpen(!mobileOpen)} data-testid="mobile-menu-toggle">
              {mobileOpen ? <X className="w-5 h-5"/> : <Menu className="w-5 h-5"/>}
            </button>
          </div>
        </div>

        {/* Mobile search bar */}
        <div className="md:hidden px-4 pb-3">
          <form onSubmit={submitSearch} className="relative">
            <Input
              data-testid="mobile-search"
              placeholder="Search products..."
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              className="h-10 pr-10 border-2 border-neutral-300 focus:border-indigo-600 rounded-md"
            />
            <button type="submit" className="absolute right-0 top-0 h-10 w-10 grid place-items-center bg-indigo-600 text-white rounded-r-md">
              <Search className="w-4 h-4"/>
            </button>
          </form>
        </div>
      </header>

      {/* Dark main nav */}
      <nav className="hidden lg:block bg-[#0F172A] text-white border-t border-neutral-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-center gap-1 flex-wrap">
            {navLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                data-testid={`nav-${l.label.toLowerCase().replace(/ /g, "-")}`}
                className={({ isActive }) =>
                  `relative px-5 py-3.5 text-xs font-bold uppercase tracking-wider transition group whitespace-nowrap ${
                    isActive ? "text-indigo-500" : "text-white hover:text-indigo-500"
                  }`
                }
              >
                {l.label}
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 group-hover:w-full h-0.5 bg-indigo-500 transition-all"/>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="lg:hidden bg-[#0F172A] text-white">
          <div className="px-4 py-2 flex flex-col">
            {navLinks.map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)} className="px-3 py-3 text-sm font-bold uppercase tracking-wider border-b border-neutral-800 hover:text-indigo-500">
                {l.label}
              </Link>
            ))}
            {!user && (
              <Link to="/login" onClick={() => setMobileOpen(false)} className="px-3 py-3 text-sm font-bold uppercase text-indigo-500">Login / Sign Up</Link>
            )}
            {user && (
              <>
                <Link to={user.role === "admin" ? "/admin" : "/my-orders"} onClick={() => setMobileOpen(false)} className="px-3 py-3 text-sm font-bold uppercase border-b border-neutral-800">
                  {user.role === "admin" ? "Admin Dashboard" : "My Orders"}
                </Link>
                <button onClick={() => { logout(); setMobileOpen(false); navigate("/"); }} className="px-3 py-3 text-left text-sm font-bold uppercase text-indigo-500">Logout</button>
              </>
            )}
          </div>
        </div>
      )}

      <main className="min-h-[60vh]">{children}</main>

      {/* Footer */}
      <footer className="mt-20 bg-[#0F172A] text-white">
        <div className="max-w-7xl mx-auto px-6 py-14 grid md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white rounded grid place-items-center font-anton text-indigo-600 text-2xl border-2 border-indigo-600">C</div>
              <div className="font-anton text-2xl">CAR<span className="text-indigo-500">DOST</span></div>
            </div>
            <p className="text-sm text-neutral-400 leading-relaxed mb-4">
              India&apos;s trusted destination for premium car audio, Android stereos, speakers and accessories. Best prices guaranteed.
            </p>
            <div className="space-y-1.5 text-xs text-neutral-400">
              <a href="tel:+919063278724" className="flex gap-2 items-center hover:text-indigo-400"><Phone className="w-3.5 h-3.5"/>+91 90632 78724</a>
              <a href="mailto:support@cardost.in" className="flex gap-2 items-center hover:text-indigo-400 break-all"><Mail className="w-3.5 h-3.5"/>support@cardost.in</a>
            </div>
          </div>
          <div>
            <div className="font-display text-base font-bold uppercase tracking-wider mb-4 text-indigo-500">Shop</div>
            <ul className="space-y-2 text-sm text-neutral-300">
              <li><Link to="/shop?category=android-stereos" className="hover:text-indigo-400">Android Stereos</Link></li>
              <li><Link to="/shop?category=speakers" className="hover:text-indigo-400">Speakers</Link></li>
              <li><Link to="/shop?category=amplifiers" className="hover:text-indigo-400">Amplifiers</Link></li>
              <li><Link to="/shop?category=dash-cameras" className="hover:text-indigo-400">Dash Cameras</Link></li>
              <li><Link to="/shop?category=led-lights" className="hover:text-indigo-400">LED Lights</Link></li>
              <li><Link to="/shop?category=perfumes" className="hover:text-indigo-400">Air Fresheners</Link></li>
              <li><Link to="/shop?category=accessories" className="hover:text-indigo-400">Accessories</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-display text-base font-bold uppercase tracking-wider mb-4 text-indigo-500">Customer Care</div>
            <ul className="space-y-2 text-sm text-neutral-300">
              <li><Link to="/about" className="hover:text-indigo-400">About Us</Link></li>
              <li><Link to="/reviews" className="hover:text-indigo-400">Reviews</Link></li>
              <li><Link to="/faq" className="hover:text-indigo-400">FAQ</Link></li>
              <li><Link to="/contact" className="hover:text-indigo-400">Contact Us</Link></li>
              <li><Link to="/track-order" className="hover:text-indigo-400">Track Order</Link></li>
              <li><Link to="/faq" className="hover:text-indigo-400">Return Policy</Link></li>
              <li><Link to="/faq" className="hover:text-indigo-400">Shipping Info</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-display text-base font-bold uppercase tracking-wider mb-4 text-indigo-500">Stay Connected</div>
            <p className="text-xs text-neutral-400 mb-3">Subscribe for exclusive deals & launches.</p>
            <form className="flex gap-2 mb-5">
              <Input type="email" placeholder="Your email" className="bg-neutral-900 border-neutral-700 text-white h-10 text-sm" data-testid="newsletter-input"/>
              <Button type="button" className="bg-indigo-600 hover:bg-indigo-700 h-10 px-4 text-xs font-bold">JOIN</Button>
            </form>
            <div className="flex gap-2 text-[10px] text-neutral-400">
              <span className="bg-neutral-800 px-2 py-1 rounded">VISA</span>
              <span className="bg-neutral-800 px-2 py-1 rounded">MC</span>
              <span className="bg-neutral-800 px-2 py-1 rounded">UPI</span>
              <span className="bg-neutral-800 px-2 py-1 rounded">COD</span>
              <span className="bg-neutral-800 px-2 py-1 rounded">RAZORPAY</span>
            </div>
          </div>
        </div>
        <div className="border-t border-neutral-800">
          <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row justify-between gap-2 text-xs text-neutral-500">
            <div>© 2026 CarDost. All rights reserved.</div>
            <div>Made with ❤️ in India · Secure checkout by Razorpay</div>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp */}
      <a href="https://wa.me/919063278724?text=Hello%20CarDost%2C%20I%27d%20like%20to%20enquire" target="_blank" rel="noopener noreferrer" data-testid="whatsapp-fab"
         className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-50 w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 grid place-items-center shadow-lg animate-float">
        <MessageCircle className="w-7 h-7 text-white fill-white"/>
      </a>

      {/* Mobile bottom nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 grid grid-cols-4 z-40">
        <Link to="/" className="flex flex-col items-center py-2.5 text-[10px] text-neutral-700 hover:text-indigo-600" data-testid="mob-home">
          <HomeIcon className="w-5 h-5 mb-0.5"/> HOME
        </Link>
        <Link to="/shop" className="flex flex-col items-center py-2.5 text-[10px] text-neutral-700 hover:text-indigo-600" data-testid="mob-shop">
          <Grid className="w-5 h-5 mb-0.5"/> CATEGORY
        </Link>
        <Link to="/cart" className="relative flex flex-col items-center py-2.5 text-[10px] text-neutral-700 hover:text-indigo-600" data-testid="mob-cart">
          <ShoppingCart className="w-5 h-5 mb-0.5"/> CART
          {count > 0 && <span className="absolute top-1 right-6 bg-indigo-600 text-white text-[9px] font-bold w-4 h-4 rounded-full grid place-items-center">{count}</span>}
        </Link>
        <a href="https://wa.me/919063278724" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center py-2.5 text-[10px] text-neutral-700 hover:text-green-600" data-testid="mob-whatsapp">
          <MessageCircle className="w-5 h-5 mb-0.5"/> WHATSAPP
        </a>
      </div>
      <div className="lg:hidden h-14"/>
    </div>
  );
}
