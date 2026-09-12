import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";
import { createCheckoutSession } from "@/lib/dodo";
import { isPaidTier, type TierId } from "@/lib/tiers";
import { z } from "zod";

const schema = z.object({ tier: z.string() });

function siteOrigin(req: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "syllabus-iota.vercel.app";
  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return apiError.unauthorized();

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isPaidTier(parsed.data.tier)) {
    return apiError.badRequest("Pick a valid plan to upgrade to.");
  }
  const tierId = parsed.data.tier as TierId;

  try {
    const session = await createCheckoutSession(
      tierId,
      { id: user.id, email: user.email, name: user.name },
      `${siteOrigin(req)}/billing/return`
    );

    await prisma.payment.create({
      data: {
        userId: user.id,
        tier: tierId,
        orderId: session.orderId,
        amount: session.amount,
        currency: session.currency,
        status: "created",
      },
    });

    return json({
      orderId: session.orderId,
      checkoutUrl: session.checkoutUrl,
      amount: session.amount,
      amountInr: session.amountInr,
      currency: session.currency,
      environment: session.environment,
      tier: tierId,
    });
  } catch (e: any) {
    return apiError.server(e?.message || "Checkout is unavailable right now.");
  }
}
