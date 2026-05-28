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
    <section className="relative overflow-hidden border-y-2 border-ink-900 bg-ink-50/95 animate-in">
      <div
        aria-hidden
        className="absolute -top-20 right-0 w-[420px] h-[420px] rounded-full bg-brand-400/12 blur-3xl pointer-events-none"
      />

      {/* Masthead row */}
      <div className="relative px-6 pt-5 flex items-center justify-between">
        <span className="eyebrow">Vol. I · Briefing · Just now</span>
        <Link href="/coach" className="eyebrow text-ink-500 hover:text-brand-700 transition-colors">
          Full chat →
        </Link>
      </div>

      <div className="relative px-6 pt-3 pb-6 grid grid-cols-12 gap-6">
        {/* Left column: title block */}
        <div className="col-span-12 md:col-span-4">
          <div className="display-italic text-brand-600 text-base mb-1">
            from your coach
          </div>
          <h1
            className="display-headline text-ink-900 text-[2.6rem] md:text-[2.9rem] leading-[0.95]"
            style={{ fontVariationSettings: "'opsz' 144, 'wght' 480, 'SOFT' 50, 'WONK' 1" }}
          >
            Today's <span className="display-italic text-brand-700">play</span>.
          </h1>
          <div className="mt-3 hairline-strong w-12" />
          <p className="text-2xs text-ink-500 mt-3 font-mono uppercase tracking-editorial">
            Read in 30 seconds.
          </p>
        </div>

        {/* Right column: the briefing body */}
        <div className="col-span-12 md:col-span-8 md:border-l md:border-ink-200 md:pl-6">
          <div className="text-[15px] text-ink-800 leading-[1.65]">
            {loading || !brief ? (
              <BriefSkeleton />
            ) : (
              <div className="drop-cap">
                <Markdown text={brief.reply} />
              </div>
            )}
          </div>

          {brief && brief.actions && brief.actions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 hairline">
              {brief.actions.map((a, i) => (
                <Link
                  key={i}
                  href={a.href}
                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-sm border border-ink-900 bg-ink-900 text-ink-50 hover:bg-brand-700 hover:border-brand-700 transition-colors font-medium"
                >
                  <span className="eyebrow text-ink-50/70 mr-1">{String(i + 1).padStart(2, "0")}</span>
                  <span>{a.label}</span>
                  <span>→</span>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-5 flex items-stretch gap-2">
            <input
              className="input text-sm flex-1 bg-ink-50 border-ink-300"
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
            <div className="mt-4 border-l-2 border-brand-500 pl-4 animate-in">
              {asking && !answer ? (
                <div className="text-sm text-ink-400 italic">The coach is thinking…</div>
              ) : answer ? (
                <>
                  <div className="eyebrow text-ink-500 mb-1.5">Answer</div>
                  <div className="text-sm text-ink-800 whitespace-pre-wrap leading-[1.65]">
                    <Markdown text={answer.reply} />
                  </div>
                  {answer.actions && answer.actions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {answer.actions.map((a, i) => (
                        <Link
                          key={i}
                          href={a.href}
                          className="text-xs px-2.5 py-1 rounded-sm border border-ink-200 text-ink-700 hover:border-brand-500 hover:text-brand-700 transition-colors"
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
            <p className="text-2xs text-ink-400 italic mt-4">
              Heuristic mode — set <span className="font-mono not-italic">GEMINI_API_KEY</span> in Vercel for live coaching.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function BriefSkeleton() {
  return (
    <div className="space-y-2.5 pt-1">
      <div className="skeleton h-3 w-1/2" />
      <div className="skeleton h-3 w-full" />
      <div className="skeleton h-3 w-11/12" />
      <div className="skeleton h-3 w-9/12" />
      <div className="skeleton h-3 w-3/4" />
    </div>
  );
}

function Markdown({ text }: { text: string }) {
  // Render **bold** as italic Fraunces emphasis — editorial style replaces bold sans with italic serif.
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <em key={i} className="serif-em not-italic text-ink-900" style={{ fontStyle: "italic" }}>
            {p.slice(2, -2)}
          </em>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}
