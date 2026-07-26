"use client"

import { Menu as MenuPrimitive } from "@base-ui/react/menu"

import { cn } from "@/lib/utils"

/**
 * Dropdown / context menu.
 *
 * One primitive covers both: Base UI's Menu handles typeahead, roving focus,
 * escape, and outside-press identically whether it was opened by a click or a
 * right-click, so there is no reason for the product to carry two components
 * that look almost the same.
 *
 * The popup is glass and enters from the trigger's edge via
 * `origin-(--transform-origin)`, which Base UI sets from the resolved side —
 * so a menu that flips to avoid the viewport edge also flips its animation.
 */
function Menu(props: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root {...props} />
}

function MenuTrigger(props: MenuPrimitive.Trigger.Props) {
  return <MenuPrimitive.Trigger data-slot="menu-trigger" {...props} />
}

function MenuContent({
  className,
  children,
  sideOffset = 6,
  align = "start",
  side = "bottom",
  ...props
}: MenuPrimitive.Popup.Props & {
  sideOffset?: number
  align?: MenuPrimitive.Positioner.Props["align"]
  side?: MenuPrimitive.Positioner.Props["side"]
}) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        sideOffset={sideOffset}
        align={align}
        side={side}
        className="z-50"
      >
        <MenuPrimitive.Popup
          data-slot="menu-content"
          className={cn(
            "glass min-w-[12rem] origin-(--transform-origin) rounded-2xl p-1.5 shadow-2xl outline-none",
            "transition-[transform,opacity] duration-150 ease-(--ease-out-quart)",
            "data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
            "data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
            className
          )}
          {...props}
        >
          {children}
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

function MenuItem({
  className,
  destructive = false,
  ...props
}: MenuPrimitive.Item.Props & { destructive?: boolean }) {
  return (
    <MenuPrimitive.Item
      data-slot="menu-item"
      className={cn(
        "flex cursor-default items-center gap-2.5 rounded-xl px-3 py-2 text-label-md whitespace-nowrap select-none outline-none",
        "transition-colors duration-100",
        "data-[highlighted]:bg-surface-highest data-[highlighted]:text-foreground",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        destructive
          ? "text-rejected data-[highlighted]:bg-rejected-surface data-[highlighted]:text-rejected"
          : "text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function MenuSeparator({ className, ...props }: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator
      data-slot="menu-separator"
      className={cn("my-1.5 h-px bg-border", className)}
      {...props}
    />
  )
}

function MenuGroup(props: MenuPrimitive.Group.Props) {
  return <MenuPrimitive.Group data-slot="menu-group" {...props} />
}

function MenuGroupLabel({
  className,
  ...props
}: MenuPrimitive.GroupLabel.Props) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="menu-group-label"
      className={cn(
        "px-3 pt-2 pb-1.5 font-mono text-meta-xs uppercase text-muted-foreground/70",
        className
      )}
      {...props}
    />
  )
}

export {
  Menu,
  MenuTrigger,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuGroup,
  MenuGroupLabel,
}
