"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CreditCard, History, Zap, CheckCircle, Loader2, FileText } from "lucide-react";

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
  { id: "topup_100", mins: 100, price: 1500, label: "Starter Pack" },
  { id: "topup_500", mins: 500, price: 6000, label: "Value Pack" },
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

  useEffect(() => {
    Promise.all([
      api("/subscriptions"),
      api("/subscriptions/transactions"),
    ]).then(([subData, txData]) => {
      setSub(subData.subscription);
      setTransactions(txData.transactions);
    }).catch(console.error);
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

      // Lazy load Razorpay script
      const res = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
      if (!res) { alert("Razorpay SDK failed to load. Are you online?"); return; }

      const options = {
        key: key_id,
        amount: amount,
        currency: currency,
        name: "Trinity Pixels",
        description: `Recharge: ${planId}`,
        order_id: order_id,
        handler: async function (response: any) {
          // Note: In real app, you'd call a verify endpoint here, 
          // but we rely on webhook for reliability. 
          // We'll just refresh after a short delay.
          alert("Payment successful! Minutes will be added in a few seconds.");
          window.location.reload();
        },
        theme: { color: "#6366f1" },
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

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Usage & Billing</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Manage your talk time and billing history</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Minutes Gauge */}
        <div className="lg:col-span-1 card p-8 flex flex-col items-center justify-center text-center">
          <p className="text-xs font-bold uppercase tracking-widest mb-6 opacity-50">Remaining Minutes</p>
          <div className="relative w-48 h-48 mb-6">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/5" />
              <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={552.92} strokeDashoffset={552.92 * (1 - usedPercent / 100)} className={`${isLowMinutes ? "text-amber-500" : "text-indigo-500"} transition-all duration-1000`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center transform rotate-90">
              <span className={`text-5xl font-bold ${isLowMinutes ? "text-amber-500" : ""}`} style={{ color: "var(--text-primary)" }}>{sub?.available_minutes || 0}</span>
              <span className="text-[10px] uppercase font-bold opacity-40 mt-1">Minutes Left</span>
            </div>
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Plan: <span className="capitalize font-bold text-white">{sub?.plan_name || "Free"}</span></p>
          <p className="text-[10px] mt-1 opacity-40">Resets on {sub?.billing_cycle_end ? new Date(sub.billing_cycle_end).toLocaleDateString() : "—"}</p>
          <div className="mt-6 p-3 rounded-lg border border-white/5 bg-white/[0.02] text-xs opacity-70">
            <span className="text-amber-400 font-bold">Note:</span> Minutes are consumed by both incoming and outgoing calls.
          </div>
        </div>

        {/* Recharge Options */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h3 className="font-bold flex items-center gap-2 mb-4" style={{ color: "var(--text-primary)" }}>
              <Zap className="w-4 h-4 text-amber-400" /> Top-up Extra Minutes
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {TOPUP_OPTIONS.map((opt) => (
                <button key={opt.id} onClick={() => handlePayment(opt.id)} disabled={!!recharging} className="group p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-indigo-500/50 transition-all text-left relative overflow-hidden">
                  <div className="relative z-10">
                    <p className="text-xs font-bold opacity-40 uppercase tracking-tighter mb-1">{opt.label}</p>
                    <p className="text-2xl font-bold text-white">{opt.mins} <span className="text-sm font-normal opacity-50">Mins</span></p>
                    <p className="text-sm font-medium mt-2 text-indigo-400">₹{opt.price.toLocaleString("en-IN")}</p>
                  </div>
                  {recharging === opt.id ? (
                    <Loader2 className="absolute right-4 top-4 w-5 h-5 animate-spin text-indigo-500" />
                  ) : (
                    <div className="absolute right-[-10px] bottom-[-10px] opacity-5 group-hover:opacity-10 transition-opacity">
                      <Zap size={80} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-bold flex items-center gap-2 mb-4" style={{ color: "var(--text-primary)" }}>
              <CreditCard className="w-4 h-4 text-indigo-400" /> Upgrade Monthly Plan
            </h3>
            <div className="grid sm:grid-cols-3 gap-4">
              {PLAN_UPGRADES.map((plan) => (
                <button key={plan.id} onClick={() => handlePayment(plan.id)} disabled={!!recharging || sub?.plan_name === plan.id} className={`p-4 rounded-xl border transition-all text-left ${sub?.plan_name === plan.id ? "border-indigo-500/50 bg-indigo-500/10 cursor-default" : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20"}`}>
                  <p className="text-sm font-bold text-white mb-1">{plan.label}</p>
                  <p className="text-xs opacity-50 mb-3">{plan.mins} Mins/mo</p>
                  <p className="text-lg font-bold text-indigo-400">₹{plan.price.toLocaleString("en-IN")}</p>
                  {sub?.plan_name === plan.id && <span className="text-[10px] font-bold uppercase text-indigo-300 mt-2 block">Current Plan</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b flex items-center gap-2" style={{ borderColor: "var(--border-subtle)" }}>
          <History className="w-4 h-4 opacity-50" />
          <h3 className="font-bold" style={{ color: "var(--text-primary)" }}>Billing History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Item</th>
                <th>Minutes</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Invoice</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 opacity-50">No transactions found</td></tr>
              ) : transactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="text-xs">{new Date(tx.created_at).toLocaleDateString("en-IN")}</td>
                  <td className="font-medium capitalize">{tx.plan_name.replace("_", " ")}</td>
                  <td>{tx.minutes_purchased}</td>
                  <td className="font-bold">₹{Number(tx.amount_inr).toLocaleString("en-IN")}</td>
                  <td>
                    <span className={`badge ${tx.status === "captured" ? "badge-success" : "badge-warning"}`}>
                      {tx.status === "captured" ? <CheckCircle className="w-3 h-3 mr-1" /> : ""}
                      {tx.status}
                    </span>
                  </td>
                  <td>
                    {tx.status === "captured" && (
                      <a href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}/payments/invoice/${tx.id}?token=${localStorage.getItem("token")}`} target="_blank" className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-xs font-semibold">
                        <FileText className="w-3 h-3" /> View
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
