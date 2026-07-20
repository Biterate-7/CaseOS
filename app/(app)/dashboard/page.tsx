import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const statusVariant = {
  OPEN: "default",
  PENDING: "secondary",
  CLOSED: "outline",
  ARCHIVED: "outline",
} as const;

export default async function DashboardPage() {
  const user = await requireUser();
  const firmId = user.firmId;

  const [openMatters, documentCount, pendingReviewCount, recentMatters, auditEntries] =
    await Promise.all([
      db.matter.count({ where: { firmId, status: "OPEN" } }),
      db.document.count({ where: { matter: { firmId } } }),
      db.aIInteraction.count({
        where: { matter: { firmId }, reviewStatus: "PENDING_REVIEW" },
      }),
      db.matter.findMany({
        where: { firmId },
        orderBy: { updatedAt: "desc" },
        take: 4,
      }),
      db.auditLog.findMany({
        where: { firmId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { user: { select: { name: true } } },
      }),
    ]);

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Firm overview.</p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open matters</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{openMatters}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Documents ingested</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{documentCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>AI outputs awaiting review</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {pendingReviewCount}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent matters</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {recentMatters.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No matters yet — run <code>npm run db:seed</code> for demo data.
              </p>
            ) : (
              recentMatters.map((m) => (
                <Link
                  key={m.id}
                  href={`/matters/${m.id}`}
                  className="flex items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-accent"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{m.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.clientName} · {m.practiceArea}
                    </p>
                  </div>
                  <Badge variant={statusVariant[m.status]}>{m.status}</Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Audit activity</CardTitle>
            <CardDescription>
              Every AI interaction is recorded firm-wide.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {auditEntries.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No activity yet.
              </p>
            ) : (
              auditEntries.map((entry) => (
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
    </div>
  );
}
