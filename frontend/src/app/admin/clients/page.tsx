"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Phone, Plus, Loader2, Settings, UserCircle, UserPlus, Key, Brain, Save, Layout } from "lucide-react";
import Portal from "@/components/Portal";

export default function AdminClients() {
  const [clients, setClients] = useState<any[]>([]);
  const [assignModal, setAssignModal] = useState<{ id: string; name: string } | null>(null);
  const [plivoNumber, setPlivoNumber] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [addMinModal, setAddMinModal] = useState<{ id: string; name: string } | null>(null);
  const [bonusMins, setBonusMins] = useState("");
  const [addingMins, setAddingMins] = useState(false);
  const [changePlanModal, setChangePlanModal] = useState<{ id: string; name: string; currentPlan: string } | null>(null);
  const [newPlan, setNewPlan] = useState("");
  const [changingPlan, setChangingPlan] = useState(false);
  const [addClientModal, setAddClientModal] = useState(false);
  const PLAN_MINUTES: Record<string, number> = {
    free_trial: 15,
    trial: 15,
    silver: 200,
    gold: 500,
    diamond: 1000,
    platinum: 2000
  };
  const [newClient, setNewClient] = useState({ name: "", email: "", password: "", business_name: "", plan_name: "silver", initial_minutes: 200, plivo_number: "" });
  const [creating, setCreating] = useState(false);
  const [pwModal, setPwModal] = useState<{ id: string; name: string } | null>(null);
  const [newPw, setNewPw] = useState("");
  const [resetting, setResetting] = useState(false);
  const [abModal, setAbModal] = useState<{ id: string; name: string; promptB: string; abActive: boolean } | null>(null);
  const [savingAb, setSavingAb] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState<any[]>([]);
  const [ownedNumbers, setOwnedNumbers] = useState<any[]>([]);
  const [searchingNumbers, setSearchingNumbers] = useState(false);
  const [showInventory, setShowInventory] = useState(false);

  const fetchAvailableNumbers = async () => {
    setSearchingNumbers(true);
    setShowInventory(false);
    try {
      const data = await api("/admin/plivo/available-numbers");
      setAvailableNumbers(data.numbers || []);
    } catch (e) { console.error(e); }
    finally { setSearchingNumbers(false); }
  };

  const fetchOwnedNumbers = async () => {
    setSearchingNumbers(true);
    setShowInventory(true);
    try {
      const data = await api("/admin/plivo/owned-numbers");
      setOwnedNumbers(data.numbers || []);
    } catch (e) { console.error(e); }
    finally { setSearchingNumbers(false); }
  };

  const saveAbTest = async () => {
    if (!abModal) return;
    setSavingAb(true);
    try {
      await api(`/admin/clients/${abModal.id}/ab-test`, { 
        method: "PATCH", 
        body: JSON.stringify({ prompt_b: abModal.promptB, ab_split_active: abModal.abActive }) 
      });
      setClients(clients.map(c => c.id === abModal.id ? { ...c, prompt_b: abModal.promptB, ab_split_active: abModal.abActive } : c));
      setAbModal(null);
    } catch (e) { console.error(e); }
    finally { setSavingAb(false); }
  };

  useEffect(() => {
    api("/admin/clients").then((d) => setClients(d.clients)).catch(console.error);
  }, []);

  const assignNumber = async () => {
    if (!assignModal || !plivoNumber) return;
    setAssigning(true);
    try {
      await api(`/admin/clients/${assignModal.id}/assign-number`, { method: "POST", body: JSON.stringify({ plivo_number: plivoNumber }) });
      setClients(clients.map(c => c.id === assignModal.id ? { ...c, plivo_number: plivoNumber, onboarding_status: "active" } : c));
      setAssignModal(null); setPlivoNumber("");
    } catch (e) { console.error(e); }
    finally { setAssigning(false); }
  };

  const addMinutes = async () => {
    if (!addMinModal || !bonusMins) return;
    setAddingMins(true);
    try {
      await api(`/admin/clients/${addMinModal.id}/add-minutes`, { method: "POST", body: JSON.stringify({ minutes: parseInt(bonusMins) }) });
      setClients(clients.map(c => c.id === addMinModal.id ? { ...c, available_minutes: (c.available_minutes || 0) + parseInt(bonusMins) } : c));
      setAddMinModal(null); setBonusMins("");
    } catch (e) { console.error(e); }
    finally { setAddingMins(false); }
  };

  const impersonate = async (clientId: string) => {
    try {
      const data = await api(`/admin/impersonate/${clientId}`, { method: "POST" });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.client));
      window.location.href = "/dashboard";
    } catch (e) { console.error(e); }
  };

  const changePlan = async () => {
    if (!changePlanModal || !newPlan) return;
    setChangingPlan(true);
    try {
      await api(`/admin/clients/${changePlanModal.id}/change-plan`, { method: "POST", body: JSON.stringify({ plan_name: newPlan }) });
      setClients(clients.map(c => c.id === changePlanModal.id ? { ...c, plan_name: newPlan } : c));
      setChangePlanModal(null); setNewPlan("");
    } catch (e) { console.error(e); }
    finally { setChangingPlan(false); }
  };

  const createClient = async () => {
    setCreating(true);
    try {
      await api("/admin/clients", { method: "POST", body: JSON.stringify(newClient) });
      api("/admin/clients").then((d) => setClients(d.clients));
      setAddClientModal(false);
      setNewClient({ name: "", email: "", password: "", business_name: "", plan_name: "silver", initial_minutes: 0, plivo_number: "" });
    } catch (e) { console.error(e); }
    finally { setCreating(false); }
  };

  const resetPassword = async () => {
    if (!pwModal || !newPw) return;
    setResetting(true);
    try {
      await api(`/admin/clients/${pwModal.id}/password`, { method: "PATCH", body: JSON.stringify({ password: newPw }) });
      setPwModal(null); setNewPw("");
      alert("Password updated successfully!");
    } catch (e) { console.error(e); }
    finally { setResetting(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Client Management</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{clients.length} total clients</p>
        </div>
        <button onClick={() => setAddClientModal(true)} className="btn-primary flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> Add New Client
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="data-table">
          <thead><tr><th>Client</th><th>Plan</th><th>Minutes Left</th><th>Status</th><th>Phone</th><th>Last Call</th><th>Actions</th></tr></thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id}>
                <td>
                  <p className="font-medium" style={{ color: "var(--text-primary)" }}>{c.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{c.email}</p>
                </td>
                <td className="capitalize">{c.plan_name || "—"}</td>
                <td>
                  <span className={c.available_minutes < 50 ? "text-red-400 font-semibold" : ""}>{c.available_minutes ?? 0}</span>
                </td>
                <td><span className={`badge ${c.onboarding_status === "active" ? "badge-success" : "badge-warning"}`}>{c.onboarding_status}</span></td>
                <td className="text-xs" style={{ color: "var(--brand-300)" }}>{c.plivo_number || "—"}</td>
                <td className="text-xs">{c.last_call ? new Date(c.last_call).toLocaleDateString("en-IN") : "Never"}</td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => setAssignModal({ id: c.id, name: c.name })} className="btn-ghost text-xs !py-1 !px-2" title="Assign Number">
                      <Phone className="w-3 h-3" />
                    </button>
                    <button onClick={() => setAddMinModal({ id: c.id, name: c.name })} className="btn-ghost text-xs !py-1 !px-2" title="Add Minutes">
                      <Plus className="w-3 h-3" />
                    </button>
                    <button onClick={() => setChangePlanModal({ id: c.id, name: c.name, currentPlan: c.plan_name || "free" })} className="btn-ghost text-xs !py-1 !px-2" title="Change Plan">
                      <Settings className="w-3 h-3" />
                    </button>
                    <button onClick={() => setPwModal({ id: c.id, name: c.name })} className="btn-ghost text-xs !py-1 !px-2" title="Reset Password">
                      <Key className="w-3 h-3" />
                    </button>
                    <button onClick={() => setAbModal({ id: c.id, name: c.name, promptB: c.prompt_b || "", abActive: c.ab_split_active })} className="btn-ghost text-xs !py-1 !px-2 text-amber-500" title="A/B Testing">
                      <Brain className="w-3 h-3" />
                    </button>
                    <button onClick={() => impersonate(c.id)} className="btn-ghost text-xs !py-1 !px-2 text-indigo-400" title="Login As Client">
                      <UserCircle className="w-3 h-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Assign Number Modal */}
      {assignModal && (
        <Portal>
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setAssignModal(null)}>
            <div className="card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Assign Plivo Number to {assignModal.name}</h3>
            <div className="flex gap-2 mb-4">
              <input value={plivoNumber} onChange={(e) => setPlivoNumber(e.target.value)} className="input-field flex-1" placeholder="+91 XXXX XXXX XX" />
              <button onClick={fetchOwnedNumbers} className="btn-ghost !p-2 border border-white/5" title="Show Inventory (Existing Numbers)">
                <Layout className="w-4 h-4" />
              </button>
              <button onClick={fetchAvailableNumbers} className="btn-ghost !p-2 border border-white/5" title="Search New Numbers to Buy">
                {searchingNumbers && !showInventory ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </button>
            </div>

            {((showInventory && ownedNumbers.length > 0) || (!showInventory && availableNumbers.length > 0)) && (
              <div className="mb-4 max-h-48 overflow-y-auto border border-white/5 rounded-xl bg-white/5 p-2 animate-slide-up">
                <p className="text-[10px] uppercase font-black tracking-widest opacity-40 mb-3 px-1">
                  {showInventory ? "Inventory (Owned Numbers)" : "Available to Buy (+91)"}
                </p>
                {(showInventory ? ownedNumbers : availableNumbers).map((num) => (
                  <button key={num.number} onClick={() => { setPlivoNumber(num.number); setAvailableNumbers([]); setOwnedNumbers([]); }} className="w-full text-left p-2.5 text-xs hover:bg-indigo-500/20 rounded-lg transition-all flex justify-between items-center mb-1 group">
                    <div className="flex flex-col">
                      <span className="font-bold">{num.number}</span>
                      {num.alias && <span className="text-[10px] opacity-40">{num.alias}</span>}
                    </div>
                    <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter ${num.is_assigned ? 'bg-amber-500/20 text-amber-500' : 'bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white'}`}>
                      {num.is_assigned ? 'ASSIGNED' : 'SELECT'}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => { setAssignModal(null); setAvailableNumbers([]); }} className="btn-secondary flex-1 text-sm">Cancel</button>
              <button onClick={() => assignNumber()} disabled={assigning} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : "Assign"}
              </button>
            </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Add Minutes Modal */}
      {addMinModal && (
        <Portal>
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setAddMinModal(null)}>
            <div className="card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Add Minutes to {addMinModal.name}</h3>
              <input type="number" value={bonusMins} onChange={(e) => setBonusMins(e.target.value)} className="input-field mb-4" placeholder="e.g. 100" />
              <div className="flex gap-2">
                <button onClick={() => setAddMinModal(null)} className="btn-secondary flex-1 text-sm">Cancel</button>
                <button onClick={addMinutes} disabled={addingMins} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                  {addingMins ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Minutes"}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
      {/* Change Plan Modal */}
      {changePlanModal && (
        <Portal>
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setChangePlanModal(null)}>
            <div className="card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Change Plan for {changePlanModal.name}</h3>
              <p className="text-xs mb-3 text-white/50">Current: {changePlanModal.currentPlan}</p>
              <select value={newPlan} onChange={(e) => setNewPlan(e.target.value)} className="input-field mb-4">
                <option value="">Select new plan...</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="diamond">Diamond</option>
                <option value="platinum">Platinum</option>
              </select>
              <div className="flex gap-2">
                <button onClick={() => setChangePlanModal(null)} className="btn-secondary flex-1 text-sm">Cancel</button>
                <button onClick={changePlan} disabled={changingPlan || !newPlan} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                  {changingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Plan"}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Add Client Modal */}
      {addClientModal && (
        <Portal>
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setAddClientModal(false)}>
            <div className="card p-8 w-full max-w-xl shadow-2xl relative max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6">
              <h3 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Create Business Account</h3>
              <p className="text-sm opacity-50">Manually provision a new client on the platform</p>
            </div>
            
            <div className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1.5 block">Full Name</label>
                  <input value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} className="input-field" placeholder="John Doe" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1.5 block">Email Address</label>
                  <input type="email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} className="input-field" placeholder="john@example.com" />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1.5 block">Business Name</label>
                  <input value={newClient.business_name} onChange={(e) => setNewClient({ ...newClient, business_name: e.target.value })} className="input-field" placeholder="Acme Corp" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1.5 block">Plivo Phone Number</label>
                  <div className="relative flex gap-2">
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                      <input value={newClient.plivo_number} onChange={(e) => setNewClient({ ...newClient, plivo_number: e.target.value })} className="input-field pl-10" placeholder="+91..." />
                    </div>
                    <button onClick={fetchOwnedNumbers} type="button" className="btn-ghost !p-2 border border-white/5" title="Show Inventory (Owned Numbers)">
                      <Layout className="w-4 h-4" />
                    </button>
                    <button onClick={fetchAvailableNumbers} type="button" className="btn-ghost !p-2 border border-white/5" title="Search New Numbers to Buy">
                      {searchingNumbers && !showInventory ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    </button>
                  </div>
                  {((showInventory && ownedNumbers.length > 0) || (!showInventory && availableNumbers.length > 0)) && (
                    <div className="mt-2 max-h-40 overflow-y-auto border border-white/5 rounded-xl bg-white/5 p-2 animate-slide-down">
                      <p className="text-[10px] uppercase font-black tracking-widest opacity-40 mb-3 px-1">
                        {showInventory ? "Owned Inventory" : "Available to Buy (+91)"}
                      </p>
                      {(showInventory ? ownedNumbers : availableNumbers).map((num) => (
                        <button key={num.number} type="button" onClick={() => { setNewClient({ ...newClient, plivo_number: num.number }); setAvailableNumbers([]); setOwnedNumbers([]); }} className="w-full text-left p-2.5 text-xs hover:bg-indigo-500/20 rounded-lg transition-all flex justify-between items-center mb-1 group">
                          <div className="flex flex-col">
                            <span className="font-bold">{num.number}</span>
                            {num.alias && <span className="text-[10px] opacity-40">{num.alias}</span>}
                          </div>
                          <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter ${num.is_assigned ? 'bg-amber-500/20 text-amber-500' : 'bg-green-500/20 text-green-400 group-hover:bg-green-500 group-hover:text-white'}`}>
                            {num.is_assigned ? 'ASSIGNED' : 'PICK'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1.5 block">Account Password</label>
                <input type="password" value={newClient.password} onChange={(e) => setNewClient({ ...newClient, password: e.target.value })} className="input-field" placeholder="••••••••" />
              </div>

              <div className="grid sm:grid-cols-2 gap-5 p-4 rounded-xl bg-white/5 border border-white/5">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1.5 block">Subscription Plan</label>
                  <select 
                    value={newClient.plan_name} 
                    onChange={(e) => setNewClient({ 
                      ...newClient, 
                      plan_name: e.target.value, 
                      initial_minutes: PLAN_MINUTES[e.target.value] || 0 
                    })} 
                    className="input-field"
                  >
                    <option value="trial">Paid Trial (15 Mins)</option>
                    <option value="silver">Silver Plan</option>
                    <option value="gold">Gold Plan</option>
                    <option value="diamond">Diamond Plan</option>
                    <option value="platinum">Platinum Plan</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1.5 block">Prepaid Minutes</label>
                  <input type="number" value={newClient.initial_minutes} onChange={(e) => setNewClient({ ...newClient, initial_minutes: parseInt(e.target.value) })} className="input-field" placeholder="0" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setAddClientModal(false)} className="btn-secondary flex-1">Discard</button>
              <button onClick={createClient} disabled={creating || !newClient.email || !newClient.password} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create Account <UserPlus className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        </div>
        </Portal>
      )}

      {/* Reset Password Modal */}
      {pwModal && (
        <Portal>
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setPwModal(null)}>
            <div className="card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Reset Password for {pwModal.name}</h3>
              <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="input-field mb-4" placeholder="Enter new password" />
              <div className="flex gap-2">
                <button onClick={() => setPwModal(null)} className="btn-secondary flex-1 text-sm">Cancel</button>
                <button onClick={resetPassword} disabled={resetting || !newPw} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                  {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
      {/* A/B Test Modal */}
      {abModal && (
        <Portal>
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setAbModal(null)}>
            <div className="card p-8 w-full max-w-xl shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
              <div className="mb-6">
                <h3 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>AI A/B Testing — {abModal.name}</h3>
                <p className="text-sm opacity-50">Compare two different AI personalities to see which converts better</p>
              </div>
              
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-widest opacity-40">Test Status</label>
                    <button onClick={() => setAbModal({ ...abModal, abActive: !abModal.abActive })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${abModal.abActive ? 'bg-indigo-600' : 'bg-gray-700'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${abModal.abActive ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  <p className="text-[10px] opacity-40">{abModal.abActive ? "Split traffic 50/50 between Prompt A and Prompt B" : "All traffic currently using Prompt A"}</p>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest opacity-40 mb-2 block">Alternative Prompt (B)</label>
                  <textarea value={abModal.promptB} onChange={(e) => setAbModal({ ...abModal, promptB: e.target.value })} className="input-field min-h-[150px] text-sm" placeholder="Describe the alternative AI personality, greeting, or script..." />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button onClick={() => setAbModal(null)} className="btn-secondary flex-1">Discard</button>
                <button onClick={saveAbTest} disabled={savingAb} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {savingAb ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Save Configuration <Save className="w-4 h-4" /></>}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
