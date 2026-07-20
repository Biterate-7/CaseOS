import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { mockMatters } from "@/lib/mock-data";

export const metadata = { title: "Matters" };

const statusVariant = {
  OPEN: "default",
  PENDING: "secondary",
  CLOSED: "outline",
} as const;

export default function MattersPage() {
  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Matters</h1>
          <p className="text-sm text-muted-foreground">
            All matters at Alvarez &amp; Chen LLP.
          </p>
        </div>
        <Button disabled title="Matter creation lands in Phase 2">
          New matter
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
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
                {mockMatters.map((m) => (
                  <tr key={m.id} className="border-b last:border-0 hover:bg-accent/50">
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
                      {m.documentCount}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[m.status]}>{m.status}</Badge>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {m.updatedAt}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
