"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import NewCompanyForm from "./new-company-form";
import ConfirmDialog from "./confirm-dialog";
import { deleteCompany } from "@/app/actions";
import type { Company } from "@/lib/types";

export default function CompanyRowActions({
  company,
  contactCount,
  dealCount,
}: {
  company: Company;
  contactCount: number;
  dealCount: number;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function confirmDelete() {
    setErr(null);
    start(async () => {
      const r = await deleteCompany(company.id);
      if (!r.ok) {
        setErr(r.reason);
        return;
      }
      setConfirmOpen(false);
      router.refresh();
    });
  }

  const requiresTyped = contactCount > 0 || dealCount > 0;

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

      <NewCompanyForm open={editOpen} onClose={() => setEditOpen(false)} initial={company} />

      <ConfirmDialog
        open={confirmOpen}
        title={`Delete ${company.name}?`}
        message={
          requiresTyped
            ? "This company has linked records. Deleting will unlink — not delete — them."
            : "This company will be permanently removed."
        }
        detail={
          (contactCount > 0 || dealCount > 0) ? (
            <ul className="list-disc list-inside text-2xs text-ink-500 space-y-0.5">
              {contactCount > 0 && <li>{contactCount} contact{contactCount === 1 ? "" : "s"} will lose this company link.</li>}
              {dealCount > 0 && <li>{dealCount} deal{dealCount === 1 ? "" : "s"} will lose this company link.</li>}
            </ul>
          ) : undefined
        }
        destructive
        confirmLabel="Delete company"
        requireTyped={requiresTyped ? company.name : undefined}
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
