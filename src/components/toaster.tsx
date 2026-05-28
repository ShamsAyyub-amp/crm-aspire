"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Toast = {
  id: string;
  source: "slack" | "system";
  title: string;
  body?: string;
};

type Ctx = { push: (t: Omit<Toast, "id">) => void };
const ToastCtx = createContext<Ctx | null>(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast outside ToasterProvider");
  return ctx;
}

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((curr) => [...curr, { ...t, id }]);
    setTimeout(() => setToasts((curr) => curr.filter((x) => x.id !== id)), 6500);
  }, []);

  // Listen for a global "deal-won" event so any client component can fire a toast
  // without prop-drilling.
  useEffect(() => {
    function onWon(e: Event) {
      const detail = (e as CustomEvent).detail as { dealName: string; value: string; owner?: string };
      push({
        source: "slack",
        title: `🏆 Deal Won: ${detail.dealName}`,
        body: `${detail.value}${detail.owner ? ` · closed by ${detail.owner}` : ""}`,
      });
    }
    window.addEventListener("crm:deal-won", onWon as EventListener);
    return () => window.removeEventListener("crm:deal-won", onWon as EventListener);
  }, [push]);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2 w-[320px]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="bg-white border border-ink-100 rounded-lg shadow-lg p-3 flex gap-3 items-start animate-in"
          >
            <SlackMark />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-ink-500 font-medium">
                {t.source === "slack" ? "#sales-wins · Slack" : "System"}
              </div>
              <div className="text-sm font-medium truncate">{t.title}</div>
              {t.body && <div className="text-xs text-ink-500 truncate">{t.body}</div>}
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

function SlackMark() {
  return (
    <span className="w-6 h-6 rounded shrink-0 bg-[#4A154B] text-white text-[10px] font-bold flex items-center justify-center">
      #
    </span>
  );
}
