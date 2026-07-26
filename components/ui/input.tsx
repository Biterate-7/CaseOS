import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

/**
 * Text input.
 *
 * Fields are recessed rather than raised — they read as a well cut into the
 * surface, which is what makes them look receptive. On focus the well lifts to
 * the next surface rung and takes a cyan ring, so the active field is obvious
 * without a colour change to the text itself.
 *
 * `text-base` below the `md` breakpoint is deliberate: iOS Safari zooms the
 * viewport on focus for anything under 16px.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-xl border border-border bg-surface-lowest/60 px-3.5 py-2 text-base text-foreground shadow-inner transition-[background-color,border-color,box-shadow] duration-150 ease-(--ease-standard) outline-none md:text-sm",
        "placeholder:text-muted-foreground/70",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "hover:border-border/80",
        "focus-visible:border-primary/50 focus-visible:bg-surface focus-visible:ring-3 focus-visible:ring-ring/40",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-rejected/60 aria-invalid:ring-3 aria-invalid:ring-rejected/25",
        className
      )}
      {...props}
    />
  )
}

export { Input }
