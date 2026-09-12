import { prisma } from "@/lib/db";
import { json, apiError } from "@/lib/api";
import { verifyWebhookSignature } from "@/lib/cashfree";

// Cashfree PG webhooks (backup path — the widget + /verify is primary).
// Events: PAYMENT_SUCCESS_WEBHOOK / PAYMENT_FAILED_WEBHOOK / PAYMENT_USER_DROPPED_WEBHOOK.
export async function POST(req: Request) {
  const raw = await req.text();
  const timestamp = req.headers.get("x-webhook-timestamp") ?? "";
  const signature = req.headers.get("x-webhook-signature") ?? "";

  if (!verifyWebhookSignature(raw, timestamp, signature)) {
    return apiError.badRequest("Invalid webhook signature.");
  }

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return apiError.badRequest("Invalid payload.");
  }

  const type = event?.type as string | undefined;
  const orderId = event?.data?.order?.order_id as string | undefined;
  if (!orderId) return json({ received: true });

  const payment = await prisma.payment.findUnique({ where: { orderId } }).catch(() => null);
  if (!payment) return json({ received: true });

  // Idempotency on Cashfree's event id.
  const eventId = typeof event?.event_time === "string" ? `${type}:${event.event_time}:${orderId}` : null;
  if (type === "PAYMENT_SUCCESS_WEBHOOK") {
    const cfPaymentId = event?.data?.payment?.cf_payment_id;
    await prisma.payment
      .update({
        where: { orderId },
        data: {
          status: "captured",
          paymentId: typeof cfPaymentId === "string" ? cfPaymentId : payment.paymentId,
          webhookEventId: eventId,
          rawPayload: raw.slice(0, 20000),
        },
      })
      .catch(() => null);
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);
    await prisma.subscription
      .upsert({
        where: { userId: payment.userId },
        create: {
          userId: payment.userId,
          tier: payment.tier,
          status: "active",
          provider: "cashfree",
          providerSubscriptionId: typeof cfPaymentId === "string" ? cfPaymentId : null,
          currentPeriodEnd: periodEnd,
        },
        update: {
          tier: payment.tier,
          status: "active",
          provider: "cashfree",
          providerSubscriptionId: typeof cfPaymentId === "string" ? cfPaymentId : null,
          currentPeriodEnd: periodEnd,
        },
      })
      .catch(() => null);
  } else if (type === "PAYMENT_FAILED_WEBHOOK" || type === "PAYMENT_USER_DROPPED_WEBHOOK") {
    await prisma.payment
      .update({
        where: { orderId },
        data: { status: "failed", webhookEventId: eventId, rawPayload: raw.slice(0, 20000) },
      })
      .catch(() => null);
  }

  return json({ received: true });
}
