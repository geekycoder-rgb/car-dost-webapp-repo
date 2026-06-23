import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, HelpCircle, Package, CreditCard, Truck, RotateCcw, Wrench, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";

const FAQ_GROUPS = [
  {
    id: "orders",
    icon: Package,
    title: "Orders & Account",
    faqs: [
      { q: "How do I place an order on CarDost?", a: "Browse our catalog, add products to cart, and click Checkout. You can checkout as a guest or create an account to track orders and earn future loyalty rewards." },
      { q: "Can I cancel or modify my order after placing it?", a: "Yes — contact us within 2 hours of placing the order via WhatsApp or phone (+91 90632 78724). Once the order is shipped, modifications are not possible." },
      { q: "Do I need to create an account to buy?", a: "No. Guest checkout is fully supported. Creating an account lets you track orders, save addresses, and access exclusive deals." },
      { q: "I forgot my password — how do I reset it?", a: "On the login page, click 'Forgot Password' (coming soon) or email us at support@cardost.in and we'll reset it within an hour." },
    ],
  },
  {
    id: "payment",
    icon: CreditCard,
    title: "Payment & Pricing",
    faqs: [
      { q: "What payment methods do you accept?", a: "We accept all major payment methods via Razorpay — UPI (PhonePe, GPay, Paytm), credit/debit cards (Visa, Mastercard, Amex), net banking, and wallets. Cash on Delivery (COD) is available for orders under ₹15,000." },
      { q: "Is online payment safe on CarDost?", a: "Absolutely. All payments are processed through Razorpay with bank-grade SSL encryption. We never store your card details on our servers." },
      { q: "Do you offer EMI options?", a: "Yes! No-cost EMI is available on credit cards and debit cards (selected banks) for orders above ₹5,000. Choose EMI at the Razorpay checkout step." },
      { q: "When will I be charged?", a: "Payment is captured immediately upon order confirmation. For COD orders, you pay at the time of delivery." },
      { q: "Can I get an invoice for GST?", a: "Yes. A GST-compliant invoice is automatically emailed within 24 hours of dispatch. For business GSTIN, please email us your details before placing the order." },
    ],
  },
  {
    id: "shipping",
    icon: Truck,
    title: "Shipping & Delivery",
    faqs: [
      { q: "What are your shipping charges?", a: "Free shipping across India on all orders, no minimum required." },
      { q: "How long does delivery take?", a: "Metro cities (Mumbai, Delhi, Bangalore, Hyderabad, Chennai, Kolkata): 2-3 business days. Tier-2 cities: 3-5 days. Tier-3 / remote areas: 5-7 days. Same-day dispatch on orders placed before 4 PM IST." },
      { q: "How can I track my order?", a: "Once shipped, you'll receive an SMS and email with a tracking link. You can also log in to your account → My Orders → click the order to see live tracking status." },
      { q: "Do you ship outside India?", a: "Currently we only ship within India. International shipping is on our roadmap for 2026." },
      { q: "What if my product is damaged in transit?", a: "Send us a photo of the damaged product within 48 hours of delivery. We'll arrange a free replacement immediately — no questions asked." },
    ],
  },
  {
    id: "returns",
    icon: RotateCcw,
    title: "Returns & Refunds",
    faqs: [
      { q: "What is your return policy?", a: "We offer easy 7-day returns on unused, unopened products. Simply contact us via phone/WhatsApp/email and we'll arrange a free pickup." },
      { q: "Which products are non-returnable?", a: "Custom-fitted products (car body covers cut-to-size, custom-engraved key covers), products with broken seals, and installed products cannot be returned unless defective." },
      { q: "How long does a refund take?", a: "Once we receive and inspect the returned product, refunds are processed within 2 business days. Bank transfers reflect in 5-7 business days; UPI refunds are usually instant." },
      { q: "Will the refund cover the original shipping cost?", a: "Shipping was free, so the full product amount is refunded. There are no return-shipping charges either — we handle the reverse pickup." },
      { q: "Can I exchange for a different product?", a: "Yes! Exchanges are supported within 7 days. The price difference (if any) can be paid or refunded depending on the exchange." },
    ],
  },
  {
    id: "installation",
    icon: Wrench,
    title: "Installation",
    faqs: [
      { q: "Do you provide professional installation?", a: "Yes! Our certified team installs every product at our flagship studio. Book a slot via the Contact page or call +91 90632 78724." },
      { q: "How much does installation cost?", a: "Installation pricing varies by product. Speaker installation starts at ₹500, Android stereo installation at ₹1,500, full custom setups quoted on inspection. All installations come with a 30-day workmanship warranty." },
      { q: "Can I install the products myself?", a: "Many of our products are DIY-friendly with included instructions. However, for Android stereos, amplifiers, and subwoofer setups, we strongly recommend professional installation to avoid wiring damage." },
      { q: "How long does installation take?", a: "Speakers: 1-2 hours. Android stereo: 2-3 hours. Full sound system overhaul: 1 day. We provide a comfortable waiting area at our studio." },
      { q: "Do you provide installation outside Hyderabad?", a: "Currently in-house installation is only at our Hyderabad studio. For other cities, we can recommend partner installers — contact us for a referral." },
    ],
  },
  {
    id: "warranty",
    icon: Shield,
    title: "Warranty & Support",
    faqs: [
      { q: "What warranty do products come with?", a: "All products come with the original manufacturer's warranty (typically 1 year). Premium brands like Sony, JBL, Pioneer offer up to 2-year warranties on selected items." },
      { q: "What does the warranty cover?", a: "Manufacturing defects, electrical failures, and component issues are covered. Physical damage from misuse, water damage (for non-waterproof items), or unauthorized repairs voids the warranty." },
      { q: "How do I claim warranty?", a: "Contact our support team with your order ID and a video/photo of the issue. We coordinate with the brand on your behalf — you don't need to deal with the manufacturer directly." },
      { q: "Do you offer extended warranty?", a: "Extended warranty is available on stereos and amplifiers for an additional fee (typically 10-15% of product price). Add it at checkout or contact us within 30 days of purchase." },
      { q: "What if my warranty expires?", a: "Even after warranty expires, our service team can help with repairs at a nominal fee. We never abandon a customer — once a CarDost customer, always taken care of." },
    ],
  },
];

export default function FAQ() {
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();

  const filteredGroups = FAQ_GROUPS.map((g) => ({
    ...g,
    faqs: q ? g.faqs.filter((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)) : g.faqs,
  })).filter((g) => g.faqs.length > 0);

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-b from-stone-50 to-white border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full mb-4">
            <HelpCircle className="w-3 h-3"/> Help Center
          </div>
          <h1 className="font-display text-3xl lg:text-5xl font-bold text-stone-950 mb-3">
            How can we <span className="text-indigo-600">help you?</span>
          </h1>
          <p className="text-sm text-stone-600 mb-7">Browse common questions or use the search below.</p>
          <div className="relative max-w-lg mx-auto">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"/>
            <Input
              data-testid="faq-search"
              placeholder="Search FAQs (e.g. 'return', 'installation', 'EMI')..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 h-12 border-stone-300 focus:border-indigo-500 rounded-full text-sm"
            />
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-14">
        {filteredGroups.length === 0 ? (
          <div className="text-center py-16 text-stone-500">
            No FAQs match your search. Try a different keyword or <Link to="/contact" className="text-indigo-600 font-bold hover:underline">contact us</Link>.
          </div>
        ) : (
          <div className="space-y-10">
            {filteredGroups.map((g) => (
              <div key={g.id} data-testid={`faq-group-${g.id}`}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 grid place-items-center text-indigo-600">
                    <g.icon className="w-5 h-5"/>
                  </div>
                  <h2 className="font-display text-xl lg:text-2xl font-bold text-stone-950">{g.title}</h2>
                  <span className="text-xs text-stone-500 ml-1">({g.faqs.length})</span>
                </div>
                <Accordion type="single" collapsible className="space-y-2.5">
                  {g.faqs.map((f, i) => (
                    <AccordionItem key={i} value={`${g.id}-${i}`} className="bg-white border border-stone-200 rounded-2xl px-5 [&[data-state=open]]:border-indigo-400 [&[data-state=open]]:shadow-sm">
                      <AccordionTrigger data-testid={`faq-${g.id}-${i}`} className="text-left font-semibold text-sm hover:no-underline py-4 text-stone-950">{f.q}</AccordionTrigger>
                      <AccordionContent className="text-sm text-stone-600 leading-relaxed pb-4">{f.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        )}

        {/* Still need help */}
        <div className="mt-16 rounded-2xl mesh-indigo p-10 text-center text-white">
          <div className="font-anton text-3xl uppercase mb-2">Still have questions?</div>
          <p className="text-sm text-white/80 mb-5">Our sound experts are just a call or message away.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/contact" className="bg-white text-stone-950 text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-full">Contact Us</Link>
            <a href="https://wa.me/919063278724" target="_blank" rel="noopener noreferrer" className="bg-green-500 hover:bg-green-600 text-white text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-full transition">WhatsApp Us</a>
          </div>
        </div>
      </div>
    </div>
  );
}
