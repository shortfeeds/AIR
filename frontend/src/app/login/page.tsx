"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Phone, Mail, Lock, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { api, setToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(data.token);
      router.push(data.user.role === "admin" ? "/admin" : "/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
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
          <h1 className="text-2xl font-bold text-center mb-2" style={{ color: "var(--text-primary)" }}>Welcome back</h1>
          <p className="text-sm text-center mb-8" style={{ color: "var(--text-secondary)" }}>Sign in to your dashboard</p>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg mb-6" style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)" }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.com" className="input-field pl-10" required />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="input-field pl-10" required />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="text-sm text-center mt-6" style={{ color: "var(--text-muted)" }}>
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium" style={{ color: "var(--brand-400)" }}>Get started</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
