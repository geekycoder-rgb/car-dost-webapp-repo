import { useState } from "react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Mail, MapPin } from "lucide-react";
import { toast } from "sonner";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/contact", form);
      toast.success("Message sent! We'll reach out soon.");
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch {
      toast.error("Failed to send");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <div className="text-xs uppercase tracking-[0.3em] text-red-500 mb-3">Get in Touch</div>
      <h1 className="font-display text-4xl lg:text-6xl font-black tracking-tighter mb-12">Contact Us</h1>
      <div className="grid lg:grid-cols-2 gap-12">
        <div className="space-y-6">
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 flex gap-4">
            <Phone className="w-6 h-6 text-red-500"/>
            <div>
              <div className="text-xs uppercase tracking-wider text-neutral-500 mb-1">Phone</div>
              <a href="tel:+919063278724" className="font-display text-xl font-bold hover:text-red-400">+91 90632 78724</a>
            </div>
          </div>
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 flex gap-4">
            <Mail className="w-6 h-6 text-red-500"/>
            <div>
              <div className="text-xs uppercase tracking-wider text-neutral-500 mb-1">Email</div>
              <a href="mailto:Autobotscarstudio@gmail.com" className="font-display text-base font-bold hover:text-red-400 break-all">Autobotscarstudio@gmail.com</a>
            </div>
          </div>
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 flex gap-4">
            <MapPin className="w-6 h-6 text-red-500"/>
            <div>
              <div className="text-xs uppercase tracking-wider text-neutral-500 mb-1">Studio</div>
              <div className="font-display text-base font-bold">Autobots Car Studio, India</div>
              <div className="text-sm text-neutral-400 mt-1">Open Mon–Sun, 10AM – 9PM</div>
            </div>
          </div>
        </div>
        <form onSubmit={submit} className="bg-[#141414] border border-[#262626] rounded-xl p-8 space-y-4">
          <h2 className="font-display text-2xl font-bold mb-2">Send a message</h2>
          <div><Label>Name</Label><Input data-testid="contact-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-[#0A0A0A] border-[#262626] mt-1"/></div>
          <div><Label>Email</Label><Input data-testid="contact-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-[#0A0A0A] border-[#262626] mt-1"/></div>
          <div><Label>Phone</Label><Input data-testid="contact-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-[#0A0A0A] border-[#262626] mt-1"/></div>
          <div><Label>Message</Label><Textarea data-testid="contact-message" required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="bg-[#0A0A0A] border-[#262626] mt-1"/></div>
          <Button data-testid="contact-submit" disabled={loading} type="submit" className="w-full bg-red-500 hover:bg-red-600 py-6">{loading ? "Sending..." : "Send Message"}</Button>
        </form>
      </div>
    </div>
  );
}
