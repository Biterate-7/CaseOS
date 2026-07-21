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
    <form ref={formRef} className="flex flex-col gap-2">
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
          "relative flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-4 py-5 text-center",
          "transition-[border-color,background-color] duration-200 ease-(--ease-out-quart)",
          dragging
            ? "border-primary bg-accent"
            : "border-border bg-muted/30 hover:border-foreground/20 hover:bg-muted/50",
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
            <Loader2 className="size-4 animate-spin text-primary" />
            <p className="text-xs font-medium">Transferring {fileName}</p>
            <p className="text-[0.6875rem] leading-relaxed text-muted-foreground">
              Sending the file directly to secure storage.
            </p>
          </>
        ) : phase === "ingesting" ? (
          <>
            <Loader2 className="size-4 animate-spin text-primary" />
            <p className="text-xs font-medium">Indexing {fileName}</p>
            <p className="text-[0.6875rem] leading-relaxed text-muted-foreground">
              Extracting text, splitting into passages, and embedding. Long
              documents can take a minute.
            </p>
          </>
        ) : (
          <>
            <Upload className="size-4 text-muted-foreground" />
            <p className="text-xs font-medium">
              Drop a document, or click to browse
            </p>
            <p className="text-[0.6875rem] text-muted-foreground">
              PDF, TXT, or Markdown · up to 20 MB
            </p>
          </>
        )}
      </div>

      {error && (
        <p role="alert" className="text-xs text-rejected">
          {error}
        </p>
      )}
    </form>
  );
}

export { DocumentUpload };
