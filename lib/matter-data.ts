import "server-only";

import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { reconcileStuckDocuments } from "@/lib/ingest/reconcile";
import { logError } from "@/lib/log";

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

/** A server-verified external source cited by an [En] marker. */
export type WorkspaceExternalCitation = {
  id: string;
  /** The n in [En] — how the answer's markers resolve to this row. */
  marker: number;
  title: string;
  publisher: string;
  publishedAt: string | null;
  url: string;
  finalUrl: string | null;
  domain: string;
  tier: string;
  accessedAt: Date;
};

export type WorkspaceInteraction = {
  id: string;
  prompt: string;
  response: string;
  model: string;
  type: "RESEARCH" | "SUMMARIZE" | "DRAFT" | "EXTRACT";
  /** Whether the answer was allowed a labelled AI-knowledge or external section. */
  knowledgeMode: "DOCUMENT_ONLY" | "DOCUMENT_PLUS_AI" | "DOCUMENT_PLUS_EXTERNAL";
  reviewStatus: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  reviewedAt: Date | null;
  createdAt: Date;
  authorName: string;
  citations: WorkspaceCitation[];
  externalCitations: WorkspaceExternalCitation[];
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
  /**
   * Which auxiliary sections failed to load. The essential data (matter,
   * members, documents) either loads or the whole call throws / 404s; these
   * flags let a failure in one secondary section render an inline error while
   * the rest of the page renders normally, instead of crashing everything.
   */
  errors: {
    interactions: boolean;
    auditLog: boolean;
  };
  stats: {
    documentCount: number;
    readyDocumentCount: number;
    /** Retrievable passages across the matter — the real size of the corpus. */
    passageCount: number;
    interactionCount: number;
    pendingReviewCount: number;
  };
};

/**
 * Loads everything the matter workspace renders.
 *
 * Structured so a failure in any one secondary section (research history, the
 * audit trail, per-document aggregates, the stuck-document sweep) cannot bring
 * down the whole page. Only the *essential* query — matter + members +
 * documents — is allowed to throw, because there is nothing to render without
 * it (and a missing matter must still 404). Everything else is loaded inside
 * its own try/catch: on failure it degrades to an empty result plus a flag the
 * UI turns into an inline error, and the rest of the page renders normally.
 *
 * This is what prevents the class of crash where, e.g., one bad interaction row
 * or a transient DB blip on the aiInteractions query collapses the entire
 * authenticated shell to the global error boundary.
 */
export async function loadWorkspace(matterId: string): Promise<WorkspaceData> {
  const user = await requireUser();
  const logCtx = { userId: user.id, firmId: user.firmId, matterId };

  // Reap any documents stranded in PROCESSING before reading them. Best-effort
  // maintenance — a failure here (e.g. a DB blip) must never block the page, so
  // it is logged and swallowed rather than propagated.
  try {
    await reconcileStuckDocuments({ firmId: user.firmId });
  } catch (error) {
    logError("workspace_reconcile_failed", logCtx, error);
  }

  // Essential data. findFirst scoped by firmId (never findUnique by id alone)
  // so a matter id belonging to another workspace 404s instead of leaking
  // across the tenant boundary. A throw here is a genuine page-load failure.
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
    },
  });

  if (!matter) notFound();

  // Derived per-document facts. Two small aggregates rather than pulling every
  // chunk body into memory — a long matter can hold thousands of passages.
  // Defensive: if this fails, documents still render (without page/chunk counts
  // and previews) rather than taking the page down.
  let aggByDoc = new Map<string, { _max: { pageNumber: number | null }; _count: { _all: number } }>();
  let excerptByDoc = new Map<string, string>();
  try {
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
    aggByDoc = new Map(chunkAgg.map((row) => [row.documentId, row]));
    excerptByDoc = new Map(openingChunks.map((row) => [row.documentId, row.content]));
  } catch (error) {
    logError("workspace_aggregates_failed", logCtx, error);
  }

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

  // Research history. Isolated in its own query + try/catch: this is the
  // section most likely to fail (it joins interactions, citations, chunks, and
  // external citations), and its failure must leave documents and the rest of
  // the page fully usable, with an inline error in the research column.
  let interactions: WorkspaceInteraction[] = [];
  let interactionsFailed = false;
  try {
    const rows = await db.aIInteraction.findMany({
      where: { matterId: matter.id },
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
        externalCitations: { orderBy: { marker: "asc" } },
      },
    });
    interactions = rows.map((interaction) => ({
      id: interaction.id,
      prompt: interaction.prompt,
      response: interaction.response,
      model: interaction.model,
      type: interaction.type,
      knowledgeMode: interaction.knowledgeMode,
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
      externalCitations: interaction.externalCitations.map((c) => ({
        id: c.id,
        marker: c.marker,
        title: c.title,
        publisher: c.publisher,
        publishedAt: c.publishedAt,
        url: c.url,
        finalUrl: c.finalUrl,
        domain: c.domain,
        tier: c.tier,
        accessedAt: c.accessedAt,
      })),
    }));
  } catch (error) {
    interactionsFailed = true;
    logError("workspace_interactions_failed", logCtx, error);
  }

  // Audit trail. Also isolated — the record is important but not essential to
  // asking a question or reading documents.
  let auditLog: WorkspaceAuditEntry[] = [];
  let auditFailed = false;
  try {
    const rows = await db.auditLog.findMany({
      where: { matterId: matter.id },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { user: { select: { name: true } } },
    });
    auditLog = rows.map((entry) => ({
      id: entry.id,
      action: entry.action,
      actorName: entry.user?.name ?? null,
      createdAt: entry.createdAt,
      detail: (entry.detail as Record<string, unknown> | null) ?? null,
    }));
  } catch (error) {
    auditFailed = true;
    logError("workspace_audit_failed", logCtx, error);
  }

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
    auditLog,
    errors: {
      interactions: interactionsFailed,
      auditLog: auditFailed,
    },
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
