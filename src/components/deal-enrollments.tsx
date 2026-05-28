"use client";

import { useEffect, useState, useTransition } from "react";
import { enrollContactInSequence } from "@/app/actions";
import { relative } from "@/lib/format";

type Seq = { id: string; name: string; steps_count: number };
type Enr = {
  id: string;
  sequence_id: string;
  contact_id: string;
  status: "active" | "paused" | "completed" | "cancelled";
  current_step: number;
  paused_reason: string | null;
  last_step_at: string | null;
  next_step_at: string | null;
  sequence_name: string;
  steps_count: number;
};

export default function DealEnrollments({ dealId }: { dealId: string }) {
  const [seqs, setSeqs] = useState<Seq[]>([]);
  const [enrollments, setEnrollments] = useState<Enr[]>([]);
  const [contactId, setContactId] = useState<string | null>(null);
  const [picked, setPicked] = useState<string>("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch(`/api/deals/${dealId}/enrollments`, { cache: "no-store" });
    const j = await res.json();
    setSeqs(j.sequences ?? []);
    setEnrollments(j.enrollments ?? []);
    setContactId(j.contactId ?? null);
    if (!picked && j.sequences?.length) setPicked(j.sequences[0].id);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  function enroll() {
    if (!picked || !contactId) return;
    setMsg(null);
    start(async () => {
      const r = await enrollContactInSequence({ sequenceId: picked, contactId, dealId });
      if (!r.ok) setMsg(r.reason ?? "Could not enroll");
      else setMsg("Enrolled.");
      await refresh();
    });
  }

  return (
    <section className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-ink-700">Sequences</h2>
        <a href="/sequences" className="text-xs text-brand-600 hover:underline">Manage all →</a>
      </div>

      {enrollments.length > 0 && (
        <ul className="space-y-1.5 mb-3">
          {enrollments.map((e) => (
            <li key={e.id} className="flex items-center gap-2 text-xs">
              <span className={`w-1.5 h-1.5 rounded-full ${statusDot(e.status)}`} />
              <span className="font-medium">{e.sequence_name}</span>
              <span className="text-ink-500">
                step {Math.min(e.current_step + 1, e.steps_count)}/{e.steps_count}
              </span>
              <span className="text-ink-400">·</span>
              <span className={`text-[11px] ${e.status === "paused" ? "text-amber-700" : "text-ink-500"}`}>
                {e.status}{e.paused_reason ? ` · ${e.paused_reason}` : ""}
              </span>
              <span className="ml-auto text-[10px] text-ink-400">
                {e.next_step_at && e.status === "active" ? `next ${relative(e.next_step_at)}` : e.last_step_at ? `last ${relative(e.last_step_at)}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}

      {contactId ? (
        <div className="flex items-center gap-2">
          <select
            className="input !py-1 text-sm flex-1"
            value={picked}
            onChange={(e) => setPicked(e.target.value)}
          >
            {seqs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.steps_count} steps)
              </option>
            ))}
          </select>
          <button className="btn-primary" onClick={enroll} disabled={pending || !picked}>
            {pending ? "Enrolling…" : "Enroll"}
          </button>
        </div>
      ) : (
        <p className="text-xs text-ink-400">No primary contact set — link one to enroll in a sequence.</p>
      )}

      {msg && <p className="text-[11px] text-ink-500 mt-2">{msg}</p>}
    </section>
  );
}

function statusDot(s: string) {
  if (s === "active") return "bg-emerald-500";
  if (s === "paused") return "bg-amber-500";
  if (s === "completed") return "bg-ink-400";
  return "bg-rose-500";
}
