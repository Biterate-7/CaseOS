import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display face only — page titles, matter names, hero. Signals the profession
// without turning the product into a law-firm brochure. Applied deliberately
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
    "The AI-native legal workspace. Matter-scoped, citation-backed, audit-logged.",
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
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable}`}
      >
        <body className="antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
