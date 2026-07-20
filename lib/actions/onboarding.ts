"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";

export type OnboardingResult = { ok: false; error: string };

export async function completeOnboarding(
  formData: FormData
): Promise<OnboardingResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const existing = await db.user.findUnique({ where: { clerkId } });
  if (existing) redirect("/dashboard");

  const firmName = String(formData.get("firmName") ?? "").trim();
  const userName = String(formData.get("userName") ?? "").trim();
  if (firmName.length < 2) {
    return { ok: false, error: "Enter your firm's name (at least 2 characters)." };
  }
  if (userName.length < 2) {
    return { ok: false, error: "Enter your name (at least 2 characters)." };
  }

  const clerkUser = await currentUser();
  const email = clerkUser?.primaryEmailAddress?.emailAddress;
  if (!email) {
    return { ok: false, error: "Your account has no email address. Contact support." };
  }

  // Another User row may already own this email (e.g. seeded demo data) —
  // treat that as a conflict rather than silently linking accounts.
  const emailTaken = await db.user.findUnique({ where: { email } });
  if (emailTaken) {
    return {
      ok: false,
      error: "A user with this email already exists. Contact your firm admin.",
    };
  }

  await db.$transaction(async (tx) => {
    const firm = await tx.firm.create({ data: { name: firmName } });
    const user = await tx.user.create({
      data: {
        clerkId,
        email,
        name: userName,
        role: "ADMIN", // firm creator administers the firm
        firmId: firm.id,
      },
    });
    await tx.auditLog.create({
      data: {
        firmId: firm.id,
        userId: user.id,
        action: "FIRM_CREATED",
        entityType: "Firm",
        entityId: firm.id,
        detail: { firmName, createdBy: email },
      },
    });
  });

  redirect("/dashboard");
}
