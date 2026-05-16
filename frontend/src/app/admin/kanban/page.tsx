"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Phone, Users, CheckCircle, Clock, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const STAGES = [
  { id: "pending", label: "Pending", color: "var(--text-muted)", icon: Clock },
  { id: "configuring", label: "Configuring", color: "var(--info)", icon: Settings },
  { id: "testing", label: "Testing", color: "var(--warning)", icon: AlertTriangle },
  { id: "active", label: "Active", color: "var(--success)", icon: CheckCircle },
];

import { Settings } from "lucide-react";

export default function AdminKanban() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await api("/admin/clients");
      setClients(res.clients);
    } catch (e) {
      console.error(e);
      toast.error("Failed to fetch clients");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (clientId: string, newStatus: string) => {
    setUpdatingId(clientId);
    try {
      await api(`/admin/clients/${clientId}`, {
        method: "PATCH",
        body: JSON.stringify({ onboarding_status: newStatus })
      });
      setClients(clients.map(c => c.id === clientId ? { ...c, onboarding_status: newStatus } : c));
      toast.success(`Status updated to ${newStatus}`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const getClientsInStage = (stageId: string) => {
    return clients.filter(c => (c.onboarding_status || 'pending') === stageId);
  };

  if (loading) return <div className="animate-pulse text-center py-20">Loading Kanban...</div>;

  return (
    <div className="space-y-6 h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Onboarding Kanban</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Visual management of client lifecycle</p>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => (
          <div key={stage.id} className="flex flex-col min-w-[280px] bg-black/20 rounded-xl border border-white/5 overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border-subtle)", background: "rgba(255,255,255,0.02)" }}>
              <div className="flex items-center gap-2">
                <stage.icon className="w-4 h-4" style={{ color: stage.color }} />
                <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{stage.label}</h3>
              </div>
              <span className="badge badge-secondary">{getClientsInStage(stage.id).length}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
              {getClientsInStage(stage.id).length === 0 ? (
                <div className="text-center py-10 opacity-30">
                  <Users className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-xs">No clients here</p>
                </div>
              ) : (
                getClientsInStage(stage.id).map((client) => (
                  <div key={client.id} className="card p-4 hover:border-white/20 transition-all cursor-default group">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{client.business_name || client.name}</h4>
                      {updatingId === client.id && <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />}
                    </div>
                    <p className="text-[11px] mb-3" style={{ color: "var(--text-muted)" }}>{client.email}</p>
                    
                    <div className="flex items-center gap-1.5 mt-auto">
                      {STAGES.map((nextStage, idx) => {
                        const currentIdx = STAGES.findIndex(s => s.id === stage.id);
                        const isNext = idx === currentIdx + 1;
                        if (!isNext) return null;
                        return (
                          <button 
                            key={nextStage.id}
                            onClick={() => updateStatus(client.id, nextStage.id)}
                            disabled={!!updatingId}
                            className="w-full py-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors"
                            style={{ color: nextStage.color }}
                          >
                            Move to {nextStage.label} <ArrowRight className="w-3 h-3" />
                          </button>
                        );
                      })}
                      
                      {stage.id === 'active' && (
                        <div className="w-full py-1.5 text-center text-[10px] font-bold text-green-400 uppercase tracking-wider bg-green-500/10 rounded">
                          Success
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
