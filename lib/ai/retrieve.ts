import "server-only";

import { db } from "@/lib/db";
import { embedQuery } from "@/lib/ingest/embed";

export type RetrievedChunk = {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  fileName: string;
  pageNumber: number | null;
  chunkIndex: number;
  content: string;
  distance: number;
};

const TOP_K = 8;

/**
 * Matter-scoped similarity search. The matter boundary is enforced inside the
 * SQL join — chunks from other matters never enter the candidate set. Callers
 * are responsible for having already verified the matter belongs to the
 * requesting user's firm.
 */
export async function retrieveChunks(
  matterId: string,
  question: string
): Promise<RetrievedChunk[]> {
  const queryVector = await embedQuery(question);
  const vectorLiteral = `[${queryVector.join(",")}]`;

  const rows = await db.$queryRaw<
    {
      chunkId: string;
      documentId: string;
      documentTitle: string;
      fileName: string;
      pageNumber: number | null;
      chunkIndex: number;
      content: string;
      distance: number;
    }[]
  >`
    SELECT
      c.id            AS "chunkId",
      d.id            AS "documentId",
      d.title         AS "documentTitle",
      d."fileName"    AS "fileName",
      c."pageNumber"  AS "pageNumber",
      c."chunkIndex"  AS "chunkIndex",
      c.content       AS "content",
      (c.embedding <=> ${vectorLiteral}::vector) AS "distance"
    FROM "DocumentChunk" c
    JOIN "Document" d ON d.id = c."documentId"
    WHERE d."matterId" = ${matterId}
      AND d.status = 'READY'
      AND c.embedding IS NOT NULL
    ORDER BY c.embedding <=> ${vectorLiteral}::vector ASC
    LIMIT ${TOP_K}
  `;

  return rows;
}
