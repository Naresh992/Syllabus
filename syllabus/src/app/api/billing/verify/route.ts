import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";
import { getSessionStatus } from "@/lib/dodo";
import { getTier, isPaidTier, type TierId } from "@/lib/tiers";

// Confirms a checkout session server-to-server (GET /checkouts/{id}).
// Called by /billing/return after Dodo redirects back.
const schema = z.object({
  orderId: z.string().min(1).max(100), // Dodo session_id from our own pending row
  paymentId: z.string().max(100).optional().default(""),
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

  let status;
  try {
    status = await getSessionStatus(orderId);
  } catch {
    return apiError.server("Could not confirm the payment. Try again in a moment.");
  }

  // Cross-checks: Dodo's email must be ours, and a supplied payment_id must match.
  if (status.email && status.email.toLowerCase() !== user.email.toLowerCase()) {
    return apiError.badRequest("Payment email does not match this account.");
  }
  if (paymentId && status.paymentId && paymentId !== status.paymentId) {
    return apiError.badRequest("Payment reference does not match.");
  }

  if (status.status !== "succeeded") {
    return apiError.badRequest(
      status.status === "processing"
        ? "Payment is still processing at the gateway."
        : "Payment was not completed."
    );
  }

  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + 30);

  try {
    await prisma.payment.update({
      where: { orderId },
      data: { status: "captured", paymentId: status.paymentId, rawPayload: null },
    });
    await prisma.subscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        tier: payment.tier,
        status: "active",
        provider: "dodo",
        providerSubscriptionId: status.paymentId,
        currentPeriodEnd: periodEnd,
      },
      update: {
        tier: payment.tier,
        status: "active",
        provider: "dodo",
        providerSubscriptionId: status.paymentId,
        currentPeriodEnd: periodEnd,
      },
    });
  } catch {
    return apiError.server("Could not complete the upgrade. Contact support.");
  }

  return json({ ok: true, tier: payment.tier, tierName: tierInfo.name, currentPeriodEnd: periodEnd });
}
