import { cn } from "@/lib/utils"

/**
 * Consistent page masthead. `eyebrow` carries breadcrumb/back context,
 * `actions` sits right-aligned and collapses under the title on small screens.
 *
 * The title is the one place the serif display face appears by default —
 * page identity, nothing else.
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
      className={cn("flex flex-col gap-3", className)}
    >
      {eyebrow && <div className="flex items-center gap-2">{eyebrow}</div>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="font-serif text-2xl leading-tight font-semibold tracking-tight text-balance text-foreground">
              {title}
            </h1>
            {meta}
          </div>
          {description && (
            <p className="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
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
