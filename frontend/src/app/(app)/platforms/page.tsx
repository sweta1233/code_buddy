"use client";

import { useEffect, useState } from "react";
import { Check, Link2, Loader2, Trash2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { PlatformBadge } from "@/components/platform-badge";

const PLATFORMS: Record<string, { name: string; url: string; hint: string }> = {
  leetcode: { name: "LeetCode", url: "leetcode.com/u/yourname", hint: "Public profile required" },
  codeforces: { name: "Codeforces", url: "codeforces.com/profile/yourname", hint: "Handle is case-insensitive" },
  codechef: { name: "CodeChef", url: "codechef.com/users/yourname", hint: "Public profile required" },
  gfg: { name: "GeeksforGeeks", url: "geeksforgeeks.org/user/yourname", hint: "PRACTICE profile username" },
};

interface Account {
  platform: string;
  handle: string;
  status: "ok" | "error" | "pending";
  last_error: string;
  last_synced_at: string | null;
}

export default function PlatformsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [supported, setSupported] = useState<string[]>([]);
  const [handles, setHandles] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const res = await api<{ supported: string[]; accounts: Account[] }>("/api/platforms");
    setAccounts(res.accounts);
    setSupported(res.supported);
  }
  useEffect(() => { load(); }, []);

  async function connect(platform: string) {
    const handle = (handles[platform] || "").trim();
    if (!handle) return;
    setBusy(platform);
    try {
      await api("/api/platforms/connect", {
        method: "POST",
        body: JSON.stringify({ platform, handle }),
      });
      await load();
      setTimeout(load, 15000);
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
          Link your handles — CodeBuddy syncs stats automatically every 6 hours, or on demand from the dashboard.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {supported.map((platform) => {
          const meta = PLATFORMS[platform];
          const account = accounts.find((a) => a.platform === platform);
          return (
            <Card key={platform}>
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
                        <p className="truncate font-mono text-sm">@{account.handle}</p>
                        <p className="text-xs text-muted-foreground">
                          {account.last_synced_at ? `Last synced ${account.last_synced_at.slice(0, 16).replace("T", " ")}`
                            : "Waiting for first sync…"}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => disconnect(platform)}>
                        <Unlink className="mr-1 size-3.5" /> Remove
                      </Button>
                    </div>
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
    </div>
  );
}
