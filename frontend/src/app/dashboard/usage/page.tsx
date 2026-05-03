"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CreditCard, History, Zap, CheckCircle, Loader2, FileText, TrendingUp, Calendar, Info, PlusCircle } from "lucide-react";

interface Subscription {
  plan_name: string;
  available_minutes: number;
  total_minutes_purchased: number;
  usage_percentage: string;
  status: string;
  billing_cycle_end: string;
}

interface Transaction {
  id: string;
  plan_name: string;
  amount_inr: number;
  minutes_purchased: number;
  status: string;
  created_at: string;
}

const TOPUP_OPTIONS = [
  { id: "topup_100", mins: 100, price: 1500, label: "Starter", desc: "Best for low volume days" },
  { id: "topup_500", mins: 500, price: 6000, label: "Professional", desc: "Value for growing shops", best: true },
  { id: "topup_1000", mins: 1000, price: 10000, label: "Enterprise", desc: "For high-traffic periods" },
];

const FEATURE_ADDONS = [
  { id: "addon_number", label: "Extra AI Number", price: 1500, desc: "Get an additional +91 number" },
  { id: "addon_intercept", label: "Live Interception", price: 2500, desc: "Bridge into calls manually" },
];

const PLAN_UPGRADES = [
  { id: "silver", mins: 200, price: 2999, label: "Silver" },
  { id: "gold", mins: 500, price: 4999, label: "Gold" },
  { id: "diamond", mins: 1000, price: 7999, label: "Diamond" },
  { id: "platinum", mins: 2000, price: 9999, label: "Platinum" },
];

export default function UsagePage() {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recharging, setRecharging] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api("/subscriptions"),
      api("/subscriptions/transactions"),
    ]).then(([subData, txData]) => {
      setSub(subData.subscription);
      setTransactions(txData.transactions);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const usedPercent = sub ? Math.max(0, 100 - parseFloat(sub.usage_percentage || "0")) : 0;
  const isLowMinutes = sub ? sub.available_minutes < 50 : false;

  const handlePayment = async (planId: string) => {
    setRecharging(planId);
    try {
      const { order_id, amount, currency, key_id } = await api("/payments/create-order", {
        method: "POST",
        body: JSON.stringify({ plan: planId }),
      });

      const res = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
      if (!res) { alert("Razorpay SDK failed to load."); return; }

      const options = {
        key: key_id,
        amount: amount,
        currency: currency,
        name: "Trinity Pixels",
        description: `Activation: ${planId}`,
        order_id: order_id,
        handler: async function (_response: any) {
          alert("Payment successful! Your account is being updated.");
          window.location.reload();
        },
        theme: { color: "#6366f1" },
        prefill: {
          name: localStorage.getItem("user_name") || "",
          email: localStorage.getItem("user_email") || ""
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (e) {
      console.error(e);
      alert("Failed to initiate payment.");
    } finally {
      setRecharging(null);
    }
  };

  const loadScript = (src: string) => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm opacity-50">Loading billing data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Usage & Billing</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Monitor your talk time consumption and manage subscriptions</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge ${sub?.status === 'active' ? 'badge-success' : 'badge-warning'} px-3 py-1`}>
            {sub?.status === 'active' ? 'Subscription Active' : 'Action Required'}
          </span>
          <span className="text-[10px] uppercase font-bold tracking-widest opacity-30 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Ends: {sub?.billing_cycle_end ? new Date(sub.billing_cycle_end).toLocaleDateString() : 'N/A'}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Usage Card (Gauge) */}
        <div className="lg:col-span-4 card p-8 flex flex-col items-center justify-center relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
          
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-8 opacity-40">Live Minutes Balance</p>
          
          <div className="relative w-52 h-52 mb-8">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="104" cy="104" r="94" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/5" />
              <circle cx="104" cy="104" r="94" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={590.6} strokeDashoffset={590.6 * (1 - usedPercent / 100)} className={`${isLowMinutes ? "text-amber-500" : "text-indigo-500"} transition-all duration-1000 ease-out`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center transform rotate-90">
              <span className={`text-6xl font-black ${isLowMinutes ? "text-amber-500" : ""}`} style={{ color: "var(--text-primary)" }}>{sub?.available_minutes || 0}</span>
              <span className="text-[10px] uppercase font-bold tracking-widest opacity-30 mt-1">Remaining</span>
            </div>
          </div>

          <div className="w-full space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="opacity-50">Current Plan</span>
              <span className="font-bold uppercase tracking-wider text-indigo-400">{sub?.plan_name || "N/A"}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="opacity-50">Total Lifetime Purchased</span>
              <span className="font-bold">{sub?.total_minutes_purchased.toLocaleString()}</span>
            </div>
          </div>

          {isLowMinutes && (
            <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
              <Info className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] leading-relaxed text-amber-200/70">
                Your balance is running low. Your AI may stop answering calls once it hits zero.
              </p>
            </div>
          )}
        </div>

        {/* Top-ups & Add-ons Grid */}
        <div className="lg:col-span-8 space-y-6">
          {/* Quick Recharges */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400" /> Minute Top-up Packs
              </h3>
              <TrendingUp className="w-4 h-4 opacity-20" />
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {TOPUP_OPTIONS.map((opt) => (
                <button key={opt.id} onClick={() => handlePayment(opt.id)} disabled={!!recharging} className={`group p-5 rounded-2xl border transition-all text-left relative overflow-hidden ${opt.best ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10'}`}>
                  {opt.best && <div className="absolute top-0 right-0 px-2 py-0.5 bg-indigo-500 text-[8px] font-black uppercase tracking-tighter rounded-bl-lg">Best Value</div>}
                  <div className="relative z-10">
                    <p className="text-xs font-bold opacity-40 uppercase tracking-widest mb-1">{opt.label}</p>
                    <p className="text-2xl font-black text-white">{opt.mins} <span className="text-xs font-normal opacity-50">Mins</span></p>
                    <p className="text-sm font-bold mt-4 text-indigo-400">₹{opt.price.toLocaleString("en-IN")}</p>
                  </div>
                  {recharging === opt.id ? (
                    <Loader2 className="absolute right-4 bottom-4 w-4 h-4 animate-spin text-indigo-500" />
                  ) : (
                    <div className="absolute right-[-10px] bottom-[-10px] opacity-[0.02] group-hover:opacity-10 transition-opacity">
                      <PlusCircle size={80} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Feature Add-ons */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="font-bold flex items-center gap-2 mb-6" style={{ color: "var(--text-primary)" }}>
                <PlusCircle className="w-4 h-4 text-emerald-400" /> Feature Add-ons
              </h3>
              <div className="space-y-4">
                {FEATURE_ADDONS.map((addon) => (
                  <div key={addon.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <div>
                      <p className="text-sm font-bold text-white">{addon.label}</p>
                      <p className="text-[10px] opacity-40">{addon.desc}</p>
                    </div>
                    <button onClick={() => handlePayment(addon.id)} disabled={!!recharging} className="btn-secondary !py-1.5 !px-3 !text-[10px] uppercase font-bold tracking-widest">
                      {recharging === addon.id ? <Loader2 className="w-3 h-3 animate-spin" /> : `₹${addon.price}`}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <h3 className="font-bold flex items-center gap-2 mb-6" style={{ color: "var(--text-primary)" }}>
                <CreditCard className="w-4 h-4 text-indigo-400" /> Monthly Plan
              </h3>
              <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 mb-4">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs font-bold opacity-50">Current Active Plan</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold uppercase tracking-tighter">Active</span>
                </div>
                <p className="text-xl font-bold capitalize">{sub?.plan_name || "Starter"}</p>
              </div>
              <button onClick={() => window.location.hash = "pricing"} className="w-full py-2.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-xs font-bold opacity-60 transition-all">
                Change Subscription Plan
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 opacity-50" />
            <h3 className="font-bold" style={{ color: "var(--text-primary)" }}>Billing History</h3>
          </div>
          <p className="text-[10px] uppercase tracking-widest opacity-30 font-bold">Past 12 Months</p>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Transaction Date</th>
                <th>Purchased Item</th>
                <th>Credits</th>
                <th>Amount Paid</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 opacity-30 text-sm">No transactions yet. Billing records will appear here after your first purchase.</td></tr>
              ) : transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-white/[0.01] transition-colors">
                  <td className="text-xs opacity-60">{new Date(tx.created_at).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td className="font-semibold text-sm capitalize">{tx.plan_name.replace("_", " ")}</td>
                  <td>
                    <span className="text-xs font-mono">{tx.minutes_purchased > 0 ? `+${tx.minutes_purchased}` : "—"}</span>
                  </td>
                  <td className="font-bold text-white">₹{Number(tx.amount_inr).toLocaleString("en-IN")}</td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${tx.status === "captured" ? "bg-emerald-500" : "bg-amber-500"}`} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">{tx.status}</span>
                    </div>
                  </td>
                  <td className="text-right">
                    {tx.status === "captured" && (
                      <a href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}/payments/invoice/${tx.id}?token=${localStorage.getItem("token")}`} target="_blank" className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase tracking-widest transition-all">
                        <FileText className="w-3.5 h-3.5" /> Invoice
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 opacity-30 py-8">
        <CreditCard className="w-4 h-4" />
        <p className="text-[10px] font-bold uppercase tracking-widest">Secure Payments by Razorpay · PCI DSS Compliant</p>
      </div>
    </div>
  );
}

