import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { OnboardingForm } from "@/components/onboarding-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";

export const metadata = { title: "Set up your firm" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const existing = await db.user.findUnique({ where: { clerkId } });
  if (existing) redirect("/dashboard");

  const clerkUser = await currentUser();
  const defaultName =
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Set up your firm</CardTitle>
          <CardDescription>
            CaseOS scopes every matter, document, and AI interaction to your
            firm. Create your firm workspace to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingForm defaultName={defaultName} />
        </CardContent>
      </Card>
    </div>
  );
}
