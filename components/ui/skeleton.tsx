import { cn } from "@/lib/utils"

/**
 * Loading placeholder. Reserves the same box the real content will occupy so
 * arrival doesn't shift layout (CLS budget).
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
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
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3.5", i === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  )
}

export { Skeleton, SkeletonText }
