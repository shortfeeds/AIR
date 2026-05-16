"use client";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen py-20 px-6" style={{ background: "var(--bg-primary)" }}>
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="flex items-center gap-2 text-sm mb-12 hover:opacity-70 transition-all" style={{ color: "var(--text-muted)" }}>
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "var(--brand-500)20" }}>
            <FileText className="w-6 h-6" style={{ color: "var(--brand-400)" }} />
          </div>
          <h1 className="text-4xl font-bold" style={{ color: "var(--text-primary)" }}>Terms of Service</h1>
        </div>

        <div className="space-y-8 text-lg leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          <p>Last Updated: May 16, 2026</p>
          
          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>1. Acceptance of Terms</h2>
            <p>By accessing or using Trinity Pixels, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>2. Service Description</h2>
            <p>Trinity Pixels provides a 24/7 AI Voice Receptionist service. We provide you with a dedicated phone number to handle incoming calls using automated AI agents.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>3. User Obligations</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials. You agree not to use the service for any illegal purposes or to harass, abuse, or harm another person.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>4. Limitation of Liability</h2>
            <p>Trinity Pixels is not liable for any indirect, incidental, special, or consequential damages resulting from the use or inability to use our services.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
