import Link from "next/link"

import { cn } from "@/lib/utils"

/**
 * A single figure with its label.
 *
 * Deliberately not a tile: no container, no icon, no ghost glyph, no
 * counting animation. Apparatus §16.5 prohibits the four-equal-cards row
 * outright — it establishes that four unrelated facts are equally important,
 * which is almost never true. Where several figures must appear together
 * they are set as a fact strip: a horizontal run of label-over-value pairs
 * with tabular figures, and only the figure that requires action is tinted.
 *
 * `emphasis` is the only colour this component will ever apply to a number,
 * and it means exactly one thing: there is something here waiting on a
 * person.
 */
function StatCard({
  label,
  value,
  hint,
  href,
  emphasis = false,
  className,
}: {
  label: string
  value: number
  hint?: string
  /** Accepted for call-site compatibility; icons do not appear on figures. */
  icon?: React.ComponentType<{ className?: string }>
  href?: string
  emphasis?: boolean
  className?: string
}) {
  const body = (
    <>
      <p className="text-meta-sm text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1.5 text-headline-lg leading-none tabular-nums",
          emphasis ? "text-pending" : "text-foreground"
        )}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-1.5 text-body-sm text-muted-foreground">{hint}</p>
      )}
    </>
  )

  if (href) {
    return (
      <Link
        href={href}
        data-slot="stat-card"
        className={cn(
          "block rounded-md outline-none transition-colors duration-[140ms] ease-(--ease-standard) focus-visible:ring-3 focus-visible:ring-ring/50",
          className
        )}
      >
        {body}
      </Link>
    )
  }

  return (
    <div data-slot="stat-card" className={className}>
      {body}
    </div>
  )
}

export { StatCard }
