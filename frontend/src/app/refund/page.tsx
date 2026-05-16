"use client";
import Link from "next/link";
import { ArrowLeft, RefreshCcw } from "lucide-react";

export default function RefundPolicy() {
  return (
    <div className="min-h-screen py-20 px-6" style={{ background: "var(--bg-primary)" }}>
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="flex items-center gap-2 text-sm mb-12 hover:opacity-70 transition-all" style={{ color: "var(--text-muted)" }}>
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "var(--brand-500)20" }}>
            <RefreshCcw className="w-6 h-6" style={{ color: "var(--brand-400)" }} />
          </div>
          <h1 className="text-4xl font-bold" style={{ color: "var(--text-primary)" }}>Refund Policy</h1>
        </div>

        <div className="space-y-8 text-lg leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          <p>Last Updated: May 16, 2026</p>
          
          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>1. Subscription Refunds</h2>
            <p>We offer a 7-day money-back guarantee for your initial subscription purchase. If you are not satisfied with the service, you can request a full refund within the first 7 days of your first payment.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>2. Minute Top-ups</h2>
            <p>One-time minute top-up purchases are non-refundable. However, unused minutes carry over to the next billing cycle as long as your subscription remains active.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>3. Cancellation</h2>
            <p>You can cancel your subscription at any time from your dashboard. Upon cancellation, you will continue to have access to the service until the end of your current billing period.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>4. Processing Refunds</h2>
            <p>Refunds will be processed back to the original payment method (Razorpay) within 5-7 business days of approval.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
