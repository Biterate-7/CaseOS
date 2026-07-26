import { cn } from "@/lib/utils"

/**
 * Small mono label that sits above a heading — the design's way of naming what
 * kind of thing you are looking at before naming the thing itself.
 *
 * `live` adds a pulsing dot for genuinely in-flight state. Use it only when
 * something is actually happening: a permanently "live" indicator is noise, and
 * it trains people to ignore the one time it matters.
 */
function Eyebrow({
  children,
  live = false,
  className,
}: {
  children: React.ReactNode
  live?: boolean
  className?: string
}) {
  return (
    <p
      data-slot="eyebrow"
      className={cn(
        "flex items-center gap-2.5 font-mono text-meta-xs uppercase text-primary",
        className
      )}
    >
      {live && (
        <span aria-hidden className="relative flex size-1.5 shrink-0">
          <span className="animate-pulse-ring absolute inline-flex size-full rounded-full bg-primary motion-reduce:hidden" />
          <span className="relative inline-flex size-full rounded-full bg-primary" />
        </span>
      )}
      {children}
    </p>
  )
}

export { Eyebrow }
