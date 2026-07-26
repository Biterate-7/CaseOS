"use client"

import { Menu, Search } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

import {
  AppSidebar,
  BrandMark,
  type SwitcherProject,
} from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"

/**
 * Small-screen navigation. The sidebar content is shared with the desktop rail
 * rather than duplicated, so nav items can never drift between the two.
 *
 * Search collapses to an icon that routes to the documents page, where the full
 * search field lives — a persistent input would eat most of a phone's header.
 */
function MobileNav({
  userName,
  firmName,
  projects = [],
}: {
  userName: string
  firmName: string
  projects?: SwitcherProject[]
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close on navigation — otherwise the panel stays over the page you just
  // asked for.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <header className="glass-panel sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b border-border px-4 lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Open navigation"
          onClick={() => setOpen(true)}
        >
          <Menu />
        </Button>
        <SheetContent side="left" className="p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <AppSidebar
            userName={userName}
            firmName={firmName}
            projects={projects}
            onNavigate={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <BrandMark />

      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Search documents"
        className="ml-auto"
        nativeButton={false}
        render={<Link href="/documents" />}
      >
        <Search />
      </Button>
    </header>
  )
}

export { MobileNav }
