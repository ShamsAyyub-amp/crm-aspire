import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { Activity, Deal } from "@/lib/types";
import { OPEN_STAGES } from "@/lib/types";

// POST /api/ai/next-actions  { ownerId? }  →  what should this rep do today?
// Returns { actions: [{ dealId, dealName, title, why, severity }] }

export async function POST(req: Request) {
  const { ownerId } = await req.json();
  const db = supabaseAdmin();

  let q = db.from("deals").select("*").in("stage", OPEN_STAGES);
  if (ownerId) q = q.eq("owner_id", ownerId);
  const { data: dealsRaw } = await q;
  const deals = (dealsRaw as Deal[]) ?? [];

  if (deals.length === 0) return NextResponse.json({ actions: [], mocked: !process.env.GEMINI_API_KEY });

  const ids = deals.map((d) => d.id);
  const { data: actsRaw } = await db
    .from("activities")
    .select("*")
    .in("deal_id", ids)
    .order("occurred_at", { ascending: false });
  const acts = (actsRaw as Activity[]) ?? [];

  const byDeal = new Map<string, Activity[]>();
  for (const a of acts) {
    if (!a.deal_id) continue;
    const arr = byDeal.get(a.deal_id) ?? [];
    arr.push(a);
    byDeal.set(a.deal_id, arr);
  }

  const now = Date.now();
  const actions: {
    dealId: string;
    dealName: string;
    title: string;
    why: string;
    severity: "low" | "med" | "high";
  }[] = [];

  for (const d of deals) {
    const da = byDeal.get(d.id) ?? [];
    const last = da[0];
    const daysSince = last ? Math.round((now - new Date(last.occurred_at).getTime()) / 86400000) : 999;
    const emailsOut = da.filter((a) => a.type === "email_sent").length;
    const emailsIn = da.filter((a) => a.type === "email_received").length;

    if ((d.stage === "proposal" || d.stage === "negotiation") && daysSince >= 5) {
      actions.push({
        dealId: d.id,
        dealName: d.name,
        title: "Re-engage decision-maker",
        why: `In ${d.stage} but no activity for ${daysSince} days. Health drops fast here.`,
        severity: "high",
      });
      continue;
    }
    if (emailsOut >= 2 && emailsIn === 0 && daysSince >= 4) {
      actions.push({
        dealId: d.id,
        dealName: d.name,
        title: "Switch channel — try a call or LinkedIn",
        why: `${emailsOut} unanswered emails. Email is not working here.`,
        severity: "high",
      });
      continue;
    }
    if (d.expected_close_date) {
      const closeIn = Math.round((new Date(d.expected_close_date).getTime() - now) / 86400000);
      if (closeIn <= 7 && d.stage !== "negotiation" && d.stage !== "closed_won") {
        actions.push({
          dealId: d.id,
          dealName: d.name,
          title: "Push to negotiation or move close date",
          why: `Expected close in ${closeIn}d but still in ${d.stage}.`,
          severity: "high",
        });
        continue;
      }
    }
    if (d.stage === "demo" && da.filter((a) => a.type === "meeting").length === 0) {
      actions.push({
        dealId: d.id,
        dealName: d.name,
        title: "Book the demo",
        why: "Stage is demo but no meeting logged.",
        severity: "med",
      });
      continue;
    }
    if (daysSince >= 10) {
      actions.push({
        dealId: d.id,
        dealName: d.name,
        title: "Send a re-engagement note",
        why: `Quiet for ${daysSince} days. One nudge before parking.`,
        severity: "med",
      });
    }
  }

  // Highest-severity, highest-value first.
  const sev = { high: 0, med: 1, low: 2 } as const;
  actions.sort((a, b) => sev[a.severity] - sev[b.severity]);

  return NextResponse.json({ actions: actions.slice(0, 8), mocked: !process.env.GEMINI_API_KEY });
}
