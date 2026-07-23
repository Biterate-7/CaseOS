"use server";

import { revalidatePath } from "next/cache";

import { classifyAiError, logAiError } from "@/lib/ai/errors";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ingestDocument } from "@/lib/ingest/pipeline";
import { createDocumentUploadUrl, documentFileExists } from "@/lib/storage";

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
]);

/**
 * Two-step upload.
 *
 * The file never passes through the server. Next.js caps server action bodies
 * at 1 MB and Vercel caps function request bodies at 4.5 MB, so the previous
 * single-action upload could not accept a real PDF at all. Now the browser
 * requests a scoped, expiring upload URL, PUTs the bytes straight to Supabase,
 * and then asks the server to ingest what landed.
 *
 * Both steps re-check firm ownership independently — step two must never
 * trust that step one happened, or a caller could ingest against someone
 * else's document id.
 */

export type PrepareUploadResult =
  | { ok: true; documentId: string; uploadUrl: string }
  | { ok: false; error: string };

export async function prepareDocumentUpload(
  matterId: string,
  fileName: string,
  mimeType: string,
  sizeBytes: number
): Promise<PrepareUploadResult> {
  const user = await requireUser();

  if (!fileName.trim()) {
    return { ok: false, error: "Choose a file to upload." };
  }
  if (sizeBytes <= 0) {
    return { ok: false, error: "That file is empty." };
  }
  if (sizeBytes > MAX_FILE_BYTES) {
    return { ok: false, error: "File is larger than 20 MB." };
  }
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return {
      ok: false,
      error: "Only PDF and plain-text files are supported right now.",
    };
  }

  // Scoped to the caller's firm: a matter id from another firm is invisible.
  const matter = await db.matter.findFirst({
    where: { id: matterId, firmId: user.firmId },
    select: { id: true, firmId: true },
  });
  if (!matter) {
    return { ok: false, error: "Matter not found." };
  }

  const title = fileName.replace(/\.[^.]+$/, "");
  const document = await db.document.create({
    data: {
      matterId: matter.id,
      title,
      fileName,
      storagePath: "", // set below, once the document id exists
      mimeType,
      sizeBytes,
      status: "UPLOADED",
      uploadedById: user.id,
    },
  });

  const storagePath = `${matter.firmId}/${matter.id}/${document.id}/${fileName}`;

  try {
    const { signedUrl } = await createDocumentUploadUrl(storagePath);
    await db.document.update({
      where: { id: document.id },
      data: { storagePath },
    });
    return { ok: true, documentId: document.id, uploadUrl: signedUrl };
  } catch (error) {
    await db.document.update({
      where: { id: document.id },
      data: { status: "FAILED" },
    });
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not start the upload.",
    };
  }
}

export type FinalizeUploadResult =
  | { ok: true; documentId: string }
  | { ok: false; error: string };

export async function finalizeDocumentUpload(
  documentId: string
): Promise<FinalizeUploadResult> {
  const user = await requireUser();

  // Re-scoped by firm rather than trusting the id handed back by the client.
  const document = await db.document.findFirst({
    where: { id: documentId, matter: { firmId: user.firmId } },
    select: {
      id: true,
      fileName: true,
      sizeBytes: true,
      storagePath: true,
      matterId: true,
      matter: { select: { firmId: true } },
    },
  });
  if (!document) {
    return { ok: false, error: "Document not found." };
  }

  try {
    // Guards against finalizing a document whose browser upload silently
    // failed, which would otherwise ingest an empty path.
    const uploaded = await documentFileExists(document.storagePath);
    if (!uploaded) {
      throw new Error(
        "The file did not finish uploading. Please try again."
      );
    }

    await db.auditLog.create({
      data: {
        firmId: document.matter.firmId,
        userId: user.id,
        matterId: document.matterId,
        action: "DOCUMENT_UPLOADED",
        entityType: "Document",
        entityId: document.id,
        detail: {
          fileName: document.fileName,
          sizeBytes: document.sizeBytes,
        },
      },
    });

    await ingestDocument(document.id);
  } catch (error) {
    // ingestDocument marks FAILED itself; this also covers pre-ingest errors.
    await db.document.updateMany({
      where: { id: document.id, status: { not: "FAILED" } },
      data: { status: "FAILED" },
    });
    revalidatePath(`/matters/${document.matterId}`);

    // Ingestion embeds through Gemini, so a capacity 503 surfaces here too.
    // Returning error.message would have put the provider's JSON body in the
    // upload panel — the same leak that was fixed in askQuestion.
    const classified = classifyAiError(error);
    logAiError("finalizeDocumentUpload", classified);
    return {
      ok: false,
      error:
        classified.code === "UNKNOWN"
          ? "This document could not be processed. Please try again."
          : classified.userMessage,
    };
  }

  revalidatePath(`/matters/${document.matterId}`);
  return { ok: true, documentId: document.id };
}

/**
 * Re-runs ingestion for a document that previously failed — whether it errored
 * during processing or was recovered from a stuck PROCESSING state.
 *
 * The stored file is untouched by a failure, so retry re-uses it rather than
 * asking for another upload. Only FAILED documents are eligible; retrying a
 * READY one would needlessly re-embed, and retrying a PROCESSING one could run
 * two ingestions at once.
 */
export async function retryDocumentIngestion(
  documentId: string
): Promise<FinalizeUploadResult> {
  const user = await requireUser();

  const document = await db.document.findFirst({
    where: { id: documentId, matter: { firmId: user.firmId } },
    select: {
      id: true,
      status: true,
      storagePath: true,
      matterId: true,
      matter: { select: { firmId: true } },
    },
  });
  if (!document) {
    return { ok: false, error: "Document not found." };
  }
  if (document.status !== "FAILED") {
    return {
      ok: false,
      error:
        document.status === "PROCESSING"
          ? "This document is already being processed."
          : "This document is already indexed.",
    };
  }
  if (!document.storagePath) {
    return {
      ok: false,
      error: "The original file is missing. Upload it again instead.",
    };
  }

  // Claim the document atomically. If some other request retried it a moment
  // ago, this update matches zero rows and we stop, so two ingestions of the
  // same document can never run concurrently.
  const claimed = await db.document.updateMany({
    where: { id: document.id, status: "FAILED" },
    data: { status: "PROCESSING" },
  });
  if (claimed.count === 0) {
    return { ok: false, error: "This document is already being retried." };
  }

  await db.auditLog.create({
    data: {
      firmId: document.matter.firmId,
      userId: user.id,
      matterId: document.matterId,
      action: "DOCUMENT_INGEST_RETRIED",
      entityType: "Document",
      entityId: document.id,
    },
  });

  try {
    await ingestDocument(document.id);
  } catch (error) {
    await db.document.updateMany({
      where: { id: document.id, status: { not: "FAILED" } },
      data: { status: "FAILED" },
    });
    revalidatePath(`/matters/${document.matterId}`);
    revalidatePath("/documents");

    const classified = classifyAiError(error);
    logAiError("retryDocumentIngestion", classified);
    return {
      ok: false,
      error:
        classified.code === "UNKNOWN"
          ? "This document could not be processed. Please try again."
          : classified.userMessage,
    };
  }

  revalidatePath(`/matters/${document.matterId}`);
  revalidatePath("/documents");
  return { ok: true, documentId: document.id };
}
