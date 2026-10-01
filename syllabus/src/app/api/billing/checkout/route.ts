import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";
import { createRazorpayOrder } from "@/lib/razorpay";
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
    const order = await createRazorpayOrder(tierId, `syllabus_${user.id}_${Date.now()}`);

    await prisma.payment.create({
      data: {
        userId: user.id,
        tier: tierId,
        orderId: order.id,
        amount: Number(order.amount),
        currency: order.currency,
        status: "created",
      },
    });

    return json({
      orderId: order.id,
      amount: order.amount,
      amountInr: Number(order.amount) / 100,
      currency: order.currency,
      keyId: process.env.API_KEY,
      tier: tierId,
    });
  } catch (e: any) {
    return apiError.server(e?.message || "Checkout is unavailable right now.");
  }
}
