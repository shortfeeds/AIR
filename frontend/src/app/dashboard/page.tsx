"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Phone, CheckCircle, ArrowRight, Copy, Check, Volume2, Clock, Users, Activity, PhoneCall, PhoneIncoming } from "lucide-react";

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
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      {/* Welcome & AI Number Card */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-8 flex flex-col justify-center relative overflow-hidden" style={{ background: "linear-gradient(135deg, var(--bg-card) 0%, rgba(99,102,241,0.05) 100%)" }}>
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
            <Activity size={160} />
          </div>
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Welcome back, {user?.name?.split(" ")[0] || "User"}!</h2>
            <p className="text-sm max-w-md" style={{ color: "var(--text-muted)" }}>Your AI receptionist is actively monitoring your lines. Here is your dedicated business routing number:</p>
            <div className="mt-8 flex items-center gap-4">
              <div className="bg-black/40 border border-white/10 px-6 py-4 rounded-2xl flex items-center gap-4 backdrop-blur-sm">
                <Phone className="w-5 h-5 text-indigo-400" />
                <span className="text-2xl font-mono font-bold tracking-widest text-white">{user?.plivo_number || "Assigning..."}</span>
                <button onClick={copyNumber} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors ml-2" title="Copy Number">
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/60" />}
                </button>
              </div>
              <div className="flex flex-col">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold text-emerald-400">Online & Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-8 flex flex-col justify-between relative overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(34,197,94,0.02) 100%)", borderColor: "rgba(34,197,94,0.2)" }}>
          <div className="absolute -bottom-4 -right-4 opacity-10 text-green-500 pointer-events-none">
            <Activity size={120} />
          </div>
          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-widest mb-2 text-green-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Revenue Recovered
            </p>
            <p className="text-5xl font-black text-white mt-4">₹{(stats?.total_revenue_saved || 0).toLocaleString("en-IN")}</p>
          </div>
          <div className="pt-4 mt-4 border-t border-green-500/20 relative z-10">
            <div className="flex items-center justify-between text-xs">
              <span className="text-green-400/60 font-medium">Value of Captured Leads</span>
              <span className="font-bold text-green-400 px-2 py-1 bg-green-500/10 rounded-full">ROI Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Mini Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-6 flex flex-col items-center justify-center text-center group hover:bg-white/[0.02] transition-colors">
          <PhoneCall className="w-5 h-5 mb-3 text-indigo-400 group-hover:scale-110 transition-transform" />
          <p className="text-3xl font-black text-white mb-1">{stats?.calls_today || 0}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Calls Today</p>
        </div>
        
        <div className="card p-6 flex flex-col items-center justify-center text-center group hover:bg-white/[0.02] transition-colors relative overflow-hidden">
          <Clock className="w-5 h-5 mb-3 text-amber-400 group-hover:scale-110 transition-transform" />
          <p className="text-3xl font-black text-white mb-1">{stats?.minutes_today || 0}<span className="text-lg opacity-50">m</span></p>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Talk Time Used</p>
          <div className="absolute bottom-0 left-0 w-full p-1.5 bg-amber-500/10 border-t border-amber-500/20">
            <p className="text-[8px] font-bold text-amber-500 uppercase flex items-center justify-center gap-1">
              <PhoneIncoming className="w-2 h-2" /> Includes In & Outbound
            </p>
          </div>
        </div>

        <div className="card p-6 flex flex-col items-center justify-center text-center group hover:bg-white/[0.02] transition-colors">
          <Users className="w-5 h-5 mb-3 text-emerald-400 group-hover:scale-110 transition-transform" />
          <p className="text-3xl font-black text-white mb-1">{stats?.total_new_leads || 0}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">New Leads</p>
        </div>

        <div className="card p-6 flex flex-col items-center justify-center text-center group hover:bg-white/[0.02] transition-colors">
          <CheckCircle className="w-5 h-5 mb-3 text-blue-400 group-hover:scale-110 transition-transform" />
          <p className="text-3xl font-black text-white mb-1">{stats?.followed_up_today || 0}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Followed Up</p>
        </div>
      </div>

      {/* Leads Inbox */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>Recent AI Calls</h3>
            {leads.length > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 opacity-50 uppercase tracking-widest font-bold">Latest {leads.length}</span>}
          </div>
          <a href="#/dashboard/calls" className="text-[10px] font-bold hover:text-indigo-400 transition-colors uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>View All History</a>
        </div>
        
        <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
          {leads.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <Phone className="w-12 h-12 text-white/5 mb-4" />
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>No calls processed yet.</p>
              <p className="text-xs mt-2 max-w-sm opacity-50">Once your AI receptionist handles incoming or outgoing calls, the records, transcripts, and recordings will appear here automatically.</p>
            </div>
          ) : leads.map((lead) => (
            <div key={lead.id} className={`transition-all ${expandedId === lead.id ? "bg-white/[0.02]" : "hover:bg-white/[0.01]"}`}>
              <div className="p-4 sm:p-6 cursor-pointer flex items-center justify-between" onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}>
                <div className="flex items-center gap-4 min-w-[200px]">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${lead.status === "new" ? "bg-indigo-500 animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.5)]" : "bg-white/10"}`} />
                  <div>
                    <p className="font-bold text-sm tracking-wide text-white">{lead.caller_number}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mt-1 opacity-40">{new Date(lead.call_timestamp).toLocaleString("en-IN", { dateStyle: 'medium', timeStyle: 'short' })}</p>
                  </div>
                </div>
                
                <div className="hidden sm:block flex-1 mx-8 max-w-xl">
                  <div className="bg-black/20 rounded-lg px-4 py-2 border border-white/5">
                    <p className="text-xs truncate opacity-70 italic font-medium">&quot;{lead.ai_summary || "Call completed without summary."}&quot;</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 min-w-[120px] justify-end">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-white">{Math.floor(lead.call_duration_seconds / 60)}m {lead.call_duration_seconds % 60}s</span>
                    <span className="text-[10px] uppercase font-bold tracking-widest opacity-30 mt-0.5">Duration</span>
                  </div>
                  <ArrowRight className={`w-4 h-4 transition-transform text-white/30 ${expandedId === lead.id ? "rotate-90 text-white" : ""}`} />
                </div>
              </div>
              
              {expandedId === lead.id && (
                <div className="px-6 pb-6 pt-2 animate-slide-down">
                  <div className="grid lg:grid-cols-12 gap-6 bg-black/40 rounded-2xl p-6 border border-white/5">
                    <div className="lg:col-span-5 space-y-6">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2 flex items-center gap-2"><Activity className="w-3 h-3" /> AI Summary</p>
                        <p className="text-sm leading-relaxed font-medium text-white/80 bg-white/5 p-4 rounded-xl border border-white/5">{lead.ai_summary || "No summary available."}</p>
                      </div>
                      
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2">System Action</p>
                          <span className="badge badge-success px-3 py-1.5 text-[10px]">{lead.action_taken || "Information Provided"}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2">Lead Status</p>
                          <span className="badge px-3 py-1.5 text-[10px] capitalize bg-white/10 border-white/10">{lead.status.replace("_", " ")}</span>
                        </div>
                      </div>
                      
                      {lead.recording_url && (
                        <div className="pt-2">
                          <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-3 flex items-center gap-2">
                            <Volume2 className="w-3 h-3" /> Call Recording
                          </p>
                          <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                            <audio controls className="w-full h-8 custom-audio-player opacity-80 hover:opacity-100 transition-opacity">
                              <source src={lead.recording_url} type="audio/mpeg" />
                              Your browser does not support the audio element.
                            </audio>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="lg:col-span-7">
                      <div className="h-full bg-black/50 rounded-xl p-5 border border-white/5 flex flex-col">
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-4 flex items-center gap-2">
                          <Phone className="w-3 h-3" /> Raw Call Transcript
                        </p>
                        <div className="flex-1 text-xs font-mono space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar opacity-70 leading-relaxed whitespace-pre-wrap">
                          {lead.transcript_raw || "No transcript recorded for this call."}
                        </div>
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
