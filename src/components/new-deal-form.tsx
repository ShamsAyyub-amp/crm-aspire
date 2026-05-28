"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Modal from "./modal";
import SearchableSelect, { type SelectOption } from "./searchable-select";
import { createDeal } from "@/app/actions";
import { STAGES, type Company, type Contact, type DealStage } from "@/lib/types";

const SOURCES = ["Inbound", "Outbound", "Referral", "Partner", "Event", "Cold call", "Other"];

export default function NewDealForm({
  open,
  onClose,
  companies,
  contacts,
  defaultStage = "lead",
  defaultCompanyId,
}: {
  open: boolean;
  onClose: () => void;
  companies: Company[];
  contacts: Contact[];
  defaultStage?: DealStage;
  defaultCompanyId?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(defaultCompanyId ?? null);
  const [contactId, setContactId] = useState<string | null>(null);
  const [stage, setStage] = useState<DealStage>(defaultStage);
  const [value, setValue] = useState("");
  const [closeDate, setCloseDate] = useState("");
  const [source, setSource] = useState<string>("Inbound");

  const companyOpts: SelectOption[] = useMemo(
    () =>
      companies
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({ id: c.id, label: c.name, hint: c.industry ?? undefined })),
    [companies]
  );

  const contactOpts: SelectOption[] = useMemo(() => {
    const filtered = companyId ? contacts.filter((c) => c.company_id === companyId) : contacts;
    return filtered
      .slice()
      .sort((a, b) => a.last_name.localeCompare(b.last_name))
      .map((c) => ({
        id: c.id,
        label: `${c.first_name} ${c.last_name}`,
        hint: c.title ?? undefined,
      }));
  }, [contacts, companyId]);

  function reset() {
    setName("");
    setCompanyId(defaultCompanyId ?? null);
    setContactId(null);
    setStage(defaultStage);
    setValue("");
    setCloseDate("");
    setSource("Inbound");
    setErr(null);
  }

  function submit() {
    setErr(null);
    if (!name.trim()) {
      setErr("Deal name required.");
      return;
    }
    if (!companyId) {
      setErr("Pick a company.");
      return;
    }

    const valueCents = value ? Math.round(parseFloat(value) * 100) : 0;
    if (Number.isNaN(valueCents) || valueCents < 0) {
      setErr("Value must be a positive number.");
      return;
    }

    start(async () => {
      const r = await createDeal({
        name,
        companyId,
        primaryContactId: contactId,
        stage,
        valueCents,
        expectedCloseDate: closeDate || null,
        source,
      });
      if (!r.ok) {
        setErr(r.reason);
        return;
      }
      reset();
      onClose();
      router.push(`/deals/${r.dealId}`);
      router.refresh();
    });
  }

  return (
    <Modal open={open} onClose={onClose} eyebrow="New entry" title="Create deal" width="max-w-xl">
      <div className="space-y-4">
        <Field label="Deal name" required>
          <input
            autoFocus
            className="input"
            placeholder="e.g. Northwind — Year 2 expansion"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Company" required>
            <SearchableSelect
              options={companyOpts}
              value={companyId}
              onChange={(id) => {
                setCompanyId(id);
                setContactId(null);
              }}
              placeholder="Pick a company…"
              emptyLabel="No matches. Create one from the Companies page."
            />
          </Field>
          <Field label={`Primary contact${companyId ? "" : " (pick a company first)"}`}>
            <SearchableSelect
              options={contactOpts}
              value={contactId}
              onChange={setContactId}
              placeholder={companyId ? "Pick a contact…" : "—"}
              emptyLabel={
                companyId
                  ? "No contacts at this company yet. Create one from the Contacts page."
                  : "Pick a company first."
              }
              disabled={!companyId && contactOpts.length === 0}
            />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Stage">
            <select className="input" value={stage} onChange={(e) => setStage(e.target.value as DealStage)}>
              {STAGES.filter((s) => s.id !== "closed_won" && s.id !== "closed_lost").map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Value (USD)">
            <input
              className="input"
              type="number"
              min={0}
              placeholder="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </Field>
          <Field label="Expected close">
            <input
              className="input"
              type="date"
              value={closeDate}
              onChange={(e) => setCloseDate(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Source">
          <select className="input" value={source} onChange={(e) => setSource(e.target.value)}>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>

        {err && <p className="text-sm text-danger-600">{err}</p>}

        <div className="flex justify-end gap-2 pt-2 border-t border-ink-150">
          <button className="btn-ghost" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit} disabled={pending}>
            {pending ? "Creating…" : "Create deal"}
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
