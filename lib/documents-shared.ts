import type { DocumentStatus } from "@/lib/format";

/**
 * Types and constants shared by the documents page (server) and its filter
 * controls (client).
 *
 * Deliberately free of `server-only` and of any Prisma import. The filter bar
 * needs the sort keys and file-type labels at runtime, and importing them
 * from the data module pulled the Prisma client into the browser bundle —
 * which fails the build outright, since Prisma requires `node:module`.
 */

export const SORT_KEYS = [
  "relevance",
  "newest",
  "oldest",
  "name",
  "project",
  "size",
] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_LABELS: Record<SortKey, string> = {
  relevance: "Most relevant",
  newest: "Newest first",
  oldest: "Oldest first",
  name: "Name A–Z",
  project: "Project",
  size: "Largest first",
};

/** Coarse file categories, derived from mimeType — there is no `type` column. */
export const FILE_TYPES = ["pdf", "text", "markdown"] as const;
export type FileType = (typeof FILE_TYPES)[number];

export const FILE_TYPE_LABELS: Record<FileType, string> = {
  pdf: "PDF",
  text: "Plain text",
  markdown: "Markdown",
};

export const PAGE_SIZE = 24;

export type DocumentQuery = {
  q: string;
  matterId: string | null;
  uploadedById: string | null;
  status: DocumentStatus | null;
  type: FileType | null;
  from: string | null;
  to: string | null;
  sort: SortKey;
  page: number;
};

export type IndexedDocument = {
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentStatus;
  createdAt: Date;
  pageCount: number | null;
  chunkCount: number;
  matterId: string;
  matterTitle: string;
  clientName: string;
  uploadedById: string | null;
  uploaderName: string | null;
  /** Set when the search term matched passage text rather than metadata. */
  matchedInText: boolean;
  /**
   * Best-matching excerpt with <mark> around hits, from ts_headline.
   * Server-generated and escaped there; the only markup is <mark>.
   */
  snippet: string | null;
  /** Page the excerpt came from, when the source is paginated. */
  snippetPage: number | null;
};

export type DocumentIndex = {
  documents: IndexedDocument[];
  total: number;
  page: number;
  pageCount: number;
  query: DocumentQuery;
  facets: {
    projects: { id: string; title: string }[];
    uploaders: { id: string; name: string }[];
    /** Unfiltered workspace total, to distinguish "no results" from "no data". */
    totalDocuments: number;
  };
};

const STATUSES: DocumentStatus[] = [
  "UPLOADED",
  "PROCESSING",
  "READY",
  "FAILED",
];

/** Parses and clamps raw URL params. Never throws on malformed input. */
export function parseDocumentQuery(
  params: Record<string, string | string[] | undefined>
): DocumentQuery {
  const one = (key: string): string | null => {
    const value = params[key];
    const raw = Array.isArray(value) ? value[0] : value;
    const trimmed = raw?.trim();
    return trimmed ? trimmed : null;
  };

  const sortRaw = one("sort");
  const statusRaw = one("status");
  const typeRaw = one("type");
  const pageRaw = Number.parseInt(one("page") ?? "1", 10);

  return {
    q: (one("q") ?? "").slice(0, 200),
    matterId: one("project"),
    uploadedById: one("uploader"),
    status: STATUSES.includes(statusRaw as DocumentStatus)
      ? (statusRaw as DocumentStatus)
      : null,
    type: FILE_TYPES.includes(typeRaw as FileType)
      ? (typeRaw as FileType)
      : null,
    from: one("from"),
    to: one("to"),
    // Relevance is only meaningful alongside a search term — with nothing to
    // rank against it would be an arbitrary order — so it is the default when
    // searching and falls back to recency when the box is empty.
    sort: SORT_KEYS.includes(sortRaw as SortKey)
      ? (sortRaw as SortKey)
      : one("q")
        ? "relevance"
        : "newest",
    page:
      Number.isFinite(pageRaw) && pageRaw > 0 ? Math.min(pageRaw, 10_000) : 1,
  };
}
