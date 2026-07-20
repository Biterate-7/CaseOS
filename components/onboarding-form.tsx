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
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
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
      <div className="flex flex-col gap-2">
        <Label htmlFor="firmName">Firm name</Label>
        <Input
          id="firmName"
          name="firmName"
          placeholder="Alvarez & Chen LLP"
          required
          disabled={isPending}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Setting up your workspace…" : "Create firm workspace"}
      </Button>
    </form>
  );
}
