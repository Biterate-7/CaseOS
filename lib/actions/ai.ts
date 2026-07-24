"use server";

import { revalidatePath } from "next/cache";

import { classifyAiError, logAiError, type AiErrorCode } from "@/lib/ai/errors";
import { generateGroundedAnswer } from "@/lib/ai/generate";
import { retrieveChunks } from "@/lib/ai/retrieve";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { KnowledgeMode } from "@/lib/format";

/**
 * Result shape returned to the client.
 *
 * `error` is always one of the fixed strings in lib/ai/errors.ts — never
 * provider text. `code` is stable and machine-readable so the UI can vary its
 * treatment (retry affordance, tone) without parsing the message.
 */
export type AskResult =
  | { ok: true; interactionId: string }
  | { ok: false; error: string; code: AiErrorCode | "VALIDATION" | "NOT_FOUND" };

const MAX_QUESTION_CHARS = 2000;
/** Excerpt length stored as Citation.quotedText */
const QUOTE_CHARS = 300;

/**
 * Form values are untrusted; anything unrecognised falls back to the
 * document-only default rather than erroring — the strictest mode is always
 * a safe interpretation.
 */
function parseKnowledgeMode(value: unknown): KnowledgeMode {
  return value === "DOCUMENT_PLUS_AI" ? "DOCUMENT_PLUS_AI" : "DOCUMENT_ONLY";
}

export async function askQuestion(
  matterId: string,
  formData: FormData
): Promise<AskResult> {
  const user = await requireUser();

  const question = String(formData.get("question") ?? "").trim();
  const knowledgeMode = parseKnowledgeMode(formData.get("knowledgeMode"));
  if (question.length < 5) {
    return { ok: false, code: "VALIDATION", error: "Enter a question (at least 5 characters)." };
  }
  if (question.length > MAX_QUESTION_CHARS) {
    return { ok: false, code: "VALIDATION", error: "Question is too long (2000 characters max)." };
  }

  const matter = await db.matter.findFirst({
    where: { id: matterId, firmId: user.firmId },
    select: {
      id: true,
      firmId: true,
      _count: { select: { documents: { where: { status: "READY" } } } },
    },
  });
  if (!matter) {
    return { ok: false, code: "NOT_FOUND", error: "Project not found." };
  }
  if (matter._count.documents === 0) {
    return {
      ok: false,
      code: "VALIDATION",
      error:
        "This project has no indexed documents yet. Upload a document first — answers are grounded only in this project's sources.",
    };
  }

  try {
    const chunks = await retrieveChunks(matter.id, question);
    if (chunks.length === 0) {
      return { ok: false, code: "VALIDATION", error: "No searchable content found in this project's documents." };
    }

    const { answer, citations, model, strippedMarkerCount } =
      await generateGroundedAnswer(question, chunks, knowledgeMode);

    const interactionId = await db.$transaction(async (tx) => {
      const interaction = await tx.aIInteraction.create({
        data: {
          matterId: matter.id,
          userId: user.id,
          type: "RESEARCH",
          prompt: question,
          response: answer,
          model,
          knowledgeMode,
          reviewStatus: "PENDING_REVIEW",
        },
      });

      // One Citation row per resolved [Sn] marker. Markers pointing at
      // nonexistent sources have no chunk to link and are recorded in the
      // audit detail instead.
      const resolved = citations.filter((c) => c.chunk != null);
      if (resolved.length > 0) {
        await tx.citation.createMany({
          data: resolved.map((c) => ({
            aiInteractionId: interaction.id,
            chunkId: c.chunk!.chunkId,
            claimText: c.claimText.slice(0, 1000),
            quotedText: c.chunk!.content.slice(0, QUOTE_CHARS),
            verified: true, // marker resolves to a retrieved, matter-scoped chunk
          })),
        });
      }

      await tx.auditLog.create({
        data: {
          firmId: matter.firmId,
          userId: user.id,
          matterId: matter.id,
          action: "AI_QUESTION_ASKED",
          entityType: "AIInteraction",
          entityId: interaction.id,
          detail: {
            model,
            knowledgeMode,
            chunksRetrieved: chunks.length,
            citations: resolved.length,
            unresolvedMarkers: citations.length - resolved.length,
            // Markers the model put inside AI-generated context, stripped
            // before persistence. Non-zero means it tried to pass outside
            // knowledge off as document evidence.
            strippedContextMarkers: strippedMarkerCount,
          },
        },
      });

      return interaction.id;
    });

    revalidatePath(`/matters/${matter.id}`);
    return { ok: true, interactionId };
  } catch (error) {
    // This used to be `error.message`, which forwarded the provider's raw
    // HTTP body to the browser — the Gemini SDK puts the whole
    // {"error":{"code":503,...}} payload in that field, and it rendered in
    // the research panel.
    //
    // Now the full payload is logged server-side and the client receives only
    // a fixed message plus a stable code. Nothing derived from the provider's
    // response crosses this boundary.
    const aiError = classifyAiError(error);
    logAiError("askQuestion", aiError);

    return {
      ok: false,
      code: aiError.code,
      error: aiError.userMessage,
    };
  }
}

export type ReviewResult = { ok: true } | { ok: false; error: string };

export async function reviewInteraction(
  interactionId: string,
  decision: "APPROVED" | "REJECTED"
): Promise<ReviewResult> {
  const verdict = requireReviewDecision(decision);
  const user = await requireUser();

  const interaction = await db.aIInteraction.findFirst({
    where: { id: interactionId, matter: { firmId: user.firmId } },
    select: {
      id: true,
      matterId: true,
      knowledgeMode: true,
      matter: { select: { firmId: true } },
    },
  });
  if (!interaction) {
    return { ok: false, error: "AI interaction not found." };
  }

  await db.$transaction([
    db.aIInteraction.update({
      where: { id: interaction.id },
      data: { reviewStatus: verdict, reviewedAt: new Date() },
    }),
    db.auditLog.create({
      data: {
        firmId: interaction.matter.firmId,
        userId: user.id,
        matterId: interaction.matterId,
        action: `AI_ANSWER_${verdict}`,
        entityType: "AIInteraction",
        entityId: interaction.id,
        // Reviewers approve different things in different modes — a
        // document-only answer vs one carrying AI-generated context — so the
        // review record captures which one was judged.
        detail: { knowledgeMode: interaction.knowledgeMode },
      },
    }),
  ]);

  revalidatePath(`/matters/${interaction.matterId}`);
  return { ok: true };
}

function requireReviewDecision(decision: string): "APPROVED" | "REJECTED" {
  if (decision !== "APPROVED" && decision !== "REJECTED") {
    throw new Error("Invalid review decision.");
  }
  return decision;
}
