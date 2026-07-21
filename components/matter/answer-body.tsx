"use client";

import { cn } from "@/lib/utils";
import type { AlignedAnswer } from "@/lib/citations";

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
 * lawyer needs to see that the model over-cited.
 */
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
    <div className="font-serif text-[0.9375rem] leading-[1.75] text-foreground">
      {aligned.sentences.map((sentence) => {
        const isActive =
          activeCitationId != null &&
          sentence.citationIds.includes(activeCitationId);

        return (
          <span
            key={sentence.key}
            className={cn(
              sentence.startsParagraph && "mt-3 block",
              "rounded-sm transition-colors duration-200 ease-(--ease-out-quart)",
              isActive && "bg-citation-surface shadow-[0_0_0_3px_var(--citation-surface)]"
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
                <sup key={i} className="mx-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      onSelectCitation(markerActive ? null : segment.citationId)
                    }
                    aria-pressed={markerActive}
                    aria-label={`Show source ${segment.sourceNumber}`}
                    className={cn(
                      "inline-flex min-w-4 items-center justify-center rounded px-1 py-px font-sans text-[0.625rem] font-semibold",
                      "transition-colors duration-150 outline-none",
                      "focus-visible:ring-3 focus-visible:ring-ring/50",
                      markerActive
                        ? "bg-citation text-card"
                        : "bg-citation-surface text-citation hover:bg-citation hover:text-card"
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

export { AnswerBody };
