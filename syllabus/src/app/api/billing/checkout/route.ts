import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";
import { createTierOrder, normalizePhone } from "@/lib/cashfree";
import { getTier, isPaidTier, type TierId } from "@/lib/tiers";

const schema = z.object({
  tier: z.string(),
  phone: z.string().optional().default(""),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return apiError.unauthorized();

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isPaidTier(parsed.data.tier)) {
    return apiError.badRequest("Pick a valid plan to upgrade to.");
  }
  const tierId = parsed.data.tier as TierId;
  const tier = getTier(tierId);

  // Cashfree requires a mobile number — reuse the saved one if present.
  const phone = normalizePhone(parsed.data.phone) ?? null;
  const savedPhone = await prisma.user
    .findUnique({ where: { id: user.id }, select: { phone: true } })
    .then((u) => normalizePhone(u?.phone ?? ""))
    .catch(() => null);
  const finalPhone = phone ?? savedPhone;
  if (!finalPhone) {
    return apiError.badRequest("Add your 10-digit mobile number to pay.", {
      code: "phone_required",
    });
  }

  try {
    const order = await createTierOrder(
      tierId,
      { id: user.id, email: user.email, name: user.name },
      finalPhone
    );
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { phone: finalPhone } }),
      prisma.payment.create({
        data: {
          userId: user.id,
          tier: tierId,
          orderId: order.orderId,
          amount: order.amount,
          currency: order.currency,
          status: "created",
        },
      }),
    ]);
    return json({
      orderId: order.orderId,
      amount: order.amount,
      amountInr: order.amountInr,
      currency: order.currency,
      paymentSessionId: order.paymentSessionId,
      environment: order.environment,
      tier: tierId,
      tierName: tier.name,
      prefill: { name: user.name, email: user.email, phone: finalPhone },
    });
  } catch (e: any) {
    return apiError.server("Checkout is unavailable right now. Payments are not configured yet.");
  }
}
