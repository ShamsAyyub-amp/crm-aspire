import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { geminiEnabled, geminiJson } from "@/lib/gemini";
import { OPEN_STAGES } from "@/lib/types";
import type { Activity, Deal } from "@/lib/types";

// POST /api/ai/cross-insights  { ownerId? }
// Cross-deal pattern detection: themes, anomalies, things a human would miss.
// Returns { insights: [{ title, detail, evidence, severity, dealIds }], mocked }.

export async function POST(req: Request) {
  const { ownerId } = await req.json().catch(() => ({}));
  const db = supabaseAdmin();

  let q = db.from("deals").select("*");
  if (ownerId) q = q.eq("owner_id", ownerId);
  const { data: dealsRaw } = await q;
  const deals = (dealsRaw as Deal[]) ?? [];

  if (deals.length === 0) return NextResponse.json({ insights: [], mocked: !process.env.GEMINI_API_KEY });

  const ids = deals.map((d) => d.id);
  const { data: actsRaw } = await db.from("activities").select("*").in("deal_id", ids);
  const acts = (actsRaw as Activity[]) ?? [];

  const heuristic = insightsHeuristic(deals, acts);
  if (!geminiEnabled()) return NextResponse.json({ ...heuristic, mocked: true });

  const ai = await insightsWithGemini(deals, acts, heuristic);
  if (!ai) return NextResponse.json({ ...heuristic, mocked: false, fallback: true });
  return NextResponse.json({ ...ai, mocked: false });
}

async function insightsWithGemini(
  deals: Deal[],
  acts: Activity[],
  heuristic: { insights: Insight[] }
): Promise<{ insights: Insight[] } | null> {
  const ctx = serializeForInsights(deals, acts);
  const system = `You are an AI sales coach scanning a sales team's pipeline for patterns no individual rep would catch.

Output JSON: {"insights": [{"title": "...", "detail": "...", "evidence": "...", "severity": "low" | "med" | "high", "dealIds": ["..."]}]}

Rules:
- Maximum 5 insights. Each must reference at least 2 deals.
- Title: a short pattern statement (e.g. "Compliance gating 3 deals at once").
- Detail: 1 sentence, manager-level take.
- Evidence: a brief verbatim quote or condensed phrase from the activity bodies if possible, else a count.
- Severity: high if a deal could die this week, med if it slips, low if just notable.
- dealIds: the actual deal id strings from the input, not deal names.
- Never invent activity. If patterns are weak, return fewer insights — empty array is fine.`;

  const prompt = `${ctx}\n\nFor reference, the heuristic engine found these patterns:\n${heuristic.insights.map((i) => `- ${i.title} (${i.dealIds.length} deals)`).join("\n")}\n\nReturn richer JSON insights now.`;

  const json = await geminiJson<{ insights: Insight[] }>(prompt, { system, temperature: 0.4, maxOutputTokens: 1200 });
  if (!json || !Array.isArray(json.insights)) return null;
  // Make sure dealIds reference real deals.
  const realIds = new Set(deals.map((d) => d.id));
  for (const i of json.insights) i.dealIds = (i.dealIds || []).filter((id) => realIds.has(id));
  return json;
}

function serializeForInsights(deals: Deal[], acts: Activity[]): string {
  const open = deals.filter((d) => OPEN_STAGES.includes(d.stage));
  const lines: string[] = [];
  lines.push(`Open deals: ${open.length} | Closed deals (won/lost): ${deals.filter((d) => d.status !== "open").length}`);
  lines.push("");
  lines.push("Open deal summary (id | name | stage | health | days_since_last_activity):");
  const byDeal = new Map<string, Activity[]>();
  for (const a of acts) if (a.deal_id) byDeal.set(a.deal_id, [...(byDeal.get(a.deal_id) ?? []), a]);
  for (const d of open) {
    const da = byDeal.get(d.id) ?? [];
    const last = da[0] ? Math.round((Date.now() - new Date(da[0].occurred_at).getTime()) / 86400000) : 999;
    lines.push(`- ${d.id} | ${d.name} | ${d.stage} | ${d.health_score ?? "—"} | ${last}d`);
  }
  lines.push("");
  lines.push("Recent activity bodies (for keyword/pattern detection):");
  for (const a of acts.slice(0, 40)) {
    if (!a.body && !a.subject) continue;
    lines.push(`- dealId=${a.deal_id} | ${a.type} | ${a.subject ?? ""}${a.body ? ` — ${a.body.slice(0, 160)}` : ""}`);
  }
  return lines.join("\n");
}

type Insight = {
  title: string;
  detail: string;
  evidence: string;
  severity: "low" | "med" | "high";
  dealIds: string[];
};

const KEYWORDS = [
  { token: "security", theme: "Security review surfacing across deals" },
  { token: "compliance", theme: "Compliance is a recurring blocker" },
  { token: "pricing", theme: "Pricing pressure raised in multiple threads" },
  { token: "incumbent", theme: "Incumbent displacement coming up repeatedly" },
  { token: "procurement", theme: "Procurement is showing up as a gate" },
  { token: "budget", theme: "Budget timing concerns clustering" },
  { token: "roi", theme: "ROI proof being requested across the pipeline" },
];

function insightsHeuristic(deals: Deal[], acts: Activity[]): { insights: Insight[] } {
  const now = Date.now();
  const open = deals.filter((d) => OPEN_STAGES.includes(d.stage));
  const insights: Insight[] = [];

  // Pattern 1: keyword themes across activity bodies.
  const haystack = acts
    .filter((a) => a.deal_id && (a.body || a.subject))
    .map((a) => ({ deal_id: a.deal_id!, text: `${a.subject ?? ""} ${a.body ?? ""}`.toLowerCase() }));

  for (const kw of KEYWORDS) {
    const hits = haystack.filter((h) => h.text.includes(kw.token));
    const dealIds = Array.from(new Set(hits.map((h) => h.deal_id)));
    if (dealIds.length >= 2) {
      insights.push({
        title: kw.theme,
        detail: `"${kw.token}" appears in ${hits.length} activities across ${dealIds.length} deals.`,
        evidence: hits
          .slice(0, 3)
          .map((h) => h.text.split(/\s+/).slice(0, 18).join(" ") + (h.text.length > 100 ? "…" : ""))
          .join("  |  "),
        severity: dealIds.length >= 3 ? "high" : "med",
        dealIds,
      });
    }
  }

  // Pattern 2: stalled in proposal/negotiation > N days.
  const stalled = open.filter((d) => {
    if (d.stage !== "proposal" && d.stage !== "negotiation") return false;
    const ref = d.stage_entered_at ?? d.updated_at;
    return (now - new Date(ref).getTime()) / 86400000 > 7;
  });
  if (stalled.length >= 2) {
    insights.push({
      title: `${stalled.length} late-stage deals stalled > 7 days`,
      detail: "Proposal/negotiation deals losing momentum at the same time. Worth a manager-level intervention.",
      evidence: stalled.map((d) => d.name).slice(0, 4).join("  |  "),
      severity: "high",
      dealIds: stalled.map((d) => d.id),
    });
  }

  // Pattern 3: unanswered outbound clusters.
  const unanswered: { dealId: string; out: number; lastOut: number }[] = [];
  const byDeal = new Map<string, Activity[]>();
  for (const a of acts) {
    if (!a.deal_id) continue;
    const arr = byDeal.get(a.deal_id) ?? [];
    arr.push(a);
    byDeal.set(a.deal_id, arr);
  }
  for (const [dealId, da] of byDeal) {
    const outs = da.filter((a) => a.type === "email_sent");
    const ins = da.filter((a) => a.type === "email_received");
    if (outs.length >= 2 && ins.length === 0) {
      const lastOut = Math.round((now - new Date(outs[0].occurred_at).getTime()) / 86400000);
      unanswered.push({ dealId, out: outs.length, lastOut });
    }
  }
  if (unanswered.length >= 2) {
    insights.push({
      title: `${unanswered.length} deals where email isn't working`,
      detail: "Multiple unanswered outbound — channel switch likely to outperform another nudge.",
      evidence: unanswered.slice(0, 4).map((u) => `${u.out} unanswered, last ${u.lastOut}d ago`).join("  |  "),
      severity: "med",
      dealIds: unanswered.map((u) => u.dealId),
    });
  }

  // Pattern 4: close-date crunch.
  const crunch = open.filter((d) => {
    if (!d.expected_close_date) return false;
    const days = (new Date(d.expected_close_date).getTime() - now) / 86400000;
    return days <= 14 && d.stage !== "negotiation";
  });
  if (crunch.length >= 2) {
    insights.push({
      title: `${crunch.length} deals with close dates inside 2 weeks but not in negotiation`,
      detail: "Either accelerate or move the dates — current forecast accuracy will suffer.",
      evidence: crunch.slice(0, 4).map((d) => `${d.name} (stage: ${d.stage})`).join("  |  "),
      severity: "med",
      dealIds: crunch.map((d) => d.id),
    });
  }

  return { insights: insights.slice(0, 6) };
}

