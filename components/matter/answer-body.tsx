"use client";

import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AlignedAnswer, AnswerSentence } from "@/lib/citations";

/**
 * The answer, rendered as claims rather than a wall of text.
 *
 * Each sentence is a hoverable unit; a sentence grounded by the currently
 * selected citation lifts onto a tinted surface, so "which part of this
 * answer does that evidence support" is answered visually rather than by
 * re-reading.
 *
 * Markers the model invented (no citation row) render in a muted, inert style
 * with a title explaining why — they are never silently hidden, because a
 * analyst needs to see that the model over-cited.
 *
 * Structured answers (Enhanced Research) arrive as sections. Document-grounded
 * sections read as one continuous answer under quiet labels; the AI-generated
 * "Additional Context" section is set apart on its own tinted, bordered
 * surface with an explicit provenance label — the visual system's job is to
 * make "from your documents" and "from the model" impossible to confuse.
 */

function Sentences({
  sentences,
  activeCitationId,
  onSelectCitation,
}: {
  sentences: AnswerSentence[];
  activeCitationId: string | null;
  onSelectCitation: (citationId: string | null) => void;
}) {
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
              // A claim under inspection gets a tinted field plus a bronze
              // underline — reads as "this is the cited assertion" rather than
              // a highlighter smear across the paragraph.
              isActive &&
                "bg-citation-surface shadow-[0_0_0_3px_var(--citation-surface),inset_0_-1px_0_0_var(--citation)]"
            )}
          >
            {sentence.segments.map((segment, i) => {
              if (segment.kind === "text") {
                return <span key={i}>{segment.text}</span>;
              }

              if (segment.citationId == null) {
                return (
                  <sup
                    key={i}
                    title="The model cited a source that was not retrieved for this answer. Nothing grounds this marker."
                    className="mx-0.5 cursor-help font-sans text-[0.625rem] font-semibold text-muted-foreground/60 line-through"
                  >
                    S{segment.sourceNumber}
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
                    aria-label={`Show source ${segment.sourceNumber}`}
                    className={cn(
                      // A superscript chip is inherently a tiny target. The
                      // pseudo-element extends the touch area well past the
                      // visible chip without disturbing the text flow — on a
                      // phone this is the difference between the signature
                      // interaction working and being unusable.
                      "relative before:absolute before:-inset-x-2 before:-inset-y-3 before:content-['']",
                      "inline-flex min-h-4 min-w-4 items-center justify-center rounded px-1 py-px font-sans text-[0.625rem] font-semibold",
                      "transition-[background-color,color,box-shadow] duration-150 outline-none",
                      "focus-visible:ring-3 focus-visible:ring-ring/50",
                      markerActive
                        ? "bg-citation text-card shadow-xs"
                        : // The ring keeps the chip delineated even when its
                          // own sentence is highlighted in the same tint.
                          "bg-citation-surface text-citation ring-1 ring-citation/30 hover:bg-citation hover:text-card hover:ring-citation"
                    )}
                  >
                    S{segment.sourceNumber}
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

function AnswerBody({
  aligned,
  activeCitationId,
  onSelectCitation,
}: {
  aligned: AlignedAnswer;
  activeCitationId: string | null;
  onSelectCitation: (citationId: string | null) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {aligned.sections.map((section) => {
        if (section.sentences.length === 0) return null;

        if (!section.grounded) {
          return (
            <aside
              key={section.key}
              aria-label="AI-generated context"
              className="flex flex-col gap-2 rounded-lg border border-ai-context-border bg-ai-context-surface/60 px-3.5 py-3"
            >
              <p className="inline-flex items-start gap-1.5 font-sans text-[0.6875rem] leading-snug font-semibold tracking-wide text-ai-context uppercase">
                <Sparkles className="mt-px size-3 shrink-0" />
                Additional context — AI-generated, not from this project&apos;s
                documents
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

export { AnswerBody };
