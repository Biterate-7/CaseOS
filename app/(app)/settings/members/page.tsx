import { Clock, MailPlus, Users } from "lucide-react";

import { InviteForm } from "@/components/settings/invite-form";
import { InvitationRow } from "@/components/settings/invitation-row";
import { MemberRow } from "@/components/settings/member-row";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeading } from "@/components/ui/section-heading";
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
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-margin-mobile py-8 lg:px-8 lg:py-12">
      <PageHeader
        title="Members"
        description={`Everyone with access to ${user.firmName}. Projects, documents, and AI answers are shared across the workspace.`}
      />

      {isAdmin && (
        <section
          aria-label="Invite someone"
          className="rounded-xl bg-card p-6 ring-1 ring-border"
        >
          <SectionHeading icon={MailPlus} title="Invite someone" as="h2" />
          <div className="mt-5">
            <InviteForm />
          </div>
        </section>
      )}

      {invitations.length > 0 && (
        <section aria-label="Pending invitations" className="flex flex-col gap-4">
          <SectionHeading
            icon={Clock}
            title={
              <>
                Pending invitations
                <span className="ml-1.5 text-meta-xs text-muted-foreground tabular-nums">
                  ({invitations.length})
                </span>
              </>
            }
            as="h2"
          />
          <ul className="flex flex-col gap-2.5">
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

      <section aria-label="Members" className="flex flex-col gap-4">
        <SectionHeading
          icon={Users}
          title={countLabel(members.length, "member")}
          as="h2"
        />

        {members.length === 0 ? (
          <div className="rounded-xl bg-card/40 ring-1 ring-border">
            <EmptyState
              icon={Users}
              size="sm"
              title="No members yet"
              description="Invite someone to collaborate on this workspace."
            />
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
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
        <p className="rounded-xl bg-surface-highest/40 px-4 py-3 text-body-sm leading-relaxed text-muted-foreground ring-1 ring-border">
          Only workspace administrators can invite people or change roles.
        </p>
      )}
    </div>
  );
}
