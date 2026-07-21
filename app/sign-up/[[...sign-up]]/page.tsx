import { SignUp } from "@clerk/nextjs";

import { AuthShell } from "@/components/auth-shell";

export const metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <AuthShell
      className="flex w-auto max-w-none justify-center"
      footer={<>You&apos;ll set up your firm workspace next.</>}
    >
      <SignUp />
    </AuthShell>
  );
}
