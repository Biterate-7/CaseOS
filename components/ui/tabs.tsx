"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Tabs.
 *
 * Two shapes, chosen with `variant` on TabsList:
 *
 *   segmented — a pill sliding inside a recessed track. For switching between
 *               peer views of the same thing.
 *   underline — a cyan rule under the active label. For panel headers where a
 *               filled track would add a box inside a box.
 *
 * In both, the active indicator is a single element that slides (Base UI's
 * Indicator) rather than a per-tab background that pops on and off — the motion
 * carries the spatial relationship between the old and new selection, which is
 * the whole reason to animate it.
 */

const TabsVariantContext = React.createContext<"segmented" | "underline">(
  "segmented"
)

function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  children,
  variant = "segmented",
  ...props
}: TabsPrimitive.List.Props & { variant?: "segmented" | "underline" }) {
  return (
    <TabsVariantContext.Provider value={variant}>
      <TabsPrimitive.List
        data-slot="tabs-list"
        data-variant={variant}
        className={cn(
          // Scrolls rather than overflowing when the label set is wider than a
          // phone viewport, while still looking like a control, not a scroller.
          "relative inline-flex max-w-full items-center justify-start overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          variant === "segmented" &&
            "h-11 gap-1 rounded-xl bg-surface-lowest/70 p-1 ring-1 ring-border",
          variant === "underline" && "h-11 w-full gap-1 border-b border-border",
          className
        )}
        {...props}
      >
        <TabsPrimitive.Indicator
          className={cn(
            "absolute z-0 w-(--active-tab-width) translate-x-(--active-tab-left)",
            "transition-[transform,width] duration-250 ease-(--ease-liquid)",
            variant === "segmented" &&
              "top-1 h-9 rounded-lg bg-surface-highest shadow-sm",
            variant === "underline" &&
              "bottom-0 h-0.5 rounded-full bg-primary shadow-[0_0_12px_var(--glow)]"
          )}
        />
        {children}
      </TabsPrimitive.List>
    </TabsVariantContext.Provider>
  )
}

function TabsTab({ className, ...props }: TabsPrimitive.Tab.Props) {
  const variant = React.useContext(TabsVariantContext)

  return (
    <TabsPrimitive.Tab
      data-slot="tabs-tab"
      className={cn(
        "relative z-1 inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap select-none",
        "transition-colors duration-150 outline-none",
        "focus-visible:ring-3 focus-visible:ring-ring/50",
        "disabled:pointer-events-none disabled:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        variant === "segmented" &&
          "h-9 rounded-lg px-4 text-label-md text-muted-foreground hover:text-foreground data-[selected]:text-primary",
        variant === "underline" &&
          "h-11 px-4 text-meta-sm uppercase text-muted-foreground hover:text-foreground data-[selected]:text-primary",
        className
      )}
      {...props}
    />
  )
}

function TabsPanel({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-panel"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTab, TabsPanel }
