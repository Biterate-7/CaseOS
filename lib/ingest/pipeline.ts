import "server-only";

import { db } from "@/lib/db";
import { downloadDocumentFile } from "@/lib/storage";

import { chunkPages } from "./chunk";
import { embedTexts } from "./embed";
import { extractPages } from "./extract";

/**
 * Runs the full ingestion pipeline for an already-uploaded document:
 * download from storage → extract text → chunk → store chunks → embed →
 * write vectors. Sets Document.status to READY on success, FAILED on error.
 */
export async function ingestDocument(documentId: string): Promise<void> {
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

    const vectors = await embedTexts(chunks.map((c) => c.content));
    const stored = await db.documentChunk.findMany({
      where: { documentId },
      orderBy: { chunkIndex: "asc" },
      select: { id: true, chunkIndex: true },
    });
    for (const row of stored) {
      const vector = vectors[row.chunkIndex];
      await db.$executeRaw`
        UPDATE "DocumentChunk"
        SET embedding = ${`[${vector.join(",")}]`}::vector
        WHERE id = ${row.id}
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
    await db.document.update({
      where: { id: documentId },
      data: { status: "FAILED" },
    });
    await db.auditLog.create({
      data: {
        firmId: document.matter.firmId,
        matterId: document.matterId,
        action: "DOCUMENT_INGEST_FAILED",
        entityType: "Document",
        entityId: documentId,
        detail: { error: error instanceof Error ? error.message : String(error) },
      },
    });
    throw error;
  }
}
