import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { IBM_Plex_Mono, Public_Sans, Source_Serif_4 } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

// Text face — prose. Answers, passages, descriptions. Charter's spirit (large
// x-height, sturdy stems, built to survive bad rendering) via the closest
// available serif with the same transitional lineage.
const sourceSerif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

// Interface face — everything that is chrome: labels, controls, headings,
// captions. Deliberately neutral so it never competes with the text face.
const publicSans = Public_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

// Data face — sigla and locators only. Never timestamps, counts, or labels.
const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CaseOS",
    template: "%s · CaseOS",
  },
  description:
    "An AI workspace for understanding, organising, and extracting insights from complex document collections.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/onboarding"
    >
      {/* Font variables belong on <html>, not <body>: globals.css resolves
          `font-sans` at the html level, so declaring them lower means the
          family resolves to nothing and the browser falls back to a serif
          default. */}
      {/* suppressHydrationWarning: next-themes writes the theme class onto
          <html> before React hydrates, so server and client markup
          intentionally differ on this one element. */}
      <html
        lang="en"
        suppressHydrationWarning
        className={`${sourceSerif.variable} ${publicSans.variable} ${plexMono.variable}`}
      >
        <body className="antialiased">
          <ThemeProvider>{children}</ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
