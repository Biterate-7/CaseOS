import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Siglum — the reference mark. `[S2]`, `[A1]`, `[E3]`.
 *
 * The product's central mechanic rendered as a single reusable primitive:
 * mono type, one of the three hands, always paired with its letter (never
 * colour alone — Apparatus §11.8, colour-independence). A hand never
 * appears without this component, and this component never appears without
 * a hand.
 *
 * `interactive` renders it as a button that inverts on hover/active (fill
 * goes solid, text goes to the surface colour) rather than lifting or
 * scaling — chips don't move, they change tone.
 */
const siglumVariants = cva(
  "inline-flex min-h-4 min-w-4 shrink-0 items-center justify-center rounded-sm px-1 py-px font-mono text-[0.625rem] font-semibold leading-none transition-colors duration-[140ms] ease-(--ease-standard)",
  {
    variants: {
      hand: {
        /** [S] Iron gall — grounded in an uploaded document passage. */
        document: "",
        /** [E] Indigo — verified from the open web. */
        external: "",
        /** Unresolved — nothing grounds this marker. */
        unresolved:
          "text-muted-foreground/60 line-through cursor-help bg-transparent",
      },
      active: { true: "", false: "" },
    },
    compoundVariants: [
      {
        hand: "document",
        active: false,
        class: "bg-citation-surface text-citation ring-1 ring-citation/30",
      },
      {
        hand: "document",
        active: true,
        class: "bg-citation text-card",
      },
      {
        hand: "external",
        active: false,
        class: "bg-external-surface text-external ring-1 ring-external/30",
      },
      {
        hand: "external",
        active: true,
        class: "bg-external text-card",
      },
    ],
    defaultVariants: { hand: "document", active: false },
  }
)

type SiglumProps = {
  /** e.g. "S2", "A1", "E3" — the letter is always shown; colour never carries it alone. */
  label: string
  className?: string
} & VariantProps<typeof siglumVariants> &
  (
    | { interactive?: false; onSelect?: never; title?: string }
    | { interactive: true; onSelect: () => void; pressed?: boolean; title?: string }
  )

function Siglum(props: SiglumProps) {
  const { label, hand, active, className, title } = props

  if (props.interactive) {
    return (
      <button
        type="button"
        onClick={props.onSelect}
        aria-pressed={props.pressed}
        title={title}
        className={cn(
          siglumVariants({ hand, active }),
          "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          className
        )}
      >
        {label}
      </button>
    )
  }

  return (
    <span title={title} className={cn(siglumVariants({ hand, active }), className)}>
      {label}
    </span>
  )
}

export { Siglum, siglumVariants }
