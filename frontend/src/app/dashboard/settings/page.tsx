"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Phone, Save, Loader2, CheckCircle, Send } from "lucide-react";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

export default function SettingsPage() {
  const [transferNumber, setTransferNumber] = useState("+91 98765 43210");
  const [transferMode, setTransferMode] = useState("on_request");
  const [hours, setHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>({
    Monday: { open: "09:00", close: "18:00", closed: false },
    Tuesday: { open: "09:00", close: "18:00", closed: false },
    Wednesday: { open: "09:00", close: "18:00", closed: false },
    Thursday: { open: "09:00", close: "18:00", closed: false },
    Friday: { open: "09:00", close: "18:00", closed: false },
    Saturday: { open: "10:00", close: "14:00", closed: false },
    Sunday: { open: "09:00", close: "18:00", closed: true },
  });
  const [language, setLanguage] = useState("English");
  const [bookingLink, setBookingLink] = useState("");
  const [updateNotes, setUpdateNotes] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    api("/settings").then((data) => {
      setTransferNumber(data.settings.transfer_number || "");
      setTransferMode(data.settings.transfer_mode || "on_request");
      setLanguage(data.settings.knowledge?.language || "English");
      setBookingLink(data.settings.knowledge?.booking_link || "");
      const h: Record<string, any> = {};
      DAYS.forEach(d => {
        const dayData = data.settings.operating_hours?.[d];
        h[d] = dayData || { open: "09:00", close: "18:00", closed: false };
      });
      setHours(h);
    }).catch(console.error);
  }, []);

  const saveField = async (field: string, endpoint: string, body: any) => {
    setSaving(field);
    try {
      await api(endpoint, { method: "PATCH", body: JSON.stringify(body) });
      setSaved(field);
      setTimeout(() => setSaved(null), 2000);
    } catch (e) { console.error(e); }
    finally { setSaving(null); }
  };

  const submitKnowledgeUpdate = async () => {
    if (!updateNotes.trim()) return;
    setSaving("knowledge");
    try {
      await api("/settings/knowledge-update", { method: "POST", body: JSON.stringify({ update_notes: updateNotes }) });
      setSaved("knowledge");
      setUpdateNotes("");
      setTimeout(() => setSaved(null), 3000);
    } catch (e) { console.error(e); }
    finally { setSaving(null); }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Settings</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Manage your AI receptionist configuration</p>
      </div>

      {/* Transfer Number */}
      <div className="card p-6">
        <h3 className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Transfer Number</h3>
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>The number your AI will transfer urgent callers to</p>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <input type="tel" value={transferNumber} onChange={(e) => setTransferNumber(e.target.value)} className="input-field pl-10" placeholder="+91 98765 43210" />
          </div>
          <select value={transferMode} onChange={(e) => setTransferMode(e.target.value)} className="input-field w-48">
            <option value="on_request">On request only</option>
            <option value="all_calls">Transfer all calls</option>
          </select>
          <button onClick={() => saveField("transfer", "/settings/transfer", { transfer_number: transferNumber, transfer_mode: transferMode })} className="btn-primary flex items-center gap-2 text-sm" disabled={saving === "transfer"}>
            {saving === "transfer" ? <Loader2 className="w-4 h-4 animate-spin" /> : saved === "transfer" ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* AI Configuration */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>AI Configuration</h3>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Customize how your AI speaks and handles bookings</p>
          </div>
          <button onClick={() => saveField("ai", "/settings/ai", { language, booking_link: bookingLink })} className="btn-secondary text-sm flex items-center gap-2" disabled={saving === "ai"}>
            {saving === "ai" ? <Loader2 className="w-4 h-4 animate-spin" /> : saved === "ai" ? <><CheckCircle className="w-4 h-4" /> Saved</> : <><Save className="w-4 h-4" /> Save AI Settings</>}
          </button>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest opacity-40 mb-2 block">AI Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="input-field">
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Hinglish">Hinglish (Hindi + English)</option>
              <option value="Tamil">Tamil</option>
              <option value="Telugu">Telugu</option>
              <option value="Kannada">Kannada</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest opacity-40 mb-2 block">Booking Link (Calendly/Other)</label>
            <input value={bookingLink} onChange={(e) => setBookingLink(e.target.value)} className="input-field" placeholder="https://calendly.com/your-business" />
          </div>
        </div>
      </div>

      {/* Operating Hours */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Operating Hours</h3>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Outside these hours, your AI will take messages</p>
          </div>
          <button onClick={() => saveField("hours", "/settings/hours", { operating_hours: hours })} className="btn-secondary text-sm flex items-center gap-2" disabled={saving === "hours"}>
            {saving === "hours" ? <Loader2 className="w-4 h-4 animate-spin" /> : saved === "hours" ? <><CheckCircle className="w-4 h-4" /> Saved</> : <><Save className="w-4 h-4" /> Save Hours</>}
          </button>
        </div>
        <div className="space-y-3">
          {DAYS.map((day) => (
            <div key={day} className="flex items-center gap-3">
              <span className="w-24 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{day}</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!hours[day]?.closed} onChange={(e) => setHours({ ...hours, [day]: { ...hours[day], closed: !e.target.checked } })} className="accent-[var(--brand-500)]" />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{hours[day]?.closed ? "Closed" : "Open"}</span>
              </label>
              {!hours[day]?.closed && (
                <>
                  <input type="time" value={hours[day]?.open || "09:00"} onChange={(e) => setHours({ ...hours, [day]: { ...hours[day], open: e.target.value } })} className="input-field !w-28 text-sm !py-1.5" />
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>to</span>
                  <input type="time" value={hours[day]?.close || "18:00"} onChange={(e) => setHours({ ...hours, [day]: { ...hours[day], close: e.target.value } })} className="input-field !w-28 text-sm !py-1.5" />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Update AI Knowledge */}
      <div className="card p-6">
        <h3 className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Update AI Knowledge</h3>
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>Tell us what you&apos;d like to change about your AI — we&apos;ll update it within a few hours</p>
        <textarea value={updateNotes} onChange={(e) => setUpdateNotes(e.target.value)} className="input-field min-h-[120px] resize-y mb-3" placeholder="e.g. We have a Diwali sale — 20% off all services until Nov 15..." />
        {saved === "knowledge" ? (
          <div className="p-3 rounded-lg text-sm" style={{ background: "rgba(34,197,94,0.1)", color: "var(--success)" }}>
            ✅ Thanks! We&apos;ll update your AI within a few hours.
          </div>
        ) : (
          <button onClick={submitKnowledgeUpdate} disabled={saving === "knowledge" || !updateNotes.trim()} className="btn-primary flex items-center gap-2 text-sm">
            {saving === "knowledge" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Submit Update Request
          </button>
        )}
      </div>
    </div>
  );
}
