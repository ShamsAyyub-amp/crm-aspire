import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { Activity, Company, Contact, Deal, User } from "@/lib/types";

// POST /api/ai/deal-brief  { dealId }
// Narrative summary that a sales leader could read in 10 seconds.
// Returns { brief, headline, signals, recommendation, mocked }.

export async function POST(req: Request) {
  const { dealId } = await req.json();
  if (!dealId) return NextResponse.json({ error: "dealId required" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: deal } = await db.from("deals").select("*").eq("id", dealId).single();
  if (!deal) return NextResponse.json({ error: "deal not found" }, { status: 404 });

  const [{ data: company }, { data: contact }, { data: owner }, { data: actsRaw }] = await Promise.all([
    deal.company_id ? db.from("companies").select("*").eq("id", deal.company_id).single() : Promise.resolve({ data: null }),
    deal.primary_contact_id ? db.from("contacts").select("*").eq("id", deal.primary_contact_id).single() : Promise.resolve({ data: null }),
    deal.owner_id ? db.from("users").select("*").eq("id", deal.owner_id).single() : Promise.resolve({ data: null }),
    db.from("activities").select("*").eq("deal_id", dealId).order("occurred_at", { ascending: false }).limit(30),
  ]);
  const acts = (actsRaw as Activity[]) ?? [];

  const out = process.env.ANTHROPIC_API_KEY
    ? await briefWithClaude(deal as Deal, company as Company | null, contact as Contact | null, owner as User | null, acts)
    : briefHeuristic(deal as Deal, company as Company | null, contact as Contact | null, owner as User | null, acts);

  return NextResponse.json({ ...out, mocked: !process.env.ANTHROPIC_API_KEY });
}

type Brief = { headline: string; brief: string; signals: string[]; recommendation: string };

function briefHeuristic(deal: Deal, company: Company | null, contact: Contact | null, owner: User | null, acts: Activity[]): Brief {
  const now = Date.now();
  const days = (iso: string) => Math.round((now - new Date(iso).getTime()) / 86400000);

  const meetings = acts.filter((a) => a.type === "meeting").length;
  const callsCount = acts.filter((a) => a.type === "call").length;
  const emailsOut = acts.filter((a) => a.type === "email_sent").length;
  const emailsIn = acts.filter((a) => a.type === "email_received").length;
  const lastTouch = acts[0] ? days(acts[0].occurred_at) : 999;

  const ownerName = owner?.name?.split(" ")[0] ?? "Owner";
  const contactName = contact ? `${contact.first_name} ${contact.last_name}` : null;
  const contactRole = contact?.title;

  const signals: string[] = [];
  if (emailsIn > 0) signals.push(`${emailsIn} reply${emailsIn === 1 ? "" : "ies"} from prospect`);
  if (meetings > 0) signals.push(`${meetings} meeting${meetings === 1 ? "" : "s"} logged`);
  if (callsCount > 0) signals.push(`${callsCount} call${callsCount === 1 ? "" : "s"}`);
  if (emailsOut >= 2 && emailsIn === 0) signals.push(`${emailsOut} outbound emails unanswered`);
  if (lastTouch < 999) signals.push(`last touch ${lastTouch}d ago`);
  if (deal.expected_close_date) {
    const d = Math.round((new Date(deal.expected_close_date).getTime() - now) / 86400000);
    signals.push(d >= 0 ? `close target in ${d}d` : `close date ${-d}d overdue`);
  }

  // Pull the most recent substantive activity to mention by name.
  const recentSubstantive = acts.find((a) => a.type === "meeting" || a.type === "call" || a.type === "email_received") ?? acts[0];
  const recentLine = recentSubstantive
    ? `Most recent: ${labelType(recentSubstantive.type)}${recentSubstantive.subject ? ` — "${recentSubstantive.subject}"` : ""} ${days(recentSubstantive.occurred_at)}d ago.`
    : "No activity logged yet.";

  // Recommendation logic.
  let recommendation: string;
  if (deal.stage === "closed_won") {
    recommendation = `Closed won. Hand off to CS within 48h; lock in the kickoff date.`;
  } else if (deal.stage === "closed_lost") {
    recommendation = `Closed lost${deal.won_lost_reason ? ` (${deal.won_lost_reason})` : ""}. Add to nurture and revisit in 90 days.`;
  } else if (emailsOut >= 2 && emailsIn === 0 && lastTouch > 4) {
    recommendation = `Email isn't working. Switch channels — try a call or LinkedIn touch to ${contactName ?? "primary contact"} today.`;
  } else if ((deal.stage === "proposal" || deal.stage === "negotiation") && lastTouch > 5) {
    recommendation = `Late-stage and going quiet. Push for a 15-min decision-maker sync this week; surface any open objection in writing first.`;
  } else if (deal.stage === "demo" && meetings === 0) {
    recommendation = `Stage says demo but no meeting logged. Book it before momentum dies.`;
  } else if (deal.stage === "qualified" && emailsIn === 0) {
    recommendation = `Qualified but no two-way engagement. Send a tailored ROI angle to unlock a reply.`;
  } else if (deal.expected_close_date && (new Date(deal.expected_close_date).getTime() - now) / 86400000 < 14 && deal.stage !== "negotiation") {
    recommendation = `Close date is 2 weeks out but you're still in ${deal.stage}. Either accelerate to negotiation or move the date — both honest, only one demos well.`;
  } else if ((deal.health_score ?? 100) >= 80) {
    recommendation = `Healthy. Hold the line, run the close plan, and avoid surprises.`;
  } else {
    recommendation = `Mixed signals. Confirm champion is still bought in and that ${contactRole ?? "the buyer"} hasn't been replaced; small check-in beats a big push.`;
  }

  const headline =
    deal.stage === "closed_won" ? "Won — hand off cleanly"
    : deal.stage === "closed_lost" ? "Lost — nurture and revisit"
    : (deal.health_score ?? 0) >= 80 ? "On track"
    : (deal.health_score ?? 0) >= 60 ? "Mostly healthy, one move to make"
    : (deal.health_score ?? 100) < 40 ? "At risk — needs intervention"
    : "Mixed — clarify the next decision";

  const briefText =
`${deal.name}${company ? ` at ${company.name}` : ""}${company?.industry ? ` (${company.industry}${company.employees ? `, ${company.employees.toLocaleString()} employees` : ""})` : ""}. ` +
`${ownerName} owns it. Currently in ${deal.stage}${contactName ? `; primary contact is ${contactName}${contactRole ? `, ${contactRole}` : ""}` : ""}. ` +
`Engagement: ${signals.length ? signals.join(", ") : "thin"}. ` +
`${recentLine}`;

  return { headline, brief: briefText, signals, recommendation };
}

function labelType(t: Activity["type"]): string {
  return ({
    call: "call",
    email_sent: "outbound email",
    email_received: "inbound reply",
    meeting: "meeting",
    note: "note",
    stage_change: "stage change",
    task: "task",
  } as const)[t];
}

async function briefWithClaude(deal: Deal, company: Company | null, contact: Contact | null, owner: User | null, acts: Activity[]): Promise<Brief> {
  // Placeholder for the real Anthropic call. Heuristic for now so the route works without a key.
  return briefHeuristic(deal, company, contact, owner, acts);
}
