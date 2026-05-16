"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Phone, CheckCircle, Loader2, Layout, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminOnboarding() {
  const [queue, setQueue] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [plivoNumber, setPlivoNumber] = useState("");
  const [scrapingId, setScrapingId] = useState<string | null>(null);
  const [applyingTemplateId, setApplyingTemplateId] = useState<string | null>(null);
  const [scrapeUrls, setScrapeUrls] = useState<Record<string, string>>({});
  const [selectedTemplates, setSelectedTemplates] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [queueRes, templatesRes] = await Promise.all([
        api("/admin/onboarding"),
        api("/admin/templates")
      ]);
      setQueue(queueRes.queue);
      setTemplates(templatesRes.templates);
    } catch (e) {
      console.error(e);
      toast.error("Failed to fetch onboarding data");
    }
  };

  const activateClient = async (clientId: string) => {
    if (!plivoNumber) return;
    setAssigningId(clientId);
    try {
      await api(`/admin/clients/${clientId}/assign-number`, { 
        method: "POST", 
        body: JSON.stringify({ plivo_number: plivoNumber }) 
      });
      setQueue(queue.filter(q => q.id !== clientId));
      setPlivoNumber("");
      toast.success("Client activated and number assigned");
    } catch (e) { 
      console.error(e);
      toast.error("Failed to activate client");
    }
    finally { setAssigningId(null); }
  };

  const autoConfigureClient = async (clientId: string) => {
    const url = scrapeUrls[clientId];
    if (!url) return;
    setScrapingId(clientId);
    try {
      await api(`/admin/clients/${clientId}/auto-configure`, { 
        method: "POST", 
        body: JSON.stringify({ url }) 
      });
      toast.success("Client auto-configured from website");
      fetchData();
      setScrapeUrls({ ...scrapeUrls, [clientId]: "" });
    } catch (e) { 
      console.error(e);
      toast.error("Scraping failed");
    }
    finally { setScrapingId(null); }
  };

  const applyIndustryTemplate = async (clientId: string) => {
    const templateId = selectedTemplates[clientId];
    if (!templateId) return;
    setApplyingTemplateId(clientId);
    try {
      await api(`/admin/clients/${clientId}/apply-template`, {
        method: "POST",
        body: JSON.stringify({ templateId })
      });
      toast.success("Industry template applied");
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error("Failed to apply template");
    } finally {
      setApplyingTemplateId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Onboarding Queue</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{queue.length} clients awaiting setup</p>
      </div>

      {queue.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--success)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>All caught up! No pending onboarding requests.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map((client) => (
            <div key={client.id} className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>{client.name}</h3>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{client.email} · Signed up {new Date(client.created_at).toLocaleDateString("en-IN")}</p>
                </div>
                <span className="badge badge-warning">Pending</span>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 text-sm">
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Business</p>
                  <p style={{ color: "var(--text-primary)" }}>{client.business_name || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>City</p>
                  <p style={{ color: "var(--text-primary)" }}>{client.city || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Transfer Number</p>
                  <p style={{ color: "var(--text-primary)" }}>{client.transfer_number || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>AI Goal</p>
                  <p className="capitalize" style={{ color: "var(--text-primary)" }}>{client.ai_goal?.replace("_", " ") || "—"}</p>
                </div>
              </div>

              {client.primary_services && (
                <div className="mb-4">
                  <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Services</p>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{client.primary_services}</p>
                </div>
              )}

              <div className="grid lg:grid-cols-2 gap-4 mb-6 pt-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
                {/* Auto-Scrape */}
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Option 1: Auto-Scrape Website</p>
                  <div className="flex gap-2">
                    <input 
                      value={scrapeUrls[client.id] || ""} 
                      onChange={(e) => setScrapeUrls({...scrapeUrls, [client.id]: e.target.value})} 
                      className="input-field text-sm flex-1 h-10" 
                      placeholder="e.g. clinic.com" 
                    />
                    <button 
                      onClick={() => autoConfigureClient(client.id)} 
                      disabled={scrapingId === client.id || !scrapeUrls[client.id]} 
                      className="btn-secondary h-10 px-4 flex items-center gap-2 whitespace-nowrap"
                    >
                      {scrapingId === client.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" /> Scrape</>}
                    </button>
                  </div>
                </div>

                {/* Industry Template */}
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Option 2: Apply Template</p>
                  <div className="flex gap-2">
                    <select 
                      className="input-field text-sm flex-1 h-10"
                      value={selectedTemplates[client.id] || ""}
                      onChange={(e) => setSelectedTemplates({...selectedTemplates, [client.id]: e.target.value})}
                    >
                      <option value="">Select an industry...</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <button 
                      onClick={() => applyIndustryTemplate(client.id)}
                      disabled={applyingTemplateId === client.id || !selectedTemplates[client.id]}
                      className="btn-secondary h-10 px-4 flex items-center gap-2 whitespace-nowrap"
                    >
                      {applyingTemplateId === client.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Layout className="w-4 h-4" /> Apply</>}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 items-center pt-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                  <input value={assigningId === client.id ? plivoNumber : ""} onChange={(e) => { setAssigningId(client.id); setPlivoNumber(e.target.value); }} className="input-field pl-10 h-10 text-sm" placeholder="Enter Plivo number to assign..." />
                </div>
                <button onClick={() => activateClient(client.id)} disabled={assigningId === client.id && !plivoNumber} className="btn-primary h-10 px-6 flex items-center gap-2">
                  {assigningId === client.id && !plivoNumber ? <Loader2 className="w-4 h-4 animate-spin" /> : "Activate & Go Live"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

