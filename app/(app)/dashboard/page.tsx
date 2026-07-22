import {
  ArrowRight,
  FileStack,
  FolderOpen,
  Plus,
  ScrollText,
  Search,
  ShieldQuestion,
  Sparkles,
  Upload,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Reveal, RevealItem } from "@/components/ui/reveal";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  countLabel,
  formatAuditAction,
  formatPreciseDateTime,
  formatRelativeTime,
  matterStatusLabel,
  matterStatusTone,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const WEEKS = 12;

/**
 * Buckets documents into weekly counts for the ingestion chart.
 *
 * Done in JS over a `createdAt`-only projection rather than a raw SQL
 * date_trunc: the row count is small, and it keeps the query typed.
 */
function bucketByWeek(dates: Date[], now = new Date()) {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  // Anchor to end of today so bucket edges don't drift during a session.
  const anchor = new Date(now);
  anchor.setHours(23, 59, 59, 999);

  const buckets = Array.from({ length: WEEKS }, (_, i) => ({
    end: new Date(anchor.getTime() - (WEEKS - 1 - i) * msPerWeek),
    count: 0,
  }));

  for (const date of dates) {
    const weeksAgo = Math.floor((anchor.getTime() - date.getTime()) / msPerWeek);
    const index = WEEKS - 1 - weeksAgo;
    if (index >= 0 && index < WEEKS) buckets[index].count++;
  }

  return buckets;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const firmId = user.firmId;

  const [
    documentCount,
    readyDocumentCount,
    activeProjects,
    totalProjects,
    insightCount,
    pendingReviewCount,
    recentProjects,
    auditEntries,
    documentDates,
    pendingReviews,
  ] = await Promise.all([
    db.document.count({ where: { matter: { firmId } } }),
    db.document.count({ where: { matter: { firmId }, status: "READY" } }),
    db.matter.count({ where: { firmId, status: "OPEN" } }),
    db.matter.count({ where: { firmId } }),
    db.aIInteraction.count({ where: { matter: { firmId } } }),
    db.aIInteraction.count({
      where: { matter: { firmId }, reviewStatus: "PENDING_REVIEW" },
    }),
    db.matter.findMany({
      where: { firmId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: {
        _count: { select: { documents: true, aiInteractions: true } },
      },
    }),
    db.auditLog.findMany({
      where: { firmId },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { name: true } } },
    }),
    db.document.findMany({
      where: { matter: { firmId } },
      select: { createdAt: true },
    }),
    // The actual items behind the "awaiting review" count. Scoped through
    // matter.firmId like every other query here, so another workspace's
    // pending work can never surface on this dashboard.
    db.aIInteraction.findMany({
      where: { matter: { firmId }, reviewStatus: "PENDING_REVIEW" },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        prompt: true,
        createdAt: true,
        user: { select: { name: true } },
        matter: { select: { id: true, title: true } },
      },
    }),
  ]);

  const weeks = bucketByWeek(documentDates.map((d) => d.createdAt));
  const peak = Math.max(1, ...weeks.map((w) => w.count));
  const processedRecently = weeks.reduce((sum, w) => sum + w.count, 0);

  // Quick actions need somewhere real to go. With no project yet, uploading
  // and asking are impossible, so those actions point at project creation
  // rather than a dead end.
  const entryProject = recentProjects[0];

  const overview = [
    {
      label: "Documents",
      value: documentCount,
      hint:
        documentCount === 0
          ? "Nothing uploaded yet"
          : `${readyDocumentCount} indexed and searchable`,
      icon: FileStack,
    },
    {
      label: "Active projects",
      value: activeProjects,
      hint:
        totalProjects === activeProjects
          ? countLabel(totalProjects, "project")
          : `${totalProjects} total`,
      icon: FolderOpen,
    },
    {
      label: "AI insights generated",
      value: insightCount,
      hint:
        insightCount === 0 ? "No questions asked yet" : "Answers with sources",
      icon: Sparkles,
    },
    {
      label: "Awaiting review",
      value: pendingReviewCount,
      hint: pendingReviewCount === 0 ? "Nothing pending" : "Needs a decision",
      icon: ShieldQuestion,
      emphasis: pendingReviewCount > 0,
      // Only actionable when there is something to act on; a link to an empty
      // section is worse than no link.
      href: pendingReviewCount > 0 ? "#awaiting-review" : undefined,
    },
  ];

  const quickActions = [
    entryProject
      ? {
          href: `/matters/${entryProject.id}`,
          icon: Upload,
          title: "Upload documents",
          body: `Add sources to ${entryProject.title}`,
        }
      : {
          href: "/matters/new",
          icon: Upload,
          title: "Upload documents",
          body: "Create a project to hold them",
        },
    {
      href: "/matters/new",
      icon: Plus,
      title: "Start new analysis",
      body: "A fresh project and document set",
    },
    entryProject
      ? {
          href: `/matters/${entryProject.id}`,
          icon: Search,
          title: "Ask AI",
          body: "Question your indexed documents",
        }
      : {
          href: "/matters/new",
          icon: Search,
          title: "Ask AI",
          body: "Upload sources first",
        },
  ];

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight">
            {user.firmName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload documents, ask questions, and trace every answer back to its
            source.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/matters/new" />}>
          <Plus className="size-4" />
          New project
        </Button>
      </header>

      <Reveal
        as="section"
        aria-label="Overview"
        className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        {overview.map((card) => (
          <RevealItem
            key={card.label}
            className={cn(
              "relative rounded-xl border bg-card p-4 shadow-xs transition-[box-shadow,border-color] duration-200 ease-(--ease-out-quart) hover:border-foreground/15 hover:shadow-sm",
              card.href && "hover:border-pending-border"
            )}
          >
            {/* Overlay link keeps the whole card clickable while the content
                below stays plain text — no nested interactive elements. */}
            {card.href && (
              <Link
                href={card.href}
                aria-label={`${card.value} ${card.label.toLowerCase()} — jump to the list`}
                className="absolute inset-0 z-1 rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              />
            )}
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                {card.label}
              </p>
              <card.icon className="size-3.5 text-muted-foreground/70" />
            </div>
            <p
              className={cn(
                "mt-2 text-3xl leading-none font-semibold tabular-nums",
                card.emphasis && "text-pending"
              )}
            >
              {card.value}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">{card.hint}</p>
          </RevealItem>
        ))}
      </Reveal>

      <section aria-label="Quick actions" className="mb-6">
        <Reveal className="grid gap-3 sm:grid-cols-3">
          {quickActions.map((action) => (
            <RevealItem key={action.title}>
              <Link
                href={action.href}
              className="group flex items-start gap-3 rounded-xl border bg-card p-4 shadow-xs transition-[box-shadow,transform,border-color] duration-200 ease-(--ease-out-quart) hover:-translate-y-px hover:border-foreground/15 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/50 text-primary">
                <action.icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{action.title}</span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {action.body}
                </span>
              </span>
                <ArrowRight className="mt-1 size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </RevealItem>
          ))}
        </Reveal>
      </section>

      {/* Work queue. Previously the dashboard reported a pending-review count
          that linked nowhere, so the only way to find the actual items was to
          open each project and look. Each row deep-links to the answer itself:
          the project, filtered to review, scrolled to that interaction. */}
      {pendingReviews.length > 0 && (
        <section
          id="awaiting-review"
          aria-label="Awaiting review"
          className="mb-6 scroll-mt-6 overflow-hidden rounded-xl border border-pending-border bg-card shadow-xs"
        >
          <div className="flex items-baseline justify-between gap-3 border-b border-pending-border/60 bg-pending-surface/40 px-5 py-3">
            <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold text-pending">
              <ShieldQuestion className="size-4" />
              Awaiting your review
            </h2>
            <p className="text-xs text-pending/90 tabular-nums">
              {countLabel(pendingReviewCount, "answer")}
            </p>
          </div>

          <ul className="flex flex-col">
            {pendingReviews.map((item) => (
              <li key={item.id} className="border-b last:border-0">
                <Link
                  href={`/matters/${item.matter.id}?tab=review#interaction-${item.id}`}
                  className="group flex items-start justify-between gap-4 px-5 py-3 transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <span className="min-w-0">
                    <span className="line-clamp-2 block font-serif text-sm leading-snug text-foreground">
                      {item.prompt}
                    </span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {item.matter.title} · {item.user.name} ·{" "}
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </span>
                  <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>

          {pendingReviewCount > pendingReviews.length && (
            <p className="border-t px-5 py-2.5 text-xs text-muted-foreground tabular-nums">
              {pendingReviewCount - pendingReviews.length} more awaiting review
              across your projects
            </p>
          )}
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section
            aria-label="Documents processed over time"
            className="rounded-xl border bg-card p-5 shadow-xs"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold">Documents processed</h2>
              <p className="text-xs text-muted-foreground tabular-nums">
                {countLabel(processedRecently, "document")} · last 12 weeks
              </p>
            </div>

            {documentCount === 0 ? (
              <EmptyState
                icon={FileStack}
                size="sm"
                title="No documents yet"
                description="Upload a document and this chart starts tracking ingestion over time."
              />
            ) : (
              <div className="mt-5 flex h-28 items-end gap-1.5">
                {weeks.map((week, i) => {
                  const label = `Week ending ${week.end.toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric" }
                  )}: ${countLabel(week.count, "document")}`;
                  return (
                    <div
                      key={i}
                      title={label}
                      aria-label={label}
                      className="group flex h-full flex-1 flex-col justify-end"
                    >
                      <div
                        className={cn(
                          "w-full rounded-sm transition-colors duration-150",
                          week.count > 0
                            ? "bg-primary/80 group-hover:bg-primary"
                            : "bg-muted"
                        )}
                        style={{
                          height:
                            week.count > 0
                              ? `${Math.max((week.count / peak) * 100, 6)}%`
                              : "2px",
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section
            aria-label="Recent projects"
            className="rounded-xl border bg-card shadow-xs"
          >
            <div className="flex items-baseline justify-between gap-3 p-5 pb-3">
              <h2 className="text-sm font-semibold">Recent projects</h2>
              <Link
                href="/matters"
                className="rounded text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                View all
              </Link>
            </div>

            {recentProjects.length === 0 ? (
              <EmptyState
                icon={FolderOpen}
                title="No projects yet"
                description="A project holds a document collection and everything the AI derives from it."
                action={
                  <Button
                    size="sm"
                    nativeButton={false}
                    render={<Link href="/matters/new" />}
                  >
                    Create your first project
                  </Button>
                }
              />
            ) : (
              <div className="flex flex-col border-t">
                {recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/matters/${project.id}`}
                    className="flex items-center justify-between gap-4 border-b px-5 py-3 transition-colors last:border-0 hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {project.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
                        {countLabel(project._count.documents, "document")} ·{" "}
                        {countLabel(project._count.aiInteractions, "insight")} ·
                        updated {formatRelativeTime(project.updatedAt)}
                      </p>
                    </div>
                    <StatusBadge
                      size="sm"
                      tone={matterStatusTone[project.status]}
                      className="shrink-0"
                    >
                      {matterStatusLabel[project.status]}
                    </StatusBadge>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <section
          aria-label="Recent activity"
          className="rounded-xl border bg-card p-5 shadow-xs lg:sticky lg:top-4 lg:self-start"
        >
          <h2 className="mb-4 text-sm font-semibold">Recent activity</h2>

          {auditEntries.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              size="sm"
              title="Nothing recorded yet"
              description="Uploads, questions, and review decisions are permanently logged here."
            />
          ) : (
            <ol className="relative flex flex-col">
              <span
                aria-hidden
                className="absolute top-2 bottom-2 left-[3px] w-px bg-border"
              />
              {auditEntries.map((entry) => (
                <li
                  key={entry.id}
                  className="relative flex gap-3 pb-4 last:pb-0"
                >
                  <span className="z-1 mt-1.5 size-[7px] shrink-0 rounded-full bg-muted-foreground/40 ring-4 ring-card" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-snug">
                      <span className="font-medium">
                        {entry.user?.name ?? "System"}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {formatAuditAction(entry.action)}
                      </span>
                    </p>
                    <time
                      dateTime={entry.createdAt.toISOString()}
                      title={formatPreciseDateTime(entry.createdAt)}
                      className="mt-0.5 block text-[0.6875rem] text-muted-foreground/80"
                    >
                      {formatRelativeTime(entry.createdAt)}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
