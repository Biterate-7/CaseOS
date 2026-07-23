-- Makes the stuck-document reconcile query cheap.
--
-- reconcileStuckDocuments scans for PROCESSING rows older than a cutoff on
-- every workspace and documents-page load. Without an index that is a full
-- Document scan each time. A PARTIAL index over only PROCESSING rows is tiny —
-- at most a handful of rows at any moment, usually zero — and turns the scan
-- into an index probe.
CREATE INDEX IF NOT EXISTS "Document_processing_updatedAt_idx"
  ON "Document" ("updatedAt")
  WHERE status = 'PROCESSING';
