"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bot,
  CalendarDays,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Plug,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import { LogoMark } from "@/components/logo";
import { getToken, clearToken } from "@/lib/api";
import type { User } from "@/lib/types";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, badge: "" },
  { href: "/platforms", label: "Platforms", icon: Plug, badge: "6 Sync" },
  { href: "/mentor", label: "AI Mentor", icon: Bot, badge: "RAG" },
  { href: "/interview", label: "Interview Mentor", icon: ClipboardCheck, badge: "DSA" },
  { href: "/plan", label: "AI Study Plan", icon: ListChecks, badge: "Daily" },
  { href: "/sheets", label: "DSA Sheets", icon: BarChart3, badge: "" },
  { href: "/contests", label: "Contests", icon: CalendarDays, badge: ".ics" },
  { href: "/resume", label: "Resume Builder", icon: FileText, badge: "PDF" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const currentPage = pathname.split("/")[1] || "dashboard";

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    try {
      // Restore the authenticated user's display data from browser storage.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(JSON.parse(localStorage.getItem("codebuddy_user") || "null"));
    } catch { /* ignore */ }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <LogoMark />
          <span className="text-sm font-medium animate-pulse">Initializing CodeBuddy…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <div aria-hidden="true" className="route-backdrop" data-page={currentPage} />
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-border/70 bg-card/70 backdrop-blur-2xl">
        {/* Brand Header */}
        <Link href="/dashboard" className="flex h-16 items-center gap-3 border-b border-border/60 px-6 transition hover:opacity-90">
          <LogoMark />
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-tight text-foreground">
              Code<span className="text-teal-400">Buddy</span>
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              AI Portfolio & Mentor
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto p-4">
          <div className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            Navigation
          </div>
          {NAV.map(({ href, label, icon: Icon, badge }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-150 ${
                  active
                    ? "bg-gradient-to-r from-teal-500/20 to-sky-500/10 text-teal-300 border border-teal-500/30 shadow-sm"
                    : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`size-4.5 transition-colors ${active ? "text-teal-400" : "group-hover:text-foreground"}`} />
                  <span>{label}</span>
                </div>
                {badge && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      active
                        ? "bg-teal-400/20 text-teal-200"
                        : "bg-secondary/80 text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom User Area */}
        <div className="border-t border-border/60 p-4 space-y-2">
          {user && (
            <Link
              href={`/u/${user.username}`}
              className="group flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/40 p-2.5 transition hover:border-teal-500/40 hover:bg-secondary/80"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-indigo-500 text-sm font-bold text-slate-950">
                {user.name ? user.name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-foreground group-hover:text-teal-300 transition-colors">
                  {user.name || user.username}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">@{user.username}</p>
              </div>
            </Link>
          )}

          <button
            onClick={() => {
              clearToken();
              router.push("/login");
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive"
          >
            <LogOut className="size-4" />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="relative z-10 ml-64 flex-1 overflow-x-hidden p-8 sm:p-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
