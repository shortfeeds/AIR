"use client";
import { useState } from "react";
import Link from "next/link";
import { Phone, Mail, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to request password reset");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      <div className="absolute top-1/3 left-1/3 w-80 h-80 rounded-full blur-[120px] opacity-15" style={{ background: "var(--brand-500)" }} />
      <div className="w-full max-w-md relative z-10 animate-fade-in">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--brand-600), var(--brand-400))" }}>
            <Phone className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Trinity Pixels</span>
        </div>

        <div className="card p-8">
          <h1 className="text-2xl font-bold text-center mb-2" style={{ color: "var(--text-primary)" }}>Reset Password</h1>
          <p className="text-sm text-center mb-8" style={{ color: "var(--text-secondary)" }}>Enter your email to receive a reset link</p>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg mb-6" style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)" }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: "rgba(16, 185, 129, 0.1)", color: "var(--success)" }}>
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>If an account exists for that email, a reset link has been sent.</p>
              <Link href="/login" className="btn-primary w-full inline-block mt-4">Return to Login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.com" className="input-field pl-10" required />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Send Reset Link</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}

          <p className="text-sm text-center mt-6" style={{ color: "var(--text-muted)" }}>
            Remember your password?{" "}
            <Link href="/login" className="font-medium" style={{ color: "var(--brand-400)" }}>Back to login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
