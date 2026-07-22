# Environments, databases, and deployment

## The problem this document fixes

`.env` currently points at the **same Supabase project that serves
production**. Running `npm run db:migrate` locally therefore alters the live
database immediately, before any code is deployed.

This has already caused one incident. Applying
`20260722061500_collaboration_foundation` dropped `_MatterMembers` while the
deployed build still queried it, so `/matters/:id` and project creation broke
until the matching code was deployed minutes later.

Any schema change carries that risk until development and production are
separated.

## Target setup

| Environment | Database | Storage bucket | Clerk instance |
| --- | --- | --- | --- |
| Local development | `caseos-dev` Supabase project | `documents` (dev project) | Clerk **development** keys (`pk_test_…`) |
| Vercel Preview | `caseos-dev` (or a third `caseos-preview`) | dev bucket | Clerk development keys |
| Vercel Production | existing Supabase project | `documents` (prod project) | Clerk **production** keys (`pk_live_…`) |

Variable *names* stay identical across environments. Only their values differ,
and each environment supplies its own. This is deliberate — introducing
`DATABASE_URL_DEV` / `DATABASE_URL_PROD` would mean application code choosing
between them at runtime, which is exactly how a process ends up writing to the
wrong one. The application should only ever know `DATABASE_URL`.

## One-time setup (requires your Supabase and Vercel accounts)

These steps need account access and cannot be scripted from this repo.

### 1. Create the development database

1. Supabase dashboard → **New project** → name it `caseos-dev`.

   **Region does not matter.** Supabase preselects one from your location and
   some organisations pin a default, so it may not offer production's region
   (`ap-southeast-1`). Take whatever it gives you — region affects latency
   only, and this database exists for local development. Nothing about the
   schema, pgvector, or storage differs.

   It does change your connection hostname, though: a Sydney project is
   `aws-0-ap-southeast-2.pooler.supabase.com`, not `-1`. Copy the strings
   verbatim in step 2 rather than adapting production's — the region, the
   project ref, and the `aws-0`/`aws-1` prefix all differ per project, and a
   hand-edited host fails with an opaque DNS error.
2. Once provisioned, open **Project Settings → Database → Connection string**
   and copy both:
   - **Transaction pooler** (port `6543`) → this becomes `DATABASE_URL`
   - **Session pooler** (port `5432`) → this becomes `DIRECT_URL`

   Use the session pooler for `DIRECT_URL`, not the `db.<ref>.supabase.co`
   direct host — that host is IPv6-only and unreachable from this network.
3. Enable pgvector on the new project:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
4. Create the storage bucket: **Storage → New bucket** → name `documents`,
   **not public**.

### 2. Point local development at it

Edit `.env` (gitignored) and replace `DATABASE_URL` / `DIRECT_URL` with the
`caseos-dev` values, and the Supabase URL/keys with the dev project's.

Then create the schema and seed it:

```bash
npm run db:migrate
npm run db:seed
npm run doctor
```

`db:migrate` runs `prisma migrate deploy`, which replays every migration in
order against the empty database. `doctor` verifies env vars, both database
connections, pgvector, and the storage bucket.

### 3. Confirm the separation

```bash
npm run doctor
```

Check the host it prints is the **dev** project ref, not the production one.
Do this before every migration until it becomes habit.

### 4. Scope Vercel variables

In Vercel → Settings → Environment Variables, each variable must be set per
environment rather than shared:

- **Production**: production Supabase, Clerk live keys
- **Preview**: dev (or preview) Supabase, Clerk test keys
- **Development**: unused — local `.env` covers it

Vercel binds variables at **build time**, so any change requires a redeploy
before it takes effect. `NEXT_PUBLIC_*` values are inlined into the client
bundle and cannot be injected at runtime at all.

## Migration workflow

Once separated, every schema change follows this order:

```bash
# 1. Edit prisma/schema.prisma

# 2. Generate the SQL WITHOUT applying it
npm run db:migrate:new -- --name descriptive_name

# 3. READ THE GENERATED SQL.
#    Prisma writes destructive statements without comment. It generated a
#    bare DROP TABLE "_MatterMembers" for the collaboration migration, which
#    would have silently discarded every project membership. That migration
#    is hand-written for exactly this reason.
cat prisma/migrations/<timestamp>_<name>/migration.sql

# 4. Apply to DEVELOPMENT and regenerate the client
npm run db:migrate
npm run db:generate

# 5. Test locally against dev data
npm run lint && npm run build
npm run test:citations

# 6. Commit the migration WITH the code that depends on it
git add prisma/migrations lib components
git commit

# 7. Deploy. Production migrations run from CI or a controlled manual step —
#    never as a side effect of local development.
```

### Applying to production

Production migrations are **not** run from a developer machine pointed at
production. Either:

- add `prisma migrate deploy` to the Vercel build command, so schema and code
  advance together atomically per deployment, or
- run it deliberately from a controlled shell with production credentials
  loaded only for that command.

The first is safer and is the recommended end state:

```
Build Command: npm run db:generate && npm run db:migrate && npm run build
```

Caveat: this runs on every deployment, including previews. It is safe because
`migrate deploy` is idempotent — it applies only unapplied migrations and does
nothing when the database is current.

### Rules

- **Never** run `db:migrate` against production from a local shell.
- **Never** commit a migration without reading its SQL.
- Additive changes (new nullable column, new table, new index) are safe.
  Dropping or renaming a column or table is not, and needs a hand-written
  migration that carries the data across first.
- Migrations must be committed alongside the code that depends on them, so a
  rollback moves both together.

## Deployment

### Current state

Automatic Git deployment **does not work** and every deploy so far has been a
manual `vercel --prod`. Established so far:

- The GitHub repository **is** connected (`vercel git connect` reports
  `Biterate-7/CaseOS is already connected`).
- A `main` branch now exists on the remote; pushing it did **not** trigger a
  deployment.
- `vercel project inspect` exposes no Git or production-branch section, and
  the CLI has no command to read or change the auto-deploy toggle.

The remaining causes are all dashboard-only settings. Check, in order:

1. **Settings → Git → Production Branch** — if this is `master` or a branch
   that does not exist on the remote, no push can deploy to production. It
   should be `main`.
2. **Settings → Git → Ignored Build Step** — if set to a command, it may be
   returning "skip" for every build. Set it to Automatic.
3. **Settings → General → Pause Deployments** — if enabled, nothing deploys.
4. **GitHub → Settings → Applications → Vercel** — confirm the Vercel app has
   repository access to `Biterate-7/CaseOS`. A revoked or repo-scoped install
   that omits this repo silences the webhook entirely.

### Manual deployment (current fallback)

```bash
vercel --prod
```

This uploads the working tree directly and bypasses Git entirely, which is why
it has worked throughout.

### Target flow

- Push to `main` → automatic production deployment
- Open a pull request → preview deployment using Preview environment variables
- Preview deployments never touch the production database, once the
  environment separation above is in place
