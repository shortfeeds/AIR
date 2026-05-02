"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { api, getToken } from "@/lib/api";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/login"); return; }
    api("/auth/me").then((data) => {
      if (data.user.role !== "admin") { router.push("/dashboard"); return; }
      setUser(data.user);
      setLoading(false);
    }).catch(() => router.push("/login"));
  }, [router]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: "var(--border-subtle)", borderTopColor: "var(--brand-500)" }} />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      <Sidebar isAdmin />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar userName={user?.name} role="admin" />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
