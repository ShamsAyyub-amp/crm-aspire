"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Action = { label: string; href: string };
type Turn = { role: "user" | "coach"; text: string; actions?: Action[]; mocked?: boolean };

const STARTERS = [
  "What should I focus on today?",
  "How's my pipeline?",
  "What's at risk?",
  "Who should I call today?",
  "Give me a coaching tip",
];

export default function CoachChat({ ownerId, autoLoadBriefing = true }: { ownerId: string; autoLoadBriefing?: boolean }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoLoadBriefing) send("", "briefing");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, pending]);

  async function send(text: string, mode: "briefing" | "ask" = "ask") {
    if (mode === "ask") {
      if (!text.trim()) return;
      setTurns((t) => [...t, { role: "user", text }]);
    }
    setDraft("");
    setPending(true);
    const res = await fetch("/api/ai/coach", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: text, ownerId, mode }),
    });
    const j = await res.json();
    setTurns((t) => [...t, { role: "coach", text: j.reply, actions: j.actions, mocked: !!j.mocked }]);
    setPending(false);
  }

  return (
    <div className="flex flex-col h-[70vh] card overflow-hidden">
      <div className="px-5 py-3 border-b border-ink-100 flex items-center gap-3">
        <span className="w-8 h-8 rounded-full bg-brand-600 text-white text-xs font-semibold flex items-center justify-center">AI</span>
        <div className="flex-1">
          <div className="text-sm font-semibold">Your sales coach</div>
          <div className="text-[11px] text-ink-500">Asks what a great manager would. Answers fast.</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {turns.length === 0 && !pending && (
          <div className="text-sm text-ink-400">Loading briefing…</div>
        )}
        {turns.map((t, i) => (
          <Bubble key={i} turn={t} />
        ))}
        {pending && (
          <div className="flex gap-2 items-start">
            <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold flex items-center justify-center shrink-0">AI</span>
            <div className="bg-ink-100 rounded-lg px-3 py-2 text-sm text-ink-500">Thinking…</div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-ink-100 p-3 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {STARTERS.map((s) => (
            <button
              key={s}
              className="text-xs px-2 py-1 rounded-full bg-ink-100 hover:bg-ink-200 text-ink-700"
              onClick={() => send(s)}
              disabled={pending}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            className="input text-sm flex-1"
            placeholder="Ask anything — 'coach me on Trellis', 'what should I close this week'…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send(draft))}
            disabled={pending}
          />
          <button className="btn-primary" disabled={pending || !draft.trim()} onClick={() => send(draft)}>
            Ask
          </button>
        </div>
      </div>
    </div>
  );
}

function Bubble({ turn }: { turn: Turn }) {
  if (turn.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="bg-brand-600 text-white rounded-lg px-3 py-2 text-sm max-w-[80%]">{turn.text}</div>
      </div>
    );
  }
  return (
    <div className="flex gap-2 items-start">
      <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold flex items-center justify-center shrink-0">AI</span>
      <div className="flex-1 max-w-[80%]">
        <div className="bg-ink-100 rounded-lg px-3 py-2 text-sm text-ink-900 whitespace-pre-wrap leading-relaxed">
          <Markdown text={turn.text} />
        </div>
        {turn.actions && turn.actions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {turn.actions.map((a, i) => (
              <Link key={i} href={a.href} className="text-xs px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 hover:bg-brand-100">
                {a.label} →
              </Link>
            ))}
          </div>
        )}
        {turn.mocked && (
          <div className="text-2xs text-ink-400 mt-1">Heuristic mode — set GEMINI_API_KEY in Vercel for live coaching.</div>
        )}
      </div>
    </div>
  );
}

// Tiny **bold** renderer — keeps the bubble readable without pulling in a markdown lib.
function Markdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i}>{p.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}
