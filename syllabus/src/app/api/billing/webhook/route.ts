import { prisma } from "@/lib/db";
import { json, apiError } from "@/lib/api";
import { verifyWebhookSignature } from "@/lib/razorpay";

// Razorpay webhook (subscription lifecycle). Stubbed for the MVP: verifies the
// signature and updates local subscription status for a couple of events.
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(raw, signature)) {
    return apiError.badRequest("Invalid webhook signature.");
  }

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return apiError.badRequest("Invalid payload.");
  }

  const notes = event?.payload?.subscription?.entity?.notes ?? event?.payload?.payment?.entity?.notes;
  const userId = notes?.userId as string | undefined;

  if (userId) {
    if (event.event === "subscription.cancelled" || event.event === "subscription.halted") {
      await prisma.subscription.updateMany({
        where: { userId },
        data: { status: "canceled" },
      });
    } else if (event.event === "subscription.charged" || event.event === "subscription.activated") {
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + 30);
      await prisma.subscription.updateMany({
        where: { userId },
        data: { status: "active", currentPeriodEnd: periodEnd },
      });
    }
  }

  return json({ received: true });
}
