-- Workspace-level role changes need their own notification type.
--
-- PROJECT_ROLE_CHANGED already exists but means something different: a
-- project membership role, not the workspace-wide Role. Reusing it would make
-- the notification feed lie about what changed.
--
-- ALTER TYPE ... ADD VALUE is additive and cannot be rolled back in the same
-- transaction, which is why it is alone in this migration.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'WORKSPACE_ROLE_CHANGED';
