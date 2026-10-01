import { Webhook } from "standardwebhooks";
import { prisma } from "@/lib/db";
import { json } from "@/lib/api";
import { webhookSecret } from "@/lib/dodo";

export async function POST(req: Request) {
  const raw = await req.text();
  const secret = webhookSecret();
  if (!secret) return json({ received: false }, { status: 503 });

  let payload: Record<string, unknown>;
  try {
    const verified = new Webhook(secret).verify(raw, {
      "webhook-id": req.headers.get("webhook-id") ?? "",
      "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
      "webhook-signature": req.headers.get("webhook-signature") ?? "",
    });
    payload = verified as Record<string, unknown>;
  } catch {
    return json({ received: false }, { status: 400 });
  }

  const eventId = req.headers.get("webhook-id");
  const eventType = typeof payload.type === "string" ? payload.type : "";
  const data = (payload.data ?? payload.payload ?? {}) as Record<string, unknown>;
  const metadata = (data.metadata ?? {}) as Record<string, unknown>;
  const orderId = typeof data.checkout_id === "string" ? data.checkout_id : typeof data.session_id === "string" ? data.session_id : null;
  const paymentId = typeof data.payment_id === "string" ? data.payment_id : null;

  if (!eventId || !orderId) return json({ received: true });
  const payment = await prisma.payment.findUnique({ where: { orderId } });
  if (!payment) return json({ received: true });

  const alreadyProcessed = await prisma.payment.findUnique({ where: { webhookEventId: eventId } });
  if (alreadyProcessed) return json({ received: true });

  if (eventType === "payment.succeeded" || eventType === "checkout.completed") {
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);
    await prisma.$transaction([
      prisma.payment.update({ where: { id: payment.id }, data: { status: "captured", paymentId, webhookEventId: eventId, rawPayload: raw.slice(0, 20000) } }),
      prisma.subscription.upsert({
        where: { userId: payment.userId },
        create: { userId: payment.userId, tier: payment.tier, status: "active", provider: "dodo", providerSubscriptionId: paymentId, currentPeriodEnd: periodEnd },
        update: { tier: payment.tier, status: "active", provider: "dodo", providerSubscriptionId: paymentId, currentPeriodEnd: periodEnd },
      }),
    ]);
  } else if (eventType === "payment.failed" || eventType === "checkout.failed") {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "failed", webhookEventId: eventId, rawPayload: raw.slice(0, 20000) } });
  } else {
    await prisma.payment.update({ where: { id: payment.id }, data: { webhookEventId: eventId, rawPayload: raw.slice(0, 20000) } });
  }

  return json({ received: true, userId: metadata.userId ?? undefined });
}
