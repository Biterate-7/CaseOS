import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Siglum } from "@/components/ui/siglum";

export const metadata = {
  title: "CaseOS — AI workspace for complex document collections",
  description:
    "Upload a document collection, ask questions in plain language, and get answers grounded in your own sources with a citation to the exact page.",
};

/**
 * The landing page.
 *
 * The hero is a specimen, not an illustration: a real, correctly-typeset
 * fragment of the product's own output, at true size, in the product's own
 * faces. It is impossible to confuse with a competitor's stock artwork
 * because it is made of this product.
 *
 * No feature-card grid, no numbered steps, no use-case chips, no animated
 * background. Impact comes from measure and space, and the type ceiling
 * (39px) is the same here as everywhere else in the product — marketing is
 * not a licence to break the system.
 */

const sections = [
  {
    heading: "What it does with your documents",
    body: "Every file is parsed, split into passages, and indexed inside a single project. Retrieval is scoped to that project in the query itself — not by policy, not by a filter someone could forget to apply.",
  },
  {
    heading: "What happens when the documents don't cover it",
    body: "It says so. Answers can be widened to the model's own knowledge or to verified web sources, but that material is marked as a different hand and is never cited as evidence from your collection.",
  },
  {
    heading: "What the record holds",
    body: "Every upload, question, and review decision is written to a permanent activity record, scoped to the workspace and exportable. Nobody has to reconstruct who concluded what, or from which page.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-(--container-page) items-center justify-between px-6 py-4">
          <span className="flex items-baseline gap-2.5">
            <span className="font-mono text-label-md text-foreground">[C]</span>
            <span className="text-label-md font-medium tracking-tight text-foreground">
              CaseOS
            </span>
          </span>
          <nav className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href="/sign-in" />}
            >
              Sign in
            </Button>
            <Button
              size="sm"
              nativeButton={false}
              render={<Link href="/dashboard" />}
            >
              Open workspace
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-(--container-page) px-6">
        {/* ---------- Thesis + specimen ---------- */}
        <section className="grid gap-12 pt-24 pb-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-16">
          <div>
            <h1 className="max-w-xl font-serif text-display-lg text-balance text-foreground">
              Every sentence it writes, you can check.
            </h1>
            <p className="mt-8 max-w-md text-body-lg text-pretty text-muted-foreground">
              CaseOS answers questions about a document collection and attaches
              the passage behind every claim — the document, the page, the exact
              words.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button
                nativeButton={false}
                render={<Link href="/dashboard" />}
              >
                Open the workspace
              </Button>
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href="/sign-up" />}
              >
                Create an account
              </Button>
            </div>
          </div>

          {/* The specimen. Real output, real type, real sigla — static and
              inert. Claim on the leaf; source cut into the desk beneath it. */}
          <Specimen />
        </section>

        {/* ---------- Three statements ---------- */}
        {sections.map((section) => (
          <section
            key={section.heading}
            className="grid gap-x-16 gap-y-3 border-t border-border py-16 lg:grid-cols-[minmax(0,20rem)_minmax(0,34rem)]"
          >
            <h2 className="text-headline-md text-balance text-foreground">
              {section.heading}
            </h2>
            <p className="font-serif text-body-lg text-pretty text-muted-foreground">
              {section.body}
            </p>
          </section>
        ))}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-(--container-page) px-6 py-8">
          <p className="text-meta-sm text-muted-foreground">
            CaseOS — an AI workspace for complex document collections
          </p>
        </div>
      </footer>
    </div>
  );
}

/**
 * A true-size fragment of product output. Not decorative: this is what the
 * inquiry surface actually renders, down to the siglum treatment and the
 * locator in mono.
 */
function Specimen() {
  return (
    <div aria-hidden className="select-none">
      {/* The answer — a leaf, flat on the desk, no shadow. */}
      <div className="rounded-xl border border-border bg-card p-6">
        <p className="border-l-2 border-input pl-3.5 font-serif text-body-md text-muted-foreground italic">
          What changed about the reporting threshold?
        </p>

        <p className="mt-5 font-serif text-body-lg text-foreground">
          The reporting threshold was raised to $50,000 in the March revision
          <Siglum label="S2" className="mx-0.5 align-super" />, superseding the
          earlier $25,000 limit
          <Siglum label="S5" className="mx-0.5 align-super" />.
        </p>

        <p className="mt-5 border-t border-border pt-4 text-meta-sm text-muted-foreground">
          Grounded in 2 source passages · fully supported by this project&apos;s
          documents
        </p>
      </div>

      {/* The source — recessed. Material the product did not author. */}
      <div className="mt-3 rounded-xl bg-surface-lowest p-5 shadow-[inset_0_1px_2px_0_var(--shadow-tint-weak)]">
        <div className="flex items-start gap-3">
          <Siglum label="S2" />
          <div className="min-w-0">
            <p className="border-l-2 border-citation pl-3.5 font-serif text-body-md text-muted-foreground">
              …effective 1 March, the threshold for mandatory reporting of
              vendor payments is raised from $25,000 to $50,000 per
              engagement…
            </p>
            <p className="mt-3 flex items-center gap-2 text-meta-sm text-muted-foreground">
              <span className="truncate">Vendor Compliance Review 2019.pdf</span>
              <span className="shrink-0 font-mono text-meta-xs tabular-nums">
                p. 412
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
