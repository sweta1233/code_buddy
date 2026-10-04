"use client";

import { useRef, useState } from "react";
import { Check, Download, FileText, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiDownload } from "@/lib/api";

const TEMPLATES = [
  { id: "modern", name: "Modern Teal", style: "Contemporary", detail: "Clean hierarchy with a confident teal accent.", accent: "#0f9488", layout: "line" },
  { id: "classic", name: "Classic Navy", style: "Corporate", detail: "Centered name and a traditional navy divider.", accent: "#26374d", layout: "center" },
  { id: "minimal", name: "Minimal", style: "Simple", detail: "Quiet typography and generous white space.", accent: "#475569", layout: "minimal" },
  { id: "compact", name: "Compact Green", style: "One page", detail: "Tighter spacing for resumes with more detail.", accent: "#166534", layout: "compact" },
  { id: "creative", name: "Creative Violet", style: "Creative", detail: "A distinct side rail for design and product roles.", accent: "#6d28d9", layout: "sidebar" },
  { id: "harvard", name: "Academic Classic", style: "Consulting", detail: "Formal, black-and-white, experience-first layout.", accent: "#202731", layout: "center" },
  { id: "google", name: "Google-inspired Tech", style: "Tech", detail: "Minimal tech resume with a restrained color signal.", accent: "#4285f4", layout: "multicolor" },
  { id: "linkedin", name: "LinkedIn-inspired Professional", style: "Corporate", detail: "Polished blue accents and an easy-to-scan structure.", accent: "#0a66c2", layout: "line" },
  { id: "amazon", name: "Amazon-inspired Leadership", style: "Leadership", detail: "Strong charcoal header with a warm highlight.", accent: "#e89227", layout: "charcoal" },
  { id: "microsoft", name: "Microsoft-inspired Modern", style: "Technology", detail: "Structured sections with a crisp blue marker.", accent: "#0078d4", layout: "marker" },
  { id: "stripe", name: "Product Purple", style: "Startup", detail: "Airy layout with a small, distinctive accent.", accent: "#635bff", layout: "minimal" },
] as const;

type TemplateId = (typeof TEMPLATES)[number]["id"];

function ResumePreview({ item }: { item: (typeof TEMPLATES)[number] }) {
  return (
    <div className="flex h-52 items-start justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 p-3">
      <div className="relative h-[240px] w-[176px] shrink-0 overflow-hidden border border-slate-300 bg-white px-4 pb-4 pt-5 text-left shadow-md">
        {item.layout === "sidebar" && <div className="absolute inset-y-0 left-0 w-2" style={{ background: item.accent }} />}
        {item.layout === "charcoal" && <div className="absolute inset-x-0 top-0 h-1.5 bg-slate-800" />}
        {item.layout === "multicolor" && <div className="absolute inset-x-0 top-0 flex h-1">{["#4285f4", "#ea4335", "#fbbc05", "#34a853"].map((color) => <span key={color} className="flex-1" style={{ background: color }} />)}</div>}
        {item.layout === "line" && <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: item.accent }} />}
        {item.layout === "marker" && <div className="absolute left-4 top-5 h-7 w-1" style={{ background: item.accent }} />}
        <div className={item.layout === "center" ? "text-center" : item.layout === "marker" ? "pl-2" : ""}>
          <div className="h-2.5 w-24 rounded-sm" style={{ background: item.accent, marginLeft: item.layout === "center" ? "auto" : undefined, marginRight: item.layout === "center" ? "auto" : undefined }} />
          <div className={`mt-1.5 h-1.5 w-20 rounded-sm bg-slate-500 ${item.layout === "center" ? "mx-auto" : ""}`} />
          <div className={`mt-1 h-1 w-28 rounded-sm bg-slate-300 ${item.layout === "center" ? "mx-auto" : ""}`} />
        </div>
        <div className="mt-4 space-y-3">
          {[0, 1, 2, 3].map((section) => (
            <div key={section}>
              <div className="mb-1.5 flex items-center gap-1.5">
                {item.layout === "multicolor" && <span className="size-1.5 rounded-full" style={{ background: ["#4285f4", "#ea4335", "#fbbc05", "#34a853"][section] }} />}
                <span className="h-1.5 w-12 rounded-sm" style={{ background: item.accent }} />
              </div>
              <div className="mb-1 h-1 rounded-sm bg-slate-300" />
              <div className="mb-1 h-1 w-11/12 rounded-sm bg-slate-300" />
              <div className="h-1 w-3/4 rounded-sm bg-slate-300" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ResumePage() {
  const [template, setTemplate] = useState<TemplateId>("modern");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  async function download() {
    if (!file) {
      setError("Choose your resume file first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("template", template);
      form.set("resume_file", file);
      const stem = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]+/g, "-") || "resume";
      await apiDownload("/api/resume/convert", form, `${stem}-${template}.pdf`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not convert this resume.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
          <FileText className="size-7 text-primary" /> Resume template converter
        </h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Upload a resume, preview the layout clearly, and download it as a formatted PDF. Your original wording and sections are preserved.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">1. Upload your resume</CardTitle></CardHeader>
        <CardContent>
          <input ref={fileInput} type="file" accept=".pdf,.docx,.txt,.md" className="sr-only" onChange={(event) => { setFile(event.target.files?.[0] || null); setError(""); }} />
          <button type="button" onClick={() => fileInput.current?.click()} className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/30 px-5 py-8 text-center transition hover:border-primary/50 hover:bg-secondary/50">
            <Upload className="mb-3 size-6 text-primary" />
            <span className="text-sm font-semibold">{file ? file.name : "Select a resume from your device"}</span>
            <span className="mt-1 text-xs text-muted-foreground">PDF, DOCX, TXT, or MD · maximum 10 MB</span>
          </button>
          {file && <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Check className="size-3.5 text-emerald-400" /> Ready to convert · {(file.size / 1024).toFixed(0)} KB</div>}
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Your uploaded file is processed to create the PDF and is not saved to your account. Scanned image-only PDFs need text recognition before they can be converted.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Choose a resume template</CardTitle>
          <p className="text-sm text-muted-foreground">Select any preview to see its style highlighted. Company-inspired options are independent designs, not official employer templates.</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {TEMPLATES.map((item) => {
              const selected = template === item.id;
              return (
                <button key={item.id} type="button" onClick={() => setTemplate(item.id)} aria-pressed={selected}
                  className={`rounded-xl border-2 p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selected ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/50"}`}>
                  <ResumePreview item={item} />
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="font-semibold">{item.name}</span>
                    {selected && <Check className="size-4 shrink-0 text-primary" />}
                  </div>
                  <span className="mt-1 inline-flex rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">{item.style}</span>
                  <p className="mt-2 min-h-10 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <Button size="lg" onClick={download} disabled={busy || !file}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          {busy ? "Converting resume…" : `Download ${TEMPLATES.find((item) => item.id === template)?.name} resume`}
        </Button>
        {!file && <p className="text-xs text-muted-foreground">Choose a resume and template to enable the download.</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
