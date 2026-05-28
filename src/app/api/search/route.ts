import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/search?q=... → flat list of mixed results
// Used by the Cmd+K palette.

type Result = { kind: "deal" | "contact" | "company"; id: string; label: string; sub?: string };

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const db = supabaseAdmin();
  const like = `%${q}%`;

  // When empty, return a sensible "recent / featured" set.
  if (!q) {
    const [deals, contacts, companies] = await Promise.all([
      db.from("deals").select("id,name,stage").order("updated_at", { ascending: false }).limit(8),
      db.from("contacts").select("id,first_name,last_name,email").order("created_at", { ascending: false }).limit(4),
      db.from("companies").select("id,name,industry").order("created_at", { ascending: false }).limit(4),
    ]);
    return NextResponse.json({ results: pack(deals.data ?? [], contacts.data ?? [], companies.data ?? []) });
  }

  const [deals, contacts, companies] = await Promise.all([
    db.from("deals").select("id,name,stage").ilike("name", like).limit(8),
    db.from("contacts").select("id,first_name,last_name,email").or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like}`).limit(8),
    db.from("companies").select("id,name,industry").or(`name.ilike.${like},domain.ilike.${like}`).limit(8),
  ]);

  return NextResponse.json({ results: pack(deals.data ?? [], contacts.data ?? [], companies.data ?? []) });
}

function pack(deals: any[], contacts: any[], companies: any[]): Result[] {
  const out: Result[] = [];
  for (const d of deals) out.push({ kind: "deal", id: d.id, label: d.name, sub: d.stage });
  for (const c of contacts) out.push({ kind: "contact", id: c.id, label: `${c.first_name} ${c.last_name}`, sub: c.email ?? undefined });
  for (const co of companies) out.push({ kind: "company", id: co.id, label: co.name, sub: co.industry ?? undefined });
  return out;
}
