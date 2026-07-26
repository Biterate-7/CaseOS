"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * Error boundary for the authenticated shell.
 *
 * Without this file a thrown server error renders Next.js's default page —
 * "Application error: a server-side exception has occurred" plus a digest and
 * nothing else. That is what a user saw during a production incident on this
 * app, and it gave them no way forward.
 *
 * The digest is surfaced deliberately: it is the key that ties this screen to
 * the matching entry in the server logs, so a user reporting a problem can
 * quote something actionable. The underlying message is not shown — it can
 * contain connection strings and internal paths.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Workspace error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6">
      <div className="flex max-w-md flex-col items-center text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl border border-rejected-border bg-rejected-surface text-rejected">
          <TriangleAlert className="size-6" />
        </span>

        <h1 className="mt-5 font-display text-headline-sm text-foreground">
          Something went wrong
        </h1>
        <p className="mt-2.5 text-body-sm leading-relaxed text-pretty text-muted-foreground">
          This page couldn&apos;t load. Your documents and previous answers are
          unaffected — nothing was lost.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <Button onClick={reset}>
            <RefreshCw />
            Try again
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/dashboard" />}
          >
            Back to dashboard
          </Button>
        </div>

        {error.digest && (
          <p className="mt-8 font-mono text-meta-xs text-muted-foreground/70">
            Reference: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
