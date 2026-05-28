import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { Sequence, SequenceEnrollment } from "@/lib/types";

// GET /api/deals/[id]/enrollments → { sequences, enrollments, contactId }
// Returns enrollments tied to this deal (or to its primary contact) + the
// templates available so the UI can offer enrollment.

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = supabaseAdmin();

  const { data: deal } = await db.from("deals").select("id,primary_contact_id").eq("id", id).single();
  const contactId = deal?.primary_contact_id ?? null;

  const [seqR, enrR] = await Promise.all([
    db.from("sequences").select("id,name,steps").eq("active", true).order("created_at", { ascending: false }),
    contactId
      ? db
          .from("sequence_enrollments")
          .select("id,sequence_id,contact_id,status,current_step,paused_reason,last_step_at,next_step_at,sequences(name,steps)")
          .or(`deal_id.eq.${id},contact_id.eq.${contactId}`)
          .order("enrolled_at", { ascending: false })
      : db
          .from("sequence_enrollments")
          .select("id,sequence_id,contact_id,status,current_step,paused_reason,last_step_at,next_step_at,sequences(name,steps)")
          .eq("deal_id", id)
          .order("enrolled_at", { ascending: false }),
  ]);

  const sequences = ((seqR.data as Sequence[]) ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    steps_count: Array.isArray(s.steps) ? s.steps.length : 0,
  }));

  type EnrollmentRow = {
    id: string;
    sequence_id: string;
    contact_id: string;
    status: SequenceEnrollment["status"];
    current_step: number;
    paused_reason: string | null;
    last_step_at: string | null;
    next_step_at: string | null;
    sequences: { name: string; steps: any[] } | { name: string; steps: any[] }[] | null;
  };
  const enrollments = ((enrR.data as unknown as EnrollmentRow[]) ?? []).map((e) => {
    const seq = Array.isArray(e.sequences) ? e.sequences[0] : e.sequences;
    return ({
    id: e.id,
    sequence_id: e.sequence_id,
    contact_id: e.contact_id,
    status: e.status,
    current_step: e.current_step,
    paused_reason: e.paused_reason,
    last_step_at: e.last_step_at,
    next_step_at: e.next_step_at,
    sequence_name: seq?.name ?? "Sequence",
    steps_count: Array.isArray(seq?.steps) ? seq.steps.length : 0,
  });
  });

  return NextResponse.json({ sequences, enrollments, contactId });
}
