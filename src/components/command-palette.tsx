"use client";

import { Command } from "cmdk";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Result = { kind: "deal" | "contact" | "company"; id: string; label: string; sub?: string };
type Mode = "search" | "brief";

type Brief = { headline: string; brief: string; signals: string[]; recommendation: string; mocked?: boolean };

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [mode, setMode] = useState<Mode>("search");
  const [brief, setBrief] = useState<{ deal: Result; data: Brief | null; loading: boolean } | null>(null);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape" && open) {
        e.preventDefault();
        reset();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const ctl = new AbortController();
    fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctl.signal })
      .then((r) => r.json())
      .then((j) => setResults(j.results ?? []))
      .catch(() => {});
    return () => ctl.abort();
  }, [q, open]);

  function reset() {
    setOpen(false);
    setQ("");
    setMode("search");
    setBrief(null);
  }

  function jump(r: Result) {
    const path = r.kind === "deal" ? `/deals/${r.id}` : r.kind === "contact" ? `/contacts` : `/companies`;
    router.push(path);
    reset();
  }

  async function briefOn(r: Result) {
    if (r.kind !== "deal") return;
    setMode("brief");
    setBrief({ deal: r, data: null, loading: true });
    const res = await fetch("/api/ai/deal-brief", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dealId: r.id }),
    });
    const data = await res.json();
    setBrief({ deal: r, data, loading: false });
  }

  if (!open) return <FloatingHint />;

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-sm flex items-start justify-center pt-24" onClick={reset}>
      <div
        className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-ink-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Global command" className="flex flex-col" shouldFilter={false}>
          {mode === "search" ? (
            <>
              <div className="flex items-center px-4 border-b border-ink-100">
                <SearchIcon />
                <Command.Input
                  ref={inputRef}
                  value={q}
                  onValueChange={setQ}
                  placeholder="Search deals, contacts, companies…"
                  className="flex-1 py-3 px-3 outline-none text-sm bg-transparent"
                  autoFocus
                />
                <span className="kbd">esc</span>
              </div>
              <Command.List className="max-h-80 overflow-auto p-1">
                <Command.Empty className="py-8 text-center text-sm text-ink-400">No matches.</Command.Empty>

                {group("Deals", results.filter((r) => r.kind === "deal"), (r) => (
                  <Command.Item
                    key={r.id}
                    value={`deal-${r.id}-${r.label}`}
                    onSelect={() => jump(r)}
                    className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer data-[selected=true]:bg-brand-50"
                  >
                    <span className="w-5 h-5 rounded bg-brand-100 text-brand-700 text-[10px] flex items-center justify-center">D</span>
                    <span className="flex-1 text-sm truncate">{r.label}</span>
                    {r.sub && <span className="chip bg-ink-100 text-ink-600">{r.sub}</span>}
                    <button
                      className="text-[10px] px-1.5 py-0.5 rounded border border-ink-200 text-ink-600 hover:bg-ink-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        briefOn(r);
                      }}
                    >
                      Brief me
                    </button>
                  </Command.Item>
                ))}

                {group("Contacts", results.filter((r) => r.kind === "contact"), (r) => (
                  <Command.Item
                    key={r.id}
                    value={`contact-${r.id}-${r.label}`}
                    onSelect={() => jump(r)}
                    className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer data-[selected=true]:bg-brand-50"
                  >
                    <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-700 text-[10px] flex items-center justify-center">C</span>
                    <span className="flex-1 text-sm truncate">{r.label}</span>
                    {r.sub && <span className="text-xs text-ink-500 truncate max-w-[180px]">{r.sub}</span>}
                  </Command.Item>
                ))}

                {group("Companies", results.filter((r) => r.kind === "company"), (r) => (
                  <Command.Item
                    key={r.id}
                    value={`company-${r.id}-${r.label}`}
                    onSelect={() => jump(r)}
                    className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer data-[selected=true]:bg-brand-50"
                  >
                    <span className="w-5 h-5 rounded bg-violet-100 text-violet-700 text-[10px] flex items-center justify-center">O</span>
                    <span className="flex-1 text-sm truncate">{r.label}</span>
                    {r.sub && <span className="text-xs text-ink-500">{r.sub}</span>}
                  </Command.Item>
                ))}

                <Command.Group heading="Pages" className="text-[10px] uppercase tracking-wider text-ink-400 px-2 mt-1">
                  {[
                    { p: "/dashboard", l: "Dashboard" },
                    { p: "/pipeline", l: "Pipeline" },
                    { p: "/analytics", l: "Analytics" },
                    { p: "/tasks", l: "Tasks" },
                    { p: "/sequences", l: "Sequences" },
                    { p: "/integrations", l: "Integrations" },
                  ].map((x) => (
                    <Command.Item
                      key={x.p}
                      value={`page-${x.p}`}
                      onSelect={() => {
                        router.push(x.p);
                        reset();
                      }}
                      className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer data-[selected=true]:bg-brand-50 normal-case tracking-normal text-ink-900"
                    >
                      <span className="w-5 h-5 rounded bg-ink-100 text-ink-600 text-[10px] flex items-center justify-center">→</span>
                      <span className="text-sm">{x.l}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              </Command.List>
            </>
          ) : (
            <BriefView state={brief} onBack={() => setMode("search")} onOpen={() => brief && jump(brief.deal)} />
          )}

          <div className="px-3 py-2 border-t border-ink-100 bg-ink-50 flex items-center gap-3 text-[10px] text-ink-500">
            <span><span className="kbd">↑↓</span> navigate</span>
            <span><span className="kbd">↵</span> jump</span>
            <span className="ml-auto"><span className="kbd">⌘K</span> toggle</span>
          </div>
        </Command>
      </div>
    </div>
  );
}

function BriefView({ state, onBack, onOpen }: { state: { deal: Result; data: Brief | null; loading: boolean } | null; onBack: () => void; onOpen: () => void }) {
  if (!state) return null;
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-3">
        <button className="text-xs text-ink-500 hover:text-ink-900" onClick={onBack}>← Back</button>
        <button className="text-xs text-brand-600 hover:underline" onClick={onOpen}>Open deal →</button>
      </div>
      <div className="text-sm text-ink-500">Brief on</div>
      <div className="text-base font-semibold">{state.deal.label}</div>
      {state.loading || !state.data ? (
        <p className="mt-4 text-sm text-ink-400">Generating brief…</p>
      ) : (
        <div className="mt-3 space-y-3">
          <div>
            <div className="chip bg-brand-50 text-brand-700">{state.data.headline}</div>
          </div>
          <p className="text-sm text-ink-700 leading-relaxed">{state.data.brief}</p>
          {state.data.signals.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {state.data.signals.map((s, i) => (
                <span key={i} className="chip bg-ink-100 text-ink-700">{s}</span>
              ))}
            </div>
          )}
          <div className="border-l-2 border-brand-500 pl-3 text-sm text-ink-700">
            <span className="text-xs text-ink-500">Recommended next step</span>
            <p className="mt-0.5">{state.data.recommendation}</p>
          </div>
          {state.data.mocked && (
            <p className="text-[10px] text-ink-400">Heuristic mode — wire ANTHROPIC_API_KEY for live Claude output.</p>
          )}
        </div>
      )}
    </div>
  );
}

function group<T>(heading: string, items: T[], render: (item: T) => React.ReactNode) {
  if (items.length === 0) return null;
  return (
    <Command.Group heading={heading} className="text-[10px] uppercase tracking-wider text-ink-400 px-2 mt-1">
      {items.map((it) => render(it))}
    </Command.Group>
  );
}

function FloatingHint() {
  // A subtle bottom-right hint so users discover Cmd+K. Hidden on small screens.
  return (
    <div className="hidden md:flex fixed bottom-4 right-4 items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white border border-ink-200 shadow-sm text-xs text-ink-500 z-40">
      <span>Press</span>
      <span className="kbd">⌘</span>
      <span className="kbd">K</span>
      <span>to search</span>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg className="w-4 h-4 text-ink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
