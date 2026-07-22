/**
 * Environment doctor: verifies env vars, database connectivity, pgvector,
 * and the Supabase storage bucket. Run with: npm run doctor
 */
import "dotenv/config";

import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";

let failures = 0;

function report(label: string, ok: boolean, detail?: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

/**
 * Prints the host and project ref that DATABASE_URL points at.
 *
 * Every other check in this file passes identically against development and
 * production, so a green run proves connectivity but says nothing about which
 * database you are about to migrate. That ambiguity has already caused one
 * production outage. This makes the target impossible to miss.
 */
function reportTarget() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return;

  let host = "(unparseable)";
  let ref = "(unknown)";
  try {
    const url = new URL(raw);
    host = url.hostname;
    // Supabase pooler usernames are `postgres.<project-ref>`; the ref is the
    // only part that uniquely identifies the project.
    const user = decodeURIComponent(url.username);
    if (user.includes(".")) ref = user.slice(user.indexOf(".") + 1);
  } catch {
    // Fall through with placeholders rather than failing the whole run.
  }

  console.log("");
  console.log("  ── target database ──────────────────────────────────");
  console.log(`     host:        ${host}`);
  console.log(`     project ref: ${ref}`);
  console.log("     Confirm this is the database you intend to change.");
  console.log("  ─────────────────────────────────────────────────────");
  console.log("");
}

async function main() {
  // 1. Env vars present
  const required = [
    "DATABASE_URL",
    "DIRECT_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  for (const name of required) {
    report(`env: ${name}`, Boolean(process.env[name]?.trim()));
  }

  // 2. WHICH database. Reported before anything else, and loudly, because
  //    "all checks passed" against the wrong database is worse than a
  //    failure — every check here passes just as well on production, which
  //    is how a developer ends up migrating it by accident.
  reportTarget();

  // 3. Database connectivity (pooled URL, what the app uses at runtime)
  const pooled = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await pooled.connect();
    const { rows } = await pooled.query("select version()");
    report("db: pooled connection (DATABASE_URL)", true, rows[0].version.split(",")[0]);

    const ext = await pooled.query(
      `select e.extname, n.nspname
       from pg_extension e join pg_namespace n on e.extnamespace = n.oid
       where e.extname = 'vector'`
    );
    if (ext.rows.length === 0) {
      report("db: pgvector extension", false, "not installed — enable it in Supabase → Database → Extensions");
    } else {
      const schema = ext.rows[0].nspname;
      const sp = await pooled.query("show search_path");
      const searchPath = sp.rows[0].search_path as string;
      const resolvable = await pooled
        .query("select '[1,2,3]'::vector as v")
        .then(() => true)
        .catch(() => false);
      report(
        "db: pgvector extension",
        resolvable,
        `installed in "${schema}", search_path: ${searchPath}${resolvable ? "" : " — type not resolvable"}`
      );
    }
  } catch (e) {
    report("db: pooled connection (DATABASE_URL)", false, (e as Error).message);
  } finally {
    await pooled.end().catch(() => {});
  }

  // 3. Direct URL (what migrations use)
  const direct = new Client({ connectionString: process.env.DIRECT_URL });
  try {
    await direct.connect();
    await direct.query("select 1");
    report("db: direct connection (DIRECT_URL)", true);
  } catch (e) {
    report("db: direct connection (DIRECT_URL)", false, (e as Error).message);
  } finally {
    await direct.end().catch(() => {});
  }

  // 4. Storage bucket
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    const bucketName = process.env.SUPABASE_STORAGE_BUCKET ?? "documents";
    const { data, error } = await supabase.storage.getBucket(bucketName);
    if (error || !data) {
      report(`storage: bucket "${bucketName}"`, false, error?.message ?? "not found");
    } else {
      report(
        `storage: bucket "${bucketName}"`,
        true,
        data.public ? "WARNING: bucket is public, should be private" : "private"
      );
    }
  } catch (e) {
    report("storage: bucket", false, (e as Error).message);
  }

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);

  // process.exit() during an active libuv teardown trips
  // "Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)" on Windows,
  // which surfaces as exit 255 on an otherwise clean run. Setting exitCode
  // and letting Node drain its handles avoids it and reports the same code.
  process.exitCode = failures === 0 ? 0 : 1;
}

main();
