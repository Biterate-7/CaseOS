import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { MatterForm } from "@/components/matter-form";

export const metadata = { title: "New project" };
export const dynamic = "force-dynamic";

export default function NewMatterPage() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8 px-margin-mobile py-10 lg:py-16">
      <Link
        href="/matters"
        className="group inline-flex w-fit items-center gap-2 rounded-sm text-meta-sm text-muted-foreground transition-colors duration-[140ms] outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ArrowLeft className="size-3.5" />
        All projects
      </Link>

      {/* No container. A form on a page is separated by space and a rule —
          a card here would only wrap a single group in armour it doesn't
          need, and the corner glow it used to carry was a second light. */}
      <div className="flex flex-col gap-2">
        <h1 className="text-display-md text-foreground">Create a project</h1>
        <p className="max-w-md text-pretty text-body-md leading-relaxed text-muted-foreground">
          A project is the boundary for documents, AI answers, and activity
          history. Nothing crosses it.
        </p>
      </div>

      <div className="border-t border-border pt-8">
        <MatterForm />
      </div>
    </div>
  );
}
