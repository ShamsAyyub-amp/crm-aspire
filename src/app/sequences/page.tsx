import { supabaseAdmin } from "@/lib/supabase";
import { listUsers } from "@/lib/user";
import { relative } from "@/lib/format";
import type { Contact, Deal, Sequence, SequenceEnrollment, User } from "@/lib/types";
import EnrollmentRow from "@/components/enrollment-row";

export const dynamic = "force-dynamic";

export default async function SequencesPage() {
  const db = supabaseAdmin();
  const [seqR, enrR, contactsR, dealsR, users] = await Promise.all([
    db.from("sequences").select("*").order("created_at", { ascending: false }),
    db.from("sequence_enrollments").select("*").order("enrolled_at", { ascending: false }).limit(40),
    db.from("contacts").select("*"),
    db.from("deals").select("*"),
    listUsers(),
  ]);
  const seqs = (seqR.data as Sequence[]) ?? [];
  const enrollments = (enrR.data as SequenceEnrollment[]) ?? [];
  const contacts = new Map(((contactsR.data as Contact[]) ?? []).map((c) => [c.id, c] as const));
  const deals = new Map(((dealsR.data as Deal[]) ?? []).map((d) => [d.id, d] as const));
  const userMap = new Map(users.map((u) => [u.id, u] as const));

  const active = enrollments.filter((e) => e.status === "active");
  const paused = enrollments.filter((e) => e.status === "paused");
  const completed = enrollments.filter((e) => e.status === "completed");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sequences</h1>
        <p className="text-sm text-ink-500">
          Multi-step outreach. Replies auto-pause the sequence so reps don't spam after a hand-raise.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Templates" value={String(seqs.length)} />
        <Kpi label="Active enrollments" value={String(active.length)} />
        <Kpi label="Paused (replied / manual)" value={String(paused.length)} />
        <Kpi label="Completed" value={String(completed.length)} />
      </div>

      <section className="card p-5">
        <h2 className="text-sm font-semibold text-ink-700 mb-3">Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {seqs.map((s) => {
            const owner = s.owner_id ? userMap.get(s.owner_id) : null;
            return (
              <div key={s.id} className="border border-ink-100 rounded-md p-3 bg-white">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-sm">{s.name}</div>
                    <div className="text-[11px] text-ink-500 mt-0.5">
                      {s.steps.length} steps · owner {owner?.name?.split(" ")[0] ?? "—"}
                    </div>
                  </div>
                  <span
                    className={`chip ${
                      s.active ? "bg-emerald-50 text-emerald-700" : "bg-ink-100 text-ink-600"
                    }`}
                  >
                    {s.active ? "Active" : "Off"}
                  </span>
                </div>
                {s.description && <p className="text-xs text-ink-600 mt-2">{s.description}</p>}
                <ol className="mt-3 space-y-1 text-xs">
                  {s.steps.map((st, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-ink-400 w-10 shrink-0">Day {st.day_offset}</span>
                      <span className="text-ink-700 truncate">{st.subject}</span>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-semibold text-ink-700 mb-3">Recent enrollments</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-ink-500">
              <tr>
                <Th>Contact</Th>
                <Th>Sequence</Th>
                <Th>Deal</Th>
                <Th>Step</Th>
                <Th>Status</Th>
                <Th>Last / Next</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {enrollments.map((e) => {
                const seq = seqs.find((s) => s.id === e.sequence_id);
                const c = contacts.get(e.contact_id);
                const d = e.deal_id ? deals.get(e.deal_id) : null;
                return (
                  <EnrollmentRow
                    key={e.id}
                    enrollment={e}
                    sequence={seq ?? null}
                    contactLabel={c ? `${c.first_name} ${c.last_name}` : "—"}
                    dealLabel={d?.name ?? null}
                    dealId={d?.id ?? null}
                  />
                );
              })}
              {enrollments.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-ink-400 text-sm">
                    No enrollments yet. Open a deal and enroll the primary contact.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-ink-500">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left font-medium px-3 py-2 text-xs uppercase tracking-wider">{children}</th>;
}
