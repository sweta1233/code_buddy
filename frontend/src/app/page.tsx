import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock,
  Code2,
  Cpu,
  FileText,
  Flame,
  Globe2,
  Layers,
  ListChecks,
  Radar,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { LogoWordmark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { PlatformBadge } from "@/components/platform-badge";

const platforms = [
  { id: "leetcode", name: "LeetCode", color: "from-amber-500/20 to-orange-500/10", border: "border-amber-500/30", text: "text-amber-400" },
  { id: "codeforces", name: "Codeforces", color: "from-sky-500/20 to-blue-600/10", border: "border-sky-500/30", text: "text-sky-400" },
  { id: "codechef", name: "CodeChef", color: "from-amber-700/20 to-yellow-600/10", border: "border-yellow-600/30", text: "text-amber-300" },
  { id: "gfg", name: "GeeksforGeeks", color: "from-emerald-500/20 to-green-600/10", border: "border-emerald-500/30", text: "text-emerald-400" },
  { id: "hackerrank", name: "HackerRank", color: "from-teal-500/20 to-emerald-600/10", border: "border-teal-500/30", text: "text-teal-400" },
  { id: "atcoder", name: "AtCoder", color: "from-purple-500/20 to-indigo-600/10", border: "border-purple-500/30", text: "text-purple-400" },
];

const features = [
  {
    icon: Radar,
    badge: "Unified Portfolio",
    gradient: "from-teal-500/20 via-teal-500/5 to-transparent",
    glow: "group-hover:border-teal-400/50",
    iconColor: "text-teal-400",
    title: "One Mission Control for 6 Platforms",
    text: "Sync LeetCode, Codeforces, CodeChef, GFG, HackerRank, and AtCoder into one cohesive hub with automated difficulty breakdown (Easy / Med / Hard).",
  },
  {
    icon: Bot,
    badge: "GenAI RAG Engine",
    gradient: "from-sky-500/20 via-sky-500/5 to-transparent",
    glow: "group-hover:border-sky-400/50",
    iconColor: "text-sky-400",
    title: "AI Mentor with Vector Store (RAG)",
    text: "Multi-turn LangGraph ReAct agent grounded with ChromaDB vector search over your actual solved problems and curated topic sheets. No generic bot answers.",
  },
  {
    icon: ListChecks,
    badge: "Autonomous Planner",
    gradient: "from-indigo-500/20 via-indigo-500/5 to-transparent",
    glow: "group-hover:border-indigo-400/50",
    iconColor: "text-indigo-400",
    title: "Whole-Day & Multi-Week Study Schedules",
    text: "Generates time-blocked daily study routines (Theory, Practice, Contests, Review) tailored to your hours/day and target company timeline.",
  },
  {
    icon: CalendarDays,
    badge: "Live Calendar",
    gradient: "from-purple-500/20 via-purple-500/5 to-transparent",
    glow: "group-hover:border-purple-400/50",
    iconColor: "text-purple-400",
    title: "Contest Calendar & 1-Click Sync",
    text: "Upcoming contests across competitive platforms with live countdown badges, 1-click Google Calendar integration, and downloadable .ics files.",
  },
  {
    icon: BarChart3,
    badge: "Curated Sheets",
    gradient: "from-rose-500/20 via-rose-500/5 to-transparent",
    glow: "group-hover:border-rose-400/50",
    iconColor: "text-rose-400",
    title: "Blind 75, NeetCode 150 & Striver SDE",
    text: "Interactive topic tracking with one-click solved toggles, revision queues, and real-time progress percentages mapped against your profile.",
  },
  {
    icon: FileText,
    badge: "Resume & Portfolio",
    gradient: "from-amber-500/20 via-amber-500/5 to-transparent",
    glow: "group-hover:border-amber-400/50",
    iconColor: "text-amber-400",
    title: "Shareable Profile & PDF Resume Generator",
    text: "Stand out to recruiters with a beautiful public portfolio URL and auto-generated resume highlighting your ratings, skills, and verified solve counts.",
  },
];

export default function Home() {
  return (
    <div className="home-background relative min-h-screen">
      <div className="home-background-image" aria-hidden="true" />
      {/* Background Ambient Glows */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[600px] w-[1000px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-teal-500/15 via-sky-500/15 to-purple-600/10 blur-[130px]" />
      <div className="pointer-events-none absolute top-[800px] -left-60 -z-10 h-[500px] w-[600px] rounded-full bg-gradient-to-br from-indigo-500/15 to-transparent blur-[120px]" />
      <div className="pointer-events-none absolute top-[1400px] -right-60 -z-10 h-[600px] w-[700px] rounded-full bg-gradient-to-tl from-teal-500/10 to-rose-500/10 blur-[140px]" />

      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <LogoWordmark />
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="transition hover:text-foreground">Features</a>
            <a href="#platforms" className="transition hover:text-foreground">Platforms</a>
            <a href="#how" className="transition hover:text-foreground">AI Architecture</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link href="/login?mode=register">
              <Button size="sm" className="bg-gradient-to-r from-teal-400 to-sky-500 font-semibold text-slate-950 shadow-md shadow-teal-500/20 hover:opacity-95">
                Get Started <ArrowRight className="ml-1 size-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="space-y-28 pb-24">
        {/* Hero Section */}
        <section className="relative mx-auto max-w-6xl px-4 pt-20 text-center sm:px-6 sm:pt-28">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5 text-xs font-semibold text-teal-300 shadow-sm backdrop-blur">
            <Sparkles className="size-3.5 text-teal-400" />
            <span>Next-Gen Coding Portfolio & AI Copilot</span>
            <span className="hidden sm:inline text-teal-400/40">|</span>
            <span className="hidden sm:inline text-teal-200/80">LangGraph + RAG + 6 Platforms</span>
          </div>

          <h1 className="mx-auto mt-6 max-w-4xl text-balance text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
            Your entire coding journey,{" "}
            <span className="bg-gradient-to-r from-teal-300 via-sky-400 to-indigo-400 bg-clip-text text-transparent">
              tracked & mentored by AI
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg sm:leading-relaxed">
            Unify your ratings, contest calendars, and solved counts from LeetCode, Codeforces, CodeChef, GFG, HackerRank, and AtCoder into one high-power dashboard with an intelligent AI study mentor.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/login?mode=register">
              <Button size="lg" className="h-12 bg-gradient-to-r from-teal-400 via-sky-400 to-cyan-500 px-8 text-base font-bold text-slate-950 shadow-lg shadow-teal-500/25 hover:opacity-95 transition-transform hover:scale-[1.02]">
                Claim your portfolio free <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="h-12 border-border/80 px-6 text-base font-semibold backdrop-blur hover:bg-secondary/70">
                Explore Demo
              </Button>
            </Link>
          </div>

          {/* Platform Pills Ticker */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">Syncing with:</span>
            {platforms.map((p) => (
              <div
                key={p.id}
                className={`flex items-center gap-2 rounded-full border ${p.border} bg-gradient-to-r ${p.color} px-3.5 py-1.5 text-xs font-medium backdrop-blur transition hover:scale-105`}
              >
                <PlatformBadge platform={p.id} />
                <span className={p.text}>{p.name}</span>
              </div>
            ))}
          </div>

          {/* Interactive Hero Visual Mockup */}
          <div className="relative mx-auto mt-16 max-w-5xl">
            <div className="relative rounded-2xl border border-border/80 bg-card/80 p-4 shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-6">
              {/* Mockup Header */}
              <div className="flex items-center justify-between border-b border-border/60 pb-4">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-rose-500/80" />
                  <div className="size-3 rounded-full bg-amber-500/80" />
                  <div className="size-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 font-mono text-xs text-muted-foreground">codebuddy.app/mission-control</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                    6 Platforms Synced
                  </span>
                </div>
              </div>

              {/* Mockup Grid */}
              <div className="mt-6 grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
                {/* Metric 1 */}
                <div className="rounded-xl border border-teal-500/20 bg-gradient-to-br from-teal-500/10 via-card to-card p-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                    <span>Total Solved</span>
                    <Code2 className="size-4 text-teal-400" />
                  </div>
                  <div className="mt-2 text-3xl font-extrabold text-foreground">842</div>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="text-emerald-400 font-medium">320 Easy</span> ·
                    <span className="text-amber-400 font-medium">415 Med</span> ·
                    <span className="text-rose-400 font-medium">107 Hard</span>
                  </div>
                </div>

                {/* Metric 2 */}
                <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-card to-card p-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                    <span>Peak Rating</span>
                    <Trophy className="size-4 text-amber-400" />
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-3xl font-extrabold text-amber-300">
                    1,894
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Codeforces Expert (Top 8%)</p>
                </div>

                {/* Metric 3 */}
                <div className="rounded-xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 via-card to-card p-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                    <span>Active Streak</span>
                    <Flame className="size-4 text-orange-400" />
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-3xl font-extrabold text-orange-400">
                    68 <span className="text-sm font-normal text-muted-foreground">days</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">214 submissions in 2026</p>
                </div>

                {/* Metric 4 */}
                <div className="rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-card to-card p-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                    <span>Next Contest</span>
                    <Clock className="size-4 text-purple-400" />
                  </div>
                  <div className="mt-2 text-xl font-bold text-purple-300 truncate">CF Div. 2 #948</div>
                  <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-purple-500/20 px-2 py-0.5 text-[11px] font-semibold text-purple-300">
                    in 4h 12m
                  </div>
                </div>
              </div>

              {/* Floating AI Insight Card */}
              <div className="mt-4 rounded-xl border border-indigo-400/30 bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-teal-500/10 p-4 text-left">
                <div className="flex items-start gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300">
                    <Bot className="size-4.5" />
                  </div>
                  <div className="space-y-1 text-xs sm:text-sm">
                    <div className="flex items-center gap-2 font-semibold text-indigo-300">
                      <span>AI Mentor Insight</span>
                      <span className="rounded bg-indigo-400/20 px-1.5 py-0.2 text-[10px] text-indigo-200 uppercase font-mono">Live RAG</span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      &quot;You&apos;ve solved 45 Dynamic Programming problems on LeetCode with 91% accuracy. Your weakest topic is <span className="text-teal-300 font-medium">Graph BFS/DFS</span> (only 8 solved). Today&apos;s schedule reserves 90 mins for Shortest Path algorithms.&quot;
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section id="features" className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-teal-400">Engineered for competitive coders</h2>
            <p className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Everything you need to reach <span className="bg-gradient-to-r from-teal-300 to-sky-400 bg-clip-text text-transparent">Top 1%</span>
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className={`group relative rounded-2xl border border-border/70 bg-card/60 p-6 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-teal-500/5 ${f.glow}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-secondary/80 border border-border/60">
                    <f.icon className={`size-6 ${f.iconColor}`} />
                  </div>
                  <span className="rounded-full bg-secondary/60 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {f.badge}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-foreground group-hover:text-teal-300 transition-colors">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {f.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* AI Whole-Day Routine & LangGraph Architecture Showcase */}
        <section id="how" className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="rounded-3xl border border-border/80 bg-gradient-to-b from-card/90 via-card/50 to-card/90 p-8 sm:p-12 shadow-2xl backdrop-blur-xl">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
                <Cpu className="size-3.5" /> LangGraph State Machine
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                How CodeBuddy Plans Your Day
              </h2>
              <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:text-base">
                An autonomous 4-stage reasoning loop analyzes your schedule, checks platform weaknesses, and compiles a time-blocked study roadmap.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-4">
              {[
                { step: "01", title: "Analyze Profile", desc: "Extracts your topic strengths, solve velocity, and contest history across all 6 platforms." },
                { step: "02", title: "Draft Routine", desc: "Allocates realistic time slots for concept theory, live coding, contest prep, and college coursework." },
                { step: "03", title: "Critique & Refine", desc: "Simulates fatigue, verifies question difficulty progression, and adjusts breaks." },
                { step: "04", title: "Interactive Sync", desc: "Renders an actionable daily schedule with checklists and direct problem links." },
              ].map((s) => (
                <div key={s.step} className="relative rounded-xl border border-border/60 bg-secondary/30 p-5 space-y-2">
                  <div className="font-mono text-2xl font-black text-teal-400/80">{s.step}</div>
                  <h4 className="font-bold text-base text-foreground">{s.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Banner */}
        <section className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-teal-500/30 bg-gradient-to-r from-teal-500/20 via-sky-500/20 to-indigo-500/20 p-8 text-center sm:p-14 backdrop-blur-2xl">
            <div className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-teal-400/30 blur-[90px]" />
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
              Ready to supercharge your coding prep?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground text-sm sm:text-base">
              Join thousands of developers tracking their LeetCode, Codeforces, and CodeChef progress in one beautiful place.
            </p>
            <div className="mt-8 flex justify-center">
              <Link href="/login?mode=register">
                <Button size="lg" className="h-12 bg-gradient-to-r from-teal-400 to-sky-400 px-8 text-base font-bold text-slate-950 shadow-xl shadow-teal-500/25 hover:opacity-95">
                  Create Your Free Account <ArrowRight className="ml-2 size-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 py-12 text-center text-sm text-muted-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <LogoWordmark />
          <p className="text-xs">
            CodeBuddy · Unified Competitive Programming Tracker & AI Mentor · 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
