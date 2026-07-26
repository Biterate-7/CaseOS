import { SignUp } from "@clerk/nextjs";

import { AuthShell } from "@/components/auth-shell";
import { clerkAppearance } from "@/lib/clerk-appearance";

export const metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <AuthShell
      className="flex w-auto max-w-none justify-center"
      footer={<>You&apos;ll set up your workspace next.</>}
    >
      <div className="glass rounded-xl p-8 shadow-lg">
        <SignUp appearance={clerkAppearance} />
      </div>
    </AuthShell>
  );
}
