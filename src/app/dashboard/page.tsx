import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUser, getCurrentUserId, listUsers } from "@/lib/user";
import { money, moneyCompact, relative } from "@/lib/format";
import { OPEN_STAGES, STAGES } from "@/lib/types";
import type { Activity, Deal, Task, User } from "@/lib/types";
import NextActions from "@/components/next-actions";
import HealthDot from "@/components/health-dot";
import QuotaWidget from "@/components/quota-widget";
import CrossInsights from "@/components/cross-insights";
import CoachHero from "@/components/coach-hero";
import { headers } from "next/headers";
import type { Quota } from "@/lib/types";

export const dynamic = "force-dynamic";

async function loadAll() {
  const db = supabaseAdmin();
  const meId = await getCurrentUserId();
  const [deals, acts, tasks, quotas, users, me] = await Promise.all([
    db.from("deals").select("*"),
    db.from("activities").select("*").eq("owner_id", meId).order("occurred_at", { ascending: false }).limit(12),
    db.from("tasks").select("*").eq("owner_id", meId).is("completed_at", null).order("due_at", { ascending: true, nullsFirst: false }).limit(20),
    db.from("quotas").select("*").eq("user_id", meId),
    listUsers(),
    getCurrentUser(),
  ]);
  return {
    allDeals: (deals.data as Deal[]) ?? [],
    myActivities: (acts.data as Activity[]) ?? [],
    myTasks: (tasks.data as Task[]) ?? [],
    myQuotas: (quotas.data as Quota[]) ?? [],
    users,
    me,
    meId,
  };
}

export default async function Dashboard() {
  const { allDeals, myActivities, myTasks, myQuotas, users, me, meId } = await loadAll();

  // MINE — every metric on this page is rep-scoped.
  const myDeals = allDeals.filter((d) => d.owner_id === meId);
  const myOpen = myDeals.filter((d) => OPEN_STAGES.includes(d.stage));
  const myOpenValue = myOpen.reduce((s, d) => s + d.value_cents, 0);
  const myWeighted = myOpen.reduce((s, d) => s + (d.value_cents * d.probability) / 100, 0);

  // Won this month, not all-time.
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const myWonThisMonth = myDeals.filter(
    (d) => d.status === "won" && d.closed_at && new Date(d.closed_at) >= monthStart
  );
  const myWonValueMonth = myWonThisMonth.reduce((s, d) => s + d.value_cents, 0);

  const myClosed = myDeals.filter((d) => d.status === "won" || d.status === "lost");
  const myWon = myClosed.filter((d) => d.status === "won");
  const myWinRate = myClosed.length ? Math.round((myWon.length / myClosed.length) * 100) : 0;

  const myAtRisk = myOpen.filter((d) => (d.health_score ?? 100) < 60).length;

  const now = Date.now();
  const todayCutoff = new Date();
  todayCutoff.setHours(23, 59, 59, 999);
  const overdue = myTasks.filter((t) => t.due_at && new Date(t.due_at).getTime() < now);
  const dueToday = myTasks.filter(
    (t) => t.due_at && new Date(t.due_at).getTime() >= now && new Date(t.due_at) <= todayCutoff
  );

  const myByStage = STAGES.filter((s) => OPEN_STAGES.includes(s.id)).map((s) => {
    const items = myOpen.filter((d) => d.stage === s.id);
    return { ...s, count: items.length, value: items.reduce((a, b) => a + b.value_cents, 0) };
  });

  // Compute base URL for client components that need to fetch.
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host");
  const baseUrl = `${proto}://${host}`;

  const firstName = me?.name?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Hey" : "Evening";

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greet}, {firstName}.
          </h1>
          <p className="text-sm text-ink-500">
            Your day, your pipeline, your coach. <Link href="/analytics" className="text-brand-600 hover:underline">Team view →</Link>
          </p>
        </div>
      </div>

      <CoachHero ownerId={meId} />

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Kpi label="Tasks today" value={String(dueToday.length)} hint={overdue.length > 0 ? `${overdue.length} overdue` : "on track"} tone={overdue.length > 0 ? "warn" : undefined} href="/tasks" />
        <Kpi label="My open pipeline" value={moneyCompact(myOpenValue)} hint={`${myOpen.length} deals`} href="/pipeline" />
        <Kpi label="Weighted forecast" value={moneyCompact(myWeighted)} hint="Σ value × stage prob" />
        <Kpi label="Won this month" value={moneyCompact(myWonValueMonth)} hint={`${myWonThisMonth.length} deals`} />
        <Kpi label="My win rate" value={`${myWinRate}%`} hint={`${myWon.length}/${myClosed.length}`} />
        <Kpi label="At risk" value={String(myAtRisk)} hint="Health < 60" tone={myAtRisk > 0 ? "warn" : undefined} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <MyDay overdue={overdue} dueToday={dueToday} myDeals={myDeals} />

          <section className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-ink-700">My pipeline by stage</h2>
              <Link href="/pipeline" className="text-xs text-brand-600 hover:underline">Open pipeline →</Link>
            </div>
            {myByStage.every((s) => s.count === 0) ? (
              <p className="text-sm text-ink-400">You don&apos;t own any open deals.</p>
            ) : (
              <div className="space-y-2">
                {myByStage.map((s) => {
                  const max = Math.max(1, ...myByStage.map((x) => x.value));
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
            )}
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-semibold text-ink-700 mb-4">My recent activity</h2>
            {myActivities.length === 0 ? (
              <p className="text-sm text-ink-400">No activity in the last few days. Time to log something.</p>
            ) : (
              <ul className="divide-y divide-ink-100">
                {myActivities.map((a) => (
                  <li key={a.id} className="py-2.5 flex items-start gap-3 text-sm">
                    <ActivityIcon t={a.type} />
                    <div className="flex-1 min-w-0">
                      <div className="text-ink-900 truncate">{a.subject ?? labelFor(a.type)}</div>
                      {a.body && <div className="text-ink-500 text-xs truncate">{a.body}</div>}
                    </div>
                    <div className="text-xs text-ink-400 whitespace-nowrap">{relative(a.occurred_at)}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <NextActions baseUrl={baseUrl} ownerId={meId} />
          <CrossInsights ownerId={meId} />
          <QuotaWidget quotas={myQuotas} users={users} deals={myDeals} />

          <section className="card p-5">
            <h2 className="text-sm font-semibold text-ink-700 mb-3">My at-risk deals</h2>
            {myOpen.filter((d) => (d.health_score ?? 100) < 60).length === 0 ? (
              <p className="text-sm text-ink-400">Nothing flagged. Your coach is happy.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {myOpen
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
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function MyDay({ overdue, dueToday, myDeals }: { overdue: Task[]; dueToday: Task[]; myDeals: Deal[] }) {
  const dealById = new Map(myDeals.map((d) => [d.id, d] as const));
  const items = [...overdue, ...dueToday].slice(0, 6);

  return (
    <section className="card p-5 border-l-4 border-l-amber-400">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-ink-700">Today</h2>
        <Link href="/tasks" className="text-xs text-brand-600 hover:underline">All tasks →</Link>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-ink-400">No tasks for today. Add one from /tasks, or just keep moving — your coach will tell you if it spots something to do.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((t) => {
            const isOverdue = t.due_at ? new Date(t.due_at).getTime() < Date.now() : false;
            const deal = t.deal_id ? dealById.get(t.deal_id) : null;
            return (
              <li key={t.id} className="flex items-center gap-3 text-sm">
                <span className={`w-1.5 h-1.5 rounded-full ${t.priority === "high" ? "bg-rose-500" : t.priority === "low" ? "bg-ink-300" : "bg-amber-500"}`} />
                <span className="flex-1 truncate">{t.title}</span>
                {deal && (
                  <Link href={`/deals/${deal.id}`} className="text-xs text-brand-600 hover:underline truncate max-w-[180px]">
                    {deal.name}
                  </Link>
                )}
                <span className={`text-xs whitespace-nowrap ${isOverdue ? "text-rose-600" : "text-ink-500"}`}>
                  {t.due_at ? relative(t.due_at) : "—"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Kpi({
  label,
  value,
  hint,
  tone,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "warn";
  href?: string;
}) {
  const inner = (
    <div className="card p-4 h-full">
      <div className="text-xs text-ink-500">{label}</div>
      <div className={`text-xl font-semibold mt-1 ${tone === "warn" ? "text-amber-600" : ""}`}>{value}</div>
      {hint && <div className="text-[11px] text-ink-400 mt-0.5">{hint}</div>}
    </div>
  );
  return href ? (
    <Link href={href} className="block hover:opacity-90 transition-opacity">
      {inner}
    </Link>
  ) : (
    inner
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
