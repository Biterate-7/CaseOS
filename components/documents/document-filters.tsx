"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FILE_TYPES,
  FILE_TYPE_LABELS,
  SORT_KEYS,
  SORT_LABELS,
  type DocumentIndex,
} from "@/lib/documents-shared";
import { documentStatusLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUSES = ["READY", "PROCESSING", "UPLOADED", "FAILED"] as const;

/**
 * Search, filter, and sort controls.
 *
 * All state lives in the URL rather than in React state: a filtered view
 * survives a refresh, can be linked to a colleague, and works with the back
 * button. The cost is a server round trip per change, which `useTransition`
 * covers by keeping the previous results on screen and dimmed instead of
 * flashing a spinner.
 *
 * The search box is debounced and uses `replace`, so typing eight characters
 * leaves one history entry rather than eight.
 */
function DocumentFilters({ index }: { index: DocumentIndex }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const { query, facets } = index;
  const [term, setTerm] = useState(query.q);
  const [showFilters, setShowFilters] = useState(
    Boolean(
      query.matterId ||
        query.uploadedById ||
        query.status ||
        query.type ||
        query.from ||
        query.to
    )
  );

  // Keeps the box in sync when navigation changes the URL from elsewhere
  // (a cleared filter, the back button) without fighting the user mid-type.
  const committed = useRef(query.q);
  useEffect(() => {
    if (query.q !== committed.current) {
      committed.current = query.q;
      setTerm(query.q);
    }
  }, [query.q]);

  function push(mutate: (params: URLSearchParams) => void, replace = false) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    // Any filter change invalidates the current page offset.
    params.delete("page");
    const qs = params.toString();
    const href = qs ? `${pathname}?${qs}` : pathname;
    startTransition(() => {
      if (replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    });
  }

  function setParam(key: string, value: string | null, replace = false) {
    push((params) => {
      if (value) params.set(key, value);
      else params.delete(key);
    }, replace);
  }

  // Debounced search. 300ms is long enough to batch a burst of typing and
  // short enough that the list feels reactive.
  useEffect(() => {
    if (term === committed.current) return;
    const timer = setTimeout(() => {
      committed.current = term;
      setParam("q", term || null, true);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  const activeFilters = useMemo(
    () =>
      [
        query.matterId && {
          key: "project",
          label:
            facets.projects.find((p) => p.id === query.matterId)?.title ??
            "Project",
        },
        query.uploadedById && {
          key: "uploader",
          label:
            facets.uploaders.find((u) => u.id === query.uploadedById)?.name ??
            "Uploader",
        },
        query.status && {
          key: "status",
          label: documentStatusLabel[query.status],
        },
        query.type && { key: "type", label: FILE_TYPE_LABELS[query.type] },
        query.from && { key: "from", label: `From ${query.from}` },
        query.to && { key: "to", label: `To ${query.to}` },
      ].filter(Boolean) as { key: string; label: string }[],
    [query, facets]
  );

  const selectClass =
    "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 transition-opacity duration-200",
        isPending && "opacity-60"
      )}
      aria-busy={isPending}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search names, projects, and document text…"
            aria-label="Search documents"
            className="h-8 pl-8 text-xs"
          />
        </div>

        <Button
          variant={showFilters ? "secondary" : "outline"}
          size="sm"
          aria-expanded={showFilters}
          onClick={() => setShowFilters((v) => !v)}
        >
          <SlidersHorizontal className="size-3.5" />
          Filters
          {activeFilters.length > 0 && (
            <span className="ml-0.5 rounded bg-primary px-1.5 text-[0.6875rem] font-semibold text-primary-foreground tabular-nums">
              {activeFilters.length}
            </span>
          )}
        </Button>

        <label className="sr-only" htmlFor="doc-sort">
          Sort documents
        </label>
        <select
          id="doc-sort"
          value={query.sort}
          onChange={(e) => setParam("sort", e.target.value)}
          className={cn(selectClass, "w-auto")}
        >
          {SORT_KEYS.map((key) => (
            <option key={key} value={key}>
              {SORT_LABELS[key]}
            </option>
          ))}
        </select>
      </div>

      {showFilters && (
        <div className="grid gap-2 rounded-xl border bg-card p-3 shadow-xs sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="f-project" className="text-[0.6875rem] font-medium text-muted-foreground">
              Project
            </label>
            <select
              id="f-project"
              className={selectClass}
              value={query.matterId ?? ""}
              onChange={(e) => setParam("project", e.target.value || null)}
            >
              <option value="">All projects</option>
              {facets.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="f-uploader" className="text-[0.6875rem] font-medium text-muted-foreground">
              Uploaded by
            </label>
            <select
              id="f-uploader"
              className={selectClass}
              value={query.uploadedById ?? ""}
              onChange={(e) => setParam("uploader", e.target.value || null)}
            >
              <option value="">Anyone</option>
              {facets.uploaders.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="f-type" className="text-[0.6875rem] font-medium text-muted-foreground">
              File type
            </label>
            <select
              id="f-type"
              className={selectClass}
              value={query.type ?? ""}
              onChange={(e) => setParam("type", e.target.value || null)}
            >
              <option value="">Any type</option>
              {FILE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {FILE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="f-status" className="text-[0.6875rem] font-medium text-muted-foreground">
              Status
            </label>
            <select
              id="f-status"
              className={selectClass}
              value={query.status ?? ""}
              onChange={(e) => setParam("status", e.target.value || null)}
            >
              <option value="">Any status</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {documentStatusLabel[s]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="f-from" className="text-[0.6875rem] font-medium text-muted-foreground">
              Uploaded after
            </label>
            <input
              id="f-from"
              type="date"
              className={selectClass}
              value={query.from ?? ""}
              onChange={(e) => setParam("from", e.target.value || null)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="f-to" className="text-[0.6875rem] font-medium text-muted-foreground">
              Uploaded before
            </label>
            <input
              id="f-to"
              type="date"
              className={selectClass}
              value={query.to ?? ""}
              onChange={(e) => setParam("to", e.target.value || null)}
            />
          </div>
        </div>
      )}

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setParam(filter.key, null)}
              className="inline-flex h-6 items-center gap-1 rounded-md border bg-muted px-2 text-[0.6875rem] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {filter.label}
              <X className="size-3" />
            </button>
          ))}
          <Button
            variant="ghost"
            size="xs"
            onClick={() =>
              startTransition(() => router.push(pathname, { scroll: false }))
            }
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}

export { DocumentFilters };
