/**
 * Structured-answer sections for Enhanced Research and External Research.
 *
 * Mode-aware generation (lib/ai/generate.ts) instructs the model to emit the
 * answer under fixed markdown headings. This module is the single definition
 * of those headings and the parser that recovers them — shared by the server
 * (to enforce which citation markers may appear in each section before
 * persistence) and the client (to render document-grounded, AI-generated, and
 * externally-sourced content differently).
 *
 * No `server-only` import: pure string functions.
 */

export type AnswerSectionKind =
  | "summary"
  | "evidence" // findings from uploaded documents ([Sn] citations)
  | "context" // AI general knowledge, no citations (DOCUMENT_PLUS_AI)
  | "implications"
  | "external" // external research ([En] citations, verified)
  | "analysis" // AI's interpretation relating documents and external sources
  | "confidence" // stated support level
  /** Text before any heading, or an entire legacy unstructured answer. */
  | "answer";

/**
 * Where a section's factual claims are allowed to come from — which drives
 * both marker sanitisation and rendering:
 *  - "document": may carry [Sn] document citations; [En] is stripped.
 *  - "external": may carry [En] external citations; [Sn] is stripped.
 *  - "none": AI-authored prose (context/analysis/confidence); both stripped.
 */
export type SectionGrounding = "document" | "external" | "none";

export type AnswerSection = {
  kind: AnswerSectionKind;
  /** Display heading as the model wrote it; null for the implicit section. */
  title: string | null;
  body: string;
};

export function sectionGrounding(kind: AnswerSectionKind): SectionGrounding {
  switch (kind) {
    case "external":
      return "external";
    case "context":
    case "analysis":
    case "confidence":
      return "none";
    default:
      return "document";
  }
}

/**
 * Back-compat helper: "grounded" has always meant "renders with document
 * citations". Kept so existing callers read the same.
 */
export function isGroundedSection(kind: AnswerSectionKind): boolean {
  return sectionGrounding(kind) === "document";
}

// Every heading the parser recognises, mapped to its kind. Two evidence
// spellings are accepted: "Evidence from Documents" (DOCUMENT_PLUS_AI) and
// "Evidence from Uploaded Documents" (DOCUMENT_PLUS_EXTERNAL).
const KIND_BY_TITLE: Record<string, Exclude<AnswerSectionKind, "answer">> = {
  summary: "summary",
  "evidence from documents": "evidence",
  "evidence from uploaded documents": "evidence",
  "additional context": "context",
  "practical implications": "implications",
  "external research": "external",
  analysis: "analysis",
  confidence: "confidence",
};

const HEADING = new RegExp(
  `^##\\s+(${Object.keys(KIND_BY_TITLE)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")})\\s*$`,
  "i"
);

/**
 * Splits a persisted response into its sections, in the order the model
 * emitted them, preserving each heading's exact text. A response with no
 * headings (legacy interactions, refusals) comes back as a single implicit
 * "answer" section, so old rows render exactly as they always did.
 *
 * Anything after a `### Sources` metadata block is not a section — callers that
 * care about it (external mode) split it off with parse.ts before calling here.
 */
export function splitSections(response: string): AnswerSection[] {
  const lines = response.split("\n");
  const sections: AnswerSection[] = [];

  let current: AnswerSection = { kind: "answer", title: null, body: "" };

  const push = () => {
    const body = current.body.trim();
    // The implicit leading section is only kept if it has content; named
    // sections are kept even when empty so the label still renders.
    if (body || current.kind !== "answer") {
      sections.push({ ...current, body });
    }
  };

  for (const line of lines) {
    const match = line.match(HEADING);
    if (match) {
      push();
      const kind = KIND_BY_TITLE[match[1].toLowerCase()];
      current = { kind, title: match[1].trim(), body: "" };
    } else {
      current.body += (current.body ? "\n" : "") + line;
    }
  }
  push();

  return sections;
}

function countAndStrip(body: string, type: "S" | "E"): { body: string; count: number } {
  const re = type === "S" ? /\s*\[S\d+\]/g : /\s*\[E\d+\]/g;
  const count = body.match(re)?.length ?? 0;
  return { body: count ? body.replace(re, "") : body, count };
}

function rebuild(sections: AnswerSection[]): string {
  return sections
    .map((s) => (s.title != null ? `## ${s.title}\n${s.body}` : s.body))
    .join("\n\n");
}

/**
 * Removes `[Sn]` markers from every non-document section (DOCUMENT_PLUS_AI).
 *
 * This is the mechanical guarantee behind "never fabricate document
 * citations": even if the model drops a marker into Additional Context, it is
 * stripped before citation parsing and persistence, so no Citation row — and
 * no clickable marker — can ever point out of AI-generated text.
 */
export function stripUngroundedMarkers(response: string): {
  response: string;
  strippedMarkerCount: number;
} {
  const sections = splitSections(response);
  if (!sections.some((s) => sectionGrounding(s.kind) !== "document")) {
    return { response, strippedMarkerCount: 0 };
  }

  let strippedMarkerCount = 0;
  const cleaned = sections.map((section) => {
    if (sectionGrounding(section.kind) === "document") return section;
    const { body, count } = countAndStrip(section.body, "S");
    strippedMarkerCount += count;
    return { ...section, body };
  });

  return { response: rebuild(cleaned), strippedMarkerCount };
}

/**
 * Enforces the per-section marker policy for External Research
 * (DOCUMENT_PLUS_EXTERNAL): document sections keep [Sn] and lose any [En];
 * the External Research section keeps [En] and loses any [Sn]; AI-authored
 * sections lose both. This is what makes "never mix document citations with
 * external citations" mechanical, and — together with URL verification —
 * guarantees the surviving markers of each type point only where they should.
 *
 * Returns the sanitised prose and the counts, which feed the audit trail.
 */
export function sanitizeCrossSectionMarkers(response: string): {
  response: string;
  strippedDocMarkers: number;
  strippedExternalMarkers: number;
} {
  let strippedDocMarkers = 0;
  let strippedExternalMarkers = 0;

  const cleaned = splitSections(response).map((section) => {
    const grounding = sectionGrounding(section.kind);
    let body = section.body;

    if (grounding !== "document") {
      const s = countAndStrip(body, "S");
      body = s.body;
      strippedDocMarkers += s.count;
    }
    if (grounding !== "external") {
      const e = countAndStrip(body, "E");
      body = e.body;
      strippedExternalMarkers += e.count;
    }
    return { ...section, body };
  });

  return {
    response: rebuild(cleaned),
    strippedDocMarkers,
    strippedExternalMarkers,
  };
}

/**
 * Removes a specific set of [En] markers from the External Research section
 * (used after verification, to erase markers whose source failed to verify),
 * and reports how many were removed. Markers not in `drop` are left intact.
 */
export function stripExternalMarkers(
  response: string,
  drop: ReadonlySet<number>
): { response: string; removed: number } {
  if (drop.size === 0) return { response, removed: 0 };

  let removed = 0;
  const cleaned = splitSections(response).map((section) => {
    if (sectionGrounding(section.kind) !== "external") return section;
    const body = section.body.replace(/\s*\[E(\d+)\]/g, (whole, n: string) => {
      if (drop.has(Number(n))) {
        removed += 1;
        return "";
      }
      return whole;
    });
    return { ...section, body };
  });

  return { response: rebuild(cleaned), removed };
}

/**
 * When the External Research section carries no surviving [En] citation (all
 * candidates failed verification, or none were proposed), replaces its body
 * with the mandated fallback so no uncited external claims are ever shown.
 * A section with at least one live [En] marker is left untouched.
 */
export function ensureExternalFallback(response: string, fallback: string): string {
  const sections = splitSections(response);
  const external = sections.find((s) => s.kind === "external");
  if (!external) return response;
  if (/\[E\d+\]/.test(external.body)) return response;
  external.body = fallback;
  return rebuild(sections);
}

/**
 * Reads the stated support level out of the Confidence section, mapping the
 * three permitted sentences to a stable enum for the UI badge and audit trail.
 * Returns null when no Confidence section is present (legacy / other modes).
 */
export type ConfidenceLevel = "DOCUMENTS" | "MIXED" | "EXTERNAL";

export function parseConfidence(response: string): ConfidenceLevel | null {
  const section = splitSections(response).find((s) => s.kind === "confidence");
  if (!section) return null;
  const text = section.body.toLowerCase();
  if (text.includes("primarily based on external")) return "EXTERNAL";
  if (text.includes("partially supported")) return "MIXED";
  if (text.includes("fully supported")) return "DOCUMENTS";
  // A Confidence section that doesn't match the template still means the model
  // reached for external material; default to the cautious middle.
  return "MIXED";
}
