"use client";

import { Check, Copy, Mail, X } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { revokeInvitation } from "@/lib/actions/invitations";
import { formatRelativeTime, roleLabel, type Role } from "@/lib/format";

type PendingInvitation = {
  id: string;
  email: string;
  role: Role;
  token: string;
  invitedByName: string;
  createdAt: Date;
  expiresAt: Date;
  /** Computed server-side; nothing sweeps PENDING rows to EXPIRED. */
  expired: boolean;
};

function InvitationRow({
  invitation,
  canManage,
}: {
  invitation: PendingInvitation;
  canManage: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/invite/${invitation.token}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy to clipboard.");
    }
  }

  function revoke() {
    setError(null);
    startTransition(async () => {
      const result = await revokeInvitation(invitation.id);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-border sm:flex-row sm:items-center">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-highest text-muted-foreground ring-1 ring-border">
        <Mail className="size-4" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-label-sm text-foreground">{invitation.email}</p>
        <p className="mt-0.5 truncate text-meta-xs text-muted-foreground">
          {roleLabel[invitation.role]} · invited by {invitation.invitedByName} ·{" "}
          {invitation.expired
            ? "expired"
            : `expires ${formatRelativeTime(invitation.expiresAt)}`}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <StatusBadge
          size="sm"
          tone={invitation.expired ? "rejected" : "pending"}
        >
          {invitation.expired ? "Expired" : "Pending"}
        </StatusBadge>

        {canManage && !invitation.expired && (
          <Button variant="ghost" size="sm" onClick={copyLink}>
            {copied ? (
              <>
                <Check className="size-3.5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                Link
              </>
            )}
          </Button>
        )}

        {canManage && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Revoke invitation for ${invitation.email}`}
            disabled={isPending}
            onClick={revoke}
            className="text-muted-foreground hover:text-rejected"
          >
            <X />
          </Button>
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

export { InvitationRow };
