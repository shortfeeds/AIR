"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Phone, Plus, Loader2, Settings, UserCircle, UserPlus, Key, Mail, Lock, Building } from "lucide-react";

export default function AdminClients() {
  const [clients, setClients] = useState<any[]>([]);
  const [assignModal, setAssignModal] = useState<{ id: string; name: string } | null>(null);
  const [plivoNumber, setPlivoNumber] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [addMinModal, setAddMinModal] = useState<{ id: string; name: string } | null>(null);
  const [bonusMins, setBonusMins] = useState("");
  const [addingMins, setAddingMins] = useState(false);
  const [changePlanModal, setChangePlanModal] = useState<{ id: string; name: string; currentPlan: string } | null>(null);
  const [changingPlan, setChangingPlan] = useState(false);
  const [addClientModal, setAddClientModal] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", email: "", password: "", business_name: "", plan_name: "silver", initial_minutes: 0 });
  const [creating, setCreating] = useState(false);
  const [pwModal, setPwModal] = useState<{ id: string; name: string } | null>(null);
  const [newPw, setNewPw] = useState("");
  const [resetting, setResetting] = useState(false);

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
      setNewClient({ name: "", email: "", password: "", business_name: "", plan_name: "silver", initial_minutes: 0 });
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setAssignModal(null)}>
          <div className="card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Assign Plivo Number to {assignModal.name}</h3>
            <input value={plivoNumber} onChange={(e) => setPlivoNumber(e.target.value)} className="input-field mb-4" placeholder="+91 XXXX XXXX XX" />
            <div className="flex gap-2">
              <button onClick={() => setAssignModal(null)} className="btn-secondary flex-1 text-sm">Cancel</button>
              <button onClick={assignNumber} disabled={assigning} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Minutes Modal */}
      {addMinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setAddMinModal(null)}>
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
      )}
      {/* Change Plan Modal */}
      {changePlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setChangePlanModal(null)}>
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
      )}

      {/* Add Client Modal */}
      {addClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setAddClientModal(false)}>
          <div className="card p-6 w-full max-w-md my-8" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Add New Client Account</h3>
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase opacity-40 mb-1 block">Full Name</label>
                  <input value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} className="input-field" placeholder="John Doe" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase opacity-40 mb-1 block">Email Address</label>
                  <input type="email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} className="input-field" placeholder="john@example.com" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase opacity-40 mb-1 block">Business Name</label>
                <input value={newClient.business_name} onChange={(e) => setNewClient({ ...newClient, business_name: e.target.value })} className="input-field" placeholder="Acme Corp" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase opacity-40 mb-1 block">Password</label>
                <input type="password" value={newClient.password} onChange={(e) => setNewClient({ ...newClient, password: e.target.value })} className="input-field" placeholder="••••••••" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase opacity-40 mb-1 block">Initial Plan</label>
                  <select value={newClient.plan_name} onChange={(e) => setNewClient({ ...newClient, plan_name: e.target.value })} className="input-field">
                    <option value="silver">Silver</option>
                    <option value="gold">Gold</option>
                    <option value="diamond">Diamond</option>
                    <option value="platinum">Platinum</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase opacity-40 mb-1 block">Initial Minutes</label>
                  <input type="number" value={newClient.initial_minutes} onChange={(e) => setNewClient({ ...newClient, initial_minutes: parseInt(e.target.value) })} className="input-field" placeholder="0" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setAddClientModal(false)} className="btn-secondary flex-1 text-sm">Cancel</button>
              <button onClick={createClient} disabled={creating || !newClient.email || !newClient.password} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {pwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setPwModal(null)}>
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
      )}
    </div>
  );
}
