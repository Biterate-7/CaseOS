import { FileStack, FileText, Search } from "lucide-react";
import Link from "next/link";

import { DocumentActions } from "@/components/documents/document-actions";
import { DocumentFilters } from "@/components/documents/document-filters";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
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
import { cn } from "@/lib/utils";

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
    <div className="mx-auto flex max-w-(--container-page) flex-col gap-8 px-margin-mobile py-8 lg:px-margin-desktop lg:py-12">
      <PageHeader
        title="Documents"
        description="Every source across your workspace. Search covers names, projects, and the text inside each document."
      />

      <DocumentFilters index={index} />

      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-meta-xs uppercase text-muted-foreground tabular-nums">
          {isFiltered
            ? `${countLabel(total, "match", "matches")} of ${facets.totalDocuments}`
            : countLabel(total, "document")}
        </p>
        {pageCount > 1 && (
          <p className="font-mono text-meta-xs text-muted-foreground tabular-nums">
            Page {page} of {pageCount}
          </p>
        )}
      </div>

      {facets.totalDocuments === 0 ? (
        <div className="rounded-3xl bg-card/40 ring-1 ring-border backdrop-blur-3xl">
          <EmptyState
            icon={FileStack}
            title="No documents yet"
            description="Upload sources inside a project and they will all appear here, searchable together."
            action={
              <Button nativeButton={false} render={<Link href="/matters" />}>
                Go to projects
              </Button>
            }
          />
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-3xl bg-card/40 ring-1 ring-border backdrop-blur-3xl">
          <EmptyState
            icon={Search}
            title="No matching documents"
            description="Nothing in this workspace matches the current search and filters."
            action={
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href="/documents" />}
              >
                Clear filters
              </Button>
            }
          />
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="group flex flex-col gap-4 rounded-2xl bg-card p-4 ring-1 ring-border transition-[background-color,box-shadow,--tw-ring-color] duration-250 ease-(--ease-liquid) hover:bg-surface hover:shadow-lg hover:ring-primary/20 sm:flex-row sm:items-center sm:p-5"
            >
              {/* The icon tile carries ingestion state as a second, redundant
                  signal alongside the badge — colour is never the only cue. */}
              <span
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-xl ring-1",
                  doc.status === "READY" &&
                    "bg-grounded-surface text-grounded ring-grounded-border",
                  doc.status === "FAILED" &&
                    "bg-rejected-surface text-rejected ring-rejected-border",
                  doc.status !== "READY" &&
                    doc.status !== "FAILED" &&
                    "bg-surface-highest text-muted-foreground ring-border"
                )}
              >
                <FileText className="size-5" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-label-md text-foreground">
                  {doc.title}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-meta-xs text-muted-foreground">
                  {/* Nested inside the row but not inside another link — the
                      row itself is not a link, so this stays valid. */}
                  <Link
                    href={`/matters/${doc.matterId}`}
                    className="max-w-[16rem] truncate text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
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

                {doc.snippet && (
                  <p className="mt-3 rounded-lg border-l-2 border-citation/50 bg-citation-surface/25 py-2 pl-3 text-body-sm leading-relaxed text-muted-foreground">
                    {/* ts_headline output, HTML-escaped in lib/search.ts with
                        only <mark> restored — document text is
                        attacker-controlled and must never render as markup. */}
                    <span
                      className="[&_mark]:rounded-sm [&_mark]:bg-citation-surface [&_mark]:px-1 [&_mark]:font-medium [&_mark]:text-citation"
                      dangerouslySetInnerHTML={{ __html: `…${doc.snippet}…` }}
                    />
                    {doc.snippetPage != null && (
                      <span className="ml-2 whitespace-nowrap font-mono text-meta-xs text-citation/80 tabular-nums">
                        p.{doc.snippetPage}
                      </span>
                    )}
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
          className="flex items-center justify-between gap-3"
        >
          <Button
            variant="outline"
            disabled={page <= 1}
            nativeButton={page <= 1}
            render={page > 1 ? <Link href={pageHref(page - 1)} /> : undefined}
          >
            Previous
          </Button>
          <span className="font-mono text-meta-xs text-muted-foreground tabular-nums">
            {page} / {pageCount}
          </span>
          <Button
            variant="outline"
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
