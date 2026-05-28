"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUserId } from "@/lib/user";
import type { ActivityType, DealStage } from "@/lib/types";
import { STAGES } from "@/lib/types";

export async function moveDealStage(dealId: string, stage: DealStage, reason?: string | null) {
  const db = supabaseAdmin();
  const ownerId = await getCurrentUserId();
  const prob = STAGES.find((s) => s.id === stage)?.probability ?? 0;
  const status = stage === "closed_won" ? "won" : stage === "closed_lost" ? "lost" : "open";
  const closed_at = status === "open" ? null : new Date().toISOString();

  const { data: prior } = await db.from("deals").select("stage,name,value_cents,currency,owner_id").eq("id", dealId).single();

  const patch: Record<string, unknown> = { stage, probability: prob, status, closed_at };
  if (status !== "open" && reason !== undefined) patch.won_lost_reason = reason;
  if (status === "open") patch.won_lost_reason = null;

  await db.from("deals").update(patch).eq("id", dealId);

  await db.from("activities").insert({
    deal_id: dealId,
    type: "stage_change",
    subject: `Stage changed: ${prior?.stage ?? "?"} → ${stage}${reason ? ` · ${reason}` : ""}`,
    owner_id: ownerId,
  });

  revalidatePath("/pipeline");
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/dashboard");
  revalidatePath("/analytics");

  return { prior, status };
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

export async function enrollContactInSequence(input: {
  sequenceId: string;
  contactId: string;
  dealId?: string;
}) {
  const db = supabaseAdmin();
  const ownerId = await getCurrentUserId();

  // If already active for this contact+sequence, don't double-enroll.
  const { data: existing } = await db
    .from("sequence_enrollments")
    .select("id,status")
    .eq("sequence_id", input.sequenceId)
    .eq("contact_id", input.contactId)
    .in("status", ["active", "paused"])
    .maybeSingle();
  if (existing) return { ok: false, reason: "already enrolled" };

  // Look up step 0's offset so next_step_at lands sensibly.
  const { data: seq } = await db.from("sequences").select("steps").eq("id", input.sequenceId).single();
  const firstOffset = (seq?.steps as any[])?.[0]?.day_offset ?? 0;
  const next = new Date(Date.now() + firstOffset * 86400000).toISOString();

  await db.from("sequence_enrollments").insert({
    sequence_id: input.sequenceId,
    contact_id: input.contactId,
    deal_id: input.dealId ?? null,
    current_step: 0,
    status: "active",
    enrolled_by: ownerId,
    next_step_at: next,
  });

  revalidatePath("/sequences");
  if (input.dealId) revalidatePath(`/deals/${input.dealId}`);
  return { ok: true };
}

export async function setEnrollmentStatus(enrollmentId: string, status: "active" | "paused" | "cancelled" | "completed", reason?: string) {
  const db = supabaseAdmin();
  const patch: Record<string, unknown> = { status };
  if (status === "paused") patch.paused_reason = reason ?? "manual";
  if (status === "completed") patch.completed_at = new Date().toISOString();
  await db.from("sequence_enrollments").update(patch).eq("id", enrollmentId);
  revalidatePath("/sequences");
}

export async function createTask(input: {
  title: string;
  dealId?: string | null;
  contactId?: string | null;
  ownerId?: string | null;
  priority?: "low" | "normal" | "high";
  due_at?: string | null;
  notes?: string | null;
}) {
  const db = supabaseAdmin();
  const meId = await getCurrentUserId();
  const title = input.title.trim();
  if (!title) return { ok: false, reason: "title required" };

  await db.from("tasks").insert({
    title,
    deal_id: input.dealId ?? null,
    contact_id: input.contactId ?? null,
    owner_id: input.ownerId ?? meId,
    priority: input.priority ?? "normal",
    due_at: input.due_at ?? null,
    notes: input.notes ?? null,
  });

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  if (input.dealId) revalidatePath(`/deals/${input.dealId}`);
  return { ok: true };
}

export async function completeTask(taskId: string) {
  const db = supabaseAdmin();
  await db.from("tasks").update({ completed_at: new Date().toISOString() }).eq("id", taskId);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function uncompleteTask(taskId: string) {
  const db = supabaseAdmin();
  await db.from("tasks").update({ completed_at: null }).eq("id", taskId);
  revalidatePath("/tasks");
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
