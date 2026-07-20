"use client";

import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askQuestion } from "@/lib/actions/ai";

export function AskForm({
  matterId,
  readyDocumentCount,
}: {
  matterId: string;
  readyDocumentCount: number;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await askQuestion(matterId, formData);
      if (!result.ok) {
        setError(result.error);
      } else {
        formRef.current?.reset();
      }
    });
  }

  const disabled = isPending || readyDocumentCount === 0;

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-col gap-3">
      <Textarea
        name="question"
        placeholder={
          readyDocumentCount === 0
            ? "Upload a document first — answers are grounded only in this matter's sources."
            : "Ask about this matter's documents…"
        }
        rows={3}
        disabled={disabled}
        required
      />
      <Button type="submit" disabled={disabled}>
        {isPending ? "Searching sources and drafting…" : "Ask"}
      </Button>
      {isPending && (
        <p className="text-xs text-muted-foreground">
          Retrieving this matter&apos;s most relevant passages, generating a
          cited answer, and logging the interaction.
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
