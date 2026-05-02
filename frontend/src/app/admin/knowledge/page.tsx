"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Bell, CheckCircle, Loader2 } from "lucide-react";

export default function AdminKnowledge() {
  const [updates, setUpdates] = useState<any[]>([]);
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => {
    api("/admin/knowledge-updates").then((d) => setUpdates(d.updates)).catch(console.error);
  }, []);

  const resolve = async (clientId: string) => {
    setResolving(clientId);
    try {
      await api(`/admin/knowledge-updates/${clientId}/resolve`, { method: "PATCH" });
      setUpdates(updates.filter(u => u.client_id !== clientId));
    } catch (e) { console.error(e); }
    finally { setResolving(null); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Knowledge Base Updates</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{updates.length} pending update requests</p>
      </div>

      {updates.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--success)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No pending knowledge base updates.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {updates.map((u) => (
            <div key={u.client_id} className="card p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>{u.business_name || u.name}</h3>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{u.email} · {new Date(u.last_updated).toLocaleString("en-IN")}</p>
                </div>
                <span className="badge badge-warning"><Bell className="w-3 h-3 mr-1" /> Pending Review</span>
              </div>

              <div className="p-4 rounded-lg mb-4" style={{ background: "var(--bg-secondary)" }}>
                <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Client&apos;s Update Request:</p>
                <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-primary)" }}>{u.update_notes}</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 mb-4 text-sm">
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Current Services</p>
                  <p style={{ color: "var(--text-secondary)" }}>{u.primary_services || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>AI Goal</p>
                  <p className="capitalize" style={{ color: "var(--text-secondary)" }}>{u.ai_goal?.replace("_", " ") || "—"}</p>
                </div>
              </div>

              <button onClick={() => resolve(u.client_id)} disabled={resolving === u.client_id} className="btn-primary text-sm flex items-center gap-2">
                {resolving === u.client_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4" /> Mark as Done</>}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
