"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { 
  Phone, Plus, Loader2, Settings, UserCircle, UserPlus, 
  Edit2, Trash2, Search, Calendar, Zap, AlertTriangle, X, Layout, RefreshCw, ChevronDown
} from "lucide-react";
import Portal from "@/components/Portal";

export default function AdminClients() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modals
  const [assignModal, setAssignModal] = useState<{ id: string; name: string } | null>(null);
  const [addMinModal, setAddMinModal] = useState<{ id: string; name: string } | null>(null);
  const [changePlanModal, setChangePlanModal] = useState<{ id: string; name: string; currentPlan: string } | null>(null);
  const [addClientModal, setAddClientModal] = useState(false);
  const [editModal, setEditModal] = useState<any | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  // Form States
  const [plivoNumber, setPlivoNumber] = useState("");
  const [bonusMins, setBonusMins] = useState("");
  const [newPlan, setNewPlan] = useState("");
  const [newClient, setNewClient] = useState({ name: "", email: "", password: "", business_name: "", plan_name: "silver", initial_minutes: 200, plivo_number: "" });
  
  // Inventory States
  const [processing, setProcessing] = useState<string | null>(null);
  const [ownedNumbers, setOwnedNumbers] = useState<any[]>([]);
  const [availableNumbers, setAvailableNumbers] = useState<any[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [showInventoryDropdown, setShowInventoryDropdown] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const d = await api("/admin/clients");
      setClients(d.clients || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchOwnedNumbers = async () => {
    setLoadingInventory(true);
    try {
      const data = await api("/admin/plivo/owned-numbers");
      setOwnedNumbers(data.numbers || []);
    } catch (e) { console.error(e); }
    finally { setLoadingInventory(false); }
  };

  const fetchAvailableNumbers = async () => {
    setLoadingInventory(true);
    try {
      const data = await api("/admin/plivo/available-numbers");
      setAvailableNumbers(data.numbers || []);
    } catch (e) { console.error(e); }
    finally { setLoadingInventory(false); }
  };

  const handleAction = async (field: string, actionFn: () => Promise<void>) => {
    setProcessing(field);
    try {
      await actionFn();
      fetchClients();
    } catch (e) { console.error(e); }
    finally { setProcessing(null); }
  };

  const deleteClient = async () => {
    if (!deleteConfirm) return;
    handleAction("delete", async () => {
      await api(`/admin/clients/${deleteConfirm.id}`, { method: "DELETE" });
      setDeleteConfirm(null);
    });
  };

  const updateClient = async () => {
    if (!editModal) return;
    handleAction("edit", async () => {
      await api(`/admin/clients/${editModal.id}`, { 
        method: "PATCH", 
        body: JSON.stringify({ 
          name: editModal.name, 
          email: editModal.email, 
          business_name: editModal.business_name, 
          onboarding_status: editModal.onboarding_status 
        }) 
      });
      setEditModal(null);
    });
  };
  const filteredClients = clients.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.business_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const syncPlivo = async (clientId: string) => {
    setSyncing(clientId);
    try {
      const res = await api(`/admin/clients/${clientId}/sync-plivo`, { method: "POST" });
      alert(res.message);
      fetchClients();
    } catch (e) {
      console.error(e);
      alert("Failed to sync history. Ensure Plivo API credentials are correct.");
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Client Operations</h1>
          <p className="text-sm opacity-50 mt-1">Manage {clients.length} business accounts and telephony assets</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
             <input 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search clients..." 
              className="input-field pl-10 h-10" 
             />
          </div>
          <button onClick={() => setAddClientModal(true)} className="btn-primary h-10 flex items-center gap-2 whitespace-nowrap">
            <UserPlus className="w-4 h-4" /> Add Client
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-40">Client Details</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-40">Usage & Plan</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-40">Status</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-40">Activity</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-40 text-right">Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto opacity-20" /></td></tr>
              ) : filteredClients.length === 0 ? (
                <tr><td colSpan={5} className="p-20 text-center opacity-30 italic">No clients found matching your search.</td></tr>
              ) : filteredClients.map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.01] transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                        <UserCircle className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-white">{c.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] opacity-40 font-medium">{c.email}</span>
                          <span className="w-1 h-1 rounded-full bg-white/10" />
                          <span className="text-[10px] text-indigo-400 font-bold">{c.business_name || "Personal"}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded ${
                          c.plan_name === 'platinum' ? 'bg-indigo-500 text-white' :
                          c.plan_name === 'diamond' ? 'bg-emerald-500 text-white' :
                          'bg-white/10 text-white/60'
                        }`}>
                          {c.plan_name || "FREE"}
                        </span>
                        <div className="flex items-center gap-1">
                          <Zap className={`w-3 h-3 ${c.available_minutes < 50 ? "text-rose-500 animate-pulse" : "text-amber-500"}`} />
                          <span className={`text-xs font-bold ${c.available_minutes < 50 ? "text-rose-500" : "text-white"}`}>
                            {c.available_minutes ?? 0}m
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] font-bold opacity-30 truncate max-w-[120px]">{c.plivo_number || "No number assigned"}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      c.onboarding_status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${c.onboarding_status === 'active' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                      {c.onboarding_status}
                    </div>
                  </td>
                  <td className="p-4 text-xs">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-[10px] font-bold opacity-50">
                        <Calendar className="w-3 h-3" /> {new Date(c.created_at).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' })}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-400">
                        <Phone className="w-3 h-3" /> {c.last_call ? "Active" : "New"}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => {
                        const token = localStorage.getItem("token");
                        api(`/admin/impersonate/${c.id}`, { method: "POST" }).then(data => {
                          localStorage.setItem("original_admin_token", token || "");
                          localStorage.setItem("token", data.token);
                          window.location.href = "/dashboard";
                        });
                      }} className="p-2 hover:bg-indigo-500/10 rounded-lg text-indigo-400" title="Impersonate">
                        <UserCircle className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditModal(c)} className="p-2 hover:bg-white/5 rounded-lg text-white/50 hover:text-white" title="Edit Profile">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setAssignModal({ id: c.id, name: c.name })} className="p-2 hover:bg-white/5 rounded-lg text-white/50 hover:text-white" title="Numbers">
                        <Phone className="w-4 h-4" />
                      </button>
                      <button onClick={() => setAddMinModal({ id: c.id, name: c.name })} className="p-2 hover:bg-white/5 rounded-lg text-white/50 hover:text-white" title="Add Minutes">
                        <Plus className="w-4 h-4" />
                      </button>
                      <button onClick={() => setChangePlanModal({ id: c.id, name: c.name, currentPlan: c.plan_name })} className="p-2 hover:bg-white/5 rounded-lg text-white/50 hover:text-white" title="Plan">
                        <Settings className="w-4 h-4" />
                      </button>
                      <button onClick={() => syncPlivo(c.id)} disabled={syncing === c.id} className={`p-2 hover:bg-emerald-500/10 rounded-lg text-emerald-400 ${syncing === c.id ? "animate-spin" : ""}`} title="Sync Plivo History">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteConfirm({ id: c.id, name: c.name })} className="p-2 hover:bg-rose-500/10 rounded-lg text-rose-500" title="Delete Account">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Client Modal */}
      {editModal && (
        <Portal>
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setEditModal(null)}>
            <div className="card p-8 w-full max-w-lg shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                    <Edit2 className="w-6 h-6 text-indigo-400" />
                 </div>
                 <div>
                    <h3 className="text-xl font-bold text-white">Edit Client Profile</h3>
                    <p className="text-xs opacity-50">Update account credentials and business info</p>
                 </div>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1.5 block">Full Name</label>
                    <input value={editModal.name} onChange={(e) => setEditModal({...editModal, name: e.target.value})} className="input-field" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1.5 block">Email</label>
                    <input value={editModal.email} onChange={(e) => setEditModal({...editModal, email: e.target.value})} className="input-field" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1.5 block">Business Name</label>
                  <input value={editModal.business_name} onChange={(e) => setEditModal({...editModal, business_name: e.target.value})} className="input-field" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1.5 block">Account Status</label>
                  <select value={editModal.onboarding_status} onChange={(e) => setEditModal({...editModal, onboarding_status: e.target.value})} className="input-field">
                    <option value="active">Active</option>
                    <option value="pending">Pending Onboarding</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button onClick={() => setEditModal(null)} className="btn-secondary flex-1 text-sm font-bold">Discard</button>
                <button onClick={updateClient} disabled={processing === 'edit'} className="btn-primary flex-1 h-11 text-sm font-bold flex items-center justify-center gap-2">
                  {processing === 'edit' ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <Portal>
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setDeleteConfirm(null)}>
            <div className="card p-8 w-full max-w-sm border-rose-500/20" onClick={(e) => e.stopPropagation()}>
               <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-6 border border-rose-500/20 text-rose-500">
                  <AlertTriangle className="w-8 h-8" />
               </div>
               <h3 className="text-xl font-bold text-center text-white mb-2">Delete Account?</h3>
               <p className="text-sm opacity-50 text-center mb-8">
                 This will permanently delete <strong>{deleteConfirm.name}</strong> and all their call logs, recordings, and settings. This action cannot be undone.
               </p>
               <div className="flex flex-col gap-2">
                  <button onClick={deleteClient} disabled={processing === 'delete'} className="btn-primary !bg-rose-500 hover:!bg-rose-600 !border-rose-600 h-12 font-bold flex items-center justify-center gap-2">
                    {processing === 'delete' ? <Loader2 className="w-4 h-4 animate-spin" /> : "Yes, Delete Account"}
                  </button>
                  <button onClick={() => setDeleteConfirm(null)} className="btn-ghost h-12 text-sm font-bold opacity-50 hover:opacity-100">Cancel</button>
               </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Add Client Modal */}
      {addClientModal && (
        <Portal>
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { setAddClientModal(false); setShowInventoryDropdown(false); }}>
            <div className="card p-8 w-full max-w-xl shadow-2xl relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-8">
                 <h3 className="text-2xl font-bold text-white">New Business Account</h3>
                 <button onClick={() => setAddClientModal(false)} className="p-2 hover:bg-white/5 rounded-lg opacity-40 hover:opacity-100"><X className="w-5 h-5" /></button>
              </div>
              
              <div className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1.5 block">Full Name</label>
                    <input value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} className="input-field" placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1.5 block">Email Address</label>
                    <input type="email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} className="input-field" placeholder="john@example.com" />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1.5 block">Business Name</label>
                    <input value={newClient.business_name} onChange={(e) => setNewClient({ ...newClient, business_name: e.target.value })} className="input-field" placeholder="Acme Corp" />
                  </div>
                  <div className="relative">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1.5 block">Plivo Number</label>
                    <div className="flex gap-2">
                       <input value={newClient.plivo_number} onChange={(e) => setNewClient({ ...newClient, plivo_number: e.target.value })} className="input-field" placeholder="+91..." />
                       <button 
                        onClick={() => {
                          if (!showInventoryDropdown) fetchOwnedNumbers();
                          setShowInventoryDropdown(!showInventoryDropdown);
                        }} 
                        className="btn-ghost !p-2 border border-white/5 hover:bg-indigo-500/20 text-indigo-400" 
                        title="Browse Owned Inventory"
                       >
                         {loadingInventory ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layout className="w-4 h-4" />}
                       </button>
                    </div>

                    {showInventoryDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1b23] border border-white/10 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto animate-slide-up">
                        <div className="p-2 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#1a1b23]">
                          <span className="text-[9px] font-black uppercase tracking-widest opacity-30 px-1">Available Inventory</span>
                          <button onClick={fetchOwnedNumbers} className="p-1 hover:bg-white/5 rounded"><RefreshCw className={`w-3 h-3 opacity-30 ${loadingInventory ? 'animate-spin' : ''}`} /></button>
                        </div>
                        {ownedNumbers.length === 0 && !loadingInventory ? (
                          <p className="p-4 text-[10px] text-center opacity-30 italic">No numbers available in account.</p>
                        ) : (
                          ownedNumbers.map(n => (
                            <button 
                              key={n.number} 
                              disabled={n.is_assigned}
                              onClick={() => {
                                setNewClient({...newClient, plivo_number: n.number});
                                setShowInventoryDropdown(false);
                              }}
                              className={`w-full text-left p-3 hover:bg-white/5 flex items-center justify-between group transition-colors ${n.is_assigned ? 'opacity-30 cursor-not-allowed' : ''}`}
                            >
                              <div>
                                <p className="text-xs font-bold text-white">{n.number}</p>
                                <p className="text-[9px] opacity-40">{n.alias || "No alias"}</p>
                              </div>
                              {n.is_assigned ? (
                                <span className="text-[8px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">ASSIGNED</span>
                              ) : (
                                <span className="text-[8px] font-black text-indigo-400 group-hover:text-white group-hover:bg-indigo-500 px-1.5 py-0.5 rounded transition-colors">SELECT</span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                   <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1.5 block">Initial Password</label>
                   <input type="password" value={newClient.password} onChange={(e) => setNewClient({ ...newClient, password: e.target.value })} className="input-field" placeholder="••••••••" />
                </div>

                <div className="grid sm:grid-cols-2 gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1.5 block">Plan</label>
                    <select value={newClient.plan_name} onChange={(e) => setNewClient({...newClient, plan_name: e.target.value})} className="input-field">
                      <option value="silver">Silver</option>
                      <option value="gold">Gold</option>
                      <option value="diamond">Diamond</option>
                      <option value="platinum">Platinum</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1.5 block">Prepaid Mins</label>
                    <input type="number" value={newClient.initial_minutes} onChange={(e) => setNewClient({...newClient, initial_minutes: parseInt(e.target.value)})} className="input-field" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button onClick={() => setAddClientModal(false)} className="btn-secondary flex-1 h-12 font-bold">Discard</button>
                <button onClick={() => handleAction('create', async () => {
                  await api("/admin/clients", { method: "POST", body: JSON.stringify(newClient) });
                  setAddClientModal(false);
                })} disabled={processing === 'create'} className="btn-primary flex-1 h-12 font-bold flex items-center justify-center gap-2">
                  {processing === 'create' ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Assign Number Modal */}
      {assignModal && (
        <Portal>
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { setAssignModal(null); setShowInventoryDropdown(false); }}>
            <div className="card p-6 w-full max-w-sm relative" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-bold text-white mb-4">Assign Number to {assignModal.name}</h3>
              <div className="relative mb-4">
                 <div className="flex gap-2">
                    <input value={plivoNumber} onChange={(e) => setPlivoNumber(e.target.value)} className="input-field" placeholder="+91..." />
                    <button 
                      onClick={() => {
                        if (!showInventoryDropdown) fetchOwnedNumbers();
                        setShowInventoryDropdown(!showInventoryDropdown);
                      }} 
                      className="btn-ghost !p-2 border border-white/5 text-indigo-400"
                    >
                      {loadingInventory ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layout className="w-4 h-4" />}
                    </button>
                 </div>

                 {showInventoryDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1b23] border border-white/10 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto">
                    <div className="p-2 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#1a1b23]">
                      <span className="text-[9px] font-black uppercase tracking-widest opacity-30 px-1">Owned Inventory</span>
                      <button onClick={fetchOwnedNumbers} className="p-1 hover:bg-white/5 rounded"><RefreshCw className={`w-3 h-3 opacity-30 ${loadingInventory ? 'animate-spin' : ''}`} /></button>
                    </div>
                    {ownedNumbers.map(n => (
                      <button 
                        key={n.number} 
                        disabled={n.is_assigned}
                        onClick={() => {
                          setPlivoNumber(n.number);
                          setShowInventoryDropdown(false);
                        }}
                        className={`w-full text-left p-3 hover:bg-white/5 flex items-center justify-between ${n.is_assigned ? 'opacity-30' : ''}`}
                      >
                        <span className="text-xs font-bold text-white">{n.number}</span>
                        {!n.is_assigned && <span className="text-[8px] font-black text-indigo-400">SELECT</span>}
                      </button>
                    ))}
                  </div>
                 )}
              </div>
              <div className="flex gap-2">
                 <button onClick={() => setAssignModal(null)} className="btn-secondary flex-1 text-xs font-bold">Cancel</button>
                 <button onClick={() => handleAction('assign', async () => {
                   await api(`/admin/clients/${assignModal.id}/assign-number`, { method: "POST", body: JSON.stringify({ plivo_number: plivoNumber }) });
                   setAssignModal(null);
                 })} disabled={processing === 'assign'} className="btn-primary flex-1 text-xs font-bold">
                    {processing === 'assign' ? <Loader2 className="w-3 h-3 animate-spin" /> : "Assign"}
                 </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Add Minutes Modal */}
      {addMinModal && (
        <Portal>
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setAddMinModal(null)}>
            <div className="card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-bold text-white mb-4">Add Minutes to {addMinModal.name}</h3>
              <input type="number" value={bonusMins} onChange={(e) => setBonusMins(e.target.value)} className="input-field mb-4" placeholder="e.g. 100" />
              <div className="flex gap-2">
                 <button onClick={() => setAddMinModal(null)} className="btn-secondary flex-1 text-xs font-bold">Cancel</button>
                 <button onClick={() => handleAction('add_mins', async () => {
                   await api(`/admin/clients/${addMinModal.id}/add-minutes`, { method: "POST", body: JSON.stringify({ minutes: parseInt(bonusMins) }) });
                   setAddMinModal(null);
                 })} disabled={processing === 'add_mins'} className="btn-primary flex-1 text-xs font-bold">
                    {processing === 'add_mins' ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add Minutes"}
                 </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Change Plan Modal */}
      {changePlanModal && (
        <Portal>
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setChangePlanModal(null)}>
            <div className="card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-bold text-white mb-4">Update Plan for {changePlanModal.name}</h3>
              <select value={newPlan} onChange={(e) => setNewPlan(e.target.value)} className="input-field mb-4">
                 <option value="silver">Silver</option>
                 <option value="gold">Gold</option>
                 <option value="diamond">Diamond</option>
                 <option value="platinum">Platinum</option>
              </select>
              <div className="flex gap-2">
                 <button onClick={() => setChangePlanModal(null)} className="btn-secondary flex-1 text-xs font-bold">Cancel</button>
                 <button onClick={() => handleAction('change_plan', async () => {
                   await api(`/admin/clients/${changePlanModal.id}/change-plan`, { method: "POST", body: JSON.stringify({ plan_name: newPlan }) });
                   setChangePlanModal(null);
                 })} disabled={processing === 'change_plan'} className="btn-primary flex-1 text-xs font-bold">
                    {processing === 'change_plan' ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save Plan"}
                 </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
