"use client";

import { ChevronRight, FileText, Link2 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";

import type { WorkspaceCitation } from "@/lib/matter-data";
import { cn } from "@/lib/utils";

/**
 * One piece of evidence.
 *
 * Reads top-to-bottom as a chain of custody: the claim the AI made, the exact
 * passage it came from, and the document and page that passage lives on. The
 * quoted source is set in a monospaced block behind a rule — visually a
 * transcript excerpt, not prose, so it is never mistaken for the AI's words.
 *
 * On "grounded" vs "verified": the label states only what the system
 * guarantees — this marker resolved to a passage that was actually retrieved
 * from this matter. It is NOT a claim that the sentence faithfully represents
 * the passage; no span-check pass exists yet (see docs/architecture.md).
 * Overstating that in a product sold on citation integrity would be the one
 * unforgivable lie.
 */
function CitationCard({
  citation,
  sourceNumber,
  active,
  onSelect,
}: {
  citation: WorkspaceCitation;
  sourceNumber: number | undefined;
  active: boolean;
  onSelect: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      layout={reduceMotion ? false : "position"}
      transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
      className={cn(
        "overflow-hidden rounded-lg border bg-card transition-[border-color,box-shadow] duration-200 ease-(--ease-out-quart)",
        active
          ? "border-citation shadow-sm ring-1 ring-citation/30"
          : "hover:border-foreground/15 hover:shadow-xs"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        className="flex w-full items-start gap-2.5 p-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded font-mono text-[0.625rem] font-semibold transition-colors",
            active
              ? "bg-citation text-card"
              : "bg-citation-surface text-citation"
          )}
        >
          {sourceNumber != null ? `S${sourceNumber}` : "—"}
        </span>

        <span className="min-w-0 flex-1">
          {/* The claim this evidence supports. */}
          <span className="line-clamp-3 block text-xs leading-relaxed text-foreground">
            {citation.claimText}
          </span>

          <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.6875rem] text-muted-foreground">
            <span className="inline-flex min-w-0 items-center gap-1">
              <FileText className="size-3 shrink-0" />
              <span className="truncate font-medium text-foreground">
                {citation.documentTitle}
              </span>
            </span>
            {citation.pageNumber != null && (
              <span className="tabular-nums">page {citation.pageNumber}</span>
            )}
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-1.5 border-t px-3 py-1.5 text-[0.6875rem] font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <ChevronRight
          className={cn(
            "size-3 transition-transform duration-200 ease-(--ease-out-quart)",
            expanded && "rotate-90"
          )}
        />
        {expanded ? "Hide source passage" : "Read source passage"}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t bg-muted/30 p-3">
              <blockquote className="border-l-2 border-citation pl-2.5 font-mono text-[0.6875rem] leading-relaxed text-muted-foreground">
                {citation.quotedText}…
              </blockquote>

              <p className="mt-2 inline-flex items-center gap-1 text-[0.625rem] text-muted-foreground/80">
                <Link2 className="size-2.5 shrink-0" />
                Retrieved from this matter&apos;s indexed passages
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

export { CitationCard };
