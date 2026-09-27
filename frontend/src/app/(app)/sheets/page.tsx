"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

interface SheetMeta { slug: string; name: string; description: string; total: number }

export default function SheetsPage() {
  const [sheets, setSheets] = useState<SheetMeta[] | null>(null);

  useEffect(() => {
    api<{ sheets: SheetMeta[] }>("/api/sheets").then((r) => setSheets(r.sheets)).catch(() => setSheets([]));
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
          <BarChart3 className="size-7 text-primary" /> DSA Sheets
        </h1>
        <p className="mt-1 text-muted-foreground">Curated problem lists — track what you've solved and what needs revision.</p>
      </div>
      {!sheets && <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>}
      <div className="grid gap-4">
        {sheets?.map((s) => (
          <Link key={s.slug} href={`/sheets/${s.slug}`}>
            <Card className="group transition hover:border-primary/40">
              <CardContent className="flex items-center justify-between gap-4 py-6">
                <div>
                  <h2 className="text-lg font-semibold group-hover:text-primary">{s.name}</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">{s.description}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{s.total} problems</p>
                </div>
                <ChevronRight className="size-6 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
