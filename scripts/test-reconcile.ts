/**
 * Stuck-document recovery.
 *
 * Verifies the reaper against the real dev database: a fresh PROCESSING row is
 * left alone, an old one is flipped to FAILED with an audit entry, and two
 * concurrent reconciles do not double-count or double-log.
 */
import "dotenv/config";
import { db } from "../lib/db";
import { reconcileStuckDocuments } from "../lib/ingest/reconcile";

let failed = 0;
const check = (n: string, ok: boolean, d = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? ` — ${d}` : ""}`);
};

async function makeDoc(firmId: string, matterId: string, ageMinutes: number) {
  const doc = await db.document.create({
    data: {
      matterId, title: "reconcile probe", fileName: "probe.pdf",
      storagePath: "x", mimeType: "application/pdf", sizeBytes: 1,
      status: "PROCESSING",
    },
    select: { id: true },
  });
  // Backdate updatedAt via raw SQL — Prisma would bump it to now().
  await db.$executeRaw`
    UPDATE "Document" SET "updatedAt" = now() - (${ageMinutes} || ' minutes')::interval
    WHERE id = ${doc.id}`;
  return doc.id;
}

async function statusOf(id: string) {
  const d = await db.document.findUnique({ where: { id }, select: { status: true } });
  return d?.status;
}
async function timeoutAudits(id: string) {
  return db.auditLog.count({
    where: { entityId: id, action: "DOCUMENT_INGEST_TIMED_OUT" },
  });
}

async function main() {
  const firm = await db.firm.findFirst({ select: { id: true } });
  const matter = await db.matter.findFirst({ where: { firmId: firm!.id }, select: { id: true } });
  if (!firm || !matter) { console.log("no seed data"); return; }

  const ids: string[] = [];
  try {
    // --- fresh row survives -------------------------------------------------
    const fresh = await makeDoc(firm.id, matter.id, 2); ids.push(fresh);
    await reconcileStuckDocuments({ firmId: firm.id });
    check("2-minute PROCESSING row left alone", (await statusOf(fresh)) === "PROCESSING");

    // --- stuck row recovered ------------------------------------------------
    const stuck = await makeDoc(firm.id, matter.id, 15); ids.push(stuck);
    const n = await reconcileStuckDocuments({ firmId: firm.id });
    check("15-minute row flipped to FAILED", (await statusOf(stuck)) === "FAILED");
    check("reconcile reported it", n >= 1, `count=${n}`);
    check("exactly one timeout audit written", (await timeoutAudits(stuck)) === 1);

    // --- idempotent: second pass is a no-op --------------------------------
    const again = await reconcileStuckDocuments({ firmId: firm.id });
    check("second pass reaps nothing new", again === 0, `count=${again}`);
    check("still exactly one audit after re-run", (await timeoutAudits(stuck)) === 1);

    // --- concurrency: two reconciles at once share no rows -----------------
    const race = await makeDoc(firm.id, matter.id, 20); ids.push(race);
    const [a, b] = await Promise.all([
      reconcileStuckDocuments({ firmId: firm.id }),
      reconcileStuckDocuments({ firmId: firm.id }),
    ]);
    check("exactly one racer reaped the row", a + b === 1, `${a}+${b}`);
    check("no duplicate audit under concurrency", (await timeoutAudits(race)) === 1);

    // --- workspace scoping --------------------------------------------------
    const other = await db.firm.findFirst({ where: { id: { not: firm.id } }, select: { id: true } });
    if (other) {
      const otherMatter = await db.matter.findFirst({ where: { firmId: other.id }, select: { id: true } });
      if (otherMatter) {
        const foreign = await makeDoc(other.id, otherMatter.id, 30); ids.push(foreign);
        await reconcileStuckDocuments({ firmId: firm.id });
        check("another workspace's stuck row untouched", (await statusOf(foreign)) === "PROCESSING");
        // "all" scope should catch it.
        await reconcileStuckDocuments("all");
        check("'all' scope reaps every workspace", (await statusOf(foreign)) === "FAILED");
      }
    } else {
      console.log("SKIP  cross-workspace — only one firm");
    }
  } finally {
    for (const id of ids) {
      await db.auditLog.deleteMany({ where: { entityId: id } });
      await db.document.deleteMany({ where: { id } });
    }
  }

  console.log(`\n${failed === 0 ? "ALL PASS" : failed + " FAILURE(S)"}`);
  process.exitCode = failed === 0 ? 0 : 1;
}
main().catch((e) => { console.error("ERROR:", e?.message ?? e); process.exitCode = 1; })
  .finally(() => db.$disconnect());
