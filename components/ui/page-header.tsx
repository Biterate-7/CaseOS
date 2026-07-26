import { cn } from "@/lib/utils"

/**
 * Consistent page masthead. `eyebrow` carries breadcrumb/back context,
 * `actions` sits right-aligned and collapses under the title on small screens.
 *
 * The title is where the display face earns its keep — page identity, set at
 * headline-md and stepping down on narrow viewports so a long project name
 * never eats three lines on a phone.
 */
function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  className,
}: {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  /** Status badges / counts rendered inline beside the title. */
  meta?: React.ReactNode
  className?: string
}) {
  return (
    <header
      data-slot="page-header"
      className={cn("flex flex-col gap-4", className)}
    >
      {eyebrow && <div className="flex items-center gap-2">{eyebrow}</div>}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="font-display text-headline-sm text-balance text-foreground sm:text-headline-md">
              {title}
            </h1>
            {meta}
          </div>
          {description && (
            <p className="max-w-2xl text-pretty text-body-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
    </header>
  )
}

export { PageHeader }
