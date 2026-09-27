"use client";

import { useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiDownload } from "@/lib/api";

export default function ResumePage() {
  const [template, setTemplate] = useState<"modern" | "classic">("modern");
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      await apiDownload("/api/resume", { template, include_plan: true }, "codebuddy_resume.pdf");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
          <FileText className="size-7 text-primary" /> Resume builder
        </h1>
        <p className="mt-1 text-muted-foreground">
          Generates a PDF from your synced profiles: ratings, solved counts, topic strengths — formatted and linked.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Choose a template</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {(["modern", "classic"] as const).map((t) => (
              <button key={t} onClick={() => setTemplate(t)}
                className={`rounded-xl border-2 p-5 text-left transition ${template === t ? "border-primary bg-primary/5" : "border-border/60 hover:border-primary/40"}`}>
                <div className="mb-3 flex h-32 flex-col gap-2 rounded-lg bg-secondary/50 p-3">
                  {t === "modern" ? (
                    <>
                      <div className="h-3 w-1/2 rounded bg-teal-400/60" />
                      <div className="h-2 w-1/3 rounded bg-slate-500/50" />
                      <div className="mt-1 h-2 w-full rounded bg-slate-500/40" />
                      <div className="h-2 w-4/5 rounded bg-slate-500/40" />
                      <div className="mt-1 h-3 w-1/4 rounded bg-sky-400/50" />
                    </>
                  ) : (
                    <>
                      <div className="h-3 w-2/5 rounded bg-slate-300/70" />
                      <div className="h-px w-full bg-slate-500/60" />
                      <div className="h-2 w-1/2 rounded bg-slate-500/40" />
                      <div className="h-2 w-3/5 rounded bg-slate-500/40" />
                      <div className="mt-1 h-2 w-1/3 rounded bg-slate-500/40" />
                    </>
                  )}
                </div>
                <p className="font-medium capitalize">{t}</p>
                <p className="text-xs text-muted-foreground">
                  {t === "modern" ? "Teal accents, skill highlights with counts" : "Conservative, recruiter-friendly monochrome"}
                </p>
              </button>
            ))}
          </div>

          <Button size="lg" onClick={download} disabled={busy}>
            {busy ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Download className="mr-1 size-4" />}
            {busy ? "Generating…" : "Download PDF"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Sections: header + profiles with links, DSA skills by solved count, and overall stats. Sync platforms first.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
