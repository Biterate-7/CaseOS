import "server-only";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";

export type SessionUser = {
  id: string;
  clerkId: string;
  email: string;
  name: string;
  role: "ADMIN" | "ATTORNEY" | "PARALEGAL" | "STAFF";
  firmId: string;
  firmName: string;
};

/**
 * The authorization chokepoint. Every page and server action that touches
 * firm data must obtain the user through this function and scope all queries
 * by the returned firmId. Redirects to sign-in when unauthenticated and to
 * onboarding when the Clerk user has no Firm/User rows yet.
 */
export async function requireUser(): Promise<SessionUser> {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const user = await db.user.findUnique({
    where: { clerkId },
    include: { firm: { select: { name: true } } },
  });
  if (!user) redirect("/onboarding");

  return {
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    name: user.name,
    role: user.role,
    firmId: user.firmId,
    firmName: user.firm.name,
  };
}
