import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  countLabel,
  formatAuditAction,
  formatPreciseDateTime,
  formatRelativeTime,
} from "@/lib/format";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

/**
 * The workspace entry point.
 *
 * This is deliberately not a metrics dashboard. Nobody opens an evidence
 * tool to learn how many documents they own; they open it to find out
 * whether anything is waiting on them. So the page answers exactly three
 * questions, in priority order:
 *
 *   1. Does anything need my judgment?   (the queue)
 *   2. Is anything broken?               (failed ingestion)
 *   3. Where was I?                      (recent projects)
 *
 * The stat tiles, quick-action cards, ingestion chart, and ambient hero
 * that used to live here were removed rather than restyled — each answered
 * a question nobody had, and six sections of equal visual weight meant the
 * one section that required action was indistinguishable from the rest.
 */
export default async function DashboardPage() {
  const user = await requireUser();
  const firmId = user.firmId;

  const [pendingReviews, pendingReviewCount, failedDocuments, recentProjects, auditEntries] =
    await Promise.all([
      db.aIInteraction.findMany({
        where: { matter: { firmId }, reviewStatus: "PENDING_REVIEW" },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          prompt: true,
          createdAt: true,
          user: { select: { name: true } },
          matter: { select: { id: true, title: true } },
        },
      }),
      db.aIInteraction.count({
        where: { matter: { firmId }, reviewStatus: "PENDING_REVIEW" },
      }),
      // A failed document silently cannot ground anything. It is pinned here
      // rather than logged, because a failure that scrolls away never gets
      // fixed.
      db.document.findMany({
        where: { matter: { firmId }, status: "FAILED" },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          matter: { select: { id: true, title: true } },
        },
      }),
      db.matter.findMany({
        where: { firmId },
        orderBy: { updatedAt: "desc" },
        take: 6,
        include: { _count: { select: { documents: true, aiInteractions: true } } },
      }),
      db.auditLog.findMany({
        where: { firmId },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { user: { select: { name: true } } },
      }),
    ]);

  const nothingWaiting = pendingReviewCount === 0 && failedDocuments.length === 0;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-12 px-margin-mobile py-10 lg:px-margin-desktop lg:py-14">
      {/* ---------- Masthead ---------- */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-display-md text-foreground">{user.firmName}</h1>
          <p className="mt-1.5 text-body-md text-muted-foreground">
            {nothingWaiting
              ? "Nothing is waiting on you."
              : [
                  pendingReviewCount > 0 &&
                    `${countLabel(pendingReviewCount, "answer")} awaiting your judgment`,
                  failedDocuments.length > 0 &&
                    `${countLabel(failedDocuments.length, "document")} failed to index`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/matters/new" />}>
          <Plus />
          New project
        </Button>
      </header>

      {/* ---------- Blocked: failures, pinned above everything ---------- */}
      {failedDocuments.length > 0 && (
        <section aria-label="Failed to index" className="flex flex-col gap-2">
          <h2 className="text-headline-xs text-rejected">Failed to index</h2>
          <ul className="overflow-hidden rounded-xl border border-rejected-border">
            {failedDocuments.map((doc, index) => (
              <li
                key={doc.id}
                className={index === 0 ? "" : "border-t border-rejected-border/60"}
              >
                <Link
                  href={`/matters/${doc.matter.id}?tab=documents`}
                  className="group flex items-center gap-4 bg-rejected-surface/50 px-5 py-3.5 outline-none transition-colors duration-[140ms] hover:bg-rejected-surface focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-label-md text-foreground">
                      {doc.title}
                    </span>
                    <span className="mt-0.5 block truncate text-body-sm text-muted-foreground">
                      {doc.matter.title} · cannot ground an answer until this is
                      resolved
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------- The queue ---------- */}
      <section id="awaiting-review" aria-label="Awaiting review" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-headline-xs text-foreground">
            Awaiting your judgment
          </h2>
          {pendingReviewCount > 0 && (
            <span className="text-meta-sm text-muted-foreground tabular-nums">
              {countLabel(pendingReviewCount, "answer")}
            </span>
          )}
        </div>

        {pendingReviews.length === 0 ? (
          <div className="rounded-xl bg-card ring-1 ring-border">
            <EmptyState
              size="sm"
              title="Nothing awaiting your judgment"
              description="Every answer across your projects has been approved or rejected."
            />
          </div>
        ) : (
          <ul className="flex flex-col rounded-xl bg-card ring-1 ring-border">
            {pendingReviews.map((item, index) => (
              <li key={item.id} className={index === 0 ? "" : "border-t border-border"}>
                <Link
                  href={`/matters/${item.matter.id}?tab=review#interaction-${item.id}`}
                  className="group flex items-start gap-4 px-5 py-4 outline-none transition-colors duration-[140ms] hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 block font-serif text-body-lg leading-snug text-foreground">
                      {item.prompt}
                    </span>
                    <span className="mt-1.5 block truncate text-body-sm text-muted-foreground">
                      {item.matter.title} · {item.user.name} ·{" "}
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </span>
                  <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-foreground" />
                </Link>
              </li>
            ))}
            {pendingReviewCount > pendingReviews.length && (
              <li className="border-t border-border px-5 py-3 text-body-sm text-muted-foreground tabular-nums">
                {pendingReviewCount - pendingReviews.length} more across your
                projects
              </li>
            )}
          </ul>
        )}
      </section>

      {/* ---------- Where you were ---------- */}
      <section aria-label="Recent projects" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-headline-xs text-foreground">Recent projects</h2>
          <Link
            href="/matters"
            className="rounded-sm text-meta-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            All projects
          </Link>
        </div>

        {recentProjects.length === 0 ? (
          <div className="rounded-xl bg-card ring-1 ring-border">
            <EmptyState
              title="No projects yet"
              description="A project holds a document collection and everything the AI derives from it."
              action={
                <Button nativeButton={false} render={<Link href="/matters/new" />}>
                  <Plus />
                  Create your first project
                </Button>
              }
            />
          </div>
        ) : (
          <ul className="flex flex-col rounded-xl bg-card ring-1 ring-border">
            {recentProjects.map((project, index) => (
              <li key={project.id} className={index === 0 ? "" : "border-t border-border"}>
                <Link
                  href={`/matters/${project.id}`}
                  className="group flex items-center gap-4 px-5 py-3.5 outline-none transition-colors duration-[140ms] hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-label-md text-foreground">
                      {project.title}
                    </span>
                    <span className="mt-0.5 block truncate text-body-sm text-muted-foreground tabular-nums">
                      {countLabel(project._count.documents, "document")} ·{" "}
                      {countLabel(project._count.aiInteractions, "answer")}
                    </span>
                  </span>
                  <span className="shrink-0 text-meta-sm text-muted-foreground tabular-nums">
                    {formatRelativeTime(project.updatedAt)}
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---------- The record ----------
          A ledger, not a timeline. No spine, no dots, no icons: the actor
          and verb are what a person scans for, so they get the ink and
          everything else recedes. */}
      {auditEntries.length > 0 && (
        <section aria-label="Recent activity" className="flex flex-col gap-2">
          <h2 className="text-headline-xs text-foreground">Activity</h2>
          <ul className="flex flex-col gap-1.5">
            {auditEntries.map((entry) => (
              <li key={entry.id} className="flex items-baseline gap-3 text-body-sm">
                <time
                  dateTime={entry.createdAt.toISOString()}
                  title={formatPreciseDateTime(entry.createdAt)}
                  className="w-24 shrink-0 text-muted-foreground tabular-nums"
                >
                  {formatRelativeTime(entry.createdAt)}
                </time>
                <span className="w-32 shrink-0 truncate text-muted-foreground">
                  {entry.user?.name ?? "System"}
                </span>
                <span className="min-w-0 flex-1 truncate text-foreground">
                  {formatAuditAction(entry.action)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
