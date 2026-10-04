"use client";

import { useEffect, useRef, useState } from "react";
import { AudioLines, Bot, CheckCircle2, ClipboardCheck, FileUp, Loader2, Mic, MicOff, Play, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { API_URL, api, getToken } from "@/lib/api";

type Message = { role: "assistant" | "user"; content: string };
type Topic = "arrays" | "strings" | "linked lists" | "trees" | "graphs" | "dynamic programming";
type Difficulty = "easy" | "medium" | "hard";
type SpeechResultEvent = Event & {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string; isFinal: boolean }>>;
};
type SpeechRecognitionLike = EventTarget & {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export default function InterviewPage() {
  const [phase, setPhase] = useState<"setup" | "running" | "finished">("setup");
  const [topic, setTopic] = useState<Topic>("arrays");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [file, setFile] = useState<File | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [resume, setResume] = useState("");
  const [question, setQuestion] = useState("");
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("Python");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [error, setError] = useState("");
  const [showCode, setShowCode] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const answerRef = useRef("");
  const interimAnswerRef = useRef("");
  const capturedSpeechRef = useRef(false);

  useEffect(() => {
    // Browser speech support is only available after mounting.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSpeechSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
    api<{ ai_configured: boolean }>("/api/interview/status")
      .then((status) => setAiAvailable(status.ai_configured))
      .catch(() => setAiAvailable(false));
    return () => {
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  function speak(text: string) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/```[\s\S]*?```/g, " Code sample omitted from audio. ")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[#*_`]/g, "");
    const utterance = new SpeechSynthesisUtterance(clean);
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find((voice) => voice.lang.toLowerCase().startsWith("en") && voice.default) || voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) || null;
    utterance.rate = 0.96;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  function startListening() {
    const Constructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Constructor) {
      setError("Voice input is not available in this browser. Try the latest Chrome or Edge and allow microphone access.");
      return;
    }
    setError("");
    answerRef.current = answer.trim();
    interimAnswerRef.current = "";
    capturedSpeechRef.current = false;
    const recognition = new Constructor();
    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let finalText = answerRef.current;
      let interimText = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result[0].transcript.trim()) capturedSpeechRef.current = true;
        if (result[0].isFinal) finalText = `${finalText} ${result[0].transcript}`.trim();
        else interimText += result[0].transcript;
      }
      answerRef.current = finalText;
      interimAnswerRef.current = interimText.trim();
      setAnswer([finalText, interimText].filter(Boolean).join(" "));
    };
    recognition.onerror = (event) => {
      setListening(false);
      if (event.error === "not-allowed") setError("Microphone access was denied. Allow microphone access in your browser settings and try again.");
      else if (event.error !== "no-speech" && event.error !== "aborted") setError("The microphone stopped unexpectedly. Try again or type your answer.");
    };
    recognition.onend = () => {
      setListening(false);
      if (capturedSpeechRef.current) {
        capturedSpeechRef.current = false;
        const spokenAnswer = [answerRef.current, interimAnswerRef.current].filter(Boolean).join(" ").trim();
        interimAnswerRef.current = "";
        if (spokenAnswer) void submit(false, spokenAnswer);
      }
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      setError("Could not start the microphone. Check browser permission and try again.");
      setListening(false);
    }
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  async function start() {
    if (!file) {
      setError("Upload your resume first so the interviewer can ask about your projects.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("topic", topic);
      form.set("difficulty", difficulty);
      if (file) form.set("resume_file", file);
      const response = await fetch(`${API_URL}/api/interview/start`, {
        method: "POST",
        headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
        body: form,
      });
      if (!response.ok) {
        let detail = `Could not start interview (${response.status})`;
        try { detail = (await response.json()).detail || detail; } catch { /* keep default */ }
        throw new Error(detail);
      }
      const data = await response.json();
      setResume(data.resume);
      setQuestion(data.question);
      setAiAvailable(data.ai_available);
      setMessages([{ role: "assistant", content: data.message }]);
      setCode("");
      setAnswer("");
      answerRef.current = "";
      interimAnswerRef.current = "";
      setPhase("running");
      setShowCode(false);
      speak(data.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start interview.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(finish = false, spokenAnswer?: string) {
    capturedSpeechRef.current = false;
    const candidateText = (spokenAnswer ?? answer).trim();
    if (busy || (!finish && !candidateText && !code.trim())) return;
    recognitionRef.current?.stop();
    setListening(false);
    setBusy(true);
    setError("");
    const nextMessages = finish ? messages : [...messages, {
      role: "user" as const,
      content: [candidateText, code.trim() ? `Current ${language} solution draft:\n${code}` : ""].filter(Boolean).join("\n\n"),
    }];
    if (!finish) {
      setMessages(nextMessages);
      setAnswer("");
      answerRef.current = "";
      interimAnswerRef.current = "";
    }
    try {
      const data = await api<{ message: string; ai_available: boolean }>("/api/interview/turn", {
        method: "POST",
        body: JSON.stringify({
          resume, topic, difficulty, question, transcript: messages,
          answer: finish ? "" : candidateText,
          code, language, finish,
        }),
      });
      setAiAvailable((current) => current && data.ai_available);
      setMessages((current) => [...(finish ? current : nextMessages), { role: "assistant", content: data.message }]);
      if (finish) setPhase("finished");
      speak(data.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your response could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    recognitionRef.current?.abort();
    capturedSpeechRef.current = false;
    window.speechSynthesis?.cancel();
    setPhase("setup");
    setMessages([]);
    setResume("");
    setQuestion("");
    setCode("");
    setAnswer("");
    answerRef.current = "";
    interimAnswerRef.current = "";
    setFile(null);
    setError("");
    setListening(false);
    setSpeaking(false);
  }

  if (phase === "setup") {
    return (
      <div className="mx-auto max-w-4xl space-y-7">
        <div>
          <Badge variant="secondary" className="mb-3"><AudioLines className="mr-1 size-3" /> Voice interview</Badge>
          <h1 className="text-3xl font-bold tracking-tight">Interview Mentor</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Have a spoken interview conversation about your projects, then work through a DSA problem out loud. The interviewer listens to your answer, asks follow-ups, and gives you feedback.</p>
        </div>
        <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
          <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileUp className="size-4 text-primary" /> Add your resume <span className="text-xs font-normal text-muted-foreground">(required)</span></CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <label htmlFor="resume-file" className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/30 p-5 text-center transition hover:border-primary/50">
                <FileUp className="mb-2 size-6 text-muted-foreground" />
                <span className="text-sm font-medium">{file ? file.name : "Choose a resume file"}</span>
                <span className="mt-1 text-xs text-muted-foreground">PDF, DOCX, TXT, or MD · up to 5 MB</span>
                <input id="resume-file" className="sr-only" type="file" accept=".pdf,.docx,.txt,.md" onChange={(event) => setFile(event.target.files?.[0] || null)} />
              </label>
              <p className="text-xs leading-relaxed text-muted-foreground">The resume is used for this session and is not saved to your account. Email addresses and phone numbers are removed before it is sent to the AI service.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Choose a practice round</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <label className="block space-y-2 text-sm font-medium">DSA topic
                <select value={topic} onChange={(e) => setTopic(e.target.value as Topic)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="arrays">Arrays & hashing</option><option value="strings">Strings</option><option value="linked lists">Linked lists</option><option value="trees">Trees</option><option value="graphs">Graphs</option><option value="dynamic programming">Dynamic programming</option>
                </select>
              </label>
              <label className="block space-y-2 text-sm font-medium">Difficulty
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                </select>
              </label>
              {!aiAvailable && <p role="status" className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-100">The backend has no valid Gemini API key, so this uses the resume-based local interviewer. Add a valid <code>GOOGLE_API_KEY</code> to <code>backend/.env</code> and restart the backend to enable adaptive AI questions.</p>}
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <Button className="w-full" size="lg" onClick={start} disabled={busy || !file}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Mic className="size-4" />}{busy ? "Starting interview…" : "Start voice interview"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">Your browser will ask for microphone access when you answer.</p>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {["Talk about your project", "Solve a DSA problem aloud", "Get interviewer feedback"].map((step, index) => <div key={step} className="rounded-xl border border-border/60 bg-card/60 p-4 text-sm"><span className="mr-2 text-primary">0{index + 1}</span>{step}</div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Live interview</h1><p className="text-sm text-muted-foreground">Project discussion · {topic} · {difficulty}</p></div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={reset}><RotateCcw className="size-4" /> New interview</Button>
          {phase === "running" && <Button variant="secondary" size="sm" onClick={() => submit(true)} disabled={busy}><CheckCircle2 className="size-4" /> End interview</Button>}
        </div>
      </div>

      {!aiAvailable && <div role="status" className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        <strong>Personalized AI is offline.</strong> The backend .env currently contains a placeholder instead of a Gemini API key. Add a valid <code>GOOGLE_API_KEY</code> there and restart the backend for resume based questions and adaptive follow-ups. Don’t paste the key into this chat.
      </div>}

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <Card className="flex min-h-[66vh] flex-col">
          <CardHeader className="flex-row items-center justify-between border-b border-border/60 py-4">
            <CardTitle className="flex items-center gap-2 text-sm"><Bot className="size-4 text-primary" /> Interviewer</CardTitle>
            <div className="flex items-center gap-3">
              {speaking && <span className="flex items-center gap-1.5 text-xs text-primary"><AudioLines className="size-4 animate-pulse" /> Speaking</span>}
              {messages.length > 0 && <button type="button" onClick={() => speak(messages[messages.length - 1].content)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Listen to the last question"><Play className="size-4" /></button>}
            </div>
          </CardHeader>
          <div className="flex flex-1 flex-col items-center justify-center gap-7 p-6 text-center sm:p-10">
            <div className={`relative flex size-36 items-center justify-center rounded-full transition-all ${listening ? "bg-rose-500/10 text-rose-400 ring-8 ring-rose-500/5" : speaking ? "bg-primary/10 text-primary ring-8 ring-primary/5" : "bg-secondary text-muted-foreground"}`}>
              {(listening || speaking) && <span className="absolute inset-0 animate-ping rounded-full border border-current opacity-20" />}
              {listening ? <Mic className="size-14" /> : speaking ? <AudioLines className="size-14" /> : <Bot className="size-14" />}
            </div>
            <div className="space-y-2">
              <p className="text-xl font-semibold">{listening ? "Listening to your answer" : speaking ? "Your interviewer is speaking" : busy ? "Thinking about your response" : phase === "finished" ? "Interview finished" : "You’re in the interview"}</p>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">{listening ? "Speak naturally. Finish your answer when you’re ready." : speaking ? "Listen to the question, then answer out loud." : phase === "finished" ? "Your feedback was delivered aloud. Use replay above to hear it again." : "The interviewer will ask about your resume project, then move into the coding round."}</p>
            </div>
            {phase === "running" && <div className="flex flex-wrap justify-center gap-3">
              {listening ? <Button size="lg" variant="secondary" onClick={stopListening}><MicOff className="size-4" /> Finish answer & send</Button> : <Button size="lg" onClick={startListening} disabled={busy || !speechSupported}><Mic className="size-4" /> {speechSupported ? "Answer with your voice" : "Microphone unavailable"}</Button>}
              <Button size="lg" variant="outline" onClick={() => setShowCode((show) => !show)}><ClipboardCheck className="size-4" /> {showCode ? "Close code editor" : "Open code editor"}</Button>
            </div>}
            {!speechSupported && phase === "running" && <p className="max-w-md text-xs text-amber-300">This browser does not support speech recognition. Use the latest Chrome or Edge and allow microphone access.</p>}
            {busy && <Loader2 className="size-5 animate-spin text-primary" />}
            {error && <p role="alert" className="max-w-md text-sm text-destructive">{error}</p>}
            <p className="max-w-md text-[11px] leading-relaxed text-muted-foreground">Voice recognition runs through your browser; audio may be processed by its speech service. CodeBuddy receives recognized words, not an audio recording.</p>
          </div>
        </Card>

        <aside className="space-y-4">
          <Card className="border-primary/20 bg-primary/[0.03]">
            <CardContent className="space-y-3 p-5 text-center">
              <div className={`mx-auto flex size-16 items-center justify-center rounded-full ${listening ? "animate-pulse bg-rose-500/15 text-rose-400" : speaking ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>
                {listening ? <Mic className="size-7" /> : speaking ? <AudioLines className="size-7" /> : <Bot className="size-7" />}
              </div>
              <p className="text-sm font-semibold">{listening ? "Listening to you" : speaking ? "Interviewer is speaking" : busy ? "Thinking" : "Interview in progress"}</p>
              <p className="text-xs text-muted-foreground">{listening ? "When you finish, stop listening and send your answer." : speechSupported ? "Use the microphone to answer out loud." : "Voice input requires the latest Chrome or Edge."}</p>
              {listening && <Button className="w-full" variant="secondary" onClick={stopListening}><MicOff className="size-4" /> Finish answer & send</Button>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4"><CardTitle className="text-sm">Coding round</CardTitle></CardHeader>
            <CardContent className="space-y-3 pb-5">
              <p className="text-xs leading-relaxed text-muted-foreground">When the interviewer moves to the DSA problem, open the workspace to write your solution. Explain your approach and complexity aloud.</p>
              <label className="block space-y-2 text-xs font-medium">Language
                <select value={language} onChange={(event) => setLanguage(event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" disabled={phase === "finished"}><option>Python</option><option>Java</option><option>C++</option><option>JavaScript</option><option>TypeScript</option><option>Go</option></select>
              </label>
              {showCode && <Textarea value={code} onChange={(event) => setCode(event.target.value)} placeholder={`Write your ${language} solution here…`} className="min-h-72 resize-y font-mono text-xs leading-5" disabled={phase === "finished"} spellCheck={false} />}
              <p className="text-[11px] leading-relaxed text-muted-foreground">Code is discussed by the interviewer but is not compiled or run.</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
