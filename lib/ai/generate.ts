import "server-only";

import { GROK_MODEL, grok } from "./client";
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

const SYSTEM_PROMPT = `You are the research assistant inside CaseOS, a legal workspace. You answer questions about ONE legal matter using ONLY the numbered source excerpts provided.

Hard rules — no exceptions:
1. Use ONLY the provided sources. Never use outside knowledge, even for well-known law. If the sources do not contain the information needed, reply exactly: "The uploaded documents do not contain enough information to answer this question." followed by one sentence describing what is missing.
2. Cite a source after EVERY factual claim by appending its marker, e.g. [S1] or [S2][S3]. A sentence stating facts without a marker is a violation.
3. Quote figures, dates, and names exactly as they appear in the sources.
4. Be concise and precise. Use plain prose (no markdown headings). You are assisting a lawyer who will verify everything — do not give legal advice, only report what the documents say.`;

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
  const completion = await grok.chat.completions.create({
    model: GROK_MODEL,
    temperature: 0.2,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Sources from this matter's documents:\n\n${buildSourcesBlock(chunks)}\n\nQuestion: ${question}`,
      },
    ],
  });

  const answer = completion.choices[0]?.message?.content?.trim();
  if (!answer) {
    throw new Error("The AI model returned an empty answer.");
  }

  return {
    answer,
    citations: parseCitations(answer, chunks),
    model: completion.model ?? GROK_MODEL,
  };
}
