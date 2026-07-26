"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Theme provider.
 *
 * `attribute="class"` toggles `.dark` on <html>, which is what the
 * `@custom-variant dark (&:is(.dark *))` rule in globals.css keys off.
 *
 * `disableTransitionOnChange` matters more than it sounds: without it, every
 * element carrying a colour transition animates independently when the theme
 * flips, producing a visible smear across the page. Switching should be
 * instantaneous; the animation budget belongs to interactions, not repaints.
 *
 * Dark is the default because the design is authored dark-first — the obsidian
 * ground and cyan light are its true form. `enableSystem` stays on so a user
 * who has expressed an OS preference still gets it, and the toggle can offer
 * System as an explicit third choice.
 */
function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}

export { ThemeProvider };
