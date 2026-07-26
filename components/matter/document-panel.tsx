"use client";

import { FileStack, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { DocumentCard } from "@/components/matter/document-card";
import { DocumentUpload } from "@/components/matter/document-upload";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import type { WorkspaceDocument } from "@/lib/matter-data";
import { countLabel } from "@/lib/format";

function DocumentPanel({
  matterId,
  documents,
}: {
  matterId: string;
  documents: WorkspaceDocument[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.fileName.toLowerCase().includes(q) ||
        (d.excerpt?.toLowerCase().includes(q) ?? false)
    );
  }, [documents, query]);

  return (
    <section
      aria-label="Documents"
      className="flex min-h-0 flex-col gap-4 p-5"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-headline-xs text-foreground">
          Documents
        </h2>
        <span className="font-mono text-meta-xs text-muted-foreground tabular-nums">
          {countLabel(documents.length, "source")}
        </span>
      </div>

      <DocumentUpload matterId={matterId} />

      {documents.length > 2 && (
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents…"
            aria-label="Search documents"
            className="h-9 pl-9 text-[0.8125rem]"
          />
        </div>
      )}

      <div className="flex min-h-0 flex-col gap-2.5">
        {documents.length === 0 ? (
          <EmptyState
            icon={FileStack}
            size="sm"
            title="No sources yet"
            description="CaseOS only answers from documents in this project. Upload the first one to give the assistant something to ground on."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            size="sm"
            title="No matching documents"
            description={`Nothing in this project matches “${query}”.`}
          />
        ) : (
          filtered.map((document) => (
            <DocumentCard key={document.id} document={document} />
          ))
        )}
      </div>
    </section>
  );
}

export { DocumentPanel };
