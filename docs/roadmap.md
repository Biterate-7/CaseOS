# CaseOS — Development Roadmap

## Phase 1 — Foundation ✅ (this commit)

- Next.js 15 + TypeScript + Tailwind 4 + shadcn/ui scaffold
- Prisma 7 schema: Firm, User, Matter, Document, DocumentChunk, AIInteraction, Citation, AuditLog
- UI skeleton: landing page, sign-in placeholder, dashboard shell, matter workspace
- Docs, env contract, dev commands

## Phase 2 — Core legal workspace

- Wire Clerk auth (sign-in/up, middleware, User↔clerkId sync webhook)
- Provision Postgres (Supabase) + pgvector, run first migration
- Matter CRUD with real data (server actions + audit logging)
- Document upload to Supabase Storage, document list per matter

## Phase 3 — AI document intelligence

- Ingestion pipeline: parse → chunk → embed → store
- Matter-scoped RAG assistant with mandatory citations
- Citation verification pass + review gate UI
- Audit log viewer

## Phase 4 — Production readiness

- Row-level security by firmId; append-only audit enforcement
- Error handling, rate limiting, upload size/type validation
- Seed data + demo script for design-partner walkthroughs
- Deploy (Vercel + Supabase), monitoring
