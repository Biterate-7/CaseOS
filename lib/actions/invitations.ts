"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Role } from "@/lib/format";

/**
 * Workspace invitations.
 *
 * Onboarding creates a new Firm for every signup, so without this there is no
 * way for two people to end up in the same workspace — and nothing to share a
 * project with. This is the dependency the collaboration features sit on.
 *
 * Authorisation rules, all enforced server-side:
 *   - Only workspace ADMINs may invite, revoke, or change roles.
 *   - Nobody may grant ADMIN unless they are one (no privilege escalation).
 *   - Tokens are 256 bits from a CSPRNG; the link is the only proof of
 *     invitation, so a guessable token is a workspace takeover.
 *   - Tokens expire, and expiry is re-checked at acceptance rather than
 *     trusted from a status column that a background job may not have run on.
 */

const INVITE_TTL_DAYS = 7;

export type Result<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string };

/** Roles that may be granted. OWNER-equivalent is ADMIN at workspace level. */
const ASSIGNABLE_ROLES: Role[] = ["ADMIN", "ATTORNEY", "PARALEGAL", "STAFF"];

function newToken(): string {
  // base64url: URL-safe without escaping, 43 chars for 32 bytes.
  return randomBytes(32).toString("base64url");
}

function normaliseEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

// Deliberately permissive: real validation is that the invite is unusable
// unless someone controls the address and signs in with it.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function inviteToWorkspace(
  rawEmail: string,
  rawRole: string
): Promise<Result<{ invitationId: string; token: string }>> {
  const user = await requireUser();

  if (user.role !== "ADMIN") {
    return { ok: false, error: "Only administrators can invite people." };
  }

  const email = normaliseEmail(rawEmail);
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const role = rawRole as Role;
  if (!ASSIGNABLE_ROLES.includes(role)) {
    return { ok: false, error: "Choose a role." };
  }

  // Already a member of this workspace?
  const existingMember = await db.user.findFirst({
    where: { email, firmId: user.firmId },
    select: { id: true },
  });
  if (existingMember) {
    return { ok: false, error: "That person is already in this workspace." };
  }

  // One live invitation per address per workspace. Re-inviting should extend
  // the existing one rather than leave two valid tokens outstanding.
  const existingInvite = await db.invitation.findFirst({
    where: { firmId: user.firmId, email, status: "PENDING" },
    select: { id: true },
  });

  const expiresAt = new Date(
    Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000
  );
  const token = newToken();

  const invitation = existingInvite
    ? await db.invitation.update({
        where: { id: existingInvite.id },
        // Rotating the token invalidates the previous link, so revoking by
        // re-inviting actually revokes.
        data: { token, role, expiresAt, invitedById: user.id },
        select: { id: true, token: true },
      })
    : await db.invitation.create({
        data: {
          firmId: user.firmId,
          email,
          role,
          token,
          expiresAt,
          invitedById: user.id,
        },
        select: { id: true, token: true },
      });

  await db.auditLog.create({
    data: {
      firmId: user.firmId,
      userId: user.id,
      action: existingInvite ? "INVITATION_RESENT" : "INVITATION_SENT",
      entityType: "Invitation",
      entityId: invitation.id,
      detail: { email, role },
    },
  });

  revalidatePath("/settings/members");
  return {
    ok: true,
    data: { invitationId: invitation.id, token: invitation.token },
  };
}

export async function revokeInvitation(
  invitationId: string
): Promise<Result> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    return { ok: false, error: "Only administrators can revoke invitations." };
  }

  // Scoped by firmId: an invitation id from another workspace is invisible.
  const invitation = await db.invitation.findFirst({
    where: { id: invitationId, firmId: user.firmId, status: "PENDING" },
    select: { id: true, email: true },
  });
  if (!invitation) {
    return { ok: false, error: "Invitation not found or already used." };
  }

  await db.$transaction([
    db.invitation.update({
      where: { id: invitation.id },
      // Token is rotated as well as the status flipped, so an already-sent
      // link cannot be replayed even if the status check were ever bypassed.
      data: { status: "REVOKED", token: newToken() },
    }),
    db.auditLog.create({
      data: {
        firmId: user.firmId,
        userId: user.id,
        action: "INVITATION_REVOKED",
        entityType: "Invitation",
        entityId: invitation.id,
        detail: { email: invitation.email },
      },
    }),
  ]);

  revalidatePath("/settings/members");
  return { ok: true };
}

export type InvitationPreview = {
  workspaceName: string;
  inviterName: string;
  email: string;
  role: Role;
  /** Null when the visitor is signed out; drives what the page offers. */
  viewerEmail: string | null;
  state:
    | "ready"
    | "signed-out"
    | "wrong-account"
    | "already-member"
    | "has-other-workspace"
    | "expired"
    | "invalid";
};

/**
 * Resolves a token for the accept page.
 *
 * Unauthenticated deliberately — the page must be able to say "you've been
 * invited to X, sign in to accept" before a session exists. It reveals only
 * the workspace name, inviter name, and the invited address, all of which the
 * recipient already knows from the email.
 */
export async function previewInvitation(
  token: string
): Promise<InvitationPreview | null> {
  const invitation = await db.invitation.findUnique({
    where: { token },
    select: {
      email: true,
      role: true,
      status: true,
      expiresAt: true,
      firmId: true,
      firm: { select: { name: true } },
      invitedBy: { select: { name: true } },
    },
  });
  if (!invitation) return null;

  const base = {
    workspaceName: invitation.firm.name,
    inviterName: invitation.invitedBy.name,
    email: invitation.email,
    role: invitation.role as Role,
  };

  const { userId: clerkId } = await auth();
  let viewerEmail: string | null = null;
  let viewerFirmId: string | null = null;

  if (clerkId) {
    const clerk = await currentUser();
    viewerEmail =
      clerk?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? null;
    const existing = await db.user.findUnique({
      where: { clerkId },
      select: { firmId: true },
    });
    viewerFirmId = existing?.firmId ?? null;
  }

  const state: InvitationPreview["state"] = (() => {
    if (invitation.status === "ACCEPTED") return "already-member";
    if (invitation.status !== "PENDING") return "invalid";
    // Expiry is computed, never trusted from the status column — nothing
    // sweeps PENDING rows to EXPIRED on a schedule.
    if (invitation.expiresAt.getTime() < Date.now()) return "expired";
    if (!clerkId) return "signed-out";
    if (viewerFirmId === invitation.firmId) return "already-member";
    if (viewerFirmId) return "has-other-workspace";
    if (viewerEmail !== invitation.email) return "wrong-account";
    return "ready";
  })();

  return { ...base, viewerEmail, state };
}

/**
 * Accepts an invitation, creating the User row inside the inviting workspace.
 *
 * This is the one path that puts a second person in a Firm, so every guard is
 * re-checked here rather than trusted from the preview: the preview runs on
 * the client's schedule and could be arbitrarily stale.
 */
export async function acceptInvitation(token: string): Promise<Result> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { ok: false, error: "Sign in to accept this invitation." };

  const clerk = await currentUser();
  const viewerEmail =
    clerk?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? null;
  if (!viewerEmail) {
    return { ok: false, error: "Your account has no email address." };
  }

  const invitation = await db.invitation.findUnique({
    where: { token },
    select: {
      id: true,
      firmId: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
      invitedById: true,
      firm: { select: { name: true } },
    },
  });
  if (!invitation) return { ok: false, error: "This invitation link is not valid." };
  if (invitation.status !== "PENDING") {
    return { ok: false, error: "This invitation has already been used or revoked." };
  }
  if (invitation.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "This invitation has expired. Ask for a new one." };
  }
  if (viewerEmail !== invitation.email) {
    return {
      ok: false,
      error: `This invitation was sent to ${invitation.email}. Sign in with that address to accept it.`,
    };
  }

  const existing = await db.user.findUnique({
    where: { clerkId },
    select: { id: true, firmId: true },
  });
  if (existing) {
    return {
      ok: false,
      error:
        existing.firmId === invitation.firmId
          ? "You are already in this workspace."
          : "This account already belongs to another workspace. Sign in with a different account to accept.",
    };
  }

  // Email is unique across the User table, so a stale row for this address in
  // another workspace would fail the insert. Caught explicitly to explain why.
  const emailTaken = await db.user.findUnique({
    where: { email: viewerEmail },
    select: { id: true },
  });
  if (emailTaken) {
    return {
      ok: false,
      error: "An account already exists for this email address.",
    };
  }

  await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        clerkId,
        email: viewerEmail,
        name:
          [clerk?.firstName, clerk?.lastName].filter(Boolean).join(" ").trim() ||
          viewerEmail.split("@")[0],
        role: invitation.role,
        firmId: invitation.firmId,
      },
      select: { id: true, name: true },
    });

    await tx.invitation.update({
      where: { id: invitation.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        acceptedById: created.id,
      },
    });

    await tx.auditLog.create({
      data: {
        firmId: invitation.firmId,
        userId: created.id,
        action: "INVITATION_ACCEPTED",
        entityType: "Invitation",
        entityId: invitation.id,
        detail: { email: viewerEmail, role: invitation.role },
      },
    });

    // Tells the inviter it landed. Pull-based, so no transport needed.
    await tx.notification.create({
      data: {
        userId: invitation.invitedById,
        firmId: invitation.firmId,
        type: "INVITATION_ACCEPTED",
        title: `${created.name} joined ${invitation.firm.name}`,
        href: "/settings/members",
        actorId: created.id,
      },
    });
  });

  revalidatePath("/settings/members");
  return { ok: true };
}

export async function changeMemberRole(
  userId: string,
  rawRole: string
): Promise<Result> {
  const actor = await requireUser();
  if (actor.role !== "ADMIN") {
    return { ok: false, error: "Only administrators can change roles." };
  }

  const role = rawRole as Role;
  if (!ASSIGNABLE_ROLES.includes(role)) {
    return { ok: false, error: "Unknown role." };
  }

  const target = await db.user.findFirst({
    where: { id: userId, firmId: actor.firmId },
    select: { id: true, role: true, name: true },
  });
  if (!target) return { ok: false, error: "Member not found." };

  // Removing your own admin rights could leave a workspace with no
  // administrator and no way to appoint one.
  if (target.id === actor.id && role !== "ADMIN") {
    return {
      ok: false,
      error: "You cannot remove your own administrator access.",
    };
  }

  if (target.role === "ADMIN" && role !== "ADMIN") {
    const admins = await db.user.count({
      where: { firmId: actor.firmId, role: "ADMIN" },
    });
    if (admins <= 1) {
      return {
        ok: false,
        error: "A workspace needs at least one administrator.",
      };
    }
  }

  await db.$transaction([
    db.user.update({ where: { id: target.id }, data: { role } }),
    db.auditLog.create({
      data: {
        firmId: actor.firmId,
        userId: actor.id,
        action: "MEMBER_ROLE_CHANGED",
        entityType: "User",
        entityId: target.id,
        detail: { name: target.name, from: target.role, to: role },
      },
    }),
    db.notification.create({
      data: {
        userId: target.id,
        firmId: actor.firmId,
        type: "WORKSPACE_ROLE_CHANGED",
        title: `Your role changed to ${role}`,
        actorId: actor.id,
      },
    }),
  ]);

  revalidatePath("/settings/members");
  return { ok: true };
}
