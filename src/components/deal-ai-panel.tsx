"use client";

import { useState, useTransition } from "react";
import { rescoreDealHealth } from "@/app/actions";
import { relative } from "@/lib/format";
import type { Deal } from "@/lib/types";

type Intent = "follow_up" | "schedule_demo" | "close" | "re_engage";
const INTENTS: { id: Intent; label: string }[] = [
  { id: "follow_up", label: "Follow up" },
  { id: "schedule_demo", label: "Schedule demo" },
  { id: "close", label: "Close" },
  { id: "re_engage", label: "Re-engage" },
];

export default function DealAiPanel({ deal, contactEmail }: { deal: Deal; contactEmail: string | null }) {
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<{ subject: string; body: string; mocked: boolean } | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentMsg, setSentMsg] = useState<string | null>(null);
  const [intent, setIntent] = useState<Intent>("follow_up");

  const score = deal.health_score;
  const tone = score == null ? "text-ink-400" : score >= 75 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-rose-600";
  const ring = score == null ? "stroke-ink-200" : score >= 75 ? "stroke-emerald-500" : score >= 50 ? "stroke-amber-500" : "stroke-rose-500";
  const pct = Math.max(0, Math.min(100, score ?? 0));
  const C = 2 * Math.PI * 26;
  const dash = (pct / 100) * C;

  async function generateDraft() {
    setDrafting(true);
    setSentMsg(null);
    const res = await fetch("/api/ai/draft-email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dealId: deal.id, intent }),
    });
    const json = await res.json();
    setDraft({ subject: json.subject, body: json.body, mocked: !!json.mocked });
    setDrafting(false);
  }

  async function sendDraft() {
    if (!draft) return;
    setSending(true);
    const res = await fetch("/api/email/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        dealId: deal.id,
        toEmail: contactEmail,
        subject: draft.subject,
        body: draft.body,
      }),
    });
    const json = await res.json();
    setSending(false);
    setSentMsg(json.mocked ? "Logged as activity (mocked send — wire RESEND_API_KEY for real send)." : "Sent.");
    setDraft(null);
  }

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-ink-700">Claude on this deal</h2>
        <button
          className="text-xs text-brand-600 hover:underline disabled:text-ink-400"
          disabled={pending}
          onClick={() => start(() => rescoreDealHealth(deal.id))}
        >
          {pending ? "Scoring…" : "Re-score"}
        </button>
      </div>

      <div className="flex items-start gap-4">
        <div className="relative w-16 h-16 shrink-0">
          <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
            <circle cx="32" cy="32" r="26" className="stroke-ink-100 fill-none" strokeWidth="6" />
            <circle
              cx="32"
              cy="32"
              r="26"
              className={`${ring} fill-none transition-all duration-500`}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${C}`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-base font-semibold ${tone}`}>{score ?? "—"}</span>
          </div>
        </div>
        <div className="flex-1 text-sm">
          <div className="text-ink-700 font-medium">Deal health</div>
          <p className="text-ink-600 mt-1">{deal.health_reasoning ?? "Not scored yet. Hit Re-score."}</p>
          {deal.health_updated_at && (
            <p className="text-[10px] text-ink-400 mt-1">updated {relative(deal.health_updated_at)}</p>
          )}
        </div>
      </div>

      {Array.isArray(deal.health_risks) && deal.health_risks.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {deal.health_risks.map((r, i) => (
            <li key={i} className="text-xs flex items-center gap-2">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  r.severity === "high" ? "bg-rose-500" : r.severity === "med" ? "bg-amber-500" : "bg-emerald-500"
                }`}
              />
              <span className="text-ink-700">{r.label}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-ink-100 my-4" />

      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-ink-700">Draft next email</h3>
        <select
          className="text-xs border border-ink-200 rounded px-1.5 py-0.5 bg-white"
          value={intent}
          onChange={(e) => setIntent(e.target.value as Intent)}
        >
          {INTENTS.map((i) => (
            <option key={i.id} value={i.id}>{i.label}</option>
          ))}
        </select>
      </div>

      <button className="btn-secondary w-full mt-2" onClick={generateDraft} disabled={drafting}>
        {drafting ? "Drafting…" : draft ? "Re-draft" : "Generate"}
      </button>

      {draft && (
        <div className="mt-3 space-y-2">
          <input
            className="input"
            value={draft.subject}
            onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
          />
          <textarea
            className="input min-h-[160px] font-mono text-xs leading-relaxed"
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-ink-400">
              {contactEmail ? `To: ${contactEmail}` : "No contact email — will log as activity only"}
              {draft.mocked && " · heuristic draft"}
            </span>
            <button className="btn-primary" disabled={sending} onClick={sendDraft}>
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      )}

      {sentMsg && <p className="text-xs text-emerald-700 mt-2">{sentMsg}</p>}
    </section>
  );
}
