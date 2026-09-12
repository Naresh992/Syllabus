import { headers } from "next/headers";
import { Webhook } from "standardwebhooks";
import { prisma } from "@/lib/db";
import { json } from "@/lib/api";
import { webhookSecret } from "@/lib/dodo";

// Dodo PG webhooks (backup path — /billing/return + /verify is primary).
// Spec: Standard Webhooks (webhook-id / webhook-signature / webhook-timestamp).
// Events: payment.succeeded / payment.failed / payment.cancelled.
export async function POST(req: Request) {
  const secret = webhookSecret();
  if (!secret) return json({ received: true, verified: false });

  let payload: any = null;
  try {
    const raw = await req.text();
    const h = headers();
    await new Webhook(secret).verify(raw, {
      "webhook-id": h.get("webhook-id") ?? "",
      "webhook-signature": h.get("webhook-signature") ?? "",
      "webhook-timestamp": h.get("webhook-timestamp") ?? "",
    });
    payload = JSON.parse(raw);
  } catch {
    return json({ received: false }, { status: 400 });
  }

  try {
    const type = payload?.type as string | undefined;
    const data = payload?.data ?? {};
    // Payment id always present; session/metadata shapes vary — match flexibly.
    const paymentId =
      data?.payment_id ?? data?.payment?.payment_id ?? data?.id ?? null;
    const meta = data?.metadata ?? data?.payment?.metadata ?? {};
    const sessionId =
      data?.session_id ?? data?.checkout_session_id ?? meta?.session_id ?? null;

    if (type === "payment.succeeded") {
      const row =
        (sessionId
          ? await prisma.payment.findUnique({ where: { orderId: String(sessionId) } }).catch(() => null)
          : null) ??
        (paymentId
          ? await prisma.payment.findFirst({ where: { paymentId: String(paymentId) } }).catch(() => null)
          : null);

      // Fallback: metadata pinned at session creation.
      const userId = typeof meta?.userId === "string" ? meta.userId : null;
      const tier = typeof meta?.tier === "string" ? meta.tier : null;
      const target =
        row ??
        (userId && tier
          ? await prisma.payment.findFirst({
              where: { userId, tier, status: "created" },
              orderBy: { createdAt: "desc" },
            }).catch(() => null)
          : null);
      if (!target) return json({ received: true });

      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + 30);
      await prisma.payment
        .update({
          where: { id: target.id },
          data: {
            status: "captured",
            paymentId: paymentId ? String(paymentId) : target.paymentId,
            rawPayload: JSON.stringify(payload).slice(0, 20000),
          },
        })
        .catch(() => null);
      await prisma.subscription
        .upsert({
          where: { userId: target.userId },
          create: {
            userId: target.userId,
            tier: target.tier,
            status: "active",
            provider: "dodo",
            providerSubscriptionId: paymentId ? String(paymentId) : null,
            currentPeriodEnd: periodEnd,
          },
          update: {
            tier: target.tier,
            status: "active",
            provider: "dodo",
            providerSubscriptionId: paymentId ? String(paymentId) : null,
            currentPeriodEnd: periodEnd,
          },
        })
        .catch(() => null);
    } else if (type === "payment.failed" || type === "payment.cancelled") {
      const row = sessionId
        ? await prisma.payment.findUnique({ where: { orderId: String(sessionId) } }).catch(() => null)
        : null;
      if (row && row.status === "created") {
        await prisma.payment
          .update({
            where: { id: row.id },
            data: { status: "failed", rawPayload: JSON.stringify(payload).slice(0, 20000) },
          })
          .catch(() => null);
      }
    }
  } catch {
    // never crash webhooks; Dodo retries on non-2xx
  }

  return json({ received: true });
}
