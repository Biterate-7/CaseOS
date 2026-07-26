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
      <header className="border-b border-border bg-card/50 px-margin-mobile pt-6 lg:px-8">
        <Skeleton className="h-3 w-24" />
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <Skeleton className="h-9 w-80 max-w-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="mt-4 flex flex-wrap gap-5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4 border-t border-border pt-5 pb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-10" />
            </div>
          ))}
        </div>
      </header>

      <div className="flex items-start">
        {/* Documents rail */}
        <aside className="hidden w-72 shrink-0 border-r border-border bg-surface-lowest/30 p-5 xl:block 2xl:w-80">
          <div className="flex items-baseline justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="mt-4 h-28 w-full rounded-xl" />
          <div className="mt-4 flex flex-col gap-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-card p-4 ring-1 ring-border">
                <div className="flex gap-3">
                  <Skeleton className="size-9 shrink-0 rounded-lg" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Research column */}
        <div className="mx-auto w-full max-w-3xl flex-1 p-5 lg:p-8">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="mt-3 h-3 w-full max-w-md" />
          <Skeleton className="mt-6 h-36 w-full rounded-xl" />

          <div className="mt-6 flex flex-col gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-card p-6 ring-1 ring-border">
                <div className="flex items-start justify-between gap-3">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
                <Skeleton className="mt-3 h-3 w-48" />
                <SkeletonText lines={4} className="mt-5" />
                <Skeleton className="mt-5 h-10 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>

        {/* Sources rail */}
        <aside className="hidden w-80 shrink-0 border-l border-border bg-surface-lowest/30 p-5 xl:block 2xl:w-96">
          <div className="flex items-baseline justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="mt-4 h-14 w-full rounded-xl" />
          <div className="mt-4 flex flex-col gap-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-card p-4 ring-1 ring-border">
                <div className="flex gap-3">
                  <Skeleton className="size-6 shrink-0 rounded-md" />
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
