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

      <header className="glass-panel sticky top-0 z-40 border-b border-border">
        <div className="mx-auto flex max-w-(--container-page) items-center justify-between px-6 py-5">
          <span className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-bright text-primary-foreground shadow-lg shadow-[var(--glow)]">
              <Network className="size-4.5" />
            </span>
            <span className="font-display text-headline-xs text-foreground">
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

      <main className="mx-auto max-w-(--container-page) px-6">
        <LandingHero />

        {/* How it works */}
        <section className="border-t border-border/60 py-24">
          <h2 className="text-center font-display text-headline-lg text-balance text-foreground">
            Upload. Ask. Verify.
          </h2>
          <Reveal className="mt-14 grid gap-gutter sm:grid-cols-3">
            {steps.map((step, i) => (
              <RevealItem
                key={step.title}
                className="group glass flex flex-col gap-4 rounded-3xl p-7 shadow-sm transition-[transform,box-shadow] duration-300 ease-(--ease-liquid) hover:-translate-y-1 hover:shadow-xl motion-reduce:hover:translate-y-0"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/20 transition-transform duration-300 group-hover:scale-110">
                    <step.icon className="size-4.5" />
                  </span>
                  <span className="font-mono text-meta-xs text-muted-foreground tabular-nums">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="font-display text-headline-xs text-foreground">
                  {step.title}
                </h3>
                <p className="text-body-sm leading-relaxed text-pretty text-muted-foreground">
                  {step.body}
                </p>
              </RevealItem>
            ))}
          </Reveal>
        </section>

        {/* Principles */}
        <section className="border-t border-border/60 py-24">
          <Reveal className="grid gap-gutter sm:grid-cols-3">
            {principles.map((p) => (
              <RevealItem
                key={p.title}
                className="group glass flex flex-col gap-4 rounded-3xl p-7 shadow-sm transition-[transform,box-shadow] duration-300 ease-(--ease-liquid) hover:-translate-y-1 hover:shadow-xl motion-reduce:hover:translate-y-0"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/20 transition-transform duration-300 group-hover:scale-110">
                  <p.icon className="size-4.5" />
                </span>
                <h3 className="font-display text-headline-xs text-foreground">
                  {p.title}
                </h3>
                <p className="text-body-sm leading-relaxed text-pretty text-muted-foreground">
                  {p.body}
                </p>
              </RevealItem>
            ))}
          </Reveal>
        </section>

        {/* Use cases */}
        <section className="border-t border-border/60 py-24 text-center">
          <h2 className="font-display text-headline-md text-foreground">
            Built for any collection worth reading carefully
          </h2>
          <Reveal className="mx-auto mt-9 flex max-w-3xl flex-wrap justify-center gap-2.5">
            {useCases.map((useCase) => (
              <RevealItem
                key={useCase}
                subtle
                className="glass rounded-full px-4 py-2 text-body-sm text-muted-foreground shadow-xs transition-[transform,color] duration-200 hover:-translate-y-0.5 hover:text-primary"
              >
                {useCase}
              </RevealItem>
            ))}
          </Reveal>
          <div className="mt-12">
            <Magnetic strength={0.5}>
              <Button
                size="xl"
                variant="hero"
                nativeButton={false}
                render={<Link href="/dashboard" />}
              >
                Start analysing
              </Button>
            </Magnetic>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-10 text-center font-mono text-meta-xs text-muted-foreground">
        CaseOS — an AI workspace for complex document collections
      </footer>
    </div>
  );
}
