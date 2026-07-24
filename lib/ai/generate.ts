import "server-only";

import {
  ensureExternalFallback,
  parseConfidence,
  sanitizeCrossSectionMarkers,
  stripExternalMarkers,
  stripUngroundedMarkers,
  type ConfidenceLevel,
} from "@/lib/answer-sections";
import type { KnowledgeMode } from "@/lib/format";
import { parseExternalCandidates, splitSourcesBlock, usedExternalMarkers } from "./external/parse";
import {
  verifyExternalCitations,
  type ExternalVerifier,
  type RejectedExternalCitation,
  type VerifiedExternalCitation,
} from "./external/verify";
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

/** Extra results present only for DOCUMENT_PLUS_EXTERNAL answers. */
export type ExternalResult = {
  /** True when at least one external citation survived verification. */
  used: boolean;
  citations: VerifiedExternalCitation[];
  /** Candidates dropped by policy or failed verification — for the audit trail. */
  rejected: RejectedExternalCitation[];
  confidence: ConfidenceLevel | null;
  /** [Sn] markers removed from non-document sections. */
  strippedDocMarkers: number;
  /** [En] markers removed from document/AI sections. */
  strippedExternalMarkers: number;
  /** [En] markers removed because their source failed verification. */
  removedFailedMarkers: number;
};

export type GroundedAnswer = {
  answer: string;
  citations: ParsedCitation[];
  model: string;
  /**
   * [Sn] markers the model placed inside AI-generated context (DOCUMENT_PLUS_AI),
   * removed before parsing/persistence.
   */
  strippedMarkerCount: number;
  /** Present only for DOCUMENT_PLUS_EXTERNAL. */
  external?: ExternalResult;
};

// Domain-neutral by design. The assistant works over research papers,
// corporate records, investigations, or archives, so it is never told what
// kind of documents it is reading — the sources speak for themselves.
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

// External Research. The prose rules matter, but the real guarantees are
// mechanical (server-side verification + marker sanitisation): a fabricated URL
// is fetched and dropped, and [En]/[Sn] markers cannot cross sections. The
// prompt still front-loads honesty so the model produces less to reject.
const DOCUMENT_PLUS_EXTERNAL_STRUCTURE = `Documents come first. Only introduce external research when the uploaded sources are insufficient to fully answer the question. If they fully answer it, do NOT add external research.

Structure the answer under exactly these markdown headings, in this order:

## Summary
Two to four sentences answering the question. Cite the uploaded documents with [Sn] for any claim drawn from them. Do not place an [En] marker here.

## Evidence from Uploaded Documents
What the uploaded documents establish, claim by claim, each cited with [Sn]. Uploaded sources only — no outside knowledge here. If the documents contain nothing relevant, write exactly: "The uploaded documents do not address this question."

## External Research
Include this section ONLY when the documents are insufficient. Every factual claim here comes from an external source and MUST carry an [En] marker referring to an entry in the Sources list below. Every paragraph must contain at least one [En] citation. NEVER place a document [Sn] marker in this section.
Cite only authoritative, reputable sources: government and official bodies, courts and legislation databases, official international organizations, universities, peer-reviewed journals, official organization publications, and major news agencies (Reuters, Associated Press, Bloomberg, BBC, Financial Times) for factual reporting. Do NOT cite blogs, forums, Reddit, Quora, opinion pieces, SEO content, or an encyclopedia as a primary source.
NEVER invent a source, URL, title, publication date, quotation, case, or statute. If you cannot recall a specific, real, verifiable source with a real URL for a claim, do not make the claim. If no reliable external source supports the answer, write exactly: "I could not verify this information from a reliable external source."
If authoritative sources disagree, present each position, cite each, explain the disagreement, and do not choose a side unless the uploaded documents support one.
Omit this entire section if you used no external research.

## Analysis
Explain how the external information relates to the uploaded documents — agreements, gaps, contradictions. This is your interpretation; do not place [Sn] or [En] markers here.

## Confidence
State exactly one sentence, choosing the accurate one:
- "Fully supported by the uploaded documents."
- "Partially supported by the uploaded documents and external research."
- "Primarily based on external research."

If — and only if — you cited any external source, append a machine-readable list after Confidence:

### Sources
One line per external citation, each in EXACTLY this format (keep the field labels):
[E1] title: <full title> | publisher: <organization> | date: <YYYY-MM-DD, or n.d. if unknown> | url: <https URL>

Every [En] used above must appear here with a real, working URL. Do not list a source you did not cite.`;

const SYSTEM_PROMPTS: Record<KnowledgeMode, string> = {
  DOCUMENT_ONLY: `${GROUNDED_RULES}\n\n${DOCUMENT_ONLY_STRUCTURE}`,
  DOCUMENT_PLUS_AI: `${GROUNDED_RULES}\n\n${DOCUMENT_PLUS_AI_STRUCTURE}`,
  DOCUMENT_PLUS_EXTERNAL: `${GROUNDED_RULES}\n\n${DOCUMENT_PLUS_EXTERNAL_STRUCTURE}`,
};

const EXTERNAL_FALLBACK = "I could not verify this information from a reliable external source.";

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

/**
 * Post-processes a raw DOCUMENT_PLUS_EXTERNAL model response into a verified,
 * persistable answer. Extracted from the provider call so it can be unit-tested
 * with a stub verifier and no network.
 *
 * Steps, in order:
 *  1. Split off the `### Sources` metadata block and parse its candidates.
 *  2. Sanitise cross-section markers ([Sn] only in document sections, [En] only
 *     in External Research) so citation types can never mix.
 *  3. Verify every cited external candidate (domain policy + real URL fetch).
 *  4. Strip inline [En] markers whose source failed verification, and drop the
 *     External Research section to the fallback line if nothing survived.
 *  5. Parse the surviving document [Sn] citations and read the Confidence level.
 */
export async function finalizeExternalAnswer(
  rawText: string,
  chunks: RetrievedChunk[],
  verify: ExternalVerifier
): Promise<{
  answer: string;
  citations: ParsedCitation[];
  external: ExternalResult;
}> {
  const { body, sourcesBlock } = splitSourcesBlock(rawText);
  const candidates = parseExternalCandidates(sourcesBlock);

  const { response: sanitized, strippedDocMarkers, strippedExternalMarkers } =
    sanitizeCrossSectionMarkers(body);

  // Only verify candidates actually cited inline; an orphan Sources entry the
  // model never referenced is not a claim and is ignored.
  const cited = usedExternalMarkers(sanitized);
  const toVerify = candidates.filter((c) => cited.has(c.marker));

  const { verified, rejected } = await verify(toVerify);
  const verifiedMarkers = new Set(verified.map((v) => v.marker));

  // Any inline [En] whose source didn't verify is removed from the prose.
  const failedMarkers = new Set([...cited].filter((m) => !verifiedMarkers.has(m)));
  const stripped = stripExternalMarkers(sanitized, failedMarkers);

  // If the External Research section now has no surviving citation, replace it
  // with the mandated "could not verify" line — never leave uncited claims.
  const answer = ensureExternalFallback(stripped.response, EXTERNAL_FALLBACK);

  // Persist only citations still referenced by a surviving inline marker,
  // deduped by marker (first verified wins).
  const survivingMarkers = usedExternalMarkers(answer);
  const seen = new Set<number>();
  const citationsToKeep = verified.filter((v) => {
    if (!survivingMarkers.has(v.marker) || seen.has(v.marker)) return false;
    seen.add(v.marker);
    return true;
  });

  return {
    answer,
    citations: parseCitations(answer, chunks),
    external: {
      used: citationsToKeep.length > 0,
      citations: citationsToKeep,
      rejected,
      confidence: parseConfidence(answer),
      strippedDocMarkers,
      strippedExternalMarkers,
      removedFailedMarkers: stripped.removed,
    },
  };
}

export async function generateGroundedAnswer(
  question: string,
  chunks: RetrievedChunk[],
  knowledgeMode: KnowledgeMode = "DOCUMENT_ONLY",
  options: { verify?: ExternalVerifier } = {}
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

  if (knowledgeMode === "DOCUMENT_PLUS_EXTERNAL") {
    const verify = options.verify ?? verifyExternalCitations;
    const { answer, citations, external } = await finalizeExternalAnswer(text, chunks, verify);
    return { answer, citations, model, strippedMarkerCount: 0, external };
  }

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
