"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CreditCard, Settings, Phone, Shield, Users, FileText, Bell, TrendingUp, Sparkles, BarChart2, Gift } from "lucide-react";

const clientNav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/dashboard/referral", label: "Referral", icon: Gift },
  { href: "/dashboard/recordings", label: "Call Records", icon: Phone },
  { href: "/dashboard/usage", label: "Usage & Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const adminNav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/kanban", label: "Kanban Board", icon: LayoutDashboard },
  { href: "/admin/onboarding", label: "Onboarding Queue", icon: Sparkles },
  { href: "/admin/prompts", label: "Prompt Editor", icon: FileText },
  { href: "/admin/activity", label: "Activity Logs", icon: FileText },
  { href: "/admin/knowledge", label: "KB Updates", icon: Bell },
  { href: "/admin/settings", label: "System Settings", icon: Settings },
];

export default function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const navItems = isAdmin ? adminNav : clientNav;

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 h-screen flex-col border-r shrink-0 z-10" style={{ background: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}>
        <div className="p-5 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--brand-600), var(--brand-400))" }}>
              <Phone className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <span className="font-bold text-sm block" style={{ color: "var(--text-primary)" }}>Trinity Pixels</span>
              <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                {isAdmin ? "Admin Panel" : "Client Dashboard"}
              </span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {isAdmin && (
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-3 px-4" style={{ color: "var(--text-muted)" }}>
              <Shield className="w-3 h-3 inline mr-1" /> Administration
            </p>
          )}
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={`sidebar-link ${isActive ? "active" : ""}`}>
                <item.icon className="w-4.5 h-4.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="text-[10px] text-center" style={{ color: "var(--text-muted)" }}>
            © 2026 Trinity Pixels
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t flex justify-around items-center h-16 pb-safe" style={{ background: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}>
        {navItems.slice(0, 5).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={`flex flex-col items-center justify-center w-full h-full gap-1 ${isActive ? "text-indigo-400" : "text-gray-500 hover:text-gray-300"}`}>
              <item.icon className="w-5 h-5" />
              <span className="text-[9px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
