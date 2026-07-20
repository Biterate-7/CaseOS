import Link from "next/link";
import { notFound } from "next/navigation";

import { AiAnswer } from "@/components/ai-answer";
import { AskForm } from "@/components/ask-form";
import { ReviewButtons } from "@/components/review-buttons";
import { UploadForm } from "@/components/upload-form";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Matter workspace" };
export const dynamic = "force-dynamic";

const docStatusVariant = {
  READY: "default",
  PROCESSING: "secondary",
  UPLOADED: "outline",
  FAILED: "destructive",
} as const;

const reviewStatusVariant = {
  PENDING_REVIEW: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
} as const;

const reviewStatusLabel = {
  PENDING_REVIEW: "Pending review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
} as const;

export default async function MatterWorkspacePage({
  params,
}: {
  params: Promise<{ matterId: string }>;
}) {
  const user = await requireUser();
  const { matterId } = await params;
  // findFirst with firmId (not findUnique by id alone) so another firm's
  // matter id 404s instead of leaking data across the privilege boundary.
  const matter = await db.matter.findFirst({
    where: { id: matterId, firmId: user.firmId },
    include: {
      documents: { orderBy: { createdAt: "desc" } },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { user: { select: { name: true } } },
      },
      aiInteractions: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          user: { select: { name: true } },
          citations: {
            include: {
              chunk: {
                select: {
                  pageNumber: true,
                  document: { select: { title: true, fileName: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!matter) notFound();

  const readyDocumentCount = matter.documents.filter(
    (d) => d.status === "READY"
  ).length;

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
            <CardHeader>
              <CardTitle className="text-base">Documents</CardTitle>
              <CardDescription>
                Sources ground every AI answer in this matter. PDF and
                plain-text files up to 20 MB.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <UploadForm matterId={matter.id} />
              <Separator />
              {matter.documents.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No documents yet. Upload the first one to start grounding AI
                  answers.
                </p>
              ) : (
                <div className="flex flex-col">
                  {matter.documents.map((doc, i) => (
                    <div key={doc.id}>
                      {i > 0 && <Separator />}
                      <div className="flex items-center justify-between gap-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {doc.title}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {doc.fileName} ·{" "}
                            {(doc.sizeBytes / 1024).toFixed(0)} KB · uploaded{" "}
                            {doc.createdAt.toISOString().slice(0, 10)}
                          </p>
                        </div>
                        <Badge variant={docStatusVariant[doc.status]}>
                          {doc.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Audit trail</CardTitle>
              <CardDescription>
                Every action on this matter, permanently recorded.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {matter.auditLogs.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No activity yet.
                </p>
              ) : (
                matter.auditLogs.map((entry) => (
                  <div key={entry.id} className="text-sm">
                    <p className="font-medium">
                      {entry.user?.name ?? "System"}{" "}
                      <span className="font-normal text-muted-foreground">
                        · {entry.action}
                      </span>
                    </p>
                    {entry.detail != null && (
                      <p className="break-all text-muted-foreground">
                        {JSON.stringify(entry.detail)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground/70">
                      {entry.createdAt.toISOString().replace("T", " ").slice(0, 16)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI assistant</CardTitle>
              <CardDescription>
                Answers come only from this matter&apos;s {readyDocumentCount}{" "}
                ingested document{readyDocumentCount === 1 ? "" : "s"}. Every
                claim carries a citation, and every answer awaits attorney
                review.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AskForm
                matterId={matter.id}
                readyDocumentCount={readyDocumentCount}
              />
            </CardContent>
          </Card>

          {matter.aiInteractions.map((interaction) => (
            <Card key={interaction.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-sm leading-snug">
                    {interaction.prompt}
                  </CardTitle>
                  <Badge variant={reviewStatusVariant[interaction.reviewStatus]}>
                    {reviewStatusLabel[interaction.reviewStatus]}
                  </Badge>
                </div>
                <CardDescription>
                  {interaction.user.name} ·{" "}
                  {interaction.createdAt.toISOString().replace("T", " ").slice(0, 16)}{" "}
                  · {interaction.model}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <AiAnswer answer={interaction.response} />
                {interaction.citations.length > 0 && (
                  <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Citations ({interaction.citations.length})
                    </p>
                    {interaction.citations.map((citation) => (
                      <div key={citation.id} className="text-xs">
                        <p className="font-medium">
                          {citation.chunk.document.title}
                          {citation.chunk.pageNumber != null &&
                            ` · page ${citation.chunk.pageNumber}`}
                          {!citation.verified && (
                            <span className="ml-2 text-destructive">
                              unverified
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 border-l-2 pl-2 text-muted-foreground">
                          “{citation.quotedText}…”
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {interaction.reviewStatus === "PENDING_REVIEW" && (
                  <ReviewButtons interactionId={interaction.id} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
