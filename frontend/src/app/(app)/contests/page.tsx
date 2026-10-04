"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Calendar, CalendarDays, Download, ExternalLink, Filter, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, API_URL, getToken } from "@/lib/api";
import type { Contest } from "@/lib/types";
import { PlatformBadge } from "@/components/platform-badge";

function Countdown({ startTime }: { startTime: string }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    function update() {
      const diff = new Date(startTime).getTime() - Date.now();
      if (diff <= 0) {
        setIsLive(true);
        setTimeLeft("Live or starting now");
        return;
      }
      setIsLive(false);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);

      if (days > 0) {
        setTimeLeft(`in ${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`in ${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`in ${minutes}m`);
      }
    }
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        isLive ? "bg-rose-500/20 text-rose-300 animate-pulse" : "bg-primary/15 text-primary"
      }`}
    >
      <Bell className="size-3" /> {timeLeft}
    </span>
  );
}

export default function ContestsPage() {
  const [contests, setContests] = useState<Contest[] | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadContests = useCallback(async (forceRefresh = false) => {
    setRefreshing(true);
    try {
      const query = forceRefresh ? "?force_refresh=true" : "";
      const r = await api<{ contests: Contest[]; unavailable?: string[] }>(`/api/contests${query}`);
      setContests(r.contests);
      setUnavailable(r.unavailable || []);
    } catch {
      setContests([]);
      setUnavailable(["contest service"]);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Load remote contest data after the page mounts.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadContests(); }, [loadContests]);

  const filteredContests = (contests || []).filter((c) => {
    if (filter === "all") return true;
    return c.platform.toLowerCase() === filter.toLowerCase();
  });

  async function handleExportICS() {
    const token = getToken();
    const res = await fetch(`${API_URL}/api/contests/export.ics`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "codebuddy-contests.ics";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            <CalendarDays className="size-7 text-primary" /> Contest Calendar & Reminders
          </h1>
          <p className="mt-1 text-muted-foreground">
            Upcoming contests from Codeforces, LeetCode, CodeChef, and AtCoder with 1-click Google Calendar & .ics export.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => loadContests(true)} disabled={refreshing} className="flex items-center gap-2">
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportICS} className="flex items-center gap-2">
            <Download className="size-4" /> Export to .ics / Apple Calendar
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground mr-2">
          <Filter className="size-3.5" /> Filter:
        </span>
        {["all", "leetcode", "codeforces", "codechef", "atcoder"].map((p) => (
          <button
            key={p}
            onClick={() => setFilter(p)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
              filter === p
                ? "bg-primary text-primary-foreground font-semibold"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {p === "all" ? "All Platforms" : p.toUpperCase()}
          </button>
        ))}
      </div>

      {!contests && <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>}

      {unavailable.length > 0 && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Could not refresh contest schedules from {unavailable.join(", ")}. Any available cached contests are still shown; try Refresh again shortly.
        </p>
      )}

      <div className="space-y-3">
        {filteredContests.map((c) => {
          const dt = new Date(c.start_time);
          const dateStr = dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
          const timeStr = dt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
          const hours = Math.floor(c.duration_minutes / 60);
          const mins = c.duration_minutes % 60;
          const durationStr = `${hours > 0 ? `${hours}h ` : ""}${mins > 0 ? `${mins}m` : ""}` || `${c.duration_minutes}m`;

          return (
            <Card key={c.id || c.url} className="transition hover:border-primary/40">
              <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex w-16 shrink-0 flex-col items-center rounded-lg bg-secondary px-2 py-2">
                    <span className="text-[10px] text-muted-foreground uppercase">{dateStr.split(" ")[0]}</span>
                    <span className="text-base font-bold leading-none my-0.5">{dt.getDate()}</span>
                    <span className="text-[10px] text-muted-foreground">{dt.toLocaleString(undefined, { month: "short" })}</span>
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <PlatformBadge platform={c.platform} />
                      <span className="font-semibold text-sm truncate">{c.name}</span>
                      <Countdown startTime={c.start_time} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {dateStr} · {timeStr} · Duration: {durationStr}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {c.gcal_url && (
                    <a href={c.gcal_url} target="_blank" rel="noreferrer">
                      <Button variant="secondary" size="sm" className="h-8 text-xs flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-sky-400" />
                        <span>Google Cal</span>
                      </Button>
                    </a>
                  )}
                  <a href={c.url} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm" className="h-8 text-xs flex items-center gap-1.5">
                      <span>Open Contest</span>
                      <ExternalLink className="size-3.5" />
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {contests && filteredContests.length === 0 && (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No upcoming contests found for the selected filter.
          </p>
        )}
      </div>
    </div>
  );
}
