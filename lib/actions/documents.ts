"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { ingestDocument } from "@/lib/ingest/pipeline";
import { uploadDocumentFile } from "@/lib/storage";

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME_TYPES = new Set(["application/pdf", "text/plain", "text/markdown"]);

export type UploadResult =
  | { ok: true; documentId: string }
  | { ok: false; error: string };

export async function uploadDocument(
  matterId: string,
  formData: FormData
): Promise<UploadResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a file to upload." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: "File is larger than 20 MB." };
  }
  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return { ok: false, error: "Only PDF and plain-text files are supported right now." };
  }

  const matter = await db.matter.findUnique({
    where: { id: matterId },
    select: { id: true, firmId: true },
  });
  if (!matter) {
    return { ok: false, error: "Matter not found." };
  }

  const title = file.name.replace(/\.[^.]+$/, "");
  const document = await db.document.create({
    data: {
      matterId: matter.id,
      title,
      fileName: file.name,
      storagePath: "", // set below once the document id exists
      mimeType,
      sizeBytes: file.size,
      status: "UPLOADED",
    },
  });

  const storagePath = `${matter.firmId}/${matter.id}/${document.id}/${file.name}`;

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    await uploadDocumentFile(storagePath, bytes, mimeType);
    await db.document.update({
      where: { id: document.id },
      data: { storagePath },
    });
    await db.auditLog.create({
      data: {
        firmId: matter.firmId,
        matterId: matter.id,
        action: "DOCUMENT_UPLOADED",
        entityType: "Document",
        entityId: document.id,
        detail: { fileName: file.name, sizeBytes: file.size },
      },
    });

    await ingestDocument(document.id);
  } catch (error) {
    // ingestDocument marks FAILED itself; this catches upload-stage errors too.
    await db.document.updateMany({
      where: { id: document.id, status: { not: "FAILED" } },
      data: { status: "FAILED" },
    });
    revalidatePath(`/matters/${matterId}`);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Upload failed.",
    };
  }

  revalidatePath(`/matters/${matterId}`);
  return { ok: true, documentId: document.id };
}
