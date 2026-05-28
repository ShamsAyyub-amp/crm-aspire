import type { Deal, Quota, User } from "@/lib/types";
import { money, moneyCompact } from "@/lib/format";

export default function QuotaWidget({
  quotas,
  users,
  deals,
}: {
  quotas: Quota[];
  users: User[];
  deals: Deal[];
}) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStartIso = monthStart.toISOString().slice(0, 10);
  const monthQuotas = quotas.filter((q) => q.month_start.slice(0, 10) === monthStartIso);

  if (monthQuotas.length === 0) {
    return (
      <section className="card p-5">
        <h2 className="text-sm font-semibold text-ink-700">Quota progress</h2>
        <p className="text-sm text-ink-400 mt-2">No quotas set for this month.</p>
      </section>
    );
  }

  const rows = monthQuotas.map((q) => {
    const u = users.find((x) => x.id === q.user_id);
    const wonThisMonth = deals
      .filter((d) => d.owner_id === q.user_id && d.status === "won" && d.closed_at && new Date(d.closed_at) >= monthStart)
      .reduce((a, b) => a + b.value_cents, 0);
    const pct = Math.round((wonThisMonth / q.target_cents) * 100);
    return { user: u, target: q.target_cents, won: wonThisMonth, pct };
  }).sort((a, b) => b.pct - a.pct);

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-ink-700">Quota progress · this month</h2>
        <span className="text-[10px] text-ink-400">{monthStart.toLocaleDateString(undefined, { month: "long" })}</span>
      </div>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.user?.id} className="text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{r.user?.name ?? "—"}</span>
              <span className="tabular-nums text-ink-700">
                {moneyCompact(r.won)} <span className="text-ink-400">/ {moneyCompact(r.target)}</span>
              </span>
            </div>
            <div className="h-1.5 bg-ink-100 rounded mt-1 overflow-hidden">
              <div
                className={`h-full ${r.pct >= 100 ? "bg-emerald-500" : r.pct >= 60 ? "bg-brand-500" : "bg-amber-500"}`}
                style={{ width: `${Math.min(100, r.pct)}%` }}
              />
            </div>
            <div className="text-[11px] text-ink-500 mt-0.5">{r.pct}% of target</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
