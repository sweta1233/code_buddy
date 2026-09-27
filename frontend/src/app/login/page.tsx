"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { LogoWordmark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, setToken } from "@/lib/api";
import type { User } from "@/lib/types";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">(params.get("mode") === "register" ? "register" : "login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "", name: "", username: "", college: "", grad_year: "" });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "login"
          ? { email: form.email, password: form.password }
          : {
              email: form.email,
              password: form.password,
              name: form.name,
              username: form.username,
              college: form.college,
              grad_year: form.grad_year ? Number(form.grad_year) : null,
            };
      const res = await api<{ token: string; user: User }>(path, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setToken(res.token);
      localStorage.setItem("codebuddy_user", JSON.stringify(res.user));
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-8 flex justify-center"><LogoWordmark size={44} /></div>
      <div className="rounded-2xl border border-border/60 bg-card p-8 shadow-xl shadow-black/20">
        <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(""); }}
              className={`rounded-md py-2 text-sm font-medium transition ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {m === "login" ? "Log in" : "Create account"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "register" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={form.name} onChange={set("name")} required placeholder="Sakhi Priya" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="username">Username (public profile URL)</Label>
                <Input id="username" value={form.username} onChange={set("username")} required
                  pattern="[a-zA-Z0-9_]+" title="Letters, digits, underscores only" placeholder="sakhi_codes" />
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={set("email")} required placeholder="you@college.edu" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={form.password} onChange={set("password")} required
              minLength={8} placeholder="At least 8 characters" />
          </div>
          {mode === "register" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="college">College <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="college" value={form.college} onChange={set("college")} placeholder="IITM BS" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="grad_year">Grad year</Label>
                <Input id="grad_year" type="number" value={form.grad_year} onChange={set("grad_year")} placeholder="2027" />
              </div>
            </div>
          )}

          {error && <p className="rounded-md bg-destructive/15 px-3 py-2 text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2 className="mr-1 size-4 animate-spin" />}
            {mode === "login" ? "Log in" : "Create my account"}
          </Button>
        </form>
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">← Back to home</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
