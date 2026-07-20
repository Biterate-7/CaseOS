"use client";

import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadDocument } from "@/lib/actions/documents";

export function UploadForm({ matterId }: { matterId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await uploadDocument(matterId, formData);
      if (!result.ok) {
        setError(result.error);
      } else {
        formRef.current?.reset();
      }
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Input
          type="file"
          name="file"
          accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
          disabled={isPending}
          className="max-w-xs"
        />
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Ingesting…" : "Upload"}
        </Button>
      </div>
      {isPending && (
        <p className="text-xs text-muted-foreground">
          Uploading, extracting text, chunking, and embedding — this can take a
          minute for long documents.
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
