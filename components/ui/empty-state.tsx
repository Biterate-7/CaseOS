import { cn } from "@/lib/utils"

/**
 * Empty states explain what belongs here and give the action that fills it —
 * never a bare "No items".
 *
 * Apparatus §13.1: no icon appears in any empty state anywhere in the
 * product — no tinted rounded square, no glow, no illustration. One or two
 * lines of type, optionally a control. The `icon` prop is still accepted so
 * existing call sites don't need editing, but it is intentionally unused.
 */
function EmptyState({
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
  const large = size === "default"

  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center text-center",
        large ? "gap-2 px-6 py-16" : "gap-1.5 px-4 py-10",
        className
      )}
    >
      <div className="flex flex-col gap-1">
        <p
          className={cn(
            "font-display text-foreground",
            large ? "text-headline-xs" : "text-label-md"
          )}
        >
          {title}
        </p>
        {description && (
          <p className="mx-auto max-w-sm text-pretty text-body-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export { EmptyState }
