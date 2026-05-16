"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service like Sentry
    console.error("Global boundary caught an error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg-primary)" }}>
      <div className="card max-w-md w-full p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-rose-500/10 border border-rose-500/20">
          <AlertCircle className="w-8 h-8 text-rose-500" />
        </div>
        
        <div>
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong!</h2>
          <p className="text-sm opacity-60 leading-relaxed text-white/80">
            An unexpected error occurred in the dashboard. Our team has been notified.
          </p>
        </div>

        <button
          onClick={() => reset()}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm"
        >
          <RefreshCw className="w-4 h-4" /> Try again
        </button>
      </div>
    </div>
  );
}
