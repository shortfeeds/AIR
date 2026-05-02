"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, getToken } from "@/lib/api";
import { Building2, Phone, Brain, CheckCircle, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Screen 1
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [hours] = useState<Record<string, any>>(() => {
    const h: Record<string, any> = {};
    DAYS.forEach(d => { h[d] = { open: "09:00", close: "18:00", closed: d === "Sunday" }; });
    return h;
  });

  // Screen 2
  const [transferNumber, setTransferNumber] = useState("");
  const [transferMode, setTransferMode] = useState("on_request");

  // Screen 3
  const [services, setServices] = useState("");
  const [faqs, setFaqs] = useState([{ q: "", a: "" }, { q: "", a: "" }, { q: "", a: "" }]);
  const [aiGoal, setAiGoal] = useState("answer_faqs");

  const steps = [
    { label: "Business Basics", icon: Building2 },
    { label: "Call Handling", icon: Phone },
    { label: "AI Knowledge", icon: Brain },
    { label: "Confirmation", icon: CheckCircle },
  ];

  const handleSubmit = async () => {
    if (!getToken()) { router.push("/login"); return; }
    setLoading(true);
    try {
      await api("/clients/onboarding", {
        method: "POST",
        body: JSON.stringify({
          business_name: businessName, city, operating_hours: hours, website_url: websiteUrl,
          transfer_number: transferNumber, transfer_mode: transferMode,
          primary_services: services, top_faqs: faqs.filter(f => f.q && f.a), ai_goal: aiGoal,
        }),
      });
      setStep(3);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg-primary)" }}>
      <div className="w-full max-w-2xl animate-fade-in">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s.label} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i <= step ? "" : "opacity-40"}`}
                style={{ background: i <= step ? "var(--brand-600)" : "var(--bg-card)", color: i <= step ? "white" : "var(--text-muted)" }}>
                {i < step ? "✓" : i + 1}
              </div>
              {i < steps.length - 1 && <div className="w-8 h-0.5 rounded" style={{ background: i < step ? "var(--brand-500)" : "var(--border-subtle)" }} />}
            </div>
          ))}
        </div>

        <div className="card p-8">
          {/* Screen 1: Business Basics */}
          {step === 0 && (
            <div className="space-y-5">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Tell us about your business</h2>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>This takes about 2 minutes</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Business Name</label>
                <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="input-field" placeholder="e.g. Dr. Sharma's Dental Clinic" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>City</label>
                <input value={city} onChange={(e) => setCity(e.target.value)} className="input-field" placeholder="e.g. Mumbai" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Website URL (optional)</label>
                <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} className="input-field" placeholder="https://yourbusiness.com" />
              </div>
            </div>
          )}

          {/* Screen 2: Call Handling */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Call Handling</h2>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>How should your AI handle calls?</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Transfer Number</label>
                <input value={transferNumber} onChange={(e) => setTransferNumber(e.target.value)} className="input-field" placeholder="+91 98765 43210" />
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Which mobile number should the AI transfer urgent callers to?</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: "var(--text-secondary)" }}>Transfer Mode</label>
                <div className="space-y-2">
                  {[
                    { value: "on_request", label: "Transfer only when customer asks to speak to someone" },
                    { value: "all_calls", label: "Transfer all calls after AI handles initial query" },
                  ].map((opt) => (
                    <label key={opt.value} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all" style={{ borderColor: transferMode === opt.value ? "var(--brand-500)" : "var(--border-subtle)", background: transferMode === opt.value ? "rgba(99,102,241,0.05)" : "transparent" }}>
                      <input type="radio" name="transfer" value={opt.value} checked={transferMode === opt.value} onChange={(e) => setTransferMode(e.target.value)} className="accent-[var(--brand-500)]" />
                      <span className="text-sm" style={{ color: "var(--text-primary)" }}>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Screen 3: AI Knowledge */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Your AI&apos;s Knowledge</h2>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Help us train your AI receptionist</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Describe your services</label>
                <textarea value={services} onChange={(e) => setServices(e.target.value)} className="input-field min-h-[100px]" placeholder="We offer dental check-ups, teeth cleaning, braces consultation..." />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: "var(--text-secondary)" }}>Top 3 customer questions & answers</label>
                {faqs.map((faq, i) => (
                  <div key={i} className="mb-3 p-3 rounded-lg" style={{ background: "var(--bg-secondary)" }}>
                    <input value={faq.q} onChange={(e) => { const f = [...faqs]; f[i].q = e.target.value; setFaqs(f); }} className="input-field text-sm mb-2" placeholder={`Question ${i + 1}`} />
                    <input value={faq.a} onChange={(e) => { const f = [...faqs]; f[i].a = e.target.value; setFaqs(f); }} className="input-field text-sm" placeholder={`Answer ${i + 1}`} />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: "var(--text-secondary)" }}>Main job of your AI</label>
                <select value={aiGoal} onChange={(e) => setAiGoal(e.target.value)} className="input-field">
                  <option value="book_appointment">Book Appointments</option>
                  <option value="take_message">Take Messages</option>
                  <option value="answer_faqs">Answer FAQs</option>
                  <option value="qualify_leads">Qualify Leads</option>
                </select>
              </div>
            </div>
          )}

          {/* Screen 4: Confirmation */}
          {step === 3 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ background: "rgba(34,197,94,0.15)" }}>
                <CheckCircle className="w-8 h-8" style={{ color: "var(--success)" }} />
              </div>
              <h2 className="text-2xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>You&apos;re done!</h2>
              <p className="text-sm leading-relaxed max-w-md mx-auto mb-8" style={{ color: "var(--text-secondary)" }}>
                Our team will activate your AI receptionist within 24 hours. You&apos;ll receive an SMS with your dedicated phone number once it&apos;s live.
              </p>
              <button onClick={() => router.push("/dashboard")} className="btn-primary inline-flex items-center gap-2">
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Navigation */}
          {step < 3 && (
            <div className="flex justify-between mt-8">
              <button onClick={() => setStep(Math.max(0, step - 1))} className="btn-ghost flex items-center gap-2" disabled={step === 0}>
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              {step < 2 ? (
                <button onClick={() => setStep(step + 1)} className="btn-primary flex items-center gap-2 text-sm">
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={loading} className="btn-primary flex items-center gap-2 text-sm">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4" /> Submit</>}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
