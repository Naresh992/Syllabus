import { prisma } from "@/lib/db";
import { json, apiError } from "@/lib/api";
import { verifyWebhookSignature } from "@/lib/razorpay";

export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(raw, signature)) return apiError.unauthorized();

  let event: any;
  try { event = JSON.parse(raw); } catch { return apiError.badRequest("Invalid payload."); }
  const entity = event?.payload?.payment?.entity;
  const orderId = typeof entity?.order_id === "string" ? entity.order_id : null;
  if (!orderId) return json({ received: true });

  const payment = await prisma.payment.findUnique({ where: { orderId } });
  if (!payment) return json({ received: true });
  const status = event.event === "payment.captured" ? "captured" : event.event === "payment.failed" ? "failed" : null;
  if (!status) return json({ received: true });

  await prisma.payment.update({
    where: { orderId },
    data: {
      status,
      paymentId: typeof entity.id === "string" ? entity.id : payment.paymentId,
      webhookEventId: typeof event.id === "string" ? event.id : undefined,
      rawPayload: JSON.stringify(event).slice(0, 20000),
    },
  });
  if (status === "captured") {
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);
    await prisma.subscription.upsert({
      where: { userId: payment.userId },
      create: { userId: payment.userId, tier: payment.tier, status: "active", provider: "razorpay", providerSubscriptionId: entity.id, currentPeriodEnd: periodEnd },
      update: { tier: payment.tier, status: "active", provider: "razorpay", providerSubscriptionId: entity.id, currentPeriodEnd: periodEnd },
    });
  }
  return json({ received: true });
}
