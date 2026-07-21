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
        <span className="flex size-11 items-center justify-center rounded-xl border bg-muted/50 text-muted-foreground">
          <FolderSearch className="size-5" />
        </span>

        <h1 className="mt-4 font-serif text-xl font-semibold tracking-tight">
          Project not found
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground">
          This project doesn&apos;t exist, or it isn&apos;t part of your
          workspace.
        </p>

        <div className="mt-6">
          <Button nativeButton={false} render={<Link href="/matters" />}>
            View all projects
          </Button>
        </div>
      </div>
    </div>
  );
}
