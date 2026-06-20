import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import { ChevronLeft, ChevronRight, Truck, Shield, Headphones, Award, Package, RotateCcw, ChevronDown } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const HERO_SLIDES = [
  {
    title: "MEGA SOUND SALE",
    sub: "Up to 76% OFF on selected products",
    badge: "EXTRA 5-10% OFF on Prepaid",
    code: "SAVE5",
    cta: "Shop Now",
    link: "/shop",
    bg: "linear-gradient(135deg,#FFE4B5 0%, #FFB6C1 50%, #87CEEB 100%)",
    accent: "#E1141C",
    image: "https://images.pexels.com/photos/9530906/pexels-photo-9530906.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=720&w=1920",
  },
  {
    title: "ANDROID STEREOS",
    sub: "10\" Touchscreen · Carplay · GPS",
    badge: "Starting ₹7,499",
    code: "STEREO10",
    cta: "Explore Stereos",
    link: "/shop?category=android-stereos",
    bg: "linear-gradient(135deg,#1A1A1A 0%, #B30F16 100%)",
    accent: "#FFE100",
    image: "https://images.pexels.com/photos/4078064/pexels-photo-4078064.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=720&w=1920",
  },
  {
    title: "BASS LEGENDS",
    sub: "Sony · JBL · Pioneer · Magnetz",
    badge: "Free Shipping All India",
    code: "BASS500",
    cta: "Shop Speakers",
    link: "/shop?category=speakers",
    bg: "linear-gradient(135deg,#2E1065 0%, #DC2626 100%)",
    accent: "#FFFFFF",
    image: "https://images.unsplash.com/photo-1608538770329-65941f62f9f8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MTN8MHwxfHNlYXJjaHwxfHxjYXIlMjBhdWRpbyUyMHNwZWFrZXIlMjBtYWNyb3xlbnwwfHx8fDE3ODE4OTgwOTB8MA&ixlib=rb-4.1.0&q=85",
  },
];

const CATEGORY_TILES = [
  { slug: "android-stereos", name: "Android Stereos", image: "https://images.pexels.com/photos/4078064/pexels-photo-4078064.jpeg?auto=compress&w=400" },
  { slug: "speakers", name: "Speakers", image: "https://images.unsplash.com/photo-1608538770329-65941f62f9f8?crop=entropy&w=400&q=70" },
  { slug: "amplifiers", name: "Amplifiers", image: "https://images.pexels.com/photos/13811121/pexels-photo-13811121.jpeg?auto=compress&w=400" },
  { slug: "dash-cameras", name: "Dash Cameras", image: "https://images.unsplash.com/photo-1574649341254-c3cf3421df77?crop=entropy&w=400&q=70" },
  { slug: "led-lights", name: "LED Lights", image: "https://images.pexels.com/photos/14101380/pexels-photo-14101380.jpeg?auto=compress&w=400" },
  { slug: "perfumes", name: "Air Fresheners", image: "https://images.unsplash.com/photo-1778530207612-b46210636834?crop=entropy&w=400&q=70" },
  { slug: "accessories", name: "Accessories", image: "https://images.pexels.com/photos/2127613/pexels-photo-2127613.jpeg?auto=compress&w=400" },
];

const BRANDS = ["Sony", "JBL", "Pioneer", "Magnetz", "Autotek", "Xxygen", "RoadLink", "Bullsone"];

const FAQS = [
  { q: "Do you provide installation services?", a: "Yes! Our certified team installs every product at our studio in India. Book a slot via the Contact page; most installations are completed same-day." },
  { q: "What is the warranty on your products?", a: "All products come with a 1-year manufacturer warranty. Premium speakers and amplifiers carry an extended brand warranty depending on the manufacturer (Sony, JBL, Pioneer, etc.)." },
  { q: "Do you offer Cash On Delivery (COD)?", a: "Yes, COD is available across India for orders below ₹15,000. For larger orders, please use Razorpay (UPI, cards, net banking)." },
  { q: "What is your return policy?", a: "We offer easy 7-day returns on unused products. Damaged-in-transit items are replaced free of charge — just send us a photo within 48 hours of delivery." },
  { q: "How long does shipping take?", a: "Metro cities: 2-3 business days. Tier-2/3 cities: 4-7 business days. Same-day dispatch on orders placed before 4 PM IST." },
];

export default function Home() {
  const [newArrivals, setNewArrivals] = useState([]);
  const [stereos, setStereos] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    api.get("/products", { params: { featured: true } }).then((r) => setNewArrivals(r.data.slice(0, 8)));
    api.get("/products", { params: { category: "android-stereos" } }).then((r) => setStereos(r.data));
    api.get("/products", { params: { category: "speakers" } }).then((r) => setSpeakers(r.data));
  }, []);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % HERO_SLIDES.length), 6000);
    return () => clearInterval(t);
  }, []);

  const current = HERO_SLIDES[slide];

  return (
    <div className="bg-white">
      {/* HERO Carousel */}
      <section className="relative overflow-hidden">
        <div className="relative h-[280px] sm:h-[400px] lg:h-[520px]" style={{ background: current.bg }}>
          <div className="absolute inset-0 opacity-50" style={{ backgroundImage: `url(${current.image})`, backgroundSize: "cover", backgroundPosition: "center", mixBlendMode: "overlay" }}/>
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30"/>
          <div className="relative max-w-7xl mx-auto h-full px-6 flex items-center">
            <div className="space-y-3 sm:space-y-5 animate-fade-up text-white drop-shadow-lg">
              <div className="inline-block bg-red-600 text-white text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-sm">
                Limited Time
              </div>
              <h1 className="font-anton text-4xl sm:text-6xl lg:text-8xl leading-[0.95] uppercase">
                {current.title}
              </h1>
              <p className="font-display text-base sm:text-2xl lg:text-3xl font-medium" style={{ color: current.accent }}>{current.sub}</p>
              <div className="flex flex-wrap gap-3 items-center pt-2">
                <Link to={current.link} className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase text-xs sm:text-sm tracking-wider px-7 sm:px-10 py-3 sm:py-4 rounded-full transition shadow-xl">
                  {current.cta} →
                </Link>
                <div className="hidden sm:block border-2 border-dashed border-white/70 text-white px-4 py-2 rounded text-xs uppercase font-bold">
                  {current.badge} · CODE: <span className="text-yellow-300">{current.code}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Slider arrows */}
          <button onClick={() => setSlide((s) => (s - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)} aria-label="prev"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 grid place-items-center bg-white/80 hover:bg-white text-neutral-900 rounded-full transition shadow-lg">
            <ChevronLeft className="w-5 h-5"/>
          </button>
          <button onClick={() => setSlide((s) => (s + 1) % HERO_SLIDES.length)} aria-label="next"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 grid place-items-center bg-white/80 hover:bg-white text-neutral-900 rounded-full transition shadow-lg">
            <ChevronRight className="w-5 h-5"/>
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {HERO_SLIDES.map((_, i) => (
              <button key={i} onClick={() => setSlide(i)} className={`h-2 rounded-full transition-all ${i === slide ? "w-8 bg-red-600" : "w-2 bg-white/80"}`}/>
            ))}
          </div>
        </div>
      </section>

      {/* Feature strip */}
      <section className="bg-neutral-50 border-y border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Truck, title: "Free Shipping", sub: "Across India" },
            { icon: Shield, title: "1-Yr Warranty", sub: "On all products" },
            { icon: Headphones, title: "24/7 Support", sub: "Call us anytime" },
            { icon: RotateCcw, title: "Easy Returns", sub: "7-day return" },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-red-50 grid place-items-center text-red-600 shrink-0">
                <f.icon className="w-5 h-5"/>
              </div>
              <div>
                <div className="font-bold text-sm text-neutral-900">{f.title}</div>
                <div className="text-xs text-neutral-500">{f.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SHOP BY CATEGORY */}
      <section className="max-w-7xl mx-auto px-6 py-14">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-8 border-b border-neutral-200 pb-4">
          <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wider text-neutral-900">
            Shop By <span className="text-red-600">Category</span>
          </h2>
          <Link to="/shop" className="text-sm font-bold uppercase tracking-wider text-red-600 hover:underline">View All Categories →</Link>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          {CATEGORY_TILES.map((c) => (
            <Link key={c.slug} to={`/shop?category=${c.slug}`} data-testid={`cat-${c.slug}`} className="group text-center">
              <div className="relative aspect-square rounded-full overflow-hidden border-4 border-neutral-100 group-hover:border-red-600 transition mb-3 shadow-sm group-hover:shadow-lg">
                <img src={c.image} alt={c.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
              </div>
              <div className="text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-800 group-hover:text-red-600">{c.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* PROMO BANNERS - two side-by-side */}
      <section className="max-w-7xl mx-auto px-6 pb-14 grid md:grid-cols-2 gap-5">
        <Link to="/shop?category=android-stereos" className="relative overflow-hidden rounded-md h-48 lg:h-64 group" style={{ background: "linear-gradient(120deg,#1A1A1A,#B30F16)" }}>
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "url(https://images.pexels.com/photos/28984412/pexels-photo-28984412.jpeg?auto=compress&w=900)", backgroundSize: "cover", backgroundPosition: "right" }}/>
          <div className="relative h-full p-6 lg:p-8 flex flex-col justify-center text-white">
            <div className="text-xs uppercase tracking-[0.2em] text-yellow-300 mb-2">Best Sellers</div>
            <div className="font-anton text-3xl lg:text-5xl leading-none">PREMIUM STEREOS</div>
            <div className="text-sm mt-2 opacity-90">10&quot; Touchscreen · CarPlay · GPS</div>
            <div className="mt-4 inline-block w-fit bg-red-600 group-hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider px-5 py-2 rounded-full transition">Shop Now →</div>
          </div>
        </Link>
        <Link to="/shop?category=speakers" className="relative overflow-hidden rounded-md h-48 lg:h-64 group" style={{ background: "linear-gradient(120deg,#FFE5B4,#FFB6C1)" }}>
          <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1608538770329-65941f62f9f8?crop=entropy&w=900)", backgroundSize: "cover", backgroundPosition: "right" }}/>
          <div className="relative h-full p-6 lg:p-8 flex flex-col justify-center">
            <div className="text-xs uppercase tracking-[0.2em] text-red-600 font-bold mb-2">Massive Bass</div>
            <div className="font-anton text-3xl lg:text-5xl leading-none text-neutral-900">SPEAKERS & AMPS</div>
            <div className="text-sm mt-2 text-neutral-800 font-medium">Sony · JBL · Pioneer · Magnetz</div>
            <div className="mt-4 inline-block w-fit bg-red-600 group-hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider px-5 py-2 rounded-full transition">Shop Now →</div>
          </div>
        </Link>
      </section>

      {/* NEW ARRIVALS */}
      <section className="max-w-7xl mx-auto px-6 py-10 border-t border-neutral-200">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-8 pb-4 border-b border-neutral-200">
          <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wider text-neutral-900">
            New <span className="text-red-600">Arrivals</span>
          </h2>
          <Link to="/shop" className="text-sm font-bold uppercase tracking-wider text-red-600 hover:underline">View All →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {newArrivals.map((p) => <ProductCard key={p.id} product={p}/>)}
        </div>
      </section>

      {/* ANDROID STEREOS section */}
      {stereos.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-8 pb-4 border-b border-neutral-200">
            <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wider text-neutral-900">
              Android <span className="text-red-600">Stereos</span>
            </h2>
            <Link to="/shop?category=android-stereos" className="text-sm font-bold uppercase tracking-wider text-red-600 hover:underline">View All →</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {stereos.slice(0, 4).map((p) => <ProductCard key={p.id} product={p}/>)}
          </div>
        </section>
      )}

      {/* SPEAKERS section */}
      {speakers.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-8 pb-4 border-b border-neutral-200">
            <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wider text-neutral-900">
              Premium <span className="text-red-600">Speakers</span>
            </h2>
            <Link to="/shop?category=speakers" className="text-sm font-bold uppercase tracking-wider text-red-600 hover:underline">View All →</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {speakers.slice(0, 4).map((p) => <ProductCard key={p.id} product={p}/>)}
          </div>
        </section>
      )}

      {/* BRAND STRIP */}
      <section className="bg-neutral-50 border-y border-neutral-200 py-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-6">
            <div className="text-xs uppercase tracking-[0.3em] text-red-600 font-bold mb-2">Trusted Brands</div>
            <h2 className="font-display text-2xl font-bold uppercase">We Stock Only The Best</h2>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-6">
            {BRANDS.map((b) => (
              <div key={b} className="font-anton text-xl sm:text-2xl text-neutral-400 hover:text-red-600 transition cursor-pointer">{b.toUpperCase()}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT + STATS */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-red-600 font-bold mb-3">About CarDost</div>
            <h2 className="font-display text-3xl lg:text-4xl font-bold uppercase mb-4">India&apos;s Premium <span className="text-red-600">Car Audio Studio</span></h2>
            <p className="text-neutral-600 leading-relaxed mb-3 text-sm">
              CarDost has been established to deliver India&apos;s finest car audio and accessory shopping experience. Trusted by thousands of drivers across the country for premium quality, expert installation, and best prices guaranteed.
            </p>
            <p className="text-neutral-600 leading-relaxed text-sm">
              Every product on CarDost is hand-picked by our audio engineers — from flagship Android stereos with CarPlay to subwoofers that shake the streets. Drive Loud. Drive Smart.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { stat: "15+", label: "Top Brands" },
              { stat: "150+", label: "Categories" },
              { stat: "10,000+", label: "Happy Customers" },
              { stat: "100%", label: "Trusted Quality" },
            ].map((s, i) => (
              <div key={i} className="text-center p-6 bg-neutral-50 rounded-md border border-neutral-200">
                <div className="font-anton text-4xl text-red-600 mb-1">{s.stat}</div>
                <div className="text-xs uppercase tracking-wider font-bold text-neutral-700">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-neutral-50 border-y border-neutral-200">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <div className="text-center mb-10">
            <div className="text-xs uppercase tracking-[0.3em] text-red-600 font-bold mb-3">Help Center</div>
            <h2 className="font-display text-3xl lg:text-4xl font-bold uppercase">Frequently Asked Questions</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="bg-white border border-neutral-200 rounded-md px-5 [&[data-state=open]]:border-red-500">
                <AccordionTrigger data-testid={`faq-${i}`} className="text-left font-semibold text-sm hover:no-underline py-4 text-neutral-900">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-neutral-600 leading-relaxed pb-4">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Get In Touch CTA */}
      <section className="max-w-7xl mx-auto px-6 py-14 grid md:grid-cols-2 gap-5">
        <Link to="/contact" className="bg-[#1A1A1A] text-white p-8 rounded-md flex items-center gap-5 hover:bg-red-600 transition group">
          <Headphones className="w-10 h-10 text-red-500 group-hover:text-white shrink-0"/>
          <div>
            <div className="font-anton text-2xl uppercase">Get In Touch</div>
            <div className="text-xs text-neutral-400 group-hover:text-white mt-1">24/7 Support · Talk to a sound expert</div>
          </div>
        </Link>
        <Link to="/contact" className="bg-[#1A1A1A] text-white p-8 rounded-md flex items-center gap-5 hover:bg-red-600 transition group">
          <RotateCcw className="w-10 h-10 text-red-500 group-hover:text-white shrink-0"/>
          <div>
            <div className="font-anton text-2xl uppercase">Easy Return Policy</div>
            <div className="text-xs text-neutral-400 group-hover:text-white mt-1">7-day hassle-free returns</div>
          </div>
        </Link>
      </section>
    </div>
  );
}
