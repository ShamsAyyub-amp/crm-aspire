"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import NewContactForm from "./new-contact-form";
import type { Company } from "@/lib/types";

export default function NewContactButton({ companies }: { companies: Company[] }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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
        New contact
      </button>
      <NewContactForm open={open} onClose={close} companies={companies} />
    </>
  );
}
