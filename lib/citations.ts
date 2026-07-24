import {
  sectionGrounding,
  splitSections,
  type AnswerSectionKind,
  type SectionGrounding,
} from "@/lib/answer-sections";
import type { WorkspaceCitation, WorkspaceExternalCitation } from "@/lib/matter-data";

/**
 * Reconnects an answer's citation markers to the rows they produced.
 *
 * Document markers ([Sn]): `Citation` has no sourceNumber column, so the
 * database never records which marker created which row. What it does
 * guarantee is ordering — lib/ai/generate.ts walks sentences in order and
 * markers left-to-right within each sentence, and lib/actions/ai.ts persists
 * that array after filtering out markers that resolved to no chunk. So the Nth
 * surviving citation corresponds to the Nth *resolvable* marker; we walk
 * markers in the same order and consume citations greedily, using claimText as
 * the checkpoint. A marker whose sentence doesn't match the next unconsumed
 * citation is one the model invented (e.g. [S9] with 8 sources) — it stays
 * rendered but inert, rather than silently stealing the next real citation.
 *
 * External markers ([En]): `ExternalCitation` stores its own marker number, so
 * these resolve directly by number — no greedy cursor needed. A marker whose
 * number has no verified row (verification stripped it, but a stray survived)
 * renders inert.
 *
 * Section awareness: each section's grounding decides which marker type is
 * live. Document sections resolve [Sn]; the External Research section resolves
 * [En]; AI-authored sections (context/analysis/confidence) had both stripped
 * server-side and carry none. The document cursor runs across document sections
 * only, in the same order parseCitations walked them.
 *
 * Sentence splitting mirrors parseCitations exactly. If that regex ever
 * changes, this must change with it or markers will misalign.
 */

const DOC_MARKER = /\[S(\d+)\]/g;
const EXT_MARKER = /\[E(\d+)\]/g;

export type AnswerSegment =
  | { kind: "text"; text: string }
  | {
      kind: "marker";
      /** "S" for a document citation, "E" for an external one. */
      markerType: "S" | "E";
      sourceNumber: number;
      /** null when the marker resolves to no row (invented / unverified). */
      citationId: string | null;
    };

export type AnswerSentence = {
  key: string;
  segments: AnswerSegment[];
  /** Citation ids grounding this sentence — drives claim highlighting. */
  citationIds: string[];
  /** True when this sentence starts a new paragraph. */
  startsParagraph: boolean;
};

export type AlignedSection = {
  key: string;
  kind: AnswerSectionKind;
  /** Display heading; null for the implicit section of a legacy answer. */
  title: string | null;
  grounding: SectionGrounding;
  /** True only for document-grounded sections — back-compat convenience. */
  grounded: boolean;
  sentences: AnswerSentence[];
};

export type AlignedAnswer = {
  /** Sections in emitted order; a single implicit one for legacy answers. */
  sections: AlignedSection[];
  /** All sentences across sections, in order. */
  sentences: AnswerSentence[];
  /** Document citation id -> the marker number it was cited as. */
  sourceNumberByCitation: Map<string, number>;
  /** Document markers pointing at sources that were never retrieved. */
  unresolvedMarkerCount: number;
};

export function alignAnswer(
  response: string,
  citations: WorkspaceCitation[],
  externalCitations: WorkspaceExternalCitation[] = []
): AlignedAnswer {
  const sections: AlignedSection[] = [];
  const allSentences: AnswerSentence[] = [];
  const sourceNumberByCitation = new Map<string, number>();
  const externalByMarker = new Map<number, WorkspaceExternalCitation>(
    externalCitations.map((c) => [c.marker, c])
  );

  let cursor = 0; // next unconsumed document citation — shared across sections
  let unresolvedMarkerCount = 0;

  splitSections(response).forEach((section, sectionIndex) => {
    const grounding = sectionGrounding(section.kind);
    const sentences: AnswerSentence[] = [];
    const paragraphs = section.body.split(/\n+/);

    paragraphs.forEach((paragraph, paragraphIndex) => {
      // Same boundary rule as parseCitations: split after .!? when the next
      // character starts a new sentence.
      const rawSentences = paragraph
        .split(/(?<=[.!?])\s+(?=[A-Z0-9"[])/)
        .map((s) => s.trim())
        .filter(Boolean);

      rawSentences.forEach((sentence, sentenceIndex) => {
        const bare = sentence.replace(/\s*\[[SE]\d+\]/g, "").trim();
        const segments: AnswerSegment[] = [];
        const citationIds: string[] = [];

        const marker = grounding === "external" ? EXT_MARKER : DOC_MARKER;
        let lastIndex = 0;
        marker.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = marker.exec(sentence)) !== null) {
          if (match.index > lastIndex) {
            segments.push({ kind: "text", text: sentence.slice(lastIndex, match.index) });
          }
          const sourceNumber = Number(match[1]);

          if (grounding === "external") {
            const row = externalByMarker.get(sourceNumber) ?? null;
            segments.push({
              kind: "marker",
              markerType: "E",
              sourceNumber,
              citationId: row?.id ?? null,
            });
            if (row) citationIds.push(row.id);
          } else if (grounding === "document") {
            const candidate = citations[cursor];
            // The checkpoint: a real citation for this marker carries this
            // sentence (markers stripped) as its claimText.
            const matches = candidate != null && candidate.claimText === bare;
            if (matches) {
              segments.push({ kind: "marker", markerType: "S", sourceNumber, citationId: candidate.id });
              citationIds.push(candidate.id);
              sourceNumberByCitation.set(candidate.id, sourceNumber);
              cursor += 1;
            } else {
              segments.push({ kind: "marker", markerType: "S", sourceNumber, citationId: null });
              unresolvedMarkerCount += 1;
            }
          }

          lastIndex = match.index + match[0].length;
        }

        if (lastIndex < sentence.length) {
          segments.push({ kind: "text", text: sentence.slice(lastIndex) });
        }

        sentences.push({
          key: `${sectionIndex}-${paragraphIndex}-${sentenceIndex}`,
          segments,
          citationIds,
          startsParagraph: sentenceIndex === 0 && paragraphIndex > 0,
        });
      });
    });

    sections.push({
      key: `section-${sectionIndex}`,
      kind: section.kind,
      title: section.title,
      grounding,
      grounded: grounding === "document",
      sentences,
    });
    allSentences.push(...sentences);
  });

  return {
    sections,
    sentences: allSentences,
    sourceNumberByCitation,
    unresolvedMarkerCount,
  };
}
