import { ChevronDown } from "lucide-react"
import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Native select, styled to match Input.
 *
 * Deliberately native rather than a listbox built from divs: the OS picker is
 * better on touch, works without JavaScript, handles typeahead and long option
 * lists for free, and is impossible to get wrong for screen readers. The only
 * thing we add is the chevron, since `appearance-none` removes the platform one.
 *
 * Options inherit the page background explicitly — some browsers render the
 * dropdown list with the system colours otherwise, which looks broken on a dark
 * surface.
 */
function Select({
  className,
  children,
  size = "default",
  ...props
}: // `size` is omitted from the native props: on <select> it is the number of
// visible rows, and we are reusing the name for a visual scale.
Omit<React.ComponentProps<"select">, "size"> & {
  size?: "default" | "sm"
}) {
  return (
    <div className="relative flex w-full items-center">
      <select
        data-slot="select"
        className={cn(
          "w-full appearance-none rounded-xl border border-border bg-surface-lowest/60 pr-9 text-foreground shadow-inner transition-[background-color,border-color,box-shadow] duration-150 ease-(--ease-standard) outline-none",
          "hover:border-border/80",
          "focus-visible:border-primary/50 focus-visible:bg-surface focus-visible:ring-3 focus-visible:ring-ring/40",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "[&>option]:bg-popover [&>option]:text-popover-foreground",
          size === "default" ? "h-10 pl-3.5 text-sm" : "h-8 pl-3 text-[0.8125rem]",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 size-4 text-muted-foreground"
      />
    </div>
  )
}

export { Select }
