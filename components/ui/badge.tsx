import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Badge — a small chip for counts, categories, and inline labels.
 *
 * Control radius, not a pill: full-round shapes are reserved for genuinely
 * circular objects, so a chip and an avatar are never confusable.
 *
 * For anything that reports *state* (review status, ingestion status) or
 * *provenance* (citation, model-generated, external) use StatusBadge instead:
 * those meanings are owned by the semantic palette and must not be spelled with
 * chrome colours.
 */
const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-sm border border-transparent px-2.5 py-0.5 text-meta-xs font-medium whitespace-nowrap transition-colors duration-[140ms] focus-visible:ring-3 focus-visible:ring-ring/50 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary-bright",
        secondary: "bg-surface-highest text-foreground [a]:hover:bg-surface",
        outline:
          "border-border text-muted-foreground [a]:hover:border-input [a]:hover:text-foreground",
        ghost: "text-muted-foreground hover:bg-surface-highest",
        accent: "bg-surface-highest text-foreground ring-1 ring-border",
        destructive: "bg-rejected-surface text-rejected ring-1 ring-rejected-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
