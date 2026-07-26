import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import type { StatusTone } from "@/lib/format"

/**
 * The single place raw enum state becomes something a reader understands.
 *
 * Never pass a database constant to this component — pass a label from
 * lib/format.ts and its matching tone. Colour alone never conveys the state
 * (skill rule: don't rely on colour alone); the text label always carries it,
 * and the dot is redundant reinforcement.
 *
 * Two families of tone live here, and they are the *only* place these hues are
 * allowed to appear:
 *
 *   state      — grounded / pending / rejected. Review and ingestion outcomes.
 *   provenance — citation (bronze), ai-context (violet), external (indigo).
 *                Where a claim came from.
 *
 * Chrome cyan is deliberately absent. A cyan badge would read as "interactive",
 * and a badge is a statement of fact, not a control.
 */
type BadgeTone = StatusTone | "citation" | "ai-context" | "external"

const statusBadgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-meta-xs font-medium whitespace-nowrap [&>svg]:size-3",
  {
    variants: {
      tone: {
        grounded: "border-grounded-border bg-grounded-surface text-grounded",
        pending: "border-pending-border bg-pending-surface text-pending",
        rejected: "border-rejected-border bg-rejected-surface text-rejected",
        citation: "border-citation-border bg-citation-surface text-citation",
        "ai-context":
          "border-ai-context-border bg-ai-context-surface text-ai-context",
        external: "border-external-border bg-external-surface text-external",
        neutral: "border-border bg-surface-highest text-muted-foreground",
      },
      size: {
        default: "h-6",
        sm: "h-5 px-2 text-[0.625rem]",
      },
    },
    defaultVariants: { tone: "neutral", size: "default" },
  }
)

const dotVariants = cva("size-1.5 shrink-0 rounded-full", {
  variants: {
    tone: {
      grounded: "bg-grounded",
      pending: "bg-pending",
      rejected: "bg-rejected",
      citation: "bg-citation",
      "ai-context": "bg-ai-context",
      external: "bg-external",
      neutral: "bg-muted-foreground/50",
    },
  },
  defaultVariants: { tone: "neutral" },
})

function StatusBadge({
  className,
  tone = "neutral",
  size,
  dot = true,
  pulse = false,
  children,
  ...props
}: React.ComponentProps<"span"> &
  Omit<VariantProps<typeof statusBadgeVariants>, "tone"> & {
    tone?: BadgeTone
    /** Hide the dot where the badge sits next to an icon already. */
    dot?: boolean
    /** Animate the dot for genuinely in-flight states (e.g. Processing). */
    pulse?: boolean
  }) {
  return (
    <span
      data-slot="status-badge"
      className={cn(statusBadgeVariants({ tone, size }), className)}
      {...props}
    >
      {dot && (
        <span className="relative flex size-1.5 shrink-0">
          {pulse && (
            <span
              className={cn(
                dotVariants({ tone }),
                "absolute inline-flex size-full animate-ping opacity-75 motion-reduce:hidden"
              )}
            />
          )}
          <span className={cn(dotVariants({ tone }), "relative")} />
        </span>
      )}
      {children}
    </span>
  )
}

export { StatusBadge, statusBadgeVariants, type BadgeTone }
