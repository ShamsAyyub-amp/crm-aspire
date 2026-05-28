import { supabaseAdmin } from "@/lib/supabase";
import { listUsers } from "@/lib/user";
import { OPEN_STAGES, STAGES } from "@/lib/types";
import type { Company, Contact, Deal, User } from "@/lib/types";
import PipelineBoard from "@/components/pipeline-board";
import NewDealButton from "@/components/new-deal-button";

export const dynamic = "force-dynamic";

export default async function Pipeline() {
  const db = supabaseAdmin();
  const [dealsR, companiesR, contactsR, users] = await Promise.all([
    db.from("deals").select("*").in("stage", OPEN_STAGES),
    db.from("companies").select("*"),
    db.from("contacts").select("*"),
    listUsers(),
  ]);
  const deals = (dealsR.data as Deal[]) ?? [];
  const companies = (companiesR.data as Company[]) ?? [];
  const contacts = (contactsR.data as Contact[]) ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-1.5">The Board</div>
          <h1 className="display-headline text-ink-900 text-4xl">Pipeline</h1>
          <p className="text-sm text-ink-500">Move deals between stages. Health and weighted value update live.</p>
        </div>
        <NewDealButton companies={companies} contacts={contacts} />
      </div>
      <PipelineBoard
        deals={deals}
        companies={companies}
        contacts={contacts}
        users={users}
        stages={STAGES.filter((s) => OPEN_STAGES.includes(s.id))}
      />
    </div>
  );
}
