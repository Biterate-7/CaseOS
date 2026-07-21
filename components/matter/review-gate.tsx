"use client";

import { Check, ShieldQuestion, X } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { reviewInteraction } from "@/lib/actions/ai";
import { formatDateTime, reviewStatusLabel } from "@/lib/format";
import type { WorkspaceInteraction } from "@/lib/matter-data";
import { cn } from "@/lib/utils";

/**
 * The human review gate.
 *
 * Weighted deliberately heavier than the old pair of extra-small buttons:
 * this is the consequential act in the product — the moment a person
 * takes responsibility for AI output. It gets its own bordered surface and a
 * sentence naming what approval means.
 */
function ReviewGate({ interaction }: { interaction: WorkspaceInteraction }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED" | null>(
    null
  );

  function decide(verdict: "APPROVED" | "REJECTED") {
    setError(null);
    setDecision(verdict);
    startTransition(async () => {
      const result = await reviewInteraction(interaction.id, verdict);
      if (!result.ok) {
        setError(result.error);
        setDecision(null);
      }
    });
  }

  if (interaction.reviewStatus !== "PENDING_REVIEW") {
    const approved = interaction.reviewStatus === "APPROVED";
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
          approved
            ? "border-grounded-border bg-grounded-surface text-grounded"
            : "border-rejected-border bg-rejected-surface text-rejected"
        )}
      >
        {approved ? (
          <Check className="size-3.5 shrink-0" />
        ) : (
          <X className="size-3.5 shrink-0" />
        )}
        <span className="font-medium">
          {reviewStatusLabel[interaction.reviewStatus]}
        </span>
        {interaction.reviewedAt && (
          <span className="opacity-80">
            · {formatDateTime(interaction.reviewedAt)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-pending-border bg-pending-surface/50 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="inline-flex items-start gap-1.5 text-xs leading-relaxed text-pending">
          <ShieldQuestion className="mt-px size-3.5 shrink-0" />
          <span>
            Awaiting review. Nothing here should be relied on or shared
            onward until someone signs off on it.
          </span>
        </p>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            onClick={() => decide("APPROVED")}
            disabled={isPending}
          >
            <Check className="size-3.5" />
            {isPending && decision === "APPROVED" ? "Approving…" : "Approve"}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => decide("REJECTED")}
            disabled={isPending}
          >
            <X className="size-3.5" />
            {isPending && decision === "REJECTED" ? "Rejecting…" : "Reject"}
          </Button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-xs text-rejected">
          {error}
        </p>
      )}
    </div>
  );
}

export { ReviewGate };
