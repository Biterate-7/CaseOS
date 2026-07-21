import type { WorkspaceCitation } from "@/lib/matter-data";

/**
 * Reconnects an answer's [Sn] markers to the Citation rows they produced.
 *
 * Why this is non-trivial: `Citation` has no sourceNumber column, so the
 * database never records which marker created which row. What it does
 * guarantee is ordering — lib/ai/generate.ts walks sentences in order and
 * markers left-to-right within each sentence, and lib/actions/ai.ts persists
 * that array after filtering out markers that resolved to no chunk.
 *
 * So the Nth surviving citation corresponds to the Nth *resolvable* marker.
 * We walk markers in the same order and consume citations greedily, using
 * claimText as the checkpoint. A marker whose sentence doesn't match the next
 * unconsumed citation is one the model invented (e.g. [S9] with 8 sources) —
 * it stays rendered but inert, rather than silently stealing the next real
 * citation's evidence.
 *
 * Sentence splitting mirrors parseCitations exactly. If that regex ever
 * changes, this must change with it or markers will misalign.
 */

const MARKER = /\[S(\d+)\]/g;

export type AnswerSegment =
  | { kind: "text"; text: string }
  | {
      kind: "marker";
      sourceNumber: number;
      /** null when the model cited a source that doesn't exist. */
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

export type AlignedAnswer = {
  sentences: AnswerSentence[];
  /** Citation id -> the marker number it was cited as. */
  sourceNumberByCitation: Map<string, number>;
  /** Markers pointing at sources that were never retrieved. */
  unresolvedMarkerCount: number;
};

export function alignAnswer(
  response: string,
  citations: WorkspaceCitation[]
): AlignedAnswer {
  const paragraphs = response.split(/\n+/);
  const sentences: AnswerSentence[] = [];
  const sourceNumberByCitation = new Map<string, number>();

  let cursor = 0; // next unconsumed citation
  let unresolvedMarkerCount = 0;

  paragraphs.forEach((paragraph, paragraphIndex) => {
    // Same boundary rule as parseCitations: split after .!? when the next
    // character starts a new sentence.
    const rawSentences = paragraph
      .split(/(?<=[.!?])\s+(?=[A-Z0-9"[])/)
      .map((s) => s.trim())
      .filter(Boolean);

    rawSentences.forEach((sentence, sentenceIndex) => {
      const bare = sentence.replace(/\s*\[S\d+\]/g, "").trim();
      const segments: AnswerSegment[] = [];
      const citationIds: string[] = [];

      let lastIndex = 0;
      MARKER.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = MARKER.exec(sentence)) !== null) {
        if (match.index > lastIndex) {
          segments.push({
            kind: "text",
            text: sentence.slice(lastIndex, match.index),
          });
        }

        const sourceNumber = Number(match[1]);
        const candidate = citations[cursor];
        // The checkpoint: a real citation for this marker carries this
        // sentence as its claimText.
        const matches = candidate != null && candidate.claimText === bare;

        if (matches) {
          segments.push({
            kind: "marker",
            sourceNumber,
            citationId: candidate.id,
          });
          citationIds.push(candidate.id);
          sourceNumberByCitation.set(candidate.id, sourceNumber);
          cursor += 1;
        } else {
          segments.push({ kind: "marker", sourceNumber, citationId: null });
          unresolvedMarkerCount += 1;
        }

        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < sentence.length) {
        segments.push({ kind: "text", text: sentence.slice(lastIndex) });
      }

      sentences.push({
        key: `${paragraphIndex}-${sentenceIndex}`,
        segments,
        citationIds,
        startsParagraph: sentenceIndex === 0 && paragraphIndex > 0,
      });
    });
  });

  return { sentences, sourceNumberByCitation, unresolvedMarkerCount };
}
