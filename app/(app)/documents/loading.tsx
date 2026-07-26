import { Skeleton } from "@/components/ui/skeleton";

export default function DocumentsLoading() {
  return (
    <div className="mx-auto flex max-w-(--container-page) flex-col gap-8 px-margin-mobile py-8 lg:px-margin-desktop lg:py-12">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-10 flex-1 min-w-48 rounded-xl" />
        <Skeleton className="h-10 w-28 rounded-xl" />
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      <Skeleton className="h-3 w-28" />

      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-xl bg-card p-5 ring-1 ring-border"
          >
            <Skeleton className="size-11 shrink-0 rounded-xl" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-64 max-w-full" />
              <Skeleton className="h-3 w-80 max-w-full" />
            </div>
            <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
            <Skeleton className="hidden h-8 w-32 shrink-0 rounded-lg sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
