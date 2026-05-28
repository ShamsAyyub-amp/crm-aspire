import { supabaseAdmin } from "@/lib/supabase";
import { listUsers } from "@/lib/user";
import { moneyCompact } from "@/lib/format";
import { OPEN_STAGES } from "@/lib/types";
import type { Company, Contact, Deal } from "@/lib/types";
import NewCompanyButton from "@/components/new-company-button";
import CompanyRowActions from "@/components/company-row-actions";

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
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-1.5">The Directory</div>
          <h1 className="display-headline text-ink-900 text-4xl">Companies</h1>
          <p className="text-sm text-ink-500">{companies.length} companies.</p>
        </div>
        <NewCompanyButton />
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
              <Th className="w-20 text-right">Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {companies.map((co) => {
              const cs = contacts.filter((c) => c.company_id === co.id);
              const open = deals.filter((d) => d.company_id === co.id && OPEN_STAGES.includes(d.stage));
              const openValue = open.reduce((a, b) => a + b.value_cents, 0);
              const dealCount = deals.filter((d) => d.company_id === co.id).length;
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
                  <Td className="text-right">
                    <CompanyRowActions company={co} contactCount={cs.length} dealCount={dealCount} />
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`text-left font-medium px-3 py-2 text-xs uppercase tracking-wider ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}
