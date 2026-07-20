import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { mockAuditTrail, mockDocuments, mockMatters } from "@/lib/mock-data";

export const metadata = { title: "Matter workspace" };

const docStatusVariant = {
  READY: "default",
  PROCESSING: "secondary",
  UPLOADED: "outline",
} as const;

export default async function MatterWorkspacePage({
  params,
}: {
  params: Promise<{ matterId: string }>;
}) {
  const { matterId } = await params;
  const matter = mockMatters.find((m) => m.id === matterId);
  if (!matter) notFound();

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <div className="mb-6">
        <Link
          href="/matters"
          className="text-xs text-muted-foreground hover:underline"
        >
          ← All matters
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {matter.title}
          </h1>
          <Badge>{matter.status}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {matter.clientName} · {matter.practiceArea}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Documents</CardTitle>
                <CardDescription>
                  Sources ground every AI answer in this matter.
                </CardDescription>
              </div>
              <Button size="sm" disabled title="Upload lands in Phase 2">
                Upload
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col">
              {mockDocuments.map((doc, i) => (
                <div key={doc.id}>
                  {i > 0 && <Separator />}
                  <div className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{doc.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {doc.fileName} · {doc.pages} pages · uploaded{" "}
                        {doc.uploadedAt}
                      </p>
                    </div>
                    <Badge variant={docStatusVariant[doc.status]}>
                      {doc.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Audit trail</CardTitle>
              <CardDescription>
                Every AI interaction on this matter, permanently recorded.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {mockAuditTrail.map((entry) => (
                <div key={entry.id} className="text-sm">
                  <p className="font-medium">
                    {entry.actor}{" "}
                    <span className="font-normal text-muted-foreground">
                      · {entry.action}
                    </span>
                  </p>
                  <p className="text-muted-foreground">{entry.detail}</p>
                  <p className="text-xs text-muted-foreground/70">{entry.at}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit lg:sticky lg:top-8">
          <CardHeader>
            <CardTitle className="text-base">AI assistant</CardTitle>
            <CardDescription>
              Answers only from this matter&apos;s {matter.documentCount}{" "}
              documents, with citations. Live in Phase 3.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p className="mb-2 font-medium">
                Is the non-compete in the 2022 employment agreement enforceable?
              </p>
              <p className="text-muted-foreground">
                The agreement restricts competition for 24 months within 100
                miles{" "}
                <span className="rounded bg-primary/10 px-1 font-mono text-xs text-primary">
                  [Employment Agreement (2022), p. 11 §8.2]
                </span>
                . The termination letter states the termination was without
                cause{" "}
                <span className="rounded bg-primary/10 px-1 font-mono text-xs text-primary">
                  [Termination Letter, p. 1]
                </span>
                …
              </p>
              <div className="mt-3 flex gap-2">
                <Badge variant="secondary">Pending review</Badge>
                <Badge variant="outline">2 citations verified</Badge>
              </div>
            </div>
            <Textarea
              placeholder="Ask about this matter's documents…"
              disabled
              rows={3}
            />
            <Button disabled title="AI pipeline lands in Phase 3">
              Ask (Phase 3)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
