"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { Contest } from "@/lib/types";
import { PlatformBadge } from "@/components/platform-badge";

export default function ContestsPage() {
  const [contests, setContests] = useState<Contest[] | null>(null);

  useEffect(() => {
    api<{ contests: Contest[] }>("/api/contests").then((r) => setContests(r.contests)).catch(() => setContests([]));
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
          <CalendarDays className="size-7 text-primary" /> Contest calendar
        </h1>
        <p className="mt-1 text-muted-foreground">Upcoming Codeforces & LeetCode contests, refreshed hourly.</p>
      </div>

      {!contests && <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>}

      <div className="space-y-3">
        {contests?.map((c) => {
          const dt = new Date(c.start_time);
          const dateStr = dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
          const timeStr = dt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
          return (
            <a key={c.url} href={c.url} target="_blank" rel="noreferrer">
              <Card className="transition hover:border-primary/40">
                <CardContent className="flex items-center gap-5 py-5">
                  <div className="flex w-20 shrink-0 flex-col items-center rounded-lg bg-secondary px-3 py-2">
                    <span className="text-xs text-muted-foreground">{dateStr.split(" ")[0]}</span>
                    <span className="text-lg font-bold">{dt.getDate()}</span>
                    <span className="text-[10px] text-muted-foreground">{dt.toLocaleString(undefined, { month: "short" })}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-medium">
                      <PlatformBadge platform={c.platform} />
                      <span className="truncate">{c.name}</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {dateStr} · {timeStr} · {Math.floor(c.duration_minutes / 60)}h {c.duration_minutes % 60}m
                    </p>
                  </div>
                </CardContent>
              </Card>
            </a>
          );
        })}
        {contests?.length === 0 && <p className="py-16 text-center text-sm text-muted-foreground">No upcoming contests found (check your connection).</p>}
      </div>
    </div>
  );
}
