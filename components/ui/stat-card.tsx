import Link from "next/link"

import { CountUp } from "@/components/ui/motion/count-up"
import { cn } from "@/lib/utils"

/**
 * Bento stat tile.
 *
 * The number is the point, so it gets display weight and tabular figures; the
 * label and hint stay quiet around it. When `href` is set the whole tile is a
 * target via an overlay link, which keeps the content plain text — no nested
 * interactive elements, and the hit area is the whole card.
 *
 * `emphasis` tints the figure with the pending hue. That is the only colour
 * this component will ever apply to a number, and it means exactly one thing:
 * there is something here waiting on a person.
 */
function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  emphasis = false,
  className,
}: {
  label: string
  value: number
  hint?: string
  icon?: React.ComponentType<{ className?: string }>
  href?: string
  emphasis?: boolean
  className?: string
}) {
  return (
    <div
      data-slot="stat-card"
      className={cn(
        "group/stat relative overflow-hidden rounded-2xl bg-card p-6 ring-1 ring-border",
        "transition-[background-color,box-shadow,transform] duration-250 ease-(--ease-liquid)",
        href &&
          "hover:-translate-y-0.5 hover:bg-surface hover:shadow-xl motion-reduce:hover:translate-y-0",
        emphasis && "ring-pending-border",
        className
      )}
    >
      {/* Oversized ghost glyph, bleeding off the corner. Decorative depth that
          costs nothing and keeps the tile from reading as an empty box. */}
      {Icon && (
        <Icon
          aria-hidden
          className="pointer-events-none absolute -top-3 -right-3 size-24 text-foreground opacity-[0.03] transition-opacity duration-300 group-hover/stat:opacity-[0.06]"
        />
      )}

      {href && (
        <Link
          href={href}
          aria-label={`${value} ${label.toLowerCase()} — jump to the list`}
          className="absolute inset-0 z-10 rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      )}

      <div className="relative flex items-center justify-between gap-2">
        <p className="font-mono text-meta-xs uppercase text-muted-foreground">
          {label}
        </p>
        {Icon && <Icon className="size-4 shrink-0 text-muted-foreground/60" />}
      </div>

      <p
        className={cn(
          "relative mt-4 font-display text-headline-lg leading-none tabular-nums",
          emphasis ? "text-pending" : "text-foreground"
        )}
      >
        <CountUp value={value} />
      </p>

      {hint && (
        <p className="relative mt-3 text-body-sm text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  )
}

export { StatCard }
