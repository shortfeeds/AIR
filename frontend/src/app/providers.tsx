"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "react-hot-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster 
        position="bottom-right" 
        toastOptions={{ 
          style: { 
            background: 'var(--bg-secondary)', 
            color: 'var(--text-primary)', 
            border: '1px solid var(--border-subtle)',
            fontSize: '14px'
          } 
        }} 
      />
    </QueryClientProvider>
  );
}
