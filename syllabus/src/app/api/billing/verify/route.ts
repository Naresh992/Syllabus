import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";
import { dodo } from "@/lib/dodo";
import { getTier, isPaidTier, type TierId } from "@/lib/tiers";

// Confirms an order by asking Cashfree server-to-server (no client signatures
// to forge). Called by the browser after the Cashfree widget finishes.
const schema = z.object({ orderId: z.string().min(1).max(100), tier: z.string() });

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return apiError.unauthorized();

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isPaidTier(parsed.data.tier)) {
    return apiError.badRequest("Invalid payment confirmation.");
  }
  const { orderId, tier } = parsed.data;
  const tierInfo = getTier(tier as TierId);

  const payment = await prisma.payment.findUnique({ where: { orderId } });
  if (
    !payment ||
    payment.userId !== user.id ||
    payment.tier !== tier ||
    payment.amount !== tierInfo.priceInr * 100
  ) {
    return apiError.badRequest("Payment order does not match this account or plan.");
  }
  if (payment.status === "captured") {
    return json({ ok: true, tier, tierName: tierInfo.name, currentPeriodEnd: new Date() });
  }

  if (!dodo) return apiError.server("Dodo Payments is not configured.");
  let status;
  try {
    status = await dodo.checkoutSessions.retrieve(orderId);
  } catch {
    return apiError.server("Could not confirm the payment. Try again in a moment.");
  }
  if (status.payment_status !== "succeeded") return apiError.badRequest("Payment was not completed.");

  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + 30);

  try {
    await prisma.payment.update({
      where: { orderId },
      data: { status: "captured", paymentId: status.payment_id, rawPayload: null },
    });
    await prisma.subscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        tier,
        status: "active",
        provider: "cashfree",
        providerSubscriptionId: status.payment_id,
        currentPeriodEnd: periodEnd,
      },
      update: {
        tier,
        status: "active",
        provider: "cashfree",
        providerSubscriptionId: status.payment_id,
        currentPeriodEnd: periodEnd,
      },
    });
  } catch {
    return apiError.server("Could not complete the upgrade. Contact support.");
  }

  return json({ ok: true, tier, tierName: tierInfo.name, currentPeriodEnd: periodEnd });
}
