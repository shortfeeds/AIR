"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CreditCard, Settings, Phone, Shield, Users, FileText, Bell } from "lucide-react";

const clientNav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/usage", label: "Usage & Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const adminNav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/onboarding", label: "Onboarding Queue", icon: FileText },
  { href: "/admin/knowledge", label: "KB Updates", icon: Bell },
  { href: "/admin/settings", label: "System Settings", icon: Settings },
];

export default function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const navItems = isAdmin ? adminNav : clientNav;

  return (
    <aside className="w-64 h-screen flex flex-col border-r" style={{ background: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}>
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

      <nav className="flex-1 p-4 space-y-1">
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
  );
}
