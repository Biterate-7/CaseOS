/**
 * Re-embeds every document in the database.
 *
 * Required after changing EMBEDDING_MODEL or EMBEDDING_DIMENSIONS. pgvector
 * cannot compare vectors of different widths, so a matter holding vectors from
 * two different models fails at query time with a dimension mismatch rather
 * than silently degrading.
 *
 * Specifically needed for the move off the local bge-small embedder (384-dim)
 * to Gemini embeddings (768-dim by default).
 *
 * DESTRUCTIVE: ingestDocument replaces a document's chunks, and Citation rows
 * point at chunks — so existing citations on past AI answers are deleted. The
 * AIInteraction rows themselves (prompt, response, review status, audit trail)
 * are untouched, but their answers lose the links back to source passages.
 * There is no way to preserve them: the passages they referenced no longer
 * exist as the same rows.
 *
 *   npm run db:reset-embeddings
 */
import "dotenv/config";

import { db } from "../lib/db";
import { embeddingDimensions, embeddingModel } from "../lib/ingest/embed";
import { ingestDocument } from "../lib/ingest/pipeline";

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const documents = await db.document.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, fileName: true, storagePath: true },
  });

  const citationCount = await db.citation.count();

  console.log(`Model:      ${embeddingModel}`);
  console.log(`Dimensions: ${embeddingDimensions}`);
  console.log(`Documents:  ${documents.length}`);
  console.log(`Citations that will be deleted: ${citationCount}`);
  console.log("");

  if (documents.length === 0) {
    console.log("Nothing to re-embed.");
    return;
  }

  if (dryRun) {
    console.log("--dry-run: no changes made.");
    for (const doc of documents) console.log(`  would re-embed: ${doc.title}`);
    return;
  }

  let ok = 0;
  let failed = 0;

  for (const [index, doc] of documents.entries()) {
    const label = `[${index + 1}/${documents.length}] ${doc.title}`;

    if (!doc.storagePath) {
      console.log(`${label} — SKIPPED (no stored file)`);
      failed++;
      continue;
    }

    try {
      process.stdout.write(`${label} … `);
      await ingestDocument(doc.id);
      console.log("ok");
      ok++;
    } catch (error) {
      console.log(
        `FAILED: ${error instanceof Error ? error.message : String(error)}`
      );
      failed++;
    }
  }

  console.log("");
  console.log(`Re-embedded ${ok} document(s), ${failed} failed.`);
  if (failed > 0) {
    console.log(
      "Failed documents are marked FAILED and contribute nothing to answers."
    );
  }
}

main()
  .catch((error) => {
    console.error("FAILED:", error?.message ?? error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
