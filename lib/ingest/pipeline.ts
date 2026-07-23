import "server-only";

import { classifyAiError, logAiError } from "@/lib/ai/errors";
import { db } from "@/lib/db";
import { downloadDocumentFile } from "@/lib/storage";

import { chunkPages } from "./chunk";
import { embedTexts, IngestBudgetExceededError } from "./embed";
import { extractPages } from "./extract";

/**
 * Runs the full ingestion pipeline for an already-uploaded document:
 * download from storage → extract text → chunk → store chunks → embed →
 * write vectors. Sets Document.status to READY on success, FAILED on error.
 */
/**
 * Wall-clock ceiling for one document's ingestion, shared across every
 * embedding batch.
 *
 * The upload route runs with maxDuration = 60s. This leaves headroom for the
 * download, extraction, chunking, and the vector write that follow embedding.
 * Because it is ONE deadline for the whole document — not a fresh budget per
 * batch — total ingestion time can never exceed it regardless of chunk count.
 */
const INGEST_BUDGET_MS = 50_000;

export async function ingestDocument(documentId: string): Promise<void> {
  // Anchored the moment ingestion begins. Every embedding batch is measured
  // against this same instant, so batch N cannot restart the clock.
  const deadline = Date.now() + INGEST_BUDGET_MS;

  const document = await db.document.findUniqueOrThrow({
    where: { id: documentId },
    include: { matter: { select: { firmId: true } } },
  });

  await db.document.update({
    where: { id: documentId },
    data: { status: "PROCESSING" },
  });

  try {
    const file = await downloadDocumentFile(document.storagePath);
    const pages = await extractPages(file, document.mimeType);
    const chunks = chunkPages(pages);
    if (chunks.length === 0) {
      throw new Error("No text could be extracted from this document.");
    }

    // Replace any chunks from a previous (failed) run, then insert fresh.
    await db.$transaction([
      db.citation.deleteMany({ where: { chunk: { documentId } } }),
      db.documentChunk.deleteMany({ where: { documentId } }),
      db.documentChunk.createMany({
        data: chunks.map((chunk) => ({
          documentId,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          pageNumber: chunk.pageNumber,
        })),
      }),
    ]);

    const vectors = await embedTexts(
      chunks.map((c) => c.content),
      { deadline }
    );
    const stored = await db.documentChunk.findMany({
      where: { documentId },
      orderBy: { chunkIndex: "asc" },
      select: { id: true, chunkIndex: true },
    });

    // One statement rather than one round trip per chunk. A 34-page PDF is
    // ~96 chunks, and 96 sequential UPDATEs over a pooled connection was a
    // material part of the ingestion time budget.
    const ids: string[] = [];
    const literals: string[] = [];
    for (const row of stored) {
      const vector = vectors[row.chunkIndex];
      if (!vector) continue;
      ids.push(row.id);
      literals.push(`[${vector.join(",")}]`);
    }

    if (ids.length > 0) {
      await db.$executeRaw`
        UPDATE "DocumentChunk" AS c
        SET embedding = data.vec::vector
        FROM (
          SELECT
            unnest(${ids}::text[]) AS id,
            unnest(${literals}::text[]) AS vec
        ) AS data
        WHERE c.id = data.id
      `;
    }

    await db.document.update({
      where: { id: documentId },
      data: { status: "READY" },
    });

    await db.auditLog.create({
      data: {
        firmId: document.matter.firmId,
        matterId: document.matterId,
        action: "DOCUMENT_INGESTED",
        entityType: "Document",
        entityId: documentId,
        detail: {
          fileName: document.fileName,
          pages: pages.length,
          chunks: chunks.length,
        },
      },
    });
  } catch (error) {
    // FAILED is set unconditionally in this catch, so a document can never be
    // left stuck in PROCESSING by a thrown error, budget or otherwise.
    await db.document.update({
      where: { id: documentId },
      data: { status: "FAILED" },
    });

    // The budget-exceeded case is its own thing: nothing went wrong with the
    // provider, we simply ran out of execution time. Recording it as a
    // classified AiError would mislabel it "the AI service is unavailable".
    const detail =
      error instanceof IngestBudgetExceededError
        ? {
            reason:
              "Processing exceeded the execution budget. This document is too large to ingest in a single request — split it into smaller files and re-upload.",
            code: "BUDGET_EXCEEDED",
            embeddedBatches: error.embeddedBatches,
            totalBatches: error.totalBatches,
          }
        : (() => {
            // Classified, not raw. AuditTimeline renders every detail value as
            // a chip, so putting error.message here wrote the provider's JSON
            // body into the activity panel — permanently, since audit rows are
            // never deleted. The full payload goes to the server log instead.
            const classified = classifyAiError(error);
            logAiError("ingestDocument", classified);
            return { reason: classified.userMessage, code: classified.code };
          })();

    await db.auditLog.create({
      data: {
        firmId: document.matter.firmId,
        matterId: document.matterId,
        action: "DOCUMENT_INGEST_FAILED",
        entityType: "Document",
        entityId: documentId,
        detail,
      },
    });
    throw error;
  }
}
