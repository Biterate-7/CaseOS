"use client";

import { Check, Copy, Send } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
    <div className="flex flex-col gap-4">
      <form onSubmit={submit} className="flex flex-col gap-2.5 sm:flex-row">
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="colleague@example.com"
          aria-label="Email address to invite"
          disabled={isPending}
          className="flex-1"
        />
        <div className="w-full sm:w-40">
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            aria-label="Role"
            disabled={isPending}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {roleLabel[r]}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" disabled={isPending || !email.trim()}>
          <Send />
          {isPending ? "Creating…" : "Create invite"}
        </Button>
      </form>

      {error && (
        <p role="alert" className="text-body-sm text-rejected">
          {error}
        </p>
      )}

      {link && (
        <div className="flex flex-col gap-3 rounded-2xl border border-grounded-border bg-grounded-surface/50 p-5">
          <p className="text-body-sm font-medium text-grounded">
            Invitation created. Send this link to the person you invited —
            CaseOS does not send email.
          </p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-surface-lowest/60 px-3 py-2 font-mono text-meta-xs ring-1 ring-border">
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
          <p className="font-mono text-meta-xs leading-relaxed text-muted-foreground">
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
