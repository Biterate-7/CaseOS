"use client";

import { AlertCircle, Loader2 } from "lucide-react";
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
    <form action={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2.5">
        <Label htmlFor="title">Project name</Label>
        <Input
          id="title"
          name="title"
          placeholder="Q3 Vendor Compliance Review"
          required
          disabled={isPending}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-2.5">
          <Label htmlFor="clientName">Subject</Label>
          <Input
            id="clientName"
            name="clientName"
            placeholder="Northwind Logistics"
            required
            disabled={isPending}
          />
        </div>
        <div className="flex flex-col gap-2.5">
          <Label htmlFor="practiceArea">Category</Label>
          <Input
            id="practiceArea"
            name="practiceArea"
            placeholder="Compliance"
            required
            disabled={isPending}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <Label htmlFor="description">
          Description
          <span className="font-mono text-meta-xs uppercase text-muted-foreground">
            Optional
          </span>
        </Label>
        <Textarea
          id="description"
          name="description"
          placeholder="What are you trying to understand from these documents?"
          rows={3}
          disabled={isPending}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-rejected-border bg-rejected-surface px-4 py-3 text-body-sm text-rejected"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      <Button type="submit" size="lg" variant="hero" disabled={isPending}>
        {isPending && <Loader2 className="animate-spin" />}
        {isPending ? "Creating…" : "Create project"}
      </Button>
    </form>
  );
}
