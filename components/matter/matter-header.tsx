import { ArrowLeft, Building2, Tag } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  countLabel,
  formatDate,
  initials,
  matterStatusLabel,
  matterStatusTone,
  projectRoleLabel,
} from "@/lib/format";
import type { WorkspaceData } from "@/lib/matter-data";
import { cn } from "@/lib/utils";

/**
 * Project identity. Deliberately not a Card — this is a layered surface that
 * spans the workspace, so the panels below read as contents *of* the project
 * rather than siblings of it.
 */
function MatterHeader({
  matter,
  members,
  stats,
}: Pick<WorkspaceData, "matter" | "members" | "stats">) {
  const facts: { label: string; value: string; emphasis?: boolean }[] = [
    {
      label: "Documents",
      value:
        stats.readyDocumentCount === stats.documentCount
          ? String(stats.documentCount)
          : `${stats.readyDocumentCount} of ${stats.documentCount} ready`,
    },
    { label: "Passages indexed", value: stats.passageCount.toLocaleString() },
    { label: "AI answers", value: String(stats.interactionCount) },
    {
      label: "Awaiting review",
      value: String(stats.pendingReviewCount),
      emphasis: stats.pendingReviewCount > 0,
    },
  ];

  return (
    <header className="relative border-b bg-card">
      {/* Very low-contrast wash so the header reads as its own material
          without becoming a gradient feature. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,var(--accent)_0%,transparent_55%)] opacity-60"
      />

      <div className="relative px-5 pt-5 pb-0 sm:px-8">
        <Link
          href="/matters"
          className="inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <ArrowLeft className="size-3.5" />
          All projects
        </Link>

        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="font-serif text-[1.75rem] leading-tight font-semibold tracking-tight text-balance">
                {matter.title}
              </h1>
              <StatusBadge tone={matterStatusTone[matter.status]}>
                {matterStatusLabel[matter.status]}
              </StatusBadge>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="size-3.5 shrink-0" />
                <span className="font-medium text-foreground">
                  {matter.clientName}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Tag className="size-3.5 shrink-0" />
                {matter.practiceArea}
              </span>
              <span className="text-muted-foreground/80">
                Opened {formatDate(matter.createdAt)}
              </span>
            </div>

            {matter.description && (
              <p className="mt-3 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
                {matter.description}
              </p>
            )}
          </div>

          {members.length > 0 && (
            <div className="flex shrink-0 items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-medium text-muted-foreground">
                  {countLabel(members.length, "person", "people")} with access
                </p>
              </div>
              <div className="flex -space-x-1.5">
                {members.slice(0, 4).map((member) => (
                  <Tooltip key={member.id}>
                    <TooltipTrigger
                      render={
                        <span
                          className="flex size-7 items-center justify-center rounded-full bg-secondary text-[0.6875rem] font-semibold text-secondary-foreground ring-2 ring-card"
                          aria-label={`${member.name}, ${projectRoleLabel[member.role]}`}
                        >
                          {initials(member.name)}
                        </span>
                      }
                    />
                    <TooltipContent>
                      {member.name} ·{" "}
                      {projectRoleLabel[member.role]}
                    </TooltipContent>
                  </Tooltip>
                ))}
                {members.length > 4 && (
                  <span className="flex size-7 items-center justify-center rounded-full bg-muted text-[0.6875rem] font-semibold text-muted-foreground ring-2 ring-card">
                    +{members.length - 4}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Fact strip. Tabular figures so the numbers align as a row of
            measurements rather than drifting text. */}
        <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 border-t pt-4 pb-5">
          {facts.map((fact) => (
            <div key={fact.label} className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">{fact.label}</dt>
              <dd
                className={cn(
                  "text-lg leading-none font-semibold tabular-nums",
                  fact.emphasis ? "text-pending" : "text-foreground"
                )}
              >
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </header>
  );
}

export { MatterHeader };
