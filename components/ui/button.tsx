import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Button.
 *
 * Sizes are more generous than a typical dense admin UI — this design leans on
 * air around controls, and a 40px default target is also the accessible one.
 *
 * Press is a scale rather than a 1px nudge: scale is composited on the GPU and
 * reads as the surface yielding under the finger, where a translate reads as
 * the layout twitching. Duration is deliberately short — press feedback slower
 * than ~120ms feels like lag, not weight.
 *
 * Only chrome colours appear here. A button never uses citation bronze,
 * ai-context violet, or external indigo: those hues make a claim about where
 * information came from, and a button is not evidence.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent bg-clip-padding font-medium whitespace-nowrap outline-none select-none transition-[background-color,box-shadow,border-color,color,transform] duration-150 ease-(--ease-out-quart) focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:not-aria-[haspopup]:scale-[0.97] active:duration-75 motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary-bright hover:shadow-[0_0_24px_-6px_var(--glow)]",
        // The one gradient control in the system, reserved for a page's single
        // primary call to action. Cyan into cyan-bright — never into violet,
        // which would borrow a hue that means "the model wrote this".
        hero: "bg-gradient-to-r from-primary to-primary-bright text-primary-foreground shadow-lg shadow-[var(--glow)] hover:brightness-110",
        outline:
          "border-border bg-transparent hover:border-primary/40 hover:bg-surface-highest/60 hover:text-foreground aria-expanded:bg-surface-highest aria-expanded:text-foreground",
        secondary:
          "bg-surface-highest text-foreground shadow-xs hover:bg-[color-mix(in_oklch,var(--surface-highest),var(--foreground)_7%)] aria-expanded:bg-surface-highest",
        ghost:
          "hover:bg-surface-highest/70 hover:text-foreground aria-expanded:bg-surface-highest aria-expanded:text-foreground",
        // Glass: for controls that float over content (toolbars, overlays).
        glass:
          "glass text-foreground hover:border-primary/30 hover:text-primary",
        destructive:
          "bg-rejected-surface text-rejected hover:bg-[color-mix(in_oklch,var(--rejected-surface),var(--rejected)_12%)] focus-visible:ring-rejected/40",
        link: "rounded-md text-primary underline-offset-4 hover:underline focus-visible:ring-offset-0",
      },
      size: {
        default: "h-10 gap-2 px-4 text-sm",
        xs: "h-7 gap-1 rounded-lg px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-lg px-3 text-[0.8125rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-2.5 rounded-2xl px-6 text-[0.9375rem]",
        // Hero CTA proportions from the source design.
        xl: "h-14 gap-3 rounded-2xl px-8 text-base",
        /** Pill filter chip. */
        chip: "h-8 gap-1.5 rounded-full px-4 text-[0.8125rem] [&_svg:not([class*='size-'])]:size-3.5",
        icon: "size-10",
        "icon-xs":
          "size-7 rounded-lg [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-12 rounded-2xl",
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
