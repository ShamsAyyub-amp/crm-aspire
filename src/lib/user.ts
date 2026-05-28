import { cookies } from "next/headers";
import { supabaseAdmin } from "./supabase";
import type { User } from "./types";

const COOKIE = "crm_current_user";
const DEFAULT_USER_ID = "11111111-1111-1111-1111-111111111111"; // Sam Chen

export async function getCurrentUserId(): Promise<string> {
  const store = await cookies();
  return store.get(COOKIE)?.value || DEFAULT_USER_ID;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const id = await getCurrentUserId();
    const db = supabaseAdmin();
    const { data } = await db.from("users").select("*").eq("id", id).single();
    return (data as User) || null;
  } catch {
    return null;
  }
}

export async function listUsers(): Promise<User[]> {
  try {
    const db = supabaseAdmin();
    const { data } = await db.from("users").select("*").order("name");
    return (data as User[]) || [];
  } catch {
    return [];
  }
}
