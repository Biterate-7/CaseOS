import "server-only";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  PAGE_SIZE,
  parseDocumentQuery,
  type DocumentIndex,
  type FileType,
  type SortKey,
} from "@/lib/documents-shared";
import type { Prisma } from "@/lib/generated/prisma/client";
import { searchChunks, searchSnippets } from "@/lib/search";

/**
 * Workspace-wide document index.
 *
 * Every query here is rooted at `matter: { firmId }` — the same tenancy
 * boundary the per-project loader uses. There is no code path in this module
 * that can reach a document outside the caller's workspace, including through
 * the filter parameters: an id from the URL is only ever used as an extra
 * AND-ed narrowing on a query that is already scoped, never to widen it.
 *
 * Types and constants live in documents-shared.ts so the client filter bar
 * can import them without pulling Prisma into the browser bundle.
 */

const MIME_BY_TYPE: Record<FileType, string> = {
  pdf: "application/pdf",
  text: "text/plain",
  markdown: "text/markdown",
};

function orderBy(sort: SortKey): Prisma.DocumentOrderByWithRelationInput[] {
  switch (sort) {
    case "oldest":
      return [{ createdAt: "asc" }];
    case "name":
      return [{ title: "asc" }];
    case "project":
      return [{ matter: { title: "asc" } }, { title: "asc" }];
    case "size":
      return [{ sizeBytes: "desc" }];
    case "newest":
    default:
      return [{ createdAt: "desc" }];
  }
}

/** Parses a yyyy-mm-dd input value; returns null for anything unparseable. */
function parseDate(value: string | null, endOfDay = false): Date | null {
  if (!value) return null;
  const date = new Date(
    `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function loadDocumentIndex(
  params: Record<string, string | string[] | undefined>
): Promise<DocumentIndex> {
  const user = await requireUser();
  const firmId = user.firmId;
  const query = parseDocumentQuery(params);

  // Tenancy root. Every branch below is ANDed onto this.
  const where: Prisma.DocumentWhereInput = { matter: { firmId } };

  // Passage text is matched through the GIN-indexed tsvector rather than an
  // unindexed ILIKE, which had to sequentially scan every chunk in the
  // workspace on each keystroke. The metadata columns keep using `contains`:
  // they are short, they now have trigram indexes, and stemming a filename is
  // usually wrong ("agreement-v2" should match the literal string).
  let rankByDocument = new Map<string, number>();
  if (query.q) {
    const matches = await searchChunks(firmId, query.q);
    rankByDocument = new Map(matches.map((m) => [m.documentId, m.rank]));

    where.OR = [
      { title: { contains: query.q, mode: "insensitive" } },
      { fileName: { contains: query.q, mode: "insensitive" } },
      { matter: { title: { contains: query.q, mode: "insensitive" } } },
      { matter: { clientName: { contains: query.q, mode: "insensitive" } } },
      ...(matches.length > 0
        ? [{ id: { in: matches.map((m) => m.documentId) } }]
        : []),
    ];
  }

  if (query.matterId) where.matterId = query.matterId;
  if (query.uploadedById) where.uploadedById = query.uploadedById;
  if (query.status) where.status = query.status;
  if (query.type) where.mimeType = MIME_BY_TYPE[query.type];

  const from = parseDate(query.from);
  const to = parseDate(query.to, true);
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  // Relevance can't be expressed as a Prisma orderBy — the rank comes from a
  // separate raw query, not a column. So for that one sort the ids are
  // ordered and paginated in memory, then the page is fetched by id. The
  // extra round trip selects ids only, and the set is already capped by the
  // search limit.
  const useRelevance = query.sort === "relevance" && Boolean(query.q);
  let relevanceIds: string[] | null = null;
  let relevanceTotal = 0;

  if (useRelevance) {
    const matching = await db.document.findMany({ where, select: { id: true } });
    relevanceTotal = matching.length;
    relevanceIds = matching
      .map((r) => r.id)
      .sort((a, b) => {
        // Metadata-only hits have no passage rank. They sort above text
        // matches: a document whose *title* contains the term is a stronger
        // signal than one that mentions it once in the body.
        const ra = rankByDocument.get(a) ?? Number.POSITIVE_INFINITY;
        const rb = rankByDocument.get(b) ?? Number.POSITIVE_INFINITY;
        return rb === ra ? a.localeCompare(b) : rb - ra;
      })
      .slice((query.page - 1) * PAGE_SIZE, query.page * PAGE_SIZE);
  }

  const [total, rows, projects, uploaders, totalDocuments] = await Promise.all([
    useRelevance ? Promise.resolve(relevanceTotal) : db.document.count({ where }),
    db.document.findMany({
      where: relevanceIds ? { id: { in: relevanceIds } } : where,
      orderBy: useRelevance ? undefined : orderBy(query.sort),
      skip: useRelevance ? undefined : (query.page - 1) * PAGE_SIZE,
      take: useRelevance ? undefined : PAGE_SIZE,
      select: {
        id: true,
        title: true,
        fileName: true,
        mimeType: true,
        sizeBytes: true,
        status: true,
        createdAt: true,
        matterId: true,
        uploadedById: true,
        matter: { select: { title: true, clientName: true } },
        uploadedBy: { select: { name: true } },
      },
    }),
    db.matter.findMany({
      where: { firmId },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    db.user.findMany({
      where: { firmId, uploadedDocuments: { some: { matter: { firmId } } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.document.count({ where: { matter: { firmId } } }),
  ]);

  // Page counts and text-match flags for the rows actually on screen. Scoped
  // to this page rather than the whole result set — a workspace can hold
  // thousands of passages and none of that is needed off-screen.
  // `in` does not preserve order, so the relevance ranking is reapplied here.
  if (relevanceIds) {
    const position = new Map(relevanceIds.map((id, i) => [id, i]));
    rows.sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0));
  }

  const ids = rows.map((r) => r.id);
  const [chunkAgg, snippets] = await Promise.all([
    ids.length
      ? db.documentChunk.groupBy({
          by: ["documentId"],
          where: { documentId: { in: ids } },
          _max: { pageNumber: true },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    // ts_headline re-parses the document text, so it runs only for the rows
    // actually on screen — never the whole result set.
    query.q ? searchSnippets(ids, query.q) : Promise.resolve([]),
  ]);

  const aggByDoc = new Map(chunkAgg.map((r) => [r.documentId, r]));
  const snippetByDoc = new Map(snippets.map((s) => [s.documentId, s]));

  return {
    documents: rows.map((row) => {
      const agg = aggByDoc.get(row.id);
      return {
        id: row.id,
        title: row.title,
        fileName: row.fileName,
        mimeType: row.mimeType,
        sizeBytes: row.sizeBytes,
        status: row.status,
        createdAt: row.createdAt,
        pageCount: agg?._max.pageNumber ?? null,
        chunkCount: agg?._count._all ?? 0,
        matterId: row.matterId,
        matterTitle: row.matter.title,
        clientName: row.matter.clientName,
        uploadedById: row.uploadedById,
        uploaderName: row.uploadedBy?.name ?? null,
        matchedInText: snippetByDoc.has(row.id),
        snippet: snippetByDoc.get(row.id)?.snippet ?? null,
        snippetPage: snippetByDoc.get(row.id)?.pageNumber ?? null,
      };
    }),
    total,
    page: query.page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    query,
    facets: { projects, uploaders, totalDocuments },
  };
}
