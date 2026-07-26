"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

/**
 * Three-state theme control.
 *
 * A segmented control rather than a toggle, because "system" is a real choice
 * and a two-state switch silently discards it. The active pill is a single
 * shared element that slides between positions — the same `layoutId` technique
 * as the sidebar, so the two controls feel like one system.
 *
 * Renders a static placeholder until mounted: the resolved theme is unknown
 * during SSR, and guessing produces a flash of the wrong state.
 */
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => setMounted(true), []);

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="flex items-center gap-0.5 rounded-xl bg-surface-lowest/60 p-1 ring-1 ring-border"
    >
      {OPTIONS.map((option) => {
        const active = mounted && theme === option.value;
        const Icon = option.icon;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.label}
            title={option.label}
            onClick={() => setTheme(option.value)}
            className={cn(
              "relative flex h-7 flex-1 items-center justify-center rounded-lg outline-none",
              "transition-colors duration-[140ms]",
              "focus-visible:ring-3 focus-visible:ring-ring/50",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId="theme-toggle-active"
                aria-hidden
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 420, damping: 34 }
                }
                className="absolute inset-0 -z-10 rounded-lg bg-surface-highest shadow-sm"
              />
            )}
            <Icon className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}

export { ThemeToggle };
