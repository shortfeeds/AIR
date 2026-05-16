"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { History, Search, Filter, Loader2, Calendar, User, Tag } from "lucide-react";

export default function AdminActivity() {
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api("/admin/activity").then((d) => {
      setTimeline(d.timeline);
      setLoading(false);
    }).catch(console.error);
  }, []);

  const filteredTimeline = timeline.filter(t => 
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase()) ||
    t.client_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="animate-pulse text-center py-20">Loading Activity Logs...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Platform Activity</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Audit logs and system events</p>
        </div>

        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10 text-sm w-full md:w-64" 
              placeholder="Search logs..." 
            />
          </div>
          <button className="btn-secondary px-4 py-2 flex items-center gap-2 text-sm">
            <Filter className="w-4 h-4" /> Filter
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border-subtle)" }}>
                <th className="p-4 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Timestamp</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Event</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Client</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Level</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
              {filteredTimeline.map((t) => (
                <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                      <Calendar className="w-3 h-3" />
                      {new Date(t.created_at).toLocaleString("en-IN")}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="max-w-md">
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{t.title}</p>
                      {t.description && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{t.description}</p>}
                    </div>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    {t.client_name ? (
                      <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-primary)" }}>
                        <User className="w-3.5 h-3.5" style={{ color: "var(--brand-400)" }} />
                        {t.client_name}
                      </div>
                    ) : (
                      <span className="text-xs italic" style={{ color: "var(--text-muted)" }}>System</span>
                    )}
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <span className={`badge ${t.event_type === 'alert' ? 'badge-warning' : 'badge-secondary'}`}>
                      {t.event_type || 'info'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTimeline.length === 0 && (
            <div className="p-12 text-center" style={{ color: "var(--text-muted)" }}>
              <History className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>No activity records found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
