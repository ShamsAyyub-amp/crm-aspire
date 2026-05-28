"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Action = { label: string; href: string };
type Brief = { reply: string; actions: Action[]; mocked?: boolean };

export default function CoachHero({ ownerId }: { ownerId: string }) {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<Brief | null>(null);

  async function loadBriefing() {
    setLoading(true);
    const res = await fetch("/api/ai/coach", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ownerId, mode: "briefing" }),
    });
    const j = await res.json();
    setBrief(j);
    setLoading(false);
  }

  useEffect(() => {
    loadBriefing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function ask() {
    if (!draft.trim()) return;
    setAsking(true);
    setAnswer(null);
    const res = await fetch("/api/ai/coach", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: draft, ownerId, mode: "ask" }),
    });
    const j = await res.json();
    setAnswer(j);
    setAsking(false);
  }

  const mocked = brief?.mocked || answer?.mocked;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-brand-200/60 bg-gradient-to-br from-brand-50 via-white to-brand-50/40 shadow-card">
      <div
        aria-hidden
        className="absolute -top-32 -right-20 w-96 h-96 rounded-full bg-gradient-to-br from-brand-300/30 to-transparent blur-3xl pointer-events-none"
      />
      <div className="relative p-6">
        <div className="flex items-start gap-4">
          <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white text-sm font-bold flex items-center justify-center shrink-0 shadow-md">
            AI
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-semibold text-ink-900">Your sales coach</h2>
              <span className="chip bg-brand-100/70 text-brand-700">briefing · just now</span>
              <Link href="/coach" className="ml-auto text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline">
                Open full chat →
              </Link>
            </div>

            <div className="mt-3 text-sm text-ink-700 whitespace-pre-wrap leading-relaxed">
              {loading || !brief ? (
                <BriefSkeleton />
              ) : (
                <Markdown text={brief.reply} />
              )}
            </div>

            {brief && brief.actions && brief.actions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {brief.actions.map((a, i) => (
                  <Link
                    key={i}
                    href={a.href}
                    className="text-xs px-3 py-1 rounded-full bg-brand-600 text-white hover:bg-brand-700 transition-colors shadow-sm"
                  >
                    {a.label} →
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-5 flex items-center gap-2">
              <input
                className="input text-sm flex-1 bg-white/70 backdrop-blur"
                placeholder="Ask your coach anything…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), ask())}
                disabled={asking}
              />
              <button className="btn-primary" disabled={asking || !draft.trim()} onClick={ask}>
                {asking ? "Thinking…" : "Ask"}
              </button>
            </div>

            {(asking || answer) && (
              <div className="mt-3 bg-white border border-ink-150 rounded-xl p-4 shadow-sm animate-in">
                {asking && !answer ? (
                  <div className="text-sm text-ink-400">Coach is thinking…</div>
                ) : answer ? (
                  <>
                    <div className="text-sm text-ink-700 whitespace-pre-wrap leading-relaxed">
                      <Markdown text={answer.reply} />
                    </div>
                    {answer.actions && answer.actions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {answer.actions.map((a, i) => (
                          <Link
                            key={i}
                            href={a.href}
                            className="text-xs px-3 py-1 rounded-full bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors"
                          >
                            {a.label} →
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            )}

            {mocked && (
              <p className="text-2xs text-ink-400 mt-3">
                Heuristic mode — set <code className="font-mono">GEMINI_API_KEY</code> in Vercel for live coaching.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function BriefSkeleton() {
  return (
    <div className="space-y-2">
      <div className="skeleton h-3 w-1/2" />
      <div className="skeleton h-3 w-full" />
      <div className="skeleton h-3 w-11/12" />
      <div className="skeleton h-3 w-3/4" />
    </div>
  );
}

function Markdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i} className="font-semibold text-ink-900">
            {p.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}
