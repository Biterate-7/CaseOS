# CaseOS

An AI-native legal workspace for small-to-mid sized law firms (2–50 attorneys).

## Core principle

Every AI interaction in CaseOS is:

- **Matter-specific** — scoped to a single legal matter, never crossing privilege boundaries
- **Grounded** — answers come from uploaded legal documents, not unsourced model knowledge
- **Citation-backed** — every claim links to the exact document passage it came from
- **Audited** — every AI action is a permanent, reviewable record

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS 4, shadcn/ui |
| Backend | Next.js server actions / API routes |
| Database | PostgreSQL + Prisma 7 (pgvector for embeddings) |
| Auth | Clerk |
| Storage | Supabase Storage |
| AI | OpenAI API — RAG over per-matter document embeddings |

## Getting started

```bash
npm install
cp .env.example .env   # fill in credentials
npm run db:generate    # generate Prisma client
npm run db:migrate     # run migrations (requires DATABASE_URL)
npm run dev            # http://localhost:3000
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run db:generate` | Regenerate Prisma client after schema changes |
| `npm run db:migrate` | Create/apply a dev migration |
| `npm run db:push` | Push schema to DB without a migration |
| `npm run db:studio` | Browse the database in Prisma Studio |

## Project structure

```
app/         Next.js App Router pages and layouts
components/  React components (components/ui = shadcn/ui)
lib/         Shared utilities, Prisma client, AI pipeline
prisma/      Database schema and migrations
docs/        Product and architecture documentation
```

See [docs/product-spec.md](docs/product-spec.md) and [docs/architecture.md](docs/architecture.md) for the full product and technical foundation.
