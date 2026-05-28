"use client";

import Link from "next/link";
import { useTransition } from "react";
import { completeTask, uncompleteTask } from "@/app/actions";
import { relative } from "@/lib/format";
import type { Task } from "@/lib/types";

export default function TaskRow({ task, dealName }: { task: Task; dealName: string | null }) {
  const [pending, start] = useTransition();
  const done = !!task.completed_at;
  const overdue = !done && task.due_at && new Date(task.due_at).getTime() < Date.now();

  return (
    <li className="flex items-center gap-3 py-2.5">
      <button
        className={`w-4 h-4 rounded border ${done ? "bg-brand-600 border-brand-600" : "border-ink-300 hover:border-brand-500"} shrink-0`}
        disabled={pending}
        onClick={() => start(() => (done ? uncompleteTask(task.id) : completeTask(task.id)))}
        aria-label={done ? "Mark incomplete" : "Mark complete"}
      >
        {done && (
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 12 10 18 20 6" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-sm ${done ? "line-through text-ink-400" : "text-ink-900"} truncate`}>
          {task.title}
        </div>
        <div className="text-xs text-ink-500 flex items-center gap-2">
          {task.priority === "high" && <span className="chip bg-rose-50 text-rose-700">High</span>}
          {task.priority === "low" && <span className="chip bg-ink-100 text-ink-600">Low</span>}
          {dealName && task.deal_id && (
            <Link href={`/deals/${task.deal_id}`} className="text-brand-600 hover:underline truncate">
              {dealName}
            </Link>
          )}
        </div>
      </div>
      <div className={`text-xs whitespace-nowrap ${overdue ? "text-rose-600" : "text-ink-500"}`}>
        {task.due_at ? relative(task.due_at) : "—"}
      </div>
    </li>
  );
}
