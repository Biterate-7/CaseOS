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
  AI_QUESTION_ASKED: { icon: Sparkles, tone: "text-primary bg-accent" },
  AI_ANSWER_APPROVED: {
    icon: Check,
    tone: "text-grounded bg-grounded-surface",
  },
  AI_ANSWER_REJECTED: { icon: X, tone: "text-rejected bg-rejected-surface" },
  DOCUMENT_UPLOADED: { icon: FileUp, tone: "text-muted-foreground bg-muted" },
  DOCUMENT_INGESTED: {
    icon: MessageSquareQuote,
    tone: "text-grounded bg-grounded-surface",
  },
  DOCUMENT_INGEST_FAILED: {
    icon: TriangleAlert,
    tone: "text-rejected bg-rejected-surface",
  },
  MATTER_CREATED: { icon: FolderPlus, tone: "text-muted-foreground bg-muted" },
};

const FALLBACK = { icon: ScrollText, tone: "text-muted-foreground bg-muted" };

/**
 * The audit trail as a timeline rather than a log dump.
 *
 * The old version printed `JSON.stringify(entry.detail)` straight to screen.
 * Here the detail is unpacked into readable key/value chips, so a partner can
 * actually read what happened without parsing JSON.
 */
function AuditTimeline({ entries }: { entries: WorkspaceAuditEntry[] }) {
  const reduceMotion = useReducedMotion();

  if (entries.length === 0) {
    return (
      <section aria-label="Audit trail" className="p-4 lg:p-5">
        <h2 className="mb-3 text-sm font-semibold">Audit trail</h2>
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
      className="mx-auto flex w-full max-w-2xl flex-col gap-3 p-4 lg:p-5"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">Audit trail</h2>
        <span className="text-xs text-muted-foreground">
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
              className="relative flex gap-3 pb-4 last:pb-0"
            >
              <span
                className={cn(
                  "z-1 mt-0.5 flex size-[1.375rem] shrink-0 items-center justify-center rounded-full ring-4 ring-card",
                  style.tone
                )}
              >
                <Icon className="size-3" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-xs leading-snug">
                  <span className="font-medium text-foreground">
                    {entry.actorName ?? "System"}
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

                {details.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {details.map(([key, value]) => (
                      <span
                        key={key}
                        className="inline-flex items-baseline gap-1 rounded border bg-muted/50 px-1.5 py-0.5 text-[0.625rem] text-muted-foreground"
                      >
                        <span className="opacity-70">{key}</span>
                        <span className="max-w-40 truncate font-medium text-foreground tabular-nums">
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
