"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { useRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Cursor-driven 3D tilt with a light glare that tracks the pointer — the card
 * behaves like a physical surface catching a light source.
 *
 * Physics, not tweens: the rotation is spring-damped so it settles with weight
 * and never snaps. Only `transform` (rotateX/rotateY) and the glare's opacity
 * animate, both GPU-composited. Under reduced motion it renders a plain div
 * with no listeners, no springs, and no perspective — completely inert.
 */
export function Tilt({
  children,
  className,
  /** Max rotation in degrees at the corners. */
  max = 7,
  /** Show the pointer-tracking light glare. */
  glare = true,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
  glare?: boolean;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  // Normalised pointer position within the element, 0..1 on each axis, and an
  // active flag that fades the glare in only while the pointer is over.
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const active = useMotionValue(0);

  const spring = { stiffness: 180, damping: 18, mass: 0.6 };
  const sx = useSpring(px, spring);
  const sy = useSpring(py, spring);
  const glareOpacity = useSpring(active, { stiffness: 200, damping: 30 });

  const rotateX = useTransform(sy, [0, 1], [max, -max]);
  const rotateY = useTransform(sx, [0, 1], [-max, max]);
  const glareX = useTransform(sx, [0, 1], ["0%", "100%"]);
  const glareY = useTransform(sy, [0, 1], ["0%", "100%"]);
  const glareBg = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, color-mix(in oklch, var(--glow), transparent 55%), transparent 45%)`;

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      onMouseMove={(e) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        px.set((e.clientX - rect.left) / rect.width);
        py.set((e.clientY - rect.top) / rect.height);
      }}
      onMouseEnter={() => active.set(1)}
      onMouseLeave={() => {
        px.set(0.5);
        py.set(0.5);
        active.set(0);
      }}
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
      className={cn("relative", className)}
    >
      {children}
      {glare && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-soft-light"
          style={{ background: glareBg, opacity: glareOpacity }}
        />
      )}
    </motion.div>
  );
}
