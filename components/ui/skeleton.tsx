import { cn } from "@/lib/utils"

/**
 * Loading placeholder. Reserves the same box the real content will occupy so
 * arrival doesn't shift layout (CLS budget).
 *
 * Uses the shimmer sweep rather than a pulse: a sweep reads as "content is
 * streaming in", where a pulse reads as "something is broken and blinking".
 * The global reduced-motion rule freezes it to a flat block.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("shimmer rounded-lg", className)}
      {...props}
    />
  )
}

/** Text-line skeleton. `lines={3}` renders a short last line, like real prose. */
function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3.5", i === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  )
}

/** Card-shaped skeleton, matching the resting shape of a real Card. */
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-2xl bg-card p-6 ring-1 ring-border",
        className
      )}
    >
      <Skeleton className="size-11 rounded-xl" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-1/2" />
        <SkeletonText lines={2} />
      </div>
    </div>
  )
}

export { Skeleton, SkeletonText, SkeletonCard }
