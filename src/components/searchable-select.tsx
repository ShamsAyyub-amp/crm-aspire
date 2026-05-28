"use client";

import { useEffect, useId, useRef, useState } from "react";

export type SelectOption = { id: string; label: string; hint?: string };

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Pick one…",
  emptyLabel,
  disabled,
}: {
  options: SelectOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const selected = options.find((o) => o.id === value) ?? null;
  const ql = q.trim().toLowerCase();
  const filtered = ql
    ? options.filter((o) => o.label.toLowerCase().includes(ql) || (o.hint && o.hint.toLowerCase().includes(ql)))
    : options;

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function pick(idx: number) {
    const o = filtered[idx];
    if (!o) return;
    onChange(o.id);
    setOpen(false);
    setQ("");
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="input text-sm text-left flex items-center justify-between disabled:opacity-50"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((o) => !o);
          setActiveIdx(0);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
      >
        <span className={selected ? "text-ink-900" : "text-ink-400"}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="flex items-center gap-1.5">
          {selected && !disabled && (
            <span
              className="text-ink-400 hover:text-ink-700 cursor-pointer"
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange(null);
                }
              }}
              aria-label="Clear"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </span>
          )}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-400">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-ink-50 border border-ink-200 rounded-md shadow-elevated overflow-hidden">
          <div className="p-1.5 border-b border-ink-200">
            <input
              ref={inputRef}
              className="input !py-1 text-sm"
              placeholder="Search…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActiveIdx(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActiveIdx((i) => Math.max(i - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  pick(activeIdx);
                }
              }}
            />
          </div>
          <ul id={`${id}-list`} role="listbox" className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-sm text-ink-400 italic">{emptyLabel ?? "No matches."}</li>
            ) : (
              filtered.map((o, i) => (
                <li
                  key={o.id}
                  role="option"
                  aria-selected={i === activeIdx}
                  className={`px-3 py-2 cursor-pointer flex items-baseline gap-2 ${
                    i === activeIdx ? "bg-brand-50" : "hover:bg-ink-100"
                  }`}
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => pick(i)}
                >
                  <span className="text-sm text-ink-900 truncate flex-1">{o.label}</span>
                  {o.hint && <span className="text-2xs text-ink-500 truncate">{o.hint}</span>}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
