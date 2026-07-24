-- Enhanced Research: record which knowledge the model was allowed to draw on.
-- DOCUMENT_ONLY is the default so every pre-existing interaction is
-- (accurately) recorded as document-only.
--
-- NOTE: `prisma migrate dev --create-only` also emitted DROP INDEX statements
-- for the expression/GIN indexes created by 20260722090000_fulltext_search
-- (they are raw-SQL-only and invisible to the schema diff). Those were removed
-- by hand — this migration must only add the enum and column.

-- CreateEnum
CREATE TYPE "KnowledgeMode" AS ENUM ('DOCUMENT_ONLY', 'DOCUMENT_PLUS_AI');

-- AlterTable
ALTER TABLE "AIInteraction" ADD COLUMN     "knowledgeMode" "KnowledgeMode" NOT NULL DEFAULT 'DOCUMENT_ONLY';
