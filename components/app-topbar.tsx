"use client"

import { Plus, Search } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Top command bar.
 *
 * The search field is the real full-text search over document passages — it
 * submits to /documents?q=, the same route and parameter the documents page
 * already reads. It is deliberately not a fake command palette: a control that
 * looks like it does something and does nothing is worse than no control.
 *
 * ⌘K / Ctrl-K focuses it from anywhere. The listener is bound once on the
 * window and ignores keystrokes already inside a text field, so the shortcut
 * cannot steal a character from the AI composer mid-question.
 */
function AppTopbar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(searchParams.get("q") ?? "")

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "k" || !(event.metaKey || event.ctrlKey)) return

      const target = event.target as HTMLElement | null
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable

      if (typing && target !== inputRef.current) return

      event.preventDefault()
      inputRef.current?.focus()
      inputRef.current?.select()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const onSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault()
      const term = value.trim()
      router.push(term ? `/documents?q=${encodeURIComponent(term)}` : "/documents")
    },
    [router, value]
  )

  return (
    <header className="glass-panel sticky top-0 z-30 hidden h-topbar shrink-0 items-center gap-6 border-b border-border px-8 lg:flex">
      <form onSubmit={onSubmit} className="min-w-0 flex-1" role="search">
        <label htmlFor="global-search" className="sr-only">
          Search documents
        </label>
        <div className="group relative flex max-w-xl items-center">
          <Search
            aria-hidden
            className="absolute left-3.5 size-4 text-muted-foreground transition-colors duration-[140ms] group-focus-within:text-foreground"
          />
          <input
            ref={inputRef}
            id="global-search"
            type="search"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Search across your documents"
            className={cn(
              "h-10 w-full rounded-xl border border-border bg-surface-lowest/60 py-2 pr-20 pl-10 text-sm text-foreground",
              "transition-[background-color,border-color,box-shadow] duration-[140ms] ease-(--ease-standard) outline-none",
              "placeholder:text-muted-foreground/70",
              "focus-visible:border-input focus-visible:bg-surface focus-visible:ring-3 focus-visible:ring-ring/40",
              // Safari renders its own clear affordance on type=search.
              "[&::-webkit-search-cancel-button]:hidden"
            )}
          />
          <kbd
            aria-hidden
            className="pointer-events-none absolute right-3 flex items-center gap-1 font-mono text-meta-xs text-muted-foreground opacity-50 transition-opacity duration-[140ms] group-focus-within:opacity-0"
          >
            <span className="rounded border border-border px-1.5 py-0.5">⌘</span>
            <span className="rounded border border-border px-1.5 py-0.5">K</span>
          </kbd>
        </div>
      </form>

      <Button size="sm" nativeButton={false} render={<Link href="/matters/new" />}>
        <Plus />
        New project
      </Button>
    </header>
  )
}

export { AppTopbar }
