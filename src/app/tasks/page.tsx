import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUserId, listUsers } from "@/lib/user";
import { relative } from "@/lib/format";
import type { Deal, Task, User } from "@/lib/types";
import TaskRow from "@/components/task-row";
import NewTaskForm from "@/components/new-task-form";
import { OPEN_STAGES } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const db = supabaseAdmin();
  const meId = await getCurrentUserId();
  const [tasksR, dealsR, users] = await Promise.all([
    db.from("tasks").select("*").order("due_at", { ascending: true, nullsFirst: false }),
    db.from("deals").select("id,name,company_id"),
    listUsers(),
  ]);
  const tasks = (tasksR.data as Task[]) ?? [];
  const deals = new Map(((dealsR.data as Deal[]) ?? []).map((d) => [d.id, d] as const));
  const userMap = new Map(users.map((u) => [u.id, u] as const));

  const mine = tasks.filter((t) => t.owner_id === meId);
  const now = Date.now();
  const overdue = mine.filter((t) => !t.completed_at && t.due_at && new Date(t.due_at).getTime() < now);
  const todayCutoff = new Date();
  todayCutoff.setHours(23, 59, 59, 999);
  const dueToday = mine.filter((t) => !t.completed_at && t.due_at && new Date(t.due_at) <= todayCutoff && new Date(t.due_at).getTime() >= now);
  const upcoming = mine.filter((t) => !t.completed_at && t.due_at && new Date(t.due_at) > todayCutoff);
  const noDate = mine.filter((t) => !t.completed_at && !t.due_at);
  const done = mine.filter((t) => t.completed_at).slice(0, 10);

  const openDeals = ((dealsR.data as Deal[]) ?? []).filter((d) => OPEN_STAGES.includes(d.stage)).map((d) => ({ id: d.id, name: d.name }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="text-sm text-ink-500">Your queue, sorted by what's at risk of slipping.</p>
      </div>

      <NewTaskForm deals={openDeals} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Overdue" value={String(overdue.length)} tone={overdue.length > 0 ? "rose" : undefined} />
        <Kpi label="Due today" value={String(dueToday.length)} tone={dueToday.length > 0 ? "amber" : undefined} />
        <Kpi label="Upcoming" value={String(upcoming.length)} />
        <Kpi label="Completed (recent)" value={String(done.length)} />
      </div>

      <Section title={`Overdue (${overdue.length})`}>{taskList(overdue, deals, userMap)}</Section>
      <Section title={`Due today (${dueToday.length})`}>{taskList(dueToday, deals, userMap)}</Section>
      <Section title={`Upcoming (${upcoming.length})`}>{taskList(upcoming, deals, userMap)}</Section>
      {noDate.length > 0 && <Section title={`No due date (${noDate.length})`}>{taskList(noDate, deals, userMap)}</Section>}
      <Section title="Recently completed">{taskList(done, deals, userMap)}</Section>
    </div>
  );
}

function taskList(tasks: Task[], deals: Map<string, Deal>, users: Map<string, User>) {
  if (tasks.length === 0) return <p className="text-sm text-ink-400 px-1">Nothing here.</p>;
  return (
    <ul className="divide-y divide-ink-100">
      {tasks.map((t) => (
        <TaskRow
          key={t.id}
          task={t}
          dealName={t.deal_id ? deals.get(t.deal_id)?.name ?? null : null}
        />
      ))}
    </ul>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-2">{title}</h2>
      {children}
    </section>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "rose" | "amber" }) {
  const cls = tone === "rose" ? "text-rose-600" : tone === "amber" ? "text-amber-600" : "";
  return (
    <div className="card p-4">
      <div className="text-xs text-ink-500">{label}</div>
      <div className={`text-xl font-semibold mt-1 ${cls}`}>{value}</div>
    </div>
  );
}
