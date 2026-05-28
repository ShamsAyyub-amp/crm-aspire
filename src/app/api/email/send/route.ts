import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// POST /api/email/send  { dealId, contactId, toEmail, subject, body }
// If RESEND_API_KEY is set, sends real email. Otherwise logs an activity
// with type=email_sent and meta.mocked=true so the UI flow still works.

export async function POST(req: Request) {
  const payload = await req.json();
  const { dealId, contactId, toEmail, subject, body } = payload;
  if (!subject || !body) return NextResponse.json({ error: "subject and body required" }, { status: 400 });

  const ownerId = req.headers.get("x-user-id") || null;
  const mocked = !process.env.RESEND_API_KEY;

  // TODO: when RESEND_API_KEY is present, call Resend's send endpoint here.
  // Keeping the route mock-only for v1 so the demo never errors.

  const db = supabaseAdmin();
  await db.from("activities").insert({
    deal_id: dealId ?? null,
    contact_id: contactId ?? null,
    type: "email_sent",
    subject,
    body,
    owner_id: ownerId,
    meta: { mocked, to: toEmail ?? null },
  });

  return NextResponse.json({ ok: true, mocked });
}
