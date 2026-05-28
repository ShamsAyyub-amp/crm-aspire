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
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-ink-150">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-6">
        <Link href="/dashboard" className="flex items-center gap-2.5 font-semibold tracking-tight group">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white text-xs font-bold shadow-sm group-hover:shadow-md transition-shadow">
            P
          </span>
          <span className="text-ink-900">
            Pipelytics
            <span className="text-ink-400 font-normal text-xs hidden sm:inline ml-2">· AI sales coach</span>
          </span>
        </Link>
        <nav className="flex items-center gap-0.5 ml-2 overflow-x-auto">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={
                l.highlight
                  ? "px-3 py-1.5 text-sm font-medium text-brand-700 hover:text-brand-800 hover:bg-brand-50 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
                  : "px-3 py-1.5 text-sm text-ink-600 hover:text-ink-900 hover:bg-ink-100 rounded-lg whitespace-nowrap transition-colors"
              }
            >
              {l.highlight && (
                <span className="relative flex w-1.5 h-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-500" />
                </span>
              )}
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden md:inline text-2xs text-ink-400 uppercase tracking-wider">Acting as</span>
          <UserSwitcher me={me} users={users} />
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-brand-700 text-xs font-semibold flex items-center justify-center ring-1 ring-brand-200">
            {me ? initials(me.name) : "?"}
          </div>
        </div>
      </div>
    </header>
  );
}
