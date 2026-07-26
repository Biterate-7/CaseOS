import { Skeleton } from "@/components/ui/skeleton";

/**
 * Dashboard skeleton.
 *
 * Every route here is `force-dynamic` and hits the database, so there is a
 * real wait on each navigation. Before this file existed the screen simply
 * stayed blank until the server component resolved.
 *
 * The geometry deliberately mirrors the real dashboard — hero, four stat
 * tiles, three quick actions, chart, list, activity rail — so the transition
 * to content is a fill rather than a jump. Matching the layout is what keeps
 * CLS at zero.
 */
export default function DashboardLoading() {
  return (
    <div className="mx-auto flex max-w-(--container-page) flex-col gap-12 px-margin-mobile py-8 lg:px-margin-desktop lg:py-12">
      <div className="rounded-3xl bg-card/40 p-8 ring-1 ring-border lg:p-12">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-5 h-10 w-72 max-w-full" />
        <Skeleton className="mt-4 h-4 w-96 max-w-full" />
        <div className="mt-6 flex gap-3">
          <Skeleton className="h-12 w-36 rounded-2xl" />
          <Skeleton className="h-12 w-48 rounded-2xl" />
        </div>
      </div>

      <div className="grid gap-gutter sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-card p-6 ring-1 ring-border">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="size-4 rounded" />
            </div>
            <Skeleton className="mt-4 h-9 w-14" />
            <Skeleton className="mt-3 h-3 w-28" />
          </div>
        ))}
      </div>

      <div className="grid gap-gutter sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-start gap-4 rounded-2xl bg-card p-6 ring-1 ring-border"
          >
            <Skeleton className="size-11 shrink-0 rounded-xl" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-gutter lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-gutter">
          <div className="rounded-2xl bg-card p-6 ring-1 ring-border">
            <div className="flex items-baseline justify-between">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-32" />
            </div>
            {/* Bars at varied heights — a flat row of equal blocks reads as
                broken rather than loading. */}
            <div className="mt-6 flex h-36 items-end gap-2">
              {[40, 65, 30, 80, 55, 45, 70, 35, 90, 50, 60, 75].map((h, i) => (
                <Skeleton
                  key={i}
                  className="flex-1 rounded-t-lg"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
            <div className="flex items-baseline justify-between p-6 pb-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-14" />
            </div>
            <div className="flex flex-col border-t border-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-4 border-b border-border px-6 py-4 last:border-0"
                >
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-card p-6 ring-1 ring-border">
          <Skeleton className="mb-6 h-4 w-28" />
          <div className="flex flex-col gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="mt-1.5 size-2 shrink-0 rounded-full" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
