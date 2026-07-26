import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Button.
 *
 * Sizes are generous — a 40px default target is the accessible one.
 *
 * Press is a tone shift, not a scale or a translate. Apparatus's interaction
 * philosophy (§17.2) is explicit: nothing translates, scales, or lifts on
 * interaction, because a control that shifts under the pointer is a control
 * you must aim at twice. Feedback is one tone step darker on hover, one
 * further step on press — that's the whole vocabulary.
 *
 * Only chrome (ink) colours appear here. A button never uses a hand colour
 * (iron gall, aniline, indigo) or a state colour (settled/open) — those make
 * a claim about provenance or state, and a button is not evidence. The one
 * exception is `destructive`, which is never filled: intent is carried by
 * outline and ink colour so it never reads as the recommended path.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent font-medium whitespace-nowrap outline-none select-none transition-[background-color,color,border-color] duration-[140ms] ease-(--ease-standard) focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-bright",
        // Kept as an alias of `default` for existing call sites — chrome has
        // no accent hue, so there is no longer a distinct gradient CTA.
        hero: "bg-primary text-primary-foreground hover:bg-primary-bright",
        outline:
          "border-input bg-transparent hover:bg-surface-highest aria-expanded:bg-surface-highest",
        secondary:
          "bg-surface-highest text-foreground hover:bg-[color-mix(in_oklch,var(--surface-highest),var(--foreground)_7%)] aria-expanded:bg-surface-highest",
        ghost:
          "hover:bg-surface-highest/70 aria-expanded:bg-surface-highest",
        // Retained name; resolves to the same flat surface as any other
        // control — Law II, one material, no blur.
        glass: "border-border bg-card hover:bg-surface-highest",
        destructive:
          "border-rejected-border bg-transparent text-rejected hover:bg-rejected-surface focus-visible:ring-rejected/40",
        link: "rounded-sm text-foreground underline-offset-4 hover:underline focus-visible:ring-offset-0",
      },
      size: {
        default: "h-10 gap-2 px-4 text-sm",
        xs: "h-7 gap-1 rounded-lg px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-lg px-3 text-[0.8125rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-2.5 rounded-xl px-6 text-[0.9375rem]",
        // Hero CTA proportions from the source design.
        xl: "h-14 gap-3 rounded-xl px-8 text-base",
        /** Pill filter chip. */
        chip: "h-8 gap-1.5 rounded-full px-4 text-[0.8125rem] [&_svg:not([class*='size-'])]:size-3.5",
        icon: "size-10",
        "icon-xs":
          "size-7 rounded-lg [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-12 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      // When `render` swaps in a non-button element (e.g. a Link), Base UI
      // must not assume native <button> semantics.
      nativeButton={props.render == null}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
