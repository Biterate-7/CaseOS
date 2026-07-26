import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * The third layout tier: no app chrome, no marketing nav. Used by sign-in,
 * sign-up, and onboarding — the surfaces where a user has arrived but has no
 * workspace to be inside yet.
 *
 * Deliberately does not impose a card of its own: Clerk's widgets and the
 * plain forms here each carry their own surface, sized differently, so a
 * shared wrapper would either double up or fight their natural width.
 *
 * These are the quietest screens in the product — a sheet on a desk under a
 * lamp, and nothing else. The product opens the way it intends to continue.
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
      <Link
        href="/"
        className="relative z-10 mb-10 flex items-center gap-3 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="font-mono text-label-md text-foreground">[C]</span>
        <span className="text-label-md font-medium tracking-tight text-foreground">
          CaseOS
        </span>
      </Link>

      <div className={cn("relative z-10 w-full max-w-sm", className)}>
        {children}
      </div>

      {footer && (
        <div className="relative z-10 mt-8 text-center text-meta-sm text-muted-foreground">
          {footer}
        </div>
      )}
    </div>
  );
}

export { AuthShell };
