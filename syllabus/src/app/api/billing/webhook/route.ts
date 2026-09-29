import { prisma } from "@/lib/db";
import { json } from "@/lib/api";
import { verifyWebhookSignature } from "@/lib/razorpay";

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature") ?? "")) {
    return json({ received: false }, { status: 400 });
  }

  try {
    const payload = JSON.parse(raw);
    const event = payload?.event as string | undefined;
    const entity = payload?.payload?.payment?.entity ?? {};
    const orderId = entity.order_id as string | undefined;
    const paymentId = entity.id as string | undefined;
    if (!orderId) return json({ received: true });

    const payment = await prisma.payment.findUnique({ where: { orderId } });
    if (!payment) return json({ received: true });

    if (event === "payment.captured") {
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + 30);
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: { status: "captured", paymentId, rawPayload: raw.slice(0, 20000) },
        }),
        prisma.subscription.upsert({
          where: { userId: payment.userId },
          create: { userId: payment.userId, tier: payment.tier, status: "active", provider: "razorpay", providerSubscriptionId: paymentId, currentPeriodEnd: periodEnd },
          update: { tier: payment.tier, status: "active", provider: "razorpay", providerSubscriptionId: paymentId, currentPeriodEnd: periodEnd },
        }),
      ]);
    } else if (event === "payment.failed") {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "failed", rawPayload: raw.slice(0, 20000) } });
    }
    return json({ received: true });
  } catch {
    return json({ received: false }, { status: 500 });
  }
}
