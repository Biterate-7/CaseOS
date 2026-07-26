import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";


import { AuthShell } from "@/components/auth-shell";
import { OnboardingForm } from "@/components/onboarding-form";
import { db } from "@/lib/db";

export const metadata = { title: "Set up your workspace" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const existing = await db.user.findUnique({ where: { clerkId } });
  if (existing) redirect("/dashboard");

  const clerkUser = await currentUser();
  const email = clerkUser?.primaryEmailAddress?.emailAddress?.toLowerCase();

  // Someone who was invited and then signed up arrives here, where the only
  // offer is "create a workspace" — which would strand them in a new, empty
  // one instead of the workspace they were invited to. Send them to the
  // invitation instead.
  //
  // Expiry is compared here rather than filtered on status, because nothing
  // sweeps PENDING invitations to EXPIRED on a schedule.
  if (email) {
    const invitation = await db.invitation.findFirst({
      where: { email, status: "PENDING", expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { token: true },
    });
    if (invitation) redirect(`/invite/${invitation.token}`);
  }

  const defaultName =
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || "";

  return (
    <AuthShell
      footer={
        <>Your workspace is the outer boundary. Nothing crosses it — ever.</>
      }
    >
      <div className="flex flex-col gap-6 rounded-xl border border-border bg-card p-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-headline-md text-foreground">
            Set up your workspace
          </h1>
          <p className="font-serif text-body-lg leading-relaxed text-muted-foreground">
            CaseOS scopes every project, document, and AI interaction to your
            workspace. Create yours to get started.
          </p>
        </div>
        <OnboardingForm defaultName={defaultName} />
      </div>
    </AuthShell>
  );
}
