"use client";

import { useEffect, useState } from "react";

type Brief = {
  headline: string;
  brief: string;
  signals: string[];
  recommendation: string;
  mocked?: boolean;
};

export default function DealBrief({ dealId }: { dealId: string }) {
  const [data, setData] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setRefreshing(true);
    const res = await fetch("/api/ai/deal-brief", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dealId }),
    });
    const j = await res.json();
    setData(j);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  return (
    <section className="card p-5 border-l-4 border-l-brand-500">
      <div className="flex items-start gap-2">
        <span className="chip bg-brand-50 text-brand-700 shrink-0">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-500 mr-1.5" />
          Claude briefing
        </span>
        <button
          className="ml-auto text-xs text-brand-600 hover:underline disabled:text-ink-400"
          onClick={load}
          disabled={refreshing}
        >
          {refreshing ? "Re-briefing…" : "Re-brief"}
        </button>
      </div>

      {loading ? (
        <p className="mt-3 text-sm text-ink-400">Generating brief…</p>
      ) : data ? (
        <div className="mt-3 space-y-3">
          <div className="text-base font-semibold">{data.headline}</div>
          <p className="text-sm text-ink-700 leading-relaxed">{data.brief}</p>
          {data.signals.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {data.signals.map((s, i) => (
                <span key={i} className="chip bg-ink-100 text-ink-700">{s}</span>
              ))}
            </div>
          )}
          <div className="border-l-2 border-brand-500 pl-3">
            <div className="text-[11px] text-ink-500 uppercase tracking-wider">Recommended next step</div>
            <p className="text-sm text-ink-700 mt-0.5">{data.recommendation}</p>
          </div>
          {data.mocked && (
            <p className="text-[10px] text-ink-400">Heuristic mode — wire ANTHROPIC_API_KEY for live Claude output.</p>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-ink-400">Couldn&apos;t load brief.</p>
      )}
    </section>
  );
}
