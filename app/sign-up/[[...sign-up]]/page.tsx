import { SignUp } from "@clerk/nextjs";

export const metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-6 py-10">
      <SignUp />
    </div>
  );
}
