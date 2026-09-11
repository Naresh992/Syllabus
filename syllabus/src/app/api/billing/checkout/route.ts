import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";
import { createTierOrder } from "@/lib/razorpay";
import { getTier, isPaidTier, type TierId } from "@/lib/tiers";

const schema = z.object({ tier: z.string() });

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return apiError.unauthorized();

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isPaidTier(parsed.data.tier)) {
    return apiError.badRequest("Pick a valid plan to upgrade to.");
  }
  const tierId = parsed.data.tier as TierId;
  const tier = getTier(tierId);

  let order;
  try {
    order = await createTierOrder(tierId, user.id);
  } catch {
    return apiError.server("Live Razorpay payments are not configured.");
  }
  await prisma.payment.create({
    data: {
      userId: user.id,
      tier: tierId,
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
      status: "created",
    },
  });
  return json({
    ...order,
    tier: tierId,
    tierName: tier.name,
    amountInr: tier.priceInr,
    prefill: { name: user.name, email: user.email },
  });
}
