"use client";

const STYLES: Record<string, { bg: string; text: string }> = {
  leetcode: { bg: "bg-amber-500/15", text: "text-amber-400" },
  codeforces: { bg: "bg-sky-500/15", text: "text-sky-400" },
  codechef: { bg: "bg-orange-500/15", text: "text-orange-400" },
  gfg: { bg: "bg-emerald-500/15", text: "text-emerald-400" },
  hackerrank: { bg: "bg-green-500/15", text: "text-green-400" },
  atcoder: { bg: "bg-indigo-500/15", text: "text-indigo-400" },
};

export function PlatformBadge({ platform }: { platform: string }) {
  const style = STYLES[platform] || { bg: "bg-slate-500/15", text: "text-slate-400" };
  const names: Record<string, string> = {
    leetcode: "LC",
    codeforces: "CF",
    codechef: "CC",
    gfg: "GFG",
    hackerrank: "HR",
    atcoder: "AC",
  };
  return (
    <span className={`inline-flex h-5 min-w-7 items-center justify-center rounded-md px-1.5 text-[10px] font-bold ${style.bg} ${style.text}`}>
      {names[platform] || platform.slice(0, 2).toUpperCase()}
    </span>
  );
}
