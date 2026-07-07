import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Mail, MapPin, MessageCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const prev = document.title;
    document.title = "Contact CarDost — Car Audio Experts | +91 90632 78724";
    return () => { document.title = prev; };
  }, []);

  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await api.post("/contact", form); toast.success("Message sent! We'll reach out soon."); setForm({ name: "", email: "", phone: "", message: "" }); }
    catch { toast.error("Failed to send"); } finally { setLoading(false); }
  };

  return (
    <div className="bg-white">
      <meta name="description" content="Contact CarDost for expert car audio advice, installation bookings, and support. Call +91 90632 78724 or WhatsApp us. Open Mon–Sun, 10 AM – 9 PM." />
      <link rel="canonical" href="https://cardost.in/contact" />
      <meta property="og:type" content="website" />
      <meta property="og:title" content="Contact CarDost — Car Audio Experts | +91 90632 78724" />
      <meta property="og:description" content="Contact CarDost for expert car audio advice, installation bookings, and support. Call +91 90632 78724 or WhatsApp us. Open Mon–Sun, 10 AM – 9 PM." />
      <meta property="og:url" content="https://cardost.in/contact" />
      <meta name="twitter:card" content="summary" />
      <div className="bg-neutral-50 border-b border-neutral-200 py-10">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="text-xs uppercase tracking-[0.3em] text-indigo-600 font-bold mb-2">Get In Touch</div>
          <h1 className="font-display text-3xl lg:text-4xl font-bold uppercase">Contact Us</h1>
          <p className="text-sm text-neutral-500 mt-2 max-w-2xl mx-auto">Have questions about our products or installation? Our sound experts are here to help — 24/7.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-14 grid lg:grid-cols-2 gap-10">
        <div className="space-y-4">
          {[
            { icon: Phone, label: "Phone", value: "+91 90632 78724", href: "tel:+919063278724" },
            { icon: Mail, label: "Email", value: "support@cardost.in", href: "mailto:support@cardost.in" },
            { icon: MessageCircle, label: "WhatsApp", value: "Chat with us instantly", href: "https://wa.me/919063278724" },
            { icon: MapPin, label: "Studio", value: "Autobots Car Studio, India" },
            { icon: Clock, label: "Hours", value: "Mon – Sun · 10 AM – 9 PM" },
          ].map((c, i) => (
            <a key={i} href={c.href} target={c.href?.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
               className="bg-white border border-neutral-200 hover:border-indigo-500 rounded-md p-5 flex gap-4 transition group">
              <div className="w-11 h-11 rounded-full bg-indigo-50 grid place-items-center text-indigo-600 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition">
                <c.icon className="w-5 h-5"/>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.15em] text-neutral-500 font-bold mb-0.5">{c.label}</div>
                <div className="font-semibold text-sm text-neutral-900 group-hover:text-indigo-600">{c.value}</div>
              </div>
            </a>
          ))}
        </div>

        <form onSubmit={submit} className="bg-white border border-neutral-200 rounded-md p-8 space-y-4 h-fit">
          <h2 className="font-display text-xl font-bold uppercase mb-1">Send a Message</h2>
          <p className="text-xs text-neutral-500 mb-4">We typically reply within a few hours.</p>
          <div><Label className="text-xs uppercase font-bold text-neutral-700">Name *</Label><Input data-testid="contact-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border-neutral-300 mt-1.5"/></div>
          <div><Label className="text-xs uppercase font-bold text-neutral-700">Email *</Label><Input data-testid="contact-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border-neutral-300 mt-1.5"/></div>
          <div><Label className="text-xs uppercase font-bold text-neutral-700">Phone</Label><Input data-testid="contact-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="border-neutral-300 mt-1.5"/></div>
          <div><Label className="text-xs uppercase font-bold text-neutral-700">Message *</Label><Textarea data-testid="contact-message" required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="border-neutral-300 mt-1.5"/></div>
          <Button data-testid="contact-submit" disabled={loading} type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 py-6 font-bold uppercase tracking-wider text-xs">{loading ? "Sending..." : "Send Message"}</Button>
        </form>
      </div>
    </div>
  );
}
