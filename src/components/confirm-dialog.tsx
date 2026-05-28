"use client";

import { useEffect, useState } from "react";

export default function ConfirmDialog({
  open,
  title,
  message,
  detail,
  confirmLabel = "Confirm",
  destructive,
  requireTyped,
  onConfirm,
  onClose,
  pending,
}: {
  open: boolean;
  title: string;
  message: string;
  detail?: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  requireTyped?: string;
  onConfirm: () => void;
  onClose: () => void;
  pending?: boolean;
}) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!open) return;
    setTyped("");
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

  const canConfirm = !requireTyped || typed.trim() === requireTyped;

  return (
    <div
      className="fixed inset-0 z-50 bg-ink-900/40 flex items-start justify-center pt-24 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md card-elevated p-0 animate-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3 border-b border-ink-200">
          <div className={`eyebrow ${destructive ? "text-danger-600" : ""}`}>
            {destructive ? "Destructive action" : "Confirm"}
          </div>
          <h3 className="display-headline text-ink-900 text-2xl mt-1">{title}</h3>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-ink-700">{message}</p>
          {detail && <div className="text-sm text-ink-600">{detail}</div>}
          {requireTyped && (
            <div>
              <label className="eyebrow-ink block mb-1.5">
                Type <span className="font-mono normal-case tracking-normal text-ink-800">{requireTyped}</span> to confirm
              </label>
              <input
                autoFocus
                className="input"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={requireTyped}
              />
            </div>
          )}
        </div>
        <div className="px-5 pb-5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button
            className={destructive ? "btn-danger" : "btn-primary"}
            disabled={pending || !canConfirm}
            onClick={onConfirm}
          >
            {pending ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
