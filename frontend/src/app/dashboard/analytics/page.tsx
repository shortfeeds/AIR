"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from "recharts";
import { TrendingUp, Clock, PhoneCall, Loader2, Zap } from "lucide-react";

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [roi, setRoi] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [res, roiRes] = await Promise.all([
        api(`/leads/analytics?days=${days}`),
        api('/leads/roi')
      ]);
      setData(res);
      setRoi(roiRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        <p className="text-sm font-bold opacity-50 tracking-widest uppercase">Crunching Call Data...</p>
      </div>
    );
  }

  const hasData = data.daily?.length > 0 || data.status?.length > 0 || data.hourly?.length > 0;
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];
 
  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Call Intelligence</h1>
          <p className="text-sm opacity-50">Deep insights into your AI receptionist performance</p>
        </div>
        {hasData && (
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
            {[7, 30, 90].map((d) => (
              <button 
                key={d}
                onClick={() => setDays(d)}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${days === d ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-white/40 hover:text-white'}`}
              >
                {d} Days
              </button>
            ))}
          </div>
        )}
      </div>

      {!hasData ? (
        <div className="card p-12 bg-slate-900/40 border border-white/5 rounded-3xl text-center space-y-6 max-w-2xl mx-auto my-12 shadow-xl backdrop-blur-md relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent pointer-events-none" />
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto text-indigo-400 border border-indigo-500/20">
            <PhoneCall className="w-8 h-8" />
          </div>
          <div className="space-y-2 relative z-10">
            <h3 className="text-xl font-bold text-white">No Call Intelligence Recorded</h3>
            <p className="text-sm text-white/50 max-w-md mx-auto leading-relaxed">
              Your AI Receptionist is fully configured and waiting for its first call. 
              Once customers start calling your dedicated phone number, real-time analytics, lead status tracking, and ROI projections will display here automatically!
            </p>
          </div>
          <div className="pt-4">
            <a 
              href="/dashboard/settings" 
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold transition-all text-sm shadow-lg shadow-indigo-500/20"
            >
              Verify AI Phone Number & Settings
            </a>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Trend Chart */}
            <div className="lg:col-span-2 card p-6">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-400" /> Call Volume Trends
                </h3>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-30">Daily Activity</span>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.daily}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: 'rgba(255,255,255,0.3)', fontSize: 10}}
                      tickFormatter={(str) => new Date(str).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ background: '#1a1b23', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="card p-6">
              <h3 className="font-bold text-white mb-8 flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" /> Lead Conversion
              </h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.status}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="count"
                      nameKey="status"
                    >
                      {data.status.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ background: '#1a1b23', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    />
                    <Legend iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                 {data.status.map((s: any, i: number) => (
                   <div key={s.status} className="flex justify-between items-center text-xs">
                     <span className="opacity-50 capitalize">{s.status.replace('_', ' ')}</span>
                     <span className="font-bold" style={{ color: COLORS[i % COLORS.length] }}>{s.count} Leads</span>
                   </div>
                 ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Peak Hours */}
            <div className="card p-6">
              <h3 className="font-bold text-white mb-8 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" /> Peak Calling Hours
              </h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.hourly}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="hour" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: 'rgba(255,255,255,0.3)', fontSize: 10}}
                      tickFormatter={(h) => `${h}:00`}
                    />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{fill: 'rgba(255,255,255,0.05)'}}
                      contentStyle={{ background: '#1a1b23', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    />
                    <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Resource Efficiency & ROI */}
            <div className="card p-6 flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 text-indigo-500">
                <PhoneCall size={120} />
              </div>
              <div className="relative z-10">
                <h3 className="font-bold text-white mb-1">Business Value (ROI)</h3>
                <p className="text-xs opacity-50 mb-8">Estimated impact on your bottom line</p>
                
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2">Revenue Preserved</p>
                    <p className="text-3xl font-black text-emerald-400">₹{(roi?.revenuePreserved || 0).toLocaleString('en-IN')}</p>
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                      <TrendingUp className="w-3 h-3" /> High quality leads
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2">Staff Hours Saved</p>
                    <p className="text-3xl font-black text-white">{roi?.hoursSaved || 0}<span className="text-sm opacity-30 ml-1">h</span></p>
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-400 font-bold">
                      <Clock className="w-3 h-3 text-amber-400" /> Automated reception
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
