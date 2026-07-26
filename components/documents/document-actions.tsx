"use client";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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

  function run(
    fn: () => Promise<{ ok: boolean; error?: string }>,
    close: () => void
  ) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.ok) close();
      else setError(result.error ?? "Something went wrong.");
    });
  }

  const otherProjects = projects.filter((p) => p.id !== doc.matterId);

  /** Inline error inside a dialog. */
  const errorNote = error ? (
    <p role="alert" className="text-body-sm text-rejected">
      {error}
    </p>
  ) : null;

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
        <p role="alert" className="mt-1 text-meta-xs text-rejected">
          {error}
        </p>
      )}

      {/* Rename */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename document</DialogTitle>
            <DialogDescription>
              This changes the display name only. The stored file and its
              indexed passages are untouched.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(
                () => renameDocument(doc.id, title),
                () => setRenameOpen(false)
              );
            }}
            className="flex flex-col gap-5"
          >
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label="Document name"
              autoFocus
              required
              maxLength={200}
            />
            {errorNote}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="animate-spin" />}
                {isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Move */}
      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to another project</DialogTitle>
            <DialogDescription>
              The document becomes searchable in the destination project and
              stops grounding answers in this one. Existing citations are
              unaffected.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!target) return;
              run(() => moveDocument(doc.id, target), () => setMoveOpen(false));
            }}
            className="flex flex-col gap-5"
          >
            <Select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              aria-label="Destination project"
              required
            >
              <option value="">Choose a project…</option>
              {otherProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
            {errorNote}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setMoveOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !target}>
                {isPending && <Loader2 className="animate-spin" />}
                {isPending ? "Moving…" : "Move document"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this document?</DialogTitle>
            <DialogDescription>
              &ldquo;{doc.title}&rdquo; and its {doc.chunkCount} indexed passage
              {doc.chunkCount === 1 ? "" : "s"} will be permanently removed.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5">
            <p className="flex items-start gap-2.5 rounded-xl border border-rejected-border bg-rejected-surface/60 px-4 py-3 text-body-sm leading-relaxed text-rejected">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                Any past AI answer that cited this document loses its link to
                the source and can no longer be verified. This cannot be undone.
              </span>
            </p>
            {errorNote}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={isPending}
                onClick={() =>
                  run(() => deleteDocument(doc.id), () => setDeleteOpen(false))
                }
              >
                {isPending && <Loader2 className="animate-spin" />}
                {isPending ? "Deleting…" : "Delete permanently"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export { DocumentActions };
