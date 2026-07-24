-- External Research with Verified Sources.
--
-- Adds the DOCUMENT_PLUS_EXTERNAL knowledge mode, a table of server-verified
-- external citations (one row per surviving [En] marker), and a TTL cache of
-- URL-verification results so a URL cited across many questions is not
-- re-fetched every time.
--
-- Written by hand rather than via `migrate dev --create-only`: the schema diff
-- against the Supabase session pooler was disconnecting (P1017), and the delta
-- is small and unambiguous. ADD VALUE runs fine inside the deploy transaction
-- on PG12+ because the new value is not *used* in this migration.

-- AlterEnum
ALTER TYPE "KnowledgeMode" ADD VALUE 'DOCUMENT_PLUS_EXTERNAL';

-- CreateTable
CREATE TABLE "ExternalCitation" (
    "id" TEXT NOT NULL,
    "aiInteractionId" TEXT NOT NULL,
    "marker" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "publishedAt" TEXT,
    "url" TEXT NOT NULL,
    "finalUrl" TEXT,
    "domain" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "httpStatus" INTEGER,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalCitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalSourceCache" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "finalUrl" TEXT,
    "httpStatus" INTEGER,
    "ok" BOOLEAN NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalSourceCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExternalCitation_aiInteractionId_idx" ON "ExternalCitation"("aiInteractionId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalSourceCache_url_key" ON "ExternalSourceCache"("url");

-- AddForeignKey
ALTER TABLE "ExternalCitation" ADD CONSTRAINT "ExternalCitation_aiInteractionId_fkey" FOREIGN KEY ("aiInteractionId") REFERENCES "AIInteraction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
