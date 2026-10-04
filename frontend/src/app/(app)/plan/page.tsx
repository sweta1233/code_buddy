"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Flame,
  Lightbulb,
  ListTodo,
  Loader2,
  Sparkles,
  Sun,
  Timer,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import type { DailyRoutine, Plan } from "@/lib/types";

const TYPE_STYLES: Record<string, string> = {
  learn: "bg-sky-500/15 text-sky-300",
  practice: "bg-teal-500/15 text-teal-300",
  revise: "bg-violet-500/15 text-violet-300",
  contest: "bg-amber-500/15 text-amber-300",
};

const ACTIVITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  theory: { bg: "bg-sky-500/15", text: "text-sky-400", label: "Theory & Concepts" },
  coding: { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "Deep Coding" },
  contest: { bg: "bg-amber-500/15", text: "text-amber-400", label: "Timed Contest" },
  review: { bg: "bg-violet-500/15", text: "text-violet-400", label: "Active Recall" },
  break: { bg: "bg-slate-500/15", text: "text-slate-400", label: "Break & Rest" },
  college_work: { bg: "bg-indigo-500/15", text: "text-indigo-400", label: "College / Work" },
};

export default function PlanPage() {
  const [activeTab, setActiveTab] = useState<"roadmap" | "daily">("roadmap");

  // Multi-Week Roadmap State
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ goal: "", target_date: "", hours_per_day: "2" });

  // Daily Routine State
  const [routine, setRoutine] = useState<DailyRoutine | null>(null);
  const [routineGenerating, setRoutineGenerating] = useState(false);
  const [routineError, setRoutineError] = useState("");
  const [checkedChecklist, setCheckedChecklist] = useState<Record<string, boolean>>({});
  const [dailyForm, setDailyForm] = useState({
    available_hours: "3.5",
    wake_time: "07:00 AM",
    busy_hours_desc: "College lectures from 9:30 AM to 3:30 PM",
    focus_topic: "Dynamic Programming & Trees",
  });

  async function load() {
    try {
      const res = await api<{ plan: Plan | null }>("/api/plans/current");
      setPlan(res.plan);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function generatePlan(e: React.FormEvent) {
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
      setError(err instanceof Error ? err.message : "Plan generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function generateDailyRoutine(e: React.FormEvent) {
    e.preventDefault();
    setRoutineGenerating(true);
    setRoutineError("");
    try {
      const res = await api<{ routine: DailyRoutine }>("/api/plans/daily-routine", {
        method: "POST",
        body: JSON.stringify({
          available_hours: Number(dailyForm.available_hours) || 3.0,
          wake_time: dailyForm.wake_time || "07:30 AM",
          busy_hours_desc: dailyForm.busy_hours_desc,
          focus_topic: dailyForm.focus_topic,
        }),
      });
      setRoutine(res.routine);
      setCheckedChecklist({});
    } catch (err) {
      setRoutineError(err instanceof Error ? err.message : "Routine generation failed");
    } finally {
      setRoutineGenerating(false);
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

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            <Wand2 className="size-7 text-primary" /> AI Intelligent Planner
          </h1>
          <p className="mt-1 text-muted-foreground">
            Multi-stage LangGraph workflow for tailored multi-week roadmaps and precision whole-day time-blocking schedules.
          </p>
        </div>

        <div className="flex rounded-lg border border-border bg-muted/40 p-1">
          <button
            onClick={() => setActiveTab("roadmap")}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "roadmap"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CalendarDays className="size-3.5" /> Multi-Week Roadmap
          </button>
          <button
            onClick={() => setActiveTab("daily")}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "daily"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sun className="size-3.5" /> Whole-Day Routine
          </button>
        </div>
      </div>

      {activeTab === "roadmap" && (
        <div className="space-y-6">
          {!plan && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Generate your multi-week preparation roadmap</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={generatePlan} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="goal">What is your primary goal?</Label>
                    <Input
                      id="goal"
                      required
                      minLength={5}
                      value={form.goal}
                      onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}
                      placeholder="e.g. Master Graphs & DP for FAANG interviews, achieve Codeforces Specialist"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="target" className="flex items-center gap-1.5">
                        <CalendarDays className="size-3.5" /> Target Date
                      </Label>
                      <Input
                        id="target"
                        type="date"
                        value={form.target_date}
                        onChange={(e) => setForm((f) => ({ ...f, target_date: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="hours" className="flex items-center gap-1.5">
                        <Clock className="size-3.5" /> Hours per day
                      </Label>
                      <Input
                        id="hours"
                        type="number"
                        min="0.5"
                        max="16"
                        step="0.5"
                        value={form.hours_per_day}
                        onChange={(e) => setForm((f) => ({ ...f, hours_per_day: e.target.value }))}
                      />
                    </div>
                  </div>
                  {error && <p className="rounded-md bg-destructive/15 px-3 py-2 text-sm text-destructive">{error}</p>}
                  <Button type="submit" size="lg" disabled={generating}>
                    {generating ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Sparkles className="mr-1 size-4" />}
                    {generating ? "Analyzing stats, drafting & refining…" : "Generate my plan"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    LangGraph pipeline: Analysis → Draft → Self-Critique → Refinement. Connect your platforms for maximum personalization.
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
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPlan(null);
                        setForm((f) => ({ ...f, goal: plan.goal }));
                      }}
                    >
                      Regenerate
                    </Button>
                  </div>
                  <div className="mt-5 space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">
                        {doneCount}/{plan.tasks.length} tasks done
                      </span>
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
                          <span className="text-xs font-normal text-muted-foreground">
                            {weekDone}/{tasks.length} done
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        {days.map((day) => (
                          <div key={day} className="rounded-lg border border-border/50 p-4">
                            <div className="mb-3 flex items-center gap-2">
                              <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs">Day {day}</span>
                              {tasks.find((t) => t.day_no === day)?.topic && (
                                <span className="text-sm font-medium">
                                  {tasks.find((t) => t.day_no === day)!.topic}
                                </span>
                              )}
                            </div>
                            <div className="space-y-2">
                              {tasks
                                .filter((t) => t.day_no === day)
                                .map((t) => (
                                  <label
                                    key={t.id}
                                    className={`flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 text-sm transition hover:bg-secondary/50 ${
                                      t.done ? "opacity-55" : ""
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={t.done}
                                      onChange={(e) => toggleTask(t.id, e.target.checked)}
                                      className="mt-0.5 size-4 shrink-0 accent-teal-400"
                                    />
                                    <span className="min-w-0 flex-1">
                                      <span className={`flex flex-wrap items-center gap-2 ${t.done ? "line-through" : ""}`}>
                                        {t.description}
                                        <span
                                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                            TYPE_STYLES[t.task_type] || "bg-secondary text-muted-foreground"
                                          }`}
                                        >
                                          {t.task_type}
                                        </span>
                                        {t.target_count > 0 && (
                                          <span className="text-xs text-muted-foreground">×{t.target_count}</span>
                                        )}
                                      </span>
                                      {t.resource_url && (
                                        <a
                                          href={t.resource_url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="mt-0.5 block truncate text-xs text-sky-400 hover:underline"
                                        >
                                          {t.resource_url}
                                        </a>
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
      )}

      {activeTab === "daily" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sun className="size-4 text-amber-400" /> Plan Today&apos;s Whole-Day Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={generateDailyRoutine} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="study-hours" className="flex items-center gap-1.5">
                      <Timer className="size-3.5" /> Total Study Hours Today
                    </Label>
                    <Input
                      id="study-hours"
                      type="number"
                      min="0.5"
                      max="16"
                      step="0.5"
                      value={dailyForm.available_hours}
                      onChange={(e) => setDailyForm((f) => ({ ...f, available_hours: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="wake-time" className="flex items-center gap-1.5">
                      <Clock className="size-3.5" /> Wake Up Time
                    </Label>
                    <Input
                      id="wake-time"
                      value={dailyForm.wake_time}
                      placeholder="e.g. 07:00 AM"
                      onChange={(e) => setDailyForm((f) => ({ ...f, wake_time: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="busy-hours">College / Work / Fixed Commitments</Label>
                  <Input
                    id="busy-hours"
                    value={dailyForm.busy_hours_desc}
                    placeholder="e.g. College from 9 AM to 3 PM, Gym 6 PM - 7 PM"
                    onChange={(e) => setDailyForm((f) => ({ ...f, busy_hours_desc: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="focus-topic">Topic or Skill Focus for Today</Label>
                  <Input
                    id="focus-topic"
                    value={dailyForm.focus_topic}
                    placeholder="e.g. Dynamic Programming (0/1 Knapsack & LCS), Graphs BFS/DFS"
                    onChange={(e) => setDailyForm((f) => ({ ...f, focus_topic: e.target.value }))}
                  />
                </div>

                {routineError && <p className="rounded-md bg-destructive/15 px-3 py-2 text-sm text-destructive">{routineError}</p>}

                <Button type="submit" size="lg" disabled={routineGenerating}>
                  {routineGenerating ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Sparkles className="mr-1 size-4" />}
                  {routineGenerating ? "Designing 24-hour time blocks…" : "Generate Today's Routine"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {routine && (
            <div className="space-y-6">
              <Card className="border-teal-500/30 bg-teal-500/5">
                <CardContent className="py-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Flame className="size-5 text-orange-400" />
                        <h2 className="text-xl font-bold">{routine.title}</h2>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{routine.summary}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="rounded-md bg-secondary px-2 py-0.5 font-medium text-foreground">
                          🎯 {routine.focus_theme}
                        </span>
                        <span>⏱ {routine.total_study_hours}h study planned</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                {routine.slots.map((slot, index) => {
                  const actMeta = ACTIVITY_STYLES[slot.activity_type] || ACTIVITY_STYLES.coding;
                  return (
                    <Card key={index} className="overflow-hidden border-border/70 transition hover:border-primary/40">
                      <CardHeader className="bg-secondary/20 pb-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-xs font-semibold text-primary">{slot.time_range}</span>
                            <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${actMeta.bg} ${actMeta.text}`}>
                              {actMeta.label}
                            </span>
                            <span className="text-xs text-muted-foreground">({slot.duration_minutes}m)</span>
                          </div>
                        </div>
                        <CardTitle className="mt-1 text-base font-bold">{slot.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-3 text-sm">
                        <p className="text-muted-foreground">{slot.description}</p>

                        {slot.target_problems && slot.target_problems.length > 0 && (
                          <div>
                            <span className="text-xs font-semibold text-foreground">Target Problems / Patterns:</span>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {slot.target_problems.map((prob, pi) => (
                                <span key={pi} className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground font-mono">
                                  {prob}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {slot.checklist && slot.checklist.length > 0 && (
                          <div className="rounded-md bg-secondary/30 p-3">
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-2">
                              <ListTodo className="size-3.5 text-teal-400" /> Actionable Checklist:
                            </span>
                            <div className="space-y-1.5">
                              {slot.checklist.map((item, ci) => {
                                const key = `${index}-${ci}`;
                                const isChecked = !!checkedChecklist[key];
                                return (
                                  <label
                                    key={ci}
                                    className={`flex cursor-pointer items-center gap-2 text-xs transition ${
                                      isChecked ? "line-through text-muted-foreground opacity-60" : "text-foreground"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) =>
                                        setCheckedChecklist((prev) => ({ ...prev, [key]: e.target.checked }))
                                      }
                                      className="size-3.5 accent-teal-400"
                                    />
                                    <span>{item}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {slot.tips && (
                          <p className="text-xs text-amber-300/90 flex items-start gap-1.5 italic bg-amber-500/10 p-2 rounded">
                            <Lightbulb className="size-3.5 shrink-0 mt-0.5 text-amber-400" />
                            <span>{slot.tips}</span>
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {routine.pro_tip && (
                <Card className="border-indigo-400/30 bg-indigo-500/10">
                  <CardContent className="flex items-start gap-3 py-4 text-sm">
                    <CheckCircle2 className="size-5 shrink-0 text-indigo-400 mt-0.5" />
                    <div>
                      <p className="font-semibold text-indigo-200">Execution Strategy</p>
                      <p className="mt-0.5 text-xs text-indigo-300 leading-relaxed">{routine.pro_tip}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
