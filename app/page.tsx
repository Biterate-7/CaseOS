import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const principles = [
  {
    title: "Matter-scoped",
    body: "Every AI action runs inside a single matter. Retrieval never crosses a privilege boundary — structurally, not by policy.",
  },
  {
    title: "Citation-backed",
    body: "Every claim links to the exact passage in your documents that supports it, verified before it reaches your screen.",
  },
  {
    title: "Audit-logged",
    body: "Every AI interaction is a permanent, reviewable record. Show a court or a client exactly what was generated, when, and from what.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-lg font-semibold tracking-tight">CaseOS</span>
        <nav className="flex items-center gap-3">
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

      <main className="mx-auto max-w-5xl px-6">
        <section className="py-24 text-center">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-muted-foreground">
            For firms of 2–50 attorneys
          </p>
          <h1 className="mx-auto max-w-3xl text-balance text-5xl font-semibold tracking-tight">
            The legal AI workspace your malpractice carrier would approve of
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
            CaseOS grounds every AI answer in your matter&apos;s own documents,
            cites the exact source passage, and records everything in an audit
            log — so your firm can adopt AI without adopting the risk.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href="/dashboard" />}
            >
              See the workspace
            </Button>
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<Link href="/sign-in" />}
            >
              Sign in
            </Button>
          </div>
        </section>

        <section className="grid gap-4 pb-24 sm:grid-cols-3">
          {principles.map((p) => (
            <Card key={p.title}>
              <CardContent className="pt-6">
                <h2 className="mb-2 font-semibold">{p.title}</h2>
                <p className="text-sm text-muted-foreground">{p.body}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        CaseOS — AI-native legal workspace
      </footer>
    </div>
  );
}
