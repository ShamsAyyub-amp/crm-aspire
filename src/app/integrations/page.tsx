import { relative } from "@/lib/format";

export const dynamic = "force-dynamic";

type Integration = {
  id: string;
  name: string;
  category: "Email" | "Calendar" | "Chat" | "Enrichment" | "Automation";
  status: "connected" | "available";
  last_sync_at?: string;
  description: string;
  color: string;
  initials: string;
  events?: string[];
};

const ITEMS: Integration[] = [
  {
    id: "gmail",
    name: "Gmail",
    category: "Email",
    status: "connected",
    last_sync_at: new Date(Date.now() - 1000 * 60 * 7).toISOString(),
    description: "Two-way email sync. Outbound from the CRM appears in Gmail Sent; replies auto-attach to the right deal.",
    color: "#EA4335",
    initials: "G",
    events: ["1,247 messages synced", "8 deals updated today"],
  },
  {
    id: "outlook-cal",
    name: "Outlook Calendar",
    category: "Calendar",
    status: "connected",
    last_sync_at: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
    description: "Meetings auto-log as activities on the linked deal. Booking links per rep.",
    color: "#0078D4",
    initials: "O",
    events: ["18 meetings linked this week"],
  },
  {
    id: "slack",
    name: "Slack",
    category: "Chat",
    status: "connected",
    last_sync_at: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    description: "Posts to #sales-wins on closed_won. DMs the deal owner when a prospect replies after >7 days of silence.",
    color: "#4A154B",
    initials: "S",
    events: ["#sales-wins · 4 posts this week", "DM nudges: 2 today"],
  },
  {
    id: "linkedin",
    name: "LinkedIn Sales Navigator",
    category: "Enrichment",
    status: "connected",
    last_sync_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    description: "Contact + company enrichment, headcount, recent funding, recent role changes on tracked accounts.",
    color: "#0A66C2",
    initials: "in",
    events: ["12 contacts enriched today"],
  },
  {
    id: "webhooks",
    name: "Outbound Webhooks",
    category: "Automation",
    status: "connected",
    last_sync_at: new Date(Date.now() - 1000 * 60 * 11).toISOString(),
    description: "Fire on deal.stage_changed, deal.closed_won, activity.created. Three endpoints configured.",
    color: "#161A21",
    initials: "{}",
    events: ["3 endpoints active", "892 deliveries this month"],
  },
  {
    id: "stripe",
    name: "Stripe",
    category: "Automation",
    status: "available",
    description: "Pull won-deal revenue into Stripe Billing. Auto-create customer + subscription on closed_won.",
    color: "#635BFF",
    initials: "$",
  },
  {
    id: "docusign",
    name: "DocuSign",
    category: "Automation",
    status: "available",
    description: "Send contracts directly from the deal. Track envelope status as activities on the deal.",
    color: "#FFCC22",
    initials: "✎",
  },
  {
    id: "twilio",
    name: "Twilio",
    category: "Chat",
    status: "available",
    description: "Click-to-call from any contact. Call recordings → AI summary → activity log.",
    color: "#F22F46",
    initials: "📞",
  },
];

export default function IntegrationsPage() {
  const connected = ITEMS.filter((i) => i.status === "connected");
  const available = ITEMS.filter((i) => i.status === "available");

  return (
    <div className="space-y-6">
      <div>
        <div className="eyebrow mb-1.5">The Wire</div>
        <h1 className="display-headline text-ink-900 text-4xl">Integrations</h1>
        <p className="text-sm text-ink-500">
          {connected.length} connected · {available.length} available. Connections shown are demo state for v1; toggle real keys in env vars to wire them live.
        </p>
      </div>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-2">Connected</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {connected.map((i) => <Card key={i.id} i={i} />)}
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-2">Available</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {available.map((i) => <Card key={i.id} i={i} />)}
        </div>
      </section>
    </div>
  );
}

function Card({ i }: { i: Integration }) {
  return (
    <div className="card p-4 flex gap-3">
      <div
        className="w-10 h-10 rounded-md flex items-center justify-center text-white font-bold text-sm shrink-0"
        style={{ background: i.color }}
      >
        {i.initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-medium">{i.name}</div>
          <span className="text-[10px] text-ink-400">· {i.category}</span>
          {i.status === "connected" ? (
            <span className="chip bg-emerald-50 text-emerald-700 ml-auto">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" /> Connected
            </span>
          ) : (
            <span className="chip bg-ink-100 text-ink-600 ml-auto">Connect</span>
          )}
        </div>
        <p className="text-xs text-ink-600 mt-1 leading-relaxed">{i.description}</p>
        {i.last_sync_at && (
          <div className="text-[10px] text-ink-400 mt-2">Last sync {relative(i.last_sync_at)}</div>
        )}
        {i.events && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {i.events.map((e, idx) => (
              <li key={idx} className="chip bg-ink-100 text-ink-700">{e}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
