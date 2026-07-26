"use client"

import { UserButton } from "@clerk/nextjs"
import {
  ChevronsUpDown,
  FileStack,
  FolderOpen,
  LayoutDashboard,
  Network,
  Plus,
  Users,
} from "lucide-react"
import { motion, useReducedMotion } from "motion/react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { ThemeToggle } from "@/components/theme-toggle"
import {
  Menu,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu"
import { springSnappy } from "@/lib/motion"
import { cn } from "@/lib/utils"

/** A project the switcher can jump to. Shaped by the app layout's query. */
type SwitcherProject = { id: string; title: string }

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
      className="group flex items-center gap-3 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-bright text-primary-foreground shadow-lg shadow-[var(--glow)]">
        <Network className="size-4.5" />
      </span>
      <span className="font-display text-headline-sm tracking-tight text-foreground">
        CaseOS
      </span>
    </Link>
  )
}

/**
 * Project switcher.
 *
 * Jumps straight into recent work rather than routing through the list page —
 * the rail is where you change what you are looking at, so the control that
 * does it belongs at the top of the rail.
 */
function ProjectSwitcher({
  projects,
  onNavigate,
}: {
  projects: SwitcherProject[]
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const activeId = pathname.startsWith("/matters/")
    ? pathname.split("/")[2]
    : undefined
  const active = projects.find((p) => p.id === activeId)

  return (
    <Menu>
      <MenuTrigger
        className={cn(
          "aura-glow group flex w-full items-center justify-between gap-3 rounded-xl bg-surface-highest/70 px-4 py-3 text-left ring-1 ring-border outline-none",
          "transition-colors duration-150 hover:bg-surface-highest",
          "focus-visible:ring-3 focus-visible:ring-ring/50"
        )}
      >
        <span className="flex min-w-0 items-center gap-3">
          <FolderOpen className="size-4.5 shrink-0 text-primary" />
          <span className="min-w-0 truncate text-label-md text-foreground">
            {active ? active.title : "Select a project"}
          </span>
        </span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
      </MenuTrigger>

      <MenuContent className="w-[16rem]" align="start">
        {projects.length > 0 && (
          <MenuGroup>
            <MenuGroupLabel>Recent projects</MenuGroupLabel>
            {projects.map((project) => (
              <MenuItem
                key={project.id}
                onClick={onNavigate}
                className={cn(project.id === activeId && "text-primary")}
                render={<Link href={`/matters/${project.id}`} />}
              >
                <FolderOpen />
                <span className="truncate">{project.title}</span>
              </MenuItem>
            ))}
            <MenuSeparator />
          </MenuGroup>
        )}
        <MenuItem onClick={onNavigate} render={<Link href="/matters" />}>
          <FileStack />
          View all projects
        </MenuItem>
        <MenuItem onClick={onNavigate} render={<Link href="/matters/new" />}>
          <Plus />
          New project
        </MenuItem>
      </MenuContent>
    </Menu>
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
    <nav className="flex flex-col gap-1" aria-label="Main">
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
              "group relative flex h-12 items-center gap-4 rounded-xl px-4 text-label-md",
              "transition-colors duration-150 outline-none",
              "focus-visible:ring-3 focus-visible:ring-ring/50",
              active
                ? "font-medium text-primary"
                : "text-muted-foreground hover:bg-surface-highest/60 hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId="app-nav-active"
                aria-hidden
                transition={reduceMotion ? { duration: 0 } : springSnappy}
                className="absolute inset-0 -z-10 rounded-xl bg-primary/12 ring-1 ring-primary/25"
              />
            )}
            <Icon
              className={cn(
                "size-5 shrink-0 transition-colors duration-150",
                active ? "text-primary" : "group-hover:text-primary"
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
  projects = [],
  onNavigate,
}: {
  userName: string
  firmName: string
  projects?: SwitcherProject[]
  onNavigate?: () => void
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-20 shrink-0 items-center px-6">
        <BrandMark />
      </div>

      <div className="px-6 pb-6">
        <ProjectSwitcher projects={projects} onNavigate={onNavigate} />
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
        <AppNav onNavigate={onNavigate} />
      </div>

      <div className="flex flex-col gap-4 border-t border-border p-6">
        <ThemeToggle />
        <div className="flex items-center gap-3 rounded-xl bg-surface-lowest/50 px-3 py-2.5">
          <UserButton
            appearance={{ elements: { userButtonAvatarBox: "size-8" } }}
          />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-label-sm font-medium text-foreground">
              {userName}
            </p>
            <p className="truncate font-mono text-meta-xs text-muted-foreground">
              {firmName}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export { AppSidebar, BrandMark, type SwitcherProject }
