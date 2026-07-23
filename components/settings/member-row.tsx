"use client";

import { useState, useTransition } from "react";

import { changeMemberRole } from "@/lib/actions/invitations";
import { formatDate, initials, roleLabel, type Role } from "@/lib/format";

const ROLES: Role[] = ["ADMIN", "ATTORNEY", "PARALEGAL", "STAFF"];

function MemberRow({
  member,
  isSelf,
  canManage,
}: {
  member: { id: string; name: string; email: string; role: string; createdAt: Date };
  isSelf: boolean;
  canManage: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState(member.role as Role);
  const [isPending, startTransition] = useTransition();

  function update(next: Role) {
    const previous = role;
    // Optimistic: the select reflects the choice immediately and rolls back if
    // the server refuses (last admin, self-demotion).
    setRole(next);
    setError(null);
    startTransition(async () => {
      const result = await changeMemberRole(member.id, next);
      if (!result.ok) {
        setRole(previous);
        setError(result.error);
      }
    });
  }

  return (
    <li className="flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-xs sm:flex-row sm:items-center">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-[0.6875rem] font-semibold text-secondary-foreground">
        {initials(member.name)}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {member.name}
          {isSelf && (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              you
            </span>
          )}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {member.email} · joined {formatDate(member.createdAt)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {canManage ? (
          <select
            value={role}
            onChange={(e) => update(e.target.value as Role)}
            disabled={isPending}
            aria-label={`Role for ${member.name}`}
            className="h-8 rounded-lg border border-input bg-background px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {roleLabel[r]}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-muted-foreground">
            {roleLabel[role]}
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="text-xs text-rejected sm:w-full">
          {error}
        </p>
      )}
    </li>
  );
}

export { MemberRow };
