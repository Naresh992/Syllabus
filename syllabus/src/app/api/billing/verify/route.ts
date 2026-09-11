import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { getTier, isPaidTier, type TierId } from "@/lib/tiers";

const schema = z.object({
  tier: z.string(),
  orderId: z.string().min(1),
  paymentId: z.string().min(1),
  signature: z.string().min(1),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return apiError.unauthorized();

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isPaidTier(parsed.data.tier)) {
    return apiError.badRequest("Invalid payment confirmation.");
  }
  const { tier, orderId, paymentId, signature } = parsed.data;

  const valid = verifyPaymentSignature({ orderId, paymentId, signature });
  if (!valid) return apiError.badRequest("Payment could not be verified.");

  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + 30);

  await prisma.subscription.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      tier,
      status: "active",
      provider: "razorpay",
      providerSubscriptionId: paymentId,
      currentPeriodEnd: periodEnd,
    },
    update: {
      tier,
      status: "active",
      provider: "razorpay",
      providerSubscriptionId: paymentId,
      currentPeriodEnd: periodEnd,
    },
  });

  return json({ ok: true, tier, tierName: getTier(tier as TierId).name, currentPeriodEnd: periodEnd });
}
