/**
 * Parses the machine-readable `### Sources` block the model appends in
 * DOCUMENT_PLUS_EXTERNAL mode, turning it into structured citation candidates.
 *
 * The model is instructed to emit one line per external citation:
 *
 *   ### Sources
 *   [E1] title: <full title> | publisher: <org> | date: <YYYY-MM-DD or n.d.> | url: <https URL>
 *
 * These are only *candidates* — nothing here is trusted until verify.ts fetches
 * the URL and checks the domain policy. A line without a usable URL is dropped
 * (its [En] marker later renders inert), because a citation with no URL cannot
 * be verified and must never be shown as evidence.
 *
 * No `server-only` import: pure string logic, unit-tested offline.
 */

export type ExternalCitationCandidate = {
  /** The n in [En], as the model numbered it. */
  marker: number;
  title: string;
  publisher: string;
  /** Free-text publication date, or null when the source gave none. */
  publishedAt: string | null;
  url: string;
};

const SOURCES_HEADING = /^###[ \t]+Sources[ \t]*$/im;
const HTTP_URL = /https?:\/\/[^\s<>|]+/i;

/**
 * Splits a response into its prose body and the raw `### Sources` block.
 * Returns `sourcesBlock: null` when the model emitted no sources section
 * (documents were sufficient, or it declined to cite).
 */
export function splitSourcesBlock(response: string): {
  body: string;
  sourcesBlock: string | null;
} {
  const match = SOURCES_HEADING.exec(response);
  if (!match) return { body: response, sourcesBlock: null };

  const body = response.slice(0, match.index).trimEnd();
  const sourcesBlock = response.slice(match.index + match[0].length).trim();
  return { body, sourcesBlock: sourcesBlock || null };
}

/** Pulls a `label: value` field out of a source line, up to the next ` | `. */
function fieldValue(line: string, label: string): string | null {
  const re = new RegExp(`${label}\\s*:\\s*(.*?)\\s*(?:\\||$)`, "i");
  const m = re.exec(line);
  const value = m?.[1]?.trim();
  return value ? value : null;
}

/** Normalises a printed date; treats "n.d." and friends as "no date". */
function normaliseDate(raw: string | null): string | null {
  if (!raw) return null;
  if (/^(n\.?\s*d\.?|none|unknown|undated|n\/a)$/i.test(raw.trim())) return null;
  return raw.trim();
}

/** Strips surrounding quotes/brackets a model sometimes wraps a title in. */
function cleanTitle(raw: string | null, fallback: string): string {
  const value = (raw ?? fallback).trim().replace(/^["'“”\[]+|["'“”\]]+$/g, "").trim();
  return value || fallback;
}

/**
 * Parses candidate external citations from a `### Sources` block. Order is
 * preserved and duplicate markers are kept as-is (verification dedupes by URL
 * downstream). Lines without a resolvable http(s) URL are skipped.
 */
export function parseExternalCandidates(
  sourcesBlock: string | null
): ExternalCitationCandidate[] {
  if (!sourcesBlock) return [];

  const candidates: ExternalCitationCandidate[] = [];
  for (const rawLine of sourcesBlock.split(/\r?\n/)) {
    const line = rawLine.trim();
    const markerMatch = /\[E(\d+)\]/i.exec(line);
    if (!markerMatch) continue;

    const urlMatch = HTTP_URL.exec(line);
    if (!urlMatch) continue; // no URL => cannot be verified => not a citation

    const marker = Number(markerMatch[1]);
    // A trailing `.` or `)` often clings to the URL in prose; trim safe ones.
    const url = urlMatch[0].replace(/[.,);]+$/, "");

    candidates.push({
      marker,
      title: cleanTitle(fieldValue(line, "title"), `Source E${marker}`),
      publisher: fieldValue(line, "publisher") ?? "Unknown publisher",
      publishedAt: normaliseDate(fieldValue(line, "date")),
      url,
    });
  }
  return candidates;
}

/** The distinct [En] marker numbers actually used in the prose body. */
export function usedExternalMarkers(body: string): Set<number> {
  const used = new Set<number>();
  for (const m of body.matchAll(/\[E(\d+)\]/gi)) used.add(Number(m[1]));
  return used;
}
