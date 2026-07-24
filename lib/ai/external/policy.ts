/**
 * Source-quality policy for External Research.
 *
 * Classifies a URL's host into a quality tier. This is one half of external
 * citation verification — the other half (lib/ai/external/verify.ts) checks
 * that the URL actually resolves. A citation is only kept if BOTH pass: the
 * host is not on the "avoid" list, and the URL is reachable.
 *
 * The lists are deliberately not exhaustive. An unrecognised host is "unknown"
 * — allowed if it resolves, but surfaced to the user as unverified quality, so
 * nothing is silently blessed as authoritative just because it loaded.
 *
 * No `server-only` import: pure string logic, unit-tested offline.
 */

export type SourceTier = "preferred" | "acceptable" | "avoid" | "unknown";

export type DomainClassification = {
  tier: SourceTier;
  /** Human-readable rationale, shown in the audit trail. */
  reason: string;
};

/** Extracts a lowercased hostname, or null if the URL is unparseable. */
export function hostnameOf(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return null;
  }
}

/** True when `host` is `domain` or a subdomain of it. */
function matchesDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

function matchesAny(host: string, domains: readonly string[]): boolean {
  return domains.some((d) => matchesDomain(host, d));
}

// Government, courts, legislation, treaties/international organizations,
// universities, and peer-reviewed publishers. Highest trust.
const PREFERRED_DOMAINS: readonly string[] = [
  // International organizations & treaty bodies
  "un.org", "who.int", "worldbank.org", "imf.org", "oecd.org", "wto.org",
  "icj-cij.org", "icc-cpi.int", "coe.int", "europa.eu", "unesco.org",
  "wipo.int", "ilo.org", "unhcr.org",
  // US federal government, courts, legislation
  "congress.gov", "govinfo.gov", "supremecourt.gov", "uscourts.gov",
  "federalregister.gov", "whitehouse.gov", "gao.gov",
  // Peer-reviewed / scholarly publishers & indexes
  "doi.org", "nature.com", "science.org", "sciencedirect.com",
  "springer.com", "wiley.com", "jstor.org", "pubmed.ncbi.nlm.nih.gov",
  "ncbi.nlm.nih.gov", "nih.gov", "arxiv.org", "ssrn.com", "cambridge.org",
  "oup.com", "tandfonline.com",
];

// Reputable news agencies and papers of record — acceptable for factual
// reporting, per the spec.
const ACCEPTABLE_DOMAINS: readonly string[] = [
  "reuters.com", "apnews.com", "ap.org", "bloomberg.com", "bbc.com",
  "bbc.co.uk", "ft.com", "nytimes.com", "washingtonpost.com", "wsj.com",
  "theguardian.com", "economist.com", "npr.org", "pbs.org",
  "aljazeera.com", "cnbc.com", "politico.com", "axios.com",
];

// User-generated, opinion, SEO, and encyclopedias-as-primary. Rejected: we
// cannot mechanically judge "absolutely necessary", so we fail closed.
const AVOID_DOMAINS: readonly string[] = [
  "reddit.com", "quora.com", "medium.com", "substack.com", "blogspot.com",
  "wordpress.com", "tumblr.com", "wikipedia.org", "wikimedia.org",
  "fandom.com", "facebook.com", "twitter.com", "x.com", "instagram.com",
  "tiktok.com", "youtube.com", "pinterest.com", "answers.com",
  "ehow.com", "buzzfeed.com",
];

// Government/academic TLD patterns that generalise past the explicit lists
// above — e.g. dol.gov, courts.ca.gov, harvard.edu, gov.uk, ac.uk.
const PREFERRED_TLD = /(?:^|\.)(gov|mil|edu)$/;
const PREFERRED_CCTLD = /\.(gov|edu|ac|mil|gob|gouv)\.[a-z]{2}$/;

/**
 * Classifies a URL's host into a quality tier. Order matters: the explicit
 * "avoid" list wins over TLD heuristics (a `.gov`-looking subdomain on a
 * blogging host should still be rejected).
 */
export function classifyUrl(url: string): DomainClassification {
  const host = hostnameOf(url);
  if (!host) {
    return { tier: "avoid", reason: "unparseable or non-http(s) URL" };
  }

  if (matchesAny(host, AVOID_DOMAINS)) {
    return { tier: "avoid", reason: `${host} is a user-generated or low-authority source` };
  }
  if (matchesAny(host, PREFERRED_DOMAINS) || PREFERRED_TLD.test(host) || PREFERRED_CCTLD.test(host)) {
    return { tier: "preferred", reason: `${host} is a government, court, or scholarly source` };
  }
  if (matchesAny(host, ACCEPTABLE_DOMAINS)) {
    return { tier: "acceptable", reason: `${host} is a reputable news publisher` };
  }
  return { tier: "unknown", reason: `${host} is not a recognised authoritative source` };
}

/** Whether a tier is allowed to be cited at all. "avoid" is rejected outright. */
export function isCitableTier(tier: SourceTier): boolean {
  return tier !== "avoid";
}
