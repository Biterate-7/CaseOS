import type { Transition, Variants } from "motion/react";

/**
 * Shared motion vocabulary.
 *
 * Every animation in the product draws from this file so timing and physics
 * stay consistent — the thing that separates a designed interface from a
 * collection of individually-animated components.
 *
 * Two rules hold throughout:
 *
 * 1. Only `transform` and `opacity` are animated. Both are composited on the
 *    GPU, so they hold 60fps without touching layout. Animating width, height,
 *    top, or left forces reflow on every frame and is the usual cause of
 *    janky "premium" interfaces.
 *
 * 2. Entrances are springs, exits are short tweens. Things arriving should
 *    settle with weight; things leaving should get out of the way quickly.
 *    Symmetric enter/exit timing reads as sluggish.
 */

/** Interactive elements: nav pills, toggles, anything that tracks a pointer. */
export const springSnappy: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 34,
};

/** Content arriving on screen. Slightly softer, settles without overshoot. */
export const springSoft: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 30,
};

/** Non-spring easing, matching --ease-out-quart in globals.css. */
export const easeOutQuart = [0.25, 1, 0.5, 1] as const;

/**
 * The signature curve, matching --ease-liquid in globals.css. A long,
 * decelerating settle that makes panels feel weighted rather than snappy. Use
 * it for anything large that moves: panels, sheets, hero reveals.
 */
export const easeLiquid = [0.23, 1, 0.32, 1] as const;

export const tweenFast: Transition = { duration: 0.18, ease: easeOutQuart };
export const tweenBase: Transition = { duration: 0.24, ease: easeOutQuart };
/** Large surfaces. Slow enough to read as weight, short enough to not block. */
export const tweenPanel: Transition = { duration: 0.4, ease: easeLiquid };
/** Hero and route-level moments. */
export const tweenHero: Transition = { duration: 0.7, ease: easeLiquid };

/**
 * Staggered container. Children rise into place in sequence rather than all
 * at once, which reads as composed instead of abrupt.
 *
 * `delayChildren` is deliberately small — a long lead-in feels slow on repeat
 * visits, and users see this on every navigation.
 */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.045, delayChildren: 0.03 },
  },
};

/** Standard child of `staggerContainer`. 8px is enough to read as motion. */
export const riseItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: springSoft },
};

/** Subtler variant for dense rows where 8px would look like a jump. */
export const fadeItem: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: tweenBase },
};

/** Route-level transition. Scale is barely perceptible by design. */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 6, scale: 0.995 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: easeOutQuart },
  },
};

/**
 * Collapses a transition to zero when the OS asks for reduced motion.
 *
 * globals.css already neutralises CSS transitions, but Framer Motion animates
 * via JS and ignores that rule entirely — so motion has to be disabled here as
 * well or reduced-motion users still get movement.
 */
export function respectMotion(
  reduce: boolean | null,
  transition: Transition
): Transition {
  return reduce ? { duration: 0 } : transition;
}
