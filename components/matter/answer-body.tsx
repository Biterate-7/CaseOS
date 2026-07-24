"use client";

import { ExternalLink, Gauge, GitCompareArrows, Globe, Sparkles } from "lucide-react";

import { confidenceLabel, formatDate, sourceTierLabel, type ConfidenceLevel, type SourceTier } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AlignedAnswer, AnswerSentence } from "@/lib/citations";
import type { WorkspaceExternalCitation } from "@/lib/matter-data";

/**
 * The answer, rendered as claims rather than a wall of text.
 *
 * Each sentence is a hoverable unit; a sentence grounded by the currently
 * selected citation lifts onto a tinted surface, so "which part of this
 * answer does that evidence support" is answered visually rather than by
 * re-reading.
 *
 * Structured answers arrive as sections, each rendered by provenance so the
 * reader can never confuse where a claim came from:
 *  - document sections: quiet headings, bronze [Sn] citation chips.
 *  - Additional Context (DOCUMENT_PLUS_AI): violet card, no citations.
 *  - External Research (DOCUMENT_PLUS_EXTERNAL): teal card, teal [En] chips,
 *    and a verified source list (title/publisher/date/URL/access date).
 *  - Analysis: neutral card — the model's own interpretation, no citations.
 *  - Confidence: a colour-coded support-level callout.
 */

type Tone = "document" | "external";

function Sentences({
  sentences,
  activeCitationId,
  onSelectCitation,
  tone = "document",
}: {
  sentences: AnswerSentence[];
  activeCitationId: string | null;
  onSelectCitation: (citationId: string | null) => void;
  tone?: Tone;
}) {
  const isExternal = tone === "external";
  return (
    <div className="font-serif text-[0.9375rem] leading-[1.75] text-foreground">
      {sentences.map((sentence) => {
        const isActive =
          activeCitationId != null &&
          sentence.citationIds.includes(activeCitationId);

        return (
          <span
            key={sentence.key}
            className={cn(
              sentence.startsParagraph && "mt-3 block",
              "rounded-sm transition-[background-color,box-shadow] duration-200 ease-(--ease-out-quart)",
              isActive &&
                (isExternal
                  ? "bg-external-surface shadow-[0_0_0_3px_var(--external-surface),inset_0_-1px_0_0_var(--external)]"
                  : "bg-citation-surface shadow-[0_0_0_3px_var(--citation-surface),inset_0_-1px_0_0_var(--citation)]")
            )}
          >
            {sentence.segments.map((segment, i) => {
              if (segment.kind === "text") {
                return <span key={i}>{segment.text}</span>;
              }

              const label = `${segment.markerType}${segment.sourceNumber}`;

              if (segment.citationId == null) {
                return (
                  <sup
                    key={i}
                    title={
                      segment.markerType === "E"
                        ? "This external source could not be verified and was removed."
                        : "The model cited a source that was not retrieved for this answer. Nothing grounds this marker."
                    }
                    className="mx-0.5 cursor-help font-sans text-[0.625rem] font-semibold text-muted-foreground/60 line-through"
                  >
                    {label}
                  </sup>
                );
              }

              const markerActive = activeCitationId === segment.citationId;

              return (
                <sup key={i} className="mx-0.5 leading-none">
                  <button
                    type="button"
                    onClick={() =>
                      onSelectCitation(markerActive ? null : segment.citationId)
                    }
                    aria-pressed={markerActive}
                    aria-label={
                      segment.markerType === "E"
                        ? `Show external source ${segment.sourceNumber}`
                        : `Show source ${segment.sourceNumber}`
                    }
                    className={cn(
                      "relative before:absolute before:-inset-x-2 before:-inset-y-3 before:content-['']",
                      "inline-flex min-h-4 min-w-4 items-center justify-center rounded px-1 py-px font-sans text-[0.625rem] font-semibold",
                      "transition-[background-color,color,box-shadow] duration-150 outline-none",
                      "focus-visible:ring-3 focus-visible:ring-ring/50",
                      isExternal
                        ? markerActive
                          ? "bg-external text-card shadow-xs"
                          : "bg-external-surface text-external ring-1 ring-external/30 hover:bg-external hover:text-card hover:ring-external"
                        : markerActive
                          ? "bg-citation text-card shadow-xs"
                          : "bg-citation-surface text-citation ring-1 ring-citation/30 hover:bg-citation hover:text-card hover:ring-citation"
                    )}
                  >
                    {label}
                  </button>
                </sup>
              );
            })}{" "}
          </span>
        );
      })}
    </div>
  );
}

const TIER_TONE: Record<SourceTier, string> = {
  preferred: "border-grounded-border bg-grounded-surface text-grounded",
  acceptable: "border-external-border bg-external-surface text-external",
  unknown: "border-pending-border bg-pending-surface text-pending",
  avoid: "border-rejected-border bg-rejected-surface text-rejected",
};

/** The verified-source list shown under an External Research section. */
function ExternalSourceList({
  citations,
  activeCitationId,
  onSelectCitation,
}: {
  citations: WorkspaceExternalCitation[];
  activeCitationId: string | null;
  onSelectCitation: (citationId: string | null) => void;
}) {
  if (citations.length === 0) return null;
  return (
    <ol className="flex flex-col gap-1.5">
      {citations.map((c) => {
        const active = activeCitationId === c.id;
        const tier = (c.tier as SourceTier) ?? "unknown";
        return (
          <li
            key={c.id}
            className={cn(
              "rounded-md border px-2.5 py-2 transition-colors duration-150",
              active
                ? "border-external/50 bg-external-surface"
                : "border-border bg-card/60 hover:border-external/30"
            )}
          >
            <div className="flex items-start gap-2">
              <button
                type="button"
                onClick={() => onSelectCitation(active ? null : c.id)}
                aria-pressed={active}
                className="mt-px inline-flex h-4 min-w-5 shrink-0 items-center justify-center rounded bg-external-surface px-1 font-sans text-[0.625rem] font-semibold text-external ring-1 ring-external/30 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                E{c.marker}
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[0.8125rem] leading-snug font-medium text-foreground">
                  {c.title}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[0.6875rem] text-muted-foreground">
                  <span className="font-medium text-foreground/80">{c.publisher}</span>
                  <span>
                    ·{" "}
                    {c.publishedAt
                      ? c.publishedAt
                      : `accessed ${formatDate(c.accessedAt)}`}
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-1.5 py-px font-medium",
                      TIER_TONE[tier]
                    )}
                    title={sourceTierLabel[tier]}
                  >
                    {sourceTierLabel[tier]}
                  </span>
                </p>
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="mt-0.5 inline-flex items-center gap-1 text-[0.6875rem] break-all text-external hover:underline"
                >
                  <ExternalLink className="size-2.5 shrink-0" />
                  {c.domain}
                </a>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function AnswerBody({
  aligned,
  externalCitations,
  activeCitationId,
  onSelectCitation,
}: {
  aligned: AlignedAnswer;
  externalCitations: WorkspaceExternalCitation[];
  activeCitationId: string | null;
  onSelectCitation: (citationId: string | null) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {aligned.sections.map((section) => {
        if (section.sentences.length === 0) return null;

        // AI-generated general knowledge (DOCUMENT_PLUS_AI).
        if (section.kind === "context") {
          return (
            <aside
              key={section.key}
              aria-label="AI-generated context"
              className="flex flex-col gap-2 rounded-lg border border-ai-context-border bg-ai-context-surface/60 px-3.5 py-3"
            >
              <p className="inline-flex items-start gap-1.5 font-sans text-[0.6875rem] leading-snug font-semibold tracking-wide text-ai-context uppercase">
                <Sparkles className="mt-px size-3 shrink-0" />
                Additional context — AI-generated, not from this project&apos;s documents
              </p>
              <Sentences
                sentences={section.sentences}
                activeCitationId={activeCitationId}
                onSelectCitation={onSelectCitation}
              />
              <p className="font-sans text-[0.6875rem] leading-snug text-muted-foreground">
                Drawn from the model&apos;s general knowledge to supplement the
                cited evidence above. Verify independently before relying on it.
              </p>
            </aside>
          );
        }

        // External research (DOCUMENT_PLUS_EXTERNAL) — verified web sources.
        if (section.kind === "external") {
          return (
            <aside
              key={section.key}
              aria-label="External research"
              className="flex flex-col gap-2.5 rounded-lg border border-external-border bg-external-surface/50 px-3.5 py-3"
            >
              <p className="inline-flex items-start gap-1.5 font-sans text-[0.6875rem] leading-snug font-semibold tracking-wide text-external uppercase">
                <Globe className="mt-px size-3 shrink-0" />
                External research — verified web sources, not from your documents
              </p>
              <Sentences
                sentences={section.sentences}
                activeCitationId={activeCitationId}
                onSelectCitation={onSelectCitation}
                tone="external"
              />
              <ExternalSourceList
                citations={externalCitations}
                activeCitationId={activeCitationId}
                onSelectCitation={onSelectCitation}
              />
              <p className="font-sans text-[0.6875rem] leading-snug text-muted-foreground">
                Each source&apos;s URL was checked automatically before it was
                shown; unverifiable citations were removed. Open a source to
                confirm it supports the claim.
              </p>
            </aside>
          );
        }

        // The model's interpretation relating documents and external sources.
        if (section.kind === "analysis") {
          return (
            <section
              key={section.key}
              aria-label="Analysis"
              className="flex flex-col gap-1.5 rounded-lg border border-border bg-muted/40 px-3.5 py-3"
            >
              <p className="inline-flex items-start gap-1.5 font-sans text-[0.6875rem] leading-snug font-semibold tracking-wide text-muted-foreground uppercase">
                <GitCompareArrows className="mt-px size-3 shrink-0" />
                Analysis — AI interpretation
              </p>
              <Sentences
                sentences={section.sentences}
                activeCitationId={activeCitationId}
                onSelectCitation={onSelectCitation}
              />
            </section>
          );
        }

        // Stated support level.
        if (section.kind === "confidence") {
          return (
            <ConfidenceCallout key={section.key} sentences={section.sentences} />
          );
        }

        // Document-grounded sections.
        return (
          <section key={section.key} className="flex flex-col gap-1">
            {section.title != null && (
              <h3 className="font-sans text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">
                {section.title}
              </h3>
            )}
            <Sentences
              sentences={section.sentences}
              activeCitationId={activeCitationId}
              onSelectCitation={onSelectCitation}
            />
          </section>
        );
      })}
    </div>
  );
}

const CONFIDENCE_TONE: Record<ConfidenceLevel, string> = {
  DOCUMENTS: "border-grounded-border bg-grounded-surface text-grounded",
  MIXED: "border-pending-border bg-pending-surface text-pending",
  EXTERNAL: "border-rejected-border bg-rejected-surface text-rejected",
};

function ConfidenceCallout({ sentences }: { sentences: AnswerSentence[] }) {
  const text = sentences
    .flatMap((s) => s.segments.filter((seg) => seg.kind === "text").map((seg) => seg.text))
    .join("")
    .toLowerCase();

  const level: ConfidenceLevel = text.includes("primarily based on external")
    ? "EXTERNAL"
    : text.includes("partially supported")
      ? "MIXED"
      : text.includes("fully supported")
        ? "DOCUMENTS"
        : "MIXED";

  return (
    <div
      aria-label="Confidence"
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3.5 py-2.5",
        CONFIDENCE_TONE[level]
      )}
    >
      <Gauge className="mt-px size-3.5 shrink-0" />
      <div className="flex flex-col gap-0.5">
        <span className="font-sans text-[0.6875rem] font-semibold tracking-wide uppercase opacity-80">
          Confidence
        </span>
        <span className="text-[0.8125rem] leading-snug font-medium">
          {confidenceLabel[level]}
        </span>
      </div>
    </div>
  );
}

export { AnswerBody };
