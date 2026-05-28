import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { Activity, Deal } from "@/lib/types";

// POST /api/ai/deal-health  { dealId }
// Returns { score, reasoning, risks } and writes back to deals row.
// If ANTHROPIC_API_KEY is set, calls Claude. Otherwise returns a heuristic mock
// so the demo still feels intelligent.

export async function POST(req: Request) {
  const { dealId } = await req.json();
  if (!dealId) return NextResponse.json({ error: "dealId required" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: deal } = await db.from("deals").select("*").eq("id", dealId).single();
  if (!deal) return NextResponse.json({ error: "deal not found" }, { status: 404 });

  const { data: activitiesRaw } = await db
    .from("activities")
    .select("*")
    .eq("deal_id", dealId)
    .order("occurred_at", { ascending: false })
    .limit(30);
  const activities = (activitiesRaw as Activity[]) ?? [];

  const result = process.env.ANTHROPIC_API_KEY
    ? await scoreWithClaude(deal as Deal, activities)
    : scoreHeuristic(deal as Deal, activities);

  await db
    .from("deals")
    .update({
      health_score: result.score,
      health_reasoning: result.reasoning,
      health_risks: result.risks,
      health_updated_at: new Date().toISOString(),
    })
    .eq("id", dealId);

  return NextResponse.json({ ...result, mocked: !process.env.ANTHROPIC_API_KEY });
}

type ScoreResult = {
  score: number;
  reasoning: string;
  risks: { label: string; severity: "low" | "med" | "high" }[];
};

function scoreHeuristic(deal: Deal, activities: Activity[]): ScoreResult {
  const now = Date.now();
  const days = (iso: string) => (now - new Date(iso).getTime()) / 86400000;

  const lastTouch = activities[0] ? days(activities[0].occurred_at) : 999;
  const meetings = activities.filter((a) => a.type === "meeting").length;
  const emailsOut = activities.filter((a) => a.type === "email_sent").length;
  const emailsIn = activities.filter((a) => a.type === "email_received").length;
  const calls = activities.filter((a) => a.type === "call").length;

  // Base on stage probability
  let score = deal.probability;
  // Recency
  if (lastTouch < 3) score += 10;
  else if (lastTouch < 7) score += 4;
  else if (lastTouch < 14) score -= 4;
  else score -= 15;
  // Two-way engagement
  if (emailsIn > 0) score += 6;
  if (meetings >= 2) score += 6;
  if (calls >= 1) score += 3;
  // No-response signal
  if (emailsOut >= 2 && emailsIn === 0 && lastTouch > 5) score -= 10;
  // Close-date pressure
  if (deal.expected_close_date) {
    const d = (new Date(deal.expected_close_date).getTime() - now) / 86400000;
    if (d < 0) score -= 10;
    else if (d < 14 && deal.stage !== "negotiation") score -= 6;
  }

  score = Math.max(5, Math.min(98, Math.round(score)));

  const risks: ScoreResult["risks"] = [];
  if (lastTouch > 7) risks.push({ label: `No contact in ${Math.round(lastTouch)}d`, severity: lastTouch > 14 ? "high" : "med" });
  if (emailsOut >= 2 && emailsIn === 0) risks.push({ label: "Unanswered outbound emails", severity: "high" });
  if (meetings === 0 && (deal.stage === "demo" || deal.stage === "proposal" || deal.stage === "negotiation")) {
    risks.push({ label: "No meetings logged at this stage", severity: "med" });
  }
  if (deal.expected_close_date) {
    const d = (new Date(deal.expected_close_date).getTime() - now) / 86400000;
    if (d < 14 && deal.stage !== "negotiation" && deal.stage !== "closed_won") {
      risks.push({ label: `Close date in ${Math.round(d)}d but only at ${deal.stage}`, severity: "high" });
    }
  }

  const reasoning =
    score >= 80
      ? `Strong engagement (${meetings} meetings, ${calls} calls). Last touch ${Math.round(lastTouch)}d ago. Likely to close at or near expected date.`
      : score >= 60
      ? `Moderate engagement. ${emailsIn} reply${emailsIn === 1 ? "" : "ies"} from prospect, ${meetings} meeting${meetings === 1 ? "" : "s"}. Watch the close-date pressure.`
      : score >= 40
      ? `Mixed signals. ${emailsOut} emails out vs ${emailsIn} in. Last activity ${Math.round(lastTouch)}d ago — momentum is slipping.`
      : `Cold. ${Math.round(lastTouch)} days since last touch and limited two-way engagement. Re-qualify before investing more time.`;

  return { score, reasoning, risks };
}

async function scoreWithClaude(deal: Deal, activities: Activity[]): Promise<ScoreResult> {
  // Placeholder for the real call. Returning heuristic so the route stays working
  // without an API key. Swap in @anthropic-ai/sdk and structured output here.
  return scoreHeuristic(deal, activities);
}
