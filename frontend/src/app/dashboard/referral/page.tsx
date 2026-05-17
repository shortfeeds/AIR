"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  Users, Gift, Share2, Copy, Check, 
  ArrowRight, Award, Zap, TrendingUp,
  Loader2
} from "lucide-react";
import { toast } from "react-hot-toast";

export default function ReferralPage() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [userRes, statsRes] = await Promise.all([
        api('/auth/me'),
        api('/subscriptions') // We'll add referral stats to this or a new endpoint
      ]);
      setUser(userRes.user);
      setStats(statsRes.subscription);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const copyReferral = () => {
    const code = user?.referral_code;
    if (!code) return;
    const url = `${window.location.origin}/signup?ref=${code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Referral link copied!");
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
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl p-8 md:p-12 border border-white/10 bg-gradient-to-br from-indigo-600/20 via-transparent to-transparent">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <Gift size={200} className="text-indigo-500" />
        </div>
        
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-6">
            <Award className="w-3 h-3" /> Referral Program
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
            Share the Future of <span className="text-indigo-400">Receptionists.</span>
          </h1>
          <p className="text-lg text-white/60 mb-8 leading-relaxed">
            Invite your fellow business owners to Trinity Pixels. When they subscribe, **you both get 50 free calling minutes** as a reward!
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-medium">
              <span className="opacity-40 select-none">Code:</span>
              <span className="tracking-widest font-black text-indigo-400 uppercase">{user?.referral_code}</span>
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
        <div className="card p-6 bg-white/5 border border-white/10 rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-4">
            <Users className="w-5 h-5 text-indigo-400" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest opacity-40 mb-1">Friends Referred</p>
          <p className="text-3xl font-black text-white">0</p>
        </div>
        
        <div className="card p-6 bg-white/5 border border-white/10 rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
            <Zap className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest opacity-40 mb-1">Bonus Mins Earned</p>
          <p className="text-3xl font-black text-emerald-400">0</p>
        </div>

        <div className="card p-6 bg-white/5 border border-white/10 rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4">
            <TrendingUp className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest opacity-40 mb-1">Reward Status</p>
          <p className="text-sm font-bold text-white mt-1">Available for new referrals</p>
        </div>
      </div>

      {/* How it works */}
      <div className="card p-8 bg-white/5 border border-white/10 rounded-3xl">
        <h3 className="text-xl font-bold text-white mb-8">How it works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-black">1</div>
            <p className="font-bold text-white">Share your link</p>
            <p className="text-sm opacity-50">Send your unique invite link to friends, clients, or business partners.</p>
          </div>
          <div className="space-y-4">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-black">2</div>
            <p className="font-bold text-white">They Sign Up</p>
            <p className="text-sm opacity-50">They get access to the world&apos;s most advanced AI Voice Receptionist.</p>
          </div>
          <div className="space-y-4">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-black">3</div>
            <p className="font-bold text-white">Get Rewarded</p>
            <p className="text-sm opacity-50">Once they upgrade to any plan, both of you get 50 bonus minutes instantly.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
