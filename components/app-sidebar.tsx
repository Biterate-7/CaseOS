"use client"

import { UserButton } from "@clerk/nextjs"
import { FileStack, FolderOpen, LayoutDashboard, Network, Users } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { ThemeToggle } from "@/components/theme-toggle"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/matters", label: "Projects", icon: FolderOpen },
  { href: "/documents", label: "Documents", icon: FileStack },
  { href: "/settings/members", label: "Members", icon: Users },
]

function BrandMark() {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-xs">
        <Network className="size-4" />
      </span>
      <span className="font-serif text-[0.9375rem] font-semibold tracking-tight">
        CaseOS
      </span>
    </Link>
  )
}

/**
 * Navigation. The active state is a single shared element that slides between
 * items (`layoutId`) rather than a background that pops on and off — the
 * motion carries where you came from, which is the whole point of animating
 * it. Falls back to an instant swap when the OS asks for reduced motion.
 */
function AppNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const reduceMotion = useReducedMotion()

  return (
    <nav className="flex flex-col gap-0.5" aria-label="Main">
      {navItems.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`)
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium",
              "transition-colors duration-150 outline-none",
              "focus-visible:ring-3 focus-visible:ring-ring/50",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId="app-nav-active"
                aria-hidden
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 420, damping: 34 }
                }
                className="absolute inset-0 -z-10 rounded-lg bg-sidebar-accent shadow-xs ring-1 ring-foreground/5"
              />
            )}
            <Icon
              className={cn(
                "size-4 shrink-0 transition-colors duration-150",
                active
                  ? "text-primary"
                  : "text-muted-foreground/80 group-hover:text-foreground"
              )}
            />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

function AppSidebar({
  userName,
  firmName,
  onNavigate,
}: {
  userName: string
  firmName: string
  onNavigate?: () => void
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center px-4">
        <BrandMark />
      </div>
      <Separator />

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
        <AppNav onNavigate={onNavigate} />
      </div>

      <Separator />
      <div className="flex flex-col gap-3 p-3">
        <ThemeToggle />
        <div className="flex items-center gap-2.5">
          <UserButton
            appearance={{ elements: { userButtonAvatarBox: "size-7" } }}
          />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[0.8125rem] font-medium">{userName}</p>
            <p className="truncate text-xs text-muted-foreground">{firmName}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export { AppSidebar, BrandMark }
