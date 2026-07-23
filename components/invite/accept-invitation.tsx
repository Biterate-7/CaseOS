"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { acceptInvitation } from "@/lib/actions/invitations";

/**
 * Accept button.
 *
 * The server re-validates the token, expiry, email match, and existing
 * membership — the page's preview only decides what to render and could be
 * stale by the time this fires.
 */
function AcceptInvitation({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function accept() {
    setError(null);
    startTransition(async () => {
      const result = await acceptInvitation(token);
      if (result.ok) {
        // refresh() first so the new membership is visible to the dashboard's
        // server components; push alone can render against a stale session.
        router.refresh();
        router.push("/dashboard");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button className="w-full" disabled={isPending} onClick={accept}>
        {isPending ? (
          "Joining…"
        ) : (
          <>
            <Check className="size-4" />
            Accept invitation
          </>
        )}
      </Button>
      {error && (
        <p role="alert" className="text-center text-xs text-rejected">
          {error}
        </p>
      )}
    </div>
  );
}

export { AcceptInvitation };
