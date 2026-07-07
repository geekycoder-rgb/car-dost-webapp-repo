import { Link } from "react-router-dom";
import { useEffect } from "react";
import { Award, Shield, Users, Wrench, Truck, Headphones, ChevronRight, Sparkles, Heart } from "lucide-react";

const VALUES = [
  { icon: Award, title: "Premium Quality", desc: "Only authorized stock from Sony, JBL, Pioneer, Magnetz and other top brands." },
  { icon: Wrench, title: "Pro Installation", desc: "Certified in-house technicians install every product at our studio." },
  { icon: Shield, title: "Brand Warranty", desc: "Full manufacturer warranty + our 1-year peace-of-mind coverage." },
  { icon: Truck, title: "Pan-India Shipping", desc: "Free same-day dispatch. Delivered to your doorstep in 2-7 days." },
  { icon: Headphones, title: "24/7 Sound Experts", desc: "Talk to actual audio engineers — not chatbots. Call or WhatsApp anytime." },
  { icon: Heart, title: "Customer-First", desc: "10,000+ happy drivers, 4.8★ average rating. We never settle." },
];

const TIMELINE = [
  { year: "2018", title: "Garage Beginnings", desc: "Started as a single-car audio workshop in Hyderabad, fixing factory stereos for friends." },
  { year: "2020", title: "First Storefront", desc: "Opened Autobots Car Studio — our flagship retail + installation center." },
  { year: "2023", title: "Going Online", desc: "Launched cardost.com to bring premium car audio to drivers across India." },
  { year: "2026", title: "10,000+ Cars Later", desc: "Trusted by thousands of car owners nationwide. Just getting started." },
];

export default function About() {
  useEffect(() => {
    const prev = document.title;
    document.title = "About CarDost — India's Premium Car Audio Studio";
    return () => { document.title = prev; };
  }, []);

  return (
    <div className="bg-white">
      <meta name="description" content="Learn the CarDost story — from a Hyderabad garage in 2018 to India's trusted car audio destination. Premium stereos, speakers & accessories with pro installation." />
      <link rel="canonical" href="https://cardost.in/about" />
      <meta property="og:type" content="website" />
      <meta property="og:title" content="About CarDost — India's Premium Car Audio Studio" />
      <meta property="og:description" content="Learn the CarDost story — from a Hyderabad garage in 2018 to India's trusted car audio destination. 10,000+ cars. Free shipping. Pro installation." />
      <meta property="og:url" content="https://cardost.in/about" />
      <meta name="twitter:card" content="summary_large_image" />
      {/* Hero */}
      <section className="relative mesh-indigo overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(https://images.pexels.com/photos/9530906/pexels-photo-9530906.jpeg?auto=compress&w=1920)", backgroundSize: "cover", backgroundPosition: "center", mixBlendMode: "luminosity" }}/>
        <div className="relative max-w-7xl mx-auto px-6 py-20 lg:py-28 text-white">
          <div className="inline-flex items-center gap-2 glass border border-white/20 text-white text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full mb-5">
            <Sparkles className="w-3 h-3 text-amber-300"/> Our Story
          </div>
          <h1 className="font-anton text-5xl sm:text-6xl lg:text-7xl uppercase leading-[0.95] mb-5 max-w-3xl">
            We make every drive <span className="text-amber-300">sound legendary.</span>
          </h1>
          <p className="text-base lg:text-lg text-white/80 max-w-2xl leading-relaxed">
            CarDost is India&apos;s premium car audio destination — built by audiophiles who believe your car deserves better than the factory speakers.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-xs uppercase tracking-[0.3em] text-indigo-600 font-bold mb-3">The Story</div>
        <h2 className="font-display text-3xl lg:text-4xl font-bold text-stone-950 mb-6">
          A garage. Two friends. <span className="text-indigo-600">One obsession with sound.</span>
        </h2>
        <div className="space-y-4 text-stone-700 leading-relaxed">
          <p>
            CarDost was born in 2018 from a simple frustration — every car we drove sounded flat. Stock audio systems are designed for the lowest common denominator, leaving thousands of drivers with mediocre sound experiences on their daily commute.
          </p>
          <p>
            What started as a single-car audio workshop in Hyderabad — Autobots Car Studio — quickly grew into a community of car audio enthusiasts. Word spread that we treated every customer&apos;s car like our own, with the same precision and care.
          </p>
          <p>
            In 2023, we launched <strong className="text-stone-950">cardost.com</strong> to make premium car audio accessible across India. Today, we&apos;ve installed audio systems in over 10,000 cars and counting — from compact hatchbacks to luxury SUVs. Every product on this store is hand-picked by our audio engineers and tested in real Indian driving conditions.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="bg-stone-50 border-y border-stone-200">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <div className="text-xs uppercase tracking-[0.3em] text-indigo-600 font-bold mb-3">What We Stand For</div>
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-stone-950">The CarDost <span className="text-indigo-600">promise</span></h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {VALUES.map((v, i) => (
              <div key={i} className="bg-white border border-stone-200 rounded-2xl p-6 hover:border-indigo-300 hover:shadow-md transition">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 grid place-items-center text-indigo-600 mb-4">
                  <v.icon className="w-6 h-6"/>
                </div>
                <h3 className="font-display text-lg font-bold text-stone-950 mb-1.5">{v.title}</h3>
                <p className="text-sm text-stone-600 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <div className="text-xs uppercase tracking-[0.3em] text-indigo-600 font-bold mb-3">Our Journey</div>
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-stone-950">From garage to <span className="text-indigo-600">nationwide</span></h2>
        </div>
        <div className="relative">
          <div className="absolute left-7 top-2 bottom-2 w-0.5 bg-stone-200"/>
          <div className="space-y-8">
            {TIMELINE.map((t, i) => (
              <div key={i} className="relative pl-20">
                <div className="absolute left-0 top-0 w-14 h-14 rounded-2xl bg-indigo-600 text-white grid place-items-center font-anton text-lg shadow-lg">
                  {t.year}
                </div>
                <h3 className="font-display text-xl font-bold text-stone-950 mb-1">{t.title}</h3>
                <p className="text-sm text-stone-600 leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-stone-950 text-white">
        <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
          {[
            { stat: "10,000+", label: "Cars Audio-Upgraded" },
            { stat: "15+", label: "Premium Brands" },
            { stat: "4.8★", label: "Average Rating" },
            { stat: "100%", label: "Verified Reviews" },
          ].map((s, i) => (
            <div key={i}>
              <div className="font-anton text-5xl lg:text-6xl text-indigo-400 mb-1">{s.stat}</div>
              <div className="text-xs uppercase tracking-[0.2em] text-stone-300">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-5">
        <Link to="/shop" className="relative overflow-hidden rounded-2xl mesh-stereo p-10 text-white group">
          <Sparkles className="w-8 h-8 text-amber-300 mb-3"/>
          <div className="font-anton text-3xl uppercase leading-tight mb-2">Shop the catalog</div>
          <p className="text-sm text-white/80 mb-5">From budget speakers to flagship Android stereos — find your perfect setup.</p>
          <div className="inline-flex items-center gap-2 bg-white text-stone-950 text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-full group-hover:translate-x-1 transition">Browse Products <ChevronRight className="w-4 h-4"/></div>
        </Link>
        <Link to="/contact" className="relative overflow-hidden rounded-2xl mesh-speakers p-10 text-white group">
          <Users className="w-8 h-8 text-pink-200 mb-3"/>
          <div className="font-anton text-3xl uppercase leading-tight mb-2">Talk to our team</div>
          <p className="text-sm text-white/80 mb-5">Get expert advice or book a professional installation slot at our studio.</p>
          <div className="inline-flex items-center gap-2 bg-white text-stone-950 text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-full group-hover:translate-x-1 transition">Contact Us <ChevronRight className="w-4 h-4"/></div>
        </Link>
      </section>
    </div>
  );
}
