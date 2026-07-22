"use client";

import { Dialog } from "@base-ui/react/dialog";
import {
  Download,
  ExternalLink,
  FolderInput,
  Loader2,
  Pencil,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  deleteDocument,
  getDocumentUrl,
  moveDocument,
  renameDocument,
} from "@/lib/actions/document-library";
import type { IndexedDocument } from "@/lib/documents-shared";
import { cn } from "@/lib/utils";

/** Shared shell so the three dialogs look and animate identically. */
function ActionDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn(
            "fixed inset-0 z-50 bg-foreground/25 backdrop-blur-[2px]",
            "transition-opacity duration-200 ease-(--ease-out-quart)",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"
          )}
        />
        <Dialog.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2",
            "rounded-xl border bg-card p-5 shadow-xl outline-none",
            "transition-[transform,opacity] duration-200 ease-(--ease-out-quart)",
            "data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
            "data-[ending-style]:scale-95 data-[ending-style]:opacity-0"
          )}
        >
          <Dialog.Title className="font-serif text-base font-semibold">
            {title}
          </Dialog.Title>
          {description && (
            <Dialog.Description className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {description}
            </Dialog.Description>
          )}
          <div className="mt-4">{children}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DocumentActions({
  document: doc,
  projects,
  canDelete,
}: {
  document: IndexedDocument;
  projects: { id: string; title: string }[];
  /** Server re-checks this; the flag only avoids showing a button that will fail. */
  canDelete: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"open" | "download" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [renameOpen, setRenameOpen] = useState(false);
  const [title, setTitle] = useState(doc.title);
  const [moveOpen, setMoveOpen] = useState(false);
  const [target, setTarget] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  /**
   * The bucket is private, so both open and download go through a signed URL
   * minted server-side. Download uses a temporary anchor with `download` so
   * the file saves rather than replacing the current tab.
   */
  async function withUrl(mode: "open" | "download") {
    setError(null);
    setBusy(mode);
    try {
      const result = await getDocumentUrl(doc.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (mode === "open") {
        window.open(result.data.url, "_blank", "noopener,noreferrer");
      } else {
        const anchor = window.document.createElement("a");
        anchor.href = result.data.url;
        anchor.download = result.data.fileName;
        window.document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      }
    } catch {
      setError("Could not reach storage. Try again.");
    } finally {
      setBusy(null);
    }
  }

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, close: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.ok) close();
      else setError(result.error ?? "Something went wrong.");
    });
  }

  const otherProjects = projects.filter((p) => p.id !== doc.matterId);

  return (
    <>
      <div className="flex shrink-0 items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Open ${doc.title}`}
                disabled={busy !== null}
                onClick={() => withUrl("open")}
              >
                {busy === "open" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <ExternalLink />
                )}
              </Button>
            }
          />
          <TooltipContent>Open</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Download ${doc.title}`}
                disabled={busy !== null}
                onClick={() => withUrl("download")}
              >
                {busy === "download" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Download />
                )}
              </Button>
            }
          />
          <TooltipContent>Download</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Rename ${doc.title}`}
                onClick={() => {
                  setTitle(doc.title);
                  setRenameOpen(true);
                }}
              >
                <Pencil />
              </Button>
            }
          />
          <TooltipContent>Rename</TooltipContent>
        </Tooltip>

        {otherProjects.length > 0 && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Move ${doc.title} to another project`}
                  onClick={() => {
                    setTarget("");
                    setMoveOpen(true);
                  }}
                >
                  <FolderInput />
                </Button>
              }
            />
            <TooltipContent>Move to project</TooltipContent>
          </Tooltip>
        )}

        {canDelete && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete ${doc.title}`}
                  onClick={() => setDeleteOpen(true)}
                  className="text-muted-foreground hover:text-rejected"
                >
                  <Trash2 />
                </Button>
              }
            />
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        )}
      </div>

      {error && !renameOpen && !moveOpen && !deleteOpen && (
        <p role="alert" className="mt-1 text-[0.6875rem] text-rejected">
          {error}
        </p>
      )}

      {/* Rename */}
      <ActionDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title="Rename document"
        description="This changes the display name only. The stored file and its indexed passages are untouched."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => renameDocument(doc.id, title), () => setRenameOpen(false));
          }}
          className="flex flex-col gap-3"
        >
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Document name"
            autoFocus
            required
            maxLength={200}
          />
          {error && (
            <p role="alert" className="text-xs text-rejected">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRenameOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </ActionDialog>

      {/* Move */}
      <ActionDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        title="Move to another project"
        description="The document becomes searchable in the destination project and stops grounding answers in this one. Existing citations are unaffected."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!target) return;
            run(() => moveDocument(doc.id, target), () => setMoveOpen(false));
          }}
          className="flex flex-col gap-3"
        >
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            aria-label="Destination project"
            required
            className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">Choose a project…</option>
            {otherProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          {error && (
            <p role="alert" className="text-xs text-rejected">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMoveOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending || !target}>
              {isPending ? "Moving…" : "Move document"}
            </Button>
          </div>
        </form>
      </ActionDialog>

      {/* Delete */}
      <ActionDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this document?"
        description={`"${doc.title}" and its ${doc.chunkCount} indexed passage${doc.chunkCount === 1 ? "" : "s"} will be permanently removed.`}
      >
        <div className="flex flex-col gap-3">
          <p className="flex items-start gap-1.5 rounded-lg border border-rejected-border bg-rejected-surface/60 px-3 py-2 text-xs leading-relaxed text-rejected">
            <TriangleAlert className="mt-px size-3.5 shrink-0" />
            <span>
              Any past AI answer that cited this document loses its link to the
              source and can no longer be verified. This cannot be undone.
            </span>
          </p>
          {error && (
            <p role="alert" className="text-xs text-rejected">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={() =>
                run(() => deleteDocument(doc.id), () => setDeleteOpen(false))
              }
            >
              {isPending ? "Deleting…" : "Delete permanently"}
            </Button>
          </div>
        </div>
      </ActionDialog>
    </>
  );
}

export { DocumentActions };
