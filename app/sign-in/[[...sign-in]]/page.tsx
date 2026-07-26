import { SignIn } from "@clerk/nextjs";

import { AuthShell } from "@/components/auth-shell";
import { clerkAppearance } from "@/lib/clerk-appearance";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <AuthShell
      className="flex w-auto max-w-none justify-center"
      footer={<>Grounded in your documents. Every answer cited.</>}
    >
      <div className="glass rounded-3xl p-8 shadow-2xl">
        <SignIn appearance={clerkAppearance} />
      </div>
    </AuthShell>
  );
}
