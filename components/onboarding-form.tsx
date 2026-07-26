"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeOnboarding } from "@/lib/actions/onboarding";

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      // On success the action redirects, so it only returns on error.
      const result = await completeOnboarding(formData);
      if (result && !result.ok) setError(result.error);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2.5">
        <Label htmlFor="userName">Your name</Label>
        <Input
          id="userName"
          name="userName"
          defaultValue={defaultName}
          placeholder="Jordan Alvarez"
          required
          disabled={isPending}
        />
      </div>
      <div className="flex flex-col gap-2.5">
        <Label htmlFor="firmName">Workspace name</Label>
        <Input
          id="firmName"
          name="firmName"
          placeholder="Research Group"
          required
          disabled={isPending}
        />
      </div>
      {error && (
        <p className="text-body-sm text-rejected" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "Setting up your workspace…" : "Create workspace"}
      </Button>
    </form>
  );
}
