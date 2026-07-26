import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Card — the default raised surface.
 *
 * `tone` selects the material rather than the colour:
 *   solid  — an opaque panel one rung up the surface ladder. The workhorse.
 *   glass  — translucent with backdrop blur. Only for surfaces that float
 *            *above* content; blur behind prose costs legibility.
 *   well   — recessed, for insets inside another card (code, quotes, canvases).
 *
 * `interactive` is only for cards that are themselves a link or button target.
 * The lift is 2px and the ring brightens — enough to read as "this responds",
 * not enough to make a page of cards look like it is hovering.
 */
function Card({
  className,
  size = "default",
  tone = "solid",
  interactive = false,
  ...props
}: React.ComponentProps<"div"> & {
  size?: "default" | "sm" | "lg"
  tone?: "solid" | "glass" | "well"
  interactive?: boolean
}) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-tone={tone}
      className={cn(
        "group/card relative flex flex-col gap-(--card-spacing) rounded-2xl py-(--card-spacing) text-sm text-card-foreground",
        "[--card-spacing:--spacing(6)] data-[size=sm]:[--card-spacing:--spacing(4)] data-[size=lg]:[--card-spacing:--spacing(8)]",
        tone === "solid" && "bg-card shadow-sm ring-1 ring-border",
        tone === "glass" && "glass shadow-lg",
        tone === "well" && "glass-well ring-1 ring-border",
        interactive &&
          "cursor-pointer transition-[box-shadow,transform,background-color] duration-250 ease-(--ease-liquid) hover:-translate-y-0.5 hover:shadow-xl motion-reduce:hover:translate-y-0",
        interactive && tone === "solid" && "hover:bg-surface hover:ring-primary/25",
        interactive && tone === "glass" && "hover:border-primary/25",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min items-start gap-1.5 px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-display text-headline-sm text-foreground group-data-[size=sm]/card:text-headline-xs",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-body-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "mt-auto flex items-center gap-3 border-t border-border px-(--card-spacing) pt-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
