"use client"

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"

/**
 * Edge-anchored panel built on Base UI's Dialog (focus trap, escape, scroll
 * lock come free). Used for navigation on small screens, where a permanent
 * sidebar would eat the viewport.
 */
function Sheet(props: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root {...props} />
}

function SheetTrigger(props: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose(props: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetContent({
  className,
  children,
  side = "left",
  ...props
}: DialogPrimitive.Popup.Props & { side?: "left" | "right" }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        className={cn(
          "fixed inset-0 z-50 bg-foreground/25 backdrop-blur-[2px]",
          "transition-opacity duration-250 ease-(--ease-out-quart)",
          "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"
        )}
      />
      <DialogPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          "fixed inset-y-0 z-50 flex w-[min(20rem,85vw)] flex-col bg-sidebar shadow-xl outline-none",
          side === "left" ? "left-0 border-r" : "right-0 border-l",
          "transition-transform duration-300 ease-(--ease-out-quart)",
          side === "left"
            ? "data-[starting-style]:-translate-x-full data-[ending-style]:-translate-x-full"
            : "data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full",
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}

function SheetTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-sm font-semibold", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetDescription,
}
