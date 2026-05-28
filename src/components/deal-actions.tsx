"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import NewDealForm from "./new-deal-form";
import ConfirmDialog from "./confirm-dialog";
import { deleteDeal } from "@/app/actions";
import type { Company, Contact, Deal } from "@/lib/types";

export default function DealActions({
  deal,
  companies,
  contacts,
}: {
  deal: Deal;
  companies: Company[];
  contacts: Contact[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function confirmDelete() {
    setErr(null);
    start(async () => {
      const r = await deleteDeal(deal.id);
      if (!r.ok) {
        setErr(r.reason);
        return;
      }
      router.push("/pipeline");
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button className="btn-secondary" onClick={() => setEditOpen(true)}>
          Edit
        </button>
        <button
          className="btn-ghost text-danger-600 hover:bg-danger-50"
          onClick={() => setConfirmOpen(true)}
        >
          Delete
        </button>
      </div>

      <NewDealForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        companies={companies}
        contacts={contacts}
        initial={deal}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this deal?"
        message={`"${deal.name}" will be permanently removed.`}
        detail={
          <ul className="list-disc list-inside text-2xs text-ink-500 space-y-0.5">
            <li>All activities logged on this deal will be deleted.</li>
            <li>All tasks linked to this deal will be deleted.</li>
            <li>Sequence enrollments tied to this deal will be unlinked.</li>
          </ul>
        }
        destructive
        confirmLabel="Delete deal"
        pending={pending}
        onConfirm={confirmDelete}
        onClose={() => setConfirmOpen(false)}
      />

      {err && <div className="text-sm text-danger-600 mt-2">{err}</div>}
    </>
  );
}
