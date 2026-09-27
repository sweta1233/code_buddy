"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export function DifficultyDonut({ easy, medium, hard }: { easy: number; medium: number; hard: number }) {
  const total = easy + medium + hard;
  const data = [
    { name: "Easy", value: easy, color: "#34d399" },
    { name: "Medium", value: medium, color: "#fbbf24" },
    { name: "Hard", value: hard, color: "#fb7185" },
  ].filter((d) => d.value > 0);

  if (total === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">No difficulty data yet.</p>;
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={62} outerRadius={92} paddingAngle={3} strokeWidth={0}>
            {data.map((d) => <Cell key={d.name} fill={d.color} />)}
          </Pie>
          <Tooltip contentStyle={{ background: "#0d1526", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 8 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{total.toLocaleString()}</span>
        <span className="text-xs text-muted-foreground">problems</span>
      </div>
      <div className="mt-2 flex justify-center gap-4 text-xs">
        {data.map((d) => (
          <span key={d.name} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: d.color }} />
            {d.name} <span className="text-muted-foreground">{d.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
