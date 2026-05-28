"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Action = {
  dealId: string;
  dealName: string;
  title: string;
  why: string;
  severity: "low" | "med" | "high";
};

export default function NextActions({ baseUrl, ownerId }: { baseUrl: string; ownerId: string }) {
  const [actions, setActions] = useState<Action[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [mocked, setMocked] = useState(false);

  async function load(scope: "mine" | "team") {
    setLoading(true);
    const res = await fetch(`${baseUrl}/api/ai/next-actions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(scope === "mine" ? { ownerId } : {}),
      cache: "no-store",
    });
    const json = await res.json();
    setActions(json.actions ?? []);
    setMocked(!!json.mocked);
    setLoading(false);
  }

  useEffect(() => {
    load("mine");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-ink-700">What to do today</h2>
        <div className="flex items-center gap-1">
          <button className="text-xs text-ink-500 hover:text-ink-900 px-2 py-1 rounded hover:bg-ink-100" onClick={() => load("mine")}>Mine</button>
          <button className="text-xs text-ink-500 hover:text-ink-900 px-2 py-1 rounded hover:bg-ink-100" onClick={() => load("team")}>Team</button>
        </div>
      </div>
      {mocked && (
        <p className="text-[10px] text-ink-400 mb-2">Heuristic mode — wire ANTHROPIC_API_KEY for live Claude output.</p>
      )}
      {loading ? (
        <p className="text-sm text-ink-400">Thinking…</p>
      ) : actions && actions.length > 0 ? (
        <ul className="space-y-3">
          {actions.map((a, i) => (
            <li key={i} className="flex items-start gap-2">
              <span
                className={`mt-1 inline-block w-1.5 h-1.5 rounded-full ${
                  a.severity === "high" ? "bg-rose-500" : a.severity === "med" ? "bg-amber-500" : "bg-emerald-500"
                }`}
              />
              <div className="text-sm flex-1 min-w-0">
                <Link href={`/deals/${a.dealId}`} className="font-medium hover:underline">
                  {a.title}
                </Link>
                <div className="text-xs text-ink-500">{a.why}</div>
                <Link href={`/deals/${a.dealId}`} className="text-[11px] text-brand-600 hover:underline">
                  {a.dealName} →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-400">All clear. Nothing urgent.</p>
      )}
    </section>
  );
}
