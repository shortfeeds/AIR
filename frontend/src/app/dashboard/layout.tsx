"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { api, getToken } from "@/lib/api";

import { useQuery } from "@tanstack/react-query";

interface UserData {
  name: string;
  role: string;
  plan_name: string;
  available_minutes: number;
  plivo_number: string;
  onboarding_status: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const { data: userRes, isLoading: isLoadingUser, isError: isUserError } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error("No token");
      return api("/auth/me");
    },
    retry: false
  });

  const { data: alertsRes } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => api("/alerts"),
    enabled: !!userRes?.user
  });

  useEffect(() => {
    if (isUserError) {
      router.push("/login");
    } else if (userRes?.user) {
      const u = userRes.user as UserData;
      if (u.role === "admin") {
        router.push("/admin");
      } else {
        // Onboarding Gate Interceptor
        const isPending = u.onboarding_status === 'pending' || u.onboarding_status === 'pending_review' || !u.plivo_number;
        const currentPath = window.location.pathname;
        
        if (isPending && currentPath !== "/dashboard/onboarding") {
          router.push("/dashboard/onboarding");
        }
      }
    }
  }, [isUserError, userRes, router]);

  const loading = isLoadingUser;
  const user = userRes?.user as UserData | undefined;
  const alerts = alertsRes?.alerts || [];

  if (loading || !user) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: "var(--border-subtle)", borderTopColor: "var(--brand-500)" }} />
      </div>
    );
  }

  const isPending = user.onboarding_status === 'pending' || user.onboarding_status === 'pending_review' || !user.plivo_number;

  if (isPending) {
    return (
      <div className="flex h-screen overflow-hidden bg-[#0B0F19]">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Global Alert Banner */}
        {alerts.length > 0 && (
          <div className={`px-6 py-2 flex items-center justify-between gap-4 animate-slide-down ${
            alerts[0].type === 'danger' ? 'bg-rose-500 text-white' : 
            alerts[0].type === 'warning' ? 'bg-amber-500 text-black' : 
            'bg-indigo-500 text-white'
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-xs font-black uppercase tracking-tighter bg-white/20 px-1.5 py-0.5 rounded leading-none">Alert</span>
              <p className="text-xs font-bold truncate">{alerts[0].message}</p>
            </div>
            <button 
              onClick={() => router.push(alerts[0].action_link)}
              className="text-[10px] font-black uppercase tracking-widest bg-black/10 hover:bg-black/20 px-3 py-1 rounded-full transition-colors whitespace-nowrap"
            >
              {alerts[0].action_label}
            </button>
          </div>
        )}
        <Topbar userName={user?.name} planName={user?.plan_name} availableMinutes={user?.available_minutes} plivoNumber={user?.plivo_number} />
        <main className="flex-1 overflow-y-auto p-6 pb-24 md:pb-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
