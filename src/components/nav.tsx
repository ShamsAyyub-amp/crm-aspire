import Link from "next/link";
import type { User } from "@/lib/types";
import UserSwitcher from "./user-switcher";
import { initials } from "@/lib/format";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/contacts", label: "Contacts" },
  { href: "/companies", label: "Companies" },
];

export default function Nav({ me, users }: { me: User | null; users: User[] }) {
  return (
    <header className="bg-white border-b border-ink-100">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-brand-600 text-white text-xs">CR</span>
          <span>crm-aspire</span>
        </Link>
        <nav className="flex items-center gap-1 ml-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-3 py-1.5 text-sm text-ink-700 hover:text-ink-900 hover:bg-ink-100 rounded-md"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-ink-500">Acting as</span>
          <UserSwitcher me={me} users={users} />
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 text-xs font-semibold flex items-center justify-center">
            {me ? initials(me.name) : "?"}
          </div>
        </div>
      </div>
    </header>
  );
}
