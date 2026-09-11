import { z } from "zod";
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

  const order = await createTierOrder(tierId, user.id);
  return json({
    ...order,
    tier: tierId,
    tierName: tier.name,
    amountInr: tier.priceInr,
    prefill: { name: user.name, email: user.email },
  });
}
