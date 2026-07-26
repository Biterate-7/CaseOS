"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";

/**
 * Scoped fallback when the matter workspace's essential data fails to load.
 *
 * Rendered in place of the workspace by the page's own try/catch, so a
 * transient load failure stays inside the authenticated shell (the sidebar and
 * navigation remain) instead of tripping the app-wide error boundary. "Try
 * again" re-runs the server render via router.refresh rather than a full
 * reload, so it recovers in place. The reference ties the screen to the
 * structured server log for this request.
 */
export function WorkspaceLoadError({ reference }: { reference?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="flex max-w-md flex-col items-center text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl border border-rejected-border bg-rejected-surface text-rejected">
          <TriangleAlert className="size-6" />
        </span>

        <h1 className="mt-5 font-display text-headline-sm text-foreground">
          This workspace couldn&apos;t load
        </h1>
        <p className="mt-2.5 text-body-sm leading-relaxed text-pretty text-muted-foreground">
          We couldn&apos;t load this project just now. Your documents and
          previous answers are safe — nothing was lost. This is usually
          temporary.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button
            disabled={isPending}
            onClick={() => startTransition(() => router.refresh())}
          >
            <RefreshCw className={isPending ? "size-3.5 animate-spin" : "size-3.5"} />
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

        {reference && (
          <p className="mt-8 font-mono text-meta-xs text-muted-foreground/70">
            Reference: {reference}
          </p>
        )}
      </div>
    </div>
  );
}
