"use client";

import { useState, useTransition } from "react";
import { createTask } from "@/app/actions";

type DealOption = { id: string; name: string };

export default function NewTaskForm({
  deals,
  defaultDealId,
  compact,
  onCreated,
}: {
  deals?: DealOption[];
  defaultDealId?: string;
  compact?: boolean;
  onCreated?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [dueAt, setDueAt] = useState<string>(""); // datetime-local string
  const [dealId, setDealId] = useState<string>(defaultDealId ?? "");
  const [open, setOpen] = useState(!compact);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function submit() {
    if (!title.trim()) {
      setErr("Title required");
      return;
    }
    setErr(null);
    start(async () => {
      const r = await createTask({
        title,
        priority,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        dealId: dealId || null,
      });
      if (!r.ok) {
        setErr(r.reason ?? "Could not create task");
        return;
      }
      setTitle("");
      setDueAt("");
      setPriority("normal");
      if (compact) setOpen(false);
      onCreated?.();
    });
  }

  if (compact && !open) {
    return (
      <button className="btn-secondary text-xs" onClick={() => setOpen(true)}>
        + Add task
      </button>
    );
  }

  return (
    <div className={compact ? "card p-3 space-y-2" : "card p-4 space-y-2"}>
      <div className="flex items-center gap-2">
        <input
          autoFocus
          className="input text-sm flex-1"
          placeholder="What needs doing?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), submit())}
        />
        <button className="btn-primary" disabled={pending} onClick={submit}>
          {pending ? "Adding…" : "Add"}
        </button>
        {compact && (
          <button className="btn-ghost text-xs" onClick={() => setOpen(false)}>
            Cancel
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <label className="flex items-center gap-1.5">
          <span className="text-ink-500">Priority</span>
          <select
            className="input !w-auto !py-1 text-xs"
            value={priority}
            onChange={(e) => setPriority(e.target.value as any)}
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <span className="text-ink-500">Due</span>
          <input
            type="datetime-local"
            className="input !w-auto !py-1 text-xs"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />
        </label>
        {deals && deals.length > 0 && !defaultDealId && (
          <label className="flex items-center gap-1.5">
            <span className="text-ink-500">Deal</span>
            <select
              className="input !w-auto !py-1 text-xs max-w-[220px]"
              value={dealId}
              onChange={(e) => setDealId(e.target.value)}
            >
              <option value="">— none —</option>
              {deals.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {err && <span className="text-rose-600">{err}</span>}
      </div>
    </div>
  );
}
