"use client";

import { FileSearch, Quote } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";

import { AnswerBody } from "@/components/matter/answer-body";
import { AskComposer } from "@/components/matter/ask-composer";
import { ReviewGate } from "@/components/matter/review-gate";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { alignAnswer } from "@/lib/citations";
import {
  countLabel,
  formatRelativeTime,
  interactionTypeLabel,
  reviewStatusLabel,
  reviewStatusTone,
} from "@/lib/format";
import type { WorkspaceInteraction } from "@/lib/matter-data";
import { cn } from "@/lib/utils";

function InteractionCard({
  interaction,
  focused,
  activeCitationId,
  onFocus,
  onSelectCitation,
}: {
  interaction: WorkspaceInteraction;
  focused: boolean;
  activeCitationId: string | null;
  onFocus: () => void;
  onSelectCitation: (citationId: string | null) => void;
}) {
  // Re-parsing the answer on every parent state change (citation select,
  // panel toggle) is pure waste — the response is immutable once persisted.
  const aligned = useMemo(
    () => alignAnswer(interaction.response, interaction.citations),
    [interaction.response, interaction.citations]
  );

  return (
    <article
      onFocusCapture={onFocus}
      onMouseDown={onFocus}
      aria-current={focused ? "true" : undefined}
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card p-4 transition-[border-color,box-shadow] duration-200 ease-(--ease-out-quart)",
        focused
          ? "border-foreground/20 shadow-sm"
          : "hover:border-foreground/15 hover:shadow-xs"
      )}
    >
      {/* The question, set as a question — indented behind a rule the way a
          quoted issue appears in a memo. */}
      <header className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <p className="border-l-2 border-primary/40 pl-2.5 font-serif text-sm leading-snug font-medium text-balance">
            {interaction.prompt}
          </p>
          <StatusBadge
            size="sm"
            tone={reviewStatusTone[interaction.reviewStatus]}
            className="shrink-0"
          >
            {reviewStatusLabel[interaction.reviewStatus]}
          </StatusBadge>
        </div>

        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.6875rem] text-muted-foreground">
          <span className="font-medium text-foreground">
            {interaction.authorName}
          </span>
          <span>· {formatRelativeTime(interaction.createdAt)}</span>
          <span>· {interactionTypeLabel[interaction.type]}</span>
          <span className="font-mono opacity-80">· {interaction.model}</span>
        </p>
      </header>

      <AnswerBody
        aligned={aligned}
        activeCitationId={activeCitationId}
        onSelectCitation={(id) => {
          onFocus();
          onSelectCitation(id);
        }}
      />

      <footer className="flex flex-col gap-3">
        <p className="inline-flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground">
          <Quote className="size-3 shrink-0" />
          {interaction.citations.length > 0 ? (
            <>
              Grounded in{" "}
              {countLabel(interaction.citations.length, "source passage")} ·
              select a marker to see it
            </>
          ) : (
            <>No source passages linked to this answer</>
          )}
        </p>
        <ReviewGate interaction={interaction} />
      </footer>
    </article>
  );
}

/**
 * The centre column: ask, then read the resulting record.
 *
 * Ordered newest-first and rendered as discrete research records rather than
 * a chat transcript — there is no conversational threading in the data model,
 * and pretending otherwise would misrepresent what each row is.
 */
function AiWorkspace({
  matterId,
  readyDocumentCount,
  interactions,
  focusedInteractionId,
  activeCitationId,
  onFocusInteraction,
  onSelectCitation,
}: {
  matterId: string;
  readyDocumentCount: number;
  interactions: WorkspaceInteraction[];
  focusedInteractionId: string | null;
  activeCitationId: string | null;
  onFocusInteraction: (id: string) => void;
  onSelectCitation: (citationId: string | null) => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <section
      aria-label="AI research"
      // Measure cap. Without it the centre column grows with the viewport and
      // the answer hits ~90 characters per line on a 1440 display — past the
      // point where the eye reliably finds the next line. Below xl the column
      // is already narrower than this, so the cap only bites on wide screens.
      className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 lg:p-5"
    >
      <div>
        <h2 className="text-sm font-semibold">Research</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Answers are drawn only from this matter&apos;s documents, and every
          claim carries the passage it came from.
        </p>
      </div>

      <AskComposer
        matterId={matterId}
        readyDocumentCount={readyDocumentCount}
      />

      {interactions.length === 0 ? (
        <EmptyState
          icon={FileSearch}
          title="No research yet"
          description={
            readyDocumentCount > 0
              ? "Ask a question above. The assistant will search this matter's passages and return an answer with its sources attached."
              : "Upload a document first. Without indexed sources there is nothing for the assistant to ground an answer in."
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {interactions.map((interaction, index) => (
            <motion.div
              key={interaction.id}
              initial={
                reduceMotion || index > 0 ? false : { opacity: 0, y: 8 }
              }
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.25, 1, 0.5, 1] }}
            >
              <InteractionCard
                interaction={interaction}
                focused={focusedInteractionId === interaction.id}
                activeCitationId={
                  focusedInteractionId === interaction.id
                    ? activeCitationId
                    : null
                }
                onFocus={() => onFocusInteraction(interaction.id)}
                onSelectCitation={onSelectCitation}
              />
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}

export { AiWorkspace };
