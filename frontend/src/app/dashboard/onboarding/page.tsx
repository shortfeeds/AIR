"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api, getToken } from "@/lib/api";
import { toast } from "react-hot-toast";
import { Loader2, Building, Globe, MessageSquare, ShieldCheck, ArrowRight, CheckCircle2, Upload, FileText } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  
  const { data: userRes, isLoading: isLoadingUser } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => api("/auth/me")
  });

  const { data: settingsRes, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api("/settings")
  });

  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [primaryServices, setPrimaryServices] = useState("");
  const [aiGoal, setAiGoal] = useState("book_appointment");
  const [topFaqs, setTopFaqs] = useState("");
  
  // KYC & Compliance State
  const [kycType, setKycType] = useState("aadhar");
  const [kycNumber, setKycNumber] = useState("");
  const [kycFile, setKycFile] = useState<File | null>(null);
  const [kycUrl, setKycUrl] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [safeUsageAccepted, setSafeUsageAccepted] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (settingsRes?.settings) {
      setBusinessName(settingsRes.settings.business_name || "");
      setWebsiteUrl(settingsRes.settings.website_url || "");
      setPrimaryServices(settingsRes.settings.knowledge?.primary_services || "");
      setAiGoal(settingsRes.settings.knowledge?.ai_goal || "book_appointment");
      
      const faqs = settingsRes.settings.knowledge?.top_faqs;
      if (Array.isArray(faqs)) {
        setTopFaqs(faqs.map((f: any) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n"));
      }
    }
  }, [settingsRes]);

  const user = userRes?.user;
  
  // If already active and has a number, kick them to dashboard
  useEffect(() => {
    if (user && user.onboarding_status === 'active' && user.plivo_number) {
      router.push("/dashboard");
    }
  }, [user, router]);

  if (isLoadingUser || isLoadingSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F19]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // If they have already submitted but are waiting for the admin to assign a number
  if (user?.onboarding_status === 'pending_review' || (user?.onboarding_status === 'active' && !user?.plivo_number)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] p-6 animate-fade-in">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-24 h-24 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-indigo-500/20">
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Identity & Setup Review</h1>
          <p className="text-white/50 leading-relaxed font-medium">
            Thank you! Your KYC details and business profile are currently under review. Our team is configuring your AI agent, preparing compliance channels, and assigning your dedicated phone number.
          </p>
          <div className="bg-white/5 border border-white/5 p-4 rounded-xl mt-8 inline-block">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-400">Current Status</p>
            <p className="text-sm font-extrabold text-white mt-1">Under Admin Review</p>
          </div>
        </div>
      </div>
    );
  }

  const handleNext = () => {
    if (step === 1) {
      if (!businessName || !websiteUrl) return toast.error("Please fill in all fields");
      setStep(2);
    } else if (step === 2) {
      if (!primaryServices) return toast.error("Please provide your primary services");
      setStep(3);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    const token = getToken();
    const formData = new FormData();
    formData.append("file", file);

    try {
      const getApiBase = () => {
        if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
        if (typeof window !== 'undefined') {
          const host = window.location.hostname;
          const protocol = window.location.protocol;
          const port = window.location.port;
          if (port === '3000') return `${protocol}//${host}:4000/api`;
        }
        return 'http://localhost:4000/api';
      };

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${getApiBase()}/upload/kyc`, {
        method: "POST",
        headers,
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload file");

      setKycUrl(data.url);
      setKycFile(file);
      toast.success("Document uploaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload KYC document");
    } finally {
      setIsUploading(false);
    }
  };

  const submitOnboarding = async () => {
    if (!kycNumber) return toast.error("Please enter your document number");
    if (!kycUrl) return toast.error("Please upload your document image");
    if (!termsAccepted || !safeUsageAccepted) return toast.error("You must accept all compliance terms");

    setIsSubmitting(true);
    try {
      // Parse FAQs
      const faqArray = topFaqs.split("\n\n").filter(block => block.trim()).map(block => {
        const lines = block.split("\n");
        const qLine = lines.find(l => l.toUpperCase().startsWith("Q:"));
        const aLine = lines.find(l => l.toUpperCase().startsWith("A:"));
        return {
          q: qLine ? qLine.substring(2).trim() : block,
          a: aLine ? aLine.substring(2).trim() : ""
        };
      });

      // Save brand details
      await api("/settings/brand", {
        method: "PATCH",
        body: JSON.stringify({ business_name: businessName })
      });

      // Save AI details
      await api("/settings/ai", {
        method: "PATCH",
        body: JSON.stringify({
          website_url: websiteUrl,
          primary_services: primaryServices,
          top_faqs: faqArray,
          ai_goal: aiGoal
        })
      });

      // Mark as complete with KYC details
      await api("/settings/onboarding/complete", {
        method: "POST",
        body: JSON.stringify({
          kyc_document_type: kycType,
          kyc_document_number: kycNumber,
          kyc_document_url: kycUrl,
          terms_accepted: true
        })
      });

      toast.success("Onboarding submitted successfully!");
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit onboarding");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] p-6">
      <div className="max-w-xl w-full">
        {/* Progress Bar */}
        <div className="flex items-center gap-2 mb-12">
          <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-indigo-500' : 'bg-white/10'}`} />
          <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-indigo-500' : 'bg-white/10'}`} />
          <div className={`h-1.5 flex-1 rounded-full ${step >= 3 ? 'bg-indigo-500' : 'bg-white/10'}`} />
        </div>

        <div className="bg-white/5 border border-white/5 rounded-3xl p-8 md:p-12 shadow-2xl backdrop-blur-xl animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            {step === 1 && (
              <div className="space-y-8 animate-slide-up">
                <div>
                  <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/30">
                    <Building className="w-6 h-6 text-indigo-400" />
                  </div>
                  <h2 className="text-3xl font-black text-white tracking-tight mb-2">Welcome to Trinity Pixels</h2>
                  <p className="text-white/50 text-sm font-medium leading-relaxed">Let's get your AI Receptionist set up. First, tell us a bit about your business so we can tailor the AI to your brand.</p>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2 block">Business Name</label>
                    <input 
                      type="text" 
                      value={businessName} 
                      onChange={(e) => setBusinessName(e.target.value)} 
                      placeholder="e.g. Apex Legal Services" 
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2 block">Website URL</label>
                    <div className="relative">
                      <Globe className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                      <input 
                        type="url" 
                        value={websiteUrl} 
                        onChange={(e) => setWebsiteUrl(e.target.value)} 
                        placeholder="https://yourwebsite.com" 
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-14 pr-5 py-4 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleNext}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2 transition-all mt-8"
                >
                  Continue to AI Setup <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8 animate-slide-up">
                <div>
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-6 border border-emerald-500/30">
                    <MessageSquare className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h2 className="text-3xl font-black text-white tracking-tight mb-2">Train Your AI Agent</h2>
                  <p className="text-white/50 text-sm font-medium leading-relaxed">Give your AI the knowledge it needs to answer questions and help your callers effectively.</p>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2 block">Primary Goal</label>
                    <select 
                      value={aiGoal} 
                      onChange={(e) => setAiGoal(e.target.value)} 
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium appearance-none"
                    >
                      <option value="book_appointment">Book Appointments</option>
                      <option value="answer_faqs">Answer General FAQs</option>
                      <option value="take_message">Take Messages & Details</option>
                      <option value="qualify_leads">Qualify Leads</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2 block">Primary Services Offered</label>
                    <textarea 
                      value={primaryServices} 
                      onChange={(e) => setPrimaryServices(e.target.value)} 
                      placeholder="e.g. Criminal Defense, Corporate Law, Family Law..." 
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium min-h-[100px] resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2 block">Top FAQs (Format: Q: ... A: ...)</label>
                    <textarea 
                      value={topFaqs} 
                      onChange={(e) => setTopFaqs(e.target.value)} 
                      placeholder="Q: Where are you located?&#10;A: We are at 123 Main St.&#10;&#10;Q: Do you offer free consultations?&#10;A: Yes, the first 30 minutes are free." 
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium min-h-[150px] resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-4 mt-8">
                  <button 
                    onClick={() => setStep(1)}
                    className="px-6 py-4 rounded-xl border border-white/10 hover:bg-white/5 text-white font-bold transition-all"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleNext}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2 transition-all"
                  >
                    Next Step <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8 animate-slide-up">
                <div>
                  <div className="w-12 h-12 bg-rose-500/20 rounded-2xl flex items-center justify-center mb-6 border border-rose-500/30">
                    <ShieldCheck className="w-6 h-6 text-rose-400" />
                  </div>
                  <h2 className="text-3xl font-black text-white tracking-tight mb-2">Identity & Safety Terms</h2>
                  <p className="text-white/50 text-sm font-medium leading-relaxed">
                    To comply with telecommunication regulations and prevent illegal usage, we require a valid government ID before provisioning your dedicated number.
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2 block">Document Type</label>
                      <select 
                        value={kycType} 
                        onChange={(e) => setKycType(e.target.value)} 
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium appearance-none"
                      >
                        <option value="aadhar">Aadhar Card</option>
                        <option value="pan">PAN Card</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2 block">Document Number</label>
                      <input 
                        type="text" 
                        value={kycNumber} 
                        onChange={(e) => setKycNumber(e.target.value)} 
                        placeholder={kycType === 'aadhar' ? "12-digit Number" : "10-digit PAN"} 
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2 block">Upload ID Copy (JPEG/PNG/PDF)</label>
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-white/10 border-dashed rounded-xl cursor-pointer hover:bg-white/5 transition-all relative">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {isUploading ? (
                          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                        ) : kycFile ? (
                          <>
                            <FileText className="w-8 h-8 text-indigo-400 mb-2" />
                            <p className="text-xs font-bold text-white">{kycFile.name}</p>
                          </>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-white/30 mb-2" />
                            <p className="text-xs font-bold text-white/50">Click to upload document</p>
                          </>
                        )}
                      </div>
                      <input 
                        type="file" 
                        accept="image/*,.pdf" 
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} 
                        className="hidden" 
                      />
                    </label>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-white/10">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={termsAccepted} 
                        onChange={(e) => setTermsAccepted(e.target.checked)} 
                        className="mt-1 w-4 h-4 accent-indigo-500 rounded border-white/10" 
                      />
                      <span className="text-xs text-white/60 leading-relaxed">
                        I agree to the <strong>Terms of Service</strong> and authorize Trinity Pixels to procure and manage a dedicated telecommunications number on my behalf.
                      </span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={safeUsageAccepted} 
                        onChange={(e) => setSafeUsageAccepted(e.target.checked)} 
                        className="mt-1 w-4 h-4 accent-indigo-500 rounded border-white/10" 
                      />
                      <span className="text-xs text-white/60 leading-relaxed">
                        I pledge that this account and number will not be used for illegal activities, spam, cold-calling scams, or any unauthorized telemarketing in violation of DND protocols.
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-4 mt-8">
                  <button 
                    onClick={() => setStep(2)}
                    className="px-6 py-4 rounded-xl border border-white/10 hover:bg-white/5 text-white font-bold transition-all"
                  >
                    Back
                  </button>
                  <button 
                    onClick={submitOnboarding}
                    disabled={isSubmitting || isUploading}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Complete & Submit <CheckCircle2 className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
