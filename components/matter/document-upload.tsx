"use client";

import { Loader2, Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import {
  finalizeDocumentUpload,
  prepareDocumentUpload,
} from "@/lib/actions/documents";
import { cn } from "@/lib/utils";

const ACCEPT = ".pdf,.txt,.md,application/pdf,text/plain,text/markdown";

/** Some browsers report an empty type for .md; fall back on the extension. */
function resolveMimeType(file: File): string {
  if (file.type) return file.type;
  if (/\.md$/i.test(file.name)) return "text/markdown";
  if (/\.txt$/i.test(file.name)) return "text/plain";
  if (/\.pdf$/i.test(file.name)) return "application/pdf";
  return "application/octet-stream";
}

type Phase = "idle" | "uploading" | "ingesting";

/**
 * Upload in two hops: request a scoped URL, PUT the bytes straight to
 * Supabase, then ask the server to ingest. The file never crosses the
 * serverless function, which cannot accept bodies above 4.5 MB.
 *
 * The two phases are shown separately because they fail for different reasons
 * and take very different amounts of time — transfer is fast and depends on
 * the network, ingestion is slow and depends on the document.
 */
function DocumentUpload({ matterId }: { matterId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const busy = phase !== "idle" || isPending;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || busy) return;
    const file = files[0];

    setError(null);
    setFileName(file.name);
    setPhase("uploading");

    try {
      const prepared = await prepareDocumentUpload(
        matterId,
        file.name,
        resolveMimeType(file),
        file.size
      );
      if (!prepared.ok) {
        setError(prepared.error);
        setPhase("idle");
        return;
      }

      const response = await fetch(prepared.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "content-type": resolveMimeType(file) },
      });
      if (!response.ok) {
        throw new Error(
          `Transfer failed (${response.status}). Please try again.`
        );
      }

      setPhase("ingesting");
      startTransition(async () => {
        const result = await finalizeDocumentUpload(prepared.documentId);
        if (!result.ok) setError(result.error);
        setPhase("idle");
        setFileName(null);
        formRef.current?.reset();
      });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Upload failed. Please retry."
      );
      setPhase("idle");
    }
  }

  return (
    <form ref={formRef} className="flex flex-col gap-2.5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-5 py-7 text-center",
          "transition-[border-color,background-color,box-shadow] duration-250 ease-(--ease-liquid)",
          dragging
            ? "border-primary bg-primary/8 shadow-[0_0_0_4px_var(--glow)]"
            : "border-border bg-surface-lowest/40 hover:border-primary/30 hover:bg-surface-lowest/70",
          busy && "pointer-events-none opacity-70"
        )}
      >
        <input
          type="file"
          name="file"
          accept={ACCEPT}
          disabled={busy}
          onChange={(e) => void handleFiles(e.target.files)}
          className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
          aria-label="Upload a source document"
        />

        {phase === "uploading" ? (
          <>
            <Loader2 className="size-5 animate-spin text-primary" />
            <p className="text-label-sm text-foreground">
              Transferring {fileName}
            </p>
            <p className="font-mono text-meta-xs leading-relaxed text-muted-foreground">
              Sending the file directly to secure storage.
            </p>
          </>
        ) : phase === "ingesting" ? (
          <>
            <Loader2 className="size-5 animate-spin text-primary" />
            <p className="text-label-sm text-foreground">
              Indexing {fileName}
            </p>
            <p className="font-mono text-meta-xs leading-relaxed text-muted-foreground">
              Extracting text, splitting into passages, and embedding. Long
              documents can take a minute.
            </p>
          </>
        ) : (
          <>
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/20">
              <Upload className="size-4" />
            </span>
            <p className="text-label-sm text-foreground">
              Drop a document, or click to browse
            </p>
            <p className="font-mono text-meta-xs text-muted-foreground">
              PDF, TXT, or Markdown · up to 20 MB
            </p>
          </>
        )}
      </div>

      {error && (
        <p role="alert" className="text-body-sm text-rejected">
          {error}
        </p>
      )}
    </form>
  );
}

export { DocumentUpload };
