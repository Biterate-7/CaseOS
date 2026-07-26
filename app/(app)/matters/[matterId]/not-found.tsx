import { FolderSearch } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Reached when `loadWorkspace` calls notFound() — either the project doesn't
 * exist, or it belongs to another workspace.
 *
 * The copy deliberately does not distinguish those two cases. Saying "this
 * project belongs to another workspace" would confirm that the id is real,
 * which leaks the existence of another tenant's data. Both paths look
 * identical from the outside, exactly as the firmId-scoped query intends.
 */
export default function ProjectNotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6">
      <div className="flex max-w-md flex-col items-center text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-surface-highest/70 text-muted-foreground ring-1 ring-border">
          <FolderSearch className="size-6" />
        </span>

        <h1 className="mt-5 font-display text-headline-sm text-foreground">
          Project not found
        </h1>
        <p className="mt-2.5 text-body-sm leading-relaxed text-pretty text-muted-foreground">
          This project doesn&apos;t exist, or it isn&apos;t part of your
          workspace.
        </p>

        <div className="mt-8">
          <Button nativeButton={false} render={<Link href="/matters" />}>
            View all projects
          </Button>
        </div>
      </div>
    </div>
  );
}
