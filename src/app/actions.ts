"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUserId } from "@/lib/user";
import type { ActivityType, DealStage } from "@/lib/types";
import { STAGES } from "@/lib/types";

export async function moveDealStage(dealId: string, stage: DealStage) {
  const db = supabaseAdmin();
  const ownerId = await getCurrentUserId();
  const prob = STAGES.find((s) => s.id === stage)?.probability ?? 0;
  const status = stage === "closed_won" ? "won" : stage === "closed_lost" ? "lost" : "open";
  const closed_at = status === "open" ? null : new Date().toISOString();

  // Get prior stage for the activity log.
  const { data: prior } = await db.from("deals").select("stage").eq("id", dealId).single();

  await db
    .from("deals")
    .update({ stage, probability: prob, status, closed_at })
    .eq("id", dealId);

  await db.from("activities").insert({
    deal_id: dealId,
    type: "stage_change",
    subject: `Stage changed: ${prior?.stage ?? "?"} → ${stage}`,
    owner_id: ownerId,
  });

  revalidatePath("/pipeline");
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/dashboard");
}

export async function logActivity(input: {
  dealId?: string;
  contactId?: string;
  type: ActivityType;
  subject?: string;
  body?: string;
}) {
  const db = supabaseAdmin();
  const ownerId = await getCurrentUserId();

  await db.from("activities").insert({
    deal_id: input.dealId ?? null,
    contact_id: input.contactId ?? null,
    type: input.type,
    subject: input.subject ?? null,
    body: input.body ?? null,
    owner_id: ownerId,
  });

  if (input.dealId) revalidatePath(`/deals/${input.dealId}`);
  revalidatePath("/dashboard");
}

export async function switchUser(userId: string) {
  const store = await cookies();
  store.set("crm_current_user", userId, { path: "/", maxAge: 60 * 60 * 24 * 30 });
  revalidatePath("/", "layout");
}

export async function updateDealField(
  dealId: string,
  patch: Partial<{ name: string; value_cents: number; expected_close_date: string | null; probability: number; owner_id: string }>
) {
  const db = supabaseAdmin();
  await db.from("deals").update(patch).eq("id", dealId);
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
}

export async function rescoreDealHealth(dealId: string) {
  // Calls the AI route which writes back to the deal row.
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  await fetch(`${base}/api/ai/deal-health`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ dealId }),
    cache: "no-store",
  });
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/dashboard");
}
