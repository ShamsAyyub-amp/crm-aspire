"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { moveDealStage } from "@/app/actions";
import { money, moneyCompact } from "@/lib/format";
import type { Company, Contact, Deal, DealStage, User } from "@/lib/types";

type Stage = { id: DealStage; label: string; probability: number };

const STAGE_AGING_THRESHOLD_DAYS: Record<DealStage, number> = {
  lead: 14,
  qualified: 14,
  demo: 10,
  proposal: 10,
  negotiation: 7,
  closed_won: 999,
  closed_lost: 999,
};

const ALL_STAGE_OPTIONS: Stage[] = [
  { id: "lead", label: "Lead", probability: 10 },
  { id: "qualified", label: "Qualified", probability: 25 },
  { id: "demo", label: "Demo", probability: 40 },
  { id: "proposal", label: "Proposal", probability: 60 },
  { id: "negotiation", label: "Negotiation", probability: 80 },
  { id: "closed_won", label: "Closed Won", probability: 100 },
  { id: "closed_lost", label: "Closed Lost", probability: 0 },
];

export default function PipelineBoard({
  deals: initialDeals,
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
  // Maintain local optimistic state so DnD feels instant even on slow networks.
  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [closingDeal, setClosingDeal] = useState<{ deal: Deal; nextStage: DealStage } | null>(null);
  const [pending, start] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const cs = useMemo(() => new Map(companies.map((c) => [c.id, c] as const)), [companies]);
  const us = useMemo(() => new Map(users.map((u) => [u.id, u] as const)), [users]);

  const byStage: Record<DealStage, Deal[]> = useMemo(() => {
    const acc = Object.fromEntries(stages.map((s) => [s.id, [] as Deal[]])) as Record<DealStage, Deal[]>;
    for (const d of deals) if (acc[d.stage]) acc[d.stage].push(d);
    return acc;
  }, [deals, stages]);

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const dealId = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) return;
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage === overId) return;

    const target = overId as DealStage;
    // For closed_won/closed_lost, open the reason modal instead of committing immediately.
    if (target === "closed_won" || target === "closed_lost") {
      setClosingDeal({ deal, nextStage: target });
      return;
    }
    applyMove(deal, target, null);
  }

  function applyMove(deal: Deal, target: DealStage, reason: string | null) {
    setDeals((arr) => arr.map((d) => (d.id === deal.id ? { ...d, stage: target } : d)));
    start(async () => {
      const owner = us.get(deal.owner_id ?? "");
      await moveDealStage(deal.id, target, reason);
      if (target === "closed_won" && typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("crm:deal-won", {
            detail: { dealName: deal.name, value: money(deal.value_cents, deal.currency), owner: owner?.name },
          })
        );
      }
      // Remove from board when closed (board only shows open stages).
      if (target === "closed_won" || target === "closed_lost") {
        setDeals((arr) => arr.filter((d) => d.id !== deal.id));
      }
    });
  }

  const active = activeId ? deals.find((d) => d.id === activeId) ?? null : null;

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {stages.map((s) => {
            const items = byStage[s.id] ?? [];
            const total = items.reduce((a, b) => a + b.value_cents, 0);
            return (
              <Column key={s.id} stage={s} count={items.length} total={total}>
                {items.map((d) => (
                  <DraggableCard
                    key={d.id}
                    deal={d}
                    company={cs.get(d.company_id ?? "") ?? null}
                    owner={us.get(d.owner_id ?? "") ?? null}
                  />
                ))}
                {/* Hidden drop affordances for closing on the board edges. */}
                <CloseDrop kind="closed_won" />
                <CloseDrop kind="closed_lost" />
              </Column>
            );
          })}
        </div>

        <DragOverlay>
          {active ? (
            <DealCardBody
              deal={active}
              company={cs.get(active.company_id ?? "") ?? null}
              owner={us.get(active.owner_id ?? "") ?? null}
              dragging
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <div className="mt-6 flex items-center gap-2">
        <span className="text-xs text-ink-500">Close a deal:</span>
        <CloseDropZone kind="closed_won" label="Drop here to mark Won" />
        <CloseDropZone kind="closed_lost" label="Drop here to mark Lost" />
      </div>

      {closingDeal && (
        <CloseReasonModal
          deal={closingDeal.deal}
          nextStage={closingDeal.nextStage}
          onCancel={() => setClosingDeal(null)}
          onConfirm={(reason) => {
            applyMove(closingDeal.deal, closingDeal.nextStage, reason);
            setClosingDeal(null);
          }}
        />
      )}
    </>
  );
}

function Column({
  stage,
  count,
  total,
  children,
}: {
  stage: Stage;
  count: number;
  total: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg p-2.5 min-h-[240px] transition-colors ${
        isOver ? "bg-brand-50 ring-1 ring-brand-300" : "bg-ink-100/60"
      }`}
    >
      <div className="flex items-center justify-between px-1 mb-2">
        <div>
          <div className="text-xs font-semibold text-ink-700">{stage.label}</div>
          <div className="text-[10px] text-ink-500">
            {count} · {moneyCompact(total)}
          </div>
        </div>
        <div className="text-[10px] text-ink-400">{stage.probability}%</div>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DraggableCard({
  deal,
  company,
  owner,
}: {
  deal: Deal;
  company: Company | null;
  owner: User | null;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: deal.id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} style={{ opacity: isDragging ? 0.3 : 1 }}>
      <DealCardBody deal={deal} company={company} owner={owner} />
    </div>
  );
}

function DealCardBody({
  deal,
  company,
  owner,
  dragging,
}: {
  deal: Deal;
  company: Company | null;
  owner: User | null;
  dragging?: boolean;
}) {
  const score = deal.health_score;
  const tone = score == null ? "bg-ink-200" : score >= 75 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-rose-500";

  // Aging: days since stage_entered_at.
  const ref = deal.stage_entered_at ?? deal.updated_at;
  const daysInStage = Math.round((Date.now() - new Date(ref).getTime()) / 86400000);
  const threshold = STAGE_AGING_THRESHOLD_DAYS[deal.stage];
  const stale = daysInStage >= threshold;
  const veryStale = daysInStage >= threshold + 7;

  return (
    <div
      className={`bg-white border rounded-md p-2.5 select-none ${
        dragging ? "shadow-xl rotate-2 border-brand-300" : "border-ink-100 shadow-[0_1px_0_rgba(0,0,0,0.02)]"
      } ${veryStale ? "stuck-glow border-rose-200" : ""}`}
    >
      <div className="flex items-start gap-2">
        <span className={`w-2 h-2 mt-1 rounded-full ${tone}`} title={score != null ? `Health ${score}` : "No health score yet"} />
        <div className="flex-1 min-w-0">
          <Link href={`/deals/${deal.id}`} className="text-sm font-medium hover:underline truncate block" onClick={(e) => dragging && e.preventDefault()}>
            {deal.name}
          </Link>
          <div className="text-[11px] text-ink-500 truncate">{company?.name ?? "—"}</div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs tabular-nums">{money(deal.value_cents, deal.currency)}</span>
        <span className="text-[10px] text-ink-500">{owner?.name?.split(" ")[0] ?? "—"}</span>
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        <span
          className={`chip text-[10px] ${
            veryStale ? "bg-rose-100 text-rose-700" : stale ? "bg-amber-100 text-amber-700" : "bg-ink-100 text-ink-600"
          }`}
        >
          {daysInStage}d in stage
        </span>
        {deal.expected_close_date && (
          <span className="chip text-[10px] bg-ink-100 text-ink-600">
            close {new Date(deal.expected_close_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        )}
      </div>
    </div>
  );
}

function CloseDrop({ kind }: { kind: "closed_won" | "closed_lost" }) {
  // Invisible droppable per-column to allow dropping anywhere; the visible
  // drop zones at the bottom are the obvious target. We register a hidden zone
  // here so the close stage IDs are valid drop targets registered to dnd-kit.
  const { setNodeRef } = useDroppable({ id: kind });
  return <div ref={setNodeRef} style={{ display: "none" }} />;
}

function CloseDropZone({ kind, label }: { kind: "closed_won" | "closed_lost"; label: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: kind });
  const base = kind === "closed_won" ? "border-emerald-300 bg-emerald-50/40 text-emerald-700" : "border-rose-300 bg-rose-50/40 text-rose-700";
  const hot = kind === "closed_won" ? "bg-emerald-100" : "bg-rose-100";
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 border-2 border-dashed rounded-md px-3 py-2 text-xs font-medium ${base} ${isOver ? hot : ""}`}
    >
      {label}
    </div>
  );
}

const REASONS_LOST = ["Price — too expensive", "Went with competitor", "No budget", "No decision", "Timing — paused", "Lost champion", "Missing capability"];
const REASONS_WON = ["Best ROI", "Strong champion", "Better fit than competitor", "Compelling event", "Trial / pilot succeeded", "Existing customer expansion"];

function CloseReasonModal({
  deal,
  nextStage,
  onCancel,
  onConfirm,
}: {
  deal: Deal;
  nextStage: DealStage;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const isWon = nextStage === "closed_won";
  const options = isWon ? REASONS_WON : REASONS_LOST;
  const [picked, setPicked] = useState<string>(options[0]);
  const [custom, setCustom] = useState("");

  return (
    <div className="fixed inset-0 z-40 bg-ink-900/30 flex items-center justify-center" onClick={onCancel}>
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-5 border border-ink-100" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold">
          {isWon ? "🏆 Mark won" : "💔 Mark lost"} — {deal.name}
        </h3>
        <p className="text-xs text-ink-500 mt-1">
          Capture the reason. It drives the lost-reason donut on Analytics and feeds future deal scoring.
        </p>
        <div className="space-y-1.5 mt-4">
          {options.map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="reason" checked={picked === o} onChange={() => setPicked(o)} />
              <span>{o}</span>
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" name="reason" checked={picked === "__custom"} onChange={() => setPicked("__custom")} />
            <input
              className="input text-sm flex-1"
              placeholder="Custom reason…"
              value={custom}
              onChange={(e) => {
                setCustom(e.target.value);
                setPicked("__custom");
              }}
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button
            className="btn-primary"
            onClick={() => onConfirm(picked === "__custom" ? (custom.trim() || "Other") : picked)}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
