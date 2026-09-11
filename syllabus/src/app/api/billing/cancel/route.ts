import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";

// Demo convenience: downgrade back to the free "Audit" tier.
export async function POST() {
  const user = await getSessionUser();
  if (!user) return apiError.unauthorized();

  await prisma.subscription.upsert({
    where: { userId: user.id },
    create: { userId: user.id, tier: "audit", status: "active" },
    update: {
      tier: "audit",
      status: "active",
      providerSubscriptionId: null,
      currentPeriodEnd: null,
    },
  });

  return json({ ok: true, tier: "audit" });
}
