"use client";

import { motion, useReducedMotion } from "motion/react";

import { countLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The weekly-ingestion bar chart, drawing itself in.
 *
 * Each bar scales up from its baseline in sequence (transform-origin bottom, so
 * it grows like a real bar rising), staggered left-to-right. scaleY is
 * GPU-composited — no per-frame layout — and the whole thing renders instantly
 * and statically under reduced motion.
 */
export function IngestionChart({
  weeks,
  peak,
}: {
  weeks: { end: Date; count: number }[];
  peak: number;
}) {
  const reduce = useReducedMotion();

  return (
    <div className="flex h-36 items-end gap-2">
      {weeks.map((week, i) => {
        const label = `Week ending ${week.end.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}: ${countLabel(week.count, "document")}`;
        const height = week.count > 0 ? `${Math.max((week.count / peak) * 100, 6)}%` : "2px";

        return (
          <div
            key={i}
            title={label}
            aria-label={label}
            className="group flex h-full flex-1 flex-col justify-end"
          >
            <motion.div
              className={cn(
                "w-full origin-bottom rounded-t-lg transition-colors duration-150",
                week.count > 0
                  ? "bg-primary/25 group-hover:bg-primary group-hover:shadow-[0_0_16px_var(--glow)]"
                  : "bg-surface-highest"
              )}
              style={{ height }}
              initial={reduce ? false : { scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{
                duration: 0.5,
                delay: reduce ? 0 : 0.1 + i * 0.04,
                ease: [0.25, 1, 0.5, 1],
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
