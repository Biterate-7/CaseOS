import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { mockAuditTrail, mockMatters } from "@/lib/mock-data";

export const metadata = { title: "Dashboard" };

const statusVariant = {
  OPEN: "default",
  PENDING: "secondary",
  CLOSED: "outline",
} as const;

export default function DashboardPage() {
  const openMatters = mockMatters.filter((m) => m.status === "OPEN");

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Firm overview — preview data until the database is connected.
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open matters</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {openMatters.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Documents ingested</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {mockMatters.reduce((n, m) => n + m.documentCount, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>AI outputs awaiting review</CardDescription>
            <CardTitle className="text-3xl tabular-nums">2</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent matters</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {mockMatters.slice(0, 4).map((m) => (
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
            ))}
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
    </div>
  );
}
