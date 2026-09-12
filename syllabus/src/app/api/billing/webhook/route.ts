import { prisma } from "@/lib/db";
import { json, apiError } from "@/lib/api";
import { verifyDodoWebhook } from "@/lib/dodo";

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyDodoWebhook(raw, req.headers)) return apiError.badRequest("Invalid webhook signature.");
  let event: any;
  try { event = JSON.parse(raw); } catch { return apiError.badRequest("Invalid payload."); }

  const data = event?.data ?? {};
  const metadata = data?.metadata ?? {};
  const orderId = typeof data?.checkout_session_id === "string" ? data.checkout_session_id : typeof data?.payment_id === "string" ? data.payment_id : null;
  const userId = typeof metadata.userId === "string" ? metadata.userId : null;
  const tier = typeof metadata.tier === "string" ? metadata.tier : null;
  if (!orderId || !userId || !tier) return json({ received: true });

  const payment = await prisma.payment.findUnique({ where: { orderId } }).catch(() => null);
  if (!payment || payment.userId !== userId || payment.tier !== tier) return json({ received: true });
  if (payment.webhookEventId === event.id) return json({ received: true });

  const succeeded = event.type === "payment.succeeded" || event.type === "subscription.active" || event.type === "subscription.renewed";
  const failed = event.type === "payment.failed" || event.type === "payment.cancelled";
  const status = succeeded ? "captured" : failed ? "failed" : null;
  if (!status) return json({ received: true });

  await prisma.payment.update({
    where: { orderId },
    data: { status, paymentId: typeof data.payment_id === "string" ? data.payment_id : payment.paymentId, webhookEventId: typeof event.id === "string" ? event.id : undefined, rawPayload: raw.slice(0, 20000) },
  });
  if (succeeded) {
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);
    await prisma.subscription.upsert({
      where: { userId },
      create: { userId, tier, status: "active", provider: "dodo", providerSubscriptionId: typeof data.subscription_id === "string" ? data.subscription_id : data.payment_id, currentPeriodEnd: periodEnd },
      update: { tier, status: "active", provider: "dodo", providerSubscriptionId: typeof data.subscription_id === "string" ? data.subscription_id : data.payment_id, currentPeriodEnd: periodEnd },
    });
  }
  return json({ received: true });
}
