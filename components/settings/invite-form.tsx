"use client";

import { Check, Copy, Send } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inviteToWorkspace } from "@/lib/actions/invitations";
import { roleLabel, type Role } from "@/lib/format";

const ROLES: Role[] = ["ADMIN", "ATTORNEY", "PARALEGAL", "STAFF"];

/**
 * Invite form.
 *
 * There is no email provider configured, so nothing is sent — the invitation
 * link is surfaced for the admin to pass on themselves. That is stated
 * plainly rather than showing a "sent!" toast for an email that never left,
 * which would leave the recipient waiting for a message that does not exist.
 *
 * The link is the credential. Anyone holding it can join the workspace as the
 * chosen role, so the UI says so.
 */
function InviteForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("ATTORNEY");
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLink(null);
    setCopied(false);

    startTransition(async () => {
      const result = await inviteToWorkspace(email, role);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLink(`${window.location.origin}/invite/${result.data.token}`);
      setEmail("");
    });
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy. Select the link and copy it manually.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="colleague@example.com"
          aria-label="Email address to invite"
          disabled={isPending}
          className="h-9 flex-1 text-sm"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          aria-label="Role"
          disabled={isPending}
          className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {roleLabel[r]}
            </option>
          ))}
        </select>
        <Button type="submit" size="lg" disabled={isPending || !email.trim()}>
          <Send className="size-3.5" />
          {isPending ? "Creating…" : "Create invite"}
        </Button>
      </form>

      {error && (
        <p role="alert" className="text-xs text-rejected">
          {error}
        </p>
      )}

      {link && (
        <div className="flex flex-col gap-2 rounded-lg border border-grounded-border bg-grounded-surface/50 p-3">
          <p className="text-xs font-medium text-grounded">
            Invitation created. Send this link to the person you invited —
            CaseOS does not send email.
          </p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded border bg-card px-2 py-1.5 font-mono text-[0.6875rem]">
              {link}
            </code>
            <Button size="sm" variant="outline" onClick={copy}>
              {copied ? (
                <>
                  <Check className="size-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <p className="text-[0.6875rem] leading-relaxed text-muted-foreground">
            Anyone with this link can join the workspace as the role you chose.
            It expires in 7 days. Creating another invite for the same address
            replaces this link.
          </p>
        </div>
      )}
    </div>
  );
}

export { InviteForm };
