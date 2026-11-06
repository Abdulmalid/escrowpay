"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Scale,
  ScanSearch,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import type { User } from "@/lib/db/types";
import { api } from "@/lib/client-api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/ui";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["client", "freelancer", "admin"] },
  { href: "/contracts", label: "Contracts", icon: FileText, roles: ["client", "freelancer", "admin"] },
  { href: "/payouts", label: "Payouts", icon: Wallet, roles: ["client", "freelancer", "admin"] },
  { href: "/fx", label: "FX Desk", icon: ArrowLeftRight, roles: ["client", "freelancer", "admin"] },
  { href: "/guardian", label: "Guardian", icon: ScanSearch, roles: ["client", "freelancer", "admin"] },
  { href: "/disputes", label: "Disputes", icon: Scale, roles: ["client", "freelancer", "admin"] },
  { href: "/history", label: "History", icon: History, roles: ["client", "freelancer", "admin"] },
  { href: "/admin", label: "Admin", icon: ShieldAlert, roles: ["admin"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["client", "freelancer", "admin"] },
];

export function AppShell({
  user,
  simulated,
  children,
}: {
  user: User;
  simulated: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const items = NAV.filter((item) => item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-abyss-950">
      {simulated ? (
        <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-1.5 text-center text-xs font-semibold text-amber-300">
          SIMULATED DEMO — no real money moves. Demo escrow workflow, not regulated escrow or custody.
        </div>
      ) : (
        <div className="border-b border-mint-500/20 bg-mint-500/10 px-4 py-1.5 text-center text-xs font-semibold text-mint-300">
          LIVE PROVIDER MODE — real financial infrastructure.
        </div>
      )}
      <div className="mx-auto flex max-w-7xl">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-800 px-4 py-6 md:flex">
          <Link href="/dashboard" className="flex items-center gap-2 px-2">
            <ShieldCheck className="size-6 text-mint-400" />
            <span className="font-display text-base font-bold text-white">EscrowPay</span>
          </Link>
          <nav className="mt-8 flex flex-1 flex-col gap-1">
            {items.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                    active
                      ? "bg-mint-500/15 text-mint-300"
                      : "text-slate-400 hover:bg-abyss-800 hover:text-white",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="rounded-lg border border-slate-800 p-3">
            <p className="truncate text-sm font-semibold text-white">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
            <div className="mt-2 flex items-center justify-between">
              <Badge variant="neutral">{user.role}</Badge>
              <button
                onClick={logout}
                className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white"
              >
                <LogOut className="size-3.5" /> Sign out
              </button>
            </div>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-6 py-3 md:hidden">
            <Link href="/dashboard" className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-mint-400" />
              <span className="font-display text-sm font-bold text-white">EscrowPay</span>
            </Link>
            <button onClick={logout} className="text-xs font-semibold text-slate-400">
              Sign out
            </button>
          </div>
          <nav className="flex gap-1 overflow-x-auto border-b border-slate-800 px-4 py-2 md:hidden">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold",
                  pathname === item.href ? "bg-mint-500/15 text-mint-300" : "text-slate-400",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <main className="px-4 py-8 md:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
