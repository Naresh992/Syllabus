/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import { DEFAULT_EARN_TASKS } from "../src/lib/earn";

const prisma = new PrismaClient();

async function main() {
  console.log("🪙 Seeding Earn tasks (idempotent)…");
  let created = 0;
  for (const t of DEFAULT_EARN_TASKS) {
    const existing = await prisma.earnTask.findFirst({
      where: { category: t.category, title: t.title },
    });
    if (existing) continue;
    await prisma.earnTask.create({ data: t });
    created++;
  }
  const total = await prisma.earnTask.count();
  console.log(`   +${created} new tasks, ${total} total active catalog.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
