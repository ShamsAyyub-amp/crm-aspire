"use client";

import Link from "next/link";
import { useTransition } from "react";
import { setEnrollmentStatus } from "@/app/actions";
import { relative } from "@/lib/format";
import type { Sequence, SequenceEnrollment } from "@/lib/types";

export default function EnrollmentRow({
  enrollment,
  sequence,
  contactLabel,
  dealLabel,
  dealId,
}: {
  enrollment: SequenceEnrollment;
  sequence: Sequence | null;
  contactLabel: string;
  dealLabel: string | null;
  dealId: string | null;
}) {
  const [pending, start] = useTransition();
  const totalSteps = sequence?.steps.length ?? 0;
  return (
    <tr className="hover:bg-ink-50">
      <td className="px-3 py-2">{contactLabel}</td>
      <td className="px-3 py-2">{sequence?.name ?? "—"}</td>
      <td className="px-3 py-2">
        {dealLabel && dealId ? (
          <Link href={`/deals/${dealId}`} className="text-brand-600 hover:underline">
            {dealLabel}
          </Link>
        ) : (
          "—"
        )}
      </td>
      <td className="px-3 py-2 tabular-nums text-ink-500">
        {Math.min(enrollment.current_step + 1, totalSteps || 1)} / {totalSteps || "—"}
      </td>
      <td className="px-3 py-2">
        <StatusChip enrollment={enrollment} />
      </td>
      <td className="px-3 py-2 text-xs text-ink-500">
        {enrollment.last_step_at ? `last ${relative(enrollment.last_step_at)}` : "—"}
        <br />
        {enrollment.next_step_at ? `next ${relative(enrollment.next_step_at)}` : "—"}
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          {enrollment.status === "active" && (
            <button
              className="text-[11px] px-2 py-0.5 rounded border border-ink-200 hover:bg-ink-100"
              disabled={pending}
              onClick={() => start(() => setEnrollmentStatus(enrollment.id, "paused", "manual"))}
            >
              Pause
            </button>
          )}
          {enrollment.status === "paused" && (
            <button
              className="text-[11px] px-2 py-0.5 rounded border border-ink-200 hover:bg-ink-100"
              disabled={pending}
              onClick={() => start(() => setEnrollmentStatus(enrollment.id, "active"))}
            >
              Resume
            </button>
          )}
          {(enrollment.status === "active" || enrollment.status === "paused") && (
            <button
              className="text-[11px] px-2 py-0.5 rounded border border-ink-200 hover:bg-ink-100 text-ink-700"
              disabled={pending}
              onClick={() => start(() => setEnrollmentStatus(enrollment.id, "cancelled"))}
            >
              Cancel
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function StatusChip({ enrollment }: { enrollment: SequenceEnrollment }) {
  const map = {
    active: { cls: "bg-emerald-50 text-emerald-700", label: "Active" },
    paused: { cls: "bg-amber-50 text-amber-700", label: "Paused" },
    completed: { cls: "bg-ink-100 text-ink-600", label: "Done" },
    cancelled: { cls: "bg-rose-50 text-rose-700", label: "Cancelled" },
  } as const;
  const m = map[enrollment.status];
  return (
    <span className={`chip ${m.cls}`} title={enrollment.paused_reason ?? undefined}>
      {m.label}
      {enrollment.status === "paused" && enrollment.paused_reason && (
        <span className="text-[10px] text-ink-500 ml-1.5">· {enrollment.paused_reason}</span>
      )}
    </span>
  );
}
