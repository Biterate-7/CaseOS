# CaseOS — Product Specification

## Problem

Small and mid-sized law firms (2–50 attorneys) are adopting AI individually (83% of lawyers use AI as of mid-2026) but have no firm-level infrastructure to do it safely — 43% of firms have no AI policy at all. Market leaders (Harvey, Legora) price at AmLaw 100 / enterprise; the rest of the market stitches together practice-management software, contract point tools, and raw ChatGPT with no unified system of record, no citation grounding, and no audit trail. Real sanctions incidents from unverified AI citations have made trust the gating factor.

## Target users

- Small-to-mid law firms, 2–50 attorneys, US market first
- Buyer: managing partner / firm administrator
- Daily users: attorneys, paralegals, staff

## Core workflow (the thing the MVP must prove)

1. Attorney creates or opens a **matter** (client, practice area, status)
2. Uploads **documents** to the matter — they are parsed, chunked, and embedded into a matter-scoped vector namespace
3. Asks the **AI assistant** questions or requests drafts/summaries — retrieval is restricted to that matter's documents
4. Every AI answer carries **citations** linking each claim to the exact source passage, verified before display
5. Output lands in a **review state** — an attorney approves or rejects it
6. Every step is recorded in the **audit log**, reviewable per matter and per firm

## MVP features

1. Matter workspace — clients, matters, documents, status
2. Document upload + ingestion pipeline (parse → chunk → embed)
3. Grounded AI assistant with mandatory inline citations
4. Human review gate on AI outputs
5. Firm-wide audit log of all AI interactions

**Explicitly deferred:** billing/invoicing, client portal, calendaring/deadlines, external legal research corpus, predictive analytics, agent marketplace.

## Future roadmap

- **Phase 2 (post-MVP):** deadlines/calendar risk flags, client portal, basic billing, 3–5 design-partner firms
- **Phase 3:** second vertical depth (insurance defense or in-house), SOC 2, SSO
- **Long term:** permissioned aggregated outcome dataset across the customer base; marketplace of vertical AI agents running on the CaseOS substrate

See the strategic foundation memo for full market analysis and competitive positioning.
