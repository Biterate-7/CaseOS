import { alignAnswer } from "@/lib/citations";

/**
 * Mirrors lib/ai/generate.ts parseCitations + lib/actions/ai.ts persistence
 * EXACTLY, so this test proves alignAnswer stays in sync with the real
 * producer rather than with hand-written fixtures.
 */
type C = {
  id: string;
  claimText: string;
  quotedText: string;
  verified: boolean;
  documentId: string;
  documentTitle: string;
  pageNumber: number | null;
};

function simulateBackend(answer: string, sourceCount: number): C[] {
  // generate.ts: parseCitations
  const sentences = answer
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"[])|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const parsed: { sourceNumber: number; resolved: boolean; claimText: string }[] =
    [];
  for (const sentence of sentences) {
    for (const match of sentence.matchAll(/\[S(\d+)\]/g)) {
      const sourceNumber = Number(match[1]);
      parsed.push({
        sourceNumber,
        // chunks[sourceNumber - 1] ?? null
        resolved: sourceNumber >= 1 && sourceNumber <= sourceCount,
        claimText: sentence.replace(/\s*\[S\d+\]/g, "").trim(),
      });
    }
  }

  // ai.ts: citations.filter(c => c.chunk != null), persisted in this order
  return parsed
    .filter((p) => p.resolved)
    .map((p, i) => ({
      id: `c${i + 1}`,
      claimText: p.claimText.slice(0, 1000),
      quotedText: "…",
      verified: true,
      documentId: "d1",
      documentTitle: "Lease Agreement",
      pageNumber: 3,
    }));
}

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const ok = a === e;
  if (!ok) failures++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n   expected ${e}\n   actual   ${a}`}`
  );
}

// --- 1. Simple: one marker per sentence -----------------------------------
{
  const answer =
    "The lease began on March 1 [S1]. Rent is $4,200 per month [S2].";
  const citations = simulateBackend(answer, 8);
  const r = alignAnswer(answer, citations);
  check("simple: 2 citations persisted", citations.length, 2);
  check("simple: no unresolved", r.unresolvedMarkerCount, 0);
  check(
    "simple: S1->c1, S2->c2",
    [...r.sourceNumberByCitation.entries()],
    [
      ["c1", 1],
      ["c2", 2],
    ]
  );
  check("simple: sentence 1 grounds c1", r.sentences[0].citationIds, ["c1"]);
  check("simple: sentence 2 grounds c2", r.sentences[1].citationIds, ["c2"]);
}

// --- 2. Two markers in one sentence ---------------------------------------
{
  const answer = "Both parties signed the amendment [S1][S3].";
  const citations = simulateBackend(answer, 8);
  const r = alignAnswer(answer, citations);
  check("multi-marker: 2 persisted", citations.length, 2);
  check("multi-marker: none unresolved", r.unresolvedMarkerCount, 0);
  check(
    "multi-marker: source numbers preserved (1 and 3)",
    [...r.sourceNumberByCitation.entries()],
    [
      ["c1", 1],
      ["c2", 3],
    ]
  );
  check("multi-marker: sentence grounds both", r.sentences[0].citationIds, [
    "c1",
    "c2",
  ]);
}

// --- 3. CRITICAL: hallucinated marker must not steal a later citation -----
// Only 2 sources were retrieved, but the model emits [S9] mid-answer.
{
  const answer =
    "The lease began on March 1 [S1]. The tenant waived inspection [S9]. Rent is $4,200 per month [S2].";
  const citations = simulateBackend(answer, 2);
  const r = alignAnswer(answer, citations);

  check("hallucinated: only 2 rows persisted (S9 dropped)", citations.length, 2);
  check("hallucinated: 1 unresolved marker detected", r.unresolvedMarkerCount, 1);
  check(
    "hallucinated: real citations keep correct source numbers",
    [...r.sourceNumberByCitation.entries()],
    [
      ["c1", 1],
      ["c2", 2],
    ]
  );
  check("hallucinated: S9 sentence grounds nothing", r.sentences[1].citationIds, []);
  check(
    "hallucinated: S9 marker inert",
    r.sentences[1].segments.filter((s) => s.kind === "marker"),
    [{ kind: "marker", sourceNumber: 9, citationId: null }]
  );
  check(
    "hallucinated: LAST sentence still correctly grounds c2 (no theft)",
    r.sentences[2].citationIds,
    ["c2"]
  );
}

// --- 4. Hallucinated marker FIRST -----------------------------------------
{
  const answer = "An unsupported assertion [S7]. A supported one [S1].";
  const citations = simulateBackend(answer, 1);
  const r = alignAnswer(answer, citations);
  check("leading-hallucination: 1 row persisted", citations.length, 1);
  check("leading-hallucination: 1 unresolved", r.unresolvedMarkerCount, 1);
  check("leading-hallucination: first grounds nothing", r.sentences[0].citationIds, []);
  check("leading-hallucination: second grounds c1", r.sentences[1].citationIds, ["c1"]);
}

// --- 5. Paragraphs ---------------------------------------------------------
{
  const answer = "First point [S1].\n\nSecond point [S2].";
  const citations = simulateBackend(answer, 8);
  const r = alignAnswer(answer, citations);
  check("paragraphs: 2 sentences", r.sentences.length, 2);
  check("paragraphs: second starts paragraph", r.sentences[1].startsParagraph, true);
  check("paragraphs: first does not", r.sentences[0].startsParagraph, false);
  check("paragraphs: both aligned", r.unresolvedMarkerCount, 0);
}

// --- 6. Repeated identical sentences (ambiguity stress test) --------------
{
  const answer = "The deposit is $5,000 [S1]. The deposit is $5,000 [S2].";
  const citations = simulateBackend(answer, 8);
  const r = alignAnswer(answer, citations);
  check("duplicate sentences: none unresolved", r.unresolvedMarkerCount, 0);
  check(
    "duplicate sentences: distinct citations, correct order",
    [...r.sourceNumberByCitation.entries()],
    [
      ["c1", 1],
      ["c2", 2],
    ]
  );
  check("duplicate sentences: s1->c1", r.sentences[0].citationIds, ["c1"]);
  check("duplicate sentences: s2->c2", r.sentences[1].citationIds, ["c2"]);
}

// --- 7. Refusal answer, no markers ----------------------------------------
{
  const answer =
    "The uploaded documents do not contain enough information to answer this question. The lease term is missing.";
  const citations = simulateBackend(answer, 8);
  const r = alignAnswer(answer, citations);
  check("refusal: no citations", citations.length, 0);
  check("refusal: 2 sentences rendered", r.sentences.length, 2);
  check("refusal: none unresolved", r.unresolvedMarkerCount, 0);
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
