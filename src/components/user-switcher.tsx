"use client";

import { useTransition } from "react";
import { switchUser } from "@/app/actions";
import type { User } from "@/lib/types";

export default function UserSwitcher({ me, users }: { me: User | null; users: User[] }) {
  const [pending, start] = useTransition();
  return (
    <select
      className="input !w-auto !py-1 text-sm"
      defaultValue={me?.id ?? ""}
      disabled={pending}
      onChange={(e) => start(() => switchUser(e.target.value))}
    >
      {users.map((u) => (
        <option key={u.id} value={u.id}>
          {u.name}
        </option>
      ))}
    </select>
  );
}
