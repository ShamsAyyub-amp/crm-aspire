import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function assertEnv() {
  if (!url || !anonKey) {
    throw new Error(
      "Supabase env vars missing. Copy .env.local.example to .env.local and fill NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
}

// Server-only admin client. v1 has RLS off, so reads/writes use this.
export function supabaseAdmin() {
  assertEnv();
  return createClient(url!, serviceKey || anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
