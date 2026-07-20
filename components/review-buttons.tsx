"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { reviewInteraction } from "@/lib/actions/ai";

export function ReviewButtons({ interactionId }: { interactionId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function decide(decision: "APPROVED" | "REJECTED") {
    setError(null);
    startTransition(async () => {
      const result = await reviewInteraction(interactionId, decision);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="xs"
        onClick={() => decide("APPROVED")}
        disabled={isPending}
      >
        Approve
      </Button>
      <Button
        size="xs"
        variant="destructive"
        onClick={() => decide("REJECTED")}
        disabled={isPending}
      >
        Reject
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
