"use client";

import Link from "next/link";
import { useTransition } from "react";
import { moveDealStage } from "@/app/actions";
import { money, moneyCompact } from "@/lib/format";
import type { Company, Contact, Deal, DealStage, User } from "@/lib/types";

type Stage = { id: DealStage; label: string; probability: number };

export default function PipelineBoard({
  deals,
  companies,
  contacts,
  users,
  stages,
}: {
  deals: Deal[];
  companies: Company[];
  contacts: Contact[];
  users: User[];
  stages: Stage[];
}) {
  const cs = new Map(companies.map((c) => [c.id, c] as const));
  const us = new Map(users.map((u) => [u.id, u] as const));

  const byStage: Record<DealStage, Deal[]> = Object.fromEntries(stages.map((s) => [s.id, [] as Deal[]])) as any;
  for (const d of deals) {
    if (byStage[d.stage]) byStage[d.stage].push(d);
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
      {stages.map((s) => {
        const items = byStage[s.id] ?? [];
        const total = items.reduce((a, b) => a + b.value_cents, 0);
        return (
          <div key={s.id} className="rounded-lg bg-ink-100/60 p-2.5 min-h-[200px]">
            <div className="flex items-center justify-between px-1 mb-2">
              <div>
                <div className="text-xs font-semibold text-ink-700">{s.label}</div>
                <div className="text-[10px] text-ink-500">{items.length} · {moneyCompact(total)}</div>
              </div>
              <div className="text-[10px] text-ink-400">{s.probability}%</div>
            </div>
            <div className="space-y-2">
              {items.map((d) => (
                <Card key={d.id} deal={d} company={cs.get(d.company_id ?? "") ?? null} owner={us.get(d.owner_id ?? "") ?? null} stages={stages} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Card({
  deal,
  company,
  owner,
  stages,
}: {
  deal: Deal;
  company: Company | null;
  owner: User | null;
  stages: Stage[];
}) {
  const [pending, start] = useTransition();
  const score = deal.health_score;
  const tone = score == null ? "bg-ink-200" : score >= 75 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-rose-500";

  return (
    <div className="bg-white border border-ink-100 rounded-md p-2.5 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
      <div className="flex items-start gap-2">
        <span className={`w-2 h-2 mt-1 rounded-full ${tone}`} title={score != null ? `Health ${score}` : "No health score yet"} />
        <div className="flex-1 min-w-0">
          <Link href={`/deals/${deal.id}`} className="text-sm font-medium hover:underline truncate block">
            {deal.name}
          </Link>
          <div className="text-[11px] text-ink-500 truncate">{company?.name ?? "—"}</div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs tabular-nums">{money(deal.value_cents, deal.currency)}</span>
        <span className="text-[10px] text-ink-500">{owner?.name?.split(" ")[0] ?? "—"}</span>
      </div>
      <div className="mt-2">
        <select
          className="w-full text-[11px] border border-ink-200 rounded px-1 py-0.5 bg-white"
          value={deal.stage}
          disabled={pending}
          onChange={(e) => start(() => moveDealStage(deal.id, e.target.value as DealStage))}
        >
          {stages.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
          <option value="closed_won">Closed Won</option>
          <option value="closed_lost">Closed Lost</option>
        </select>
      </div>
    </div>
  );
}
