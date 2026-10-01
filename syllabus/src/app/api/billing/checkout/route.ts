import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";
import { createCheckoutSession } from "@/lib/dodo";
import { isPaidTier, type TierId } from "@/lib/tiers";
import { z } from "zod";

const schema = z.object({ tier: z.string() });

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return apiError.unauthorized();

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isPaidTier(parsed.data.tier)) {
    return apiError.badRequest("Pick a valid plan to upgrade to.");
  }
  const tierId = parsed.data.tier as TierId;

  try {
    const origin = new URL(req.url).origin;
    const order = await createCheckoutSession(tierId, user, `${origin}/billing/return`);

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
      orderId: order.orderId,
      checkoutUrl: order.checkoutUrl,
      amount: order.amount,
      amountInr: order.amountInr,
      currency: order.currency,
      tier: tierId,
    });
  } catch (e: any) {
    return apiError.server(e?.message || "Checkout is unavailable right now.");
  }
}
