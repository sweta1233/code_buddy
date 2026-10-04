"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import type { Sheet as SheetT } from "@/lib/types";

const DIFF_COLORS: Record<string, string> = { easy: "text-emerald-400", medium: "text-amber-400", hard: "text-rose-400" };
type Filter = "all" | "todo" | "done" | "revision";

export default function SheetDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [sheet, setSheet] = useState<SheetT | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [progressError, setProgressError] = useState("");
  const [markingId, setMarkingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<SheetT>(`/api/sheets/${slug}`).then((res) => {
      if (!cancelled) setSheet(res);
    }).catch((cause) => {
      if (!cancelled) setProgressError(cause instanceof Error ? cause.message : "Could not load this sheet.");
    });
    return () => { cancelled = true; };
  }, [slug]);

  async function mark(questionId: number, status: string) {
    if (!sheet || markingId !== null) return;
    const next = status === "done" ? "todo" : "done";
    const original = sheet;
    const updatedQuestions = sheet.questions.map((q) => (q.id === questionId ? { ...q, status: next as "todo" | "done" } : q));
    setSheet({
      ...sheet,
      done: updatedQuestions.filter((q) => q.status === "done").length,
      questions: updatedQuestions,
    });
    setMarkingId(questionId);
    setProgressError("");
    try {
      await api(`/api/sheets/${slug}/questions/${questionId}`, { method: "POST", body: JSON.stringify({ status: next }) });
      const updated = await api<SheetT>(`/api/sheets/${slug}`);
      setSheet(updated);
    } catch (cause) {
      setSheet(original);
      setProgressError(cause instanceof Error ? cause.message : "Could not save this progress.");
    } finally {
      setMarkingId(null);
    }
  }

  const questions = useMemo(() => {
    if (!sheet) return [];
    return filter === "all" ? sheet.questions : sheet.questions.filter((q) => q.status === filter);
  }, [sheet, filter]);

  if (!sheet && progressError) return <p role="alert" className="py-16 text-center text-sm text-destructive">{progressError}</p>;
  if (!sheet) return <div className="flex justify-center py-24"><Loader2 className="size-8 animate-spin text-primary" /></div>;

  const donePct = sheet.total ? (sheet.done / sheet.total) * 100 : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/sheets" className="hover:text-foreground">DSA Sheets</Link>
        <span>/</span>
        <span className="text-foreground">{sheet.name}</span>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">{sheet.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>{sheet.done}/{sheet.total} solved ({Math.round(donePct)}%)</span>
            {sheet.source_url && <a href={sheet.source_url} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">Original sheet ↗</a>}
          </div>
          <Progress value={donePct} className="h-2" />
          <div className="flex gap-1.5">
            {(["all", "todo", "done", "revision"] as Filter[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                {f}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="divide-y divide-border/40 p-0">
          {questions.map((q) => (
            <div key={q.id} className={`flex items-center gap-3 border-l-2 px-4 py-3 transition-colors ${q.status === "done" ? "border-l-emerald-400/60 bg-emerald-400/10 hover:bg-emerald-400/15" : "border-l-transparent hover:bg-secondary/30"}`}>
              <button onClick={() => mark(q.id, q.status)} disabled={markingId !== null}
                className={`flex size-6 shrink-0 items-center justify-center rounded-md border transition ${
                  q.status === "done" ? "border-emerald-400 bg-emerald-400/20 text-emerald-400" : "border-border hover:border-primary"
                }`}
                aria-label={q.status === "done" ? "Mark unsolved" : "Mark solved"}>
                {q.status === "done" && <Check className="size-4" />}
              </button>
              <span className="w-8 shrink-0 font-mono text-xs text-muted-foreground">{q.order + 1}</span>
              <a href={q.url || "#"} target="_blank" rel="noreferrer"
                className={`min-w-0 flex-1 truncate text-sm hover:text-primary ${q.status === "done" ? "font-medium text-emerald-100" : "text-foreground"}`}>
                {q.title}
              </a>
              {q.topics.slice(0, 2).map((t) => (
                <span key={t} className="hidden rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground sm:inline">{t}</span>
              ))}
              <span className={`w-14 shrink-0 text-right text-xs font-medium capitalize ${DIFF_COLORS[q.difficulty] || "text-muted-foreground"}`}>{q.difficulty}</span>
            </div>
          ))}
          {questions.length === 0 && <p className="py-16 text-center text-sm text-muted-foreground">No questions match this filter.</p>}
        </CardContent>
      </Card>
      {progressError && <p role="alert" className="text-sm text-destructive">{progressError}</p>}
    </div>
  );
}
