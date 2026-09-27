import Link from "next/link";
import { ArrowRight, BarChart3, Bot, CalendarDays, FileText, Flame, ListChecks, Radar } from "lucide-react";
import { LogoWordmark } from "@/components/logo";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Radar,
    title: "One dashboard, every platform",
    text: "LeetCode, Codeforces, CodeChef and GeeksforGeeks — solved counts, ratings, heatmaps and streaks synced into a single mission-control view.",
  },
  {
    icon: Bot,
    title: "AI mentor that knows YOU",
    text: "A LangGraph agent with RAG over your own submissions. Ask 'which topic am I weakest in?' and get answers grounded in your real data — not generic advice.",
  },
  {
    icon: ListChecks,
    title: "Personalized study plans",
    text: "The AI analyzes your weak areas, daily hours and target date, drafts a day-wise plan, critiques itself, and saves it as an interactive checklist.",
  },
  {
    icon: BarChart3,
    title: "Sheets & progress tracking",
    text: "Blind 75, NeetCode 150 and Striver SDE sheet built in. Check off problems, mark revisions, watch completion climb.",
  },
  {
    icon: CalendarDays,
    title: "Contest calendar",
    text: "Upcoming Codeforces and LeetCode contests aggregated in one place, refreshed hourly.",
  },
  {
    icon: FileText,
    title: "Portfolio & resume builder",
    text: "A shareable public profile page and a one-click PDF resume generated straight from your coding stats.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <LogoWordmark />
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#how" className="hover:text-foreground">How it works</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login"><Button variant="ghost">Log in</Button></Link>
            <Link href="/login?mode=register"><Button>Get started <ArrowRight className="ml-1 size-4" /></Button></Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-20 pt-24 text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
            <Flame className="size-3.5" /> Powered by LangGraph + Gemini + RAG
          </div>
          <h1 className="mx-auto max-w-3xl text-balance text-4xl font-extrabold tracking-tight sm:text-6xl">
            Your coding journey,
            <span className="bg-gradient-to-r from-teal-300 via-sky-400 to-indigo-400 bg-clip-text text-transparent"> tracked and mentored by AI</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
            CodeBuddy unifies all your competitive programming profiles, then adds something none of them have:
            an AI mentor that studies your data and builds the exact plan you need.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/login?mode=register">
              <Button size="lg" className="px-7">Start free <ArrowRight className="ml-1 size-4" /></Button>
            </Link>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-4 pb-24">
          <h2 className="mb-10 text-center text-3xl font-bold">Everything Codolio has. Plus a mentor.</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-border/60 bg-card p-6 transition hover:border-primary/40">
                <f.icon className="mb-4 size-7 text-primary" />
                <h3 className="mb-2 font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="border-t border-border/60 bg-card/40 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="mb-4 text-center text-3xl font-bold">How the AI works</h2>
            <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
              Not a chatbot bolted on top — a real GenAI pipeline over your data.
            </p>
            <div className="grid gap-6 md:grid-cols-4">
              {[
                ["1. Sync", "Adapters pull your submissions, ratings and contest history from all four platforms."],
                ["2. Index", "Every solved problem is embedded into your private vector store (Chroma)."],
                ["3. Reason", "A LangGraph agent calls tools over your live stats — RAG grounds every answer."],
                ["4. Plan", "A second graph drafts, critiques and refines a day-wise plan you can check off."],
              ].map(([title, text]) => (
                <div key={title} className="rounded-xl border border-border/60 bg-card p-6">
                  <div className="mb-3 font-mono text-sm font-semibold text-primary">{title}</div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-10 text-center text-sm text-muted-foreground">
        <div className="mb-3 flex items-center justify-center gap-2 text-xs">
          Built with Next.js · FastAPI · LangGraph · Gemini
        </div>
        CodeBuddy — track smarter, prep faster.
      </footer>
    </div>
  );
}
