import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowUp, Heart, RotateCcw } from "lucide-react";
import panda from "@/assets/panda.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bamboo - Shagun's Panda Friend" },
      { name: "description", content: "Chat with Bamboo, a cozy panda who gets to know Shagun." },
      { property: "og:title", content: "Bamboo - Shagun's Panda Friend" },
      { property: "og:description", content: "Chat with Bamboo, a cozy panda who gets to know Shagun." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const MSG_KEY = "bamboo-messages";
const FACT_KEY = "bamboo-facts";

function Index() {
  const [loaded, setLoaded] = useState<{ messages: UIMessage[]; facts: string[] } | null>(null);
  useEffect(() => {
    try {
      setLoaded({
        messages: JSON.parse(localStorage.getItem(MSG_KEY) || "[]"),
        facts: JSON.parse(localStorage.getItem(FACT_KEY) || "[]"),
      });
    } catch {
      setLoaded({ messages: [], facts: [] });
    }
  }, []);
  if (!loaded) return <div className="min-h-screen bg-background" />;
  return <Chat initial={loaded.messages} initialFacts={loaded.facts} />;
}

function Chat({ initial, initialFacts }: { initial: UIMessage[]; initialFacts: string[] }) {
  const [facts, setFacts] = useState<string[]>(initialFacts);
  const factsRef = useRef(facts);
  factsRef.current = facts;
  const [input, setInput] = useState("");
  const [showFacts, setShowFacts] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error, setMessages } = useChat({
    id: "shagun",
    messages: initial,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages }) => ({ body: { messages, facts: factsRef.current } }),
    }),
  });

  // Persist messages + collect learned facts
  useEffect(() => {
    if (status === "streaming" || status === "submitted") return;
    localStorage.setItem(MSG_KEY, JSON.stringify(messages));
    const found: string[] = [];
    for (const m of messages)
      for (const p of m.parts as any[])
        if (p.type === "tool-remember" && p.output?.saved) found.push(p.output.saved);
    setFacts((prev) => {
      const next = Array.from(new Set([...prev, ...found]));
      localStorage.setItem(FACT_KEY, JSON.stringify(next));
      return next;
    });
    inputRef.current?.focus();
  }, [messages, status]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    if (initial.length === 0) sendMessage({ text: "Hi Bamboo! 👋" });
    inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const busy = status === "submitted" || status === "streaming";
  const submit = () => {
    const t = input.trim();
    if (!t || busy) return;
    sendMessage({ text: t });
    setInput("");
  };

  const reset = () => {
    if (!confirm("Start fresh? Bamboo will forget everything.")) return;
    localStorage.removeItem(MSG_KEY);
    localStorage.removeItem(FACT_KEY);
    setFacts([]);
    setMessages([]);
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <header className="flex items-center gap-2 border-b border-border bg-card/80 px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur sm:gap-3 sm:px-4">
        <img src={panda} alt="Bamboo the panda" width={816} height={816} className="h-12 w-12 animate-bob" />
        <div className="flex-1">
          <h1 className="font-display text-xl font-semibold leading-tight">Bamboo</h1>
          <p className="text-xs text-muted-foreground">{busy ? "typing…" : "Shagun's panda friend 🎋"}</p>
        </div>
        <button
          onClick={() => setShowFacts((s) => !s)}
          className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground"
        >
          <Heart className="h-3.5 w-3.5" /> {facts.length}
        </button>
        <button onClick={reset} aria-label="Start fresh" className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
          <RotateCcw className="h-4 w-4" />
        </button>
      </header>

      {showFacts && (
        <div className="border-b border-border bg-secondary/60 px-4 py-3 text-sm">
          <p className="mb-1 font-display font-semibold">Things Bamboo knows about you</p>
          {facts.length === 0 ? (
            <p className="text-muted-foreground">Nothing yet — keep chatting!</p>
          ) : (
            <ul className="list-disc space-y-0.5 pl-5">{facts.map((f) => <li key={f}>{f}</li>)}</ul>
          )}
        </div>
      )}

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-2xl flex-col gap-3 px-3 py-4 sm:gap-4 sm:px-4 sm:py-6">
          {messages.map((m) => {
            const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
            if (!text) return null;
            if (m.role === "user")
              return (
                <div key={m.id} className="ml-auto max-w-[80%] rounded-3xl rounded-br-md bg-bubble-user px-4 py-2.5 text-bubble-user-foreground">
                  {text}
                </div>
              );
            return (
              <div key={m.id} className="flex max-w-[85%] items-start gap-2">
                <img src={panda} alt="" width={816} height={816} loading="lazy" className="mt-0.5 h-8 w-8 shrink-0" />
                <div className="prose prose-sm leading-relaxed text-foreground">
                  <ReactMarkdown>{text}</ReactMarkdown>
                </div>
              </div>
            );
          })}
          {status === "submitted" && (
            <div className="flex items-center gap-2">
              <img src={panda} alt="" width={816} height={816} className="h-8 w-8 animate-bob" />
              <span className="text-sm text-muted-foreground">Bamboo is munching on a thought… 🎋</span>
            </div>
          )}
          {error && <p className="text-sm text-destructive">Oops, Bamboo dozed off: {error.message}</p>}
          <div ref={endRef} />
        </div>
      </main>

      <footer className="border-t border-border bg-card/80 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-3xl border border-input bg-background p-2 focus-within:ring-2 focus-within:ring-ring">
          <textarea
            ref={inputRef}
            value={input}
            rows={1}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Tell Bamboo anything…"
            className="max-h-32 flex-1 resize-none bg-transparent px-2 py-1.5 text-base outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={submit}
            disabled={busy || !input.trim()}
            aria-label="Send"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </footer>
    </div>
  );
}
