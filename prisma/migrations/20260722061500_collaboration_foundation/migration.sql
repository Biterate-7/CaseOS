-- Collaboration foundation: project roles, workspace invitations, notifications.
--
-- Written by hand rather than generated, because the generated version drops
-- `_MatterMembers` (the implicit many-to-many behind Matter.members) without
-- carrying its rows anywhere. That table holds real memberships; they are
-- copied into the new explicit table before the old one is dropped.

-- CreateEnum
CREATE TYPE "ProjectRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');
CREATE TYPE "NotificationType" AS ENUM (
  'PROJECT_SHARED',
  'PROJECT_ROLE_CHANGED',
  'PROJECT_ACCESS_REMOVED',
  'INVITATION_ACCEPTED',
  'DOCUMENT_UPLOADED',
  'REVIEW_COMPLETED',
  'THREAD_REPLY',
  'THREAD_MENTION',
  'THREAD_RESOLVED'
);

-- CreateTable: explicit Matter <-> User join carrying a role.
CREATE TABLE "MatterMember" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ProjectRole" NOT NULL DEFAULT 'VIEWER',
    "addedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatterMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MatterMember_matterId_userId_key" ON "MatterMember"("matterId", "userId");
CREATE INDEX "MatterMember_userId_idx" ON "MatterMember"("userId");
CREATE INDEX "MatterMember_matterId_idx" ON "MatterMember"("matterId");

-- Carry existing memberships across, BEFORE the old table is dropped.
--
-- They become OWNER: the only way to be a member before this migration was to
-- create the project, and demoting an existing creator would lock them out of
-- their own work. The join to Matter and User discards any orphaned pair
-- rather than failing the whole migration on it.
INSERT INTO "MatterMember" ("id", "matterId", "userId", "role", "createdAt")
SELECT
    gen_random_uuid()::text,
    j."A",
    j."B",
    'OWNER'::"ProjectRole",
    COALESCE(m."createdAt", CURRENT_TIMESTAMP)
FROM "_MatterMembers" j
JOIN "Matter" m ON m."id" = j."A"
JOIN "User"   u ON u."id" = j."B"
ON CONFLICT ("matterId", "userId") DO NOTHING;

-- DropTable
DROP TABLE "_MatterMembers";

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ATTORNEY',
    "token" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invitedById" TEXT NOT NULL,
    "acceptedById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");
CREATE INDEX "Invitation_firmId_status_idx" ON "Invitation"("firmId", "status");
CREATE INDEX "Invitation_email_status_idx" ON "Invitation"("email", "status");

-- At most one live invitation per address per workspace. Enforced here rather
-- than in application code so a double-submit cannot create two.
CREATE UNIQUE INDEX "Invitation_firmId_email_pending_key"
    ON "Invitation"("firmId", "email")
    WHERE "status" = 'PENDING';

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT,
    "actorId" TEXT,
    "matterId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "MatterMember" ADD CONSTRAINT "MatterMember_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatterMember" ADD CONSTRAINT "MatterMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
