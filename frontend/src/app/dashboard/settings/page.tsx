"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Phone, Loader2, CheckCircle, Globe, Database, Layout, Clock } from "lucide-react";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

export default function SettingsPage() {
  const [transferNumber, setTransferNumber] = useState("");
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
  const [primaryServices, setPrimaryServices] = useState("");
  const [aiGoal, setAiGoal] = useState("answer_faqs");
  const [faqs, setFaqs] = useState<any[]>([]);
  const [avgLeadValue, setAvgLeadValue] = useState(1000);
  const [logoUrl, setLogoUrl] = useState("");
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState("");
  const [gstin, setGstin] = useState("");
  const [crmType, setCrmType] = useState("none");
  const [crmWebhookUrl, setCrmWebhookUrl] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    api("/settings").then((data) => {
      setTransferNumber(data.settings.transfer_number || "");
      setTransferMode(data.settings.transfer_mode || "on_request");
      setLanguage(data.settings.knowledge?.language || "English");
      setBookingLink(data.settings.knowledge?.booking_link || "");
      setPrimaryServices(data.settings.knowledge?.primary_services || "");
      setAiGoal(data.settings.knowledge?.ai_goal || "answer_faqs");
      setFaqs(data.settings.knowledge?.top_faqs || []);
      setAvgLeadValue(data.settings.avg_lead_value || 1000);
      setLogoUrl(data.settings.logo_url || "");
      setN8nWebhookUrl(data.settings.n8n_webhook_url || "");
      setGstin(data.settings.gstin || "");
      setCrmType(data.settings.crm_type || "none");
      setCrmWebhookUrl(data.settings.crm_webhook_url || "");
      if (data.settings.operating_hours) {
        setHours(data.settings.operating_hours);
      }
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

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings & Preferences</h1>
        <p className="text-sm opacity-50 mt-1">Configure your AI receptionist and business integrations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* AI Intelligence Editor */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-400" /> AI Intelligence Editor
              </h3>
              <button 
                onClick={() => saveField("ai_kb", "/settings/ai", { language, booking_link: bookingLink, primary_services: primaryServices, ai_goal: aiGoal, top_faqs: faqs })} 
                className="btn-primary text-xs flex items-center gap-2" 
                disabled={saving === "ai_kb"}
              >
                {saving === "ai_kb" ? <Loader2 className="w-3 h-3 animate-spin" /> : saved === "ai_kb" ? "Trained!" : "Update AI Brain"}
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2 block">Primary AI Goal</label>
                  <select value={aiGoal} onChange={(e) => setAiGoal(e.target.value)} className="input-field">
                    <option value="answer_faqs">General Info & FAQs</option>
                    <option value="book_appointment">Appointment Booking</option>
                    <option value="qualify_leads">Lead Qualification</option>
                    <option value="take_message">Message Taking Only</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2 block">AI Language</label>
                  <select value={language} onChange={(e) => setLanguage(e.target.value)} className="input-field">
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Hinglish">Hinglish</option>
                    <option value="Tamil">Tamil</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2 block">Business & Services Overview</label>
                <textarea 
                  value={primaryServices} 
                  onChange={(e) => setPrimaryServices(e.target.value)} 
                  className="input-field min-h-[120px] text-sm leading-relaxed" 
                  placeholder="Describe your business, services, and pricing in detail..." 
                />
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Dynamic FAQs</label>
                  <button onClick={() => setFaqs([...faqs, { q: "", a: "" }])} className="text-[10px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 px-3 py-1 rounded">
                    + Add Question
                  </button>
                </div>
                <div className="space-y-4">
                  {faqs.map((faq, idx) => (
                    <div key={idx} className="bg-black/20 p-4 rounded-xl border border-white/5 relative group">
                      <input 
                        value={faq.q} 
                        onChange={(e) => { const n = [...faqs]; n[idx].q = e.target.value; setFaqs(n); }}
                        placeholder="Caller asks..." 
                        className="bg-transparent border-none outline-none text-xs font-bold w-full text-white placeholder:opacity-20 mb-2" 
                      />
                      <textarea 
                        value={faq.a} 
                        onChange={(e) => { const n = [...faqs]; n[idx].a = e.target.value; setFaqs(n); }}
                        placeholder="AI should respond with..." 
                        className="bg-transparent border-none outline-none text-xs w-full opacity-60 placeholder:opacity-20 resize-none"
                        rows={2}
                      />
                      <button onClick={() => setFaqs(faqs.filter((_, i) => i !== idx))} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-rose-500">
                        <CheckCircle className="w-4 h-4 rotate-45" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CRM & Integrations */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" /> CRM Integrations
              </h3>
              <button onClick={() => saveField("crm", "/settings/crm", { crm_type: crmType, crm_webhook_url: crmWebhookUrl })} className="btn-secondary text-xs" disabled={saving === "crm"}>
                {saving === "crm" ? <Loader2 className="w-3 h-3 animate-spin" /> : saved === "crm" ? "Synced" : "Save Integration"}
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2 block">Provider</label>
                <select value={crmType} onChange={(e) => setCrmType(e.target.value)} className="input-field">
                  <option value="none">No CRM (Dashboard Only)</option>
                  <option value="zoho">Zoho CRM</option>
                  <option value="hubspot">HubSpot</option>
                  <option value="custom">Custom Webhook</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2 block">Endpoint URL</label>
                <input value={crmWebhookUrl} onChange={(e) => setCrmWebhookUrl(e.target.value)} className="input-field" placeholder="https://..." disabled={crmType === "none"} />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Transfer & Booking */}
          <div className="card p-6">
            <h3 className="font-bold text-white mb-6 flex items-center gap-2">
              <Phone className="w-4 h-4 text-amber-400" /> Escalation
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2 block">Transfer Number</label>
                <input type="tel" value={transferNumber} onChange={(e) => setTransferNumber(e.target.value)} className="input-field" placeholder="+91..." />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2 block">Booking Link</label>
                <input value={bookingLink} onChange={(e) => setBookingLink(e.target.value)} className="input-field" placeholder="Calendly/Booking URL" />
              </div>
              <button onClick={() => saveField("transfer", "/settings/transfer", { transfer_number: transferNumber, transfer_mode: transferMode })} className="w-full btn-secondary text-xs py-2 mt-2">
                Save Changes
              </button>
            </div>
          </div>

          {/* Operating Hours */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" /> Office Hours
              </h3>
              <button onClick={() => saveField("hours", "/settings/hours", { operating_hours: hours })} className="text-[10px] font-black uppercase text-indigo-400 hover:text-white">Save</button>
            </div>
            <div className="space-y-3">
              {DAYS.map((day) => (
                <div key={day} className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white/60">{day.slice(0,3)}</span>
                  <div className="flex items-center gap-2">
                    <input type="time" value={hours[day]?.open} onChange={(e) => setHours({...hours, [day]: {...hours[day], open: e.target.value}})} className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white" />
                    <span className="text-[10px] opacity-20">-</span>
                    <input type="time" value={hours[day]?.close} onChange={(e) => setHours({...hours, [day]: {...hours[day], close: e.target.value}})} className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Business Profile */}
          <div className="card p-6">
            <h3 className="font-bold text-white mb-6 flex items-center gap-2">
              <Layout className="w-4 h-4 text-emerald-400" /> Business Profile
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2 block">GSTIN (Optional)</label>
                <input value={gstin} onChange={(e) => setGstin(e.target.value)} className="input-field" placeholder="Tax ID" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2 block">Notifications Webhook</label>
                <input value={n8nWebhookUrl} onChange={(e) => setN8nWebhookUrl(e.target.value)} className="input-field" placeholder="n8n/Webhook URL" />
              </div>
              <button onClick={() => saveField("brand", "/settings/brand", { avg_lead_value: avgLeadValue, logo_url: logoUrl, n8n_webhook_url: n8nWebhookUrl, gstin })} className="w-full btn-secondary text-xs py-2 mt-2">
                Save Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
