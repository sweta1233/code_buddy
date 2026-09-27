"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Flame, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { API_URL } from "@/lib/api";
import type { Overview as OverviewT, RatingSeries } from "@/lib/types";
import { LogoWordmark } from "@/components/logo";
import { DifficultyDonut } from "@/components/charts";
import { Heatmap } from "@/components/heatmap";
import { PlatformBadge } from "@/components/platform-badge";

interface PublicProfile {
  name: string; username: string; college: string; grad_year: number | null;
  member_since: string; totals: OverviewT["totals"]; platforms: OverviewT["platforms"];
  topics: OverviewT["topics"]; recent: OverviewT["recent"]; ratings: RatingSeries;
  heatmap: Record<string, number>;
}

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/api/public/profile/${username}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Profile not found");
        return r.json();
      })
      .then(setProfile)
      .catch((e) => setError(e.message));
  }, [username]);

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <LogoWordmark size={48} />
        <p className="text-muted-foreground">{error}</p>
        <Link href="/" className="text-primary hover:underline"><ArrowLeft className="mr-1 inline size-4" />Back home</Link>
      </main>
    );
  }
  if (!profile) {
    return (
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-12">
        <Skeleton className="h-32" />
        <div className="grid gap-4 md:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-64" />
      </main>
    );
  }

  const totals = profile.totals;

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-12">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Powered by CodeBuddy
        </Link>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-6 py-8">
          <div className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-indigo-500 text-3xl font-extrabold text-white">
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold">{profile.name}</h1>
            <p className="text-muted-foreground">@{profile.username}{profile.college && ` · ${profile.college}`}{profile.grad_year && ` · '${String(profile.grad_year).slice(2)}`}</p>
          </div>
          <div className="flex gap-6 text-center">
            <div><div className="text-2xl font-bold text-primary">{totals.solved.toLocaleString()}</div><div className="text-xs text-muted-foreground">solved</div></div>
            <div><div className="flex items-center justify-center gap-1 text-2xl font-bold text-yellow-400"><Trophy className="size-5" />{totals.rating ? Math.round(totals.rating) : "—"}</div><div className="text-xs text-muted-foreground">best rating</div></div>
            <div><div className="flex items-center justify-center gap-1 text-2xl font-bold text-orange-400"><Flame className="size-5" />{totals.streak}</div><div className="text-xs text-muted-foreground">streak</div></div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {profile.platforms.map((p) => {
          const s = p.stats || ({} as typeof p.stats);
          const solved = (s.total_solved as number) || 0;
          return (
            <Card key={p.platform}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm capitalize">
                  <PlatformBadge platform={p.platform} /> {p.platform === "gfg" ? "GeeksforGeeks" : p.platform}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{solved.toLocaleString()}</div>
                <a className="font-mono text-xs text-muted-foreground hover:text-primary" href={platformUrl(p.platform, p.handle)} target="_blank" rel="noreferrer">@{p.handle}</a>
                {s.rating != null && <div className="mt-1 text-xs text-muted-foreground">rating {Math.round(s.rating as number)}</div>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Difficulty split</CardTitle></CardHeader>
          <CardContent><DifficultyDonut easy={totals.easy} medium={totals.medium} hard={totals.hard} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Strongest topics</CardTitle></CardHeader>
          <CardContent className="space-y-2.5">
            {profile.topics.slice(0, 8).map((t) => (
              <div key={t.name} className="space-y-1">
                <div className="flex justify-between text-sm"><span>{t.name}</span><span className="text-muted-foreground">{t.solved}</span></div>
                <Progress value={(t.solved / (profile.topics[0]?.solved || 1)) * 100} className="h-1.5" />
              </div>
            ))}
            {profile.topics.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No topic data yet.</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Activity</CardTitle></CardHeader>
        <CardContent>
          <Heatmap data={profile.heatmap || {}} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent solves</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {profile.recent.map((s, i) => (
            <a key={i} href={s.url || "#"} target="_blank" rel="noreferrer"
              className="flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm hover:bg-secondary/60">
              <span className="flex min-w-0 items-center gap-2"><PlatformBadge platform={s.platform} /><span className="truncate">{s.title}</span></span>
              <span className="shrink-0 text-xs text-muted-foreground">{s.solved_at?.slice(0, 10)}</span>
            </a>
          ))}
          {profile.recent.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Nothing public yet.</p>}
        </CardContent>
      </Card>
    </main>
  );
}

function platformUrl(platform: string, handle: string): string {
  const urls: Record<string, string> = {
    leetcode: `https://leetcode.com/u/${handle}`,
    codeforces: `https://codeforces.com/profile/${handle}`,
    codechef: `https://www.codechef.com/users/${handle}`,
    gfg: `https://www.geeksforgeeks.org/user/${handle}/`,
  };
  return urls[platform] || "#";
}
