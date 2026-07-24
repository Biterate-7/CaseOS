"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useRef } from "react";

/**
 * Magnetic hover: the element is gently pulled toward the cursor while the
 * pointer is near, then springs back to rest on leave. A classic "expensive"
 * micro-interaction for primary calls to action.
 *
 * Wraps its child in an inline-block span that translates on the GPU. Under
 * reduced motion it renders the child untouched — no wrapper, no listeners.
 */
export function Magnetic({
  children,
  className,
  /** Fraction of the cursor's offset the element follows (0–1). */
  strength = 0.4,
}: {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const spring = { stiffness: 260, damping: 18, mass: 0.5 };
  const sx = useSpring(x, spring);
  const sy = useSpring(y, spring);

  if (reduce) return <>{children}</>;

  return (
    <motion.span
      ref={ref}
      onMouseMove={(e) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        x.set((e.clientX - (rect.left + rect.width / 2)) * strength);
        y.set((e.clientY - (rect.top + rect.height / 2)) * strength);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      style={{ x: sx, y: sy }}
      className={className ? `inline-flex ${className}` : "inline-flex"}
    >
      {children}
    </motion.span>
  );
}
