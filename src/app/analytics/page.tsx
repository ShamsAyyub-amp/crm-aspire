import { supabaseAdmin } from "@/lib/supabase";
import { listUsers } from "@/lib/user";
import { money, moneyCompact } from "@/lib/format";
import { OPEN_STAGES, STAGES } from "@/lib/types";
import type { Deal, User } from "@/lib/types";
import { Donut, Funnel, ForecastCone, HBar } from "@/components/charts";

export const dynamic = "force-dynamic";

export default async function Analytics() {
  const db = supabaseAdmin();
  const [dealsR, users] = await Promise.all([db.from("deals").select("*"), listUsers()]);
  const deals = (dealsR.data as Deal[]) ?? [];

  // Funnel: count + value by stage, in canonical order.
  const stageOrder = ["lead", "qualified", "demo", "proposal", "negotiation", "closed_won"] as const;
  const funnelRows = stageOrder
    .map((s) => {
      // Count includes both currently-at-stage AND deals that progressed past it (since closed_won implies the deal passed all previous stages).
      const passed = deals.filter((d) => {
        const idx = stageOrder.indexOf(d.stage as any);
        const cur = stageOrder.indexOf(s);
        if (d.stage === "closed_lost") {
          // include in count only if the deal reached at least this stage (we don't track stage history, so approximate from probability)
          return d.probability >= STAGES.find((x) => x.id === s)!.probability;
        }
        return idx >= cur;
      });
      return {
        label: STAGES.find((x) => x.id === s)!.label,
        count: passed.length,
        value: passed.reduce((a, b) => a + b.value_cents, 0),
      };
    });

  // Win rate by owner.
  const winByOwner = users
    .map((u) => {
      const own = deals.filter((d) => d.owner_id === u.id && (d.status === "won" || d.status === "lost"));
      const won = own.filter((d) => d.status === "won");
      const rate = own.length ? Math.round((won.length / own.length) * 100) : 0;
      return { label: u.name, value: rate, sub: `(${won.length}/${own.length})` };
    })
    .filter((r) => /\(\d+\/[1-9]\d*\)/.test(r.sub))
    .sort((a, b) => b.value - a.value);

  // Win rate by source.
  const sourceMap = new Map<string, { total: number; won: number; value: number }>();
  for (const d of deals) {
    if (!d.source) continue;
    if (d.status !== "won" && d.status !== "lost") continue;
    const cur = sourceMap.get(d.source) ?? { total: 0, won: 0, value: 0 };
    cur.total += 1;
    if (d.status === "won") {
      cur.won += 1;
      cur.value += d.value_cents;
    }
    sourceMap.set(d.source, cur);
  }
  const winBySource = Array.from(sourceMap.entries())
    .map(([k, v]) => ({ label: k, value: Math.round((v.won / v.total) * 100), sub: `(${v.won}/${v.total})` }))
    .sort((a, b) => b.value - a.value);

  // Velocity per stage (avg days currently spent at this stage, for open deals).
  const now = Date.now();
  const velocityRows = STAGES.filter((s) => OPEN_STAGES.includes(s.id)).map((s) => {
    const inStage = deals.filter((d) => d.stage === s.id);
    if (inStage.length === 0) return { label: s.label, value: 0, sub: "no deals" };
    const ages = inStage.map((d) => {
      const ref = d.stage_entered_at ?? d.updated_at;
      return (now - new Date(ref).getTime()) / 86400000;
    });
    const avg = ages.reduce((a, b) => a + b, 0) / ages.length;
    return { label: s.label, value: Math.round(avg), sub: "days" };
  });

  // Lost reasons.
  const reasonMap = new Map<string, number>();
  for (const d of deals) {
    if (d.status !== "lost") continue;
    const r = d.won_lost_reason ?? "Unknown";
    reasonMap.set(r, (reasonMap.get(r) ?? 0) + 1);
  }
  const lostReasons = Array.from(reasonMap.entries())
    .map(([label, value], i) => ({ label, value, color: PALETTE[i % PALETTE.length] }))
    .sort((a, b) => b.value - a.value);

  // Forecast cone — 8 weeks out. commit = high-probability open, best = include proposal+, pipeline = all open.
  const forecast: { week: string; commit: number; best: number; pipeline: number }[] = [];
  for (let w = 0; w < 8; w++) {
    const weekEnd = new Date(now + w * 7 * 86400000);
    const closing = deals.filter((d) => {
      if (!OPEN_STAGES.includes(d.stage)) return false;
      if (!d.expected_close_date) return false;
      return new Date(d.expected_close_date) <= weekEnd;
    });
    const commit = closing.filter((d) => d.probability >= 80).reduce((a, b) => a + b.value_cents, 0) / 100;
    const best = closing.filter((d) => d.probability >= 40).reduce((a, b) => a + b.value_cents, 0) / 100;
    const pipeline = closing.reduce((a, b) => a + b.value_cents, 0) / 100;
    const label = w === 0 ? "now" : w === 1 ? "+1w" : `+${w}w`;
    forecast.push({ week: label, commit, best, pipeline });
  }

  // Avg sales cycle on won deals.
  const wonClosed = deals.filter((d) => d.status === "won" && d.closed_at);
  const cycles = wonClosed
    .map((d) => (new Date(d.closed_at!).getTime() - new Date(d.created_at).getTime()) / 86400000)
    .filter((n) => Number.isFinite(n) && n >= 0);
  const avgCycle = cycles.length ? Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length) : 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="eyebrow mb-1.5">The Manager Desk</div>
        <h1 className="display-headline text-ink-900 text-4xl">Team analytics</h1>
        <p className="text-sm text-ink-500">Manager view — where the team is winning, where it's leaking, what's coming next.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Deals in motion" value={String(deals.filter((d) => OPEN_STAGES.includes(d.stage)).length)} />
        <Kpi label="Avg sales cycle" value={`${avgCycle}d`} hint="created → closed_won" />
        <Kpi label="Pipeline coverage" value={`${pipelineCoverage(deals)}x`} hint="open / 30d won" />
        <Kpi label="Lost-reason coverage" value={`${lostCoverage(deals)}%`} hint="captured on close" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Conversion funnel" hint="Stage-to-stage progression based on current pipeline + closed history.">
          <Funnel rows={funnelRows} />
        </Section>

        <Section title="Forecast (8 weeks)" hint="Commit (≥80% prob), Best case (≥40%), Pipeline (all open) closing by week.">
          <ForecastCone points={forecast} />
          <div className="flex gap-4 mt-2 text-xs text-ink-500">
            <Legend color="#1857f0" label="Commit" />
            <Legend color="#2f74ff" label="Best" dashed />
            <Legend color="#8dbcff" label="Pipeline" />
          </div>
        </Section>

        <Section title="Win rate by owner" hint="Closed deals only.">
          {winByOwner.length === 0 ? <p className="text-sm text-ink-400">No closed deals yet.</p> : <HBar rows={winByOwner} unit="%" max={100} />}
        </Section>

        <Section title="Win rate by source" hint="Closed deals only.">
          {winBySource.length === 0 ? <p className="text-sm text-ink-400">No closed deals yet.</p> : <HBar rows={winBySource} unit="%" max={100} />}
        </Section>

        <Section title="Velocity (avg days in stage)" hint="Open deals only. Lower is better.">
          <HBar rows={velocityRows} unit="d" />
        </Section>

        <Section title="Lost reasons" hint="Why deals didn't close. Capture more reasons to make this useful.">
          {lostReasons.length === 0 ? <p className="text-sm text-ink-400">No lost deals with a reason yet.</p> : <Donut segments={lostReasons} />}
        </Section>
      </div>
    </div>
  );
}

const PALETTE = ["#1857f0", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

function pipelineCoverage(deals: Deal[]): string {
  const open = deals.filter((d) => OPEN_STAGES.includes(d.stage)).reduce((a, b) => a + b.value_cents, 0);
  const won30 = deals
    .filter((d) => d.status === "won" && d.closed_at && Date.now() - new Date(d.closed_at).getTime() < 30 * 86400000)
    .reduce((a, b) => a + b.value_cents, 0);
  if (won30 === 0) return "—";
  return (open / won30).toFixed(1);
}

function lostCoverage(deals: Deal[]) {
  const lost = deals.filter((d) => d.status === "lost");
  if (lost.length === 0) return 0;
  return Math.round((lost.filter((d) => d.won_lost_reason).length / lost.length) * 100);
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-ink-500">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
      {hint && <div className="text-[11px] text-ink-400 mt-0.5">{hint}</div>}
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="text-sm font-semibold text-ink-700">{title}</h2>
      {hint && <p className="text-xs text-ink-500 mt-0.5">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block w-4 h-0.5`} style={{ background: dashed ? "transparent" : color, borderTop: dashed ? `1.5px dashed ${color}` : undefined }} />
      {label}
    </span>
  );
}
