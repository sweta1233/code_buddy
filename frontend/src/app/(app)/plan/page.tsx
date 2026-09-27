"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Clock, Loader2, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import type { Plan } from "@/lib/types";

const TYPE_STYLES: Record<string, string> = {
  learn: "bg-sky-500/15 text-sky-300",
  practice: "bg-teal-500/15 text-teal-300",
  revise: "bg-violet-500/15 text-violet-300",
  contest: "bg-amber-500/15 text-amber-300",
};

export default function PlanPage() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ goal: "", target_date: "", hours_per_day: "2" });

  async function load() {
    try {
      const res = await api<{ plan: Plan | null }>("/api/plans/current");
      setPlan(res.plan);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setError("");
    try {
      const res = await api<{ plan: Plan }>("/api/plans/generate", {
        method: "POST",
        body: JSON.stringify({
          goal: form.goal,
          target_date: form.target_date || null,
          hours_per_day: Number(form.hours_per_day) || 2,
        }),
      });
      setPlan(res.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function toggleTask(taskId: number, done: boolean) {
    setPlan((p) => p && { ...p, tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, done } : t)) });
    await api(`/api/plans/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify({ done }) });
  }

  const weeks = useMemo(() => {
    if (!plan) return [];
    const byWeek = new Map<number, typeof plan.tasks>();
    for (const t of plan.tasks) {
      const list = byWeek.get(t.week_no) || [];
      list.push(t);
      byWeek.set(t.week_no, list);
    }
    return [...byWeek.entries()].sort((a, b) => a[0] - b[0]);
  }, [plan]);

  const doneCount = plan?.tasks.filter((t) => t.done).length || 0;
  const progress = plan && plan.tasks.length ? (doneCount / plan.tasks.length) * 100 : 0;

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="size-8 animate-spin text-primary" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
          <Wand2 className="size-7 text-primary" /> AI Study Plan
        </h1>
        <p className="mt-1 text-muted-foreground">
          A LangGraph pipeline reads your synced stats, drafts a plan, critiques itself, and refines it — personalized to you.
        </p>
      </div>

      {!plan && (
        <Card>
          <CardHeader><CardTitle className="text-base">Generate your personalized plan</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={generate} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="goal">What is your goal?</Label>
                <Input id="goal" required minLength={5} value={form.goal} onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}
                  placeholder="e.g. Master DSA for product-company interviews, reach Codeforces Expert" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="target" className="flex items-center gap-1.5"><CalendarDays className="size-3.5" /> Target date</Label>
                  <Input id="target" type="date" value={form.target_date} onChange={(e) => setForm((f) => ({ ...f, target_date: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="hours" className="flex items-center gap-1.5"><Clock className="size-3.5" /> Hours per day</Label>
                  <Input id="hours" type="number" min="0.5" max="16" step="0.5" value={form.hours_per_day}
                    onChange={(e) => setForm((f) => ({ ...f, hours_per_day: e.target.value }))} />
                </div>
              </div>
              {error && <p className="rounded-md bg-destructive/15 px-3 py-2 text-sm text-destructive">{error}</p>}
              <Button type="submit" size="lg" disabled={generating}>
                {generating ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Sparkles className="mr-1 size-4" />}
                {generating ? "Analyzing your stats & drafting…" : "Generate my plan"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Takes ~30–60s: analytics → draft → self-critique → refine → save. Sync your platforms first for best results.
              </p>
            </form>
          </CardContent>
        </Card>
      )}

      {plan && (
        <>
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">{plan.title}</h2>
                  <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{plan.summary}</p>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>🎯 {plan.goal}</span>
                    {plan.target_date && <span>📅 by {plan.target_date}</span>}
                    <span>⏱ {plan.hours_per_day}h/day</span>
                  </div>
                </div>
                <Button variant="outline" onClick={() => { setPlan(null); setForm((f) => ({ ...f, goal: plan.goal })); }}>
                  Regenerate
                </Button>
              </div>
              <div className="mt-5 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{doneCount}/{plan.tasks.length} tasks done</span>
                  <span className="text-muted-foreground">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {weeks.map(([weekNo, tasks]) => {
              const weekDone = tasks.filter((t) => t.done).length;
              const days = [...new Set(tasks.map((t) => t.day_no))].sort((a, b) => a - b);
              return (
                <Card key={weekNo}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      Week {weekNo}
                      <span className="text-xs font-normal text-muted-foreground">{weekDone}/{tasks.length} done</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {days.map((day) => (
                      <div key={day} className="rounded-lg border border-border/50 p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs">Day {day}</span>
                          {tasks.find((t) => t.day_no === day)?.topic && (
                            <span className="text-sm font-medium">{tasks.find((t) => t.day_no === day)!.topic}</span>
                          )}
                        </div>
                        <div className="space-y-2">
                          {tasks.filter((t) => t.day_no === day).map((t) => (
                            <label key={t.id} className={`flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 text-sm transition hover:bg-secondary/50 ${t.done ? "opacity-55" : ""}`}>
                              <input type="checkbox" checked={t.done} onChange={(e) => toggleTask(t.id, e.target.checked)}
                                className="mt-0.5 size-4 shrink-0 accent-teal-400" />
                              <span className="min-w-0 flex-1">
                                <span className={`flex flex-wrap items-center gap-2 ${t.done ? "line-through" : ""}`}>
                                  {t.description}
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${TYPE_STYLES[t.task_type] || "bg-secondary text-muted-foreground"}`}>
                                    {t.task_type}
                                  </span>
                                  {t.target_count > 0 && <span className="text-xs text-muted-foreground">×{t.target_count}</span>}
                                </span>
                                {t.resource_url && (
                                  <a href={t.resource_url} target="_blank" rel="noreferrer"
                                    className="mt-0.5 block truncate text-xs text-sky-400 hover:underline">{t.resource_url}</a>
                                )}
                              </span>
                              {t.done && <Check className="size-4 shrink-0 text-emerald-400" />}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
