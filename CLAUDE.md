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
npm run db:migrate   # create/apply dev migration (needs DATABASE_URL in .env)
npm run db:push      # push schema without migration
npm run db:studio    # Prisma Studio
```

Note: on this machine Node lives at `C:\Program Files\nodejs` and may not be on PATH — prefix commands with `$env:Path = "C:\Program Files\nodejs;$env:Path"` in PowerShell if `node` is not found.

## Architecture

- **Next.js 15 App Router**, TypeScript, no `src/` dir. Pages in `app/`, shared UI in `components/` (shadcn/ui primitives in `components/ui/`), server logic in `lib/`.
- **Prisma 7** — schema in `prisma/schema.prisma`; the connection URL lives in `prisma.config.ts` (not in the schema — Prisma 7 removed `url` from datasource blocks). Generated client outputs to `lib/generated/prisma` (gitignored); run `db:generate` after any schema change.
- **Data model core**: `Firm` → `User`/`Matter`; `Matter` → `Document` → `DocumentChunk` (holds pgvector embedding); `AIInteraction` (one row per AI action, with review status) → `Citation` (typed join from an output claim to the exact `DocumentChunk` that grounds it); `AuditLog` scoped by firm. `DocumentChunk.embedding` uses `Unsupported("vector(1536)")` — raw SQL is required for vector queries.
- **Auth**: Clerk (currently a placeholder sign-in page; `User.clerkId` is the link).
- **Storage**: Supabase Storage for source documents; only chunk text + embeddings go in Postgres.
- **AI pipeline** (in `lib/ai/` as it gets built): retrieve (matter-scoped only) → generate (grounded, no unsourced knowledge) → verify citations → human review gate. OpenAI API, models configured via `OPENAI_CHAT_MODEL` / `OPENAI_EMBEDDING_MODEL` env vars.

## Conventions

- Public pages (landing, sign-in) live at the `app/` root; the authenticated dashboard shell is the `app/(app)` route group with its sidebar layout.
- Server actions preferred over API routes for internal mutations; API routes only for webhooks/uploads.
- Every mutation that touches a matter writes an `AuditLog` row — this is a product requirement, not optional instrumentation.
- Environment template is `.env.example`; `.env` is gitignored. `prisma.config.ts` loads `.env` via dotenv (Prisma 7 no longer auto-loads it).
