import Link from "next/link";

import { MatterForm } from "@/components/matter-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "New project" };
export const dynamic = "force-dynamic";

export default function NewMatterPage() {
  return (
    <div className="mx-auto max-w-xl px-8 py-8">
      <Link
        href="/matters"
        className="text-xs text-muted-foreground hover:underline"
      >
        ← All projects
      </Link>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-xl">New project</CardTitle>
          <CardDescription>
            A project is the boundary for documents, AI answers, and activity
            history. Nothing crosses it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MatterForm />
        </CardContent>
      </Card>
    </div>
  );
}
