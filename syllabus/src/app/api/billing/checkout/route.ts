import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";
import { createTierCheckout } from "@/lib/dodo";
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

  try {
    const checkout = await createTierCheckout(tierId, { id: user.id, email: user.email, name: user.name });
    await prisma.payment.create({
      data: { userId: user.id, tier: tierId, orderId: checkout.sessionId, amount: tier.priceInr * 100, currency: "INR", status: "created" },
    });
    return json({ ...checkout, tier: tierId, tierName: tier.name });
  } catch {
    return apiError.server("Checkout is unavailable right now. Dodo Payments may be missing a product configuration.");
  }
}
