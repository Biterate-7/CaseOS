import { Skeleton } from "@/components/ui/skeleton";

/**
 * Projects skeleton — a ledger, matching the real list. The card grid this
 * used to mirror no longer exists.
 */
export default function ProjectsLoading() {
  return (
    <div className="mx-auto flex max-w-(--container-page) flex-col gap-8 px-margin-mobile py-8 lg:px-margin-desktop lg:py-12">
      <div className="flex items-start justify-between gap-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-10 w-32 shrink-0 rounded-md" />
      </div>

      <div className="flex flex-col rounded-xl bg-card ring-1 ring-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-0 sm:px-6"
          >
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-3 w-72 max-w-full" />
            </div>
            <Skeleton className="h-3 w-14 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
