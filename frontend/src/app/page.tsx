"use client";
import { useState } from "react";
import Link from "next/link";
import { Phone, PhoneIncoming, PhoneMissed, Clock, Users, Headphones, Shield, Zap, ChevronRight, Star, ArrowRight, CheckCircle2, MessageSquare } from "lucide-react";

const plans = [
  { name: "Silver", price: "2,999", minutes: "200", best: "Freelancers, small shops", popular: false },
  { name: "Gold", price: "4,999", minutes: "500", best: "Clinics, salons, agencies", popular: true },
  { name: "Diamond", price: "7,999", minutes: "1,000", best: "Growing businesses", popular: false },
  { name: "Platinum", price: "9,999", minutes: "2,000", best: "High-volume businesses", popular: false },
];

const faqs = [
  { q: "How are minutes calculated?", a: "Minutes are consumed for both incoming and outgoing calls handled by your AI receptionist." },
  { q: "What happens when I run out of minutes?", a: "Your AI will let callers know you're temporarily unavailable. You can instantly recharge from your dashboard using UPI, cards, or net banking." },
  { q: "Can I change plans?", a: "Yes! Upgrade or downgrade anytime from your dashboard. Changes take effect immediately." },
  { q: "How long does setup take?", a: "We activate your AI receptionist within 24 hours of receiving your intake form. Most clients are live within 12 hours." },
];

function DemoGenerator() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "scraping" | "ready">("idle");
  const [result, setResult] = useState<any>(null);

  const generate = async () => {
    if (!url) return;
    setStatus("scraping");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}/demo/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      setResult(data);
      setStatus("ready");
    } catch (e) {
      console.error(e);
      setStatus("idle");
    }
  };

  return (
    <div className="card p-2 md:p-4 max-w-2xl mx-auto shadow-2xl relative">
      {status === "idle" && (
        <div className="flex flex-col md:flex-row gap-3">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter your business website (e.g. clinic.com)"
            className="input-field flex-1 !h-14 !px-6"
          />
          <button onClick={generate} className="btn-primary !h-14 px-8 whitespace-nowrap flex items-center gap-2">
            Build My AI <Zap className="w-4 h-4" />
          </button>
        </div>
      )}

      {status === "scraping" && (
        <div className="py-12 text-center animate-pulse">
          <div className="flex justify-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-indigo-500 animate-bounce delay-75" />
            <div className="w-3 h-3 rounded-full bg-indigo-500 animate-bounce delay-150" />
            <div className="w-3 h-3 rounded-full bg-indigo-500 animate-bounce delay-300" />
          </div>
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Scraping {url} and training your AI agent...
          </p>
        </div>
      )}

      {status === "ready" && result && (
        <div className="p-4 text-left animate-fade-in">
          <div className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <CheckCircle2 className="w-6 h-6 text-indigo-400" />
            <div>
              <p className="text-xs uppercase tracking-widest font-bold text-indigo-400">Success</p>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                AI Receptionist for {result.business_name} is Ready!
              </p>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-xs font-bold uppercase opacity-40 mb-2">Generated AI Persona</p>
            <div className="p-4 rounded-lg bg-black/40 text-xs leading-relaxed font-mono italic" style={{ color: "var(--text-secondary)" }}>
              &quot;{result.generated_prompt}&quot;
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 rounded-xl bg-white/5 border border-white/10">
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Call your AI now:</p>
              <p className="text-2xl font-bold text-indigo-400">{result.demo_number}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Enter PIN: <span className="text-white font-bold">{result.pin}</span> when asked.</p>
            </div>
            <Link href="/signup" className="btn-primary !py-3 !px-8">
              Claim This Number
            </Link>
          </div>
          
          <button onClick={() => setStatus("idle")} className="mt-6 text-xs text-indigo-400 underline block mx-auto">
            Try another website
          </button>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b" style={{ background: "rgba(11, 14, 20, 0.85)", backdropFilter: "blur(20px)", borderColor: "var(--border-subtle)" }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--brand-600), var(--brand-400))" }}>
              <Phone className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Trinity Pixels</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>How It Works</a>
            <a href="#pricing" className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Pricing</a>
            <a href="#demo" className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Live Demo</a>
            <Link href="/login" className="btn-ghost text-sm">Sign In</Link>
            <Link href="/signup" className="btn-primary text-sm !py-2 !px-4">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Section 1 — Hero */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px] opacity-20" style={{ background: "var(--brand-500)" }} />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-[100px] opacity-10" style={{ background: "var(--brand-400)" }} />
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm mb-8" style={{ borderColor: "var(--border-default)", color: "var(--brand-300)" }}>
            <Zap className="w-3.5 h-3.5" />
            Setup in 24 hours · No technical knowledge needed
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight mb-6" style={{ color: "var(--text-primary)" }}>
            Never Miss Another Lead.
            <br />
            <span style={{ background: "linear-gradient(135deg, var(--brand-400), var(--brand-300))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Your 24/7 AI Voice Receptionist
            </span>
          </h1>

          <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10" style={{ color: "var(--text-secondary)" }}>
            We handle the setup, the training, and the tech. You just pick up transferred calls and watch your leads roll in.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <a href="#demo" className="btn-primary text-base flex items-center gap-2">
              <Headphones className="w-5 h-5" />
              Hear a Live Demo
            </a>
            <Link href="/signup" className="btn-secondary text-base flex items-center gap-2">
              Get Started — ₹2,999/mo
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Mini stats */}
          <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto">
            {[
              { num: "24hr", label: "Setup Time" },
              { num: "99.9%", label: "Uptime" },
              { num: "500+", label: "Calls Handled" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold" style={{ color: "var(--brand-400)" }}>{s.num}</div>
                <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section: Live Demo Generator */}
      <section id="instant-demo" className="section relative overflow-hidden" style={{ background: "rgba(99, 102, 241, 0.03)" }}>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="badge-brand badge mb-4">New: Instant AI Preview</div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
            See your AI Receptionist in <span style={{ color: "var(--brand-400)" }}>60 Seconds</span>
          </h2>
          <p className="text-lg mb-10 mx-auto max-w-2xl" style={{ color: "var(--text-secondary)" }}>
            Enter your website URL. Our engine will analyze your business and generate a custom AI receptionist persona for you instantly.
          </p>

          <DemoGenerator />
        </div>
      </section>

      {/* Section 2 — Pain Agitation */}
      <section className="section" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 animate-fade-in">
            <p className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--brand-400)" }}>The Problem</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              Businesses miss <span style={{ color: "var(--danger)" }}>62%</span> of calls when busy
            </h2>
            <p className="text-lg" style={{ color: "var(--text-secondary)" }}>Each missed call is a lost customer. Here&apos;s how it happens:</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: PhoneMissed, title: "Missed Calls After Hours", desc: "Customers call when you're closed. Without an AI receptionist, their query dies right there.", color: "var(--danger)" },
              { icon: Clock, title: "Customers Hang Up on Hold", desc: "87% of callers won't leave a voicemail. If nobody answers in 3 rings, they call your competitor.", color: "var(--warning)" },
              { icon: Users, title: "Staff Distracted from Work", desc: "Your team wastes 2+ hours daily answering repetitive questions instead of doing actual work.", color: "var(--info)" },
            ].map((card) => (
              <div key={card.title} className="card p-8 text-center">
                <div className="w-14 h-14 rounded-xl mx-auto mb-5 flex items-center justify-center" style={{ background: `${card.color}15` }}>
                  <card.icon className="w-7 h-7" style={{ color: card.color }} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{card.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3 — How It Works */}
      <section id="how-it-works" className="section">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--brand-400)" }}>How It Works</p>
            <h2 className="text-3xl md:text-4xl font-bold" style={{ color: "var(--text-primary)" }}>Live in 3 Simple Steps</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Tell Us About Your Business", desc: "Fill out a 2-minute intake form with your services, FAQs, and operating hours.", icon: MessageSquare },
              { step: "02", title: "We Build Your AI", desc: "Our team configures your dedicated voice agent within 24 hours. No effort from you.", icon: Zap },
              { step: "03", title: "Leads Arrive on Your Dashboard", desc: "Log in anytime, see every conversation, get calls transferred live to your phone.", icon: PhoneIncoming },
            ].map((s, i) => (
              <div key={s.step} className={`relative animate-fade-in delay-${(i + 1) * 100}`}>
                <div className="card p-8">
                  <div className="text-5xl font-black mb-4" style={{ color: "var(--brand-500)", opacity: 0.2 }}>{s.step}</div>
                  <div className="w-12 h-12 rounded-lg mb-4 flex items-center justify-center" style={{ background: "rgba(99, 102, 241, 0.1)" }}>
                    <s.icon className="w-6 h-6" style={{ color: "var(--brand-400)" }} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{s.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4 — Managed Service Difference */}
      <section className="section" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--brand-400)" }}>The Difference</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
            Fully Managed. Not Another DIY Tool.
          </h2>
          <p className="text-lg leading-relaxed mb-10" style={{ color: "var(--text-secondary)" }}>
            Unlike DIY tools like VAPI or Bland AI, we don&apos;t hand you a manual. Trinity Pixels engineers build, test, and maintain your agent — so it never sounds robotic or off-brand.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 text-left max-w-2xl mx-auto">
            {[
              "Dedicated AI trained on YOUR business",
              "24-hour setup with zero effort from you",
              "Human team maintaining your agent",
              "Dashboard with real leads, not raw data",
              "Indian payment methods (UPI, Cards, Net Banking)",
              "No API keys, no coding, no headaches",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 py-2">
                <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "var(--success)" }} />
                <span className="text-sm" style={{ color: "var(--text-primary)" }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5 — Live Demo CTA */}
      <section id="demo" className="section">
        <div className="max-w-3xl mx-auto">
          <div className="card p-10 text-center animate-pulse-glow" style={{ border: "1px solid var(--brand-500)" }}>
            <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ background: "rgba(99, 102, 241, 0.15)" }}>
              <Phone className="w-8 h-8" style={{ color: "var(--brand-400)" }} />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
              Hear It for Yourself
            </h2>
            <p className="text-lg mb-6" style={{ color: "var(--text-secondary)" }}>
              Call this number right now and speak to a real AI receptionist
            </p>
            <div className="text-3xl md:text-4xl font-bold mb-3" style={{ color: "var(--brand-300)" }}>
              +91 7710884479
            </div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              It&apos;s answering for a sample business. Yours will be trained specifically on your services.
            </p>
          </div>
        </div>
      </section>

      {/* Section 6 — Pricing */}
      <section id="pricing" className="section" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--brand-400)" }}>Pricing</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>Simple, Transparent Pricing</h2>
            <p style={{ color: "var(--text-secondary)" }}>No hidden fees. No contracts. Cancel anytime.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {plans.map((plan) => (
              <div key={plan.name} className={`card p-8 relative ${plan.popular ? "ring-2" : ""}`} style={plan.popular ? { borderColor: "var(--brand-500)", boxShadow: "0 0 40px rgba(99, 102, 241, 0.15)" } : {}}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 badge-brand badge">
                    <Star className="w-3 h-3 mr-1" /> Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>{plan.name}</h3>
                <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>{plan.best}</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold" style={{ color: "var(--text-primary)" }}>₹{plan.price}</span>
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>/mo</span>
                </div>
                <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>{plan.minutes} minutes included</p>
                <Link href="/signup" className={`block text-center w-full py-3 rounded-lg font-semibold transition-all ${plan.popular ? "btn-primary" : "btn-secondary"}`}>
                  Get Started <ChevronRight className="w-4 h-4 inline" />
                </Link>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <div className="max-w-2xl mx-auto">
            <h3 className="text-xl font-bold mb-6 text-center" style={{ color: "var(--text-primary)" }}>Frequently Asked Questions</h3>
            <div className="space-y-4">
              {faqs.map((faq) => (
                <div key={faq.q} className="card p-6">
                  <h4 className="font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{faq.q}</h4>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 7 — Trust Signals + Footer */}
      <section className="section">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex flex-wrap items-center justify-center gap-6 mb-12">
            {[
              { icon: Zap, label: "Setup in 24 hours" },
              { icon: Shield, label: "Indian payment methods" },
              { icon: Headphones, label: "Human support team" },
            ].map((badge) => (
              <div key={badge.label} className="flex items-center gap-2 px-4 py-2 rounded-full border" style={{ borderColor: "var(--border-default)" }}>
                <badge.icon className="w-4 h-4" style={{ color: "var(--brand-400)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{badge.label}</span>
              </div>
            ))}
          </div>

          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
            Ready to stop losing customers?
          </h2>
          <p className="text-lg mb-8" style={{ color: "var(--text-secondary)" }}>
            Join Indian businesses that never miss a call again.
          </p>
          <Link href="/signup" className="btn-primary text-base inline-flex items-center gap-2">
            Start Your Trial <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t pt-20 pb-10 px-6" style={{ background: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-16">
            <div className="col-span-2">
              <Link href="/" className="flex items-center gap-2.5 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20" style={{ background: "linear-gradient(135deg, var(--brand-600), var(--brand-400))" }}>
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Trinity Pixels</span>
              </Link>
              <p className="text-sm leading-relaxed max-w-xs mb-8" style={{ color: "var(--text-secondary)" }}>
                The next generation of AI receptionists for Indian businesses. We help you capture 100% of your leads, even while you sleep.
              </p>
              <div className="flex gap-4">
                {/* Social Placeholders */}
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-9 h-9 rounded-full border flex items-center justify-center hover:bg-white/5 transition-colors cursor-pointer" style={{ borderColor: "var(--border-subtle)" }}>
                    <div className="w-4 h-4 bg-white/20 rounded-sm" />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-sm uppercase tracking-widest mb-6" style={{ color: "var(--text-primary)" }}>Platform</h4>
              <ul className="space-y-4 text-sm" style={{ color: "var(--text-secondary)" }}>
                <li><Link href="/#features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/#pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/dashboard" className="hover:text-white transition-colors">Client Portal</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-sm uppercase tracking-widest mb-6" style={{ color: "var(--text-primary)" }}>Company</h4>
              <ul className="space-y-4 text-sm" style={{ color: "var(--text-secondary)" }}>
                <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-sm uppercase tracking-widest mb-6" style={{ color: "var(--text-primary)" }}>Support</h4>
              <ul className="space-y-4 text-sm" style={{ color: "var(--text-secondary)" }}>
                <li><Link href="/docs" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                <li style={{ color: "var(--brand-400)" }}>+91 7710884479</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-6" style={{ borderColor: "var(--border-subtle)" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              © 2026 Trinity Pixels AI Pvt Ltd. All rights reserved.
            </p>
            <div className="flex gap-8 text-xs" style={{ color: "var(--text-muted)" }}>
              <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> PCI DSS Compliant</span>
              <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> ISO 27001 Certified</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
