"use client";

import { ChevronRight, FileText } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";

import { StatusBadge } from "@/components/ui/status-badge";
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
 * ground an answer yet. The excerpt expands in place so a lawyer can confirm
 * the right file was ingested without leaving the workspace.
 */
function DocumentCard({ document }: { document: WorkspaceDocument }) {
  const [expanded, setExpanded] = useState(false);
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
        "group rounded-lg border bg-card transition-[border-color,box-shadow] duration-200 ease-(--ease-out-quart)",
        "hover:border-foreground/15 hover:shadow-sm",
        document.status === "FAILED" && "border-rejected-border/60"
      )}
    >
      <div className="flex items-start gap-3 p-3">
        <span
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border",
            document.status === "READY"
              ? "border-grounded-border bg-grounded-surface text-grounded"
              : document.status === "FAILED"
                ? "border-rejected-border bg-rejected-surface text-rejected"
                : "bg-muted text-muted-foreground"
          )}
        >
          <FileText className="size-4" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.8125rem] leading-snug font-medium">
            {document.title}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {document.fileName}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
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

            <span className="text-xs text-muted-foreground tabular-nums">
              {facts.join(" · ")}
            </span>
          </div>

          <p className="mt-1.5 text-xs text-muted-foreground/80">
            Added {formatRelativeTime(document.createdAt)}
          </p>
        </div>
      </div>

      {canExpand && (
        <>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="flex w-full items-center gap-1.5 border-t px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <ChevronRight
              className={cn(
                "size-3.5 transition-transform duration-200 ease-(--ease-out-quart)",
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
                <p className="border-t bg-muted/30 px-3 py-2.5 font-serif text-xs leading-relaxed text-muted-foreground">
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
