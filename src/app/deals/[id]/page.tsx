import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import { listUsers } from "@/lib/user";
import { money, relative } from "@/lib/format";
import { STAGES } from "@/lib/types";
import type { Activity, Company, Contact, Deal, User } from "@/lib/types";
import DealAiPanel from "@/components/deal-ai-panel";
import ActivityComposer from "@/components/activity-composer";

export const dynamic = "force-dynamic";

export default async function DealDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();

  const [dealR, actsR, users] = await Promise.all([
    db.from("deals").select("*").eq("id", id).single(),
    db.from("activities").select("*").eq("deal_id", id).order("occurred_at", { ascending: false }),
    listUsers(),
  ]);
  if (!dealR.data) notFound();
  const deal = dealR.data as Deal;
  const activities = (actsR.data as Activity[]) ?? [];

  const [companyR, contactR] = await Promise.all([
    deal.company_id ? db.from("companies").select("*").eq("id", deal.company_id).single() : Promise.resolve({ data: null }),
    deal.primary_contact_id ? db.from("contacts").select("*").eq("id", deal.primary_contact_id).single() : Promise.resolve({ data: null }),
  ]);
  const company = companyR.data as Company | null;
  const contact = contactR.data as Contact | null;
  const owner = users.find((u) => u.id === deal.owner_id) ?? null;

  const stageLabel = STAGES.find((s) => s.id === deal.stage)?.label ?? deal.stage;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/pipeline" className="text-xs text-brand-600 hover:underline">← Pipeline</Link>
          <h1 className="text-2xl font-semibold tracking-tight mt-1">{deal.name}</h1>
          <div className="text-sm text-ink-500 mt-0.5">
            {company?.name ?? "—"} · {owner?.name ?? "Unassigned"}
          </div>
        </div>
        <div className="flex gap-2">
          <Pill>{stageLabel}</Pill>
          <Pill tone="brand">{money(deal.value_cents, deal.currency)}</Pill>
          <Pill tone="ink">Prob {deal.probability}%</Pill>
          {deal.expected_close_date && <Pill tone="ink">Close {new Date(deal.expected_close_date).toLocaleDateString()}</Pill>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <ActivityComposer dealId={deal.id} contactId={contact?.id ?? null} contactEmail={contact?.email ?? null} />

          <section className="card p-5">
            <h2 className="text-sm font-semibold text-ink-700 mb-3">Activity</h2>
            {activities.length === 0 ? (
              <p className="text-sm text-ink-400">No activity yet.</p>
            ) : (
              <ol className="space-y-3">
                {activities.map((a) => (
                  <li key={a.id} className="flex items-start gap-3">
                    <span className="mt-1 text-[11px] text-ink-400 w-16 shrink-0">{relative(a.occurred_at)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">
                        <span className="chip bg-ink-100 text-ink-700 mr-2">{a.type.replace("_", " ")}</span>
                        {a.subject ?? <em className="text-ink-400">no subject</em>}
                        {a.meta && (a.meta as any).mocked && (
                          <span className="chip bg-amber-100 text-amber-800 ml-2">mocked send</span>
                        )}
                      </div>
                      {a.body && <div className="text-sm text-ink-600 mt-1 whitespace-pre-wrap">{a.body}</div>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <DealAiPanel deal={deal} contactEmail={contact?.email ?? null} />

          <section className="card p-5 text-sm space-y-2">
            <h2 className="text-sm font-semibold text-ink-700">Details</h2>
            <Row k="Company" v={company?.name ?? "—"} />
            <Row k="Contact" v={contact ? `${contact.first_name} ${contact.last_name}` : "—"} />
            <Row k="Email" v={contact?.email ?? "—"} />
            <Row k="Title" v={contact?.title ?? "—"} />
            <Row k="Industry" v={company?.industry ?? "—"} />
            <Row k="Employees" v={company?.employees?.toLocaleString() ?? "—"} />
            <Row k="Source" v={deal.source ?? "—"} />
            <Row k="Owner" v={owner?.name ?? "—"} />
          </section>
        </div>
      </div>
    </div>
  );
}

function Pill({ children, tone }: { children: React.ReactNode; tone?: "brand" | "ink" }) {
  const cls = tone === "brand" ? "bg-brand-50 text-brand-700" : tone === "ink" ? "bg-ink-100 text-ink-700" : "bg-ink-100 text-ink-700";
  return <span className={`chip ${cls}`}>{children}</span>;
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-ink-500">{k}</span>
      <span className="text-ink-900 text-right">{v}</span>
    </div>
  );
}
