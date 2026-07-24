import "server-only";

import { db } from "@/lib/db";

import { classifyUrl, hostnameOf, isCitableTier, type SourceTier } from "./policy";
import type { ExternalCitationCandidate } from "./parse";

/**
 * External-source verification.
 *
 * A model-proposed citation is only trustworthy once we have proven the URL is
 * real. This module fetches each candidate URL, records whether it resolved,
 * and caches the result so a URL cited across many questions is not re-fetched
 * every time (spec req 9). Combined with the domain policy, this is what makes
 * "never fabricate a URL" (req 6) and "remove any citation that cannot be
 * verified" (req 10) mechanical rather than a promise.
 *
 * The network- and DB-touching surface is isolated here so the orchestration
 * in generate.ts can be unit-tested with a stub verifier.
 */

export type VerifiedExternalCitation = {
  marker: number;
  title: string;
  publisher: string;
  publishedAt: string | null;
  url: string;
  finalUrl: string | null;
  domain: string;
  tier: SourceTier;
  httpStatus: number | null;
  accessedAt: Date;
};

export type RejectedExternalCitation = {
  marker: number;
  url: string;
  domain: string | null;
  tier: SourceTier;
  httpStatus: number | null;
  /** Why it was dropped, for the audit trail. */
  reason: string;
};

export type ExternalVerificationResult = {
  verified: VerifiedExternalCitation[];
  rejected: RejectedExternalCitation[];
};

/** Signature the orchestrator depends on; swapped for a stub in tests. */
export type ExternalVerifier = (
  candidates: ExternalCitationCandidate[]
) => Promise<ExternalVerificationResult>;

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const FETCH_TIMEOUT_MS = 4000;
/** Bounds total verification latency so external mode stays inside the route budget. */
const MAX_TO_VERIFY = 8;

/**
 * Blocks SSRF-adjacent targets. These URLs come from the model, not the user,
 * but we still refuse to let generation drive fetches at internal hosts or the
 * cloud metadata endpoint.
 */
function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".localhost")) {
    return true;
  }
  if (h === "0.0.0.0" || h === "::1" || h === "[::1]") return true;
  if (h === "169.254.169.254" || h.startsWith("169.254.")) return true; // link-local / metadata
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  return false;
}

type UrlCheck = { ok: boolean; httpStatus: number | null; finalUrl: string | null };

/**
 * A page that responds — even with 401/403/405/429 — exists; only 404/410 and
 * server errors mean "not a real, reachable citation". This keeps real
 * government/journal pages that block bots from being falsely stripped.
 */
function statusIsReachable(status: number): boolean {
  if (status < 400) return true;
  return status === 401 || status === 403 || status === 405 || status === 429;
}

async function fetchOnce(url: string, method: "HEAD" | "GET"): Promise<UrlCheck> {
  const res = await fetch(url, {
    method,
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      // Some publishers 403 an empty UA; identify ourselves plainly.
      "user-agent": "CaseOS-SourceVerifier/1.0 (+link-check)",
      accept: "*/*",
    },
  });
  return {
    ok: statusIsReachable(res.status),
    httpStatus: res.status,
    finalUrl: res.url || null,
  };
}

/** Live URL check: HEAD, falling back to GET when HEAD is unsupported. */
async function checkUrlLive(url: string): Promise<UrlCheck> {
  try {
    const head = await fetchOnce(url, "HEAD");
    // Many CDNs answer HEAD with 403/405 while GET works; confirm with GET.
    if (!head.ok && head.httpStatus != null && [403, 405, 501].includes(head.httpStatus)) {
      try {
        return await fetchOnce(url, "GET");
      } catch {
        return head;
      }
    }
    return head;
  } catch {
    // HEAD threw (network/timeout/protocol) — try GET before giving up.
    try {
      return await fetchOnce(url, "GET");
    } catch {
      return { ok: false, httpStatus: null, finalUrl: null };
    }
  }
}

/** URL check with a read-through TTL cache in ExternalSourceCache. */
async function checkUrlCached(url: string): Promise<UrlCheck> {
  const cached = await db.externalSourceCache.findUnique({ where: { url } });
  if (cached && Date.now() - cached.checkedAt.getTime() < CACHE_TTL_MS) {
    return { ok: cached.ok, httpStatus: cached.httpStatus, finalUrl: cached.finalUrl };
  }

  const result = await checkUrlLive(url);

  // Cache both outcomes: a confirmed-dead URL is as worth remembering as a
  // live one. Upsert so concurrent questions citing the same URL converge.
  await db.externalSourceCache.upsert({
    where: { url },
    create: { url, ok: result.ok, httpStatus: result.httpStatus, finalUrl: result.finalUrl },
    update: { ok: result.ok, httpStatus: result.httpStatus, finalUrl: result.finalUrl, checkedAt: new Date() },
  });

  return result;
}

/**
 * The production verifier: policy-check every candidate, then fetch-verify the
 * citable ones (deduped by URL, capped for latency). Anything on the "avoid"
 * list is rejected without a fetch; anything unreachable is rejected after one.
 */
export const verifyExternalCitations: ExternalVerifier = async (candidates) => {
  const verified: VerifiedExternalCitation[] = [];
  const rejected: RejectedExternalCitation[] = [];

  // Verify each distinct URL once; reuse the outcome across markers citing it.
  // Pass 1: classify, reject non-citable candidates, and START a check for each
  // distinct citable URL — all concurrently, so total latency is one fetch, not
  // the sum of them. Capped at MAX_TO_VERIFY distinct URLs for the route budget.
  const checkByUrl = new Map<string, Promise<UrlCheck>>();
  const classified = candidates.map((c) => ({ c, host: hostnameOf(c.url), ...classifyUrl(c.url) }));

  for (const { c, host, tier } of classified) {
    if (!host || isBlockedHost(host) || !isCitableTier(tier)) continue;
    if (checkByUrl.has(c.url) || checkByUrl.size >= MAX_TO_VERIFY) continue;
    checkByUrl.set(c.url, checkUrlCached(c.url));
  }

  // Pass 2: await the (already in-flight) checks and build results in order.
  for (const { c, host, tier, reason } of classified) {
    if (!host || isBlockedHost(host)) {
      rejected.push({ marker: c.marker, url: c.url, domain: host, tier: "avoid", httpStatus: null, reason: "blocked or invalid host" });
      continue;
    }
    if (!isCitableTier(tier)) {
      rejected.push({ marker: c.marker, url: c.url, domain: host, tier, httpStatus: null, reason });
      continue;
    }

    const pending = checkByUrl.get(c.url);
    if (!pending) {
      rejected.push({ marker: c.marker, url: c.url, domain: host, tier, httpStatus: null, reason: "verification limit reached" });
      continue;
    }

    const check = await pending;
    if (!check.ok) {
      rejected.push({ marker: c.marker, url: c.url, domain: host, tier, httpStatus: check.httpStatus, reason: "URL did not resolve" });
      continue;
    }

    verified.push({
      marker: c.marker,
      title: c.title,
      publisher: c.publisher,
      publishedAt: c.publishedAt,
      url: c.url,
      finalUrl: check.finalUrl && check.finalUrl !== c.url ? check.finalUrl : null,
      domain: host,
      tier,
      httpStatus: check.httpStatus,
      accessedAt: new Date(),
    });
  }

  return { verified, rejected };
};
