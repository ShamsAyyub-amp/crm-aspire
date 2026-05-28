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

  return (
    <section className="card p-5 border-l-4 border-l-brand-500 bg-gradient-to-br from-white to-brand-50/30">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-full bg-brand-600 text-white text-sm font-semibold flex items-center justify-center shrink-0">AI</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-ink-900">Your sales coach</h2>
            <span className="chip bg-brand-50 text-brand-700">briefing · just now</span>
            <Link href="/coach" className="ml-auto text-xs text-brand-600 hover:underline">Open full chat →</Link>
          </div>

          <div className="mt-3 text-sm text-ink-700 whitespace-pre-wrap leading-relaxed">
            {loading || !brief ? (
              <span className="text-ink-400">Reading your pipeline…</span>
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
                  className="text-xs px-2.5 py-1 rounded-full bg-brand-600 text-white hover:bg-brand-700"
                >
                  {a.label} →
                </Link>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center gap-2">
            <input
              className="input text-sm flex-1"
              placeholder="Ask your coach anything…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), ask())}
              disabled={asking}
            />
            <button className="btn-secondary" disabled={asking || !draft.trim()} onClick={ask}>
              {asking ? "Thinking…" : "Ask"}
            </button>
          </div>

          {answer && (
            <div className="mt-3 bg-white border border-ink-100 rounded-md p-3">
              <div className="text-sm text-ink-700 whitespace-pre-wrap leading-relaxed">
                <Markdown text={answer.reply} />
              </div>
              {answer.actions && answer.actions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {answer.actions.map((a, i) => (
                    <Link key={i} href={a.href} className="text-xs px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 hover:bg-brand-100">
                      {a.label} →
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {(brief?.mocked || answer?.mocked) && (
            <p className="text-[10px] text-ink-400 mt-2">Heuristic coaching — wire ANTHROPIC_API_KEY for live Claude.</p>
          )}
        </div>
      </div>
    </section>
  );
}

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
