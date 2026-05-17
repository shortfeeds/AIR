"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { api } from "@/lib/api";
import { 
  Phone, Loader2, Globe, Database, Layout, Clock, 
  Settings, Server, Save, Plus, Trash2, HelpCircle
} from "lucide-react";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"ai" | "routing" | "business">("ai");
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
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [primaryServices, setPrimaryServices] = useState("");
  const [aiGoal, setAiGoal] = useState("answer_faqs");
  const [faqs, setFaqs] = useState<any[]>([]);
  const [avgLeadValue, setAvgLeadValue] = useState(1000);
  const [logoUrl, setLogoUrl] = useState("");
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState("");
  const [gstin, setGstin] = useState("");
  const [crmType, setCrmType] = useState("none");
  const [crmWebhookUrl, setCrmWebhookUrl] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api("/settings")
  });

  useEffect(() => {
    if (data?.settings) {
      setTransferNumber(data.settings.transfer_number || "");
      setTransferMode(data.settings.transfer_mode || "on_request");
      setLanguage(data.settings.knowledge?.language || "English");
      setBookingLink(data.settings.knowledge?.booking_link || "");
      setWebsiteUrl(data.settings.website_url || "");
      setPrimaryServices(data.settings.knowledge?.primary_services || "");
      setAiGoal(data.settings.knowledge?.ai_goal || "answer_faqs");
      setFaqs(data.settings.knowledge?.top_faqs || []);
      setAvgLeadValue(data.settings.avg_lead_value || 1000);
      setLogoUrl(data.settings.logo_url || "");
      setN8nWebhookUrl(data.settings.n8n_webhook_url || "");
      setGstin(data.settings.gstin || "");
      setBusinessName(data.settings.business_name || "");
      setCrmType(data.settings.crm_type || "none");
      setCrmWebhookUrl(data.settings.crm_webhook_url || "");
      if (data.settings.operating_hours) {
        setHours(data.settings.operating_hours);
      }
    }
  }, [data]);

  const saveField = async (field: string, endpoint: string, body: any) => {
    setSaving(field);
    try {
      await api(endpoint, { method: "PATCH", body: JSON.stringify(body) });
      toast.success("Settings updated successfully!");
    } catch (e: any) { 
      toast.error(e.message || "Failed to update settings");
    } finally { 
      setSaving(null); 
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
          <p className="text-xs font-bold uppercase tracking-widest opacity-40">Loading Configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Workspace & AI Configuration</h1>
          <p className="text-xs opacity-50 mt-1">Configure your business details, agent profiles, routing policies, and integrations.</p>
        </div>
      </div>

      {/* Tabs Controller */}
      <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 max-w-md">
        <button 
          onClick={() => setActiveTab("ai")} 
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold tracking-wide transition-all ${activeTab === "ai" ? "bg-indigo-600 text-white shadow-lg" : "text-white/40 hover:text-white/70"}`}
        >
          <Globe className="w-3.5 h-3.5" /> AI Assistant
        </button>
        <button 
          onClick={() => setActiveTab("routing")} 
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold tracking-wide transition-all ${activeTab === "routing" ? "bg-indigo-600 text-white shadow-lg" : "text-white/40 hover:text-white/70"}`}
        >
          <Phone className="w-3.5 h-3.5" /> Routing & Hours
        </button>
        <button 
          onClick={() => setActiveTab("business")} 
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold tracking-wide transition-all ${activeTab === "business" ? "bg-indigo-600 text-white shadow-lg" : "text-white/40 hover:text-white/70"}`}
        >
          <Layout className="w-3.5 h-3.5" /> Integrations
        </button>
      </div>

      {/* Tab Contents */}
      <div className="space-y-6">
        {activeTab === "ai" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* AI Core Settings */}
            <div className="md:col-span-2 space-y-6">
              <div className="card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-extrabold text-white text-sm tracking-wide">AI Knowledge Base</h3>
                    <p className="text-[10px] opacity-40 mt-0.5">Define facts and instructions for your voice receptionist.</p>
                  </div>
                  <button 
                    onClick={() => saveField("ai_kb", "/settings/ai", { language, booking_link: bookingLink, primary_services: primaryServices, ai_goal: aiGoal, top_faqs: faqs, website_url: websiteUrl })} 
                    className="btn-primary text-xs py-2 px-4 flex items-center gap-2 rounded-lg"
                    disabled={saving === "ai_kb"}
                  >
                    {saving === "ai_kb" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Config
                  </button>
                </div>

                <div className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1.5 block">AI Main Directive</label>
                      <select value={aiGoal} onChange={(e) => setAiGoal(e.target.value)} className="input-field">
                        <option value="answer_faqs">General Info & FAQs</option>
                        <option value="book_appointment">Appointment Booking</option>
                        <option value="qualify_leads">Lead Qualification</option>
                        <option value="take_message">Message Taking Only</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1.5 block">Language Voice Output</label>
                      <select value={language} onChange={(e) => setLanguage(e.target.value)} className="input-field">
                        <option value="English">English (IN)</option>
                        <option value="Hindi">Hindi (IN)</option>
                        <option value="Hinglish">Hinglish (IN)</option>
                        <option value="Tamil">Tamil (IN)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1.5 block">Business Website URL (Optional)</label>
                      <input 
                        type="url"
                        value={websiteUrl} 
                        onChange={(e) => setWebsiteUrl(e.target.value)} 
                        className="input-field" 
                        placeholder="e.g. https://mybusiness.com" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1.5 block">Booking Link (Calendly etc.)</label>
                      <input 
                        value={bookingLink} 
                        onChange={(e) => setBookingLink(e.target.value)} 
                        className="input-field" 
                        placeholder="e.g. https://calendly.com/your-business" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1.5 block">Business Overview & Prompt Prompt Context</label>
                    <textarea 
                      value={primaryServices} 
                      onChange={(e) => setPrimaryServices(e.target.value)} 
                      className="input-field min-h-[140px] text-xs leading-relaxed" 
                      placeholder="e.g., We are a boutique dental practice offering orthodontic consultations, dynamic implants, scaling, and general health check-ups. Standard consultations are ₹1,200." 
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic FAQs */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-extrabold text-white text-sm tracking-wide">FAQ Database</h3>
                    <p className="text-[10px] opacity-40 mt-0.5">Define structured questions your agent should handle</p>
                  </div>
                  <button 
                    onClick={() => setFaqs([...faqs, { q: "", a: "" }])} 
                    className="text-[10px] font-black uppercase tracking-wider bg-white/5 border border-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all"
                  >
                    <Plus className="w-3 h-3" /> Add FAQ
                  </button>
                </div>

                <div className="space-y-4">
                  {faqs.length === 0 ? (
                    <div className="text-center py-8 rounded-xl border border-dashed border-white/5 opacity-40">
                      <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">No custom FAQ prompts created yet.</p>
                    </div>
                  ) : (
                    faqs.map((faq, idx) => (
                      <div key={idx} className="bg-white/5 p-4 rounded-xl border border-white/5 relative group transition-all hover:border-white/10">
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <input 
                            value={faq.q} 
                            onChange={(e) => { const n = [...faqs]; n[idx].q = e.target.value; setFaqs(n); }}
                            placeholder="If caller asks..." 
                            className="bg-transparent border-none outline-none text-xs font-extrabold text-white placeholder:opacity-20 w-full" 
                          />
                          <button 
                            onClick={() => setFaqs(faqs.filter((_, i) => i !== idx))} 
                            className="text-rose-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <textarea 
                          value={faq.a} 
                          onChange={(e) => { const n = [...faqs]; n[idx].a = e.target.value; setFaqs(n); }}
                          placeholder="AI agent should reply with..." 
                          className="bg-transparent border-none outline-none text-xs w-full opacity-60 placeholder:opacity-20 resize-none leading-relaxed"
                          rows={2}
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Quick info card */}
            <div className="space-y-6">
              <div className="bg-indigo-950/20 p-5 rounded-2xl border border-indigo-500/10">
                <Settings className="w-6 h-6 text-indigo-400 mb-3" />
                <h4 className="font-bold text-white text-xs tracking-wider uppercase mb-1">Instant Synchrony</h4>
                <p className="text-[11px] text-white/50 leading-relaxed">
                  Whenever you update your website URL, appointment slots, or directive prompts, our voice agent updates its cognitive schemas immediately. All subsequent telephone sessions will use the revised profile data context instantly.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "routing" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Escalation Rules */}
            <div className="md:col-span-2 space-y-6">
              <div className="card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-extrabold text-white text-sm tracking-wide">Call Escalation & Transfers</h3>
                    <p className="text-[10px] opacity-40 mt-0.5">Rules for routing live callers to human agents</p>
                  </div>
                  <button 
                    onClick={() => saveField("transfer", "/settings/transfer", { transfer_number: transferNumber, transfer_mode: transferMode })} 
                    className="btn-primary text-xs py-2 px-4 flex items-center gap-2 rounded-lg"
                    disabled={saving === "transfer"}
                  >
                    {saving === "transfer" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Rules
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1.5 block">Transfer Number (International E.164 Format)</label>
                    <input 
                      type="tel" 
                      value={transferNumber} 
                      onChange={(e) => setTransferNumber(e.target.value)} 
                      className="input-field" 
                      placeholder="e.g. +919876543210" 
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2.5 block">Transfer Policy</label>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {[
                        { id: "on_request", label: "Transfer On-Request", desc: "Only routes if caller requests help" },
                        { id: "all_calls", label: "Always Transfer", desc: "Forwards all active sessions after details" }
                      ].map((policy) => (
                        <div 
                          key={policy.id} 
                          onClick={() => setTransferMode(policy.id)} 
                          className={`p-4 rounded-xl border cursor-pointer transition-all ${transferMode === policy.id ? "bg-indigo-600/10 border-indigo-500" : "bg-white/5 border-white/5 hover:border-white/10"}`}
                        >
                          <div className="flex items-center gap-2">
                            <input 
                              type="radio" 
                              name="transfer_policy" 
                              checked={transferMode === policy.id} 
                              onChange={() => {}}
                              className="accent-indigo-500 cursor-pointer" 
                            />
                            <span className="text-xs font-bold text-white">{policy.label}</span>
                          </div>
                          <p className="text-[10px] opacity-40 mt-1 leading-normal pl-5">{policy.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Operating Hours */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-extrabold text-white text-sm tracking-wide">Operational Hours</h3>
                    <p className="text-[10px] opacity-40 mt-0.5">Set availability rules for automated script handling</p>
                  </div>
                  <button 
                    onClick={() => saveField("hours", "/settings/hours", { operating_hours: hours })} 
                    className="btn-secondary text-[10px] py-1.5 px-3 flex items-center gap-1.5"
                    disabled={saving === "hours"}
                  >
                    {saving === "hours" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Save Hours
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {DAYS.map((day) => (
                    <div key={day} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          checked={!hours[day]?.closed} 
                          onChange={(e) => setHours({...hours, [day]: {...hours[day], closed: !e.target.checked}})} 
                          className="accent-indigo-500 rounded cursor-pointer"
                        />
                        <span className="text-xs font-bold text-white">{day}</span>
                      </div>
                      
                      {!hours[day]?.closed ? (
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="time" 
                            value={hours[day]?.open} 
                            onChange={(e) => setHours({...hours, [day]: {...hours[day], open: e.target.value}})} 
                            className="bg-black/30 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white" 
                          />
                          <span className="text-[10px] opacity-30">to</span>
                          <input 
                            type="time" 
                            value={hours[day]?.close} 
                            onChange={(e) => setHours({...hours, [day]: {...hours[day], close: e.target.value}})} 
                            className="bg-black/30 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white" 
                          />
                        </div>
                      ) : (
                        <span className="text-[10px] text-rose-500 font-bold bg-rose-500/10 px-2 py-0.5 rounded">Closed</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Operating info */}
            <div className="space-y-6">
              <div className="bg-amber-950/20 p-5 rounded-2xl border border-amber-500/10">
                <Clock className="w-6 h-6 text-amber-400 mb-3" />
                <h4 className="font-bold text-white text-xs tracking-wider uppercase mb-1">Hours Enforcement</h4>
                <p className="text-[11px] text-white/50 leading-relaxed">
                  Callers ringing outside these operating hours are politely informed about office timings and are logged directly to the Intelligence inbox. Escalation requests outside active hours will be handled based on your priority rules.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "business" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Integrations & Profiles */}
            <div className="md:col-span-2 space-y-6">
              {/* Business Data Profile */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-extrabold text-white text-sm tracking-wide">Business & Brand Setup</h3>
                    <p className="text-[10px] opacity-40 mt-0.5">Corporate branding information used in reports and invoices</p>
                  </div>
                  <button 
                    onClick={() => saveField("brand", "/settings/brand", { business_name: businessName, avg_lead_value: avgLeadValue, logo_url: logoUrl, n8n_webhook_url: n8nWebhookUrl, gstin })} 
                    className="btn-primary text-xs py-2 px-4 flex items-center gap-2 rounded-lg"
                    disabled={saving === "brand"}
                  >
                    {saving === "brand" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Brand
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1.5 block">Business Name</label>
                    <input 
                      value={businessName} 
                      onChange={(e) => setBusinessName(e.target.value)} 
                      className="input-field" 
                      placeholder="e.g. My Dentist Clinic" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1.5 block">GSTIN Identifier (Optional)</label>
                    <input 
                      value={gstin} 
                      onChange={(e) => setGstin(e.target.value)} 
                      className="input-field" 
                      placeholder="e.g. 27AAAAA1111A1Z1" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1.5 block">Avg Lead Value (₹)</label>
                    <input 
                      type="number" 
                      value={avgLeadValue} 
                      onChange={(e) => setAvgLeadValue(parseInt(e.target.value) || 0)} 
                      className="input-field" 
                      placeholder="1000" 
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1.5 block">Brand Logo URL</label>
                    <input 
                      value={logoUrl} 
                      onChange={(e) => setLogoUrl(e.target.value)} 
                      className="input-field" 
                      placeholder="https://example.com/logo.png" 
                    />
                  </div>
                </div>
              </div>

              {/* n8n Notifications */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-extrabold text-white text-sm tracking-wide">Real-time Webhook Dispatcher</h3>
                    <p className="text-[10px] opacity-40 mt-0.5">Stream completed receptionist logs directly to custom platforms</p>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1.5 block">Webhook URL</label>
                  <input 
                    value={n8nWebhookUrl} 
                    onChange={(e) => setN8nWebhookUrl(e.target.value)} 
                    className="input-field mb-4" 
                    placeholder="e.g., https://primary-n8n.workflow.xyz/webhook/leads" 
                  />
                  <p className="text-[10px] text-white/40 leading-normal mb-1.5">
                    We will instantly trigger a POST request to this endpoint immediately after each call completes, transmitting caller metrics, full transcriptions, and scheduled slot metadata.
                  </p>
                </div>
              </div>

              {/* CRM Settings */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-extrabold text-white text-sm tracking-wide">CRM Synchronization</h3>
                    <p className="text-[10px] opacity-40 mt-0.5">Automatically register collected pipeline details into CRM platforms</p>
                  </div>
                  <button 
                    onClick={() => saveField("crm", "/settings/crm", { crm_type: crmType, crm_webhook_url: crmWebhookUrl })} 
                    className="btn-secondary text-xs px-3 py-1.5"
                    disabled={saving === "crm"}
                  >
                    {saving === "crm" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Save CRM
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1.5 block">CRM Service Provider</label>
                    <select value={crmType} onChange={(e) => setCrmType(e.target.value)} className="input-field">
                      <option value="none">No External CRM (Dashboard Only)</option>
                      <option value="zoho">Zoho CRM</option>
                      <option value="hubspot">HubSpot</option>
                      <option value="custom">Custom Webhook Integration</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1.5 block">Integration URL / API endpoint</label>
                    <input 
                      value={crmWebhookUrl} 
                      onChange={(e) => setCrmWebhookUrl(e.target.value)} 
                      className="input-field" 
                      placeholder="https://..." 
                      disabled={crmType === "none"} 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Integration info */}
            <div className="space-y-6">
              <div className="bg-emerald-950/20 p-5 rounded-2xl border border-emerald-500/10">
                <Server className="w-6 h-6 text-emerald-400 mb-3" />
                <h4 className="font-bold text-white text-xs tracking-wider uppercase mb-1">CRM Sync Pipeline</h4>
                <p className="text-[11px] text-white/50 leading-relaxed">
                  Connect your CRM endpoints. Whenever our agent schedules a new booking, registers client queries, or qualifies pipeline entries, we immediately invoke webhook dispatches to populate your Zoho or HubSpot contacts automatically.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
