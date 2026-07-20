/**
 * End-to-end ingestion test against the real database and storage bucket.
 * Exercises the same modules the upload server action uses.
 * Run: npm run test:ingest  (needs --conditions=react-server for server-only imports)
 */
import "dotenv/config";

import { PDFDocument, StandardFonts } from "pdf-lib";

import { db } from "../lib/db";
import { ingestDocument } from "../lib/ingest/pipeline";
import { uploadDocumentFile } from "../lib/storage";

async function buildSamplePdf(): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const pages = [
    "SETTLEMENT AGREEMENT AND RELEASE\n\nThis Settlement Agreement (the Agreement) is entered into by and between Sarah Hendricks (Claimant) and Meridian Logistics, Inc. (Respondent), effective July 1, 2026.\n\n1. RECITALS. Claimant filed a complaint alleging wrongful termination and unpaid overtime wages under the Fair Labor Standards Act. Respondent denies all allegations. The parties desire to resolve all disputes without further litigation.\n\n2. SETTLEMENT PAYMENT. Respondent shall pay Claimant the total sum of eighty-five thousand dollars ($85,000.00) within thirty (30) days of the Effective Date, allocated as follows: $42,500 as back wages subject to withholding, and $42,500 as liquidated damages reported on Form 1099.",
    "3. RELEASE. In consideration of the payment described in Section 2, Claimant releases and forever discharges Respondent from any and all claims arising out of Claimant's employment, whether known or unknown, through the Effective Date, excluding claims that cannot be waived by law.\n\n4. NO ADMISSION. Nothing in this Agreement shall be construed as an admission of liability by either party.\n\n5. CONFIDENTIALITY. The parties agree to keep the terms of this Agreement confidential, except as required by law or for tax and accounting purposes.\n\n6. GOVERNING LAW. This Agreement shall be governed by the laws of the State of Washington. Any dispute arising under this Agreement shall be resolved exclusively in the state or federal courts located in King County, Washington.",
  ];
  for (const text of pages) {
    const page = pdf.addPage([612, 792]);
    page.drawText(text, {
      x: 54,
      y: 738,
      size: 11,
      font,
      lineHeight: 15,
      maxWidth: 504,
    });
  }
  return Buffer.from(await pdf.save());
}

async function main() {
  const matter = await db.matter.findFirstOrThrow({
    where: { title: { contains: "Hendricks" } },
    select: { id: true, firmId: true, title: true },
  });
  console.log(`Target matter: ${matter.title}`);

  const fileName = `settlement-agreement-test-${Date.now()}.pdf`;
  const bytes = await buildSamplePdf();
  console.log(`Sample PDF built: ${bytes.length} bytes, 2 pages`);

  const document = await db.document.create({
    data: {
      matterId: matter.id,
      title: "Settlement Agreement (pipeline test)",
      fileName,
      storagePath: "",
      mimeType: "application/pdf",
      sizeBytes: bytes.length,
      status: "UPLOADED",
    },
  });
  const storagePath = `${matter.firmId}/${matter.id}/${document.id}/${fileName}`;
  await uploadDocumentFile(storagePath, bytes, "application/pdf");
  await db.document.update({ where: { id: document.id }, data: { storagePath } });
  await db.auditLog.create({
    data: {
      firmId: matter.firmId,
      matterId: matter.id,
      action: "DOCUMENT_UPLOADED",
      entityType: "Document",
      entityId: document.id,
      detail: { fileName, sizeBytes: bytes.length, source: "test-ingest script" },
    },
  });
  console.log(`Uploaded to storage: ${storagePath}`);

  console.log("Running ingestion pipeline (first run downloads the embedding model)...");
  const started = Date.now();
  await ingestDocument(document.id);
  console.log(`Pipeline finished in ${((Date.now() - started) / 1000).toFixed(1)}s`);

  // --- Verification ---
  const refreshed = await db.document.findUniqueOrThrow({ where: { id: document.id } });
  console.log(`Document status: ${refreshed.status}`);
  if (refreshed.status !== "READY") throw new Error("Expected status READY");

  const chunks = await db.documentChunk.findMany({
    where: { documentId: document.id },
    orderBy: { chunkIndex: "asc" },
    select: { id: true, chunkIndex: true, pageNumber: true, content: true },
  });
  console.log(`Chunks stored: ${chunks.length}`);
  for (const c of chunks) {
    console.log(
      `  chunk ${c.chunkIndex} (page ${c.pageNumber}): ${c.content.length} chars — "${c.content.slice(0, 60).replace(/\n/g, " ")}..."`
    );
  }
  if (chunks.length === 0) throw new Error("No chunks stored");
  const pages = new Set(chunks.map((c) => c.pageNumber));
  if (!pages.has(1) || !pages.has(2)) throw new Error("Expected chunks from both pages");

  const emb = await db.$queryRaw<{ cnt: bigint; dims: number | null }[]>`
    SELECT count(*) FILTER (WHERE embedding IS NOT NULL) AS cnt,
           max(vector_dims(embedding)) AS dims
    FROM "DocumentChunk" WHERE "documentId" = ${document.id}
  `;
  console.log(`Chunks with embeddings: ${emb[0].cnt}/${chunks.length}, dims: ${emb[0].dims}`);
  if (Number(emb[0].cnt) !== chunks.length) throw new Error("Some chunks missing embeddings");

  // Similarity sanity check: the payment chunk should rank first for a payment query.
  const { embedQuery } = await import("../lib/ingest/embed");
  const qv = await embedQuery("How much is the settlement payment and when is it due?");
  const nearest = await db.$queryRaw<{ chunkIndex: number; distance: number }[]>`
    SELECT "chunkIndex", embedding <=> ${`[${qv.join(",")}]`}::vector AS distance
    FROM "DocumentChunk" WHERE "documentId" = ${document.id}
    ORDER BY distance ASC LIMIT 3
  `;
  console.log("Similarity search (payment query):");
  for (const row of nearest) {
    const chunk = chunks.find((c) => c.chunkIndex === row.chunkIndex)!;
    console.log(`  distance ${row.distance.toFixed(4)} → chunk ${row.chunkIndex}: "${chunk.content.slice(0, 50).replace(/\n/g, " ")}..."`);
  }
  const top = chunks.find((c) => c.chunkIndex === nearest[0].chunkIndex)!;
  if (!top.content.includes("85,000")) {
    console.warn("WARN: top result did not contain the payment clause (check embedding quality)");
  }

  const audit = await db.auditLog.findMany({
    where: { entityId: document.id },
    orderBy: { createdAt: "asc" },
    select: { action: true, detail: true },
  });
  console.log("Audit log entries:", audit.map((a) => a.action).join(", "));
  if (!audit.some((a) => a.action === "DOCUMENT_INGESTED")) {
    throw new Error("Missing DOCUMENT_INGESTED audit entry");
  }

  console.log("\nEND-TO-END INGESTION TEST PASSED");
  process.exit(0);
}

main().catch((e) => {
  console.error("TEST FAILED:", e);
  process.exit(1);
});
