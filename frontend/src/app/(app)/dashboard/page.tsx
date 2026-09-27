"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Cell, Line, LineChart, Pie, PieChart, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, Flame, RefreshCw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { Overview as OverviewT, RatingSeries } from "@/lib/types";
import { DifficultyDonut } from "@/components/charts";
import { Heatmap } from "@/components/heatmap";
import { PlatformBadge } from "@/components/platform-badge";

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
  const maxSolved = Math.max(1, ...radarData.map((d) => d.solved));

  if (error) return <p className="text-destructive">{error}</p>;
  if (!overview || !totals) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 md:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const hasPlatforms = overview.platforms.length > 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mission Control</h1>
          <p className="mt-1 text-muted-foreground">Your coding stats across every platform.</p>
        </div>
        <Button onClick={syncNow} disabled={syncing} variant="outline">
          <RefreshCw className={`mr-2 size-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing…" : "Sync now"}
        </Button>
      </div>

      {!hasPlatforms && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-5">
            <p className="text-sm">👋 Connect your first coding platform to unlock your dashboard and the AI mentor.</p>
            <Link href="/platforms"><Button>Connect platforms</Button></Link>
          </CardContent>
        </Card>
      )}

      {overview.insight && (
        <Card className="border-indigo-400/30 bg-indigo-500/10">
          <CardContent className="py-5">
            <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-300">
              <Activity className="size-3.5" /> AI weekly insight
            </div>
            <p className="text-sm leading-relaxed">{overview.insight}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total solved</CardTitle></CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold">{totals.solved.toLocaleString()}</div>
            <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
              <span className="text-emerald-400">{totals.easy} easy</span>
              <span className="text-amber-400">{totals.medium} med</span>
              <span className="text-rose-400">{totals.hard} hard</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Best rating</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-4xl font-extrabold">
              <Trophy className="size-7 text-yellow-400" />
              {totals.rating ? Math.round(totals.rating) : "—"}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">across contest platforms</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Current streak</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-4xl font-extrabold">
              <Flame className="size-7 text-orange-400" />{totals.streak}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">consecutive active days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Active days (1y)</CardTitle></CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold">{totals.active_days}</div>
            <p className="mt-2 text-xs text-muted-foreground">days with submissions</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Difficulty split</CardTitle></CardHeader>
          <CardContent><DifficultyDonut easy={totals.easy} medium={totals.medium} hard={totals.hard} /></CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Topic strength</CardTitle></CardHeader>
          <CardContent>
            {radarData.length >= 3 ? (
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(148,163,184,0.2)" />
                  <PolarAngleAxis dataKey="topic" tick={{ fill: "#7c8aa5", fontSize: 11 }} />
                  <Radar dataKey="solved" stroke="#2dd4bf" fill="#2dd4bf" fillOpacity={0.35} />
                  <Tooltip contentStyle={{ background: "#0d1526", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 8 }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">Connect a platform to see your topic strengths.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overview.platforms.map((p) => {
          const s = p.stats || ({} as typeof p.stats);
          const solved = (s.total_solved as number) || 0;
          return (
            <Card key={p.platform}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm capitalize">
                    <PlatformBadge platform={p.platform} /> {p.platform === "gfg" ? "GeeksforGeeks" : p.platform}
                  </CardTitle>
                  {p.status === "ok" && <span className="size-2 rounded-full bg-emerald-400" title="Synced" />}
                  {p.status === "error" && <span className="size-2 rounded-full bg-rose-400" title={p.last_error} />}
                  {p.status === "pending" && <span className="size-2 rounded-full bg-amber-400" title="Sync pending" />}
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-mono text-xs text-muted-foreground">@{p.handle}</p>
                <div className="text-2xl font-bold">{solved.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">solved</span></div>
                {s.rating != null && <p className="text-xs text-muted-foreground">rating {Math.round(s.rating as number)}</p>}
                {s.easy != null && (
                  <div className="space-y-1 pt-1">
                    <Progress value={solved ? ((s.easy as number) / solved) * 100 : 0} className="h-1.5" />
                    <p className="text-xs text-muted-foreground">E{s.easy} · M{s.medium} · H{s.hard}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Activity heatmap</CardTitle></CardHeader>
        <CardContent>{<Heatmap data={heatmap} />}</CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Rating history</CardTitle></CardHeader>
          <CardContent>
            {Object.entries(ratings).some(([, v]) => v.length > 0) ? (
              <div className="space-y-5">
                {Object.entries(ratings).map(([platform, series]) =>
                  series.length ? (
                    <div key={platform}>
                      <p className="mb-2 text-xs font-medium capitalize text-muted-foreground">{platform}</p>
                      <RatingSparkline series={series} />
                    </div>
                  ) : null
                )}
              </div>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">No contest history yet.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Recent solves</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {overview.recent.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">Nothing yet — sync your platforms.</p>}
            {overview.recent.map((s, i) => (
              <a key={i} href={s.url || "#"} target="_blank" rel="noreferrer"
                className="flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm hover:bg-secondary/60">
                <span className="flex min-w-0 items-center gap-2">
                  <PlatformBadge platform={s.platform} />
                  <span className="truncate">{s.title}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{s.solved_at?.slice(0, 10)}</span>
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
          contentStyle={{ background: "#0d1526", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 8 }}
          labelFormatter={(v) => `Contest ${Number(v) + 1}`}
          formatter={(v) => [v, "rating"]}
        />
        <Line type="monotone" dataKey="rating" stroke="#38bdf8" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
