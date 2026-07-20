# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What CaseOS is

An AI-native legal workspace for small-to-mid law firms. The non-negotiable product invariant: **every AI interaction is matter-scoped, grounded in uploaded documents, citation-backed, and audit-logged.** Any feature that generates AI output must create an `AIInteraction` row with `Citation` rows linking claims to `DocumentChunk`s, and must never retrieve context across matter boundaries.

## Commands

```bash
npm run dev          # dev server (Turbopack), http://localhost:3000
npm run build        # production build
npm run lint         # ESLint
npm run db:generate  # regenerate Prisma client after editing prisma/schema.prisma
npm run db:migrate:new  # create a migration from schema changes WITHOUT applying (review/edit SQL first)
npm run db:migrate   # apply pending migrations (migrate deploy — `migrate dev` breaks on Supabase pooler)
npm run db:push      # push schema without migration
npm run db:studio    # Prisma Studio
npm run db:seed      # seed demo firm/user/matters (idempotent)
npm run doctor       # verify env vars, DB connections, pgvector, storage bucket
npm run warm:embedder  # pre-download the local embedding model (~34 MB, cached)
npm run test:ingest  # end-to-end ingestion test against the real DB/storage
npm run test:ai      # end-to-end AI test: retrieval, isolation, generation, persistence
```

Note: on this machine Node lives at `C:\Program Files\nodejs` and may not be on PATH — prefix commands with `$env:Path = "C:\Program Files\nodejs;$env:Path"` in PowerShell if `node` is not found.

## Architecture

- **Next.js 15 App Router**, TypeScript, no `src/` dir. Pages in `app/`, shared UI in `components/` (shadcn/ui primitives in `components/ui/`), server logic in `lib/`.
- **Prisma 7** — schema in `prisma/schema.prisma`; the connection URL lives in `prisma.config.ts` (not in the schema — Prisma 7 removed `url` from datasource blocks). Migrations use `DIRECT_URL` (Supabase **session pooler**, port 5432 — the `db.<ref>.supabase.co` direct host is IPv6-only and unreachable from this network); runtime uses `DATABASE_URL` (transaction pooler, port 6543) through the `@prisma/adapter-pg` driver adapter in `lib/db.ts`. Migration workflow: `db:migrate:new` → review SQL → `db:migrate` (plain `prisma migrate dev` fails against the pooler: no shadow DB). Generated client outputs to `lib/generated/prisma` (gitignored); run `db:generate` after any schema change.
- **Lazy clients** — `lib/db.ts`, `lib/storage.ts`, and the embedder in `lib/ingest/embed.ts` defer construction to first use via `lib/lazy.ts`, so `npm run build` succeeds without env vars. DB-backed pages must export `dynamic = "force-dynamic"`.
- **Ingestion pipeline** — `lib/ingest/`: `extract.ts` (unpdf, page-aware) → `chunk.ts` (~2000 chars, 200 overlap, never spans pages) → `embed.ts` → `pipeline.ts` orchestrates and writes status transitions + audit rows. Upload entry point is the `uploadDocument` server action in `lib/actions/documents.ts`.
- **Embeddings are local, not API** — `Xenova/bge-small-en-v1.5` (384-dim) via `@huggingface/transformers`, zero cost, no key; model downloads once (~34 MB) to the HF cache. xAI/Grok has **no embeddings endpoint** — do not try to use it for embeddings. Chunk and query vectors must come from the same model; changing `EMBEDDING_MODEL` requires re-ingesting every document. `@huggingface/transformers` and `onnxruntime-node` are in `serverExternalPackages` in next.config.ts — keep them there.
- **Data model core**: `Firm` → `User`/`Matter`; `Matter` → `Document` → `DocumentChunk` (holds pgvector embedding); `AIInteraction` (one row per AI action, with review status) → `Citation` (typed join from an output claim to the exact `DocumentChunk` that grounds it); `AuditLog` scoped by firm. `DocumentChunk.embedding` is `Unsupported("vector")` (dimension deliberately unspecified) — raw SQL is required for vector queries (`embedding <=> $1::vector`).
- **Auth**: Clerk. `middleware.ts` protects `/dashboard`, `/matters`, `/onboarding`, `/api`; sign-in/sign-up are Clerk catch-all routes. First login goes through `/onboarding`, which creates the `Firm` + `User` (role ADMIN) linked by `User.clerkId`. **Every page/server action touching firm data must call `requireUser()` from `lib/auth.ts` and scope queries by `user.firmId`** — use `findFirst({ where: { id, firmId } })`, never `findUnique` by id alone, so cross-firm ids 404 instead of leaking. The seed's demo user (`demo_user_placeholder`) is unreachable through normal auth and exists only for pipeline tests.
- **Storage**: Supabase Storage for source documents (private `documents` bucket, path `firmId/matterId/documentId/fileName`); only chunk text + embeddings go in Postgres.
- **AI pipeline** — `lib/ai/`: `retrieve.ts` (matter boundary enforced inside the SQL join, top-8 cosine via `<=>`), `generate.ts` (Grok chat with sources-only system prompt; `parseCitations` maps `[Sn]` markers to sentences), `client.ts` (OpenAI SDK, `baseURL: https://api.x.ai/v1`, `XAI_API_KEY` / `XAI_CHAT_MODEL`). The `askQuestion` action in `lib/actions/ai.ts` persists `AIInteraction` + `Citation` rows + audit entry in one transaction; `reviewInteraction` is the attorney approve/reject gate. Test with `npm run test:ai` (skips generation with exit 2 if the xAI team has no credits).
- **Standalone scripts** that import `lib/` server modules need the `react-server` condition to satisfy `server-only` imports: `node --conditions=react-server --import tsx <script>` (see `test:ingest`).

## Conventions

- Public pages (landing, sign-in) live at the `app/` root; the authenticated dashboard shell is the `app/(app)` route group with its sidebar layout.
- Server actions preferred over API routes for internal mutations; API routes only for webhooks/uploads.
- Every mutation that touches a matter writes an `AuditLog` row — this is a product requirement, not optional instrumentation.
- Environment template is `.env.example`; `.env` is gitignored. `prisma.config.ts` loads `.env` via dotenv (Prisma 7 no longer auto-loads it).
