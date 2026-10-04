"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { BarChart3, ChevronRight, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

interface SheetMeta { slug: string; name: string; description: string; total: number; done?: number }

export default function SheetsPage() {
  const [sheets, setSheets] = useState<SheetMeta[] | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");

  useEffect(() => {
    api<{ sheets: SheetMeta[] }>("/api/sheets").then((result) => setSheets(result.sheets)).catch(() => setSheets([]));
  }, []);

  async function importSheet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setImporting(true);
    setImportError("");
    try {
      const added = await api<SheetMeta>("/api/sheets/import", {
        method: "POST",
        body: JSON.stringify({ url: sheetUrl.trim() }),
      });
      setSheets((current) => [added, ...(current || []).filter((sheet) => sheet.slug !== added.slug)]);
      setSheetUrl("");
      setShowImport(false);
    } catch (cause) {
      setImportError(cause instanceof Error ? cause.message : "Could not import this sheet link.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            <BarChart3 className="size-7 text-primary" /> DSA Sheets
          </h1>
          <p className="mt-1 text-muted-foreground">Curated problem lists — track what you have solved and what needs revision.</p>
        </div>
        <Button onClick={() => { setShowImport((current) => !current); setImportError(""); }}>
          {showImport ? <X className="size-4" /> : <Plus className="size-4" />}
          {showImport ? "Cancel" : "Add sheet link"}
        </Button>
      </div>

      {showImport && <Card>
        <CardContent className="py-5">
          <form onSubmit={importSheet} className="space-y-3">
            <label htmlFor="sheet-link" className="text-sm font-semibold">Public sheet link</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input id="sheet-link" type="url" required value={sheetUrl} onChange={(event) => setSheetUrl(event.target.value)}
                placeholder="Paste a public sheet or coding problem URL"
                className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background/60 px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring" />
              <Button type="submit" disabled={importing || !sheetUrl.trim()}>
                {importing ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                {importing ? "Fetching questions…" : "Fetch sheet"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Public Google Sheets, CSV files, GitHub lists, and webpages are supported when they contain direct links to coding problems. The sheet must be viewable without signing in.</p>
            {importError && <p role="alert" className="text-sm text-destructive">{importError}</p>}
          </form>
        </CardContent>
      </Card>}

      {!sheets && <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>}
      <div className="grid gap-4">
        {sheets?.map((sheet) => {
          const done = sheet.done || 0;
          const percent = sheet.total ? (done / sheet.total) * 100 : 0;
          return (
            <Link key={sheet.slug} href={`/sheets/${sheet.slug}`}>
              <Card className="group transition hover:border-primary/40">
                <CardContent className="flex items-center justify-between gap-4 py-6">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold group-hover:text-primary">{sheet.name}</h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">{sheet.description || "Imported public coding sheet"}</p>
                    <p className="mt-2 text-xs font-medium text-muted-foreground">{done} / {sheet.total} solved · {sheet.total} problems</p>
                    <div className="mt-2 h-1.5 w-64 max-w-full overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-emerald-400/80 transition-all" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                  <ChevronRight className="size-6 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
