import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../lib/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

async function main() {
  const existing = await db.firm.findFirst({ where: { name: "Alvarez & Chen LLP" } });
  if (existing) {
    console.log("Seed data already present, skipping.");
    return;
  }

  const firm = await db.firm.create({ data: { name: "Alvarez & Chen LLP" } });

  const user = await db.user.create({
    data: {
      clerkId: "demo_user_placeholder", // replaced when Clerk auth lands
      email: "j.alvarez@alvarezchen.example",
      name: "J. Alvarez",
      role: "ATTORNEY",
      firmId: firm.id,
    },
  });

  const matters = await Promise.all(
    [
      {
        title: "Hendricks v. Meridian Logistics",
        clientName: "Sarah Hendricks",
        practiceArea: "Employment",
        status: "OPEN" as const,
      },
      {
        title: "Delta Ridge HOA — Easement Dispute",
        clientName: "Delta Ridge HOA",
        practiceArea: "Real Estate",
        status: "OPEN" as const,
      },
      {
        title: "Kovac Manufacturing — Asset Purchase",
        clientName: "Kovac Manufacturing LLC",
        practiceArea: "Corporate",
        status: "PENDING" as const,
      },
    ].map((data) =>
      db.matter.create({
        data: { ...data, firmId: firm.id, members: { create: { userId: user.id, role: "OWNER" } } },
      })
    )
  );

  await db.auditLog.create({
    data: {
      firmId: firm.id,
      userId: user.id,
      action: "FIRM_SEEDED",
      entityType: "Firm",
      entityId: firm.id,
      detail: { matters: matters.length },
    },
  });

  console.log(`Seeded firm ${firm.name} with ${matters.length} matters.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
