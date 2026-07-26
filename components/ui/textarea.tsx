import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Multi-line input. `field-sizing-content` grows the box with the text, which
 * is what the composer needs — a fixed-height box that scrolls internally hides
 * the beginning of a long question while you are still writing it.
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full resize-none rounded-2xl border border-border bg-surface-lowest/60 px-4 py-3 text-base text-foreground shadow-inner transition-[background-color,border-color,box-shadow] duration-150 ease-(--ease-standard) outline-none md:text-sm",
        "placeholder:text-muted-foreground/70",
        "hover:border-border/80",
        "focus-visible:border-primary/50 focus-visible:bg-surface focus-visible:ring-3 focus-visible:ring-ring/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-rejected/60 aria-invalid:ring-3 aria-invalid:ring-rejected/25",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
