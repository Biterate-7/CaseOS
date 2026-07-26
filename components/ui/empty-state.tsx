import { cn } from "@/lib/utils"

/**
 * Empty states explain what belongs here and give the action that fills it —
 * never a bare "No items" (skill rule: guide users when no content exists).
 *
 * The icon sits in a glass tile with a faint cyan wash behind it, so an empty
 * region still reads as a designed surface rather than as a hole in the page.
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
  const large = size === "default"

  return (
    <div
      data-slot="empty-state"
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden text-center",
        large ? "gap-4 px-6 py-16" : "gap-2.5 px-4 py-10",
        className
      )}
    >
      {/* A single soft glow behind the icon, so the void has a light source. */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 size-56 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklch, var(--primary), transparent 90%), transparent 70%)",
        }}
      />

      {Icon && (
        <div
          className={cn(
            "relative flex items-center justify-center rounded-2xl bg-surface-highest/70 text-primary ring-1 ring-border",
            large ? "size-14" : "size-11"
          )}
        >
          <Icon className={large ? "size-6" : "size-5"} />
        </div>
      )}

      <div className="relative flex flex-col gap-1.5">
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

      {action && <div className="relative mt-2">{action}</div>}
    </div>
  )
}

export { EmptyState }
