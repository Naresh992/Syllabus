import { prisma } from "@/lib/db";
import { json } from "@/lib/api";
import { verifyWebhookSignature } from "@/lib/razorpay";

export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(raw, signature)) {
    return json({ received: false }, { status: 400 });
  }

  let payload: Record<string, any>;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json({ received: false }, { status: 400 });
  }

  const eventId = req.headers.get("x-razorpay-event-id");
  const paymentEntity = payload.payload?.payment?.entity;
  const orderId = paymentEntity?.order_id;
  const paymentId = paymentEntity?.id;
  if (!orderId) return json({ received: true });

  const payment = await prisma.payment.findUnique({ where: { orderId } });
  if (!payment) return json({ received: true });
  if (eventId) {
    const duplicate = await prisma.payment.findUnique({ where: { webhookEventId: eventId } });
    if (duplicate) return json({ received: true });
  }

  const eventType = typeof payload.event === "string" ? payload.event : "";
  const webhookData = { ...(eventId ? { webhookEventId: eventId } : {}), rawPayload: raw.slice(0, 20000) };
  if (eventType === "payment.captured") {
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);
    await prisma.$transaction([
      prisma.payment.update({ where: { id: payment.id }, data: { status: "captured", paymentId, ...webhookData } }),
      prisma.subscription.upsert({
        where: { userId: payment.userId },
        create: { userId: payment.userId, tier: payment.tier, status: "active", provider: "razorpay", providerSubscriptionId: paymentId, currentPeriodEnd: periodEnd },
        update: { tier: payment.tier, status: "active", provider: "razorpay", providerSubscriptionId: paymentId, currentPeriodEnd: periodEnd },
      }),
    ]);
  } else if (eventType === "payment.failed") {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "failed", paymentId, ...webhookData } });
  } else {
    await prisma.payment.update({ where: { id: payment.id }, data: webhookData });
  }

  return json({ received: true });
}
