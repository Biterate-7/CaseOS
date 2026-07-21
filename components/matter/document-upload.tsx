"use client";

import { Loader2, Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { cn } from "@/lib/utils";
import { uploadDocument } from "@/lib/actions/documents";

const ACCEPT = ".pdf,.txt,.md,application/pdf,text/plain,text/markdown";

/**
 * Drop target for source documents. Submits through the existing
 * `uploadDocument` server action untouched — the drag affordance is purely a
 * nicer way to populate the same file input.
 *
 * Ingestion is slow (extract, chunk, embed), so the pending state names the
 * stage rather than showing an indeterminate spinner with no explanation.
 */
function DocumentUpload({ matterId }: { matterId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await uploadDocument(matterId, formData);
      if (!result.ok) {
        setError(result.error);
      } else {
        formRef.current?.reset();
        setFileName(null);
      }
    });
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setFileName(files[0].name);
    const formData = new FormData();
    formData.set("file", files[0]);
    submit(formData);
  }

  return (
    <form ref={formRef} action={submit} className="flex flex-col gap-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!isPending) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!isPending) handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "relative flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-4 py-5 text-center",
          "transition-[border-color,background-color] duration-200 ease-(--ease-out-quart)",
          dragging
            ? "border-primary bg-accent"
            : "border-border bg-muted/30 hover:border-foreground/20 hover:bg-muted/50",
          isPending && "pointer-events-none opacity-70"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          name="file"
          accept={ACCEPT}
          disabled={isPending}
          onChange={(e) => handleFiles(e.target.files)}
          className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
          aria-label="Upload a source document"
        />

        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin text-primary" />
            <p className="text-xs font-medium">Ingesting {fileName}</p>
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
