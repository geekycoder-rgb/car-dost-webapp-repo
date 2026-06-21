import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Mail, Phone, User, Trash2, CheckCircle2, Circle, Inbox } from "lucide-react";
import { toast } from "sonner";

export default function AdminMessages() {
  const [msgs, setMsgs] = useState([]);
  const [filter, setFilter] = useState("all");

  const load = () => {
    const params = filter === "unread" ? { unread: true } : {};
    api.get("/admin/messages", { params }).then((r) => setMsgs(r.data));
  };
  useEffect(() => { load(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleRead = async (m) => {
    await api.put(`/admin/messages/${m.id}`, { is_read: !m.is_read });
    load();
  };
  const remove = async (m) => {
    if (!window.confirm("Delete this message?")) return;
    await api.delete(`/admin/messages/${m.id}`);
    toast.success("Deleted");
    load();
  };

  const unreadCount = msgs.filter((m) => !m.is_read).length;

  return (
    <div className="bg-white border border-stone-200 rounded-md p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display text-base font-bold uppercase flex items-center gap-2"><Inbox className="w-5 h-5 text-indigo-600"/> Contact Messages</h2>
          <div className="text-[10px] text-stone-500">Customer enquiries from the contact form on /contact</div>
        </div>
        <div className="flex gap-1 bg-stone-100 rounded-full p-1">
          {["all", "unread"].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
                    data-testid={`msg-filter-${f}`}
                    className={`px-3 py-1.5 text-[11px] uppercase font-bold tracking-wider rounded-full transition ${filter === f ? "bg-white shadow text-indigo-600" : "text-stone-500 hover:text-stone-800"}`}>
              {f === "all" ? `All (${msgs.length})` : `Unread (${unreadCount})`}
            </button>
          ))}
        </div>
      </div>

      {msgs.length === 0 ? (
        <div className="text-center py-12 text-stone-500">
          <Mail className="w-10 h-10 mx-auto mb-3 text-stone-300"/>
          <div className="text-sm">{filter === "unread" ? "No unread messages — all caught up!" : "No messages yet. Customers can reach you via /contact."}</div>
        </div>
      ) : (
        <div className="space-y-3">
          {msgs.map((m) => (
            <div key={m.id} data-testid={`msg-${m.id}`} className={`border rounded-xl overflow-hidden transition ${m.is_read ? "bg-white border-stone-200" : "bg-indigo-50/40 border-indigo-200"}`}>
              <div className="px-4 py-3 flex flex-wrap items-center gap-3 border-b border-stone-100">
                <button onClick={() => toggleRead(m)} title={m.is_read ? "Mark as unread" : "Mark as read"} className="shrink-0">
                  {m.is_read ? <CheckCircle2 className="w-4 h-4 text-emerald-500"/> : <Circle className="w-4 h-4 text-indigo-500 fill-current"/>}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap text-sm">
                    <span className="font-bold">{m.name || "Anonymous"}</span>
                    {!m.is_read && <span className="text-[10px] uppercase tracking-wider bg-indigo-600 text-white px-1.5 py-0.5 rounded font-bold">NEW</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-stone-600 mt-0.5">
                    {m.email && (
                      <a href={`mailto:${m.email}`} className="flex items-center gap-1 hover:text-indigo-600">
                        <Mail className="w-3 h-3"/> {m.email}
                      </a>
                    )}
                    {m.phone && (
                      <a href={`tel:${m.phone}`} className="flex items-center gap-1 hover:text-indigo-600">
                        <Phone className="w-3 h-3"/> {m.phone}
                      </a>
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-stone-500">{new Date(m.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                <button onClick={() => remove(m)} className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded transition" aria-label="Delete">
                  <Trash2 className="w-3.5 h-3.5"/>
                </button>
              </div>
              <div className="px-4 py-3 text-sm text-stone-700 whitespace-pre-wrap leading-relaxed bg-stone-50/50">
                {m.message}
              </div>
              {m.email && (
                <a href={`mailto:${m.email}?subject=Re:%20Your%20enquiry%20to%20CarDost&body=${encodeURIComponent("Hi " + (m.name || "") + ",\n\nThanks for reaching out to CarDost...\n\n--- Your message ---\n" + (m.message || ""))}`}
                   className="block px-4 py-2 border-t border-stone-200 bg-white hover:bg-indigo-50 text-[11px] uppercase tracking-wider font-bold text-indigo-600">
                  Reply via email →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
