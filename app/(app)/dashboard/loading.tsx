import { Skeleton } from "@/components/ui/skeleton";

/**
 * Dashboard skeleton.
 *
 * Every route here is `force-dynamic` and hits the database, so there is a
 * real wait on each navigation.
 *
 * The geometry mirrors the real dashboard exactly — masthead, then two
 * ledgers — so the transition to content is a fill rather than a jump, and
 * CLS stays at zero. When the dashboard's stat tiles and quick-action cards
 * were removed, this file had to lose them too: a skeleton that promises a
 * layout the page no longer has is a flash of the old design.
 *
 * Blocks are static tone, never a shimmer sweep. A sweep is an animation
 * carrying no information about what is loading, and it runs indefinitely.
 */
export default function DashboardLoading() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-12 px-margin-mobile py-10 lg:px-margin-desktop lg:py-14">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>

      {/* The queue */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-44" />
        <div className="flex flex-col rounded-xl bg-card ring-1 ring-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 border-b border-border px-5 py-4 last:border-0"
            >
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>

      {/* Recent projects */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <div className="flex flex-col rounded-xl bg-card ring-1 ring-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 border-b border-border px-5 py-3.5 last:border-0"
            >
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
