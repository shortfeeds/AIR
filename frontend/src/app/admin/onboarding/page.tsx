"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Phone, CheckCircle, Loader2 } from "lucide-react";

export default function AdminOnboarding() {
  const [queue, setQueue] = useState<any[]>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [plivoNumber, setPlivoNumber] = useState("");

  useEffect(() => {
    api("/admin/onboarding").then((d) => setQueue(d.queue)).catch(console.error);
  }, []);

  const activateClient = async (clientId: string) => {
    if (!plivoNumber) return;
    setAssigningId(clientId);
    try {
      await api(`/admin/clients/${clientId}/assign-number`, { method: "POST", body: JSON.stringify({ plivo_number: plivoNumber }) });
      setQueue(queue.filter(q => q.id !== clientId));
      setPlivoNumber("");
    } catch (e) { console.error(e); }
    finally { setAssigningId(null); }
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

              <div className="grid sm:grid-cols-2 gap-4 mb-4 text-sm">
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

              <div className="flex gap-3 items-center pt-3 border-t" style={{ borderColor: "var(--border-subtle)" }}>
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                  <input value={assigningId === client.id ? plivoNumber : ""} onChange={(e) => { setAssigningId(client.id); setPlivoNumber(e.target.value); }} className="input-field pl-10 text-sm" placeholder="Assign Plivo number..." />
                </div>
                <button onClick={() => activateClient(client.id)} disabled={assigningId === client.id && !plivoNumber} className="btn-primary text-sm flex items-center gap-2">
                  {assigningId === client.id && !plivoNumber ? <Loader2 className="w-4 h-4 animate-spin" /> : "Activate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
