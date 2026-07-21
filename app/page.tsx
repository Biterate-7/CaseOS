import {
  FileStack,
  Layers,
  Network,
  Quote,
  ScrollText,
  Search,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata = {
  title: "CaseOS — AI workspace for complex document collections",
  description:
    "Upload a document collection, ask questions in plain language, and get answers grounded in your own sources with a citation to the exact page.",
};

/** What the product does, in the order a new user experiences it. */
const steps = [
  {
    icon: FileStack,
    title: "Upload your documents",
    body: "Drop in reports, records, research, correspondence, or archives. Each file is parsed, split into passages, and indexed into its own project.",
  },
  {
    icon: Search,
    title: "Ask in plain language",
    body: "Question the collection the way you'd question a colleague who has read all of it. Retrieval is scoped to that project and nothing else.",
  },
  {
    icon: Quote,
    title: "Follow every claim to its source",
    body: "Each statement carries a marker linking to the passage behind it — the document, the page, the exact words.",
  },
];

const principles = [
  {
    icon: Layers,
    title: "Project-scoped",
    body: "Every question runs inside a single project. Retrieval never reaches into another collection — enforced in the query itself, not by policy.",
  },
  {
    icon: Network,
    title: "Grounded, not recalled",
    body: "Answers come from the documents you uploaded, never from the model's own memory. If the sources don't cover it, it says so instead of guessing.",
  },
  {
    icon: ScrollText,
    title: "Fully recorded",
    body: "Every upload, question, and review decision is written to a permanent activity record you can inspect at any time.",
  },
];

const useCases = [
  "Research archives",
  "Investigations",
  "Corporate records",
  "Compliance files",
  "Academic material",
  "Public records",
  "Reports & filings",
  "Historical collections",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-xs">
            <Network className="size-4" />
          </span>
          <span className="font-serif text-lg font-semibold tracking-tight">
            CaseOS
          </span>
        </span>
        <nav className="flex items-center gap-2">
          <Button
            variant="ghost"
            nativeButton={false}
            render={<Link href="/sign-in" />}
          >
            Sign in
          </Button>
          <Button nativeButton={false} render={<Link href="/dashboard" />}>
            Open workspace
          </Button>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        {/* Hero */}
        <section className="pt-20 pb-16 text-center">
          <p className="mb-4 text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Document intelligence
          </p>
          <h1 className="mx-auto max-w-4xl font-serif text-5xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-6xl">
            Understand a document collection you don&apos;t have time to read
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground">
            CaseOS reads your files, answers questions about them in plain
            language, and shows you the exact passage behind every claim — so
            you can trust what it tells you and check it in one click.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href="/dashboard" />}
            >
              Open the workspace
            </Button>
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<Link href="/sign-up" />}
            >
              Create an account
            </Button>
          </div>
        </section>

        {/* Product visualisation — layered documents resolving into a cited
            answer. Pure CSS transforms: no 3D runtime, no images, and it
            degrades to a clean static composition without motion. */}
        <section aria-hidden className="pb-20">
          <div className="relative mx-auto max-w-3xl">
            <div className="relative flex items-end justify-center gap-3 pb-10">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-28 w-20 rounded-lg border bg-card shadow-sm sm:h-36 sm:w-24"
                  style={{
                    transform: `perspective(900px) rotateX(14deg) rotateY(${(i - 2) * 7}deg) translateY(${Math.abs(i - 2) * 8}px)`,
                    opacity: 1 - Math.abs(i - 2) * 0.16,
                  }}
                >
                  <div className="flex h-full flex-col gap-1.5 p-2.5">
                    <div className="h-1.5 w-2/3 rounded-full bg-muted-foreground/25" />
                    <div className="h-1 w-full rounded-full bg-muted-foreground/15" />
                    <div className="h-1 w-full rounded-full bg-muted-foreground/15" />
                    <div className="h-1 w-4/5 rounded-full bg-muted-foreground/15" />
                    {i === 2 && (
                      <div className="h-1 w-3/4 rounded-full bg-citation/60" />
                    )}
                    <div className="h-1 w-full rounded-full bg-muted-foreground/15" />
                  </div>
                </div>
              ))}
            </div>

            {/* The answer the collection resolves into. */}
            <div className="relative mx-auto -mt-4 max-w-md rounded-xl border bg-card p-4 shadow-lg">
              <p className="font-serif text-sm leading-relaxed">
                The reporting threshold was raised to $50,000 in the March
                revision
                <sup className="mx-0.5 rounded bg-citation-surface px-1 font-sans text-[0.625rem] font-semibold text-citation ring-1 ring-citation/30">
                  S2
                </sup>
                , superseding the earlier $25,000 limit
                <sup className="mx-0.5 rounded bg-citation-surface px-1 font-sans text-[0.625rem] font-semibold text-citation ring-1 ring-citation/30">
                  S5
                </sup>
                .
              </p>
              <div className="mt-3 flex items-center gap-2 border-t pt-2.5 text-[0.6875rem] text-muted-foreground">
                <Quote className="size-3 shrink-0" />
                Grounded in 2 source passages
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t py-20">
          <h2 className="text-center font-serif text-3xl font-semibold tracking-tight text-balance">
            Upload. Ask. Verify.
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.title} className="flex flex-col gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-lg border bg-card text-primary shadow-xs">
                    <step.icon className="size-4" />
                  </span>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Principles */}
        <section className="border-t py-20">
          <div className="grid gap-8 sm:grid-cols-3">
            {principles.map((p) => (
              <div key={p.title} className="flex flex-col gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg border bg-card text-primary shadow-xs">
                  <p.icon className="size-4" />
                </span>
                <h3 className="font-semibold">{p.title}</h3>
                <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Use cases */}
        <section className="border-t py-20 text-center">
          <h2 className="font-serif text-2xl font-semibold tracking-tight">
            Built for any collection worth reading carefully
          </h2>
          <div className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-2">
            {useCases.map((useCase) => (
              <span
                key={useCase}
                className="rounded-full border bg-card px-3.5 py-1.5 text-sm text-muted-foreground shadow-xs"
              >
                {useCase}
              </span>
            ))}
          </div>
          <div className="mt-10">
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href="/dashboard" />}
            >
              Start analysing
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        CaseOS — an AI workspace for complex document collections
      </footer>
    </div>
  );
}
