import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectsLoading() {
  return (
    <div className="mx-auto flex max-w-(--container-page) flex-col gap-10 px-margin-mobile py-8 lg:px-margin-desktop lg:py-12">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      <div className="grid gap-gutter md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-5 rounded-2xl bg-card p-6 ring-1 ring-border">
            <div className="flex items-start justify-between">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-3 w-14" />
            </div>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex gap-5 pt-2">
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-8 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
