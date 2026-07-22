import { FileStack, FileText, Search } from "lucide-react";
import Link from "next/link";

import { DocumentActions } from "@/components/documents/document-actions";
import { DocumentFilters } from "@/components/documents/document-filters";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireUser } from "@/lib/auth";
import { loadDocumentIndex } from "@/lib/documents-data";
import {
  countLabel,
  documentStatusLabel,
  documentStatusTone,
  formatBytes,
  formatRelativeTime,
} from "@/lib/format";

export const metadata = { title: "Documents" };
export const dynamic = "force-dynamic";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const [user, index] = await Promise.all([
    requireUser(),
    loadDocumentIndex(params),
  ]);

  const { documents, total, page, pageCount, query, facets } = index;
  const isFiltered =
    Boolean(query.q) ||
    Boolean(
      query.matterId ||
        query.uploadedById ||
        query.status ||
        query.type ||
        query.from ||
        query.to
    );

  /** Builds a page link that preserves the current filters. */
  function pageHref(next: number) {
    const sp = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      const raw = Array.isArray(value) ? value[0] : value;
      if (raw) sp.set(key, raw);
    }
    if (next > 1) sp.set("page", String(next));
    else sp.delete("page");
    const qs = sp.toString();
    return qs ? `/documents?${qs}` : "/documents";
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <header className="mb-6">
        <h1 className="font-serif text-2xl font-semibold tracking-tight">
          Documents
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every source across your workspace. Search covers names, projects,
          and the text inside each document.
        </p>
      </header>

      <div className="mb-5">
        <DocumentFilters index={index} />
      </div>

      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="text-xs text-muted-foreground tabular-nums">
          {isFiltered
            ? `${countLabel(total, "match", "matches")} of ${facets.totalDocuments}`
            : countLabel(total, "document")}
        </p>
        {pageCount > 1 && (
          <p className="text-xs text-muted-foreground tabular-nums">
            Page {page} of {pageCount}
          </p>
        )}
      </div>

      {facets.totalDocuments === 0 ? (
        <EmptyState
          icon={FileStack}
          title="No documents yet"
          description="Upload sources inside a project and they will all appear here, searchable together."
          action={
            <Button
              size="sm"
              nativeButton={false}
              render={<Link href="/matters" />}
            >
              Go to projects
            </Button>
          }
        />
      ) : documents.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching documents"
          description="Nothing in this workspace matches the current search and filters."
          action={
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href="/documents" />}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="group flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-xs transition-[border-color,box-shadow] duration-200 ease-(--ease-out-quart) hover:border-foreground/15 hover:shadow-sm sm:flex-row sm:items-center"
            >
              <span
                className={
                  doc.status === "READY"
                    ? "flex size-9 shrink-0 items-center justify-center rounded-lg border border-grounded-border bg-grounded-surface text-grounded"
                    : doc.status === "FAILED"
                      ? "flex size-9 shrink-0 items-center justify-center rounded-lg border border-rejected-border bg-rejected-surface text-rejected"
                      : "flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground"
                }
              >
                <FileText className="size-4" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{doc.title}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                  {/* Nested inside the row but not inside another link — the
                      row itself is not a link, so this stays valid. */}
                  <Link
                    href={`/matters/${doc.matterId}`}
                    className="max-w-[16rem] truncate font-medium text-foreground underline-offset-2 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    {doc.matterTitle}
                  </Link>
                  <span className="tabular-nums">
                    · {formatBytes(doc.sizeBytes)}
                  </span>
                  {doc.pageCount != null && (
                    <span className="tabular-nums">· {doc.pageCount}pp</span>
                  )}
                  <span>· {formatRelativeTime(doc.createdAt)}</span>
                  <span className="truncate">
                    · {doc.uploaderName ?? "Unknown uploader"}
                  </span>
                </p>
                {doc.matchedInText && (
                  <p className="mt-1 inline-flex items-center gap-1 rounded bg-citation-surface px-1.5 py-0.5 text-[0.625rem] font-medium text-citation">
                    Matched inside document text
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge
                  size="sm"
                  tone={documentStatusTone[doc.status]}
                  pulse={doc.status === "PROCESSING"}
                >
                  {documentStatusLabel[doc.status]}
                </StatusBadge>
                <DocumentActions
                  document={doc}
                  projects={facets.projects}
                  canDelete={
                    user.role === "ADMIN" || doc.uploadedById === user.id
                  }
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 && (
        <nav
          aria-label="Pagination"
          className="mt-5 flex items-center justify-between gap-3"
        >
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            nativeButton={page <= 1}
            render={page > 1 ? <Link href={pageHref(page - 1)} /> : undefined}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">
            {page} / {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount}
            nativeButton={page >= pageCount}
            render={
              page < pageCount ? <Link href={pageHref(page + 1)} /> : undefined
            }
          >
            Next
          </Button>
        </nav>
      )}
    </div>
  );
}
