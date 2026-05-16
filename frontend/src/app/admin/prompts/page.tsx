"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Bot, Loader2, Save, History, Play, CheckCircle2, FlaskConical, Search, ArrowLeft, Plus
} from "lucide-react";
import toast from "react-hot-toast";

export default function AdminPrompts() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<any | null>(null);

  const { data: clientsData, isLoading: loadingClients } = useQuery({
    queryKey: ['adminClients'],
    queryFn: () => api('/admin/clients')
  });

  const clients = clientsData?.clients || [];
  const filteredClients = clients.filter((c: any) => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.business_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
      {!selectedClient ? (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Prompt Engineering</h1>
              <p className="text-sm opacity-50 mt-1">Manage AI personas and run A/B tests</p>
            </div>
            <div className="relative w-64">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
               <input 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search clients..." 
                className="input-field pl-10 h-10" 
               />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loadingClients ? (
              <div className="col-span-full py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin opacity-20" /></div>
            ) : filteredClients.map((c: any) => (
              <button 
                key={c.id} 
                onClick={() => setSelectedClient(c)}
                className="card p-6 text-left hover:bg-white/[0.02] transition-colors group border border-white/5 hover:border-indigo-500/30"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 group-hover:bg-indigo-500/20 transition-colors">
                    <Bot className="w-5 h-5 text-indigo-400" />
                  </div>
                  {c.ab_split_active && (
                    <span className="text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-1 rounded-full flex items-center gap-1">
                      <FlaskConical className="w-3 h-3" /> A/B Test Active
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-white text-lg">{c.business_name || c.name}</h3>
                <p className="text-xs opacity-50 mb-4 truncate">{c.email}</p>
                
                <div className="flex items-center gap-2 text-[10px] font-bold opacity-40 uppercase tracking-widest mt-auto pt-4 border-t border-white/5">
                  <History className="w-3 h-3" /> Manage Prompt Versions
                </div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <PromptEditor 
          client={selectedClient} 
          onBack={() => setSelectedClient(null)} 
        />
      )}
    </div>
  );
}

function PromptEditor({ client, onBack }: { client: any, onBack: () => void }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'A' | 'B'>('A');
  const [newPromptText, setNewPromptText] = useState("");
  const [newPromptNotes, setNewPromptNotes] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const { data: versionsData, isLoading: loadingVersions } = useQuery({
    queryKey: ['adminPrompts', client.id],
    queryFn: () => api(`/admin/prompts/${client.id}`)
  });

  const abMutation = useMutation({
    mutationFn: (active: boolean) => api(`/admin/clients/${client.id}/ab-test`, {
      method: 'PATCH',
      body: JSON.stringify({ ab_split_active: active })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminClients'] });
      toast.success("A/B settings updated");
    }
  });

  const createVersionMutation = useMutation({
    mutationFn: (data: any) => api(`/admin/prompts/${client.id}`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPrompts', client.id] });
      toast.success("New version created");
      setIsCreating(false);
      setNewPromptText("");
      setNewPromptNotes("");
    }
  });

  const activateMutation = useMutation({
    mutationFn: (versionId: string) => api(`/admin/prompts/${client.id}/${versionId}/activate`, {
      method: 'PATCH'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPrompts', client.id] });
      toast.success("Version activated");
    }
  });

  const versions = versionsData?.versions || [];
  const currentVariantVersions = versions.filter((v: any) => v.variant === activeTab);
  const activeVersion = currentVariantVersions.find((v: any) => v.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 opacity-50" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white">{client.business_name || client.name}</h2>
          <p className="text-xs opacity-50">Prompt Version Management</p>
        </div>
        
        <div className="ml-auto flex items-center gap-3 bg-white/5 p-1 rounded-xl border border-white/5">
          <button 
            onClick={() => setActiveTab('A')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'A' ? 'bg-indigo-500 text-white' : 'text-white/50 hover:text-white'}`}
          >
            Variant A
          </button>
          <button 
            onClick={() => setActiveTab('B')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'B' ? 'bg-indigo-500 text-white' : 'text-white/50 hover:text-white'}`}
          >
            Variant B
          </button>
        </div>
      </div>

      <div className="card p-6 border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <FlaskConical className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Deterministic A/B Testing</h3>
              <p className="text-xs opacity-50">Route traffic 50/50 between Variant A and B based on caller ID hash.</p>
            </div>
          </div>
          <button 
            onClick={() => abMutation.mutate(!client.ab_split_active)}
            disabled={abMutation.isPending}
            className={`h-10 px-6 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
              client.ab_split_active 
                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20' 
                : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
            }`}
          >
            {abMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : client.ab_split_active ? 'Test Active' : 'Enable Split'}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {isCreating ? (
            <div className="card p-6 border-indigo-500/30">
              <h3 className="font-bold text-white mb-4">Create New Version (Variant {activeTab})</h3>
              <textarea 
                value={newPromptText} 
                onChange={e => setNewPromptText(e.target.value)}
                className="input-field min-h-[300px] font-mono text-xs mb-4" 
                placeholder="Enter system prompt instructions..."
              />
              <input 
                value={newPromptNotes}
                onChange={e => setNewPromptNotes(e.target.value)}
                className="input-field mb-6"
                placeholder="Change notes (e.g., 'Added pricing objections')"
              />
              <div className="flex gap-3">
                <button onClick={() => setIsCreating(false)} className="btn-secondary flex-1 h-10 font-bold">Cancel</button>
                <button 
                  onClick={() => createVersionMutation.mutate({ prompt_text: newPromptText, variant: activeTab, notes: newPromptNotes })}
                  disabled={createVersionMutation.isPending || !newPromptText.trim()}
                  className="btn-primary flex-1 h-10 font-bold flex items-center justify-center gap-2"
                >
                  {createVersionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Version</>}
                </button>
              </div>
            </div>
          ) : (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white">Active Prompt</h3>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded uppercase tracking-widest font-black">
                    Variant {activeTab}
                  </span>
                </div>
                <button 
                  onClick={() => {
                    setNewPromptText(activeVersion?.prompt_text || "");
                    setIsCreating(true);
                  }}
                  className="btn-secondary h-8 px-4 text-xs font-bold flex items-center gap-2"
                >
                  <Plus className="w-3 h-3" /> New Draft
                </button>
              </div>

              {activeVersion ? (
                <div className="bg-[#0a0a0f] border border-white/5 rounded-xl p-4">
                  <pre className="text-xs text-white/70 font-mono whitespace-pre-wrap">{activeVersion.prompt_text}</pre>
                </div>
              ) : (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
                  <p className="text-xs opacity-40 mb-4">No active version for Variant {activeTab}</p>
                  <button onClick={() => setIsCreating(true)} className="btn-primary h-8 px-4 text-xs font-bold inline-flex items-center gap-2">
                    <Plus className="w-3 h-3" /> Create First Version
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-white text-sm px-2">Version History</h3>
          {loadingVersions ? (
            <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin opacity-20" /></div>
          ) : currentVariantVersions.length === 0 ? (
            <p className="text-xs opacity-30 px-2 italic">No history available.</p>
          ) : (
            <div className="space-y-2">
              {currentVariantVersions.map((v: any) => (
                <div key={v.id} className={`p-4 rounded-xl border ${v.is_active ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-white/[0.02] border-white/5'} transition-colors`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">v{v.version}</span>
                        {v.is_active && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                      </div>
                      <span className="text-[10px] opacity-40 block mt-0.5">{new Date(v.created_at).toLocaleString()}</span>
                    </div>
                    {!v.is_active && (
                      <button 
                        onClick={() => activateMutation.mutate(v.id)}
                        disabled={activateMutation.isPending}
                        className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 hover:text-indigo-300"
                      >
                        {activateMutation.isPending ? 'Working...' : 'Activate'}
                      </button>
                    )}
                  </div>
                  {v.notes && <p className="text-[10px] text-white/60 italic border-l-2 border-white/10 pl-2 mt-2">{v.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
