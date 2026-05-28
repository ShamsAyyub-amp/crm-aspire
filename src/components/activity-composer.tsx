"use client";

import { useState, useTransition } from "react";
import { logActivity } from "@/app/actions";
import type { ActivityType } from "@/lib/types";

const TYPES: { id: ActivityType; label: string }[] = [
  { id: "note", label: "Note" },
  { id: "call", label: "Call" },
  { id: "meeting", label: "Meeting" },
  { id: "email_sent", label: "Email sent" },
  { id: "email_received", label: "Email received" },
  { id: "task", label: "Task" },
];

export default function ActivityComposer({
  dealId,
  contactId,
  contactEmail,
}: {
  dealId: string;
  contactId: string | null;
  contactEmail: string | null;
}) {
  const [type, setType] = useState<ActivityType>("note");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();

  function submit() {
    if (!subject && !body) return;
    start(async () => {
      await logActivity({
        dealId,
        contactId: contactId ?? undefined,
        type,
        subject: subject || undefined,
        body: body || undefined,
      });
      setSubject("");
      setBody("");
    });
  }

  return (
    <section className="card p-4">
      <div className="flex items-center gap-2 mb-2">
        <select
          className="input !w-auto !py-1 text-xs"
          value={type}
          onChange={(e) => setType(e.target.value as ActivityType)}
        >
          {TYPES.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
        <input
          className="input text-sm"
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>
      <textarea
        className="input text-sm min-h-[60px]"
        placeholder="Details (optional)"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-ink-400">
          {contactEmail ? `Linked to ${contactEmail}` : "No contact linked"}
        </span>
        <button className="btn-primary" disabled={pending} onClick={submit}>
          {pending ? "Logging…" : "Log activity"}
        </button>
      </div>
    </section>
  );
}
