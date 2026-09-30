import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { getTier, isPaidTier, type TierId } from "@/lib/tiers";

// Confirms a checkout session server-to-server (GET /checkouts/{id}).
// Called by /billing/return after Dodo redirects back.
const schema = z.object({
  orderId: z.string().min(1).max(100),
  paymentId: z.string().min(1).max(100),
  signature: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return apiError.unauthorized();

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError.badRequest("Invalid payment confirmation.");
  const { orderId, paymentId } = parsed.data;

  const payment = await prisma.payment.findUnique({ where: { orderId } });
  if (!payment || payment.userId !== user.id) {
    return apiError.badRequest("Payment order does not match this account.");
  }
  const tierInfo = getTier(payment.tier as TierId);
  if (!isPaidTier(payment.tier) || payment.amount !== tierInfo.priceInr * 100) {
    return apiError.badRequest("Payment order does not match this plan.");
  }
  if (payment.status === "captured") {
    return json({ ok: true, tier: payment.tier, tierName: tierInfo.name });
  }

  try {
    if (payment.orderId !== orderId || !verifyPaymentSignature(orderId, paymentId, parsed.data.signature)) {
      return apiError.badRequest("Payment signature is invalid.");
    }
  } catch {
    return apiError.badRequest("Payment signature is invalid.");
  }

  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + 30);

  try {
    await prisma.payment.update({
      where: { orderId },
      data: { status: "captured", paymentId, rawPayload: null },
    });
    await prisma.subscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        tier: payment.tier,
        status: "active",
        provider: "razorpay",
        providerSubscriptionId: paymentId,
        currentPeriodEnd: periodEnd,
      },
      update: {
        tier: payment.tier,
        status: "active",
        provider: "razorpay",
        providerSubscriptionId: paymentId,
        currentPeriodEnd: periodEnd,
      },
    });
  } catch {
    return apiError.server("Could not complete the upgrade. Contact support.");
  }

  return json({ ok: true, tier: payment.tier, tierName: tierInfo.name, currentPeriodEnd: periodEnd });
}
