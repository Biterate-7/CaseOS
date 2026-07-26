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
    <header className="relative border-b border-border bg-card/50 backdrop-blur-3xl">
      {/* A single soft light from the top-left, so the header reads as its own
          lit material without becoming a gradient feature. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at top left, color-mix(in oklch, var(--primary), transparent 92%) 0%, transparent 55%)",
        }}
      />

      <div className="relative px-margin-mobile pt-6 lg:px-8">
        <Link
          href="/matters"
          className="group inline-flex items-center gap-2 rounded-lg font-mono text-meta-xs uppercase text-muted-foreground transition-colors duration-150 outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ArrowLeft className="size-3.5 transition-transform duration-250 group-hover:-translate-x-1" />
          All projects
        </Link>

        <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <h1 className="font-display text-headline-md text-balance text-foreground">
                {matter.title}
              </h1>
              <StatusBadge tone={matterStatusTone[matter.status]}>
                {matterStatusLabel[matter.status]}
              </StatusBadge>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-meta-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Building2 className="size-3.5 shrink-0" />
                <span className="text-foreground">{matter.clientName}</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <Tag className="size-3.5 shrink-0" />
                {matter.practiceArea}
              </span>
              <span>Opened {formatDate(matter.createdAt)}</span>
            </div>

            {matter.description && (
              <p className="mt-4 max-w-2xl text-pretty text-body-sm leading-relaxed text-muted-foreground">
                {matter.description}
              </p>
            )}
          </div>

          {members.length > 0 && (
            <div className="flex shrink-0 items-center gap-3">
              <p className="font-mono text-meta-xs uppercase text-muted-foreground">
                {countLabel(members.length, "person", "people")}
              </p>
              <div className="flex -space-x-2">
                {members.slice(0, 4).map((member) => (
                  <Tooltip key={member.id}>
                    <TooltipTrigger
                      render={
                        <span
                          className="flex size-9 items-center justify-center rounded-full bg-surface-highest font-mono text-meta-xs text-foreground ring-2 ring-card"
                          aria-label={`${member.name}, ${projectRoleLabel[member.role]}`}
                        >
                          {initials(member.name)}
                        </span>
                      }
                    />
                    <TooltipContent>
                      {member.name} · {projectRoleLabel[member.role]}
                    </TooltipContent>
                  </Tooltip>
                ))}
                {members.length > 4 && (
                  <span className="flex size-9 items-center justify-center rounded-full bg-surface font-mono text-meta-xs text-muted-foreground ring-2 ring-card">
                    +{members.length - 4}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Fact strip. Tabular figures so the numbers align as a row of
            measurements rather than drifting text. */}
        <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4 border-t border-border pt-5 pb-6">
          {facts.map((fact) => (
            <div key={fact.label} className="flex flex-col gap-1.5">
              <dt className="font-mono text-meta-xs uppercase text-muted-foreground">
                {fact.label}
              </dt>
              <dd
                className={cn(
                  "font-display text-headline-sm leading-none tabular-nums",
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
