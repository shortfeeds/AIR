"use client";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen py-20 px-6" style={{ background: "var(--bg-primary)" }}>
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="flex items-center gap-2 text-sm mb-12 hover:opacity-70 transition-all" style={{ color: "var(--text-muted)" }}>
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "var(--brand-500)20" }}>
            <ShieldCheck className="w-6 h-6" style={{ color: "var(--brand-400)" }} />
          </div>
          <h1 className="text-4xl font-bold" style={{ color: "var(--text-primary)" }}>Privacy Policy</h1>
        </div>

        <div className="space-y-8 text-lg leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          <p>Last Updated: May 16, 2026</p>
          
          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>1. Information We Collect</h2>
            <p>We collect information you provide directly to us when you create an account, such as your name, business name, email address, and phone number. We also collect audio recordings and transcripts of calls handled by our AI system for the purpose of providing and improving our services.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>2. How We Use Information</h2>
            <p>We use the information we collect to provide, maintain, and improve our AI Voice Receptionist services. This includes processing calls, generating summaries, and providing analytics. We do not sell your personal information or call data to third parties.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>3. Data Storage and Security</h2>
            <p>We use industry-standard security measures to protect your data. Call recordings are stored in secure, encrypted cloud storage (S3/R2). We retain your data for as long as your account is active or as needed to provide you services.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>4. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at support@trinitypixels.com.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
