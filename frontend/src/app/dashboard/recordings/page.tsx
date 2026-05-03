"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Phone, Calendar, Search, Download, Play, Volume2, Loader2, ArrowRight } from "lucide-react";

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
      setLeads((data.leads || []).filter((l: Lead) => l.recording_url));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter(l => 
    l.caller_number.includes(searchTerm) || 
    l.ai_summary?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Call Library</h1>
          <p className="text-sm opacity-50">Browse and replay your AI receptionist recordings</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
          <input 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10" 
            placeholder="Search number or summary..." 
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-sm opacity-50 font-medium">Indexing recordings...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-20 text-center">
            <Volume2 className="w-12 h-12 mx-auto opacity-10 mb-4" />
            <p className="text-sm font-bold text-white">No recordings found</p>
            <p className="text-xs opacity-50 mt-1">Once your AI handles calls with recording enabled, they will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredLeads.map((lead) => (
              <div key={lead.id} className={`transition-all ${expandedId === lead.id ? "bg-white/[0.02]" : "hover:bg-white/[0.01]"}`}>
                <div 
                  className="p-4 sm:p-6 cursor-pointer flex items-center justify-between" 
                  onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                >
                  <div className="flex items-center gap-4 min-w-[200px]">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                      <Play className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <p className="font-bold text-sm tracking-wide text-white">{lead.caller_number}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wider mt-1 opacity-40">
                        {new Date(lead.call_timestamp).toLocaleString("en-IN", { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="hidden sm:block flex-1 mx-8">
                    <p className="text-xs truncate opacity-70 italic font-medium">&quot;{lead.ai_summary || "Call recording in progress..."}&quot;</p>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="text-xs font-bold text-white block">{Math.floor(lead.call_duration_seconds / 60)}m {lead.call_duration_seconds % 60}s</span>
                      <span className="text-[10px] uppercase font-bold tracking-widest opacity-30 mt-0.5">Duration</span>
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
                  <div className="px-6 pb-6 pt-2 animate-slide-down">
                    <div className="bg-black/40 rounded-2xl p-6 border border-white/5">
                      <div className="flex flex-col md:flex-row gap-8">
                        <div className="flex-1 space-y-4">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-3 flex items-center gap-2">
                              <Volume2 className="w-3 h-3" /> Player Controls
                            </p>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                              <audio controls className="w-full h-10 custom-audio-player">
                                <source src={lead.recording_url} type="audio/mpeg" />
                                Your browser does not support the audio element.
                              </audio>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1.5">Action Taken</p>
                              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 inline-block">
                                {lead.action_taken || "Info Provided"}
                              </span>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1.5">Sentiment</p>
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
                        <div className="flex-1">
                           <div className="flex items-center justify-between mb-3">
                             <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">AI Context Summary</p>
                             <div className="flex items-center gap-1.5">
                               <span className="text-[10px] font-bold opacity-30 uppercase tracking-widest">Lead Score</span>
                               <span className={`text-xs font-black ${
                                 (lead.lead_score || 0) > 70 ? 'text-emerald-400' :
                                 (lead.lead_score || 0) > 40 ? 'text-amber-400' : 'text-white/40'
                               }`}>{lead.lead_score || 0}</span>
                             </div>
                           </div>
                          <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-xs leading-relaxed opacity-80 italic">
                            {lead.ai_summary}
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
