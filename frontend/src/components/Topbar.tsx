"use client";
import { useRouter } from "next/navigation";
import { LogOut, Bell, User } from "lucide-react";
import { removeToken } from "@/lib/api";

interface TopbarProps {
  userName?: string;
  planName?: string;
  availableMinutes?: number;
  plivoNumber?: string;
  role?: string;
}

export default function Topbar({ userName, planName, availableMinutes, plivoNumber, role }: TopbarProps) {
  const router = useRouter();

  const handleLogout = () => {
    removeToken();
    router.push("/login");
  };

  return (
    <header className="h-16 border-b flex items-center justify-between px-6" style={{ background: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}>
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Welcome back, {userName || "User"}
          </h2>
          {role !== "admin" && planName && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {planName.charAt(0).toUpperCase() + planName.slice(1)} Plan · {availableMinutes ?? 0} mins remaining
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {plivoNumber && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs" style={{ borderColor: "var(--border-default)", color: "var(--brand-300)" }}>
            📞 {plivoNumber}
          </div>
        )}
        {role === "admin" && (
          <span className="badge badge-brand">
            <User className="w-3 h-3 mr-1" /> Admin
          </span>
        )}
        <button className="btn-ghost p-2 relative">
          <Bell className="w-4 h-4" />
        </button>
        <button onClick={handleLogout} className="btn-ghost p-2" title="Logout">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
