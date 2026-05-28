"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Modal from "./modal";
import { createCompany } from "@/app/actions";

const INDUSTRIES = [
  "SaaS",
  "Financial",
  "Healthcare",
  "Manufacturing",
  "Retail",
  "Logistics",
  "Energy",
  "CPG",
  "Travel",
  "Legal",
  "Aerospace",
  "Agriculture",
  "Other",
];

export default function NewCompanyForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [industry, setIndustry] = useState("SaaS");
  const [employees, setEmployees] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");

  function reset() {
    setName("");
    setDomain("");
    setIndustry("SaaS");
    setEmployees("");
    setCity("");
    setCountry("");
    setErr(null);
  }

  function submit() {
    setErr(null);
    if (!name.trim()) {
      setErr("Company name required.");
      return;
    }
    const emp = employees ? parseInt(employees, 10) : null;
    if (employees && (Number.isNaN(emp!) || emp! < 0)) {
      setErr("Employees must be a non-negative number.");
      return;
    }
    start(async () => {
      const r = await createCompany({
        name,
        domain: domain || null,
        industry,
        employees: emp,
        city: city || null,
        country: country || null,
      });
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
    <Modal open={open} onClose={onClose} eyebrow="New entry" title="Add company">
      <div className="space-y-4">
        <Field label="Name" required>
          <input
            autoFocus
            className="input"
            placeholder="e.g. Northwind Logistics"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Domain">
            <input
              className="input"
              placeholder="acme.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
          </Field>
          <Field label="Industry">
            <select className="input" value={industry} onChange={(e) => setIndustry(e.target.value)}>
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Employees">
            <input
              className="input"
              type="number"
              min={0}
              placeholder="e.g. 250"
              value={employees}
              onChange={(e) => setEmployees(e.target.value)}
            />
          </Field>
          <Field label="City">
            <input className="input" placeholder="Chicago" value={city} onChange={(e) => setCity(e.target.value)} />
          </Field>
          <Field label="Country">
            <input className="input" placeholder="US" value={country} onChange={(e) => setCountry(e.target.value)} />
          </Field>
        </div>

        {err && <p className="text-sm text-danger-600">{err}</p>}

        <div className="flex justify-end gap-2 pt-2 border-t border-ink-150">
          <button className="btn-ghost" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit} disabled={pending}>
            {pending ? "Adding…" : "Add company"}
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
