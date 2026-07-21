"use client";

import { Check, Loader2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Research progress.
 *
 * These four stages are the real phases of the request — retrieve over this
 * matter's chunks, rank them, generate against sources only, then parse and
 * persist citations. What is *estimated* is the timing: `askQuestion` is a
 * server action that returns once, at the end, so the client cannot observe
 * stage boundaries.
 *
 * Two rules follow from that, and they're the difference between honest
 * progress and theatre:
 *   1. The final stage never self-completes. It spins until the server
 *      actually returns, however long that takes.
 *   2. Stages advance on a timer that deliberately runs slower than the
 *      typical request, so the UI never claims to be further along than it
 *      can possibly be.
 */

const STAGES = [
  {
    label: "Searching matter documents",
    detail: "Embedding the question and scanning this matter's passages",
    ms: 1600,
  },
  {
    label: "Finding relevant clauses",
    detail: "Ranking passages by similarity, top matches only",
    ms: 2200,
  },
  {
    label: "Preparing analysis",
    detail: "Drafting an answer constrained to those sources",
    ms: 4000,
  },
  {
    label: "Grounding response",
    detail: "Linking each claim to the passage that supports it",
    ms: Infinity,
  },
] as const;

function ResearchProgress() {
  const [stage, setStage] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (stage >= STAGES.length - 1) return;
    const timer = setTimeout(() => setStage((s) => s + 1), STAGES[stage].ms);
    return () => clearTimeout(timer);
  }, [stage]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-lg border bg-card p-4 shadow-xs"
    >
      <ol className="flex flex-col gap-2.5">
        {STAGES.map((item, index) => {
          const done = index < stage;
          const active = index === stage;

          return (
            <li
              key={item.label}
              className={cn(
                "flex items-start gap-2.5 transition-opacity duration-300",
                !done && !active && "opacity-40"
              )}
            >
              <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
                {done ? (
                  <motion.span
                    initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.18 }}
                    className="flex size-4 items-center justify-center rounded-full bg-grounded-surface text-grounded"
                  >
                    <Check className="size-2.5" strokeWidth={3} />
                  </motion.span>
                ) : active ? (
                  <Loader2 className="size-3.5 animate-spin text-primary" />
                ) : (
                  <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                )}
              </span>

              <div className="min-w-0">
                <p
                  className={cn(
                    "text-xs leading-snug font-medium",
                    active ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </p>
                {active && (
                  <motion.p
                    initial={reduceMotion ? false : { opacity: 0, y: -2 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-0.5 text-[0.6875rem] leading-relaxed text-muted-foreground"
                  >
                    {item.detail}
                  </motion.p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export { ResearchProgress };
