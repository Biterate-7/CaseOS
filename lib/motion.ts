import type { Transition, Variants } from "motion/react";

/**
 * Shared motion vocabulary — Apparatus.
 *
 * Motion reports a change of state that has already occurred; it is a
 * receipt, not an event. Four laws follow, and every export here obeys them:
 *
 *   1. Causation — nothing moves that the reader did not cause. No ambient
 *      motion, no loops, with the single exception of the running-work ring
 *      (an indeterminate indicator for genuinely outstanding server work).
 *   2. Termination — every animation ends.
 *   3. Subordination — no animation delays the ability to act; elements are
 *      interactive the instant they are present.
 *   4. Proportion — duration is a function of distance travelled, not of
 *      importance.
 *
 * Three curves, no springs. Spring physics imply mass and elasticity; paper
 * has mass and no elasticity, so overshoot is never used. `settle` is for
 * anything arriving, opening, or expanding. `depart` is for anything
 * leaving. `track` is linear, for anything following a pointer or reporting
 * a measured value.
 *
 * Only `transform` and `opacity` are animated — both are GPU-composited and
 * hold 60fps without forcing layout. Nothing here animates width, height,
 * top, or left on a per-frame basis.
 */

export const settle = [0.2, 0, 0, 1] as const;
export const depart = [0.4, 0, 1, 1] as const;
export const track = "linear" as const;

/** Legacy names, retained for existing call sites. Both now resolve to Settle. */
export const easeOutQuart = settle;
export const easeLiquid = settle;

/**
 * Duration scale, matching the spec's four bands. Nothing in the product
 * exceeds `full` (280ms); anything encountered more than once a minute is
 * capped at `local` (140ms) regardless of the distance it travels.
 */
export const durationImmediate = 0.08; // in-place property change
export const durationLocal = 0.14; // small local movement, disclosure
export const durationRegional = 0.2; // menus, popovers, rails, panels
export const durationFull = 0.28; // modals, sheets, full-surface transitions

/** Exit is 75% of the matching entrance — dismissed things should be gone. */
export const tweenLocal: Transition = { duration: durationLocal, ease: settle };
export const tweenLocalExit: Transition = {
  duration: durationLocal * 0.75,
  ease: depart,
};
export const tweenRegional: Transition = {
  duration: durationRegional,
  ease: settle,
};
export const tweenRegionalExit: Transition = {
  duration: durationRegional * 0.75,
  ease: depart,
};
export const tweenFull: Transition = { duration: durationFull, ease: settle };
export const tweenFullExit: Transition = {
  duration: durationFull * 0.75,
  ease: depart,
};

/** Legacy names, retained for existing call sites. No overshoot: critically
 *  damped springs read identically to a Settle tween but keep the existing
 *  `type: "spring"` call sites working without edits. */
export const springSnappy: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 42,
};
export const springSoft: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 36,
};
export const tweenFast: Transition = tweenLocal;
export const tweenBase: Transition = tweenRegional;
export const tweenPanel: Transition = tweenFull;
export const tweenHero: Transition = tweenFull;

/**
 * Staggered entrance, used sparingly. A wave across more than a handful of
 * rows delays the last one for no benefit (e.g. 20 rows at 40ms delays row
 * 20 by 800ms) — prefer a single cross-fade over a long list.
 */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.03, delayChildren: 0 },
  },
};

export const riseItem: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: tweenRegional },
};

export const fadeItem: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: tweenRegional },
};

/** Route-level transition. No scale — a page arriving is a cross-fade. */
export const pageTransition: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: tweenRegional },
};

/**
 * Collapses a transition to zero when the OS asks for reduced motion.
 * Reduced motion means instantaneous, not shorter — a 60ms version of a
 * 200ms animation still moves, and the reader who asked for stillness asked
 * for stillness.
 */
export function respectMotion(
  reduce: boolean | null,
  transition: Transition
): Transition {
  return reduce ? { duration: 0 } : transition;
}
