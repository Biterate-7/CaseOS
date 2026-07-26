import { Network } from "lucide-react";
import Link from "next/link";

import { AmbientBackground } from "@/components/ui/ambient-background";
import { cn } from "@/lib/utils";

/**
 * The third layout tier: no app chrome, no marketing nav. Used by sign-in,
 * sign-up, and onboarding — the surfaces where a user has arrived but has no
 * workspace to be inside yet.
 *
 * Shares the ambient aurora with the landing page and app shell, muted so it
 * never competes with the form. Deliberately does not impose a card of its
 * own — Clerk's widgets and the plain forms here each carry their own glass
 * surface, sized differently, so a shared wrapper card would either double up
 * or fight their natural width.
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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-12">
      <AmbientBackground intensity="muted" />

      <Link
        href="/"
        className="relative z-10 mb-10 flex items-center gap-3 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-bright text-primary-foreground shadow-lg shadow-[var(--glow)]">
          <Network className="size-4.5" />
        </span>
        <span className="font-display text-headline-xs text-foreground">
          CaseOS
        </span>
      </Link>

      <div className={cn("relative z-10 w-full max-w-sm", className)}>
        {children}
      </div>

      {footer && (
        <div className="relative z-10 mt-8 text-center font-mono text-meta-xs text-muted-foreground">
          {footer}
        </div>
      )}
    </div>
  );
}

export { AuthShell };
