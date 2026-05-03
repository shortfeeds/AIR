"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Mic, MicOff, PhoneOff, Loader2, Volume2, CheckCircle } from "lucide-react";

export default function PublicCallPage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { clientId } = useParams();
  const [status, setStatus] = useState("ready"); // ready, connecting, active, ended
  const [muted, setMuted] = useState(false);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let interval: any;
    if (status === "active") {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const startCall = async () => {
    setStatus("connecting");
    // Simulate connection for now as Plivo WebRTC requires backend coordination
    setTimeout(() => {
      setStatus("active");
    }, 2000);
  };

  const endCall = () => {
    setStatus("ended");
    setTimeout(() => window.close(), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-white" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)" }}>
      <div className="text-center mb-12">
        <div className="w-24 h-24 rounded-full bg-indigo-600/20 flex items-center justify-center mx-auto mb-6 ring-4 ring-indigo-500/30 animate-pulse">
          <Volume2 className="w-10 h-10 text-indigo-400" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Trinity Pixels AI</h1>
        <p className="text-indigo-300/60 text-sm mt-1">AI Voice Receptionist</p>
      </div>

      <div className="card p-8 w-full max-w-sm bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl flex flex-col items-center">
        {status === "ready" && (
          <>
            <p className="text-center text-sm mb-8 opacity-60">Click below to start a free AI-powered call with our receptionist.</p>
            <button onClick={startCall} className="w-20 h-20 rounded-full bg-emerald-500 hover:bg-emerald-400 transition-all flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.4)] group">
              <Mic className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
            </button>
            <p className="mt-6 text-xs font-bold uppercase tracking-widest opacity-40">Start Conversation</p>
          </>
        )}

        {status === "connecting" && (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mb-4" />
            <p className="text-lg font-medium">Connecting...</p>
          </div>
        )}

        {status === "active" && (
          <div className="w-full flex flex-col items-center">
            <div className="text-4xl font-mono mb-8 tabular-nums">
              {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
            </div>
            
            <div className="flex gap-6">
              <button onClick={() => setMuted(!muted)} className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${muted ? 'bg-amber-500' : 'bg-white/10 hover:bg-white/20'}`}>
                {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              <button onClick={endCall} className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center transition-colors shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mt-12 flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20">
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              <span className="text-xs font-medium text-indigo-300">AI is listening...</span>
            </div>
          </div>
        )}

        {status === "ended" && (
          <div className="flex flex-col items-center py-8">
            <CheckCircle className="w-12 h-12 text-emerald-400 mb-4" />
            <p className="text-lg font-medium">Call Ended</p>
            <p className="text-sm opacity-50 mt-1">Thank you for using Trinity Pixels</p>
          </div>
        )}
      </div>

      <div className="mt-12 opacity-30 text-[10px] font-bold uppercase tracking-[0.2em]">
        Powered by Trinity Pixels AI
      </div>
    </div>
  );
}
