"use client";

import {
  Check,
  FileUp,
  FolderPlus,
  MessageSquareQuote,
  ScrollText,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { EmptyState } from "@/components/ui/empty-state";
import {
  formatAuditAction,
  formatPreciseDateTime,
  formatRelativeTime,
} from "@/lib/format";
import type { WorkspaceAuditEntry } from "@/lib/matter-data";
import { cn } from "@/lib/utils";

/** Icon + tone per audit action, so the trail is scannable by shape. */
const ACTION_STYLE: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  AI_QUESTION_ASKED: { icon: Sparkles, tone: "text-primary bg-primary/12" },
  AI_ANSWER_APPROVED: {
    icon: Check,
    tone: "text-grounded bg-grounded-surface",
  },
  AI_ANSWER_REJECTED: { icon: X, tone: "text-rejected bg-rejected-surface" },
  DOCUMENT_UPLOADED: { icon: FileUp, tone: "text-muted-foreground bg-surface-highest" },
  DOCUMENT_INGESTED: {
    icon: MessageSquareQuote,
    tone: "text-grounded bg-grounded-surface",
  },
  DOCUMENT_INGEST_FAILED: {
    icon: TriangleAlert,
    tone: "text-rejected bg-rejected-surface",
  },
  MATTER_CREATED: { icon: FolderPlus, tone: "text-muted-foreground bg-surface-highest" },
};

const FALLBACK = {
  icon: ScrollText,
  tone: "text-muted-foreground bg-surface-highest",
};

/**
 * The audit trail as a timeline rather than a log dump.
 *
 * The old version printed `JSON.stringify(entry.detail)` straight to screen.
 * Here the detail is unpacked into readable key/value chips, so a partner can
 * actually read what happened without parsing JSON.
 */
function AuditTimeline({
  entries,
  loadError = false,
}: {
  entries: WorkspaceAuditEntry[];
  /** True when the audit trail failed to load — the rest of the page is fine. */
  loadError?: boolean;
}) {
  const reduceMotion = useReducedMotion();

  if (loadError) {
    return (
      <section aria-label="Audit trail" className="p-4 lg:p-5">
        <h2 className="mb-4 font-display text-headline-sm text-foreground">
          Audit trail
        </h2>
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-rejected-border bg-rejected-surface/50 px-4 py-3.5 text-body-sm leading-relaxed text-rejected"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          The activity record couldn&apos;t be loaded just now. Nothing was lost
          — reload the page to try again.
        </div>
      </section>
    );
  }

  if (entries.length === 0) {
    return (
      <section aria-label="Audit trail" className="p-4 lg:p-5">
        <h2 className="mb-4 font-display text-headline-sm text-foreground">
          Audit trail
        </h2>
        <EmptyState
          icon={ScrollText}
          size="sm"
          title="No activity yet"
          description="Every upload, question, and review decision on this project will be recorded here permanently."
        />
      </section>
    );
  }

  return (
    <section
      aria-label="Audit trail"
      className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-5 lg:p-8"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2.5 font-display text-headline-sm text-foreground">
          <ScrollText className="size-5 text-primary" />
          Audit trail
        </h2>
        <span className="font-mono text-meta-xs uppercase text-muted-foreground">
          Permanent record
        </span>
      </div>

      <ol className="relative flex flex-col">
        {/* Spine. Inset to pass through the centre of each marker. */}
        <span
          aria-hidden
          className="absolute top-2 bottom-2 left-[0.6875rem] w-px bg-border"
        />

        {entries.map((entry, index) => {
          const style = ACTION_STYLE[entry.action] ?? FALLBACK;
          const Icon = style.icon;
          const details = entry.detail ? Object.entries(entry.detail) : [];

          return (
            <motion.li
              key={entry.id}
              initial={reduceMotion ? false : { opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.24,
                delay: reduceMotion ? 0 : Math.min(index, 8) * 0.03,
                ease: [0.25, 1, 0.5, 1],
              }}
              className="relative flex gap-4 pb-5 last:pb-0"
            >
              <span
                className={cn(
                  "z-1 mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ring-4 ring-card",
                  style.tone
                )}
              >
                <Icon className="size-3.5" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-body-sm leading-snug">
                  <span className="text-foreground">
                    {entry.actorName ?? "System"}
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

                {details.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {details.map(([key, value]) => (
                      <span
                        key={key}
                        className="inline-flex items-baseline gap-1.5 rounded-md bg-surface-highest/70 px-2 py-1 font-mono text-meta-xs text-muted-foreground ring-1 ring-border"
                      >
                        <span className="opacity-70">{key}</span>
                        <span className="max-w-40 truncate text-foreground tabular-nums">
                          {typeof value === "object"
                            ? JSON.stringify(value)
                            : String(value)}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.li>
          );
        })}
      </ol>
    </section>
  );
}

export { AuditTimeline };
