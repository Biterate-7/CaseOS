-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "uploadedById" TEXT;

-- CreateIndex
CREATE INDEX "Document_uploadedById_idx" ON "Document"("uploadedById");

-- CreateIndex
CREATE INDEX "Document_createdAt_idx" ON "Document"("createdAt");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill the uploader from the audit trail.
--
-- DOCUMENT_UPLOADED entries record who performed each upload, and for
-- documents created before this column existed that is the only surviving
-- record of it. DISTINCT ON takes the earliest entry per document so a
-- re-ingested file keeps its original uploader.
--
-- Documents with no matching audit row keep NULL, which the UI renders as
-- "Unknown" rather than attributing them to anyone.
UPDATE "Document" d
SET "uploadedById" = a."userId"
FROM (
  SELECT DISTINCT ON ("entityId") "entityId", "userId"
  FROM "AuditLog"
  WHERE "action" = 'DOCUMENT_UPLOADED'
    AND "entityType" = 'Document'
    AND "entityId" IS NOT NULL
    AND "userId" IS NOT NULL
  ORDER BY "entityId", "createdAt" ASC
) a
WHERE d."id" = a."entityId"
  AND d."uploadedById" IS NULL;
