"use client";

import {
  ChevronRight,
  FileText,
  Loader2,
  RotateCw,
  TriangleAlert,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { retryDocumentIngestion } from "@/lib/actions/documents";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  documentStatusHint,
  documentStatusLabel,
  documentStatusTone,
  formatBytes,
  formatRelativeTime,
} from "@/lib/format";
import type { WorkspaceDocument } from "@/lib/matter-data";
import { cn } from "@/lib/utils";

/**
 * A document as an intelligence unit rather than a filename: how many pages it
 * holds, how many retrievable passages it contributes, and whether it can
 * ground an answer yet. The excerpt expands in place so an analyst can confirm
 * the right file was ingested without leaving the workspace.
 */
function DocumentCard({ document }: { document: WorkspaceDocument }) {
  const [expanded, setExpanded] = useState(false);
  const [retrying, startRetry] = useTransition();
  const [retryError, setRetryError] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const canExpand = document.excerpt != null;

  const facts = [
    document.pageCount != null
      ? `${document.pageCount} ${document.pageCount === 1 ? "page" : "pages"}`
      : null,
    document.chunkCount > 0
      ? `${document.chunkCount} ${document.chunkCount === 1 ? "passage" : "passages"}`
      : null,
    formatBytes(document.sizeBytes),
  ].filter(Boolean) as string[];

  return (
    <div
      className={cn(
        "group overflow-hidden rounded-xl bg-card ring-1 transition-[box-shadow,--tw-ring-color] duration-250 ease-(--ease-liquid)",
        "hover:shadow-md",
        document.status === "FAILED"
          ? "ring-rejected-border/60"
          : "ring-border hover:ring-primary/20"
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <span
          className={cn(
            "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg ring-1",
            document.status === "READY"
              ? "bg-grounded-surface text-grounded ring-grounded-border"
              : document.status === "FAILED"
                ? "bg-rejected-surface text-rejected ring-rejected-border"
                : "bg-surface-highest text-muted-foreground ring-border"
          )}
        >
          <FileText className="size-4" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-label-sm text-foreground">
            {document.title}
          </p>
          <p className="mt-0.5 truncate font-mono text-meta-xs text-muted-foreground">
            {document.fileName}
          </p>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <Tooltip>
              <TooltipTrigger
                render={
                  <StatusBadge
                    size="sm"
                    tone={documentStatusTone[document.status]}
                    pulse={document.status === "PROCESSING"}
                  >
                    {documentStatusLabel[document.status]}
                  </StatusBadge>
                }
              />
              <TooltipContent>
                {documentStatusHint[document.status]}
              </TooltipContent>
            </Tooltip>

            <span className="font-mono text-meta-xs text-muted-foreground tabular-nums">
              {facts.join(" · ")}
            </span>
          </div>

          <p className="mt-2 font-mono text-meta-xs text-muted-foreground/80">
            Added {formatRelativeTime(document.createdAt)}
          </p>
        </div>
      </div>

      {/* Ingestion is the gate on whether this document can ground anything,
          so the two states that block it say so in words, not just colour. */}
      {document.status === "PROCESSING" && (
        <div className="border-t border-border px-4 py-3">
          <div
            role="progressbar"
            aria-label="Ingesting document"
            className="h-1 w-full overflow-hidden rounded-full bg-pending-surface"
          >
            <motion.div
              className="h-full w-1/3 rounded-full bg-pending shadow-[0_0_8px_var(--pending)]"
              animate={reduceMotion ? undefined : { x: ["-100%", "300%"] }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>
          <p className="mt-2 font-mono text-meta-xs text-muted-foreground">
            Extracting and embedding — not yet searchable.
          </p>
        </div>
      )}

      {document.status === "FAILED" && (
        <div className="flex flex-col gap-2.5 border-t border-rejected-border/60 bg-rejected-surface/50 px-4 py-3">
          <p className="flex items-start gap-2 text-meta-xs leading-relaxed text-rejected">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Ingestion didn&apos;t finish. This can be a scan with no text
              layer, or an interrupted upload. Retry, or re-upload a
              text-based copy.
            </span>
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="outline"
              disabled={retrying}
              onClick={() =>
                startRetry(async () => {
                  setRetryError(null);
                  const result = await retryDocumentIngestion(document.id);
                  if (!result.ok) setRetryError(result.error);
                })
              }
            >
              {retrying ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  Retrying…
                </>
              ) : (
                <>
                  <RotateCw className="size-3" />
                  Retry
                </>
              )}
            </Button>
            {retryError && (
              <span className="font-mono text-meta-xs text-rejected">
                {retryError}
              </span>
            )}
          </div>
        </div>
      )}

      {canExpand && (
        <>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 font-mono text-meta-xs text-muted-foreground transition-colors duration-150 outline-none hover:bg-surface-highest/50 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ChevronRight
              className={cn(
                "size-3.5 transition-transform duration-250 ease-(--ease-liquid)",
                expanded && "rotate-90"
              )}
            />
            {expanded ? "Hide opening passage" : "Show opening passage"}
          </button>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
                className="overflow-hidden"
              >
                <p className="glass-well border-t border-border px-4 py-3 text-body-sm leading-relaxed text-muted-foreground">
                  {document.excerpt}
                  {document.excerpt && document.excerpt.length >= 600 && "…"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

export { DocumentCard };
