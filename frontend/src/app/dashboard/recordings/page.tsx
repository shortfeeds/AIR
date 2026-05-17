"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Calendar, Search, Download, Play, Volume2, Loader2, ArrowRight, User, CheckCircle, Clock } from "lucide-react";

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
  caller_name?: string;
  caller_query?: string;
  appointment_date?: string;
  appointment_time?: string;
}

export default function RecordingsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const data = await api("/leads?limit=100");
      // Only keep calls that HAVE a recording_url
      setLeads((data.data || data.leads || []).filter((l: Lead) => l.recording_url));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter(l => 
    l.caller_number.includes(searchTerm) || 
    (l.caller_name && l.caller_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    l.ai_summary?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Call Library & Recordings</h1>
          <p className="text-xs opacity-50 mt-1">Browse, replay, and analyze your AI receptionist recordings and booking sessions.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
          <input 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10" 
            placeholder="Search by caller name, number, summary..." 
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-xs font-bold uppercase tracking-widest opacity-40">Indexing call library...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-20 text-center">
            <Volume2 className="w-12 h-12 mx-auto opacity-10 mb-4" />
            <p className="text-sm font-extrabold text-white">No recordings registered yet</p>
            <p className="text-xs opacity-50 mt-1">Once your AI handles calls with recording enabled, they will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredLeads.map((lead) => (
              <div key={lead.id} className={`transition-all ${expandedId === lead.id ? "bg-white/[0.02]" : "hover:bg-white/[0.01]"}`}>
                <div 
                  className="p-4 sm:p-5 cursor-pointer flex items-center justify-between gap-4" 
                  onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                >
                  <div className="flex items-center gap-4 min-w-[240px]">
                    <div className="w-9 h-9 rounded-full bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                      <Play className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm tracking-wide text-white">{lead.caller_number}</p>
                        {lead.caller_name && (
                          <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">
                            {lead.caller_name}
                          </span>
                        )}
                        {lead.appointment_date && (
                          <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5" /> Booked
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-semibold mt-1 opacity-45">
                        {new Date(lead.call_timestamp).toLocaleString("en-IN", { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="hidden sm:block flex-1 mx-4">
                    <p className="text-xs truncate opacity-65 italic">&quot;{lead.ai_summary || "Call analysis in progress..."}&quot;</p>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="text-xs font-bold text-white block">{Math.floor(lead.call_duration_seconds / 60)}m {lead.call_duration_seconds % 60}s</span>
                      <span className="text-[10px] uppercase font-bold tracking-widest opacity-30 mt-0.5 block">Duration</span>
                    </div>
                    <a 
                      href={lead.recording_url} 
                      download 
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/30 hover:text-white"
                      title="Download MP3"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <ArrowRight className={`w-4 h-4 transition-transform text-white/20 ${expandedId === lead.id ? "rotate-90 text-white" : ""}`} />
                  </div>
                </div>

                {expandedId === lead.id && (
                  <div className="px-5 pb-5 pt-1 animate-slide-down">
                    <div className="bg-black/40 rounded-2xl p-5 border border-white/5 space-y-5">
                      <div className="flex flex-col md:flex-row gap-6">
                        {/* Column 1: Player & Direct Info */}
                        <div className="flex-1 space-y-4">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2 flex items-center gap-2">
                              <Volume2 className="w-3.5 h-3.5 text-indigo-400" /> Audio Player
                            </p>
                            <div className="bg-white/5 p-3.5 rounded-xl border border-white/5">
                              <audio controls className="w-full h-8 custom-audio-player">
                                <source src={lead.recording_url} type="audio/mpeg" />
                                Your browser does not support HTML5 audio.
                              </audio>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1">Escalation Status</p>
                              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 inline-block">
                                {lead.action_taken || "Info Provided"}
                              </span>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1">Caller Sentiment</p>
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border inline-block capitalize ${
                                lead.sentiment === 'positive' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                                lead.sentiment === 'negative' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' :
                                'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
                              }`}>
                                {lead.sentiment || 'Neutral'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Column 2: Details & Summaries */}
                        <div className="flex-1 space-y-4">
                          {/* Inline Caller Details if registered */}
                          {(lead.caller_name || lead.caller_query || lead.appointment_date) && (
                            <div className="bg-indigo-950/20 p-4 rounded-xl border border-indigo-500/10 space-y-3">
                              <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                                <User className="w-3.5 h-3.5 text-indigo-400" />
                                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">Caller Identification Profile</span>
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                {lead.caller_name && (
                                  <div>
                                    <span className="text-[10px] opacity-40 block">NAME</span>
                                    <span className="font-extrabold text-white">{lead.caller_name}</span>
                                  </div>
                                )}
                                {lead.caller_number && (
                                  <div>
                                    <span className="text-[10px] opacity-40 block">NUMBER</span>
                                    <span className="font-extrabold text-white">{lead.caller_number}</span>
                                  </div>
                                )}
                              </div>
                              
                              {lead.caller_query && (
                                <div>
                                  <span className="text-[10px] opacity-40 block uppercase tracking-wider">Caller Query</span>
                                  <p className="text-xs text-white/80 font-medium leading-relaxed mt-0.5 bg-black/20 p-2.5 rounded-lg border border-white/5">{lead.caller_query}</p>
                                </div>
                              )}

                              {lead.appointment_date && (
                                <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 flex items-center gap-2.5">
                                  <Calendar className="w-4.5 h-4.5 text-amber-400" />
                                  <div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 block">Appointment Booked</span>
                                    <span className="text-xs font-black text-white">{new Date(lead.appointment_date).toLocaleDateString()} @ {lead.appointment_time || "TBD"}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">AI Summary & Transcript Context</p>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold opacity-30 uppercase tracking-widest">Lead Score</span>
                                <span className={`text-xs font-black ${
                                  (lead.lead_score || 0) > 70 ? 'text-emerald-400' :
                                  (lead.lead_score || 0) > 40 ? 'text-amber-400' : 'text-white/40'
                                }`}>{lead.lead_score || 0}</span>
                              </div>
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-xs leading-relaxed opacity-85 italic">
                              {lead.ai_summary}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
