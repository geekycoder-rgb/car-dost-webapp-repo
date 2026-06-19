import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import { ArrowRight, Shield, Truck, Headphones, Award, Zap, Monitor, Speaker, Camera, Lightbulb, Sparkles, Wrench } from "lucide-react";

const ICON_MAP = { Monitor, Speaker, Zap, Camera, Lightbulb, Sparkles, Wrench };

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api.get("/products", { params: { featured: true } }).then((r) => setFeatured(r.data));
    api.get("/categories").then((r) => setCategories(r.data));
  }, []);

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-[#262626]">
        <div className="absolute inset-0 grid-pattern opacity-50"/>
        <div className="absolute right-0 top-0 w-1/2 h-full hidden lg:block">
          <img src="https://images.pexels.com/photos/9530906/pexels-photo-9530906.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=900" alt="Dashboard" className="w-full h-full object-cover opacity-60"/>
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#0A0A0A]/60 to-[#0A0A0A]"/>
        </div>
        <div className="relative max-w-7xl mx-auto px-6 py-20 lg:py-32 grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 animate-fade-up">
            <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs uppercase tracking-[0.2em] px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"/> New Arrivals 2026
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-7xl font-black tracking-tighter leading-[1.05]">
              Drive Loud.
              <br/>
              <span className="text-red-500">Drive Smart.</span>
            </h1>
            <p className="text-base lg:text-lg text-neutral-400 max-w-lg leading-relaxed">
              Premium Android car stereos, audiophile-grade speakers, and pro accessories — installed by experts, engineered for the road.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link to="/shop" data-testid="hero-shop-btn" className="group bg-red-500 hover:bg-red-600 text-white px-6 py-3.5 rounded-lg font-medium inline-flex items-center gap-2 transition">
                Shop All Products <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition"/>
              </Link>
              <Link to="/shop?category=android-stereos" data-testid="hero-stereos-btn" className="border border-[#262626] hover:border-white px-6 py-3.5 rounded-lg font-medium transition">
                Android Stereos
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-8 max-w-md">
              <div><div className="font-display text-2xl font-black text-red-500">15+</div><div className="text-[10px] uppercase tracking-wider text-neutral-500">Brands</div></div>
              <div><div className="font-display text-2xl font-black text-red-500">10K+</div><div className="text-[10px] uppercase tracking-wider text-neutral-500">Installs</div></div>
              <div><div className="font-display text-2xl font-black text-red-500">4.8★</div><div className="text-[10px] uppercase tracking-wider text-neutral-500">Rated</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="border-b border-[#262626]">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Truck, title: "Free Shipping", sub: "Across India" },
            { icon: Shield, title: "1-Year Warranty", sub: "On all products" },
            { icon: Headphones, title: "Expert Support", sub: "7 days a week" },
            { icon: Award, title: "Genuine Products", sub: "Authorized dealer" },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 grid place-items-center text-red-500"><f.icon className="w-5 h-5"/></div>
              <div>
                <div className="font-semibold text-sm">{f.title}</div>
                <div className="text-xs text-neutral-500">{f.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-red-500 mb-3">Browse</div>
            <h2 className="font-display text-3xl lg:text-5xl font-black tracking-tighter">Shop by Category</h2>
          </div>
          <Link to="/shop" className="hidden sm:flex items-center gap-2 text-sm text-neutral-400 hover:text-red-400">
            View all <ArrowRight className="w-4 h-4"/>
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((c) => {
            const Icon = ICON_MAP[c.icon] || Monitor;
            return (
              <Link key={c.slug} to={`/shop?category=${c.slug}`} data-testid={`cat-${c.slug}`}
                className="group bg-[#141414] border border-[#262626] hover:border-red-500/50 rounded-xl p-6 transition-all hover:-translate-y-1">
                <Icon className="w-8 h-8 text-red-500 mb-4 group-hover:scale-110 transition"/>
                <div className="font-display font-bold text-lg">{c.name}</div>
                <div className="text-xs text-neutral-500 mt-1 flex items-center gap-1 group-hover:text-red-400">
                  Explore <ArrowRight className="w-3 h-3"/>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* FEATURED */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-red-500 mb-3">Best Sellers</div>
            <h2 className="font-display text-3xl lg:text-5xl font-black tracking-tighter">Featured Products</h2>
          </div>
          <Link to="/shop" className="hidden sm:flex items-center gap-2 text-sm text-neutral-400 hover:text-red-400">
            View all <ArrowRight className="w-4 h-4"/>
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {featured.map((p) => <ProductCard key={p.id} product={p}/>)}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="relative overflow-hidden bg-gradient-to-br from-red-600 to-red-900 rounded-2xl p-10 lg:p-16">
          <div className="relative z-10 max-w-2xl">
            <div className="text-xs uppercase tracking-[0.3em] text-red-200 mb-3">Pro Installation</div>
            <h2 className="font-display text-3xl lg:text-5xl font-black tracking-tighter mb-4">Need it installed?</h2>
            <p className="text-red-100 text-base mb-6">Our certified team installs every product at our studio. Book a slot, drive in, drive out — sounding incredible.</p>
            <Link to="/contact" data-testid="cta-contact-btn" className="bg-black hover:bg-neutral-900 text-white px-6 py-3 rounded-lg font-medium inline-flex items-center gap-2">
              Book Installation <ArrowRight className="w-4 h-4"/>
            </Link>
          </div>
          <div className="absolute right-0 top-0 w-1/2 h-full opacity-30">
            <div className="absolute right-10 top-10 w-64 h-64 rounded-full bg-white blur-3xl"/>
          </div>
        </div>
      </section>
    </div>
  );
}
