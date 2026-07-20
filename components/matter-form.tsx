"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createMatter } from "@/lib/actions/matters";

export function MatterForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      // On success the action redirects, so it only returns on error.
      const result = await createMatter(formData);
      if (result && !result.ok) setError(result.error);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Matter title</Label>
        <Input
          id="title"
          name="title"
          placeholder="Hendricks v. Meridian Logistics"
          required
          disabled={isPending}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="clientName">Client</Label>
        <Input
          id="clientName"
          name="clientName"
          placeholder="Sarah Hendricks"
          required
          disabled={isPending}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="practiceArea">Practice area</Label>
        <Input
          id="practiceArea"
          name="practiceArea"
          placeholder="Employment"
          required
          disabled={isPending}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Brief summary of the matter…"
          rows={3}
          disabled={isPending}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating…" : "Create matter"}
      </Button>
    </form>
  );
}
