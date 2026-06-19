import { Link, NavLink, useNavigate } from "react-router-dom";
import { ShoppingCart, User, LogOut, Menu, X, Phone, Mail, MapPin } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from "@/components/ui/dropdown-menu";

export default function Layout({ children }) {
  const { count } = useCart();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/shop", label: "Shop" },
    { to: "/shop?category=android-stereos", label: "Stereos" },
    { to: "/shop?category=speakers", label: "Speakers" },
    { to: "/contact", label: "Contact" },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Top bar */}
      <div className="hidden md:block bg-[#0A0A0A] border-b border-[#1a1a1a] text-xs text-neutral-400">
        <div className="max-w-7xl mx-auto px-6 py-2 flex justify-between">
          <div className="flex gap-6">
            <span className="flex items-center gap-2"><Phone className="w-3 h-3 text-red-500"/>+91 90632 78724</span>
            <span className="flex items-center gap-2"><Mail className="w-3 h-3 text-red-500"/>Autobotscarstudio@gmail.com</span>
          </div>
          <span>Free shipping across India • COD available</span>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-[#262626]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2 group" data-testid="logo-link">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-700 grid place-items-center font-black text-white text-lg group-hover:scale-110 transition">C</div>
            <div className="leading-tight">
              <div className="font-display text-xl font-black tracking-tighter">CarDost</div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">Car Audio Studio</div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                data-testid={`nav-${l.label.toLowerCase()}`}
                className={({ isActive }) =>
                  `px-4 py-2 text-sm font-medium uppercase tracking-wider transition rounded-md ${
                    isActive ? "text-white bg-white/5" : "text-neutral-400 hover:text-white"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/cart" data-testid="cart-btn" className="relative p-2.5 rounded-lg hover:bg-white/5 transition">
              <ShoppingCart className="w-5 h-5" />
              {count > 0 && (
                <span data-testid="cart-count" className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full grid place-items-center">
                  {count}
                </span>
              )}
            </Link>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button data-testid="user-menu-trigger" className="p-2.5 rounded-lg hover:bg-white/5 transition">
                    <User className="w-5 h-5"/>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-[#141414] border-[#262626] text-white">
                  <DropdownMenuLabel>Hi, {user.name}</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-[#262626]"/>
                  {user.role === "admin" ? (
                    <DropdownMenuItem data-testid="menu-admin" onClick={() => navigate("/admin")}>Admin Dashboard</DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem data-testid="menu-orders" onClick={() => navigate("/my-orders")}>My Orders</DropdownMenuItem>
                  )}
                  <DropdownMenuItem data-testid="menu-logout" onClick={() => { logout(); navigate("/"); }}>
                    <LogOut className="w-4 h-4 mr-2"/> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button data-testid="login-btn-header" onClick={() => navigate("/login")} className="bg-red-500 hover:bg-red-600 text-white rounded-lg">
                Login
              </Button>
            )}

            <button className="lg:hidden p-2.5" onClick={() => setMobileOpen(!mobileOpen)} data-testid="mobile-menu-toggle">
              {mobileOpen ? <X className="w-5 h-5"/> : <Menu className="w-5 h-5"/>}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="lg:hidden border-t border-[#262626] bg-[#0A0A0A]">
            <div className="px-6 py-4 flex flex-col gap-1">
              {navLinks.map((l) => (
                <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)}
                  className="px-3 py-2.5 text-sm text-neutral-300 hover:text-white hover:bg-white/5 rounded">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="min-h-[60vh]">{children}</main>

      <footer className="mt-32 bg-[#0A0A0A] border-t border-[#262626]">
        <div className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-700 grid place-items-center font-black">C</div>
              <span className="font-display text-2xl font-black">CarDost</span>
            </div>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Premium car audio, Android stereos & accessories. Engineered for drivers who demand more from every drive.
            </p>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-4">Shop</div>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li><Link to="/shop?category=android-stereos" className="hover:text-red-400">Android Stereos</Link></li>
              <li><Link to="/shop?category=speakers" className="hover:text-red-400">Speakers</Link></li>
              <li><Link to="/shop?category=amplifiers" className="hover:text-red-400">Amplifiers</Link></li>
              <li><Link to="/shop?category=dash-cameras" className="hover:text-red-400">Dash Cameras</Link></li>
              <li><Link to="/shop?category=led-lights" className="hover:text-red-400">LED Lights</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-4">Company</div>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li><Link to="/contact" className="hover:text-red-400">Contact</Link></li>
              <li><Link to="/shop" className="hover:text-red-400">All Products</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-4">Contact</div>
            <ul className="space-y-3 text-sm text-neutral-400">
              <li className="flex gap-2"><Phone className="w-4 h-4 text-red-500 shrink-0 mt-0.5"/>+91 90632 78724</li>
              <li className="flex gap-2"><Mail className="w-4 h-4 text-red-500 shrink-0 mt-0.5"/>Autobotscarstudio@gmail.com</li>
              <li className="flex gap-2"><MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5"/>India</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[#262626] px-6 py-6 text-xs text-neutral-500 text-center">
          © 2026 CarDost. All rights reserved. • Engineered with passion for car audio.
        </div>
      </footer>
    </div>
  );
}
