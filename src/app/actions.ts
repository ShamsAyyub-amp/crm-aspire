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

export async function createDeal(input: {
  name: string;
  companyId?: string | null;
  primaryContactId?: string | null;
  ownerId?: string | null;
  stage?: DealStage;
  valueCents?: number;
  probability?: number;
  expectedCloseDate?: string | null;
  source?: string | null;
}): Promise<{ ok: true; dealId: string } | { ok: false; reason: string }> {
  const db = supabaseAdmin();
  const meId = await getCurrentUserId();
  const name = input.name.trim();
  if (!name) return { ok: false, reason: "name required" };
  if (!input.companyId) return { ok: false, reason: "company required" };

  const stage: DealStage = input.stage ?? "lead";
  const stageProb = STAGES.find((s) => s.id === stage)?.probability ?? 10;
  const probability = input.probability ?? stageProb;

  const { data, error } = await db
    .from("deals")
    .insert({
      name,
      company_id: input.companyId,
      primary_contact_id: input.primaryContactId ?? null,
      owner_id: input.ownerId ?? meId,
      stage,
      status: stage === "closed_won" ? "won" : stage === "closed_lost" ? "lost" : "open",
      value_cents: input.valueCents ?? 0,
      probability,
      expected_close_date: input.expectedCloseDate ?? null,
      source: input.source ?? null,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, reason: error?.message ?? "insert failed" };

  await db.from("activities").insert({
    deal_id: data.id,
    type: "note",
    subject: "Deal created",
    body: `Created in stage ${stage}.`,
    owner_id: meId,
  });

  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  revalidatePath("/companies");
  return { ok: true, dealId: data.id };
}

export async function createCompany(input: {
  name: string;
  domain?: string | null;
  industry?: string | null;
  employees?: number | null;
  city?: string | null;
  country?: string | null;
  ownerId?: string | null;
}): Promise<{ ok: true; companyId: string } | { ok: false; reason: string }> {
  const db = supabaseAdmin();
  const meId = await getCurrentUserId();
  const name = input.name.trim();
  if (!name) return { ok: false, reason: "name required" };

  // Dedupe by domain — silent if a company already exists on the same domain.
  if (input.domain) {
    const cleanDomain = input.domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (cleanDomain) {
      const { data: existing } = await db
        .from("companies")
        .select("id,name")
        .eq("domain", cleanDomain)
        .maybeSingle();
      if (existing) {
        return { ok: false, reason: `A company already exists on ${cleanDomain}: ${existing.name}` };
      }
    }
  }

  const { data, error } = await db
    .from("companies")
    .insert({
      name,
      domain: input.domain?.trim().toLowerCase() || null,
      industry: input.industry?.trim() || null,
      employees: input.employees ?? null,
      city: input.city?.trim() || null,
      country: input.country?.trim() || null,
      owner_id: input.ownerId ?? meId,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, reason: error?.message ?? "insert failed" };

  revalidatePath("/companies");
  revalidatePath("/pipeline");
  return { ok: true, companyId: data.id };
}

export async function createContact(input: {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  companyId?: string | null;
  ownerId?: string | null;
}): Promise<{ ok: true; contactId: string } | { ok: false; reason: string }> {
  const db = supabaseAdmin();
  const meId = await getCurrentUserId();
  const first = input.firstName.trim();
  const last = input.lastName.trim();
  if (!first || !last) return { ok: false, reason: "first and last name required" };

  const { data, error } = await db
    .from("contacts")
    .insert({
      first_name: first,
      last_name: last,
      email: input.email?.trim().toLowerCase() || null,
      phone: input.phone?.trim() || null,
      title: input.title?.trim() || null,
      company_id: input.companyId ?? null,
      owner_id: input.ownerId ?? meId,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, reason: error?.message ?? "insert failed" };

  revalidatePath("/contacts");
  if (input.companyId) revalidatePath("/companies");
  return { ok: true, contactId: data.id };
}

export async function updateDeal(
  dealId: string,
  patch: {
    name?: string;
    companyId?: string | null;
    primaryContactId?: string | null;
    stage?: DealStage;
    valueCents?: number;
    probability?: number;
    expectedCloseDate?: string | null;
    source?: string | null;
  }
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const db = supabaseAdmin();
  if (patch.name !== undefined && !patch.name.trim()) return { ok: false, reason: "name cannot be empty" };

  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name.trim();
  if (patch.companyId !== undefined) row.company_id = patch.companyId;
  if (patch.primaryContactId !== undefined) row.primary_contact_id = patch.primaryContactId;
  if (patch.valueCents !== undefined) row.value_cents = patch.valueCents;
  if (patch.probability !== undefined) row.probability = patch.probability;
  if (patch.expectedCloseDate !== undefined) row.expected_close_date = patch.expectedCloseDate;
  if (patch.source !== undefined) row.source = patch.source;
  if (patch.stage !== undefined) {
    row.stage = patch.stage;
    row.status = patch.stage === "closed_won" ? "won" : patch.stage === "closed_lost" ? "lost" : "open";
    // If they chose a stage but didn't override probability, follow the canonical stage prob.
    if (patch.probability === undefined) {
      row.probability = STAGES.find((s) => s.id === patch.stage)?.probability ?? 0;
    }
  }

  const { error } = await db.from("deals").update(row).eq("id", dealId);
  if (error) return { ok: false, reason: error.message };

  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  return { ok: true };
}

export async function deleteDeal(dealId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const db = supabaseAdmin();
  const { error } = await db.from("deals").delete().eq("id", dealId);
  if (error) return { ok: false, reason: error.message };
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  revalidatePath("/contacts");
  revalidatePath("/companies");
  return { ok: true };
}

export async function updateCompany(
  companyId: string,
  patch: {
    name?: string;
    domain?: string | null;
    industry?: string | null;
    employees?: number | null;
    city?: string | null;
    country?: string | null;
  }
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const db = supabaseAdmin();
  if (patch.name !== undefined && !patch.name.trim()) return { ok: false, reason: "name cannot be empty" };

  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name.trim();
  if (patch.domain !== undefined) {
    const clean = patch.domain?.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "") || null;
    if (clean) {
      // Dedupe collision check — exclude self.
      const { data: existing } = await db
        .from("companies")
        .select("id,name")
        .eq("domain", clean)
        .neq("id", companyId)
        .maybeSingle();
      if (existing) return { ok: false, reason: `Another company already uses ${clean}: ${existing.name}` };
    }
    row.domain = clean;
  }
  if (patch.industry !== undefined) row.industry = patch.industry?.trim() || null;
  if (patch.employees !== undefined) row.employees = patch.employees;
  if (patch.city !== undefined) row.city = patch.city?.trim() || null;
  if (patch.country !== undefined) row.country = patch.country?.trim() || null;

  const { error } = await db.from("companies").update(row).eq("id", companyId);
  if (error) return { ok: false, reason: error.message };
  revalidatePath("/companies");
  revalidatePath("/pipeline");
  return { ok: true };
}

export async function deleteCompany(companyId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const db = supabaseAdmin();
  const { error } = await db.from("companies").delete().eq("id", companyId);
  if (error) return { ok: false, reason: error.message };
  revalidatePath("/companies");
  revalidatePath("/contacts");
  revalidatePath("/pipeline");
  return { ok: true };
}

export async function updateContact(
  contactId: string,
  patch: {
    firstName?: string;
    lastName?: string;
    email?: string | null;
    phone?: string | null;
    title?: string | null;
    companyId?: string | null;
  }
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const db = supabaseAdmin();
  if (patch.firstName !== undefined && !patch.firstName.trim()) return { ok: false, reason: "first name cannot be empty" };
  if (patch.lastName !== undefined && !patch.lastName.trim()) return { ok: false, reason: "last name cannot be empty" };

  const row: Record<string, unknown> = {};
  if (patch.firstName !== undefined) row.first_name = patch.firstName.trim();
  if (patch.lastName !== undefined) row.last_name = patch.lastName.trim();
  if (patch.email !== undefined) row.email = patch.email?.trim().toLowerCase() || null;
  if (patch.phone !== undefined) row.phone = patch.phone?.trim() || null;
  if (patch.title !== undefined) row.title = patch.title?.trim() || null;
  if (patch.companyId !== undefined) row.company_id = patch.companyId;

  const { error } = await db.from("contacts").update(row).eq("id", contactId);
  if (error) return { ok: false, reason: error.message };
  revalidatePath("/contacts");
  revalidatePath("/companies");
  return { ok: true };
}

export async function deleteContact(contactId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const db = supabaseAdmin();
  const { error } = await db.from("contacts").delete().eq("id", contactId);
  if (error) return { ok: false, reason: error.message };
  revalidatePath("/contacts");
  revalidatePath("/companies");
  revalidatePath("/pipeline");
  return { ok: true };
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
