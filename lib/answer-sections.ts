/**
 * Structured-answer sections for Enhanced Research.
 *
 * Mode-aware generation (lib/ai/generate.ts) instructs the model to emit the
 * answer under fixed markdown headings. This module is the single definition
 * of those headings and the parser that recovers them — shared by the server
 * (to sanitize the "Additional Context" section before persistence) and the
 * client (to render document-grounded and AI-generated content differently).
 *
 * No `server-only` import: pure string functions.
 */

export type AnswerSectionKind =
  | "summary"
  | "evidence"
  | "context"
  | "implications"
  /** Text before any heading, or an entire legacy unstructured answer. */
  | "answer";

export type AnswerSection = {
  kind: AnswerSectionKind;
  /** Display heading; null for the implicit "answer" section. */
  title: string | null;
  body: string;
};

/**
 * Whether a section's claims come from retrieved documents. Only "context"
 * is model knowledge — everything else must be citation-backed.
 */
export function isGroundedSection(kind: AnswerSectionKind): boolean {
  return kind !== "context";
}

export const SECTION_TITLES: Record<
  Exclude<AnswerSectionKind, "answer">,
  string
> = {
  summary: "Summary",
  evidence: "Evidence from Documents",
  context: "Additional Context",
  implications: "Practical Implications",
};

/** `## Summary` … matched case-insensitively on its own line. */
const HEADING = /^##\s+(Summary|Evidence from Documents|Additional Context|Practical Implications)\s*$/i;

const KIND_BY_TITLE: Record<string, Exclude<AnswerSectionKind, "answer">> = {
  summary: "summary",
  "evidence from documents": "evidence",
  "additional context": "context",
  "practical implications": "implications",
};

/**
 * Splits a persisted response into its sections, in the order the model
 * emitted them. A response with no headings (legacy interactions, refusals)
 * comes back as a single implicit "answer" section, so old rows render
 * exactly as they always did.
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
      current = { kind, title: SECTION_TITLES[kind], body: "" };
    } else {
      current.body += (current.body ? "\n" : "") + line;
    }
  }
  push();

  return sections;
}

/**
 * Removes `[Sn]` markers from every non-grounded section and reassembles the
 * response. This is the mechanical guarantee behind "never fabricate document
 * citations": even if the model drops a marker into Additional Context, it is
 * stripped before citation parsing and persistence, so no Citation row — and
 * no clickable marker — can ever point out of AI-generated text.
 *
 * Returns the sanitized response plus how many markers were removed (recorded
 * in the audit trail).
 */
export function stripUngroundedMarkers(response: string): {
  response: string;
  strippedMarkerCount: number;
} {
  const sections = splitSections(response);
  if (!sections.some((s) => !isGroundedSection(s.kind))) {
    return { response, strippedMarkerCount: 0 };
  }

  let strippedMarkerCount = 0;
  const parts = sections.map((section) => {
    let body = section.body;
    if (!isGroundedSection(section.kind)) {
      const markers = body.match(/\s*\[S\d+\]/g);
      strippedMarkerCount += markers?.length ?? 0;
      body = body.replace(/\s*\[S\d+\]/g, "");
    }
    return section.title != null ? `## ${section.title}\n${body}` : body;
  });

  return { response: parts.join("\n\n"), strippedMarkerCount };
}
