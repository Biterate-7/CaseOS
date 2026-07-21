import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import type { StatusTone } from "@/lib/format"

/**
 * The single place raw enum state becomes something an analyst reads.
 *
 * Never pass a database constant to this component — pass a label from
 * lib/format.ts and its matching tone. Colour alone never conveys the state
 * (skill rule: don't rely on colour alone); the text label always carries it,
 * and the dot is redundant reinforcement.
 */
const statusBadgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        grounded: "border-grounded-border bg-grounded-surface text-grounded",
        pending: "border-pending-border bg-pending-surface text-pending",
        rejected: "border-rejected-border bg-rejected-surface text-rejected",
        neutral: "border-border bg-muted text-muted-foreground",
      },
      size: {
        default: "h-6",
        sm: "h-5 px-1.5 text-[0.6875rem]",
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
  VariantProps<typeof statusBadgeVariants> & {
    tone?: StatusTone
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

export { StatusBadge, statusBadgeVariants }
