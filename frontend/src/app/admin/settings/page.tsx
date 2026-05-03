"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Save, Loader2, CheckCircle, IndianRupee, Clock } from "lucide-react";

export default function AdminSettings() {
  const [plans, setPlans] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api("/admin/settings/plans").then((d) => setPlans(d.plans)).catch(console.error);
  }, []);

  const savePlans = async () => {
    setSaving(true);
    try {
      await api("/admin/settings/plans", { method: "PATCH", body: JSON.stringify({ plans }) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const updatePlan = (id: string, field: string, val: any) => {
    setPlans({ ...plans, [id]: { ...plans[id], [field]: val } });
  };

  if (!plans) return <div className="p-20 text-center animate-pulse opacity-50">Loading settings...</div>;

  return (
    <div className="max-w-4xl space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>System Settings</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Manage global platform configuration</p>
        </div>
        <button onClick={savePlans} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          Save All Changes
        </button>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <IndianRupee className="w-5 h-5 text-indigo-400" /> Subscription Plan Management
        </h3>
        
        <div className="grid gap-6">
          {Object.entries(plans).map(([id, plan]: [string, any]) => (
            <div key={id} className="p-6 rounded-xl border bg-white/[0.02]" style={{ borderColor: "var(--border-subtle)" }}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-indigo-400 uppercase tracking-widest">{id}</h4>
                <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded uppercase font-bold opacity-40">Plan ID: {id}</span>
              </div>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2 block">Display Name</label>
                  <input value={plan.label} onChange={(e) => updatePlan(id, "label", e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2 block">Minutes Allocation</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                    <input type="number" value={plan.minutes} onChange={(e) => updatePlan(id, "minutes", parseInt(e.target.value))} className="input-field pl-10" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2 block">Price (in Paise)</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                    <input type="number" value={plan.price} onChange={(e) => updatePlan(id, "price", parseInt(e.target.value))} className="input-field pl-10" />
                  </div>
                  <p className="text-[10px] mt-1 opacity-40">₹{(plan.price / 100).toLocaleString()} INR</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6 bg-indigo-500/5 border-indigo-500/20">
        <h3 className="font-bold mb-2" style={{ color: "var(--text-primary)" }}>Platform Integrity</h3>
        <p className="text-sm opacity-70 mb-4">Changes to plans will take effect immediately for all new subscriptions. Existing subscribers will retain their current rates until their next billing cycle.</p>
      </div>
    </div>
  );
}
