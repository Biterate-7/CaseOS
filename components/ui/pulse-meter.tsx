import { cn } from "@/lib/utils"

/**
 * Small equaliser of bars, used as a "this workspace is active" indicator.
 *
 * The bar heights come from real data — pass normalised values in 0..1 and the
 * meter shows the actual shape of recent activity. It animates with `scaleY`
 * from a bottom origin rather than by animating height, so the compositor
 * carries it instead of relaying out on every frame.
 *
 * The staggered durations are deliberately non-harmonic (1s / 1.2s / 1.4s …)
 * so the bars never fall into lockstep and start reading as a progress bar.
 */
const DURATIONS = ["1.2s", "1.5s", "1s", "1.8s", "1.4s", "1.6s", "1.1s"]

function PulseMeter({
  values,
  className,
  animated = true,
}: {
  /** Normalised 0..1 heights, one per bar. */
  values: number[]
  className?: string
  animated?: boolean
}) {
  return (
    <div
      aria-hidden
      data-slot="pulse-meter"
      className={cn("flex h-8 items-end gap-1", className)}
    >
      {values.map((value, index) => (
        <div
          key={index}
          className={cn(
            "w-1 shrink-0 rounded-full bg-primary",
            animated && "animate-pulse-bar"
          )}
          style={{
            // Floor at 15% so an empty bucket still reads as a bar, not a gap.
            height: `${Math.max(15, Math.round(value * 100))}%`,
            opacity: 0.35 + value * 0.65,
            animationDuration: DURATIONS[index % DURATIONS.length],
          }}
        />
      ))}
    </div>
  )
}

export { PulseMeter }
