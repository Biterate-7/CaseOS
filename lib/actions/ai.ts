"use server";

import { revalidatePath } from "next/cache";

import { classifyAiError, logAiError, type AiErrorCode } from "@/lib/ai/errors";
import { generateGroundedAnswer } from "@/lib/ai/generate";
import { retrieveChunks } from "@/lib/ai/retrieve";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { KnowledgeMode } from "@/lib/format";
import { logError } from "@/lib/log";

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
  if (value === "DOCUMENT_PLUS_AI") return "DOCUMENT_PLUS_AI";
  if (value === "DOCUMENT_PLUS_EXTERNAL") return "DOCUMENT_PLUS_EXTERNAL";
  return "DOCUMENT_ONLY";
}

/** Title/publisher/url can be long; keep audit + rows bounded. */
function clip(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
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

    const { answer, citations, model, strippedMarkerCount, external } =
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

      // One ExternalCitation row per verified external source. Only citations
      // that survived URL verification and the domain policy reach this point.
      if (external && external.citations.length > 0) {
        await tx.externalCitation.createMany({
          data: external.citations.map((c) => ({
            aiInteractionId: interaction.id,
            marker: c.marker,
            title: clip(c.title, 500),
            publisher: clip(c.publisher, 300),
            publishedAt: c.publishedAt ? clip(c.publishedAt, 60) : null,
            url: clip(c.url, 2000),
            finalUrl: c.finalUrl ? clip(c.finalUrl, 2000) : null,
            domain: clip(c.domain, 253),
            tier: c.tier,
            httpStatus: c.httpStatus,
            accessedAt: c.accessedAt,
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
            // External research audit: whether it was used, every source
            // consulted (verified and rejected) with URL/tier/status, plus
            // the declared confidence. Timestamps live on the rows + this log.
            ...(knowledgeMode === "DOCUMENT_PLUS_EXTERNAL" && external
              ? {
                  externalResearchUsed: external.used,
                  confidence: external.confidence,
                  externalSourcesVerified: external.citations.map((c) => ({
                    marker: c.marker,
                    url: c.url,
                    finalUrl: c.finalUrl,
                    domain: c.domain,
                    tier: c.tier,
                    httpStatus: c.httpStatus,
                    accessedAt: c.accessedAt.toISOString(),
                  })),
                  externalSourcesRejected: external.rejected.map((r) => ({
                    marker: r.marker,
                    url: r.url,
                    domain: r.domain,
                    tier: r.tier,
                    httpStatus: r.httpStatus,
                    reason: r.reason,
                  })),
                  crossSectionMarkersStripped:
                    external.strippedDocMarkers + external.strippedExternalMarkers,
                  unverifiedMarkersRemoved: external.removedFailedMarkers,
                }
              : {}),
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
    // Structured record with the request identifiers (user, workspace, matter)
    // alongside the AI-specific provider log above.
    logError(
      "ask_question_failed",
      { userId: user.id, firmId: user.firmId, matterId },
      error
    );

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
  // Never throw to the client: validation and every failure below resolve to a
  // consistent { ok: false } result the review gate can render inline.
  if (decision !== "APPROVED" && decision !== "REJECTED") {
    return { ok: false, error: "Invalid review decision." };
  }

  try {
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
        data: { reviewStatus: decision, reviewedAt: new Date() },
      }),
      db.auditLog.create({
        data: {
          firmId: interaction.matter.firmId,
          userId: user.id,
          matterId: interaction.matterId,
          action: `AI_ANSWER_${decision}`,
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
  } catch (error) {
    logError("review_interaction_failed", {}, error);
    return {
      ok: false,
      error: "Couldn't save your review just now. Please try again.",
    };
  }
}
