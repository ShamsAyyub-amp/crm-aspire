import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUserId, listUsers } from "@/lib/user";
import { money, moneyCompact, relative } from "@/lib/format";
import { OPEN_STAGES, STAGES } from "@/lib/types";
import type { Activity, Deal, User } from "@/lib/types";
import NextActions from "@/components/next-actions";
import HealthDot from "@/components/health-dot";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

async function loadAll() {
  const db = supabaseAdmin();
  const [deals, acts, users, me] = await Promise.all([
    db.from("deals").select("*"),
    db.from("activities").select("*").order("occurred_at", { ascending: false }).limit(15),
    listUsers(),
    getCurrentUserId(),
  ]);
  return {
    deals: (deals.data as Deal[]) ?? [],
    activities: (acts.data as Activity[]) ?? [],
    users,
    meId: me,
  };
}

export default async function Dashboard() {
  const { deals, activities, users, meId } = await loadAll();

  const open = deals.filter((d) => OPEN_STAGES.includes(d.stage));
  const openValue = open.reduce((s, d) => s + d.value_cents, 0);
  const weighted = open.reduce((s, d) => s + (d.value_cents * d.probability) / 100, 0);

  const lastClosed = deals.filter((d) => d.status === "won" || d.status === "lost");
  const won = lastClosed.filter((d) => d.status === "won");
  const wonValue = won.reduce((s, d) => s + d.value_cents, 0);
  const winRate = lastClosed.length ? Math.round((won.length / lastClosed.length) * 100) : 0;
  const avgDeal = won.length ? Math.round(wonValue / won.length) : 0;

  const atRisk = open.filter((d) => (d.health_score ?? 100) < 60).length;

  const byStage = STAGES.filter((s) => OPEN_STAGES.includes(s.id)).map((s) => {
    const items = open.filter((d) => d.stage === s.id);
    return { ...s, count: items.length, value: items.reduce((a, b) => a + b.value_cents, 0) };
  });

  const leaderboard = users
    .map((u) => {
      const w = won.filter((d) => d.owner_id === u.id);
      const open = deals.filter((d) => d.owner_id === u.id && OPEN_STAGES.includes(d.stage));
      return { u, wonCount: w.length, wonValue: w.reduce((a, b) => a + b.value_cents, 0), pipelineValue: open.reduce((a, b) => a + b.value_cents, 0) };
    })
    .sort((a, b) => b.wonValue - a.wonValue)
    .slice(0, 5);

  // Compute next-actions URL on the server so the client component can call it.
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host");
  const baseUrl = `${proto}://${host}`;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-ink-500">Where the team stands and what to do next.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Kpi label="Open pipeline" value={moneyCompact(openValue)} />
        <Kpi label="Weighted forecast" value={moneyCompact(weighted)} hint="Σ value × stage prob" />
        <Kpi label="Won (closed)" value={moneyCompact(wonValue)} hint={`${won.length} deals`} />
        <Kpi label="Win rate" value={`${winRate}%`} hint={`${won.length}/${lastClosed.length}`} />
        <Kpi label="Avg deal size" value={moneyCompact(avgDeal)} />
        <Kpi label="At risk" value={String(atRisk)} hint="Health < 60" tone={atRisk > 0 ? "warn" : "ok"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-ink-700">Pipeline by stage</h2>
              <Link href="/pipeline" className="text-xs text-brand-600 hover:underline">Open pipeline →</Link>
            </div>
            <div className="space-y-2">
              {byStage.map((s) => {
                const max = Math.max(1, ...byStage.map((x) => x.value));
                const pct = Math.round((s.value / max) * 100);
                return (
                  <div key={s.id} className="flex items-center gap-3 text-sm">
                    <div className="w-28 text-ink-700">{s.label}</div>
                    <div className="flex-1 h-6 bg-ink-100 rounded overflow-hidden">
                      <div className="h-full bg-brand-500/80" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="w-20 text-right tabular-nums text-ink-700">{moneyCompact(s.value)}</div>
                    <div className="w-10 text-right tabular-nums text-ink-500">{s.count}</div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-semibold text-ink-700 mb-4">Recent activity</h2>
            <ul className="divide-y divide-ink-100">
              {activities.map((a) => (
                <li key={a.id} className="py-2.5 flex items-start gap-3 text-sm">
                  <ActivityIcon t={a.type} />
                  <div className="flex-1 min-w-0">
                    <div className="text-ink-900 truncate">
                      {a.subject ?? labelFor(a.type)}
                    </div>
                    {a.body && <div className="text-ink-500 text-xs truncate">{a.body}</div>}
                  </div>
                  <div className="text-xs text-ink-400 whitespace-nowrap">{relative(a.occurred_at)}</div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="space-y-6">
          <NextActions baseUrl={baseUrl} ownerId={meId} />

          <section className="card p-5">
            <h2 className="text-sm font-semibold text-ink-700 mb-3">Leaderboard</h2>
            <ol className="space-y-2 text-sm">
              {leaderboard.map((row, i) => (
                <li key={row.u.id} className="flex items-center gap-3">
                  <span className="w-5 text-ink-400 text-xs">{i + 1}</span>
                  <span className="flex-1">{row.u.name}</span>
                  <span className="tabular-nums">{moneyCompact(row.wonValue)}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-semibold text-ink-700 mb-3">Top at-risk deals</h2>
            <ul className="space-y-2 text-sm">
              {open
                .slice()
                .sort((a, b) => (a.health_score ?? 100) - (b.health_score ?? 100))
                .slice(0, 5)
                .map((d) => (
                  <li key={d.id} className="flex items-center gap-3">
                    <HealthDot score={d.health_score} />
                    <Link href={`/deals/${d.id}`} className="flex-1 hover:underline truncate">
                      {d.name}
                    </Link>
                    <span className="tabular-nums text-ink-500">{moneyCompact(d.value_cents)}</span>
                  </li>
                ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "ok" | "warn" }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-ink-500">{label}</div>
      <div className={`text-xl font-semibold mt-1 ${tone === "warn" ? "text-amber-600" : ""}`}>{value}</div>
      {hint && <div className="text-[11px] text-ink-400 mt-0.5">{hint}</div>}
    </div>
  );
}

function ActivityIcon({ t }: { t: Activity["type"] }) {
  const map: Record<string, { ch: string; bg: string }> = {
    call: { ch: "📞", bg: "bg-emerald-50" },
    email_sent: { ch: "📤", bg: "bg-brand-50" },
    email_received: { ch: "📥", bg: "bg-violet-50" },
    meeting: { ch: "🤝", bg: "bg-amber-50" },
    note: { ch: "📝", bg: "bg-ink-100" },
    stage_change: { ch: "🔁", bg: "bg-ink-100" },
    task: { ch: "✅", bg: "bg-ink-100" },
  };
  const x = map[t] ?? map.note;
  return (
    <span className={`w-6 h-6 rounded ${x.bg} flex items-center justify-center text-[11px]`} aria-hidden>
      {x.ch}
    </span>
  );
}

function labelFor(t: Activity["type"]) {
  return ({
    call: "Call",
    email_sent: "Email sent",
    email_received: "Email received",
    meeting: "Meeting",
    note: "Note",
    stage_change: "Stage change",
    task: "Task",
  } as const)[t];
}
