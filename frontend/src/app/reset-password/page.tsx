"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Phone, Lock, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const id = searchParams.get("id");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token || !id) {
      setError("Invalid or missing reset token.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      await api("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ id, token, password }),
      });
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (!token || !id) {
    return (
      <div className="text-center space-y-4">
        <div className="flex items-center gap-2 p-3 rounded-lg mb-6" style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)" }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">Invalid or missing reset token.</span>
        </div>
        <Link href="/forgot-password" className="btn-primary w-full inline-block mt-4">Request New Link</Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: "rgba(16, 185, 129, 0.1)", color: "var(--success)" }}>
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Password Reset Successfully!</p>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Redirecting to login...</p>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-center mb-8" style={{ color: "var(--text-secondary)" }}>Choose a new password for your account</p>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg mb-6" style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)" }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>New Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="input-field pl-10" required />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="input-field pl-10" required />
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Reset Password</span><ArrowRight className="w-4 h-4" /></>}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
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
          
          <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin opacity-20" /></div>}>
            <ResetPasswordForm />
          </Suspense>

        </div>
      </div>
    </div>
  );
}
