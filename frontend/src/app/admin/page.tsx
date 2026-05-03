"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Users, PhoneIncoming, IndianRupee, AlertTriangle, Clock } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [trends, setTrends] = useState<any>(null);

  useEffect(() => {
    api("/admin/dashboard").then(setData).catch(console.error);
    api("/admin/analytics/trends").then(setTrends).catch(console.error);
  }, []);

  if (!data) return <div className="animate-pulse text-center py-20" style={{ color: "var(--text-muted)" }}>Loading...</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Admin Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Platform overview and alerts</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Clients", value: data.stats.total_clients, icon: Users, color: "var(--brand-400)" },
          { label: "Calls Today", value: data.stats.calls_today, icon: PhoneIncoming, color: "var(--success)" },
          { label: "Minutes This Month", value: data.stats.minutes_this_month, icon: Clock, color: "var(--info)" },
          { label: "Revenue This Month", value: `₹${Number(data.stats.revenue_this_month).toLocaleString("en-IN")}`, icon: IndianRupee, color: "var(--warning)" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: `${s.color}15` }}>
              <s.icon className="w-5 h-5" style={{ color: s.color }} />
            </div>
            <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Growth Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-semibold mb-6" style={{ color: "var(--text-primary)" }}>Revenue Growth (Last 6 Months)</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends?.revenue || []}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--brand-500)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--brand-500)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ background: "#0b0e14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                  itemStyle={{ color: "var(--brand-400)" }}
                />
                <Area type="monotone" dataKey="total_revenue" stroke="var(--brand-500)" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold mb-6" style={{ color: "var(--text-primary)" }}>Minute Usage Trends</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends?.usage || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ background: "#0b0e14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                  itemStyle={{ color: "var(--info)" }}
                />
                <Line type="monotone" dataKey="total_minutes" stroke="var(--info)" strokeWidth={3} dot={{ fill: "var(--info)", r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Low Minutes Alerts */}
        <div className="card overflow-hidden">
          <div className="p-5 border-b flex items-center gap-2" style={{ borderColor: "var(--border-subtle)" }}>
            <AlertTriangle className="w-4 h-4" style={{ color: "var(--warning)" }} />
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Low Minutes Alerts</h3>
          </div>
          {data.low_minutes_alerts.length === 0 ? (
            <p className="p-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>All clients have sufficient minutes ✅</p>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
              {data.low_minutes_alerts.map((c: any) => (
                <div key={c.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{c.name}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{c.email}</p>
                  </div>
                  <span className="badge badge-warning">{c.available_minutes} mins left</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Signups */}
        <div className="card overflow-hidden">
          <div className="p-5 border-b" style={{ borderColor: "var(--border-subtle)" }}>
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Recent Signups</h3>
          </div>
          {data.recent_signups.length === 0 ? (
            <p className="p-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>No recent signups</p>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
              {data.recent_signups.map((c: any) => (
                <div key={c.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{c.name}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{new Date(c.created_at).toLocaleDateString("en-IN")}</p>
                  </div>
                  <span className={`badge ${c.onboarding_status === "active" ? "badge-success" : "badge-warning"}`}>
                    {c.onboarding_status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
