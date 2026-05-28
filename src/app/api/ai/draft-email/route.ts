import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { geminiEnabled, geminiJson } from "@/lib/gemini";
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

  const heuristic = draftHeuristic(deal as Deal, contact as Contact | null, lastActs, intent);
  if (!geminiEnabled()) return NextResponse.json({ ...heuristic, mocked: true });

  const ai = await draftWithGemini(deal as Deal, contact as Contact | null, lastActs, intent);
  if (!ai) return NextResponse.json({ ...heuristic, mocked: false, fallback: true });
  return NextResponse.json({ ...ai, mocked: false });
}

async function draftWithGemini(
  deal: Deal,
  contact: Contact | null,
  lastActs: Activity[],
  intent: string
): Promise<DraftResult | null> {
  const ctx = serializeForDraft(deal, contact, lastActs);
  const intentMap: Record<string, string> = {
    follow_up: "Follow up after recent activity. Two-sentence opener referencing the last touch, then offer one specific next-step move.",
    schedule_demo: "Offer a 25-minute demo, propose 3 specific time slots, and reference one pain we can solve.",
    close: "Move to close. Summarize the remaining items as a short numbered list. Ask for a Friday decision.",
    re_engage: "Re-engage a deal that's gone quiet. Offer a 'park or keep going' fork — make it easy to say no.",
  };
  const intentBrief = intentMap[intent] ?? intentMap.follow_up;

  const system = `You are an AI sales coach drafting an email a sales rep would actually send.

Style rules:
- Conversational, not corporate. No "I hope this email finds you well."
- Subject lines are 4-8 words, lowercase first letter, no hype.
- Body opens with "Hi <FirstName>," then 1 short paragraph + 1-3 short lines, end with "Best,".
- Total body length: 60-120 words.
- Never invent facts. Reference real activity/context only.

Output JSON: {"subject": "...", "body": "..."}`;

  const prompt = `${ctx}\n\nIntent for this email: ${intentBrief}\n\nDraft the email now as JSON.`;
  const json = await geminiJson<DraftResult>(prompt, { system, temperature: 0.6, maxOutputTokens: 500 });
  if (!json || typeof json.subject !== "string" || typeof json.body !== "string") return null;
  return json;
}

function serializeForDraft(deal: Deal, contact: Contact | null, lastActs: Activity[]): string {
  const lines: string[] = [];
  lines.push(`Deal: ${deal.name} | stage=${deal.stage} | $${Math.round(deal.value_cents / 100).toLocaleString()}`);
  if (contact) lines.push(`Recipient: ${contact.first_name} ${contact.last_name}${contact.title ? `, ${contact.title}` : ""}${contact.email ? ` <${contact.email}>` : ""}`);
  if (lastActs.length === 0) {
    lines.push("Recent activity: none.");
    return lines.join("\n");
  }
  lines.push("Last 5 activities (newest first):");
  for (const a of lastActs.slice(0, 5)) {
    const days = Math.round((Date.now() - new Date(a.occurred_at).getTime()) / 86400000);
    lines.push(`- ${days}d ago | ${a.type} | ${a.subject ?? ""}${a.body ? ` — ${a.body.slice(0, 140)}` : ""}`);
  }
  return lines.join("\n");
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

