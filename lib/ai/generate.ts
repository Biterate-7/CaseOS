import "server-only";

import { stripUngroundedMarkers } from "@/lib/answer-sections";
import type { KnowledgeMode } from "@/lib/format";
import { withAiRetry } from "./errors";
import { getChatProvider } from "./provider";
import type { RetrievedChunk } from "./retrieve";

export type ParsedCitation = {
  /** 1-based source number the model cited, e.g. 2 for [S2] */
  sourceNumber: number;
  /** The retrieved chunk the marker resolves to; null if the model cited a nonexistent source */
  chunk: RetrievedChunk | null;
  /** The sentence in the answer containing the marker */
  claimText: string;
};

export type GroundedAnswer = {
  answer: string;
  citations: ParsedCitation[];
  model: string;
  /**
   * [Sn] markers the model placed inside the AI-generated "Additional
   * Context" section, removed before parsing/persistence. Non-zero values are
   * recorded in the audit trail — they mean the model tried to dress outside
   * knowledge up as document evidence.
   */
  strippedMarkerCount: number;
};

// Domain-neutral by design. The assistant must work equally well over
// research papers, corporate records, investigations, or archives, so it is
// never told what kind of documents it is reading — the sources speak for
// themselves. The "report, don't speculate" rule keeps the grounded sections
// verifiable in any domain.
const GROUNDED_RULES = `You are the research assistant inside CaseOS, a document analysis workspace. You answer questions about ONE project's document collection using the numbered source excerpts provided.

Hard rules for document-grounded content — no exceptions:
1. Ground every factual claim in the provided sources and cite the source after EVERY factual claim by appending its marker, e.g. [S1] or [S2][S3]. A sentence stating facts without a marker is a violation.
2. Quote figures, dates, names, and terminology exactly as they appear in the sources.
3. Be concise and precise. Use plain prose within each section (no nested headings, no lists). Report what the documents say — do not speculate or draw conclusions the sources do not support. The reader will verify every claim against the source you cite.
4. If the sources do not contain the information needed to answer at all, skip the section structure and reply exactly: "The uploaded documents do not contain enough information to answer this question." followed by one sentence describing what is missing.`;

const DOCUMENT_ONLY_STRUCTURE = `Use ONLY the provided sources everywhere. Never use outside knowledge, even for widely known facts.

Structure the answer under exactly these markdown headings, in this order:

## Summary
Two or three sentences answering the question directly, each cited.

## Evidence from Documents
What the sources establish, claim by claim, each cited.

## Practical Implications
What follows directly from the cited evidence for the question asked — stated cautiously, grounded only in the sources, each claim cited.

Never include an "Additional Context" heading or any other heading.`;

const DOCUMENT_PLUS_AI_STRUCTURE = `Structure the answer under exactly these markdown headings, in this order:

## Summary
Two or three sentences answering the question from the sources, each cited.

## Evidence from Documents
What the sources establish, claim by claim, each cited. Sources only — no outside knowledge in this section.

## Additional Context
Optional — include only when general background knowledge genuinely helps interpret the evidence above. Everything in this section comes from your own general knowledge, NOT from the provided documents. NEVER place a source marker like [S1] in this section, and never present outside knowledge as if it came from the documents. If the documents fully cover the question, omit this section entirely.

## Practical Implications
What follows from the cited evidence for the question asked. Claims drawn from the documents must be cited; do not introduce new outside facts here — outside knowledge belongs only under Additional Context.

The document-grounded sections (Summary, Evidence from Documents, Practical Implications) follow the hard rules above without exception. Outside knowledge supplements the retrieved sources; it never replaces or contradicts them.`;

const SYSTEM_PROMPTS: Record<KnowledgeMode, string> = {
  DOCUMENT_ONLY: `${GROUNDED_RULES}\n\n${DOCUMENT_ONLY_STRUCTURE}`,
  DOCUMENT_PLUS_AI: `${GROUNDED_RULES}\n\n${DOCUMENT_PLUS_AI_STRUCTURE}`,
};

function buildSourcesBlock(chunks: RetrievedChunk[]): string {
  return chunks
    .map((chunk, i) => {
      const page = chunk.pageNumber != null ? `, page ${chunk.pageNumber}` : "";
      return `[S${i + 1}] Document "${chunk.documentTitle}"${page}:\n${chunk.content}`;
    })
    .join("\n\n---\n\n");
}

/** Splits an answer into sentences and pairs every [Sn] marker with its sentence. */
export function parseCitations(
  answer: string,
  chunks: RetrievedChunk[]
): ParsedCitation[] {
  const citations: ParsedCitation[] = [];
  // Sentence boundaries: split on newline or on ". " style punctuation.
  const sentences = answer
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"[])|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const sentence of sentences) {
    const markers = [...sentence.matchAll(/\[S(\d+)\]/g)];
    for (const match of markers) {
      const sourceNumber = Number(match[1]);
      citations.push({
        sourceNumber,
        chunk: chunks[sourceNumber - 1] ?? null,
        claimText: sentence.replace(/\s*\[S\d+\]/g, "").trim(),
      });
    }
  }
  return citations;
}

export async function generateGroundedAnswer(
  question: string,
  chunks: RetrievedChunk[],
  knowledgeMode: KnowledgeMode = "DOCUMENT_ONLY"
): Promise<GroundedAnswer> {
  // Retries transient provider failures (503 capacity, 5xx, network stalls)
  // with exponential backoff, and converts everything else into an AiError
  // carrying a fixed user-facing message. No provider text escapes this call.
  const provider = getChatProvider();
  const { text, model } = await withAiRetry(
    "generate",
    (signal) =>
      provider.generate({
        system: SYSTEM_PROMPTS[knowledgeMode],
        user: `Sources from this project's documents:\n\n${buildSourcesBlock(chunks)}\n\nQuestion: ${question}`,
        temperature: 0.2,
        // Threaded through so the per-attempt timeout actually cancels the
        // request instead of leaving a socket running for an answer nobody
        // will read.
        signal,
      }),
    { meta: { provider: provider.name } }
  );

  // Enforce mechanically what the prompt requests: no citation markers may
  // survive inside AI-generated context. parseCitations runs on the sanitized
  // text, so a stripped marker can never become a Citation row.
  const { response: answer, strippedMarkerCount } = stripUngroundedMarkers(text);

  return {
    answer,
    citations: parseCitations(answer, chunks),
    model,
    strippedMarkerCount,
  };
}
