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

import { IngestionChart } from "@/components/dashboard/ingestion-chart";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PulseMeter } from "@/components/ui/pulse-meter";
import { Reveal, RevealItem } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatCard } from "@/components/ui/stat-card";
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

  // The hero meter shows the real shape of the last seven weeks of ingestion,
  // normalised against the busiest week.
  const pulseValues = weeks.slice(-7).map((w) => w.count / peak);

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
      label: "AI insights",
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
    <div className="mx-auto flex max-w-(--container-page) flex-col gap-12 px-margin-mobile py-8 lg:px-margin-desktop lg:py-12">
      {/* ---------- Hero ---------- */}
      <section
        aria-label="Workspace overview"
        className="relative overflow-hidden rounded-3xl bg-card/40 p-8 shadow-2xl ring-1 ring-border backdrop-blur-3xl lg:p-12"
      >
        {/* Two soft lights inside the hero, so it reads as a lit surface rather
            than a flat panel. Purely decorative, no layout cost. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -left-24 size-96 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklch, var(--primary), transparent 88%), transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 bottom-0 size-80 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklch, var(--ai-context), transparent 90%), transparent 70%)",
          }}
        />

        <div className="relative flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 flex-col gap-5">
            <Eyebrow live={documentCount > 0}>Workspace overview</Eyebrow>

            <h1 className="max-w-2xl font-display text-headline-lg text-balance text-foreground lg:text-display-md">
              {user.firmName}
            </h1>

            <p className="max-w-md text-pretty text-body-md leading-relaxed text-muted-foreground">
              Upload documents, ask questions, and trace every answer back to
              its source.
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                variant="hero"
                nativeButton={false}
                render={<Link href="/matters/new" />}
              >
                <Plus />
                New project
              </Button>
              {entryProject && (
                <Button
                  size="lg"
                  variant="outline"
                  nativeButton={false}
                  render={<Link href={`/matters/${entryProject.id}`} />}
                >
                  <Sparkles />
                  Continue {entryProject.title}
                </Button>
              )}
            </div>
          </div>

          {/* Live ingestion panel. Only shown once there is real activity to
              report — an empty meter is decoration pretending to be data. */}
          {documentCount > 0 && (
            <div className="glass w-full shrink-0 rounded-2xl p-6 lg:w-64">
              <p className="font-mono text-meta-xs uppercase text-primary">
                Ingestion pulse
              </p>
              <PulseMeter values={pulseValues} className="mt-4" />
              <p className="mt-4 text-body-sm text-muted-foreground tabular-nums">
                {countLabel(processedRecently, "document")} in 12 weeks
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ---------- Stats ---------- */}
      <Reveal
        as="section"
        aria-label="Overview"
        className="grid gap-gutter sm:grid-cols-2 lg:grid-cols-4"
      >
        {overview.map((card) => (
          <RevealItem key={card.label}>
            <StatCard
              label={card.label}
              value={card.value}
              hint={card.hint}
              icon={card.icon}
              href={card.href}
              emphasis={card.emphasis}
            />
          </RevealItem>
        ))}
      </Reveal>

      {/* ---------- Quick actions ---------- */}
      <section aria-label="Quick actions">
        <Reveal className="grid gap-gutter sm:grid-cols-3">
          {quickActions.map((action) => (
            <RevealItem key={action.title}>
              <Link
                href={action.href}
                className="group flex h-full items-start gap-4 rounded-2xl bg-card p-6 ring-1 ring-border transition-[background-color,box-shadow,transform] duration-250 ease-(--ease-liquid) outline-none hover:-translate-y-0.5 hover:bg-surface hover:shadow-xl hover:ring-primary/25 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:hover:translate-y-0"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/20">
                  <action.icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-headline-xs text-foreground">
                    {action.title}
                  </span>
                  <span className="mt-1 block truncate text-body-sm text-muted-foreground">
                    {action.body}
                  </span>
                </span>
                <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform duration-250 group-hover:translate-x-1 group-hover:text-primary" />
              </Link>
            </RevealItem>
          ))}
        </Reveal>
      </section>

      {/* ---------- Work queue ----------
          The dashboard used to report a pending-review count that linked
          nowhere, so the only way to find the actual items was to open each
          project and look. Each row deep-links to the answer itself: the
          project, filtered to review, scrolled to that interaction. */}
      {pendingReviews.length > 0 && (
        <section
          id="awaiting-review"
          aria-label="Awaiting review"
          className="scroll-mt-24 overflow-hidden rounded-2xl bg-card ring-1 ring-pending-border"
        >
          <div className="flex items-baseline justify-between gap-3 border-b border-pending-border/60 bg-pending-surface/40 px-6 py-4">
            <h2 className="inline-flex items-center gap-2 font-display text-headline-xs text-pending">
              <ShieldQuestion className="size-4" />
              Awaiting your review
            </h2>
            <p className="font-mono text-meta-xs text-pending/90 tabular-nums">
              {countLabel(pendingReviewCount, "answer")}
            </p>
          </div>

          <ul className="flex flex-col">
            {pendingReviews.map((item) => (
              <li key={item.id} className="border-b border-border last:border-0">
                <Link
                  href={`/matters/${item.matter.id}?tab=review#interaction-${item.id}`}
                  className="group flex items-start justify-between gap-4 px-6 py-4 transition-colors duration-150 outline-none hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="min-w-0">
                    <span className="line-clamp-2 block text-body-sm leading-snug text-foreground">
                      {item.prompt}
                    </span>
                    <span className="mt-1.5 block truncate font-mono text-meta-xs text-muted-foreground">
                      {item.matter.title} · {item.user.name} ·{" "}
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </span>
                  <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-250 group-hover:translate-x-1 group-hover:text-primary" />
                </Link>
              </li>
            ))}
          </ul>

          {pendingReviewCount > pendingReviews.length && (
            <p className="border-t border-border px-6 py-3 font-mono text-meta-xs text-muted-foreground tabular-nums">
              {pendingReviewCount - pendingReviews.length} more awaiting review
              across your projects
            </p>
          )}
        </section>
      )}

      {/* ---------- Split: activity over time + recent work ---------- */}
      <div className="grid gap-gutter lg:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-gutter">
          <section
            aria-label="Documents processed over time"
            className="rounded-2xl bg-card p-6 ring-1 ring-border"
          >
            <SectionHeading
              title="Documents processed"
              action={
                <p className="font-mono text-meta-xs text-muted-foreground tabular-nums">
                  {countLabel(processedRecently, "document")} · 12 weeks
                </p>
              }
            />

            <div className="mt-6">
              {documentCount === 0 ? (
                <EmptyState
                  icon={FileStack}
                  size="sm"
                  title="No documents yet"
                  description="Upload a document and this chart starts tracking ingestion over time."
                />
              ) : (
                <IngestionChart weeks={weeks} peak={peak} />
              )}
            </div>
          </section>

          <section
            aria-label="Recent projects"
            className="overflow-hidden rounded-2xl bg-card ring-1 ring-border"
          >
            <div className="p-6 pb-4">
              <SectionHeading
                title="Recent projects"
                action={
                  <Link
                    href="/matters"
                    className="rounded-lg font-mono text-meta-xs uppercase text-primary transition-opacity duration-150 outline-none hover:opacity-70 focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    View all
                  </Link>
                }
              />
            </div>

            {recentProjects.length === 0 ? (
              <EmptyState
                icon={FolderOpen}
                title="No projects yet"
                description="A project holds a document collection and everything the AI derives from it."
                action={
                  <Button
                    nativeButton={false}
                    render={<Link href="/matters/new" />}
                  >
                    <Plus />
                    Create your first project
                  </Button>
                }
              />
            ) : (
              <div className="flex flex-col border-t border-border">
                {recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/matters/${project.id}`}
                    className="group flex items-center justify-between gap-4 border-b border-border px-6 py-4 transition-colors duration-150 outline-none last:border-0 hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-label-md text-foreground transition-colors group-hover:text-primary">
                        {project.title}
                      </p>
                      <p className="mt-1 truncate font-mono text-meta-xs text-muted-foreground tabular-nums">
                        {countLabel(project._count.documents, "document")} ·{" "}
                        {countLabel(project._count.aiInteractions, "insight")} ·{" "}
                        {formatRelativeTime(project.updatedAt)}
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
          className="h-fit rounded-2xl bg-card p-6 ring-1 ring-border lg:sticky lg:top-24"
        >
          <SectionHeading icon={ScrollText} title="Activity" />

          <div className="mt-6">
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
                  className="absolute top-2 bottom-2 left-[3.5px] w-px bg-border"
                />
                {auditEntries.map((entry, index) => (
                  <li
                    key={entry.id}
                    className="relative flex gap-4 pb-5 last:pb-0"
                  >
                    <span
                      className={cn(
                        "z-1 mt-1.5 size-2 shrink-0 rounded-full ring-4 ring-card",
                        index === 0 ? "bg-primary" : "bg-muted-foreground/40"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-body-sm leading-snug">
                        <span className="text-foreground">
                          {entry.user?.name ?? "System"}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          {formatAuditAction(entry.action)}
                        </span>
                      </p>
                      <time
                        dateTime={entry.createdAt.toISOString()}
                        title={formatPreciseDateTime(entry.createdAt)}
                        className="mt-1 block font-mono text-meta-xs text-muted-foreground/80"
                      >
                        {formatRelativeTime(entry.createdAt)}
                      </time>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
