import { cn } from "@/lib/utils"

/**
 * Empty states explain what belongs here and give the action that fills it —
 * never a bare "No items" (skill rule: guide users when no content exists).
 */
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  size = "default",
}: {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  size?: "default" | "sm"
}) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center text-center",
        size === "default" ? "gap-3 px-6 py-14" : "gap-2 px-4 py-8",
        className
      )}
    >
      {Icon && (
        <div
          className={cn(
            "flex items-center justify-center rounded-xl border bg-muted/50 text-muted-foreground",
            size === "default" ? "size-11" : "size-9"
          )}
        >
          <Icon className={size === "default" ? "size-5" : "size-4"} />
        </div>
      )}
      <div className="flex flex-col gap-1">
        <p
          className={cn(
            "font-medium text-foreground",
            size === "default" ? "text-sm" : "text-[0.8125rem]"
          )}
        >
          {title}
        </p>
        {description && (
          <p className="mx-auto max-w-sm text-pretty text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}

export { EmptyState }
