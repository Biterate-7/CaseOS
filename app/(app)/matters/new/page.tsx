import { ArrowLeft, FolderPlus } from "lucide-react";
import Link from "next/link";

import { MatterForm } from "@/components/matter-form";
import { Eyebrow } from "@/components/ui/eyebrow";

export const metadata = { title: "New project" };
export const dynamic = "force-dynamic";

export default function NewMatterPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-margin-mobile py-8 lg:py-16">
      <Link
        href="/matters"
        className="group inline-flex w-fit items-center gap-2 rounded-lg font-mono text-meta-xs uppercase text-muted-foreground transition-colors duration-150 outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ArrowLeft className="size-3.5 transition-transform duration-250 group-hover:-translate-x-1" />
        All projects
      </Link>

      <div className="relative overflow-hidden rounded-3xl bg-card/50 p-8 shadow-2xl ring-1 ring-border backdrop-blur-3xl lg:p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklch, var(--primary), transparent 88%), transparent 70%)",
          }}
        />

        <div className="relative flex flex-col gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/20">
            <FolderPlus className="size-5" />
          </span>
          <Eyebrow className="mt-2">New workspace boundary</Eyebrow>
          <h1 className="font-display text-headline-md text-foreground">
            Create a project
          </h1>
          <p className="max-w-md text-pretty text-body-sm leading-relaxed text-muted-foreground">
            A project is the boundary for documents, AI answers, and activity
            history. Nothing crosses it.
          </p>
        </div>

        <div className="relative mt-8">
          <MatterForm />
        </div>
      </div>
    </div>
  );
}
