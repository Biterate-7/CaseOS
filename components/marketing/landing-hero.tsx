"use client";

import { Quote } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/ui/motion/magnetic";
import { Tilt } from "@/components/ui/motion/tilt";
import { springSoft, staggerContainer } from "@/lib/motion";

/** One entrance variant, reused so every hero element rises on the same curve. */
const rise = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: springSoft },
};

/**
 * The landing hero — the first thing a visitor sees, so it carries the whole
 * design language: a gradient headline that slowly catches light, calls to
 * action that lean toward the cursor, and a document composition that tilts
 * under the pointer and catches a glare, resolving into a cited answer.
 *
 * All entrance and interaction motion is spring-based and disabled under
 * reduced motion (the composition falls back to its static 3D layout, the
 * headline to a flat gradient, the buttons to plain buttons).
 */
export function LandingHero() {
  const reduce = useReducedMotion();

  return (
    <motion.section
      className="pt-20 pb-16 text-center"
      variants={staggerContainer}
      initial={reduce ? false : "hidden"}
      animate="visible"
    >
      <motion.p
        variants={rise}
        className="mb-4 text-xs font-medium tracking-widest text-muted-foreground uppercase"
      >
        Document intelligence
      </motion.p>

      <motion.h1
        variants={rise}
        className="text-gradient mx-auto max-w-4xl font-serif text-5xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-6xl"
      >
        Understand a document collection you don&apos;t have time to read
      </motion.h1>

      <motion.p
        variants={rise}
        className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground"
      >
        CaseOS reads your files, answers questions about them in plain language,
        and shows you the exact passage behind every claim — so you can trust
        what it tells you and check it in one click.
      </motion.p>

      <motion.div
        variants={rise}
        className="mt-9 flex flex-wrap justify-center gap-3"
      >
        <Magnetic strength={0.5}>
          <Button
            size="lg"
            nativeButton={false}
            render={<Link href="/dashboard" />}
            className="shadow-sm transition-shadow duration-300 hover:shadow-lg"
          >
            Open the workspace
          </Button>
        </Magnetic>
        <Magnetic strength={0.35}>
          <Button
            size="lg"
            variant="outline"
            nativeButton={false}
            render={<Link href="/sign-up" />}
          >
            Create an account
          </Button>
        </Magnetic>
      </motion.div>

      {/* Product visualisation — layered documents resolving into a cited
          answer. Tilts under the cursor and catches a glare; degrades to a
          clean static composition without motion. */}
      <motion.div
        aria-hidden
        variants={rise}
        className="mt-16"
      >
        <div className="relative mx-auto max-w-3xl">
          <Tilt max={9} className="rounded-3xl">
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
          </Tilt>

          {/* The answer the collection resolves into — springs in last and
              floats on frosted glass. */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ ...springSoft, delay: reduce ? 0 : 0.35 }}
            className="glass animate-breathe relative mx-auto -mt-4 max-w-md rounded-xl p-4 shadow-lg"
          >
            <p className="font-serif text-sm leading-relaxed text-foreground">
              The reporting threshold was raised to $50,000 in the March revision
              <sup className="mx-0.5 rounded bg-citation-surface px-1 font-sans text-[0.625rem] font-semibold text-citation ring-1 ring-citation/30">
                S2
              </sup>
              , superseding the earlier $25,000 limit
              <sup className="mx-0.5 rounded bg-citation-surface px-1 font-sans text-[0.625rem] font-semibold text-citation ring-1 ring-citation/30">
                S5
              </sup>
              .
            </p>
            <div className="mt-3 flex items-center gap-2 border-t border-glass-border pt-2.5 text-[0.6875rem] text-muted-foreground">
              <Quote className="size-3 shrink-0" />
              Grounded in 2 source passages
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.section>
  );
}
