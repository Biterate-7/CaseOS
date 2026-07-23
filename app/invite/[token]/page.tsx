import { SignInButton } from "@clerk/nextjs";
import { Building2, Check, MailWarning, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { AcceptInvitation } from "@/components/invite/accept-invitation";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { previewInvitation } from "@/lib/actions/invitations";
import { roleLabel } from "@/lib/format";

export const metadata = { title: "Workspace invitation" };
export const dynamic = "force-dynamic";

/**
 * Invitation landing page.
 *
 * Deliberately outside the `(app)` route group and absent from the middleware
 * matcher, because it has to render for a signed-out visitor — the whole
 * point is to tell someone who has never used CaseOS what they have been
 * invited to and get them signed in.
 *
 * It exposes only the workspace name, the inviter's name, and the invited
 * address: all things the recipient already has in the email that brought
 * them here. Nothing about the workspace's contents is revealed before
 * acceptance.
 */
export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await previewInvitation(token);

  if (!invitation) {
    return (
      <AuthShell>
        <div className="rounded-xl border bg-card p-6 text-center shadow-sm">
          <span className="mx-auto flex size-11 items-center justify-center rounded-xl border bg-muted text-muted-foreground">
            <MailWarning className="size-5" />
          </span>
          <h1 className="mt-4 font-serif text-lg font-semibold">
            This invitation link isn&apos;t valid
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            It may have been revoked, already used, or mistyped. Ask whoever
            invited you to send a new one.
          </p>
        </div>
      </AuthShell>
    );
  }

  const { workspaceName, inviterName, email, role, state } = invitation;

  const problem: Record<string, { title: string; body: string }> = {
    expired: {
      title: "This invitation has expired",
      body: `Invitations are valid for 7 days. Ask ${inviterName} to send another.`,
    },
    invalid: {
      title: "This invitation is no longer active",
      body: "It was revoked or has already been used.",
    },
    "wrong-account": {
      title: "Signed in with a different account",
      body: `This invitation was sent to ${email}. Sign out and sign back in with that address to accept it.`,
    },
    "has-other-workspace": {
      title: "Your account already has a workspace",
      body: "An account can belong to one workspace at a time. Sign in with a different account to accept this invitation.",
    },
    "already-member": {
      title: `You're already in ${workspaceName}`,
      body: "Nothing more to do — open the workspace to get started.",
    },
  };

  return (
    <AuthShell>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Building2 className="size-5" />
          </span>
          <p className="mt-4 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Workspace invitation
          </p>
          <h1 className="mt-1.5 font-serif text-xl font-semibold tracking-tight text-balance">
            {workspaceName}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">{inviterName}</span>{" "}
            invited <span className="font-medium text-foreground">{email}</span>{" "}
            to join as{" "}
            <span className="font-medium text-foreground">
              {roleLabel[role]}
            </span>
            .
          </p>
        </div>

        <div className="mt-6">
          {state === "ready" && <AcceptInvitation token={token} />}

          {state === "signed-out" && (
            <div className="flex flex-col gap-2">
              <SignInButton
                mode="modal"
                forceRedirectUrl={`/invite/${token}`}
                signUpForceRedirectUrl={`/invite/${token}`}
              >
                <Button className="w-full">Sign in to accept</Button>
              </SignInButton>
              <p className="text-center text-xs leading-relaxed text-muted-foreground">
                Use {email} — the invitation is tied to that address. You&apos;ll
                come straight back here.
              </p>
            </div>
          )}

          {state === "already-member" && (
            <Button
              className="w-full"
              nativeButton={false}
              render={<Link href="/dashboard" />}
            >
              <Check className="size-4" />
              Open workspace
            </Button>
          )}

          {problem[state] && state !== "already-member" && (
            <div className="flex flex-col gap-3">
              <p className="flex items-start gap-2 rounded-lg border border-pending-border bg-pending-surface/50 px-3 py-2.5 text-xs leading-relaxed text-pending">
                <TriangleAlert className="mt-px size-3.5 shrink-0" />
                <span>
                  <span className="font-medium">{problem[state].title}.</span>{" "}
                  {problem[state].body}
                </span>
              </p>
              <Button
                variant="outline"
                className="w-full"
                nativeButton={false}
                render={<Link href="/" />}
              >
                Back to CaseOS
              </Button>
            </div>
          )}
        </div>
      </div>
    </AuthShell>
  );
}
