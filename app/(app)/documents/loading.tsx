import { Skeleton } from "@/components/ui/skeleton";

export default function DocumentsLoading() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <div className="mb-6 flex flex-col gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Skeleton className="h-8 flex-1 min-w-48" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-32" />
      </div>

      <Skeleton className="mb-3 h-3 w-28" />

      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-xs"
          >
            <Skeleton className="size-9 shrink-0 rounded-lg" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-64 max-w-full" />
              <Skeleton className="h-3 w-80 max-w-full" />
            </div>
            <Skeleton className="h-5 w-16 shrink-0 rounded-md" />
            <Skeleton className="hidden h-7 w-32 shrink-0 rounded-md sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
