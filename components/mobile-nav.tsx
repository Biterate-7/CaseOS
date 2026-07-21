"use client"

import { Menu } from "lucide-react"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

import { AppSidebar, BrandMark } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"

/**
 * Small-screen navigation. The sidebar content is shared with the desktop
 * rail rather than duplicated, so nav items can never drift between the two.
 */
function MobileNav({
  userName,
  firmName,
}: {
  userName: string
  firmName: string
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close on navigation — otherwise the panel stays over the page you just
  // asked for.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur-md lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Open navigation"
          onClick={() => setOpen(true)}
        >
          <Menu />
        </Button>
        <SheetContent side="left">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <AppSidebar
            userName={userName}
            firmName={firmName}
            onNavigate={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>
      <BrandMark />
    </header>
  )
}

export { MobileNav }
