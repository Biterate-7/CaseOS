import { Scale } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * The third layout tier: no app chrome, no marketing nav. Used by sign-in,
 * sign-up, and onboarding — the surfaces where a user has arrived but has no
 * workspace to be inside yet.
 *
 * The ground is a very low-contrast radial wash rather than a flat grey, so
 * the centred card reads as sitting on a surface instead of floating in a
 * void. Kept subtle enough that it never competes with the form.
 */
function AuthShell({
  children,
  className,
  footer,
}: {
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-muted/40 px-6 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--card)_0%,transparent_60%)]"
      />

      <Link
        href="/"
        className="relative z-10 mb-8 flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Scale className="size-4" />
        </span>
        <span className="font-serif text-lg font-semibold tracking-tight">
          CaseOS
        </span>
      </Link>

      <div className={cn("relative z-10 w-full max-w-sm", className)}>
        {children}
      </div>

      {footer && (
        <div className="relative z-10 mt-8 text-center text-xs text-muted-foreground">
          {footer}
        </div>
      )}
    </div>
  );
}

export { AuthShell };
