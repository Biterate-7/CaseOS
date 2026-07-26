/**
 * Shared Clerk `appearance` config, so the embedded sign-in/sign-up widgets
 * read as CaseOS surfaces rather than an unstyled third-party form dropped
 * into the page.
 *
 * Uses CSS custom properties (`var(--token)`) rather than resolved values, so
 * this stays correct across the light/dark theme swap without needing to know
 * which theme is active — Clerk's shadow DOM inherits the custom properties
 * from the document like any other CSS.
 */
// Typed structurally rather than against Clerk's `Appearance` export: that
// type lives in @clerk/types, which isn't a direct dependency here (only
// pulled in transitively by @clerk/nextjs), so importing it risks resolving
// to nothing in strict module resolution. Both SignIn/SignUp accept this
// shape via their own prop types, which is all that's needed for `tsc` to
// check the call sites.
export const clerkAppearance = {
  variables: {
    colorPrimary: "var(--primary)",
    colorBackground: "transparent",
    colorText: "var(--foreground)",
    colorTextSecondary: "var(--muted-foreground)",
    colorInputBackground: "var(--surface-lowest)",
    colorInputText: "var(--foreground)",
    colorDanger: "var(--rejected)",
    colorSuccess: "var(--grounded)",
    borderRadius: "0.75rem",
    fontFamily: "var(--font-inter)",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none bg-transparent",
    card: "w-full gap-5 rounded-none bg-transparent p-0 shadow-none",
    header: "hidden",
    footer: "hidden",
    dividerRow: "my-1",
    dividerLine: "bg-border",
    dividerText: "font-mono text-meta-xs uppercase text-muted-foreground",
    socialButtonsBlockButton:
      "h-10 rounded-xl border border-border bg-surface-lowest/60 text-sm text-foreground transition-colors duration-150 hover:bg-surface-highest",
    socialButtonsBlockButtonText: "text-sm font-medium",
    formFieldLabel: "text-label-md text-foreground",
    formFieldInput:
      "h-10 rounded-xl border border-border bg-surface-lowest/60 text-sm text-foreground shadow-inner outline-none focus:border-primary/50 focus:bg-surface focus:ring-3 focus:ring-ring/40",
    formButtonPrimary:
      "h-10 rounded-xl bg-primary text-sm text-primary-foreground shadow-sm hover:bg-primary-bright normal-case",
    footerActionText: "text-body-sm text-muted-foreground",
    footerActionLink: "text-primary hover:underline",
    identityPreview: "rounded-xl border border-border bg-surface-lowest/60",
    formResendCodeLink: "text-primary",
    otpCodeFieldInput: "border-border bg-surface-lowest/60 text-foreground",
  },
};
