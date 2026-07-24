"use client";

import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/**
 * Counts a number up from zero when it first scrolls into view, easing to a
 * settle. The kind of detail that makes a dashboard feel alive rather than
 * merely printed.
 *
 * Runs once. Under reduced motion (or before it enters the viewport) it simply
 * shows the final value — no animation frames scheduled. Uses the shared
 * ease-out-quart curve so it decelerates the same way everything else does.
 */
export function CountUp({
  value,
  className,
  durationMs = 1100,
  format = (n: number) => n.toLocaleString(),
}: {
  value: number;
  className?: string;
  durationMs?: number;
  format?: (n: number) => string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    if (!inView) return;
    const controls = animate(0, value, {
      duration: durationMs / 1000,
      ease: [0.25, 1, 0.5, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value, reduce, durationMs]);

  return (
    <span ref={ref} className={className}>
      {format(display)}
    </span>
  );
}
