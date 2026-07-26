"use client";

import { useState, useTransition } from "react";

import { Select } from "@/components/ui/select";
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
    <li className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-border sm:flex-row sm:items-center">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-highest font-mono text-meta-xs text-foreground">
        {initials(member.name)}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-label-sm text-foreground">
          {member.name}
          {isSelf && (
            <span className="ml-2 font-mono text-meta-xs text-muted-foreground">
              you
            </span>
          )}
        </p>
        <p className="mt-0.5 truncate font-mono text-meta-xs text-muted-foreground">
          {member.email} · joined {formatDate(member.createdAt)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {canManage ? (
          <div className="w-36">
            <Select
              value={role}
              onChange={(e) => update(e.target.value as Role)}
              disabled={isPending}
              aria-label={`Role for ${member.name}`}
              size="sm"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {roleLabel[r]}
                </option>
              ))}
            </Select>
          </div>
        ) : (
          <span className="font-mono text-meta-xs text-muted-foreground">
            {roleLabel[role]}
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="text-body-sm text-rejected sm:w-full">
          {error}
        </p>
      )}
    </li>
  );
}

export { MemberRow };
