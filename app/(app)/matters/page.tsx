import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  countLabel,
  formatRelativeTime,
  matterStatusLabel,
} from "@/lib/format";

export const metadata = { title: "Projects" };
export const dynamic = "force-dynamic";

export default async function MattersPage() {
  const user = await requireUser();
  const matters = await db.matter.findMany({
    where: { firmId: user.firmId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { documents: true, aiInteractions: true } },
    },
  });

  return (
    <div className="mx-auto flex max-w-(--container-page) flex-col gap-8 px-margin-mobile py-8 lg:px-margin-desktop lg:py-12">
      <PageHeader
        title="Projects"
        description="Every project is a boundary. Documents, AI answers, and activity history stay inside the one they belong to."
        meta={
          matters.length > 0 ? (
            <span className="text-meta-xs text-muted-foreground tabular-nums">
              {countLabel(matters.length, "project")}
            </span>
          ) : undefined
        }
        actions={
          <Button nativeButton={false} render={<Link href="/matters/new" />}>
            <Plus />
            New project
          </Button>
        }
      />

      {matters.length === 0 ? (
        <div className="rounded-xl bg-card ring-1 ring-border">
          <EmptyState
            title="No projects yet"
            description="A project holds a document collection and everything the AI derives from it. Create one to start uploading and asking questions."
            action={
              <Button nativeButton={false} render={<Link href="/matters/new" />}>
                <Plus />
                Create your first project
              </Button>
            }
          />
        </div>
      ) : (
        // A ledger, not a card grid — full-bleed rows separated by a single
        // hairline, distinguished from rest only by a tone shift on hover.
        // Nothing here lifts, scales, or casts a shadow: Apparatus's flat-leaf
        // law holds for list rows exactly as it does for panels.
        <ul className="flex flex-col rounded-xl bg-card ring-1 ring-border">
          {matters.map((matter, index) => (
            <li key={matter.id} className={index === 0 ? "" : "border-t border-border"}>
              <Link
                href={`/matters/${matter.id}`}
                className="group flex items-center gap-4 px-5 py-4 outline-none transition-colors duration-[140ms] ease-(--ease-standard) hover:bg-surface focus-visible:ring-3 focus-visible:-ring-offset-1 focus-visible:ring-ring/50 sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-3">
                    <h2 className="truncate font-display text-headline-xs text-foreground">
                      {matter.title}
                    </h2>
                    <span className="hidden shrink-0 text-body-sm text-muted-foreground sm:inline">
                      {matterStatusLabel[matter.status]}
                    </span>
                  </div>

                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-body-sm text-muted-foreground">
                    <span className="truncate">{matter.clientName}</span>
                    <span aria-hidden>·</span>
                    <span className="truncate">{matter.practiceArea}</span>
                    <span aria-hidden>·</span>
                    <span className="tabular-nums">
                      {countLabel(matter._count.documents, "document")}
                    </span>
                    <span aria-hidden>·</span>
                    <span className="tabular-nums">
                      {countLabel(matter._count.aiInteractions, "answer")}
                    </span>
                  </p>
                </div>

                <span className="shrink-0 text-meta-xs text-muted-foreground tabular-nums">
                  {formatRelativeTime(matter.updatedAt)}
                </span>

                <ArrowRight className="size-4 shrink-0 text-muted-foreground/60 transition-colors duration-[140ms] group-hover:text-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
