/**
 * End-to-end AI workflow test against the real database, using the seeded
 * demo matter. Verifies matter-scoped retrieval, then (if the xAI key has
 * credits) grounded generation, citation persistence, and audit logging.
 * Run: npm run test:ai
 */
import "dotenv/config";

import { generateGroundedAnswer } from "../lib/ai/generate";
import { retrieveChunks } from "../lib/ai/retrieve";
import { db } from "../lib/db";

const QUESTION = "How much is the settlement payment and when is it due?";

async function main() {
  const matter = await db.matter.findFirstOrThrow({
    where: { title: { contains: "Hendricks" } },
    select: { id: true, firmId: true, title: true },
  });
  const otherMatter = await db.matter.findFirstOrThrow({
    where: { id: { not: matter.id } },
    select: { id: true, title: true },
  });
  console.log(`Matter: ${matter.title}`);

  // --- Retrieval: matter-scoped ---
  const chunks = await retrieveChunks(matter.id, QUESTION);
  console.log(`Retrieved ${chunks.length} chunks:`);
  for (const c of chunks) {
    console.log(
      `  dist ${c.distance.toFixed(4)} — "${c.documentTitle}" p.${c.pageNumber} chunk ${c.chunkIndex}`
    );
  }
  if (chunks.length === 0) throw new Error("Expected chunks from the seeded settlement PDF");
  if (!chunks[0].content.includes("85,000")) {
    console.warn("WARN: top chunk does not contain the payment clause");
  }

  // --- Matter isolation: a matter with no documents must retrieve nothing ---
  const crossMatter = await retrieveChunks(otherMatter.id, QUESTION);
  console.log(
    `Isolation check — "${otherMatter.title}" (no docs): ${crossMatter.length} chunks`
  );
  if (crossMatter.length !== 0) {
    throw new Error("MATTER ISOLATION VIOLATED: retrieved chunks from another matter's query scope");
  }

  // --- Generation + persistence (requires xAI credits) ---
  let generated;
  try {
    generated = await generateGroundedAnswer(QUESTION, chunks);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (/credits|permission-denied|403/i.test(message)) {
      console.warn(
        "\nRETRIEVAL PASSED — generation skipped: the xAI team has no credits yet.\n" +
          "Add credits at console.x.ai, then re-run npm run test:ai."
      );
      process.exit(2);
    }
    throw e;
  }

  console.log(`\nModel: ${generated.model}`);
  console.log(`Answer:\n${generated.answer}\n`);
  console.log(`Parsed citations: ${generated.citations.length}`);
  if (generated.citations.length === 0) {
    throw new Error("Expected at least one [Sn] citation in the answer");
  }
  const unresolved = generated.citations.filter((c) => c.chunk == null);
  if (unresolved.length > 0) {
    console.warn(`WARN: ${unresolved.length} markers cite nonexistent sources`);
  }

  // Persist exactly like the server action does (demo user stands in for auth).
  const demoUser = await db.user.findFirstOrThrow({
    where: { clerkId: "demo_user_placeholder" },
  });
  const resolved = generated.citations.filter((c) => c.chunk != null);
  const interactionId = await db.$transaction(async (tx) => {
    const interaction = await tx.aIInteraction.create({
      data: {
        matterId: matter.id,
        userId: demoUser.id,
        type: "RESEARCH",
        prompt: QUESTION,
        response: generated.answer,
        model: generated.model,
        reviewStatus: "PENDING_REVIEW",
      },
    });
    await tx.citation.createMany({
      data: resolved.map((c) => ({
        aiInteractionId: interaction.id,
        chunkId: c.chunk!.chunkId,
        claimText: c.claimText.slice(0, 1000),
        quotedText: c.chunk!.content.slice(0, 300),
        verified: true,
      })),
    });
    await tx.auditLog.create({
      data: {
        firmId: matter.firmId,
        userId: demoUser.id,
        matterId: matter.id,
        action: "AI_QUESTION_ASKED",
        entityType: "AIInteraction",
        entityId: interaction.id,
        detail: { model: generated.model, source: "test-ai script" },
      },
    });
    return interaction.id;
  });

  // --- Verify persistence ---
  const stored = await db.aIInteraction.findUniqueOrThrow({
    where: { id: interactionId },
    include: { citations: { include: { chunk: true } } },
  });
  console.log(
    `Stored AIInteraction ${stored.id}: ${stored.citations.length} citations, status ${stored.reviewStatus}`
  );
  if (stored.citations.length !== resolved.length) {
    throw new Error("Citation rows do not match parsed citations");
  }
  const audit = await db.auditLog.findFirst({
    where: { entityId: interactionId, action: "AI_QUESTION_ASKED" },
  });
  if (!audit) throw new Error("Missing AI_QUESTION_ASKED audit entry");
  console.log("Audit entry present.");

  console.log("\nEND-TO-END AI TEST PASSED");
  process.exit(0);
}

main().catch((e) => {
  console.error("TEST FAILED:", e);
  process.exit(1);
});
