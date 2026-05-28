import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { Activity, Contact, Deal } from "@/lib/types";

// POST /api/ai/draft-email  { dealId, intent? }
// intent: "follow_up" | "schedule_demo" | "close" | "re_engage"
// Returns { subject, body, mocked }

export async function POST(req: Request) {
  const { dealId, intent = "follow_up" } = await req.json();
  if (!dealId) return NextResponse.json({ error: "dealId required" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: deal } = await db.from("deals").select("*").eq("id", dealId).single();
  if (!deal) return NextResponse.json({ error: "deal not found" }, { status: 404 });

  const { data: contact } = deal.primary_contact_id
    ? await db.from("contacts").select("*").eq("id", deal.primary_contact_id).single()
    : { data: null };

  const { data: lastActsRaw } = await db
    .from("activities")
    .select("*")
    .eq("deal_id", dealId)
    .order("occurred_at", { ascending: false })
    .limit(5);
  const lastActs = (lastActsRaw as Activity[]) ?? [];

  const result = process.env.ANTHROPIC_API_KEY
    ? await draftWithClaude(deal as Deal, contact as Contact | null, lastActs, intent)
    : draftHeuristic(deal as Deal, contact as Contact | null, lastActs, intent);

  return NextResponse.json({ ...result, mocked: !process.env.ANTHROPIC_API_KEY });
}

type DraftResult = { subject: string; body: string };

function draftHeuristic(
  deal: Deal,
  contact: Contact | null,
  lastActs: Activity[],
  intent: string
): DraftResult {
  const first = contact?.first_name ?? "there";
  const lastSubj = lastActs.find((a) => a.subject)?.subject ?? deal.name;

  if (intent === "schedule_demo") {
    return {
      subject: `Quick demo for ${deal.name.split(" - ")[0]}?`,
      body:
`Hi ${first},

Following on from our recent thread — would a 25-minute walkthrough next week be useful? I'd focus on the two areas you flagged and skip everything else.

If easier, here are three windows that work my side: Tue 10am, Wed 2pm, Thu 11am (your time).

Best,`,
    };
  }
  if (intent === "close") {
    return {
      subject: `Last details on ${deal.name}`,
      body:
`Hi ${first},

Pulling the remaining items into one short list so we can get to a decision this week:

1. Final pricing (attached, mirrors what we discussed)
2. Security questionnaire — happy to jump on a call with your IT if helpful
3. Mutual close plan with the milestones we walked through

Anything else on your side I should add? Aiming to lock this by Friday.

Thanks,`,
    };
  }
  if (intent === "re_engage") {
    return {
      subject: `Should I close the loop on ${deal.name.split(" - ")[0]}?`,
      body:
`Hi ${first},

I haven't heard back since "${lastSubj}" — totally understand if priorities shifted. Two quick options:

• Park it: I'll close the thread and reach out next quarter.
• Keep going: 15-min reset call to re-scope what's relevant now.

Which works?

Best,`,
    };
  }
  // follow_up
  return {
    subject: `Re: ${lastSubj}`,
    body:
`Hi ${first},

Circling back on this. Two things I can do to make the next step easier:

• Send a short ROI model tailored to your team size.
• Set up a 20-min working session with whoever owns the rollout.

Either useful? Happy to do both.

Best,`,
  };
}

async function draftWithClaude(
  deal: Deal,
  contact: Contact | null,
  lastActs: Activity[],
  intent: string
): Promise<DraftResult> {
  // Placeholder. Swap in Anthropic SDK and feed the activity history.
  return draftHeuristic(deal, contact, lastActs, intent);
}
