"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, Sparkles, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { API_URL, api, getToken } from "@/lib/api";

interface Msg { role: "user" | "assistant"; content: string }
interface Session { id: number; title: string; created_at: string }

const SUGGESTIONS = [
  "Which topic am I weakest in, and what should I practice next?",
  "Explain dynamic programming like I'm beginner, with a plan for this week",
  "How many problems did I solve this month vs last month?",
  "What should I do today according to my plan?",
];

export default function MentorPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<number | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<{ sessions: Session[] }>("/api/ai/sessions")
      .then((r) => setSessions(r.sessions))
      .catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function openSession(id: number) {
    setActiveSession(id);
    const r = await api<{ messages: Msg[] }>(`/api/ai/sessions/${id}/messages`);
    setMessages(r.messages);
  }

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || streaming) return;
    setInput("");
    setStreaming(true);
    setMessages((m) => [...m, { role: "user", content }, { role: "assistant", content: "" }]);

    try {
      const res = await fetch(`${API_URL}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ session_id: activeSession, message: content }),
      });
      if (!res.ok || !res.body) throw new Error("Chat failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let newSessionId: number | null = null;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.token) {
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "assistant", content: copy[copy.length - 1].content + evt.token };
                return copy;
              });
            }
            if (evt.done) newSessionId = evt.session_id;
          } catch { /* partial line */ }
        }
      }
      if (newSessionId && newSessionId !== activeSession) {
        setActiveSession(newSessionId);
        const r = await api<{ sessions: Session[] }>("/api/ai/sessions");
        setSessions(r.sessions);
      }
    } catch (e) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: "assistant",
          content: `⚠️ ${e instanceof Error ? e.message : "Something went wrong"}`,
        };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="grid h-[calc(100vh-7rem)] grid-cols-[240px_1fr] gap-6">
      <Card className="hidden flex-col lg:flex">
        <CardHeader className="border-b border-border/60 py-4">
          <CardTitle className="text-sm">Conversations</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 space-y-1 overflow-y-auto p-2">
          <Button variant="secondary" className="mb-2 w-full justify-start" size="sm"
            onClick={() => { setActiveSession(null); setMessages([]); }}>
            <Sparkles className="mr-2 size-4" /> New chat
          </Button>
          {sessions.map((s) => (
            <button key={s.id}
              onClick={() => openSession(s.id)}
              className={`w-full truncate rounded-md px-3 py-2 text-left text-sm ${activeSession === s.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary"}`}>
              {s.title}
            </button>
          ))}
          {sessions.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">No conversations yet.</p>}
        </CardContent>
      </Card>

      <Card className="flex flex-col">
        <CardHeader className="flex-row items-center gap-2 border-b border-border/60 py-4">
          <Bot className="size-5 text-primary" />
          <div>
            <CardTitle className="text-base">CodeBuddy Mentor</CardTitle>
            <p className="text-xs text-muted-foreground">Knows your stats, topics, contests and study plan</p>
          </div>
        </CardHeader>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-6">
          {messages.length === 0 && (
            <div className="mx-auto max-w-lg space-y-4 py-12 text-center">
              <Bot className="mx-auto size-12 text-primary/60" />
              <p className="text-lg font-medium">Ask me anything about your prep</p>
              <p className="text-sm text-muted-foreground">I query your live stats before answering — try one of these:</p>
              <div className="grid gap-2 pt-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)}
                    className="rounded-lg border border-border/60 bg-secondary/40 px-4 py-2.5 text-left text-sm hover:border-primary/40 hover:text-primary">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "assistant" && <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/15"><Bot className="size-4 text-primary" /></span>}
              <div className={`max-w-[80%] whitespace-pre-wrap rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"
              }`}>
                {m.content || (streaming && i === messages.length - 1 ? "…" : "")}
                {streaming && i === messages.length - 1 && m.role === "assistant" && m.content &&
                  <Loader2 className="ml-1 inline size-3 animate-spin" />}
              </div>
              {m.role === "user" && <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary"><UserIcon className="size-4 text-muted-foreground" /></span>}
            </div>
          ))}
        </div>

        <div className="border-t border-border/60 p-4">
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <Input value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your stats, weaknesses, concepts…" disabled={streaming} />
            <Button type="submit" disabled={streaming || !input.trim()}>
              {streaming ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
