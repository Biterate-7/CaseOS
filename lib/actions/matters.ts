"use server";

import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export type CreateMatterResult = { ok: false; error: string };

export async function createMatter(
  formData: FormData
): Promise<CreateMatterResult> {
  const user = await requireUser();

  const title = String(formData.get("title") ?? "").trim();
  const clientName = String(formData.get("clientName") ?? "").trim();
  const practiceArea = String(formData.get("practiceArea") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (title.length < 3) {
    return { ok: false, error: "Enter a matter title (at least 3 characters)." };
  }
  if (clientName.length < 2) {
    return { ok: false, error: "Enter the client's name." };
  }
  if (practiceArea.length < 2) {
    return { ok: false, error: "Enter a practice area." };
  }

  const matter = await db.matter.create({
    data: {
      firmId: user.firmId,
      title,
      clientName,
      practiceArea,
      description: description || null,
      // Creator owns the project outright.
      members: { create: { userId: user.id, role: "OWNER", addedById: user.id } },
    },
  });

  await db.auditLog.create({
    data: {
      firmId: user.firmId,
      userId: user.id,
      matterId: matter.id,
      action: "MATTER_CREATED",
      entityType: "Matter",
      entityId: matter.id,
      detail: { title, clientName, practiceArea },
    },
  });

  redirect(`/matters/${matter.id}`);
}
