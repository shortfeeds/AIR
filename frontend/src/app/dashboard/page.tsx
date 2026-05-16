"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { 
  Phone, CheckCircle, ArrowRight, Copy, Check, Volume2, Clock, 
  Users, Activity, PhoneCall, PhoneIncoming, Download, Filter,
  TrendingUp, Zap, AlertCircle, RefreshCw
} from "lucide-react";

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
  lead_score?: number;
  sentiment?: string;
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState("all");
  const [isExporting, setIsExporting] = useState(false);

  const { data: userRes } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => api("/auth/me")
  });

  const { data: leadsData, isLoading: isLoadingLeads, refetch } = useQuery({
    queryKey: ['leads', 'limit50'],
    queryFn: () => api("/leads?limit=50")
  });

  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['leads', 'stats'],
    queryFn: () => api("/leads/stats")
  });

  const user = userRes?.user;
  const leads = leadsData?.leads || [];
  const stats = statsData?.stats;
  const loading = isLoadingLeads || isLoadingStats;

  const fetchData = () => {
    refetch();
  };

  const copyNumber = () => {
    if (!user?.plivo_number) return;
    navigator.clipboard.writeText(user.plivo_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportLeads = () => {
    setIsExporting(true);
    const headers = ["Date", "Caller", "Duration", "Sentiment", "Score", "Summary"];
    const rows = leads.map(l => [
      new Date(l.call_timestamp).toLocaleDateString(),
      l.caller_number,
      `${l.call_duration_seconds}s`,
      l.sentiment,
      l.lead_score,
      l.ai_summary?.replace(/,/g, ";")
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," + 
      [headers, ...rows].map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `leads_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    setIsExporting(false);
  };

  const filteredLeads = leads.filter(l => {
    if (filter === "high_intent") return (l.lead_score || 0) >= 70;
    if (filter === "needs_followup") return l.status === "new";
    return true;
  });

  if (loading && !user) {
    return (
      <div className="space-y-8 animate-pulse max-w-6xl mx-auto">
        <div className="h-64 bg-white/5 rounded-3xl" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-white/5 rounded-2xl" />)}
        </div>
        <div className="h-96 bg-white/5 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto pb-20">
      {/* Premium Header Card */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-8 flex flex-col justify-center relative overflow-hidden group" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)", borderColor: "rgba(99,102,241,0.2)" }}>
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-700" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black text-indigo-400 uppercase tracking-widest">Premium Active</span>
              {stats?.calls_today !== "0" && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-400 uppercase tracking-widest animate-pulse">
                  <Activity className="w-3 h-3" /> Live Pulse
                </span>
              )}
            </div>
            
            <h2 className="text-4xl font-black mb-2 text-white tracking-tight">Welcome back, {user?.name?.split(" ")[0] || "Ronald"}!</h2>
            <p className="text-sm max-w-md text-white/50 mb-8 font-medium">Your AI Receptionist is monitoring your lines. Incoming calls are being handled autonomously.</p>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="bg-black/40 border border-white/10 px-6 py-4 rounded-2xl flex items-center gap-4 backdrop-blur-xl shadow-2xl">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] mb-0.5">AI Routing Number</p>
                  <span className="text-2xl font-mono font-bold tracking-widest text-white">{user?.plivo_number || "918031337777"}</span>
                </div>
                <button onClick={copyNumber} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all ml-4 border border-white/5" title="Copy Number">
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-white/40" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-8 flex flex-col justify-between relative overflow-hidden border-emerald-500/20" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.02) 100%)" }}>
          <div className="absolute top-0 right-0 p-8 opacity-5 text-emerald-500">
            <Zap size={140} />
          </div>
          <div>
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 flex items-center gap-2">
                <TrendingUp className="w-3 h-3" /> Growth & ROI
              </p>
              {stats?.health_grade && (
                <div className="text-right">
                  <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Account Health</p>
                  <p className={`text-lg font-black ${stats.health_score > 70 ? 'text-emerald-400' : 'text-amber-400'}`}>{stats.health_grade} ({stats.health_score}%)</p>
                </div>
              )}
            </div>
            <p className="text-5xl font-black text-white">₹{(stats?.total_revenue_saved || 0).toLocaleString("en-IN")}</p>
            <p className="text-[10px] font-bold text-white/30 mt-4 leading-relaxed">Revenue preserved from <span className="text-white">{stats?.total_leads || 0}</span> calls handled by AI.</p>
          </div>
          <div className="mt-8 space-y-3">
            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
              <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${stats?.health_score || 0}%` }} />
            </div>
            <button className="w-full py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-all">
              Download Performance Report
            </button>
          </div>
        </div>
      </div>

      {/* Modern Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Calls Today", val: stats?.calls_today || 0, icon: PhoneCall, col: "text-indigo-400" },
          { label: "Talk Time", val: `${stats?.minutes_today || 0}m`, icon: Clock, col: "text-amber-400" },
          { label: "New Leads", val: stats?.total_new_leads || 0, icon: Users, col: "text-emerald-400" },
          { label: "Success Rate", val: "98%", icon: CheckCircle, col: "text-blue-400" }
        ].map((s, i) => (
          <div key={i} className="card p-6 group hover:bg-white/[0.03] transition-all cursor-default border-white/5">
            <s.icon className={`w-5 h-5 mb-4 ${s.col} group-hover:scale-110 transition-transform`} />
            <p className="text-3xl font-black text-white mb-1">{s.val}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-30">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Referral & Earn Banner */}
      <div className="card p-1 border-indigo-500/30 overflow-hidden" style={{ background: "linear-gradient(90deg, rgba(99,102,241,0.1) 0%, rgba(168,85,247,0.1) 100%)" }}>
        <div className="flex flex-col md:flex-row items-center justify-between p-6 gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/20">
              <Users className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white mb-1 tracking-tight">Refer a Business, Earn 500 Free Minutes</h3>
              <p className="text-sm text-white/50 font-medium">Help a friend never miss a call. When they sign up, you both get free credits.</p>
            </div>
          </div>
          <button className="btn-primary !px-10 whitespace-nowrap">
            Get Referral Link
          </button>
        </div>
      </div>

      {/* Main Intelligence Inbox */}
      <div className="card overflow-hidden border-white/5">
        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/[0.01]">
          <div className="flex items-center gap-4">
            <h3 className="font-bold text-lg text-white">Intelligence Inbox</h3>
            <div className="flex gap-1">
              {["all", "high_intent", "needs_followup"].map(f => (
                <button 
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-md border transition-all ${filter === f ? "bg-white text-black border-white" : "text-white/40 border-white/10 hover:border-white/30"}`}
                >
                  {f.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchData} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/30" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button 
              onClick={exportLeads}
              disabled={isExporting || leads.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-white transition-all border border-white/5 disabled:opacity-30"
            >
              <Download className="w-4 h-4" /> Export Leads
            </button>
          </div>
        </div>
        
        <div className="divide-y divide-white/5">
          {filteredLeads.length === 0 ? (
            <div className="p-20 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
                <AlertCircle className="w-8 h-8 text-white/10" />
              </div>
              <p className="text-sm font-bold text-white">No intelligence records found</p>
              <p className="text-xs mt-2 max-w-sm opacity-40 leading-relaxed">When your AI assistant handles calls, transcripts and intent scoring will appear here instantly.</p>
            </div>
          ) : filteredLeads.map((lead) => (
            <div key={lead.id} className={`transition-all ${expandedId === lead.id ? "bg-white/[0.03] shadow-inner" : "hover:bg-white/[0.01]"}`}>
              <div className="p-4 sm:p-6 cursor-pointer flex items-center justify-between" onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}>
                  <div className="flex items-center gap-6 min-w-[240px]">
                    <div className={`w-1.5 h-10 rounded-full ${lead.status === "new" ? "bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" : "bg-white/5"}`} />
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-base tracking-tight text-white">{lead.caller_number}</p>
                        {(lead.lead_score || 0) >= 70 && (
                          <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest bg-emerald-500 text-white px-2 py-0.5 rounded shadow-lg shadow-emerald-500/20">
                            <Zap className="w-2 h-2 fill-current" /> Hot Lead
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider mt-1.5 opacity-30">{new Date(lead.call_timestamp).toLocaleString("en-IN", { dateStyle: 'medium', timeStyle: 'short' })}</p>
                    </div>
                  </div>
                  
                  <div className="hidden lg:block flex-1 mx-12">
                    <div className="bg-black/30 rounded-xl px-5 py-3 border border-white/5 flex items-center justify-between gap-6 backdrop-blur-sm">
                      <p className="text-xs truncate opacity-60 italic font-medium leading-relaxed flex-1">&quot;{lead.ai_summary || "Automated call summary generated."}&quot;</p>
                      <span className={`text-[9px] font-black px-3 py-1 rounded-full border uppercase tracking-widest ${
                        lead.sentiment === 'positive' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' :
                        lead.sentiment === 'negative' ? 'text-rose-400 border-rose-500/20 bg-rose-500/5' :
                        'text-indigo-400 border-indigo-500/20 bg-indigo-500/5'
                      }`}>
                        {lead.sentiment || 'Neutral'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-8 min-w-[140px] justify-end">
                    <div className="text-right">
                       <p className="text-sm font-black text-white">{Math.floor(lead.call_duration_seconds / 60)}m {lead.call_duration_seconds % 60}s</p>
                       <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-0.5">Duration</p>
                    </div>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${expandedId === lead.id ? "bg-white border-white text-black rotate-90" : "border-white/10 text-white/30"}`}>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
                
                {expandedId === lead.id && (
                  <div className="px-6 pb-8 pt-2 animate-slide-down">
                    <div className="grid lg:grid-cols-12 gap-8 bg-black/60 rounded-3xl p-8 border border-white/10 shadow-2xl">
                      <div className="lg:col-span-5 space-y-8">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2"><Activity className="w-3 h-3" /> AI Insight Summary</p>
                            <div className="flex items-center gap-2">
                               <div className="text-[10px] font-black bg-white/5 px-2 py-1 rounded text-white/40 uppercase tracking-widest">Score: <span className="text-white">{lead.lead_score || 0}%</span></div>
                            </div>
                          </div>
                          <div className="text-sm leading-relaxed font-medium text-white/90 bg-white/[0.03] p-5 rounded-2xl border border-white/5 shadow-inner">
                            {lead.ai_summary || "No summary available."}
                          </div>
                        </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Resolution</p>
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-tight">{lead.action_taken || "Information Provided"}</span>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Lead Status</p>
                          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tight">{lead.status.replace("_", " ")}</span>
                        </div>
                      </div>
                      
                      {lead.recording_url && (
                        <div className="space-y-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
                            <Volume2 className="w-3 h-3" /> Play Call Recording
                          </p>
                          <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                            <audio controls className="w-full h-8 custom-audio-player">
                              <source src={lead.recording_url} type="audio/mpeg" />
                            </audio>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="lg:col-span-7">
                      <div className="h-full bg-black/40 rounded-2xl p-6 border border-white/5 flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
                            <Phone className="w-3 h-3" /> Complete Call Transcript
                          </p>
                          <button onClick={() => {
                            navigator.clipboard.writeText(lead.transcript_raw);
                          }} className="text-[10px] font-black text-white/40 hover:text-white transition-colors uppercase tracking-widest">Copy Text</button>
                        </div>
                        <div className="flex-1 text-xs font-medium space-y-4 max-h-[350px] overflow-y-auto custom-scrollbar text-white/60 leading-loose whitespace-pre-wrap px-2">
                          {lead.transcript_raw || "The transcript is currently being indexed and will be available shortly."}
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
