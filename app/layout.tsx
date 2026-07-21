import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display face only — page titles, project names, hero. Adds editorial weight
// without turning the product into a brochure. Applied deliberately
// via `font-serif`, never as a component default.
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
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
        className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable}`}
      >
        <body className="antialiased">
          <ThemeProvider>{children}</ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
