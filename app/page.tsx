import { FileStack, Layers, Network, Quote, ScrollText, Search } from "lucide-react";
import Link from "next/link";

import { LandingHero } from "@/components/marketing/landing-hero";
import { AmbientBackground } from "@/components/ui/ambient-background";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/ui/motion/magnetic";
import { Reveal, RevealItem } from "@/components/ui/reveal";

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
    <div className="relative min-h-screen text-foreground">
      <AmbientBackground />

      <header className="sticky top-0 z-40 border-b border-glass-border">
        <div className="glass absolute inset-0 -z-10" />
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
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
            <Magnetic>
              <Button nativeButton={false} render={<Link href="/dashboard" />}>
                Open workspace
              </Button>
            </Magnetic>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <LandingHero />

        {/* How it works */}
        <section className="border-t border-border/60 py-20">
          <h2 className="text-center font-serif text-3xl font-semibold tracking-tight text-balance">
            Upload. Ask. Verify.
          </h2>
          <Reveal className="mt-12 grid gap-4 sm:grid-cols-3">
            {steps.map((step, i) => (
              <RevealItem
                key={step.title}
                className="group glass flex flex-col gap-3 rounded-2xl p-5 shadow-sm transition-[transform,box-shadow] duration-300 ease-(--ease-out-quart) hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-lg border bg-card text-primary shadow-xs transition-transform duration-300 group-hover:scale-110">
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
              </RevealItem>
            ))}
          </Reveal>
        </section>

        {/* Principles */}
        <section className="border-t border-border/60 py-20">
          <Reveal className="grid gap-4 sm:grid-cols-3">
            {principles.map((p) => (
              <RevealItem
                key={p.title}
                className="group glass flex flex-col gap-3 rounded-2xl p-5 shadow-sm transition-[transform,box-shadow] duration-300 ease-(--ease-out-quart) hover:-translate-y-1 hover:shadow-lg"
              >
                <span className="flex size-9 items-center justify-center rounded-lg border bg-card text-primary shadow-xs transition-transform duration-300 group-hover:scale-110">
                  <p.icon className="size-4" />
                </span>
                <h3 className="font-semibold">{p.title}</h3>
                <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
                  {p.body}
                </p>
              </RevealItem>
            ))}
          </Reveal>
        </section>

        {/* Use cases */}
        <section className="border-t border-border/60 py-20 text-center">
          <h2 className="font-serif text-2xl font-semibold tracking-tight">
            Built for any collection worth reading carefully
          </h2>
          <Reveal className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-2">
            {useCases.map((useCase) => (
              <RevealItem
                key={useCase}
                subtle
                className="glass rounded-full px-3.5 py-1.5 text-sm text-muted-foreground shadow-xs transition-transform duration-200 hover:-translate-y-0.5 hover:text-foreground"
              >
                {useCase}
              </RevealItem>
            ))}
          </Reveal>
          <div className="mt-10">
            <Magnetic strength={0.5}>
              <Button
                size="lg"
                nativeButton={false}
                render={<Link href="/dashboard" />}
                className="shadow-sm transition-shadow duration-300 hover:shadow-lg"
              >
                Start analysing
              </Button>
            </Magnetic>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        CaseOS — an AI workspace for complex document collections
      </footer>
    </div>
  );
}
