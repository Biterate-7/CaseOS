import { SignIn } from "@clerk/nextjs";

import { AuthShell } from "@/components/auth-shell";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <AuthShell
      className="flex w-auto max-w-none justify-center"
      footer={
        <>
          Matter-scoped, citation-backed, audit-logged.
        </>
      }
    >
      <SignIn />
    </AuthShell>
  );
}
