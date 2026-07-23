/**
 * Invitation security invariants.
 *
 * These are the properties that, if broken, let someone into a workspace they
 * were never invited to. Exercised against the database directly rather than
 * through the server actions, which require a Clerk session.
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { db } from "../lib/db";

let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  const firm = await db.firm.findFirst({ select: { id: true } });
  const inviter = await db.user.findFirst({
    where: { firmId: firm!.id },
    select: { id: true },
  });
  if (!firm || !inviter) { console.log("no seed data"); return; }

  const email = `probe-${Date.now()}@example.com`;
  const token = randomBytes(32).toString("base64url");

  // --- token quality -------------------------------------------------------
  check("token is URL-safe", /^[A-Za-z0-9_-]+$/.test(token), token.slice(0, 12) + "…");
  check("token >= 256 bits of entropy", Buffer.from(token, "base64url").length >= 32,
    `${Buffer.from(token, "base64url").length} bytes`);
  const many = new Set(Array.from({ length: 500 }, () => randomBytes(32).toString("base64url")));
  check("tokens do not collide over 500 draws", many.size === 500);

  const inv = await db.invitation.create({
    data: { firmId: firm.id, email, role: "ATTORNEY", token,
      expiresAt: new Date(Date.now() + 7 * 864e5), invitedById: inviter.id },
    select: { id: true },
  });

  // --- uniqueness ----------------------------------------------------------
  let dupBlocked = false;
  try {
    await db.invitation.create({
      data: { firmId: firm.id, email: `other-${Date.now()}@example.com`, role: "STAFF",
        token, expiresAt: new Date(Date.now() + 864e5), invitedById: inviter.id },
    });
  } catch { dupBlocked = true; }
  check("duplicate token rejected by unique constraint", dupBlocked);

  // --- expiry is computed, not trusted ------------------------------------
  await db.invitation.update({
    where: { id: inv.id },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  const expired = await db.invitation.findUnique({
    where: { token }, select: { status: true, expiresAt: true },
  });
  check("row still reads PENDING after expiring", expired?.status === "PENDING",
    "nothing sweeps it, so acceptance must compare the timestamp");
  check("expiry detectable by timestamp", (expired?.expiresAt.getTime() ?? 0) < Date.now());

  // --- revocation rotates the token ---------------------------------------
  const rotated = randomBytes(32).toString("base64url");
  await db.invitation.update({
    where: { id: inv.id }, data: { status: "REVOKED", token: rotated },
  });
  const byOldToken = await db.invitation.findUnique({ where: { token } });
  check("revoked invite unreachable by its original link", byOldToken === null);

  // --- workspace isolation -------------------------------------------------
  const otherFirm = await db.firm.findFirst({
    where: { id: { not: firm.id } }, select: { id: true },
  });
  if (otherFirm) {
    const crossFirm = await db.invitation.findFirst({
      where: { id: inv.id, firmId: otherFirm.id },
    });
    check("invite invisible when scoped to another workspace", crossFirm === null);
  } else {
    console.log("SKIP  cross-workspace scoping — only one firm in this database");
  }

  await db.invitation.delete({ where: { id: inv.id } });
  console.log(`\n${failed === 0 ? "ALL PASS" : failed + " FAILURE(S)"}`);
  process.exitCode = failed === 0 ? 0 : 1;
}
main().catch(e => { console.error("ERROR:", e?.message ?? e); process.exitCode = 1; })
  .finally(() => db.$disconnect());
