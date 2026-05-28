import { supabaseAdmin } from "@/lib/supabase";
import { listUsers } from "@/lib/user";
import { moneyCompact } from "@/lib/format";
import { OPEN_STAGES } from "@/lib/types";
import type { Company, Contact, Deal } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Companies() {
  const db = supabaseAdmin();
  const [companiesR, contactsR, dealsR, users] = await Promise.all([
    db.from("companies").select("*").order("name"),
    db.from("contacts").select("*"),
    db.from("deals").select("*"),
    listUsers(),
  ]);
  const companies = (companiesR.data as Company[]) ?? [];
  const contacts = (contactsR.data as Contact[]) ?? [];
  const deals = (dealsR.data as Deal[]) ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Companies</h1>
        <p className="text-sm text-ink-500">{companies.length} companies.</p>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-50 text-ink-500">
            <tr>
              <Th>Name</Th>
              <Th>Industry</Th>
              <Th>Employees</Th>
              <Th>Location</Th>
              <Th>Contacts</Th>
              <Th>Open pipeline</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {companies.map((co) => {
              const cs = contacts.filter((c) => c.company_id === co.id);
              const open = deals.filter((d) => d.company_id === co.id && OPEN_STAGES.includes(d.stage));
              const openValue = open.reduce((a, b) => a + b.value_cents, 0);
              return (
                <tr key={co.id} className="hover:bg-ink-50">
                  <Td>
                    <div className="font-medium">{co.name}</div>
                    {co.domain && <div className="text-xs text-ink-500">{co.domain}</div>}
                  </Td>
                  <Td>{co.industry ?? "—"}</Td>
                  <Td className="tabular-nums">{co.employees?.toLocaleString() ?? "—"}</Td>
                  <Td>{[co.city, co.country].filter(Boolean).join(", ") || "—"}</Td>
                  <Td className="tabular-nums">{cs.length}</Td>
                  <Td className="tabular-nums">{moneyCompact(openValue)}</Td>
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
