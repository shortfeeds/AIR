"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  CreditCard, History, Zap, Loader2, FileText, 
  TrendingUp, Calendar, Info, PlusCircle, 
  ChevronRight, Check, Sparkles, Wallet, Award, ShieldCheck
} from "lucide-react";
import { toast } from "react-hot-toast";

interface Subscription {
  plan_name: string;
  available_minutes: number;
  total_minutes_purchased: number;
  usage_percentage: string;
  status: string;
  billing_cycle_end: string;
  active_wallet_balance?: number;
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
  { id: "topup_50", mins: 50, price: 500, label: "Mini", desc: "Just a few calls" },
  { id: "topup_100", mins: 100, price: 1000, label: "Starter", desc: "Best for low volume days" },
  { id: "topup_200", mins: 200, price: 2000, label: "Value", desc: "Standard recharge", best: true },
];

const FEATURE_ADDONS = [
  { id: "addon_number", label: "Extra AI Number", price: 1500, desc: "Get an additional +91 number" },
  { id: "addon_intercept", label: "Live Interception", price: 2500, desc: "Bridge into calls manually" },
];

const ALL_PLANS = [
  {
    id: "starter",
    annualId: "starter_annual",
    name: "Starter",
    mins: 200,
    annualMins: 2400,
    price: 2999,
    annualPrice: 29990,
    save: 5990,
    desc: "For growing startups & local boutiques"
  },
  {
    id: "growth",
    annualId: "growth_annual",
    name: "Growth",
    mins: 500,
    annualMins: 6000,
    price: 4999,
    annualPrice: 49990,
    save: 9990,
    desc: "For mid-size agencies & active firms"
  },
  {
    id: "pro",
    annualId: "pro_annual",
    name: "Pro",
    mins: 1000,
    annualMins: 12000,
    price: 7999,
    annualPrice: 79990,
    save: 15990,
    popular: true,
    desc: "Perfect for scaling businesses & e-commerce"
  },
  {
    id: "scale",
    annualId: "scale_annual",
    name: "Scale",
    mins: 2000,
    annualMins: 24000,
    price: 9999,
    annualPrice: 99990,
    save: 19990,
    desc: "For high-volume enterprises & call centers"
  }
];

const PLAN_FEATURES = [
  "24/7 Availability (Never offline. Never tired)",
  "Instant Smart Responses (Zero wait. Maximum impact)",
  "Fully Managed Setup & Optimization",
  "Secure & Compliant Enterprise Shield",
  "Multilingual Support (Speak their language)"
];

export default function UsagePage() {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recharging, setRecharging] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradeModal, setUpgradeModal] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = () => {
    Promise.all([
      api("/subscriptions"),
      api("/subscriptions/transactions"),
    ]).then(([subData, txData]) => {
      setSub(subData.subscription);
      setTransactions(txData.transactions);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      toast.error("Failed to load subscription details");
      setLoading(false);
    });
  };

  const usedPercent = sub ? Math.max(0, 100 - parseFloat(sub.usage_percentage || "0")) : 0;
  const isLowMinutes = sub ? sub.available_minutes < 50 : false;
  const walletBalance = sub?.active_wallet_balance || 0;

  const handlePayment = async (planId: string, isUpgrade = false) => {
    setRecharging(planId);
    try {
      const orderData = await api("/payments/create-order", {
        method: "POST",
        body: JSON.stringify({ plan: planId, isUpgrade }),
      });

      // ₹0 fully wallet funded checkout!
      if (orderData.isFullyCredited) {
        await api("/payments/complete-free-order", {
          method: "POST",
          body: JSON.stringify({ orderId: orderData.orderId }),
        });
        toast.success("Order processed successfully with ₹0 wallet checkout!");
        setUpgradeModal(null);
        fetchBillingData();
        return;
      }

      const { order_id, amount, currency, key_id } = orderData;
      const res = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
      if (!res) { 
        toast.error("Razorpay SDK failed to load. Please check your internet connection."); 
        return; 
      }

      const options = {
        key: key_id,
        amount: amount,
        currency: currency,
        name: "Trinity Pixels",
        description: `Activation: ${planId}`,
        order_id: order_id,
        handler: async function (_response: any) {
          toast.success("Payment successful! Your subscription is active.");
          setUpgradeModal(null);
          fetchBillingData();
        },
        theme: { color: "#6366f1" },
        prefill: {
          name: localStorage.getItem("user_name") || "",
          email: localStorage.getItem("user_email") || ""
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to initiate transaction");
    } finally {
      setRecharging(null);
    }
  };

  const handleUpgradeClick = async (planId: string) => {
    setCalculating(true);
    try {
      const data = await api("/payments/calculate-upgrade", {
        method: "POST",
        body: JSON.stringify({ targetPlan: planId })
      });
      setUpgradeModal(data);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to calculate pro-rata upgrade");
    } finally {
      setCalculating(false);
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
        <p className="text-sm opacity-50">Loading billing engine...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto pb-12">
      {/* Wallet Balance Banner */}
      {walletBalance > 0 && (
        <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-r from-indigo-950/60 to-slate-900 border border-indigo-500/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Active Wallet Balance: ₹{walletBalance.toLocaleString('en-IN')}</p>
              <p className="text-xs text-white/50">These credits will be automatically applied to get instant discount on checkout!</p>
            </div>
          </div>
          <div className="hidden sm:block text-xs font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
            ₹{walletBalance} Auto-Applied
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">Usage & Billing</h1>
          <p className="text-sm mt-1 text-white/50">Monitor call minute consumption, manage top-ups, and choose a premium base plan</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
            sub?.status === 'active' 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}>
            {sub?.status === 'active' ? 'Active' : 'Unsubscribed'}
          </span>
          <span className="text-[10px] uppercase font-bold tracking-widest opacity-35 flex items-center gap-1 text-white">
            <Calendar className="w-3.5 h-3.5" /> Next Cycle: {sub?.billing_cycle_end ? new Date(sub.billing_cycle_end).toLocaleDateString('en-IN') : 'N/A'}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Usage Card (Gauge) */}
        <div className="lg:col-span-4 card p-8 bg-slate-900/60 border border-white/5 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden group shadow-xl backdrop-blur-md">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
          
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-8 opacity-45 text-white">Live Minutes Balance</p>
          
          <div className="relative w-52 h-52 mb-8">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="104" cy="104" r="94" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/5" />
              <circle cx="104" cy="104" r="94" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={590.6} strokeDashoffset={590.6 * (1 - usedPercent / 100)} className={`${isLowMinutes ? "text-amber-500" : "text-indigo-500"} transition-all duration-1000 ease-out`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center transform rotate-90">
              <span className={`text-6xl font-black text-white ${isLowMinutes ? "text-amber-500" : ""}`}>{sub?.available_minutes || 0}</span>
              <span className="text-[10px] uppercase font-bold tracking-widest opacity-30 mt-1">Remaining Mins</span>
            </div>
          </div>

          <div className="w-full space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="opacity-50 text-white">Current Subscribed Plan</span>
              <span className="font-black uppercase tracking-wider text-indigo-400">{sub?.plan_name || "Free"}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="opacity-50 text-white">Total Purchased Minutes</span>
              <span className="font-bold text-white">{sub?.total_minutes_purchased.toLocaleString()} Mins</span>
            </div>
          </div>

          {isLowMinutes && (
            <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
              <Info className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] leading-relaxed text-amber-200/70">
                Your remaining call balance is low. Upgrade to a base plan or buy topups to prevent interruption.
              </p>
            </div>
          )}
        </div>

        {/* Top-ups & Add-ons Grid */}
        <div className="lg:col-span-8 space-y-6">
          {/* Quick Recharges */}
          <div className="card p-6 bg-slate-900/40 border border-white/5 rounded-3xl shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400" /> Minute Top-up Packs
              </h3>
              <TrendingUp className="w-4 h-4 opacity-20 text-white" />
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {TOPUP_OPTIONS.map((opt) => (
                <button key={opt.id} onClick={() => handlePayment(opt.id)} disabled={!!recharging} className={`group p-5 rounded-2xl border transition-all text-left relative overflow-hidden ${opt.best ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10'}`}>
                  {opt.best && <div className="absolute top-0 right-0 px-2 py-0.5 bg-indigo-500 text-[8px] font-black uppercase tracking-tighter rounded-bl-lg text-white">Best Value</div>}
                  <div className="relative z-10">
                    <p className="text-xs font-bold opacity-40 uppercase tracking-widest mb-1 text-white">{opt.label}</p>
                    <p className="text-2xl font-black text-white">{opt.mins} <span className="text-xs font-normal opacity-50">Mins</span></p>
                    <p className="text-sm font-bold mt-4 text-indigo-400">₹{opt.price.toLocaleString("en-IN")}</p>
                  </div>
                  {recharging === opt.id ? (
                    <Loader2 className="absolute right-4 bottom-4 w-4 h-4 animate-spin text-indigo-500" />
                  ) : (
                    <div className="absolute right-[-10px] bottom-[-10px] opacity-[0.02] group-hover:opacity-10 transition-opacity text-white">
                      <PlusCircle size={80} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Feature Add-ons */}
          <div className="card p-6 bg-slate-900/40 border border-white/5 rounded-3xl shadow-xl">
            <h3 className="font-bold text-white flex items-center gap-2 mb-6">
              <PlusCircle className="w-4 h-4 text-emerald-400" /> Premium Add-ons
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {FEATURE_ADDONS.map((addon) => (
                <div key={addon.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div>
                    <p className="text-sm font-bold text-white">{addon.label}</p>
                    <p className="text-[10px] opacity-40 text-white">{addon.desc}</p>
                  </div>
                  <button onClick={() => handlePayment(addon.id)} disabled={!!recharging} className="btn-secondary !py-1.5 !px-3 !text-[10px] uppercase font-bold tracking-widest text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all">
                    {recharging === addon.id ? <Loader2 className="w-3 h-3 animate-spin" /> : `₹${addon.price}`}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Rebranded Subscription Card Matrix */}
      <div className="space-y-6 pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" /> Subscription Base Plans
            </h2>
            <p className="text-xs text-white/50">Select the plan matching your call volume. Get 2 months free on annual plans!</p>
          </div>
          
          {/* Monthly / Annual Toggle Switch */}
          <div className="inline-flex p-1 rounded-full bg-slate-900/60 border border-white/5 backdrop-blur-md">
            <button 
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                billingCycle === "monthly" 
                  ? "bg-indigo-500 text-white shadow-md" 
                  : "text-white/60 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button 
              onClick={() => setBillingCycle("annual")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                billingCycle === "annual" 
                  ? "bg-indigo-500 text-white shadow-md" 
                  : "text-white/60 hover:text-white"
              }`}
            >
              Annual <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] px-1.5 py-0.5 rounded-full font-black">2 Mins Free</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {ALL_PLANS.map((plan) => {
            const isMonthly = billingCycle === "monthly";
            const planId = isMonthly ? plan.id : plan.annualId;
            const price = isMonthly ? plan.price : plan.annualPrice;
            const mins = isMonthly ? plan.mins : plan.annualMins;
            const isCurrent = sub?.plan_name === planId;

            return (
              <div 
                key={plan.id} 
                className={`card p-6 flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
                  plan.popular 
                    ? "border-indigo-500 shadow-xl shadow-indigo-500/5 bg-indigo-950/15" 
                    : "border-white/5 bg-slate-900/30 hover:border-white/10"
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 px-3 py-1 bg-indigo-500 text-[9px] font-black uppercase tracking-wider rounded-bl-lg text-white flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> Most Popular
                  </div>
                )}

                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">{plan.name}</p>
                  <p className="text-sm text-white/50 mb-6 leading-snug h-10">{plan.desc}</p>
                  
                  <div className="mb-6">
                    <p className="text-3xl font-black text-white">
                      ₹{price.toLocaleString('en-IN')}
                      <span className="text-xs font-normal opacity-50">/{isMonthly ? 'mo' : 'yr'}</span>
                    </p>
                    {!isMonthly && (
                      <p className="text-xs text-emerald-400 font-bold mt-1">
                        SAVE ₹{plan.save.toLocaleString('en-IN')} (2 Months Free!)
                      </p>
                    )}
                  </div>

                  <div className="p-3 bg-white/5 rounded-xl border border-white/5 mb-6 text-center">
                    <p className="text-xs font-bold text-white">{mins.toLocaleString()} calling minutes</p>
                  </div>

                  {/* Plan Features Checklist */}
                  <ul className="space-y-3 mb-8">
                    {PLAN_FEATURES.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-white/60">
                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  {isCurrent ? (
                    <button disabled className="w-full py-3 rounded-xl bg-white/10 text-white/40 font-bold border border-white/10 text-xs tracking-wider cursor-default flex items-center justify-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-indigo-400" /> Current Plan
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleUpgradeClick(planId)} 
                      disabled={!!recharging || calculating}
                      className={`w-full py-3 rounded-xl font-bold text-xs tracking-wider transition-all flex items-center justify-center gap-2 ${
                        plan.popular 
                          ? "bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                          : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                      }`}
                    >
                      {recharging === planId ? (
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                      ) : (
                        `Upgrade to ${plan.name}`
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upgrade Modal */}
      {upgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setUpgradeModal(null)}>
          <div className="card p-8 w-full max-w-md relative overflow-hidden bg-slate-900 border border-white/10 rounded-3xl" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-indigo-400">
              <Zap size={160} />
            </div>
            
            <h3 className="text-xl font-bold mb-2 text-white">Smart Upgrade Summary</h3>
            <p className="text-xs opacity-50 mb-8 uppercase tracking-widest text-white">Calculated on Pro-Rata Basis</p>

            <div className="space-y-6 mb-8">
              <div className="flex justify-between items-center text-sm">
                <span className="opacity-50 text-white">New Plan Target</span>
                <span className="font-black text-white uppercase tracking-wider">{upgradeModal.targetPlan}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="opacity-50 text-white">Remaining Cycle Days</span>
                <span className="font-bold text-white">{upgradeModal.remainingDays} Days</span>
              </div>
              
              {/* Wallet Credits Applied Info */}
              {walletBalance > 0 && (
                <div className="flex justify-between items-center text-sm p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                  <span className="text-indigo-400 flex items-center gap-1"><Wallet className="w-3.5 h-3.5" /> Wallet Discount</span>
                  <span className="font-black text-emerald-400">-₹{walletBalance.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Pro-Rated Upgrade Amount</p>
                  <p className="text-3xl font-black text-white">
                    ₹{Math.max(0, upgradeModal.proRatedAmount / 100 - walletBalance).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Total Savings</p>
                  <p className="text-xl font-bold text-emerald-400">
                    ₹{((upgradeModal.savings || 0) / 100).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setUpgradeModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => handlePayment(upgradeModal.targetPlan, true)} disabled={!!recharging} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {recharging ? <Loader2 className="w-4 h-4 animate-spin" /> : "Pay & Activate"}
              </button>
            </div>
            
            <p className="mt-6 text-[10px] text-center opacity-30 px-6 text-white">
              Your billing cycle will reset today. All your current remaining minutes will be carried forward as a bonus.
            </p>
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="card overflow-hidden bg-slate-900/30 border border-white/5 rounded-3xl shadow-xl">
        <div className="p-6 border-b flex items-center justify-between border-white/5">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 opacity-50 text-white" />
            <h3 className="font-bold text-white">Billing History</h3>
          </div>
          <p className="text-[10px] uppercase tracking-widest opacity-35 font-bold text-white">Past 12 Months</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-xs font-bold uppercase tracking-wider text-white/40">
                <th className="p-4">Transaction Date</th>
                <th className="p-4">Purchased Item</th>
                <th className="p-4">Credits</th>
                <th className="p-4">Amount Paid</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {transactions.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 opacity-30 text-sm text-white">No transactions yet. Billing records will appear here after your first purchase.</td></tr>
              ) : transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-white/[0.01] transition-colors text-sm">
                  <td className="p-4 text-xs opacity-60 text-white">
                    {new Date(tx.created_at).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="p-4 font-semibold text-white capitalize">{tx.plan_name.replace("_", " ")}</td>
                  <td className="p-4">
                    <span className="text-xs font-mono text-white">{tx.minutes_purchased > 0 ? `+${tx.minutes_purchased}` : "—"}</span>
                  </td>
                  <td className="p-4 font-bold text-white">₹{Number(tx.amount_inr).toLocaleString("en-IN")}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${tx.status === "captured" ? "bg-emerald-500" : "bg-amber-500"}`} />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">{tx.status}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    {tx.status === "captured" && (
                      <a href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}/payments/invoice/${tx.id}?token=${localStorage.getItem("token")}`} target="_blank" className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase tracking-widest transition-all text-white">
                        <FileText className="w-3.5 h-3.5 text-indigo-400" /> Invoice
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 opacity-30 py-8 text-white">
        <CreditCard className="w-4 h-4" />
        <p className="text-[10px] font-bold uppercase tracking-widest">Secure Payments by Razorpay · PCI DSS Compliant</p>
      </div>
    </div>
  );
}
