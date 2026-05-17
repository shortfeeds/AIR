"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  Users, Gift, Share2, Copy, Check, 
  Award, Zap, TrendingUp, Loader2, Wallet, 
  ArrowUpRight, ArrowDownLeft, Clock, Info
} from "lucide-react";
import { toast } from "react-hot-toast";

export default function ReferralPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api('/referrals');
      setStats(res);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load referral statistics");
    } finally {
      setLoading(false);
    }
  };

  const copyReferral = () => {
    const link = stats?.referralLink;
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Unique invite link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Hero Header Card */}
      <div className="relative overflow-hidden rounded-3xl p-8 md:p-12 border border-white/10 bg-gradient-to-br from-indigo-900/40 via-slate-900 to-slate-950">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <Gift size={200} className="text-indigo-500" />
        </div>
        
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-6">
            <Award className="w-3 h-3" /> Double Sided Reward
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
            Invite Businesses. <br />
            <span className="text-indigo-400">Get ₹500 in Wallet.</span>
          </h1>
          <p className="text-lg text-white/60 mb-8 leading-relaxed">
            Invite business owners to automate their customer service with Trinity Pixels. 
            Once they upgrade, **both you and your referred business get ₹500 credits** directly credited to your wallets, valid for 1 full year!
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-medium">
              <span className="opacity-40 select-none">Code:</span>
              <span className="tracking-widest font-black text-indigo-400 uppercase">{stats?.referralCode}</span>
              <button 
                onClick={copyReferral}
                className="ml-auto p-2 hover:bg-white/5 rounded-lg transition-colors text-indigo-400"
              >
                {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            <button 
              onClick={copyReferral}
              className="px-8 py-4 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3"
            >
              <Share2 className="w-5 h-5" /> Copy Invite Link
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 bg-slate-900/60 border border-white/5 rounded-2xl shadow-xl backdrop-blur-md relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-300">
            <Wallet size={80} className="text-indigo-400" />
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-4">
            <Wallet className="w-5 h-5 text-indigo-400" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest opacity-40 mb-1">Active Wallet Balance</p>
          <p className="text-3xl font-black text-white">₹{(stats?.activeBalance || 0).toLocaleString('en-IN')}</p>
          <p className="text-xs text-white/40 mt-2 flex items-center gap-1">
            <Clock className="w-3 h-3 text-indigo-400" /> Valid up to 1 year
          </p>
        </div>
        
        <div className="card p-6 bg-slate-900/60 border border-white/5 rounded-2xl shadow-xl backdrop-blur-md relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-300">
            <Gift size={80} className="text-emerald-400" />
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
            <Zap className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest opacity-40 mb-1">Total Earned Credits</p>
          <p className="text-3xl font-black text-emerald-400">₹{(stats?.totalEarned || 0).toLocaleString('en-IN')}</p>
          <p className="text-xs text-white/40 mt-2">All-time lifetime rewards</p>
        </div>

        <div className="card p-6 bg-slate-900/60 border border-white/5 rounded-2xl shadow-xl backdrop-blur-md relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-300">
            <Users size={80} className="text-amber-400" />
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4">
            <Users className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest opacity-40 mb-1">Invites Joined / Activated</p>
          <p className="text-3xl font-black text-white">{stats?.successfulReferralsCount} <span className="text-lg font-medium opacity-40">/ {stats?.referredUsersCount}</span></p>
          <p className="text-xs text-white/40 mt-2">Activates on their first subscription purchase</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Invites List */}
        <div className="card p-6 bg-slate-900/40 border border-white/5 rounded-3xl shadow-lg">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" /> Friends Invited
          </h3>
          {stats?.invites && stats.invites.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="pb-3 text-xs font-bold uppercase tracking-wider text-white/40">Business Details</th>
                    <th className="pb-3 text-xs font-bold uppercase tracking-wider text-white/40">Date Joined</th>
                    <th className="pb-3 text-xs font-bold uppercase tracking-wider text-white/40">Reward Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {stats.invites.map((invite: any) => (
                    <tr key={invite.id} className="text-sm">
                      <td className="py-4">
                        <div className="font-semibold text-white">{invite.name}</div>
                        <div className="text-xs text-white/40">{invite.email}</div>
                      </td>
                      <td className="py-4 text-white/60">
                        {new Date(invite.joined_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          invite.status.includes('Activated') 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-white/5 text-white/40 border border-white/10'
                        }`}>
                          {invite.status.includes('Activated') ? 'Activated' : 'Joined'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-white/40 text-sm">
              No friend has signed up using your link yet. Share your code to get started!
            </div>
          )}
        </div>

        {/* Wallet Ledger History */}
        <div className="card p-6 bg-slate-900/40 border border-white/5 rounded-3xl shadow-lg">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-indigo-400" /> Wallet Transactions Ledger
          </h3>
          {stats?.ledger && stats.ledger.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="pb-3 text-xs font-bold uppercase tracking-wider text-white/40">Activity</th>
                    <th className="pb-3 text-xs font-bold uppercase tracking-wider text-white/40">Amount</th>
                    <th className="pb-3 text-xs font-bold uppercase tracking-wider text-white/40">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {stats.ledger.map((log: any) => (
                    <tr key={log.id} className="text-sm">
                      <td className="py-4 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          log.type === 'credit' ? 'bg-emerald-500/10' : 'bg-rose-500/10'
                        }`}>
                          {log.type === 'credit' ? (
                            <ArrowUpRight className={`w-4 h-4 ${log.type === 'credit' ? 'text-emerald-400' : 'text-rose-400'}`} />
                          ) : (
                            <ArrowDownLeft className="w-4 h-4 text-rose-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{log.description}</div>
                          <div className="text-xs text-white/40 capitalize">{log.type}</div>
                        </div>
                      </td>
                      <td className={`py-4 font-black ${
                        log.type === 'credit' ? 'text-emerald-400' : 'text-rose-400/80'
                      }`}>
                        {log.amount_display}
                      </td>
                      <td className="py-4 text-white/60">
                        {new Date(log.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-white/40 text-sm">
              Your wallet ledger is currently empty.
            </div>
          )}
        </div>
      </div>

      {/* Rules Notice */}
      <div className="rounded-2xl p-4 bg-slate-900/20 border border-white/5 flex items-start gap-3">
        <Info className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-white/55 space-y-1">
          <p className="font-bold text-white/80">Referral Terms & Conditions</p>
          <p>• To trigger the bonus, the referred user must sign up via your link and complete their first captured subscription (Starter, Growth, Pro, or Scale plan).</p>
          <p>• Wallet credits cannot be exchanged for cash, and they expire exactly 1 year (365 days) from the date they are added to your wallet ledger.</p>
          <p>• Credits are automatically deducted from the earliest expiring balance first (FIFO model) when purchasing new plans, upgrades, or topups.</p>
        </div>
      </div>
    </div>
  );
}
