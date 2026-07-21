"use client";

import { AlertTriangle, ShieldCheck, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";

import { CitationCard } from "@/components/matter/citation-card";
import { EmptyState } from "@/components/ui/empty-state";
import { alignAnswer } from "@/lib/citations";
import { countLabel } from "@/lib/format";
import type { WorkspaceInteraction } from "@/lib/matter-data";

/**
 * Evidence for the answer currently in focus.
 *
 * Persistent rather than inline-under-each-answer: keeping the sources in a
 * fixed column means an analyst reads the answer and its proof side by side,
 * which is the entire argument for this product over a chatbot.
 */
function EvidencePanel({
  interaction,
  activeCitationId,
  onSelectCitation,
}: {
  interaction: WorkspaceInteraction | null;
  activeCitationId: string | null;
  onSelectCitation: (citationId: string | null) => void;
}) {
  const reduceMotion = useReducedMotion();

  // Must run before the early return below — hook order has to be identical
  // on every render, and `interaction` goes from null to present the first
  // time an answer lands.
  const aligned = useMemo(
    () =>
      interaction
        ? alignAnswer(interaction.response, interaction.citations)
        : null,
    [interaction]
  );

  if (!interaction || !aligned) {
    return (
      <section aria-label="Sources" className="p-4 lg:p-5">
        <h2 className="mb-3 text-sm font-semibold">Sources</h2>
        <EmptyState
          icon={Sparkles}
          size="sm"
          title="No analysis selected"
          description="Ask a question, then every claim in the answer will appear here with the document and page it came from."
        />
      </section>
    );
  }

  const { citations } = interaction;

  return (
    <section aria-label="Sources" className="flex flex-col gap-3 p-4 lg:p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">Sources</h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          {countLabel(citations.length, "source")}
        </span>
      </div>

      {citations.length > 0 && (
        <p className="inline-flex items-start gap-1.5 rounded-md border border-grounded-border bg-grounded-surface px-2.5 py-2 text-[0.6875rem] leading-relaxed text-grounded">
          <ShieldCheck className="mt-px size-3.5 shrink-0" />
          <span>
            Every source below was retrieved from this project. Nothing outside
            it was searched.
          </span>
        </p>
      )}

      {aligned.unresolvedMarkerCount > 0 && (
        <p className="inline-flex items-start gap-1.5 rounded-md border border-pending-border bg-pending-surface px-2.5 py-2 text-[0.6875rem] leading-relaxed text-pending">
          <AlertTriangle className="mt-px size-3.5 shrink-0" />
          <span>
            {countLabel(aligned.unresolvedMarkerCount, "citation marker")} in
            this answer{" "}
            {aligned.unresolvedMarkerCount === 1 ? "points" : "point"} to a
            source that was never retrieved. Those claims are ungrounded —
            verify them directly.
          </span>
        </p>
      )}

      {citations.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          size="sm"
          title="No citations on this answer"
          description="The assistant returned an answer without linking any claim to a source passage. Treat it as unverified."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {citations.map((citation, index) => (
            <motion.div
              key={citation.id}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.24,
                delay: reduceMotion ? 0 : index * 0.04,
                ease: [0.25, 1, 0.5, 1],
              }}
            >
              <CitationCard
                citation={citation}
                sourceNumber={aligned.sourceNumberByCitation.get(citation.id)}
                active={activeCitationId === citation.id}
                onSelect={() =>
                  onSelectCitation(
                    activeCitationId === citation.id ? null : citation.id
                  )
                }
              />
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}

export { EvidencePanel };
