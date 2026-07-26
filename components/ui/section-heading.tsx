import { cn } from "@/lib/utils"

/**
 * Heading for a section within a page: an optional icon, a title, and an
 * optional right-aligned action.
 *
 * Exists so every section across the product lines up on the same baseline and
 * uses the same title size. Pages that hand-roll this drift within a release.
 */
function SectionHeading({
  icon: Icon,
  title,
  description,
  action,
  className,
  as: Tag = "h2",
}: {
  icon?: React.ComponentType<{ className?: string }>
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
  as?: "h2" | "h3"
}) {
  return (
    <div
      data-slot="section-heading"
      className={cn("flex items-end justify-between gap-4", className)}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <Tag className="flex items-center gap-2.5 font-display text-headline-sm text-foreground">
          {Icon && <Icon className="size-5 shrink-0 text-primary" />}
          {title}
        </Tag>
        {description && (
          <p className="text-body-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export { SectionHeading }
