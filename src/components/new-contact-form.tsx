"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Modal from "./modal";
import SearchableSelect, { type SelectOption } from "./searchable-select";
import { createContact, updateContact } from "@/app/actions";
import type { Company, Contact } from "@/lib/types";

export default function NewContactForm({
  open,
  onClose,
  companies,
  defaultCompanyId,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  companies: Company[];
  defaultCompanyId?: string;
  initial?: Contact;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const isEdit = !!initial;

  const [first, setFirst] = useState(initial?.first_name ?? "");
  const [last, setLast] = useState(initial?.last_name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [companyId, setCompanyId] = useState<string | null>(initial?.company_id ?? defaultCompanyId ?? null);

  const companyOpts: SelectOption[] = useMemo(
    () =>
      companies
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({ id: c.id, label: c.name, hint: c.industry ?? undefined })),
    [companies]
  );

  function reset() {
    if (isEdit) return;
    setFirst("");
    setLast("");
    setEmail("");
    setPhone("");
    setTitle("");
    setCompanyId(defaultCompanyId ?? null);
    setErr(null);
  }

  function submit() {
    setErr(null);
    if (!first.trim() || !last.trim()) {
      setErr("First and last name required.");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErr("Email looks malformed.");
      return;
    }
    start(async () => {
      const payload = {
        firstName: first,
        lastName: last,
        email: email || null,
        phone: phone || null,
        title: title || null,
        companyId,
      };
      const r = isEdit && initial
        ? await updateContact(initial.id, payload)
        : await createContact(payload);
      if (!r.ok) {
        setErr(r.reason);
        return;
      }
      reset();
      onClose();
      router.refresh();
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow={isEdit ? "Editing" : "New entry"}
      title={isEdit ? "Edit contact" : "Add contact"}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" required>
            <input autoFocus className="input" value={first} onChange={(e) => setFirst(e.target.value)} />
          </Field>
          <Field label="Last name" required>
            <input className="input" value={last} onChange={(e) => setLast(e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Email">
            <input
              className="input"
              type="email"
              placeholder="first@company.com"
              value={email ?? ""}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Phone">
            <input
              className="input"
              type="tel"
              placeholder="+1-555-…"
              value={phone ?? ""}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Title">
          <input
            className="input"
            placeholder="e.g. VP Operations"
            value={title ?? ""}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>

        <Field label="Company">
          <SearchableSelect
            options={companyOpts}
            value={companyId}
            onChange={setCompanyId}
            placeholder="Pick a company…"
          />
        </Field>

        {err && <p className="text-sm text-danger-600">{err}</p>}

        <div className="flex justify-end gap-2 pt-2 border-t border-ink-150">
          <button className="btn-ghost" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit} disabled={pending}>
            {pending ? (isEdit ? "Saving…" : "Adding…") : isEdit ? "Save changes" : "Add contact"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow-ink block mb-1">
        {label}
        {required && <span className="text-brand-600 ml-1">·</span>}
      </span>
      {children}
    </label>
  );
}
