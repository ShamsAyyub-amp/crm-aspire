import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import { listUsers } from "@/lib/user";
import type { Company, Contact, User } from "@/lib/types";
import NewContactButton from "@/components/new-contact-button";

export const dynamic = "force-dynamic";

export default async function Contacts() {
  const db = supabaseAdmin();
  const [contactsR, companiesR, users] = await Promise.all([
    db.from("contacts").select("*").order("last_name"),
    db.from("companies").select("*"),
    listUsers(),
  ]);
  const contacts = (contactsR.data as Contact[]) ?? [];
  const companiesList = (companiesR.data as Company[]) ?? [];
  const companies = new Map(companiesList.map((c) => [c.id, c] as const));
  const usersMap = new Map(users.map((u) => [u.id, u] as const));

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-1.5">The Rolodex</div>
          <h1 className="display-headline text-ink-900 text-4xl">Contacts</h1>
          <p className="text-sm text-ink-500">{contacts.length} contacts.</p>
        </div>
        <NewContactButton companies={companiesList} />
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-50 text-ink-500">
            <tr>
              <Th>Name</Th>
              <Th>Title</Th>
              <Th>Company</Th>
              <Th>Email</Th>
              <Th>Phone</Th>
              <Th>Owner</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {contacts.map((c) => {
              const co = c.company_id ? companies.get(c.company_id) : null;
              const o = c.owner_id ? usersMap.get(c.owner_id) : null;
              return (
                <tr key={c.id} className="hover:bg-ink-50">
                  <Td><span className="font-medium">{c.first_name} {c.last_name}</span></Td>
                  <Td>{c.title ?? "—"}</Td>
                  <Td>{co?.name ?? "—"}</Td>
                  <Td>{c.email ? <a className="text-brand-600 hover:underline" href={`mailto:${c.email}`}>{c.email}</a> : "—"}</Td>
                  <Td>{c.phone ?? "—"}</Td>
                  <Td className="text-ink-500">{o?.name ?? "—"}</Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left font-medium px-3 py-2 text-xs uppercase tracking-wider">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}
