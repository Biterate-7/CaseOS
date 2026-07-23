import "server-only";

import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";

/**
 * Recovers documents stranded in PROCESSING.
 *
 * Ingestion sets PROCESSING, then READY or FAILED in a catch. If the process
 * dies in between — a crash, a deployment swap, or the serverless function
 * hitting its wall-clock limit — that catch never runs and the row stays
 * PROCESSING forever. Nothing else would ever move it.
 *
 * Legitimate ingestion is bounded to ~50s by the shared budget and hard-capped
 * at the route's 60s maxDuration, so anything PROCESSING for ten minutes is
 * unambiguously dead. The threshold is deliberately far above the real ceiling
 * so a genuinely slow-but-alive run can never be reaped by mistake.
 *
 * The transition is a single UPDATE ... RETURNING rather than
 * findMany-then-updateMany. That matters for concurrency: two page loads (or a
 * page load and the cron) can reconcile at the same moment, and RETURNING
 * gives each caller exactly the rows *it* transitioned. The sets are disjoint,
 * so no document is double-counted and no timeout gets two audit entries.
 */

const STUCK_THRESHOLD_MS = 10 * 60 * 1000;

type ReconciledRow = {
  id: string;
  fileName: string;
  matterId: string;
  firmId: string;
  minutesStuck: number;
};

export async function reconcileStuckDocuments(
  scope: { firmId: string } | "all"
): Promise<number> {
  const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MS);

  const firmFilter =
    scope === "all"
      ? Prisma.empty
      : Prisma.sql`AND m."firmId" = ${scope.firmId}`;

  // Sets updatedAt = now() as well, so a reaped row cannot match the cutoff
  // again on the next pass. The status guard inside the WHERE makes the whole
  // statement idempotent — a row already flipped by a concurrent caller is not
  // in this caller's PROCESSING set.
  const rows = await db.$queryRaw<ReconciledRow[]>`
    UPDATE "Document" d
    SET status = 'FAILED', "updatedAt" = now()
    FROM "Matter" m
    WHERE d."matterId" = m."id"
      AND d.status = 'PROCESSING'
      AND d."updatedAt" < ${cutoff}
      ${firmFilter}
    RETURNING
      d."id" AS "id",
      d."fileName" AS "fileName",
      d."matterId" AS "matterId",
      m."firmId" AS "firmId",
      CEIL(EXTRACT(EPOCH FROM (now() - d."updatedAt")) / 60)::int AS "minutesStuck"
  `;

  if (rows.length === 0) return 0;

  await db.auditLog.createMany({
    data: rows.map((row) => ({
      firmId: row.firmId,
      matterId: row.matterId,
      action: "DOCUMENT_INGEST_TIMED_OUT",
      entityType: "Document",
      entityId: row.id,
      detail: {
        fileName: row.fileName,
        reason:
          "Ingestion did not finish within the time limit — the process was likely interrupted. The document was marked failed and can be retried.",
        minutesStuck: row.minutesStuck,
      },
    })),
  });

  console.warn(
    JSON.stringify({
      event: "documents_reconciled",
      scope: scope === "all" ? "all" : scope.firmId,
      count: rows.length,
      ids: rows.map((r) => r.id),
    })
  );

  return rows.length;
}
