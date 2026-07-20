import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";

export const metadata = { title: "Matters" };
export const dynamic = "force-dynamic";

const statusVariant = {
  OPEN: "default",
  PENDING: "secondary",
  CLOSED: "outline",
  ARCHIVED: "outline",
} as const;

export default async function MattersPage() {
  const matters = await db.matter.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { documents: true } } },
  });

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Matters</h1>
          <p className="text-sm text-muted-foreground">
            All matters at your firm.
          </p>
        </div>
        <Button disabled title="Matter creation arrives with Clerk auth">
          New matter
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {matters.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No matters yet. Run <code>npm run db:seed</code> to create demo
              data, or wait for matter creation in the auth milestone.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Matter</th>
                    <th className="px-4 py-3 font-medium">Client</th>
                    <th className="px-4 py-3 font-medium">Practice area</th>
                    <th className="px-4 py-3 font-medium">Docs</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {matters.map((m) => (
                    <tr
                      key={m.id}
                      className="border-b last:border-0 hover:bg-accent/50"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/matters/${m.id}`}
                          className="font-medium hover:underline"
                        >
                          {m.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {m.clientName}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {m.practiceArea}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {m._count.documents}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant[m.status]}>
                          {m.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {m.updatedAt.toISOString().slice(0, 10)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
