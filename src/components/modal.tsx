"use client";

import { useEffect } from "react";

export default function Modal({
  open,
  title,
  eyebrow,
  onClose,
  children,
  width = "max-w-lg",
}: {
  open: boolean;
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 bg-ink-900/40 flex items-start justify-center pt-20 px-4"
      onClick={onClose}
    >
      <div
        className={`w-full ${width} card-elevated p-0 animate-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-ink-200 flex items-center justify-between">
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            <h3 className="display-headline text-ink-900 text-2xl mt-0.5">{title}</h3>
          </div>
          <button
            className="text-ink-400 hover:text-ink-900 transition-colors"
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
