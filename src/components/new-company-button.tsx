"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import NewCompanyForm from "./new-company-form";

export default function NewCompanyButton() {
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
        New company
      </button>
      <NewCompanyForm open={open} onClose={close} />
    </>
  );
}
