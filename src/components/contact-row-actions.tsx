"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import NewContactForm from "./new-contact-form";
import ConfirmDialog from "./confirm-dialog";
import { deleteContact } from "@/app/actions";
import type { Company, Contact } from "@/lib/types";

export default function ContactRowActions({
  contact,
  companies,
}: {
  contact: Contact;
  companies: Company[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function confirmDelete() {
    setErr(null);
    start(async () => {
      const r = await deleteContact(contact.id);
      if (!r.ok) {
        setErr(r.reason);
        return;
      }
      setConfirmOpen(false);
      router.refresh();
    });
  }

  const fullName = `${contact.first_name} ${contact.last_name}`;

  return (
    <>
      <div className="flex items-center gap-0.5">
        <IconButton title="Edit" onClick={() => setEditOpen(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
          </svg>
        </IconButton>
        <IconButton title="Delete" tone="danger" onClick={() => setConfirmOpen(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
          </svg>
        </IconButton>
      </div>

      <NewContactForm open={editOpen} onClose={() => setEditOpen(false)} companies={companies} initial={contact} />

      <ConfirmDialog
        open={confirmOpen}
        title={`Delete ${fullName}?`}
        message="The contact will be permanently removed."
        detail={
          <ul className="list-disc list-inside text-2xs text-ink-500 space-y-0.5">
            <li>Activities authored against this contact stay (the contact link goes to null).</li>
            <li>Sequence enrollments for this contact will be cancelled.</li>
            <li>Deals where this is the primary contact will have that field cleared.</li>
          </ul>
        }
        destructive
        confirmLabel="Delete contact"
        pending={pending}
        onConfirm={confirmDelete}
        onClose={() => setConfirmOpen(false)}
      />

      {err && <div className="text-2xs text-danger-600 mt-1">{err}</div>}
    </>
  );
}

function IconButton({
  children,
  title,
  onClick,
  tone,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  tone?: "danger";
}) {
  const cls = tone === "danger"
    ? "p-1.5 rounded-md text-ink-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
    : "p-1.5 rounded-md text-ink-400 hover:text-ink-900 hover:bg-ink-100 transition-colors";
  return (
    <button className={cls} title={title} aria-label={title} onClick={onClick}>
      {children}
    </button>
  );
}
