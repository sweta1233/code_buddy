"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3, Bot, CalendarDays, FileText, LayoutDashboard, ListChecks, LogOut, Plug, User as UserIcon,
} from "lucide-react";
import { LogoMark } from "@/components/logo";
import { getToken, clearToken } from "@/lib/api";
import type { User } from "@/lib/types";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/platforms", label: "Platforms", icon: Plug },
  { href: "/mentor", label: "AI Mentor", icon: Bot },
  { href: "/plan", label: "AI Study Plan", icon: ListChecks },
  { href: "/sheets", label: "DSA Sheets", icon: BarChart3 },
  { href: "/contests", label: "Contests", icon: CalendarDays },
  { href: "/resume", label: "Resume", icon: FileText },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    try {
      setUser(JSON.parse(localStorage.getItem("codebuddy_user") || "null"));
    } catch { /* ignore */ }
    setReady(true);
  }, [router]);

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-border/60 bg-card/60 backdrop-blur">
        <Link href="/dashboard" className="flex h-16 items-center gap-2.5 border-b border-border/60 px-5">
          <LogoMark />
          <span className="text-lg font-bold tracking-tight">Code<span className="text-teal-400">Buddy</span></span>
        </Link>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="size-4.5" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border/60 p-3">
          {user && (
            <Link href={`/u/${user.username}`} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
              <UserIcon className="size-4.5" />
              <span className="truncate">My public profile</span>
            </Link>
          )}
          <button
            onClick={() => { clearToken(); router.push("/login"); }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="size-4.5" /> Log out
          </button>
        </div>
      </aside>
      <main className="ml-60 flex-1 overflow-x-hidden p-8">{children}</main>
    </div>
  );
}
