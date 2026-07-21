"use client";

import { motion, useReducedMotion } from "motion/react";

import { fadeItem, riseItem, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Staggered entrance wrapper.
 *
 * Exists so server components can have animated content without becoming
 * client components themselves — the page stays server-rendered and only this
 * thin wrapper ships to the browser. Children are passed through as ReactNode,
 * so a server-rendered card inside a Reveal is still server-rendered.
 *
 * Under reduced motion both components render a plain element with no motion
 * machinery at all, rather than an animation with zero duration.
 */
function Reveal({
  children,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "ul";
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return <Tag className={className}>{children}</Tag>;

  const MotionTag = motion[Tag];

  return (
    <MotionTag
      className={className}
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      {children}
    </MotionTag>
  );
}

function RevealItem({
  children,
  className,
  subtle = false,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  /** Smaller travel, for dense rows where 8px reads as a jump. */
  subtle?: boolean;
  as?: "div" | "li";
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return <Tag className={className}>{children}</Tag>;

  const MotionTag = motion[Tag];

  return (
    <MotionTag className={cn(className)} variants={subtle ? fadeItem : riseItem}>
      {children}
    </MotionTag>
  );
}

export { Reveal, RevealItem };
