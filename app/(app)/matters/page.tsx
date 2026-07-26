import { ArrowRight, FileStack, FolderOpen, Plus, Sparkles } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Reveal, RevealItem } from "@/components/ui/reveal";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  countLabel,
  formatRelativeTime,
  matterStatusLabel,
  matterStatusTone,
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
    <div className="mx-auto flex max-w-(--container-page) flex-col gap-10 px-margin-mobile py-8 lg:px-margin-desktop lg:py-12">
      <PageHeader
        title="Projects"
        description="Every project is a boundary. Documents, AI answers, and activity history stay inside the one they belong to."
        meta={
          matters.length > 0 ? (
            <span className="font-mono text-meta-xs text-muted-foreground tabular-nums">
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
        <div className="rounded-3xl bg-card/40 ring-1 ring-border backdrop-blur-3xl">
          <EmptyState
            icon={FolderOpen}
            title="No projects yet"
            description="A project holds a document collection and everything the AI derives from it. Create one to start uploading and asking questions."
            action={
              <Button
                size="lg"
                variant="hero"
                nativeButton={false}
                render={<Link href="/matters/new" />}
              >
                <Plus />
                Create your first project
              </Button>
            }
          />
        </div>
      ) : (
        <Reveal
          as="ul"
          className="grid gap-gutter md:grid-cols-2 xl:grid-cols-3"
        >
          {matters.map((matter) => (
            <RevealItem as="li" key={matter.id}>
              <Link
                href={`/matters/${matter.id}`}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-card p-6 ring-1 ring-border transition-[background-color,box-shadow,transform] duration-250 ease-(--ease-liquid) outline-none hover:-translate-y-0.5 hover:bg-surface hover:shadow-xl hover:ring-primary/25 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:hover:translate-y-0"
              >
                {/* Corner wash that only appears on hover — the card lighting up
                    from the direction the pointer came from. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/6 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />

                <div className="relative flex items-start justify-between gap-3">
                  <span className="rounded-full bg-surface-highest px-3 py-1 font-mono text-meta-xs uppercase text-muted-foreground ring-1 ring-border">
                    {matter.practiceArea}
                  </span>
                  <span className="shrink-0 font-mono text-meta-xs text-muted-foreground">
                    {formatRelativeTime(matter.updatedAt)}
                  </span>
                </div>

                <h2 className="relative mt-5 font-display text-headline-sm text-balance text-foreground transition-colors duration-150 group-hover:text-primary">
                  {matter.title}
                </h2>

                <p className="relative mt-1.5 font-mono text-meta-xs text-muted-foreground">
                  {matter.clientName}
                </p>

                {matter.description && (
                  <p className="relative mt-4 line-clamp-2 text-body-sm leading-relaxed text-muted-foreground">
                    {matter.description}
                  </p>
                )}

                <div className="relative mt-auto flex items-end justify-between gap-4 pt-6">
                  <div className="flex items-center gap-5">
                    <div className="flex flex-col gap-1">
                      <span className="flex items-center gap-1.5 font-mono text-meta-xs uppercase text-muted-foreground">
                        <FileStack className="size-3" />
                        Docs
                      </span>
                      <span className="text-label-md text-foreground tabular-nums">
                        {matter._count.documents}
                      </span>
                    </div>

                    <span aria-hidden className="h-8 w-px bg-border" />

                    <div className="flex flex-col gap-1">
                      <span className="flex items-center gap-1.5 font-mono text-meta-xs uppercase text-muted-foreground">
                        <Sparkles className="size-3" />
                        Insights
                      </span>
                      <span className="text-label-md text-foreground tabular-nums">
                        {matter._count.aiInteractions}
                      </span>
                    </div>
                  </div>

                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-highest text-muted-foreground transition-colors duration-150 group-hover:bg-primary group-hover:text-primary-foreground">
                    <ArrowRight className="size-4" />
                  </span>
                </div>

                <div className="relative mt-5 border-t border-border pt-4">
                  <StatusBadge size="sm" tone={matterStatusTone[matter.status]}>
                    {matterStatusLabel[matter.status]}
                  </StatusBadge>
                </div>
              </Link>
            </RevealItem>
          ))}
        </Reveal>
      )}
    </div>
  );
}
