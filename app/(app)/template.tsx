"use client";

import { motion, useReducedMotion } from "motion/react";

import { pageTransition } from "@/lib/motion";

/**
 * Route transition for the authenticated shell.
 *
 * `template.tsx` rather than `layout.tsx` on purpose: a layout persists across
 * navigations and would animate exactly once, on first mount. A template
 * remounts per route, which is what makes the transition fire on every move.
 *
 * The sidebar lives in the layout above this, so it stays perfectly still
 * while content changes — the chrome is a fixed frame and only the page moves.
 */
export default function AppTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return <>{children}</>;

  return (
    <motion.div initial="hidden" animate="visible" variants={pageTransition}>
      {children}
    </motion.div>
  );
}
