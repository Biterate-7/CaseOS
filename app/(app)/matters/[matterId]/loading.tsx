import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/**
 * Workspace skeleton. The slowest route in the app — it loads the project,
 * its documents, two chunk aggregates, every interaction with its citations,
 * and the audit trail — so this is the placeholder users see most.
 *
 * Mirrors the three-column layout above xl and the single column below it, so
 * the skeleton doesn't reflow into a different shape than the content.
 */
export default function WorkspaceLoading() {
  return (
    <div className="flex min-h-full flex-col">
      {/* Project header */}
      <header className="border-b bg-card px-5 pt-5 sm:px-8">
        <Skeleton className="h-3 w-24" />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Skeleton className="h-8 w-80 max-w-full" />
          <Skeleton className="h-6 w-16 rounded-md" />
        </div>
        <div className="mt-3 flex flex-wrap gap-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3 border-t pt-4 pb-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-10" />
            </div>
          ))}
        </div>
      </header>

      <div className="flex items-start">
        {/* Documents rail */}
        <aside className="hidden w-72 shrink-0 border-r bg-sidebar/40 p-5 xl:block 2xl:w-80">
          <div className="flex items-baseline justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="mt-3 h-24 w-full rounded-lg" />
          <div className="mt-3 flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border bg-card p-3">
                <div className="flex gap-3">
                  <Skeleton className="size-8 shrink-0 rounded-md" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-5 w-20 rounded-md" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Research column */}
        <div className="mx-auto w-full max-w-2xl flex-1 p-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-2 h-3 w-full max-w-md" />
          <Skeleton className="mt-4 h-28 w-full rounded-xl" />

          <div className="mt-4 flex flex-col gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-5 w-24 rounded-md" />
                </div>
                <Skeleton className="mt-2 h-3 w-48" />
                <SkeletonText lines={4} className="mt-4" />
                <Skeleton className="mt-4 h-9 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>

        {/* Sources rail */}
        <aside className="hidden w-80 shrink-0 border-l bg-sidebar/40 p-5 xl:block 2xl:w-96">
          <div className="flex items-baseline justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="mt-3 h-12 w-full rounded-md" />
          <div className="mt-3 flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border bg-card p-3">
                <div className="flex gap-2.5">
                  <Skeleton className="size-5 shrink-0 rounded" />
                  <div className="flex flex-1 flex-col gap-2">
                    <SkeletonText lines={2} />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
