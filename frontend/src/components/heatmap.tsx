"use client";

import { useMemo, useState } from "react";

const LEVELS = [0, 1, 2, 3, 4];

function level(n: number): number {
  if (n === 0) return 0;
  if (n <= 2) return 1;
  if (n <= 5) return 2;
  if (n <= 9) return 3;
  return 4;
}

const COLORS = [
  "rgba(148,163,184,0.10)",
  "rgba(45,212,191,0.30)",
  "rgba(45,212,191,0.55)",
  "rgba(45,212,191,0.80)",
  "rgba(45,212,191,1)",
];

/** GitHub-style 53-week activity heatmap. data: { "YYYY-MM-DD": count } */
export function Heatmap({ data }: { data: Record<string, number> }) {
  const [hover, setHover] = useState<{ date: string; count: number } | null>(null);

  const weeks = useMemo(() => {
    const today = new Date();
    const end = new Date(today);
    end.setDate(end.getDate() + (6 - end.getDay()));
    const cols: { date: string; count: number; future: boolean }[][] = [];
    const cursor = new Date(end);
    cursor.setDate(cursor.getDate() - 52 * 7 - 6);
    for (let w = 0; w < 53; w++) {
      const col: { date: string; count: number; future: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const iso = cursor.toISOString().slice(0, 10);
        col.push({ date: iso, count: data[iso] || 0, future: cursor > today });
        cursor.setDate(cursor.getDate() + 1);
      }
      cols.push(col);
    }
    return cols;
  }, [data]);

  const monthLabels = useMemo(() => {
    const labels: { week: number; label: string }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
      const first = week[0];
      const m = new Date(first.date).getMonth();
      if (m !== lastMonth && wi % 2 === 0) {
        labels.push({ week: wi, label: new Date(first.date).toLocaleString("en", { month: "short" }) });
        lastMonth = m;
      }
    });
    return labels;
  }, [weeks]);
  return (
    <div>
      <div className="relative overflow-x-auto pb-1">
        <div className="min-w-[720px]">
          <div className="mb-1 flex pl-8">
            {weeks.map((_, wi) => {
              const label = monthLabels.find((l) => l.week === wi);
              return (
                <div key={wi} className="w-3">
                  {label && <span className="text-[10px] text-muted-foreground">{label.label}</span>}
                </div>
              );
            })}
          </div>
          <div className="flex gap-[3px] pl-8">
            <div className="mr-1 flex flex-col justify-between py-[1px] text-[9px] text-muted-foreground">
              <span>Mon</span><span>Wed</span><span>Fri</span>
            </div>
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day) => (
                  <div
                    key={day.date}
                    className={`size-3 rounded-[3px] ${day.future ? "opacity-0" : "cursor-pointer hover:ring-1 hover:ring-primary/60"}`}
                    style={{ background: COLORS[level(day.count)] }}
                    onMouseEnter={() => setHover({ date: day.date, count: day.count })}
                    onMouseLeave={() => setHover(null)}
                    title={`${day.count} solved · ${day.date}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {hover ? `${hover.count} solved on ${hover.date}` : "Last 52 weeks"}
        </span>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          Less
          {LEVELS.map((l) => (
            <span key={l} className="size-3 rounded-[3px]" style={{ background: COLORS[l] }} />
          ))}
          More
        </div>
      </div>
    </div>
  );
}
