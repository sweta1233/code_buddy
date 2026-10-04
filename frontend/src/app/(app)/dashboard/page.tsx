"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Cell, Line, LineChart, Pie, PieChart, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, ArrowUpRight, CheckCircle2, ChevronRight, Flame, Layers, RefreshCw, Sparkles, Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { Overview as OverviewT, RatingSeries } from "@/lib/types";
import { DifficultyDonut } from "@/components/charts";
import { Heatmap } from "@/components/heatmap";
import { PlatformBadge } from "@/components/platform-badge";

const PLATFORM_NAMES: Record<string, string> = {
  leetcode: "LeetCode",
  codeforces: "Codeforces",
  codechef: "CodeChef",
  gfg: "GeeksforGeeks",
  hackerrank: "HackerRank",
  atcoder: "AtCoder",
};

const PLATFORM_THEMES: Record<string, { border: string; bg: string; badge: string }> = {
  leetcode: { border: "border-amber-500/30 hover:border-amber-400/50", bg: "from-amber-500/10 via-card to-card", badge: "bg-amber-500/15 text-amber-400" },
  codeforces: { border: "border-sky-500/30 hover:border-sky-400/50", bg: "from-sky-500/10 via-card to-card", badge: "bg-sky-500/15 text-sky-400" },
  codechef: { border: "border-yellow-600/30 hover:border-yellow-500/50", bg: "from-yellow-600/10 via-card to-card", badge: "bg-yellow-500/15 text-yellow-300" },
  gfg: { border: "border-emerald-500/30 hover:border-emerald-400/50", bg: "from-emerald-500/10 via-card to-card", badge: "bg-emerald-500/15 text-emerald-400" },
  hackerrank: { border: "border-teal-500/30 hover:border-teal-400/50", bg: "from-teal-500/10 via-card to-card", badge: "bg-teal-500/15 text-teal-400" },
  atcoder: { border: "border-purple-500/30 hover:border-purple-400/50", bg: "from-purple-500/10 via-card to-card", badge: "bg-purple-500/15 text-purple-400" },
};

export default function DashboardPage() {
  const [overview, setOverview] = useState<OverviewT | null>(null);
  const [ratings, setRatings] = useState<RatingSeries>({});
  const [heatmap, setHeatmap] = useState<Record<string, number>>({});
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      const [o, r, h] = await Promise.all([
        api<OverviewT>("/api/stats/overview"),
        api<RatingSeries>("/api/stats/ratings"),
        api<Record<string, number>>("/api/stats/heatmap"),
      ]);
      setOverview(o); setRatings(r); setHeatmap(h);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  // Fetch the user's dashboard data after the page mounts.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);

  async function syncNow() {
    setSyncing(true);
    try {
      await api("/api/platforms/sync", { method: "POST" });
      setTimeout(load, 12000);
    } finally {
      setTimeout(() => setSyncing(false), 12000);
    }
  }

  const totals = overview?.totals;
  const radarData = useMemo(
    () => (overview?.topics || []).slice(0, 8).map((t) => ({ topic: t.name, solved: t.solved })),
    [overview]
  );

  if (error) return <p className="text-destructive font-medium">{error}</p>;
  if (!overview || !totals) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 md:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  const hasPlatforms = overview.platforms.length > 0;

  return (
    <div className="space-y-8">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-400">
            <Sparkles className="size-3.5" /> Mission Control
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
            Coding Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Unified analytics, difficulty breakdowns, and performance tracking across your competitive profiles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={syncNow} disabled={syncing} variant="outline" className="border-border/80 shadow-sm backdrop-blur hover:bg-secondary/70">
            <RefreshCw className={`mr-2 size-4 ${syncing ? "animate-spin text-teal-400" : ""}`} />
            {syncing ? "Syncing stats…" : "Sync All Profiles"}
          </Button>
          <Link href="/mentor">
            <Button className="bg-gradient-to-r from-teal-400 to-sky-500 font-semibold text-slate-950 shadow-md shadow-teal-500/20 hover:opacity-95">
              <Zap className="mr-1.5 size-4" /> Ask AI Mentor
            </Button>
          </Link>
        </div>
      </div>

      {/* No platform connected banner */}
      {!hasPlatforms && (
        <Card className="border-teal-500/40 bg-gradient-to-r from-teal-500/15 via-sky-500/10 to-indigo-500/10 shadow-lg backdrop-blur">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
            <div>
              <h3 className="font-semibold text-foreground">Connect your coding platforms</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Link LeetCode, Codeforces, CodeChef, GFG, HackerRank, or AtCoder to unlock all insights.
              </p>
            </div>
            <Link href="/platforms">
              <Button className="bg-teal-400 text-slate-950 font-bold hover:bg-teal-300">
                Connect Handles <ChevronRight className="ml-1 size-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* AI Weekly Insight Card */}
      {overview.insight && (
        <Card className="border-indigo-400/30 bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-teal-500/10 shadow-lg backdrop-blur">
          <CardContent className="py-5">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-300">
                <Activity className="size-4 text-indigo-400" />
                <span>AI Mentor Weekly Performance Diagnosis</span>
              </div>
              <span className="rounded-full bg-indigo-400/20 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-200">
                Live RAG Analysis
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-200 font-normal">{overview.insight}</p>
          </CardContent>
        </Card>
      )}

      {/* Top 4 Key Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Solved Card */}
        <Card className="relative overflow-hidden border-teal-500/30 bg-gradient-to-br from-teal-500/15 via-card to-card shadow-lg transition hover:border-teal-400/50">
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-teal-400/15 blur-2xl" />
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-teal-300/90">
              Total Solved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tracking-tight text-foreground">
              {totals.solved.toLocaleString()}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
              <span className="inline-flex items-center rounded-md bg-emerald-500/15 px-2 py-0.5 text-emerald-400">
                {totals.easy} Easy
              </span>
              <span className="inline-flex items-center rounded-md bg-amber-500/15 px-2 py-0.5 text-amber-400">
                {totals.medium} Med
              </span>
              <span className="inline-flex items-center rounded-md bg-rose-500/15 px-2 py-0.5 text-rose-400">
                {totals.hard} Hard
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Peak Rating Card */}
        <Card className="relative overflow-hidden border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-card to-card shadow-lg transition hover:border-amber-400/50">
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-400/15 blur-2xl" />
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-amber-300/90">
              Peak Contest Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2.5 text-4xl font-black tracking-tight text-amber-300">
              <Trophy className="size-7 text-amber-400 shrink-0" />
              {totals.rating ? Math.round(totals.rating) : "—"}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">across all contest platforms</p>
          </CardContent>
        </Card>

        {/* Active Streak Card */}
        <Card className="relative overflow-hidden border-orange-500/30 bg-gradient-to-br from-orange-500/15 via-card to-card shadow-lg transition hover:border-orange-400/50">
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-orange-400/15 blur-2xl" />
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-orange-300/90">
              Active Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2.5 text-4xl font-black tracking-tight text-orange-400">
              <Flame className="size-7 text-orange-400 shrink-0" />
              {totals.streak} <span className="text-base font-normal text-muted-foreground">days</span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">consecutive active practice</p>
          </CardContent>
        </Card>

        {/* Active Days Card */}
        <Card className="relative overflow-hidden border-indigo-500/30 bg-gradient-to-br from-indigo-500/15 via-card to-card shadow-lg transition hover:border-indigo-400/50">
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-indigo-400/15 blur-2xl" />
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-indigo-300/90">
              Active Days (1y)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tracking-tight text-foreground">
              {totals.active_days}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">days with recorded submissions</p>
          </CardContent>
        </Card>
      </div>

      {/* Difficulty Split & Topic Strength Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border/80 bg-card/70 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span>Difficulty Split</span>
              <span className="text-xs font-normal text-muted-foreground">All Platforms</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DifficultyDonut easy={totals.easy} medium={totals.medium} hard={totals.hard} />
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/70 backdrop-blur lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span>Topic Mastery & Strengths</span>
              <span className="text-xs font-normal text-muted-foreground">Top 8 DSA Topics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {radarData.length >= 3 ? (
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(148,163,184,0.18)" />
                  <PolarAngleAxis dataKey="topic" tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 500 }} />
                  <Radar dataKey="solved" stroke="#2dd4bf" fill="#2dd4bf" fillOpacity={0.35} />
                  <Tooltip
                    contentStyle={{
                      background: "#0d1526",
                      border: "1px solid rgba(45,212,191,0.3)",
                      borderRadius: 10,
                      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-56 flex-col items-center justify-center text-center text-sm text-muted-foreground">
                <Layers className="size-8 text-muted-foreground/50 mb-2" />
                <p>Connect platforms to generate your topic mastery radar.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 6-Platform Individual Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Connected Platform Accounts</h2>
          <Link href="/platforms" className="text-xs text-teal-400 hover:underline flex items-center gap-1">
            Manage handles <ArrowUpRight className="size-3.5" />
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {overview.platforms.map((p) => {
            const s = p.stats || ({} as typeof p.stats);
            const solved = (s.total_solved as number) || 0;
            const theme = PLATFORM_THEMES[p.platform] || {
              border: "border-border/80",
              bg: "from-secondary/30 via-card to-card",
              badge: "bg-secondary text-foreground",
            };

            return (
              <Card
                key={p.platform}
                className={`relative overflow-hidden border bg-gradient-to-br ${theme.bg} ${theme.border} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm font-bold">
                      <PlatformBadge platform={p.platform} />
                      <span>{PLATFORM_NAMES[p.platform] || p.platform}</span>
                    </CardTitle>
                    {p.status === "ok" && (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                        <span className="size-1.5 rounded-full bg-emerald-400" /> Synced
                      </span>
                    )}
                    {p.status === "error" && (
                      <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-400" title={p.last_error}>
                        Error
                      </span>
                    )}
                    {p.status === "pending" && (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                        Syncing…
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-xs text-muted-foreground">@{p.handle}</p>
                    {s.rating != null && (
                      <span className="font-mono text-xs font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded">
                        Rating {Math.round(s.rating as number)}
                      </span>
                    )}
                  </div>

                  <div className="text-2xl font-black text-foreground">
                    {solved.toLocaleString()}{" "}
                    <span className="text-xs font-normal text-muted-foreground">solved</span>
                  </div>

                  {s.easy != null && (
                    <div className="space-y-1.5 pt-1">
                      <Progress value={solved ? ((s.easy as number) / solved) * 100 : 0} className="h-1.5 bg-secondary" />
                      <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
                        <span className="text-emerald-400 font-semibold">E: {s.easy}</span>
                        <span className="text-amber-400 font-semibold">M: {s.medium}</span>
                        <span className="text-rose-400 font-semibold">H: {s.hard}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Activity Heatmap Card */}
      <Card className="border-border/80 bg-card/70 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold flex items-center justify-between">
            <span>Activity & Submission Heatmap</span>
            <span className="text-xs font-normal text-muted-foreground">Past 365 Days</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Heatmap data={heatmap} />
        </CardContent>
      </Card>

      {/* Rating History Sparklines & Recent Solves */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Rating History */}
        <Card className="border-border/80 bg-card/70 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">Contest Rating Trajectory</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(ratings).some(([, v]) => v.length > 0) ? (
              <div className="space-y-6 pt-2">
                {Object.entries(ratings).map(([platform, series]) =>
                  series.length ? (
                    <div key={platform} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold capitalize text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <PlatformBadge platform={platform} /> {platform}
                        </span>
                        <span className="font-mono text-foreground font-bold">
                          Latest: {series[series.length - 1]?.rating}
                        </span>
                      </div>
                      <RatingSparkline series={series} />
                    </div>
                  ) : null
                )}
              </div>
            ) : (
              <div className="py-16 text-center text-sm text-muted-foreground">
                No contest ratings recorded yet. Participate in contests on Codeforces or LeetCode to see curves.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Solves Feed */}
        <Card className="border-border/80 bg-card/70 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span>Recent Problem Solves</span>
              <span className="text-xs font-normal text-muted-foreground">Live Feed</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {overview.recent.length === 0 && (
              <div className="py-16 text-center text-sm text-muted-foreground">
                No recent submissions detected — sync your accounts.
              </div>
            )}
            {overview.recent.map((s, i) => (
              <a
                key={i}
                href={s.url || "#"}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-sm transition hover:bg-secondary/70 group"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <PlatformBadge platform={s.platform} />
                  <span className="truncate font-medium group-hover:text-teal-300 transition-colors">
                    {s.title}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {s.solved_at?.slice(0, 10)}
                </span>
              </a>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RatingSparkline({ series }: { series: { date: string | null; rating: number }[] }) {
  const data = series.slice(-60).map((p, i) => ({ i, rating: p.rating, date: p.date }));
  return (
    <ResponsiveContainer width="100%" height={110}>
      <LineChart data={data}>
        <YAxis domain={["dataMin - 50", "dataMax + 50"]} hide />
        <Tooltip
          contentStyle={{
            background: "#0d1526",
            border: "1px solid rgba(56,189,248,0.3)",
            borderRadius: 8,
            boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
          }}
          labelFormatter={(v) => `Contest #${Number(v) + 1}`}
          formatter={(v) => [v, "Rating"]}
        />
        <Line type="monotone" dataKey="rating" stroke="#38bdf8" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
