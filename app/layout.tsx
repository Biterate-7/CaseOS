import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Hanken_Grotesk, Inter, JetBrains_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

// Reading face. Everything that is prose or UI label.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Display face — page titles, hero, section headings. Tighter and more
// geometric than Inter, which is what gives headings their editorial weight.
const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  display: "swap",
});

// Metadata face. Timestamps, counts, record ids, citation markers, status
// labels — the typographic signal for "machine-generated fact".
const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
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
        className={`${inter.variable} ${hankenGrotesk.variable} ${jetBrainsMono.variable}`}
      >
        <body className="antialiased">
          <ThemeProvider>{children}</ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
