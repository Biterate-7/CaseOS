# CaseOS — Technical Architecture

## Frontend

- Next.js 15 App Router, TypeScript, Tailwind CSS 4, shadcn/ui
- Route groups: `(marketing)` for public pages, `(app)` for the authenticated shell
- Server components by default; client components only where interactivity requires
- The AI co-pilot is a panel *inside* the matter workspace, not a separate app

## Backend

- Next.js server actions for internal mutations; API routes for webhooks (Clerk) and file upload
- All data access goes through Prisma; every matter-touching mutation writes an `AuditLog` row
- Multi-tenancy: every query is scoped by `firmId`; matter access checked against matter membership

## Database (PostgreSQL + Prisma 7)

```
Firm ─┬─ User ──────────┐
      ├─ Matter ─┬─ Document ── DocumentChunk (pgvector embedding)
      │          ├─ AIInteraction ── Citation ── DocumentChunk
      │          └─ AuditLog
      └─ AuditLog
```

Key decisions:

- `DocumentChunk.embedding` is `Unsupported("vector(1536)")` — pgvector, dimension matches `text-embedding-3-small`. Vector similarity queries use raw SQL (`$queryRaw`), everything else typed Prisma.
- `AIInteraction` is a permanent record: prompt, retrieved context, response, model, review status. Never deleted.
- `Citation` is a typed join: claim text in the AI output ↔ the exact chunk that grounds it, with a `verified` flag set by the verification pass.
- Prisma 7: connection URL lives in `prisma.config.ts`, generated client in `lib/generated/prisma` (gitignored).

## AI pipeline (RAG)

```
Upload → parse/OCR → chunk (~500 tokens, overlap) → embed → store in matter namespace

Query → embed query → similarity search WHERE document.matterId = :matter
      → generate with retrieved chunks as only context
      → verification pass: check each cited claim against its source span
      → render with citations; unverifiable claims flagged
      → attorney review gate (approve/reject, logged)
```

Rules:

- Retrieval never crosses matter boundaries — enforced in the query, not by convention
- The model must answer from retrieved context only for research/drafting tasks
- Nothing client- or court-facing leaves review state without explicit attorney approval

## Security considerations

- **Privilege isolation** is the design driver: matter-scoped retrieval is structural (WHERE clause on matterId), not a prompt instruction
- Clerk for authentication; roles (ADMIN / ATTORNEY / PARALEGAL / STAFF) on `User`
- Source files in Supabase Storage private buckets, accessed via signed URLs server-side only
- Secrets in `.env` (gitignored); `.env.example` is the contract
- Audit log is append-only by convention now; move to DB-enforced (no UPDATE/DELETE grants) before production
- Before production: row-level security in Postgres keyed by firmId, SOC 2 groundwork, encryption at rest for document storage
