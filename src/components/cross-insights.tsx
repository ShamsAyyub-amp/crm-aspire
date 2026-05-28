"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Insight = {
  title: string;
  detail: string;
  evidence: string;
  severity: "low" | "med" | "high";
  dealIds: string[];
};

export default function CrossInsights({ ownerId }: { ownerId: string }) {
  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [scope, setScope] = useState<"mine" | "team">("team");
  const [mocked, setMocked] = useState(false);

  async function load(next: "mine" | "team") {
    setScope(next);
    setInsights(null);
    const res = await fetch("/api/ai/cross-insights", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(next === "mine" ? { ownerId } : {}),
    });
    const j = await res.json();
    setInsights(j.insights ?? []);
    setMocked(!!j.mocked);
  }

  useEffect(() => {
    load("team");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-ink-700">Your coach noticed</h2>
          <p className="text-[11px] text-ink-500">Cross-deal patterns no single rep would catch.</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            className={`text-xs px-2 py-1 rounded ${scope === "mine" ? "bg-brand-50 text-brand-700" : "text-ink-500 hover:bg-ink-100"}`}
            onClick={() => load("mine")}
          >
            Mine
          </button>
          <button
            className={`text-xs px-2 py-1 rounded ${scope === "team" ? "bg-brand-50 text-brand-700" : "text-ink-500 hover:bg-ink-100"}`}
            onClick={() => load("team")}
          >
            Team
          </button>
        </div>
      </div>

      {mocked && <p className="text-[10px] text-ink-400 mb-2">Heuristic mode — wire ANTHROPIC_API_KEY for live Claude output.</p>}

      {insights == null ? (
        <p className="text-sm text-ink-400">Looking…</p>
      ) : insights.length === 0 ? (
        <p className="text-sm text-ink-400">Nothing notable.</p>
      ) : (
        <ul className="space-y-3">
          {insights.map((ins, i) => (
            <li key={i} className="border-l-2 pl-3" style={{ borderColor: ins.severity === "high" ? "#ef4444" : ins.severity === "med" ? "#f59e0b" : "#10b981" }}>
              <div className="text-sm font-medium">{ins.title}</div>
              <div className="text-xs text-ink-600 mt-0.5">{ins.detail}</div>
              {ins.evidence && (
                <div className="text-[11px] text-ink-500 mt-1 italic line-clamp-2">{ins.evidence}</div>
              )}
              {ins.dealIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {ins.dealIds.slice(0, 4).map((id) => (
                    <Link key={id} href={`/deals/${id}`} className="text-[11px] text-brand-600 hover:underline">
                      deal →
                    </Link>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
