"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import NewDealForm from "./new-deal-form";
import type { Company, Contact, DealStage } from "@/lib/types";

export default function NewDealButton({
  companies,
  contacts,
  defaultStage,
}: {
  companies: Company[];
  contacts: Contact[];
  defaultStage?: DealStage;
}) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Auto-open when palette deep-links here.
  useEffect(() => {
    if (sp.get("new") === "1") setOpen(true);
  }, [sp]);

  function close() {
    setOpen(false);
    if (sp.get("new") === "1") router.replace(pathname);
  }

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}>
        <span className="text-base leading-none -mt-0.5">+</span>
        New deal
      </button>
      <NewDealForm
        open={open}
        onClose={close}
        companies={companies}
        contacts={contacts}
        defaultStage={defaultStage}
      />
    </>
  );
}
