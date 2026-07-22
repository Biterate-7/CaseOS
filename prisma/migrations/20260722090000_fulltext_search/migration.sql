-- Full-text search over document passages.
--
-- Replaces `content ILIKE '%term%'`, which cannot use an index and forces a
-- sequential scan of every chunk in the workspace. A 34-page PDF is ~96
-- chunks; a few hundred documents is tens of thousands of rows to scan per
-- keystroke of a debounced search box.

-- Generated column rather than a trigger-maintained one: Postgres recomputes
-- it on write, so it cannot drift from `content`, and there is no trigger to
-- forget when rows are inserted from a script.
ALTER TABLE "DocumentChunk"
  ADD COLUMN "contentTsv" tsvector
  GENERATED ALWAYS AS (to_tsvector('english', "content")) STORED;

-- GIN is the right index for tsvector: built for many-keys-per-row containment
-- queries, which is exactly @@ against a tsquery.
CREATE INDEX "DocumentChunk_contentTsv_idx"
  ON "DocumentChunk" USING GIN ("contentTsv");

-- Trigram matching gives typo tolerance on document and project names, where
-- full-text stemming does not help ("Hendriks" should still find
-- "Hendricks"). Applied only to the small tables — a trigram index over every
-- chunk body would be large and is unnecessary, since prose search is handled
-- by the tsvector above.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "Document_title_trgm_idx"
  ON "Document" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "Document_fileName_trgm_idx"
  ON "Document" USING GIN ("fileName" gin_trgm_ops);
CREATE INDEX "Matter_title_trgm_idx"
  ON "Matter" USING GIN ("title" gin_trgm_ops);
