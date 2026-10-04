"use client";

import { useEffect, useState } from "react";
import { Check, Link2, Loader2, Trash2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { PlatformBadge } from "@/components/platform-badge";
import type { PlatformAccount } from "@/lib/types";

const PLATFORMS: Record<string, { name: string; url: string; hint: string }> = {
  leetcode: { name: "LeetCode", url: "leetcode.com/u/yourname", hint: "Public profile required" },
  codeforces: { name: "Codeforces", url: "codeforces.com/profile/yourname", hint: "Handle is case-insensitive" },
  codechef: { name: "CodeChef", url: "codechef.com/users/yourname", hint: "Public profile required" },
  gfg: { name: "GeeksforGeeks", url: "geeksforgeeks.org/user/yourname", hint: "PRACTICE profile username" },
  hackerrank: { name: "HackerRank", url: "hackerrank.com/profile/yourname", hint: "HackerRank username" },
  atcoder: { name: "AtCoder", url: "atcoder.jp/users/yourname", hint: "AtCoder username" },
};

export default function PlatformsPage() {
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [supported, setSupported] = useState<string[]>([]);
  const [handles, setHandles] = useState<Record<string, string>>({});
  const [connectErrors, setConnectErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const res = await api<{ supported: string[]; accounts: PlatformAccount[] }>("/api/platforms");
    setAccounts(res.accounts);
    setSupported(res.supported);
  }
  useEffect(() => { load(); }, []);

  async function connect(platform: string) {
    const handle = (handles[platform] || "").trim();
    if (!handle) return;
    setBusy(platform);
    setConnectErrors((errors) => ({ ...errors, [platform]: "" }));
    try {
      await api("/api/platforms/connect", {
        method: "POST",
        body: JSON.stringify({ platform, handle }),
      });
      await load();
      setTimeout(load, 15000);
    } catch (error) {
      setConnectErrors((errors) => ({
        ...errors,
        [platform]: error instanceof Error ? error.message : "Could not connect this profile.",
      }));
    } finally {
      setBusy(null);
    }
  }

  async function disconnect(platform: string) {
    await api(`/api/platforms/${platform}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Connected platforms</h1>
        <p className="mt-1 text-muted-foreground">
          Enter a username or paste a public profile link for LeetCode, Codeforces, CodeChef, GeeksforGeeks, HackerRank, or AtCoder.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {supported.map((platform) => {
          const meta = PLATFORMS[platform];
          const account = accounts.find((a) => a.platform === platform);
          const stats = account?.stats;
          const total = stats?.total_solved ?? 0;
          return (
            <Card key={platform} className="flex flex-col justify-between">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <PlatformBadge platform={platform} /> {meta?.name || platform}
                  </span>
                  {account && (
                    <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      account.status === "ok" ? "bg-emerald-500/15 text-emerald-400"
                      : account.status === "error" ? "bg-rose-500/15 text-rose-400"
                      : "bg-amber-500/15 text-amber-400"
                    }`}>
                      {account.status === "ok" && <><Check className="size-3" /> synced</>}
                      {account.status === "error" && <>error</>}
                      {account.status === "pending" && <><Loader2 className="size-3 animate-spin" /> syncing</>}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {account ? (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm font-semibold">@{account.handle}</p>
                        <p className="text-xs text-muted-foreground">
                          {account.last_synced_at ? `Last synced ${account.last_synced_at.slice(0, 16).replace("T", " ")}`
                            : "Waiting for first sync…"}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => disconnect(platform)}>
                        <Unlink className="mr-1 size-3.5" /> Remove
                      </Button>
                    </div>

                    {stats && typeof total === "number" && total > 0 && (
                      <div className="rounded-lg bg-secondary/50 p-2.5 text-xs">
                        <div className="flex items-center justify-between font-medium">
                          <span>Solved: {total.toLocaleString()}</span>
                          {stats.rating != null && <span>Rating: {Math.round(Number(stats.rating))}</span>}
                        </div>
                        {stats.easy != null && stats.medium != null && stats.hard != null ? (
                          <div className="mt-1.5 flex gap-2 font-mono text-[11px]">
                            <span className="text-emerald-400">Easy: {stats.easy}</span>
                            <span className="text-amber-400">Med: {stats.medium}</span>
                            <span className="text-rose-400">Hard: {stats.hard}</span>
                          </div>
                        ) : (
                          <p className="mt-1 text-muted-foreground">This site does not provide a public difficulty breakdown.</p>
                        )}
                        {stats.difficulty_method && (
                          <p className="mt-1 text-muted-foreground">Difficulty grouped by {stats.difficulty_method}.</p>
                        )}
                      </div>
                    )}

                    {account.status === "error" && (
                      <p className="rounded-md bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{account.last_error}</p>
                    )}
                    <div className="flex gap-2">
                      <Input
                        placeholder={`Change handle — e.g. ${meta?.url?.split("/").pop()}`}
                        value={handles[platform] || ""}
                        onChange={(e) => setHandles((h) => ({ ...h, [platform]: e.target.value }))}
                      />
                      <Button variant="outline" disabled={busy === platform || !(handles[platform] || "").trim()}
                        onClick={() => connect(platform)}>
                        {busy === platform ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />} Update
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder={meta?.url || "your handle"}
                      value={handles[platform] || ""}
                      onChange={(e) => setHandles((h) => ({ ...h, [platform]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && connect(platform)}
                    />
                    <Button disabled={busy === platform || !(handles[platform] || "").trim()} onClick={() => connect(platform)}>
                      {busy === platform ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />} Connect
                    </Button>
                  </div>
                )}
                {connectErrors[platform] && (
                  <p className="rounded-md bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{connectErrors[platform]}</p>
                )}
                <p className="text-xs text-muted-foreground">{meta?.hint}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-border/40 bg-card/40">
        <CardContent className="flex items-start gap-3 py-5 text-sm text-muted-foreground">
          <Trash2 className="mt-0.5 size-4 shrink-0" />
          Removing a platform keeps your historical snapshots but future syncs stop. Your data stays yours.
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Add each site&apos;s username above. Your CodeBuddy email is only used to sign in; coding sites do not provide cross-site stats by email. Difficulty counts are shown when a site publishes them; Codeforces uses problem rating ranges.
      </p>
    </div>
  );
}
