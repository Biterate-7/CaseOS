import "server-only";

import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Workspace data loader.
 *
 * Read-only. Adds two derived facts the schema doesn't store directly — a
 * document's page count and its opening excerpt — by aggregating over chunks
 * that ingestion already produced. No schema change, no pipeline change.
 */

export type WorkspaceDocument = {
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  status: "UPLOADED" | "PROCESSING" | "READY" | "FAILED";
  createdAt: Date;
  /** Highest page number seen across chunks; null for non-paginated sources. */
  pageCount: number | null;
  /** How many retrievable passages this document contributes. */
  chunkCount: number;
  /** Opening passage, used for the expandable preview. */
  excerpt: string | null;
};

export type WorkspaceCitation = {
  id: string;
  claimText: string;
  quotedText: string;
  verified: boolean;
  documentId: string;
  documentTitle: string;
  pageNumber: number | null;
};

export type WorkspaceInteraction = {
  id: string;
  prompt: string;
  response: string;
  model: string;
  type: "RESEARCH" | "SUMMARIZE" | "DRAFT" | "EXTRACT";
  reviewStatus: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  reviewedAt: Date | null;
  createdAt: Date;
  authorName: string;
  citations: WorkspaceCitation[];
};

export type WorkspaceAuditEntry = {
  id: string;
  action: string;
  actorName: string | null;
  createdAt: Date;
  detail: Record<string, unknown> | null;
};

export type WorkspaceData = {
  matter: {
    id: string;
    title: string;
    clientName: string;
    practiceArea: string;
    status: "OPEN" | "PENDING" | "CLOSED" | "ARCHIVED";
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  members: {
    id: string;
    name: string;
    /** Per-project permission, not the workspace-wide Role. */
    role: "OWNER" | "EDITOR" | "VIEWER";
  }[];
  documents: WorkspaceDocument[];
  interactions: WorkspaceInteraction[];
  auditLog: WorkspaceAuditEntry[];
  stats: {
    documentCount: number;
    readyDocumentCount: number;
    /** Retrievable passages across the matter — the real size of the corpus. */
    passageCount: number;
    interactionCount: number;
    pendingReviewCount: number;
  };
};

export async function loadWorkspace(matterId: string): Promise<WorkspaceData> {
  const user = await requireUser();

  // findFirst scoped by firmId (never findUnique by id alone) so a matter id
  // belonging to another workspace 404s instead of leaking across the tenant
  // boundary.
  const matter = await db.matter.findFirst({
    where: { id: matterId, firmId: user.firmId },
    include: {
      members: {
        select: {
          role: true,
          user: { select: { id: true, name: true } },
        },
        // Owners first, then alphabetically — the person accountable for the
        // project should be the first avatar, not whoever sorts earliest.
        orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
      },
      documents: { orderBy: { createdAt: "desc" } },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 25,
        include: { user: { select: { name: true } } },
      },
      aiInteractions: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          user: { select: { name: true } },
          citations: {
            include: {
              chunk: {
                select: {
                  pageNumber: true,
                  documentId: true,
                  document: { select: { title: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!matter) notFound();

  // Derived per-document facts. Two small aggregates rather than pulling every
  // chunk body into memory — a long matter can hold thousands of passages.
  const [chunkAgg, openingChunks] = await Promise.all([
    db.documentChunk.groupBy({
      by: ["documentId"],
      where: { document: { matterId: matter.id } },
      _max: { pageNumber: true },
      _count: { _all: true },
    }),
    db.documentChunk.findMany({
      where: { document: { matterId: matter.id }, chunkIndex: 0 },
      select: { documentId: true, content: true },
    }),
  ]);

  const aggByDoc = new Map(chunkAgg.map((row) => [row.documentId, row]));
  const excerptByDoc = new Map(
    openingChunks.map((row) => [row.documentId, row.content])
  );

  const documents: WorkspaceDocument[] = matter.documents.map((doc) => {
    const agg = aggByDoc.get(doc.id);
    const excerpt = excerptByDoc.get(doc.id) ?? null;
    return {
      id: doc.id,
      title: doc.title,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      status: doc.status,
      createdAt: doc.createdAt,
      pageCount: agg?._max.pageNumber ?? null,
      chunkCount: agg?._count._all ?? 0,
      excerpt: excerpt ? excerpt.slice(0, 600) : null,
    };
  });

  const interactions: WorkspaceInteraction[] = matter.aiInteractions.map(
    (interaction) => ({
      id: interaction.id,
      prompt: interaction.prompt,
      response: interaction.response,
      model: interaction.model,
      type: interaction.type,
      reviewStatus: interaction.reviewStatus,
      reviewedAt: interaction.reviewedAt,
      createdAt: interaction.createdAt,
      authorName: interaction.user.name,
      citations: interaction.citations.map((citation) => ({
        id: citation.id,
        claimText: citation.claimText,
        quotedText: citation.quotedText,
        verified: citation.verified,
        documentId: citation.chunk.documentId,
        documentTitle: citation.chunk.document.title,
        pageNumber: citation.chunk.pageNumber,
      })),
    })
  );

  return {
    matter: {
      id: matter.id,
      title: matter.title,
      clientName: matter.clientName,
      practiceArea: matter.practiceArea,
      status: matter.status,
      description: matter.description,
      createdAt: matter.createdAt,
      updatedAt: matter.updatedAt,
    },
    members: matter.members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      role: m.role,
    })),
    documents,
    interactions,
    auditLog: matter.auditLogs.map((entry) => ({
      id: entry.id,
      action: entry.action,
      actorName: entry.user?.name ?? null,
      createdAt: entry.createdAt,
      detail: (entry.detail as Record<string, unknown> | null) ?? null,
    })),
    stats: {
      documentCount: documents.length,
      readyDocumentCount: documents.filter((d) => d.status === "READY").length,
      passageCount: documents.reduce((sum, d) => sum + d.chunkCount, 0),
      interactionCount: interactions.length,
      pendingReviewCount: interactions.filter(
        (i) => i.reviewStatus === "PENDING_REVIEW"
      ).length,
    },
  };
}
