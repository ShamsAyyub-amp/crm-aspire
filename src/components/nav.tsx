import Link from "next/link";
import type { User } from "@/lib/types";
import UserSwitcher from "./user-switcher";
import { initials } from "@/lib/format";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/coach", label: "Coach", highlight: true },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/analytics", label: "Analytics" },
  { href: "/tasks", label: "Tasks" },
  { href: "/sequences", label: "Sequences" },
  { href: "/contacts", label: "Contacts" },
  { href: "/companies", label: "Companies" },
  { href: "/integrations", label: "Integrations" },
];

export default function Nav({ me, users }: { me: User | null; users: User[] }) {
  const now = new Date();
  const datestamp = now
    .toLocaleDateString("en-US", { weekday: "short", day: "2-digit", month: "short" })
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 bg-ink-50/90 backdrop-blur-md border-b border-ink-200">
      {/* Top "masthead" rule — distinct from generic SaaS nav bars. */}
      <div className="max-w-7xl mx-auto px-6 pt-2.5 flex items-center justify-between text-2xs eyebrow-ink">
        <span>Pipelytics · No. {String(now.getDate()).padStart(2, "0")}</span>
        <span className="ticker">{datestamp}</span>
      </div>
      <div className="max-w-7xl mx-auto px-6 pt-1.5 pb-3 flex items-center gap-6 border-t border-ink-150 mt-2">
        <Link href="/dashboard" className="flex items-baseline gap-2 group">
          <span
            className="display-headline text-[1.55rem] text-ink-900"
            style={{ fontVariationSettings: "'opsz' 144, 'wght' 600, 'SOFT' 30, 'WONK' 1" }}
          >
            Pipelytics
          </span>
          <span className="display-italic text-sm text-brand-600 hidden sm:inline">
            the coach
          </span>
        </Link>
        <nav className="flex items-center gap-0.5 ml-3 overflow-x-auto -mb-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={
                l.highlight
                  ? "px-2.5 py-1.5 text-sm font-medium text-brand-700 hover:text-brand-800 hover:bg-brand-50 rounded-md inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
                  : "px-2.5 py-1.5 text-sm text-ink-600 hover:text-ink-900 hover:bg-ink-100 rounded-md whitespace-nowrap transition-colors"
              }
            >
              {l.highlight && (
                <span className="relative flex w-1.5 h-1.5">
                  <span className="animate-soft-pulse absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-500" />
                </span>
              )}
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden md:inline eyebrow-ink">Acting as</span>
          <UserSwitcher me={me} users={users} />
          <div className="w-8 h-8 rounded-full bg-ink-900 text-ink-50 text-xs font-semibold flex items-center justify-center ring-1 ring-ink-200">
            {me ? initials(me.name) : "?"}
          </div>
        </div>
      </div>
    </header>
  );
}
