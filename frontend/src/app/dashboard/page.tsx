"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Phone, Calendar, CheckCircle, ArrowRight, Copy, Check, Volume2 } from "lucide-react";

interface Lead {
  id: string;
  caller_number: string;
  call_duration_seconds: number;
  ai_summary: string;
  call_timestamp: string;
  status: string;
  transcript_raw: string;
  action_taken: string;
  recording_url?: string;
}

interface Stats {
  calls_today: string;
  minutes_today: number;
  followed_up_today: string;
  total_new_leads: string;
  total_leads: string;
  total_revenue_saved: number;
}

export default function DashboardOverview() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [user, setUser] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      api("/leads?limit=20"),
      api("/leads/stats"),
      api("/auth/me"),
    ]).then(([leadsData, statsData, userData]) => {
      setLeads(leadsData.leads);
      setStats(statsData.stats);
      setUser(userData.user);
    }).catch(console.error);
  }, []);

  const copyNumber = () => {
    if (!user?.plivo_number) return;
    navigator.clipboard.writeText(user.plivo_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome & AI Number Card */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-8 flex flex-col justify-center" style={{ background: "linear-gradient(135deg, var(--bg-card) 0%, rgba(99,102,241,0.05) 100%)" }}>
          <h2 className="text-3xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Welcome back, {user?.name?.split(" ")[0]}!</h2>
          <p className="text-sm max-w-md" style={{ color: "var(--text-muted)" }}>Your AI receptionist is active and handling calls. Here is your dedicated business number:</p>
          <div className="mt-6 flex items-center gap-4">
            <div className="bg-black/20 border border-white/5 px-6 py-3 rounded-2xl flex items-center gap-4">
              <span className="text-xl font-mono font-bold tracking-wider" style={{ color: "var(--brand-400)" }}>{user?.plivo_number || "Assigning..."}</span>
              <button onClick={copyNumber} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/40" />}
              </button>
            </div>
            <p className="text-xs font-medium uppercase tracking-widest opacity-50">Dedicated AI Line</p>
          </div>
        </div>

        <div className="card p-6 flex flex-col justify-between" style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(34,197,94,0.02) 100%)", borderColor: "rgba(34,197,94,0.2)" }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1 text-green-400">Revenue Recovered</p>
            <p className="text-4xl font-bold text-white">₹{(stats?.total_revenue_saved || 0).toLocaleString("en-IN")}</p>
          </div>
          <div className="pt-4 border-t border-green-500/20">
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-400/60">Estimated Value</span>
              <span className="font-bold text-green-400">ROI: 12x</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Mini Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Calls Today", value: stats?.calls_today || 0, icon: Phone },
          { label: "Minutes Used", value: `${stats?.minutes_today || 0}m`, icon: Clock },
          { label: "Appointments", value: "8", icon: Calendar }, // Mocked for now
          { label: "Follow-ups", value: stats?.followed_up_today || 0, icon: CheckCircle },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <s.icon className="w-4 h-4 mb-2 opacity-50" />
            <p className="text-xl font-bold">{s.value}</p>
            <p className="text-xs opacity-50">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Leads Inbox */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: "var(--border-subtle)" }}>
          <h3 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>Leads Inbox</h3>
          <button className="text-xs font-semibold hover:opacity-70 transition-opacity uppercase tracking-widest" style={{ color: "var(--brand-400)" }}>View All Leads</button>
        </div>
        <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
          {leads.length === 0 ? (
            <div className="p-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>No calls received yet.</div>
          ) : leads.map((lead) => (
            <div key={lead.id} className={`transition-all ${expandedId === lead.id ? "bg-white/[0.02]" : "hover:bg-white/[0.01]"}`}>
              <div className="p-4 sm:p-6 cursor-pointer flex items-center justify-between" onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}>
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${lead.status === "new" ? "bg-indigo-500 animate-pulse" : "bg-white/10"}`} />
                  <div>
                    <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{lead.caller_number}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{new Date(lead.call_timestamp).toLocaleString("en-IN")}</p>
                  </div>
                </div>
                <div className="hidden sm:block flex-1 mx-12">
                  <p className="text-sm truncate opacity-70 italic">&quot;{lead.ai_summary}&quot;</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-mono opacity-50">{Math.floor(lead.call_duration_seconds / 60)}m {lead.call_duration_seconds % 60}s</span>
                  <ArrowRight className={`w-4 h-4 transition-transform ${expandedId === lead.id ? "rotate-90" : "opacity-20"}`} />
                </div>
              </div>
              {expandedId === lead.id && (
                <div className="px-6 pb-6 pt-2 animate-slide-down">
                  <div className="grid lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2">AI Summary</p>
                        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{lead.ai_summary}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2">Action Taken</p>
                        <span className="badge badge-success text-[10px]">{lead.action_taken || "Information Provided"}</span>
                      </div>
                      {lead.recording_url && (
                        <div className="pt-4 border-t border-white/5">
                          <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-3 flex items-center gap-2">
                            <Volume2 className="w-3 h-3" /> Call Recording
                          </p>
                          <audio controls className="w-full h-8 custom-audio-player">
                            <source src={lead.recording_url} type="audio/mpeg" />
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                      )}
                    </div>
                    <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-3">Call Transcript</p>
                      <div className="text-xs font-mono space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar opacity-80 leading-relaxed whitespace-pre-wrap">
                        {lead.transcript_raw}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Clock(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
