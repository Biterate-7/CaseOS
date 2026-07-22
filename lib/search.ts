import "server-only";

import { db } from "@/lib/db";

/**
 * Full-text search over document passages.
 *
 * Replaces `content ILIKE '%term%'`, which cannot use an index and forces a
 * sequential scan of every chunk in the workspace on every keystroke.
 *
 * Runs as raw SQL because Prisma has no tsvector support. The tenancy
 * boundary is therefore enforced by an explicit join to Matter with a
 * parameterised firmId — the one place in the codebase where scoping is not
 * handled by Prisma, so it is written out deliberately rather than relying on
 * a `where` clause elsewhere.
 *
 * Every value is parameterised. No user input is interpolated into SQL.
 */

/** Upper bound on ranked ids fed back into the Prisma query. */
const MAX_MATCHES = 1000;

export type ChunkMatch = {
  documentId: string;
  /** ts_rank_cd score; higher is a better match. */
  rank: number;
};

/**
 * Turns a user's words into a tsquery.
 *
 * `websearch_to_tsquery` is used rather than `plainto_tsquery` because it
 * understands quoted phrases and OR/- operators the way a search box user
 * expects, and — unlike `to_tsquery` — it never raises a syntax error on
 * unbalanced input. A stray quote should return no results, not a 500.
 */
export async function searchChunks(
  firmId: string,
  term: string
): Promise<ChunkMatch[]> {
  const trimmed = term.trim();
  if (!trimmed) return [];

  // ts_rank_cd weights term density and proximity, so a passage mentioning
  // the phrase repeatedly outranks one with a single passing reference.
  // Aggregated per document: a document's score is its best passage.
  return db.$queryRaw<ChunkMatch[]>`
    SELECT c."documentId" AS "documentId",
           MAX(ts_rank_cd(c."contentTsv", q))::float8 AS rank
    FROM "DocumentChunk" c
    JOIN "Document" d ON d."id" = c."documentId"
    JOIN "Matter"   m ON m."id" = d."matterId"
    CROSS JOIN websearch_to_tsquery('english', ${trimmed}) q
    WHERE m."firmId" = ${firmId}
      AND c."contentTsv" @@ q
    GROUP BY c."documentId"
    ORDER BY rank DESC
    LIMIT ${MAX_MATCHES}
  `;
}

/**
 * Highlight sentinels.
 *
 * ts_headline is asked to wrap hits in these rather than in <mark> directly,
 * so the returned string can be HTML-escaped wholesale — neutralising any
 * markup that came from the document itself — before the sentinels alone are
 * turned into real tags.
 *
 * Documents are attacker-controlled: anyone who can upload a file can put
 * `<script>` in it. Emitting ts_headline output straight into
 * dangerouslySetInnerHTML would execute it.
 */
const HL_START = "CASEOS_HL";
const HL_END = "/CASEOS_HL";

export type Snippet = {
  documentId: string;
  /** Escaped excerpt; the only surviving markup is <mark>. */
  snippet: string;
  pageNumber: number | null;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Escapes everything, then restores only the highlight markers.
 *
 * The END marker is replaced first, deliberately: it contains the START
 * marker as a substring ("/CASEOS_HL" contains "CASEOS_HL"), so doing START
 * first would rewrite the closing marker's tail and leave a stray "/<mark>"
 * in the output.
 */
function toSafeHighlight(raw: string): string {
  return escapeHtml(raw)
    .split(HL_END)
    .join("</mark>")
    .split(HL_START)
    .join("<mark>");
}

/**
 * Highlighted excerpts for the documents actually on screen.
 *
 * `ts_headline` is expensive — it re-parses the document text — so it runs
 * only for the current page's ids, never the whole result set.
 *
 * MaxFragments=1 keeps one contiguous excerpt rather than stitching together
 * disjoint fragments, which reads better in a list row.
 */
export async function searchSnippets(
  documentIds: string[],
  term: string
): Promise<Snippet[]> {
  const trimmed = term.trim();
  if (!trimmed || documentIds.length === 0) return [];

  const rows = await db.$queryRaw<Snippet[]>`
    SELECT DISTINCT ON (c."documentId")
           c."documentId" AS "documentId",
           ts_headline(
             'english',
             c."content",
             q,
             'StartSel=' || ${HL_START} || ', StopSel=' || ${HL_END} ||
             ', MaxWords=32, MinWords=12, MaxFragments=1'
           ) AS snippet,
           c."pageNumber" AS "pageNumber"
    FROM "DocumentChunk" c
    CROSS JOIN websearch_to_tsquery('english', ${trimmed}) q
    WHERE c."documentId" = ANY(${documentIds})
      AND c."contentTsv" @@ q
    ORDER BY c."documentId", ts_rank_cd(c."contentTsv", q) DESC
  `;

  return rows.map((row) => ({
    ...row,
    snippet: toSafeHighlight(row.snippet),
  }));
}
