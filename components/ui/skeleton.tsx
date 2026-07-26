import { cn } from "@/lib/utils"

/**
 * Loading placeholder. Reserves the same box the real content will occupy so
 * arrival doesn't shift layout (CLS budget).
 *
 * A static tone block, not a shimmer sweep. A sweep is an animation that
 * reports nothing about the thing being loaded, runs indefinitely, and
 * therefore breaks the rule that nothing moves that the reader did not
 * cause. A block at the correct dimensions communicates the same fact and
 * holds still.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("shimmer rounded-md", className)}
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

/**
 * Row-shaped skeleton, matching the resting shape of a ledger row — which
 * is what lists in this product are. The previous version led with an icon
 * tile, promising a component that no longer exists anywhere.
 */
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 border-b border-border px-5 py-4 last:border-0",
        className
      )}
    >
      <div className="flex flex-1 flex-col gap-1.5">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      <Skeleton className="h-3 w-14 shrink-0" />
    </div>
  )
}

export { Skeleton, SkeletonText, SkeletonCard }
