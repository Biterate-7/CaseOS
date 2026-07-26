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
 * from this project. It is NOT a claim that the sentence faithfully represents
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
        "relative overflow-hidden rounded-xl bg-card ring-1",
        "transition-[box-shadow,transform,--tw-ring-color] duration-250 ease-(--ease-liquid)",
        active
          ? "shadow-md ring-citation"
          : "ring-border hover:-translate-y-px hover:shadow-md hover:ring-citation/40 motion-reduce:hover:translate-y-0"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        className="flex w-full items-start gap-3 p-4 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-md font-mono text-[0.625rem] font-semibold transition-colors",
            active
              ? "bg-citation text-card"
              : "bg-citation-surface text-citation"
          )}
        >
          {sourceNumber != null ? `S${sourceNumber}` : "—"}
        </span>

        <span className="min-w-0 flex-1">
          {/* The claim this evidence supports. */}
          <span className="line-clamp-3 block text-body-sm leading-relaxed text-foreground">
            {citation.claimText}
          </span>

          {/* Provenance line. Document is the primary fact and gets weight;
              the page is a discrete locator chip, because "which page" is the
              thing an analyst actually goes and checks. */}
          <span className="mt-3 flex items-center gap-2 font-mono text-meta-xs">
            <FileText className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-foreground">
              {citation.documentTitle}
            </span>
            {citation.pageNumber != null && (
              <span className="shrink-0 rounded-md bg-surface-highest px-2 py-0.5 text-muted-foreground ring-1 ring-border tabular-nums">
                p.{citation.pageNumber}
              </span>
            )}
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 font-mono text-meta-xs text-muted-foreground transition-colors duration-150 outline-none hover:bg-surface-highest/50 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ChevronRight
          className={cn(
            "size-3.5 transition-transform duration-250 ease-(--ease-liquid)",
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
            <div className="glass-well border-t border-border p-4">
              <blockquote className="border-l-2 border-citation pl-3.5 font-mono text-meta-xs leading-relaxed text-muted-foreground">
                {citation.quotedText}…
              </blockquote>

              <p className="mt-3 inline-flex items-center gap-1.5 font-mono text-meta-xs text-muted-foreground/80">
                <Link2 className="size-3 shrink-0" />
                Retrieved from this project&apos;s indexed passages
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

export { CitationCard };
