/**
 * Unit tests for External Research with Verified Sources — the pure,
 * network-free guarantees: source-quality policy, Sources-block parsing,
 * cross-section marker sanitisation, verification-driven stripping, the
 * "could not verify" fallback, and Confidence parsing.
 *
 * Runs with a STUB verifier, so no URLs are fetched and no DB is touched.
 * Run: npm run test:external
 */
import { splitSections } from "@/lib/answer-sections";
import { alignAnswer } from "@/lib/citations";
import { classifyUrl } from "@/lib/ai/external/policy";
import { parseExternalCandidates, splitSourcesBlock } from "@/lib/ai/external/parse";
import { finalizeExternalAnswer } from "@/lib/ai/generate";
import type { ExternalVerifier } from "@/lib/ai/external/verify";
import type { RetrievedChunk } from "@/lib/ai/retrieve";

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

// A couple of fake retrieved chunks so document [Sn] markers resolve.
const CHUNKS: RetrievedChunk[] = [
  { chunkId: "ch1", documentId: "d1", documentTitle: "Lease", fileName: "lease.pdf", pageNumber: 1, chunkIndex: 0, content: "chunk one", distance: 0.1 },
  { chunkId: "ch2", documentId: "d1", documentTitle: "Lease", fileName: "lease.pdf", pageNumber: 2, chunkIndex: 1, content: "chunk two", distance: 0.2 },
];

/**
 * Stub verifier: approves URLs whose host is in `live`, and applies the same
 * domain policy the real one does (so "avoid" hosts are rejected without a
 * "fetch"). No network.
 */
function stubVerifier(liveHosts: string[]): ExternalVerifier {
  const live = new Set(liveHosts);
  return async (candidates) => {
    const verified = [];
    const rejected = [];
    for (const c of candidates) {
      const { tier } = classifyUrl(c.url);
      const host = new URL(c.url).hostname;
      if (tier === "avoid") {
        rejected.push({ marker: c.marker, url: c.url, domain: host, tier, httpStatus: null, reason: "low-quality" });
      } else if (live.has(host)) {
        verified.push({
          marker: c.marker, title: c.title, publisher: c.publisher,
          publishedAt: c.publishedAt, url: c.url, finalUrl: null,
          domain: host, tier, httpStatus: 200, accessedAt: new Date("2026-07-24T00:00:00Z"),
        });
      } else {
        rejected.push({ marker: c.marker, url: c.url, domain: host, tier, httpStatus: 404, reason: "URL did not resolve" });
      }
    }
    return { verified, rejected };
  };
}

async function main() {
// --- 1. Source-quality policy ---------------------------------------------
{
  check("policy: .gov is preferred", classifyUrl("https://www.dol.gov/agencies/whd").tier, "preferred");
  check("policy: .edu is preferred", classifyUrl("https://law.harvard.edu/x").tier, "preferred");
  check("policy: gov.uk cctld is preferred", classifyUrl("https://www.legislation.gov.uk/ukpga").tier, "preferred");
  check("policy: reuters is acceptable", classifyUrl("https://www.reuters.com/world/x").tier, "acceptable");
  check("policy: reddit is avoid", classifyUrl("https://www.reddit.com/r/law").tier, "avoid");
  check("policy: wikipedia is avoid", classifyUrl("https://en.wikipedia.org/wiki/x").tier, "avoid");
  check("policy: unknown host is unknown", classifyUrl("https://some-random-site.example/x").tier, "unknown");
  check("policy: non-http is avoid", classifyUrl("ftp://x.gov/file").tier, "avoid");
  check("policy: avoid list beats gov substring", classifyUrl("https://mygov.blogspot.com/x").tier, "avoid");
}

// --- 2. Sources block parsing ---------------------------------------------
{
  const raw = [
    "## External Research",
    "Overtime rules are federal [E1]. Damages doctrine varies [E2].",
    "",
    "## Confidence",
    "Primarily based on external research.",
    "",
    "### Sources",
    "[E1] title: Overtime Pay | publisher: U.S. DOL | date: 2023-01-01 | url: https://www.dol.gov/overtime",
    "[E2] title: Liquidated Damages | publisher: Cornell LII | date: n.d. | url: https://www.law.cornell.edu/wex/liquidated_damages",
  ].join("\n");
  const { body, sourcesBlock } = splitSourcesBlock(raw);
  check("parse: body excludes sources block", /### Sources/.test(body), false);
  const candidates = parseExternalCandidates(sourcesBlock);
  check("parse: two candidates", candidates.length, 2);
  check("parse: E1 fields", candidates[0], {
    marker: 1, title: "Overtime Pay", publisher: "U.S. DOL",
    publishedAt: "2023-01-01", url: "https://www.dol.gov/overtime",
  });
  check("parse: n.d. becomes null date", candidates[1].publishedAt, null);
  check("parse: line without url is skipped", parseExternalCandidates("[E9] title: No URL | publisher: X | date: n.d.").length, 0);
}

// --- 3. Happy path: verified external + document sections aligned ----------
{
  const raw = [
    "## Summary",
    "The lease is silent on overtime [S1].",
    "",
    "## Evidence from Uploaded Documents",
    "The lease covers rent only [S1].",
    "",
    "## External Research",
    "Federal law sets overtime at 1.5x pay [E1].",
    "",
    "## Analysis",
    "The documents do not address the statutory question the external source answers.",
    "",
    "## Confidence",
    "Partially supported by the uploaded documents and external research.",
    "",
    "### Sources",
    "[E1] title: Overtime Pay | publisher: U.S. DOL | date: 2023-01-01 | url: https://www.dol.gov/overtime",
  ].join("\n");

  const r = await finalizeExternalAnswer(raw, CHUNKS, stubVerifier(["www.dol.gov"]));
  check("happy: external used", r.external.used, true);
  check("happy: one external citation kept", r.external.citations.length, 1);
  check("happy: external marker preserved", r.external.citations[0].marker, 1);
  check("happy: two document citations parsed", r.citations.length, 2);
  check("happy: confidence MIXED", r.external.confidence, "MIXED");
  check("happy: no cross-section leakage", r.external.strippedDocMarkers + r.external.strippedExternalMarkers, 0);
  check("happy: nothing removed for failure", r.external.removedFailedMarkers, 0);

  // Alignment: external section resolves [E1] to the verified row.
  const aligned = alignAnswer(
    r.answer,
    r.citations.filter((c) => c.chunk).map((c, i) => ({
      id: `c${i + 1}`, claimText: c.claimText, quotedText: "…", verified: true,
      documentId: "d1", documentTitle: "Lease", pageNumber: 1,
    })),
    r.external.citations.map((c) => ({
      id: `x${c.marker}`, marker: c.marker, title: c.title, publisher: c.publisher,
      publishedAt: c.publishedAt, url: c.url, finalUrl: c.finalUrl, domain: c.domain,
      tier: c.tier, accessedAt: c.accessedAt,
    }))
  );
  const ext = aligned.sections.find((s) => s.kind === "external")!;
  check("happy: external section grounding", ext.grounding, "external");
  check("happy: [E1] resolves to external row", ext.sentences[0].citationIds, ["x1"]);
}

// --- 4. CRITICAL: cross-section marker leakage is scrubbed ------------------
{
  const raw = [
    "## Summary",
    "Overview with a stray external marker [E1].", // E in a doc section -> stripped
    "",
    "## Evidence from Uploaded Documents",
    "Document fact [S1].",
    "",
    "## External Research",
    "External fact with a stray document marker [S2] and a real one [E1].", // S in external -> stripped
    "",
    "## Confidence",
    "Primarily based on external research.",
    "",
    "### Sources",
    "[E1] title: DOL | publisher: DOL | date: n.d. | url: https://www.dol.gov/x",
  ].join("\n");

  const r = await finalizeExternalAnswer(raw, CHUNKS, stubVerifier(["www.dol.gov"]));
  const sections = splitSections(r.answer);
  const summaryBody = sections.find((s) => s.kind === "summary")!.body;
  const externalBody = sections.find((s) => s.kind === "external")!.body;
  check("leak: E stripped from Summary", /\[E\d+\]/.test(summaryBody), false);
  check("leak: S stripped from External Research", /\[S\d+\]/.test(externalBody), false);
  check("leak: doc markers stripped counted", r.external.strippedDocMarkers >= 1, true);
  check("leak: external markers stripped counted", r.external.strippedExternalMarkers >= 1, true);
  check("leak: only the one real Sn survives", r.citations.length, 1);
  check("leak: external citation survives", r.external.citations.length, 1);
}

// --- 5. CRITICAL: unverifiable citation removed + fallback ------------------
{
  const raw = [
    "## Summary",
    "The documents do not cover this [S1].",
    "",
    "## Evidence from Uploaded Documents",
    "The uploaded documents do not address this question.",
    "",
    "## External Research",
    "A claim citing an invented URL [E1]. Another citing a bad domain [E2].",
    "",
    "## Confidence",
    "Primarily based on external research.",
    "",
    "### Sources",
    "[E1] title: Fake | publisher: Nowhere | date: n.d. | url: https://not-a-real-site.example/404",
    "[E2] title: Forum post | publisher: Reddit | date: n.d. | url: https://www.reddit.com/r/x",
  ].join("\n");

  // No hosts live => E1 fails to resolve, E2 rejected by policy.
  const r = await finalizeExternalAnswer(raw, CHUNKS, stubVerifier([]));
  check("fallback: no external citations kept", r.external.citations.length, 0);
  check("fallback: external not marked used", r.external.used, false);
  check("fallback: failed markers removed", r.external.removedFailedMarkers >= 1, true);
  check("fallback: no [E] markers remain", /\[E\d+\]/.test(r.answer), false);
  check(
    "fallback: mandated line present",
    r.answer.includes("I could not verify this information from a reliable external source."),
    true
  );
  check("fallback: two candidates rejected", r.external.rejected.length, 2);
}

// --- 6. Documents sufficient: no external section, no sources --------------
{
  const raw = [
    "## Summary",
    "Rent is $4,200 [S1].",
    "",
    "## Evidence from Uploaded Documents",
    "The lease states rent of $4,200 per month [S1].",
    "",
    "## Confidence",
    "Fully supported by the uploaded documents.",
  ].join("\n");

  const r = await finalizeExternalAnswer(raw, CHUNKS, stubVerifier([]));
  check("sufficient: external unused", r.external.used, false);
  check("sufficient: no external citations", r.external.citations.length, 0);
  check("sufficient: confidence DOCUMENTS", r.external.confidence, "DOCUMENTS");
  check("sufficient: document citations intact", r.citations.length, 2);
  check("sufficient: nothing removed", r.external.removedFailedMarkers, 0);
}

  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("TEST FAILED:", e);
  process.exit(1);
});
