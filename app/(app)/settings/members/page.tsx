import { Clock, MailPlus, Users } from "lucide-react";

import { InviteForm } from "@/components/settings/invite-form";
import { InvitationRow } from "@/components/settings/invitation-row";
import { MemberRow } from "@/components/settings/member-row";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { countLabel } from "@/lib/format";

export const metadata = { title: "Members" };
export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";

  const [members, invitations] = await Promise.all([
    db.user.findMany({
      where: { firmId: user.firmId },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    }),
    // Only pending invitations are actionable; accepted ones are represented
    // by the member rows above, and revoked ones are noise.
    db.invitation.findMany({
      where: { firmId: user.firmId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        token: true,
        expiresAt: true,
        createdAt: true,
        invitedBy: { select: { name: true } },
      },
    }),
  ]);

  const now = Date.now();

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
      <header className="mb-6">
        <h1 className="font-serif text-2xl font-semibold tracking-tight">
          Members
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everyone with access to {user.firmName}. Projects, documents, and AI
          answers are shared across the workspace.
        </p>
      </header>

      {isAdmin && (
        <section
          aria-label="Invite someone"
          className="mb-6 rounded-xl border bg-card p-4 shadow-xs"
        >
          <h2 className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold">
            <MailPlus className="size-4 text-muted-foreground" />
            Invite someone
          </h2>
          <InviteForm />
        </section>
      )}

      {invitations.length > 0 && (
        <section aria-label="Pending invitations" className="mb-6">
          <h2 className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold">
            <Clock className="size-4 text-muted-foreground" />
            Pending invitations
            <span className="text-xs font-normal text-muted-foreground tabular-nums">
              ({invitations.length})
            </span>
          </h2>
          <ul className="flex flex-col gap-2">
            {invitations.map((invitation) => (
              <InvitationRow
                key={invitation.id}
                invitation={{
                  id: invitation.id,
                  email: invitation.email,
                  role: invitation.role,
                  token: invitation.token,
                  invitedByName: invitation.invitedBy.name,
                  createdAt: invitation.createdAt,
                  expiresAt: invitation.expiresAt,
                  expired: invitation.expiresAt.getTime() < now,
                }}
                canManage={isAdmin}
              />
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Members">
        <h2 className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold">
          <Users className="size-4 text-muted-foreground" />
          {countLabel(members.length, "member")}
        </h2>

        {members.length === 0 ? (
          <EmptyState
            icon={Users}
            size="sm"
            title="No members yet"
            description="Invite someone to collaborate on this workspace."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                isSelf={member.id === user.id}
                canManage={isAdmin}
              />
            ))}
          </ul>
        )}
      </section>

      {!isAdmin && (
        <p className="mt-6 rounded-lg border bg-muted/40 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          Only workspace administrators can invite people or change roles.
        </p>
      )}
    </div>
  );
}
