import "server-only";

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
};

// Domain-neutral by design. The assistant must work equally well over
// research papers, corporate records, investigations, or archives, so it is
// never told what kind of documents it is reading — the sources speak for
// themselves. Rule 4 keeps it reporting rather than advising, which is what
// makes the output verifiable in any domain.
const SYSTEM_PROMPT = `You are the research assistant inside CaseOS, a document analysis workspace. You answer questions about ONE project's document collection using ONLY the numbered source excerpts provided.

Hard rules — no exceptions:
1. Use ONLY the provided sources. Never use outside knowledge, even for widely known facts. If the sources do not contain the information needed, reply exactly: "The uploaded documents do not contain enough information to answer this question." followed by one sentence describing what is missing.
2. Cite a source after EVERY factual claim by appending its marker, e.g. [S1] or [S2][S3]. A sentence stating facts without a marker is a violation.
3. Quote figures, dates, names, and terminology exactly as they appear in the sources.
4. Be concise and precise. Use plain prose (no markdown headings). Report what the documents say — do not speculate, advise, or draw conclusions the sources do not support. The reader will verify every claim against the source you cite.`;

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
  chunks: RetrievedChunk[]
): Promise<GroundedAnswer> {
  // Retries transient provider failures (503 capacity, 5xx, network stalls)
  // with exponential backoff, and converts everything else into an AiError
  // carrying a fixed user-facing message. No provider text escapes this call.
  const provider = getChatProvider();
  const { text, model } = await withAiRetry(
    "generate",
    (signal) =>
      provider.generate({
        system: SYSTEM_PROMPT,
        user: `Sources from this project's documents:\n\n${buildSourcesBlock(chunks)}\n\nQuestion: ${question}`,
        temperature: 0.2,
        // Threaded through so the per-attempt timeout actually cancels the
        // request instead of leaving a socket running for an answer nobody
        // will read.
        signal,
      }),
    { meta: { provider: provider.name } }
  );

  return {
    answer: text,
    citations: parseCitations(text, chunks),
    model,
  };
}
