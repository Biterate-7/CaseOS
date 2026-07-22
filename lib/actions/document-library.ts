"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteDocumentFile, getDocumentSignedUrl } from "@/lib/storage";

/**
 * Document management actions for the workspace-wide library.
 *
 * Every action re-resolves the document through `matter: { firmId }` using
 * the session's own workspace id. A document id from another workspace
 * resolves to nothing and returns the same "not found" as a deleted one —
 * distinguishing them would confirm the id exists.
 *
 * Nothing here trusts a client-supplied workspace, project, or user id
 * without checking it belongs to the caller first.
 */

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string };

const NOT_FOUND = "Document not found." as const;

/** Loads a document the caller is entitled to see, or null. */
async function findOwnedDocument(documentId: string, firmId: string) {
  return db.document.findFirst({
    where: { id: documentId, matter: { firmId } },
    select: {
      id: true,
      title: true,
      fileName: true,
      storagePath: true,
      matterId: true,
      uploadedById: true,
      matter: { select: { firmId: true } },
    },
  });
}

/**
 * Time-limited read URL, used for both preview and download. The bucket is
 * private, so this is the only way a browser can reach the file — and the URL
 * expires, so it cannot be pasted somewhere durable and used indefinitely.
 */
export async function getDocumentUrl(
  documentId: string
): Promise<ActionResult<{ url: string; fileName: string }>> {
  const user = await requireUser();
  const document = await findOwnedDocument(documentId, user.firmId);
  if (!document) return { ok: false, error: NOT_FOUND };
  if (!document.storagePath) {
    return { ok: false, error: "This document has no stored file." };
  }

  try {
    const url = await getDocumentSignedUrl(document.storagePath, 300);
    return { ok: true, data: { url, fileName: document.fileName } };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Could not open this document.",
    };
  }
}

export async function renameDocument(
  documentId: string,
  rawTitle: string
): Promise<ActionResult> {
  const user = await requireUser();

  const title = rawTitle.trim();
  if (title.length < 1) return { ok: false, error: "Enter a name." };
  if (title.length > 200) {
    return { ok: false, error: "Name is too long (200 characters max)." };
  }

  const document = await findOwnedDocument(documentId, user.firmId);
  if (!document) return { ok: false, error: NOT_FOUND };
  if (document.title === title) return { ok: true };

  await db.$transaction([
    db.document.update({ where: { id: document.id }, data: { title } },),
    db.auditLog.create({
      data: {
        firmId: user.firmId,
        userId: user.id,
        matterId: document.matterId,
        action: "DOCUMENT_RENAMED",
        entityType: "Document",
        entityId: document.id,
        detail: { from: document.title, to: title },
      },
    }),
  ]);

  revalidatePath("/documents");
  revalidatePath(`/matters/${document.matterId}`);
  return { ok: true };
}

/**
 * Reassigns a document to another project in the same workspace.
 *
 * The stored object is deliberately left where it is. Its path encodes the
 * original project id, which becomes cosmetically stale, but the path is an
 * opaque key everywhere it is used — moving the blob would mean a copy plus a
 * delete with no transaction spanning both, and a failure there would lose
 * the file. A slightly untidy path is the safer trade.
 *
 * Retrieval follows the database, so the document becomes searchable in the
 * destination project and stops being searchable in the source immediately.
 */
export async function moveDocument(
  documentId: string,
  targetMatterId: string
): Promise<ActionResult> {
  const user = await requireUser();

  const [document, target] = await Promise.all([
    findOwnedDocument(documentId, user.firmId),
    db.matter.findFirst({
      where: { id: targetMatterId, firmId: user.firmId },
      select: { id: true, title: true },
    }),
  ]);

  if (!document) return { ok: false, error: NOT_FOUND };
  if (!target) return { ok: false, error: "Destination project not found." };
  if (document.matterId === target.id) return { ok: true };

  const source = document.matterId;

  await db.$transaction([
    db.document.update({
      where: { id: document.id },
      data: { matterId: target.id },
    }),
    // Logged against both projects so neither activity trail has a gap where
    // a document silently appeared or vanished.
    db.auditLog.create({
      data: {
        firmId: user.firmId,
        userId: user.id,
        matterId: source,
        action: "DOCUMENT_MOVED_OUT",
        entityType: "Document",
        entityId: document.id,
        detail: { title: document.title, to: target.title },
      },
    }),
    db.auditLog.create({
      data: {
        firmId: user.firmId,
        userId: user.id,
        matterId: target.id,
        action: "DOCUMENT_MOVED_IN",
        entityType: "Document",
        entityId: document.id,
        detail: { title: document.title, from: source },
      },
    }),
  ]);

  revalidatePath("/documents");
  revalidatePath(`/matters/${source}`);
  revalidatePath(`/matters/${target.id}`);
  return { ok: true };
}

/**
 * Permanently removes a document, its passages, and the citations that point
 * at those passages.
 *
 * Restricted to workspace administrators and the person who uploaded it.
 * Deleting is not reversible and it silently weakens past AI answers — any
 * claim grounded in this document loses its citation and becomes unverifiable
 * — so it is not something any member should be able to do to anyone's
 * sources.
 *
 * The AIInteraction rows themselves survive; only the links to the removed
 * passages go. That keeps the record of what was asked and answered intact.
 */
export async function deleteDocument(
  documentId: string
): Promise<ActionResult> {
  const user = await requireUser();

  const document = await findOwnedDocument(documentId, user.firmId);
  if (!document) return { ok: false, error: NOT_FOUND };

  const isAdmin = user.role === "ADMIN";
  const isUploader = document.uploadedById === user.id;
  if (!isAdmin && !isUploader) {
    return {
      ok: false,
      error:
        "Only a workspace administrator or the person who uploaded this document can delete it.",
    };
  }

  const citationCount = await db.citation.count({
    where: { chunk: { documentId: document.id } },
  });

  await db.$transaction([
    db.citation.deleteMany({ where: { chunk: { documentId: document.id } } }),
    db.documentChunk.deleteMany({ where: { documentId: document.id } }),
    db.document.delete({ where: { id: document.id } }),
    db.auditLog.create({
      data: {
        firmId: user.firmId,
        userId: user.id,
        matterId: document.matterId,
        action: "DOCUMENT_DELETED",
        entityType: "Document",
        entityId: document.id,
        detail: {
          title: document.title,
          fileName: document.fileName,
          citationsRemoved: citationCount,
        },
      },
    }),
  ]);

  // After the row is gone. A failure here orphans a blob, which is
  // recoverable; the reverse would leave a row pointing at nothing.
  if (document.storagePath) {
    try {
      await deleteDocumentFile(document.storagePath);
    } catch {
      // Intentionally swallowed — the document is already gone as far as the
      // product is concerned, and surfacing a storage error here would imply
      // the delete failed when it did not.
    }
  }

  revalidatePath("/documents");
  revalidatePath(`/matters/${document.matterId}`);
  return { ok: true };
}
